/**
 * RawStock in-app ticket economy (Ticket Shop, Stripe checkout, spend surfaces).
 *
 * video_editors.price_per_minute is stored as RawStock Tickets per minute of output
 * (not JPY). Legacy rows may have been entered as yen; normalize in DB if needed.
 */
export const PRICE_PER_TICKET_USD = 0.01;

/** Minimum pack size when purchasing tickets via Stripe checkout. */
export const MIN_PURCHASE_TICKETS = 100;

export function formatUsdFromTickets(tickets: number): string {
  return `$${(tickets * PRICE_PER_TICKET_USD).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Editor card / list: compact per-minute rate in tickets. */
export function formatEditorTicketsPerMinute(ticketsPerMinute: number): string {
  return `🎟${ticketsPerMinute.toLocaleString()}/min`;
}

export function formatEditorRevenueShareLabel(percent: number): string {
  return `${percent}% rev share`;
}
