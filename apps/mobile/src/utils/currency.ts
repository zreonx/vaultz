export function formatMoney(
  amount: number | string | undefined | null,
  currencyCode = "USD"
): string {
  const numericAmount = Number(amount) || 0;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    return `${currencyCode.toUpperCase()} ${numericAmount.toFixed(2)}`;
  }
}
