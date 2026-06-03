/**
 * EMI Calculator Utilities
 * Uses the standard reducing-balance EMI formula:
 *   EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
 *   where:
 *     P = principal
 *     r = monthly interest rate (annual rate / 12 / 100)
 *     n = tenure in months
 */

/**
 * Calculate monthly EMI
 * @param {number} principal - Loan amount in INR
 * @param {number} annualRate - Annual interest rate in %
 * @param {number} tenureMonths - Loan tenure in months
 * @returns {object} - { emi, totalInterest, totalRepayment, amortizationSchedule }
 */
const calculateEMI = (principal, annualRate, tenureMonths) => {
    if (!principal || !annualRate || !tenureMonths) {
      throw new Error("Principal, annual rate, and tenure are required");
    }
  
    // Handle 0% interest (BNPL cases)
    if (annualRate === 0) {
      const emi = Math.ceil(principal / tenureMonths);
      return {
        emi,
        totalInterest: 0,
        totalRepayment: principal,
        amortizationSchedule: generateZeroRateSchedule(principal, tenureMonths, emi),
      };
    }
  
    const monthlyRate = annualRate / 12 / 100;
    const compoundFactor = Math.pow(1 + monthlyRate, tenureMonths);
    const emi = Math.ceil((principal * monthlyRate * compoundFactor) / (compoundFactor - 1));
  
    const totalRepayment = emi * tenureMonths;
    const totalInterest = totalRepayment - principal;
  
    return {
      emi,
      totalInterest: Math.round(totalInterest),
      totalRepayment: Math.round(totalRepayment),
      amortizationSchedule: generateAmortizationSchedule(
        principal,
        monthlyRate,
        tenureMonths,
        emi
      ),
    };
  };
  
  /**
   * Generate month-by-month amortization schedule
   */
  const generateAmortizationSchedule = (principal, monthlyRate, tenureMonths, emi) => {
    const schedule = [];
    let balance = principal;
  
    for (let month = 1; month <= tenureMonths; month++) {
      const interestComponent = Math.round(balance * monthlyRate);
      const principalComponent = Math.min(emi - interestComponent, balance);
      balance = Math.max(0, balance - principalComponent);
  
      schedule.push({
        month,
        emi,
        principalComponent,
        interestComponent,
        closingBalance: Math.round(balance),
      });
  
      if (balance === 0) break;
    }
  
    return schedule;
  };
  
  /**
   * Generate schedule for 0% interest loans
   */
  const generateZeroRateSchedule = (principal, tenureMonths, emi) => {
    const schedule = [];
    let balance = principal;
  
    for (let month = 1; month <= tenureMonths; month++) {
      const principalComponent = Math.min(emi, balance);
      balance = Math.max(0, balance - principalComponent);
  
      schedule.push({
        month,
        emi: principalComponent,
        principalComponent,
        interestComponent: 0,
        closingBalance: balance,
      });
  
      if (balance === 0) break;
    }
  
    return schedule;
  };
  
  /**
   * Calculate FOIR (Fixed Obligation to Income Ratio)
   * Used in eligibility checks
   */
  const calculateFOIR = (monthlyIncome, existingEMI, proposedEMI) => {
    return (existingEMI + proposedEMI) / monthlyIncome;
  };
  
  /**
   * Format currency in Indian Rupee notation
   */
  const formatINR = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  module.exports = { calculateEMI, calculateFOIR, formatINR };