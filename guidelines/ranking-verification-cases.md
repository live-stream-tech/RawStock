# Ranking Verification Cases

## Scope

This checklist verifies the new ranking and reward behavior:

- Source-aware revenue persistence (`tip` / `paid_live` / `mentor`)
- Fixed 90% payout for paid live revenue
- Variable tip payout by creator level
- Monthly ranking aggregation (overall and paid live)
- Next-month starting rank offset (`prev + 2`)
- Level progress API response correctness

## Preconditions

- Database schema is migrated to include:
  - `creators.current_level`
  - `creator_level_thresholds`
  - `creator_monthly_scores`
  - `transactions.source`, `transactions.gross_amount`, `transactions.back_rate`, `transactions.net_amount`, `transactions.creator_id`, `transactions.year_month`
- At least one creator account exists and can authenticate.

## Case 1: Paid live payout is always 90%

1. Call `POST /api/revenue/record` with `{ "amount": 10000, "source": "paid_live" }`.
2. Verify latest `transactions` row:
   - `source = paid_live`
   - `gross_amount = 10000`
   - `back_rate = 0.9`
   - `net_amount = 9000`
3. Verify latest `earnings` row:
   - `revenue_share = 90`
   - `net_amount = 9000`

Expected: paid live payout never depends on level.

## Case 2: Tip payout changes with level

1. Ensure creator level threshold table is populated.
2. Set creator level to a known level (for example 3).
3. Call `POST /api/revenue/record` with `{ "amount": 10000, "source": "tip" }`.
4. Verify `transactions.back_rate` equals level-specific `tip_back_rate` and `net_amount` is floored.

Expected: tip payout uses level-based rate only.

## Case 3: Monthly buckets are updated by source

1. In current month, record:
   - one `tip` revenue
   - one `paid_live` revenue
2. Verify `creator_monthly_scores` for `YYYY-MM`:
   - `tip_gross` increased only by tip amount
   - `paid_live_gross` increased only by paid live amount

Expected: source separation is preserved for ranking inputs.

## Case 4: Overall ranking uses 3 metrics

1. Ensure two creators have different:
   - satisfaction average
   - monthly stream count
   - tip gross
2. Call `GET /api/revenue/monthly-rank?month=YYYY-MM&kind=overall&refresh=1`.
3. Confirm rows are ordered by computed composite score.

Expected: overall rank reflects weighted normalized metrics.

## Case 5: Paid live ranking uses paid live gross only

1. Create creators A and B such that:
   - A has high tips but lower paid live gross
   - B has lower tips but higher paid live gross
2. Call `GET /api/revenue/monthly-rank?month=YYYY-MM&kind=paid_live&refresh=1`.

Expected: B ranks above A if B paid live gross is larger.

## Case 6: Next-month start rank offset (+2)

1. Finalize month `M` aggregation.
2. Finalize month `M+1` aggregation.
3. Verify `creator_monthly_scores.start_rank` for month `M+1`:
   - `start_rank = min(rank_overall_in_M + 2, max_rank)`
4. Verify `next_start_rank` for month `M` matches the same formula.

Expected: no full reset between months.

## Case 7: Level progress API

1. Call `GET /api/livers/me/level-progress`.
2. Verify response fields exist:
   - `currentLevel`, `nextLevel`
   - `tipGrossThisMonth`, `streamCountThisMonth`
   - `requiredTipGross`, `requiredStreamCount`
   - `remainingTipGross`, `remainingStreamCount`
3. Ensure remaining fields never return negative values.

Expected: progress values can be directly rendered in UI.

## Case 8: Stream count increments

1. Call `POST /api/livers/me/streams/record`.
2. Verify:
   - `creators.stream_count` increments by 1
   - monthly `stream_count_monthly` increments by 1
3. Re-check `GET /api/livers/me/level-progress` and confirm decreased remaining stream count.

Expected: stream progress is reflected immediately.
