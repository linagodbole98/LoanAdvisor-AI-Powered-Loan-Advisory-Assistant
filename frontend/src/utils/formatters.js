/**
 * Format number as Indian Rupee
 */
export const formatINR = (amount) => {
    if (!amount && amount !== 0) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  /**
   * Client-side EMI calculation (mirrors backend logic)
   * EMI = P * r * (1+r)^n / ((1+r)^n - 1)
   */
  export const calcEMI = (principal, annualRate, tenureMonths) => {
    if (!principal || !tenureMonths) return 0;
    if (annualRate === 0) return Math.ceil(principal / tenureMonths);
    const r = annualRate / 12 / 100;
    const n = tenureMonths;
    const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return Math.ceil(emi);
  };
  
  /**
   * Format months as human-readable tenure
   */
  export const formatTenure = (months) => {
    if (months < 12) return `${months} month${months !== 1 ? "s" : ""}`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${years}y ${rem}m` : `${years} year${years !== 1 ? "s" : ""}`;
  };