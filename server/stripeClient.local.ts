import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY ?? "";

function requireStripe(): Stripe {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured. Add it to your environment secrets.");
  }
  return new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-01-27.acacia" });
}

/** Returns a fresh Stripe client (uncached — safe for serverless/streaming). */
export async function getUncachableStripeClient(): Promise<Stripe> {
  return requireStripe();
}

/** Returns the Stripe publishable key for the client. */
export function getStripePublishableKey(): string {
  return STRIPE_PUBLISHABLE_KEY;
}

/** Creates a Stripe Connect Express account. */
export async function createConnectExpressAccount(params: { country?: string }): Promise<string> {
  const stripe = requireStripe();
  const account = await stripe.accounts.create({
    type: "express",
    country: params.country ?? "US",
  });
  return account.id;
}

/** Creates a Stripe Connect account link for onboarding. */
export async function createConnectAccountLink(params: {
  accountId: string;
  returnUrl: string;
  refreshUrl: string;
}): Promise<string> {
  const stripe = requireStripe();
  const link = await stripe.accountLinks.create({
    account: params.accountId,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: "account_onboarding",
  });
  return link.url;
}

/** Retrieves a Stripe Connect account. */
export async function getConnectAccount(accountId: string): Promise<Stripe.Account | null> {
  try {
    const stripe = requireStripe();
    return await stripe.accounts.retrieve(accountId);
  } catch {
    return null;
  }
}

/** Creates a Stripe Payment Intent for banner ads (USD). */
export async function createBannerPaymentIntent(params: {
  amountUSD: number;
  metadata: Record<string, string>;
}): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const stripe = requireStripe();
  const intent = await stripe.paymentIntents.create({
    amount: params.amountUSD,
    currency: "usd",
    metadata: params.metadata,
    automatic_payment_methods: { enabled: true },
  });
  return {
    clientSecret: intent.client_secret!,
    paymentIntentId: intent.id,
  };
}

/** Retrieves the status of a Stripe Payment Intent. */
export async function getPaymentIntentStatus(paymentIntentId: string): Promise<string | null> {
  try {
    const stripe = requireStripe();
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return intent.status;
  } catch {
    return null;
  }
}

/** Creates a Stripe transfer to a connected account. */
export async function createTransferToConnectedAccount(params: {
  amountUsdCents: number;
  destinationAccountId: string;
  metadata?: Record<string, string>;
}): Promise<{ transferId: string }> {
  const stripe = requireStripe();
  const transfer = await stripe.transfers.create({
    amount: params.amountUsdCents,
    currency: "usd",
    destination: params.destinationAccountId,
    ...(params.metadata ? { metadata: params.metadata } : {}),
  });
  return { transferId: transfer.id };
}
