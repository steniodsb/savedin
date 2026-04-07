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
