import { and, eq } from "drizzle-orm";
import type Stripe from "stripe";
import type { DbOrTx } from "../db";
import { ticketBalances, ticketTransactions } from "../schema";

export type CreditTicketsResult =
  | { ok: true; alreadyGranted: boolean; userId: string; newBalance: number }
  | { ok: false; reason: "not_paid" | "bad_metadata" | "no_user" };

/**
 * Stripe Checkout Session（チケット購入）から冪等にチケットを付与する。
 * verify-purchase と webhook の双方から呼ぶ。
 */
export async function creditTicketsFromTicketCheckoutSession(
  executor: DbOrTx,
  session: Stripe.Checkout.Session,
): Promise<CreditTicketsResult> {
  if (session.payment_status !== "paid") {
    return { ok: false, reason: "not_paid" };
  }
  const metaType = session.metadata?.type;
  const isTicketPurchase =
    metaType === "ticket_purchase" ||
    (metaType == null && session.metadata?.tickets && session.metadata?.userId);
  if (!isTicketPurchase) {
    return { ok: false, reason: "bad_metadata" };
  }
  const tickets = parseInt(session.metadata?.tickets ?? "0", 10);
  const metaUserId = session.metadata?.userId;
  if (!tickets || tickets <= 0 || !metaUserId || !/^\d+$/.test(String(metaUserId))) {
    return { ok: false, reason: "bad_metadata" };
  }
  const userId = String(parseInt(String(metaUserId), 10));
  const sessionId = session.id;

  const existing = await executor
    .select({ id: ticketTransactions.id })
    .from(ticketTransactions)
    .where(and(eq(ticketTransactions.userId, userId), eq(ticketTransactions.referenceId, sessionId)))
    .limit(1);
  if (existing.length > 0) {
    const balRows = await executor.select().from(ticketBalances).where(eq(ticketBalances.userId, userId)).limit(1);
    return { ok: true, alreadyGranted: true, userId, newBalance: balRows[0]?.balance ?? 0 };
  }

  const balRows = await executor.select().from(ticketBalances).where(eq(ticketBalances.userId, userId)).limit(1);
  const currentBalance = balRows[0]?.balance ?? 0;
  if (balRows.length === 0) {
    await executor.insert(ticketBalances).values({ userId, balance: tickets });
  } else {
    await executor
      .update(ticketBalances)
      .set({ balance: currentBalance + tickets, updatedAt: new Date() })
      .where(eq(ticketBalances.userId, userId));
  }

  await executor.insert(ticketTransactions).values({
    userId,
    amount: tickets,
    type: "purchase",
    referenceId: sessionId,
    description: `Purchased ${tickets} tickets via Stripe`,
  });

  const newBalance = currentBalance + tickets;
  return { ok: true, alreadyGranted: false, userId, newBalance };
}
