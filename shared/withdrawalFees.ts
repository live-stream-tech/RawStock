/** 出金（Stripe Transfer）前に換金者負担で差し引く手数料ポリシー（単位: USD セント = チケット数と同じ） */
export type WithdrawalFeePolicy = {
  bps: number;
  fixedUsdCents: number;
  minNetTransferUsdCents: number;
};

export const DEFAULT_MIN_NET_TRANSFER_USD_CENTS = 50;

/**
 * grossUsdCents: 利用者残高から減る申請額（全額）
 * 戻り値 fee: プラットフォームが留保する分、net: Stripe Transfer に回す額
 */
export function computeWithdrawalFeeBreakdown(
  grossUsdCents: number,
  policy: WithdrawalFeePolicy,
): { feeUsdCents: number; netTransferUsdCents: number } {
  const minNet = Math.max(
    1,
    Math.min(10_000_000, policy.minNetTransferUsdCents || DEFAULT_MIN_NET_TRANSFER_USD_CENTS),
  );
  const gross = Math.floor(grossUsdCents);
  if (!Number.isFinite(gross) || gross <= 0) {
    return { feeUsdCents: 0, netTransferUsdCents: 0 };
  }
  const bps = Math.max(0, Math.min(10_000, Math.floor(policy.bps)));
  const fixed = Math.max(0, Math.floor(policy.fixedUsdCents));
  const variable = Math.ceil((gross * bps) / 10_000);
  const rawFee = variable + fixed;
  const maxFee = Math.max(0, gross - minNet);
  const feeUsdCents = Math.min(maxFee, rawFee);
  const netTransferUsdCents = gross - feeUsdCents;
  return { feeUsdCents, netTransferUsdCents };
}
