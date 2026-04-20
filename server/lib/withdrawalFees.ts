import {
  computeWithdrawalFeeBreakdown as computeShared,
  DEFAULT_MIN_NET_TRANSFER_USD_CENTS,
  type WithdrawalFeePolicy,
} from "../../shared/withdrawalFees";

export type { WithdrawalFeePolicy };

export function getWithdrawalFeePolicy(): WithdrawalFeePolicy {
  const bps = Math.min(10_000, Math.max(0, parseInt(process.env.WITHDRAWAL_FEE_BPS ?? "0", 10) || 0));
  const fixedUsdCents = Math.max(0, parseInt(process.env.WITHDRAWAL_FEE_FIXED_USD_CENTS ?? "0", 10) || 0);
  const minNetTransferUsdCents = Math.max(
    1,
    Math.min(
      10_000_000,
      parseInt(
        process.env.WITHDRAWAL_MIN_NET_TRANSFER_USD_CENTS ?? String(DEFAULT_MIN_NET_TRANSFER_USD_CENTS),
        10,
      ) || DEFAULT_MIN_NET_TRANSFER_USD_CENTS,
    ),
  );
  return { bps, fixedUsdCents, minNetTransferUsdCents };
}

export function computeWithdrawalFeeBreakdown(grossUsdCents: number): {
  feeUsdCents: number;
  netTransferUsdCents: number;
} {
  return computeShared(grossUsdCents, getWithdrawalFeePolicy());
}
