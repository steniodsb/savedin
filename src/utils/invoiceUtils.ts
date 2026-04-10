/**
 * Given a transaction date and the card's closing day, returns the invoice month/year.
 *
 * Logic:
 * - If transaction day < closingDay → invoice is for that same month (closes this month)
 * - If transaction day >= closingDay → invoice is for the next month (closes next month)
 *
 * Example (closing_day = 4):
 * - March 3 → invoice March (closes March 4)
 * - March 4 → invoice April (closes April 4) — purchase ON closing day goes to next invoice
 * - March 5 → invoice April (closes April 4)
 */
export function getInvoiceMonthYear(
  transactionDate: Date | string,
  closingDay: number
): { month: number; year: number } {
  const d = typeof transactionDate === 'string' ? new Date(transactionDate + 'T12:00:00') : transactionDate;
  const txDay = d.getDate();
  let month = d.getMonth() + 1; // 1-based
  let year = d.getFullYear();

  if (txDay >= closingDay) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
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
 * The invoice month from getInvoiceMonthYear is when the invoice closes.
 * The due date may fall in the same month or the next month depending on
 * whether due_day >= closing_day or due_day < closing_day.
 *
 * Examples (closing_day=28, due_day=5):
 *   Purchase 07/04 → invoice month April → closes Apr 28 → due May 5
 *   Purchase 29/03 → invoice month April → closes Apr 28 → due May 5
 *
 * Examples (closing_day=4, due_day=10):
 *   Purchase 07/04 → invoice month May → closes May 4 → due May 10
 *   Purchase 03/04 → invoice month April → closes Apr 4 → due Apr 10
 */
export function getInvoiceDueDate(
  transactionDate: Date | string,
  closingDay: number,
  dueDay: number
): string {
  const inv = getInvoiceMonthYear(transactionDate, closingDay);
  let dueMonth = inv.month;
  let dueYear = inv.year;

  // If due_day < closing_day, the payment is in the month after the invoice closes
  if (dueDay < closingDay) {
    dueMonth += 1;
    if (dueMonth > 12) {
      dueMonth = 1;
      dueYear += 1;
    }
  }

  const dd = Math.min(dueDay, 28);
  return `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}
