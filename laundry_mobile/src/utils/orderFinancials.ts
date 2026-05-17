/**
 * Utility for order financial calculations.
 * Centralizes logic for payments, balances, and status flags.
 */

export interface OrderFinancialData {
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  progressPercentage: number;
  fullyPaid: boolean;
  partiallyPaid: boolean;
  unpaid: boolean;
}

/**
 * Calculates financial metrics for an order based on total amount and paid amount.
 * 
 * @param total - The total amount of the order.
 * @param paid - The amount already paid.
 * @returns OrderFinancialData object with calculated metrics.
 */
export const calculateOrderFinancials = (
  total: number | string | undefined | null,
  paid: number | string | undefined | null
): OrderFinancialData => {
  const totalAmount = Math.max(0, Number(total) || 0);
  const paidAmount = Math.max(0, Number(paid) || 0);
  
  // Prevent negative remaining values
  const remaining = Math.max(0, totalAmount - paidAmount);
  
  const progressPercentage = totalAmount > 0 
    ? Math.min(100, (paidAmount / totalAmount) * 100) 
    : 0;

  const fullyPaid = totalAmount > 0 && remaining <= 0.05; // 0.05 buffer for rounding
  const partiallyPaid = paidAmount > 0 && remaining > 0.05;
  const unpaid = paidAmount <= 0 && totalAmount > 0;

  return {
    totalAmount,
    paidAmount,
    remaining,
    progressPercentage,
    fullyPaid,
    partiallyPaid,
    unpaid,
  };
};
