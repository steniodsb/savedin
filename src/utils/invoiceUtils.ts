/**
 * Given a transaction date and the card's closing/due days, returns the invoice month/year.
 * The invoice month refers to the month the invoice will be DUE FOR PAYMENT.
 *
 * Step 1 — Find which billing cycle the purchase falls into:
 *   - txDay <  closingDay → closes THIS month
 *   - txDay >= closingDay → closes NEXT month
 *
 * Step 2 — Find the payment/due month:
 *   - closingDay <= dueDay → due in the SAME month as closing (e.g., close 4, due 10)
 *   - closingDay >  dueDay → due in the NEXT month after closing (e.g., close 28, due 5)
 *
 * Example (closing=4, due=10 → close<=due, same month):
 *   Apr 3  → closes Apr 4  → due Apr 10 → invoice April
 *   Apr 17 → closes May 4  → due May 10 → invoice May
 *
 * Example (closing=28, due=5 → close>due, next month):
 *   Apr 3  → closes Apr 28 → due May 5  → invoice May
 *   Apr 29 → closes May 28 → due Jun 5  → invoice June
 */
export function getInvoiceMonthYear(
  transactionDate: Date | string,
  closingDay: number,
  dueDay?: number
): { month: number; year: number } {
  const d = typeof transactionDate === 'string' ? new Date(transactionDate + 'T12:00:00') : transactionDate;
  const txDay = d.getDate();
  let month = d.getMonth() + 1; // 1-based
  let year = d.getFullYear();

  // Step 1: which closing cycle?
  if (txDay >= closingDay) {
    month += 1; // closes next month
  }
  // else: closes this month (month stays)

  // Step 2: when is payment due?
  // If closingDay > dueDay, payment is in the month after closing
  // If closingDay <= dueDay (or dueDay unknown), payment is in the same month as closing
  if (dueDay != null && closingDay > dueDay) {
    month += 1;
  }

  // Handle year overflow
  if (month > 12) {
    year += Math.floor((month - 1) / 12);
    month = ((month - 1) % 12) + 1;
  }

  return { month, year };
}

/**
 * Returns the current invoice month/year for a card based on today's date.
 */
export function getCurrentInvoiceMonthYear(closingDay: number, dueDay?: number): { month: number; year: number } {
  return getInvoiceMonthYear(new Date(), closingDay, dueDay);
}

/**
 * Returns the actual due date (YYYY-MM-DD) for a card transaction.
 *
 * Since getInvoiceMonthYear now returns the payment/due month directly,
 * the due date is simply dueDay in that month.
 *
 * Examples (closing_day=28, due_day=5):
 *   Purchase 07/04 → invoice May → due May 5
 *   Purchase 29/03 → invoice May → due May 5
 *
 * Examples (closing_day=4, due_day=10):
 *   Purchase 07/04 → invoice June → due June 10
 *   Purchase 03/04 → invoice May → due May 10
 */
export function getInvoiceDueDate(
  transactionDate: Date | string,
  closingDay: number,
  dueDay: number
): string {
  const inv = getInvoiceMonthYear(transactionDate, closingDay, dueDay);
  const dd = Math.min(dueDay, 28);
  return `${inv.year}-${String(inv.month).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/**
 * Computes the effective invoice status based on the current date, card settings,
 * and existing invoice record.
 *
 * Statuses:
 * - 'paid'    — invoice record exists with status = 'paid'
 * - 'open'    — invoice is the current billing cycle (still accumulating purchases)
 *               or a future month
 * - 'overdue' — past invoice, not paid, past the due date
 * - 'closed'  — past invoice, not paid, but not yet past the due date
 */
export function getEffectiveInvoiceStatus(
  invoiceMonth: number,
  invoiceYear: number,
  closingDay: number,
  dueDay: number,
  invoiceRecordStatus?: string | null,
  invoiceTotal?: number,
): 'open' | 'closed' | 'paid' | 'overdue' | 'zero' {
  if (invoiceRecordStatus === 'paid') return 'paid';

  // If no spending, it's a zero invoice
  if (invoiceTotal !== undefined && invoiceTotal <= 0) return 'zero';

  const current = getCurrentInvoiceMonthYear(closingDay);
  const isCurrentOrFuture =
    invoiceYear > current.year ||
    (invoiceYear === current.year && invoiceMonth >= current.month);

  if (isCurrentOrFuture) return 'open';

  // Past invoice — check if overdue
  const dd = Math.min(dueDay, 28);
  const dueDateStr = `${invoiceYear}-${String(invoiceMonth).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  const dueDate = new Date(dueDateStr + 'T23:59:59');
  const today = new Date();

  if (today > dueDate) return 'overdue';
  return 'closed';
}
