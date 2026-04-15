/**
 * Given a transaction date and the card's closing day, returns the invoice month/year.
 * The invoice month refers to the month the invoice will be DUE FOR PAYMENT.
 *
 * The billing cycle that closes on day `closingDay` of month M contains purchases
 * from day (closingDay+1) of month M-1 through day closingDay of month M.
 * That invoice is due for payment in month M+1 (if dueDay < closingDay) or month M.
 * We label the invoice by the month AFTER it closes (the payment month).
 *
 * Logic:
 * - If transaction day >= closingDay → invoice closes next month → payment month = current + 2
 * - If transaction day < closingDay  → invoice closes this month → payment month = current + 1
 *
 * Example (closing_day = 28):
 * - Apr 3  (day 3 < 28)  → closes Apr 28 → invoice May
 * - Apr 28 (day 28 >= 28) → closes May 28 → invoice June
 * - Mar 29 (day 29 >= 28) → closes Apr 28 → invoice May
 *
 * Example (closing_day = 4):
 * - Mar 3  (day 3 < 4)   → closes Mar 4  → invoice April
 * - Mar 4  (day 4 >= 4)  → closes Apr 4  → invoice May
 * - Mar 5  (day 5 >= 4)  → closes Apr 4  → invoice May
 */
export function getInvoiceMonthYear(
  transactionDate: Date | string,
  closingDay: number
): { month: number; year: number } {
  const d = typeof transactionDate === 'string' ? new Date(transactionDate + 'T12:00:00') : transactionDate;
  const txDay = d.getDate();
  let month = d.getMonth() + 1; // 1-based
  let year = d.getFullYear();

  // Purchase before closing day → invoice closes this month → payment next month
  // Purchase on or after closing day → invoice closes next month → payment month after that
  if (txDay >= closingDay) {
    month += 2;
  } else {
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
export function getCurrentInvoiceMonthYear(closingDay: number): { month: number; year: number } {
  return getInvoiceMonthYear(new Date(), closingDay);
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
  const inv = getInvoiceMonthYear(transactionDate, closingDay);
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
): 'open' | 'closed' | 'paid' | 'overdue' {
  if (invoiceRecordStatus === 'paid') return 'paid';

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
