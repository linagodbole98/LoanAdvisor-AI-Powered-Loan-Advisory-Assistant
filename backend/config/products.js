/**
 * Mock Loan Product Catalog
 * In production, this would live in MongoDB and be managed via an admin panel.
 */

const LOAN_PRODUCTS = [
    {
      id: "personal_loan",
      name: "Personal Loan",
      description:
        "Unsecured loan for personal needs — medical, travel, wedding, home renovation.",
      interestRate: { min: 10.5, max: 18.0 }, // annual %
      loanAmount: { min: 50000, max: 2500000 }, // INR
      tenure: { min: 12, max: 60 }, // months
      eligibility: {
        minIncome: 25000, // monthly INR
        employmentTypes: ["salaried", "self_employed"],
        maxFoirRatio: 0.5, // Fixed Obligation to Income Ratio
        minCreditScore: 700,
      },
      processingFee: 1.5, // % of loan amount
      features: [
        "No collateral required",
        "Quick disbursal in 2-3 days",
        "Flexible tenure up to 5 years",
      ],
    },
    {
      id: "salary_advance",
      name: "Salary Advance",
      description:
        "Short-term advance against salary for immediate cash needs.",
      interestRate: { min: 12.0, max: 24.0 },
      loanAmount: { min: 10000, max: 300000 },
      tenure: { min: 1, max: 12 },
      eligibility: {
        minIncome: 15000,
        employmentTypes: ["salaried"],
        maxFoirRatio: 0.6,
        minCreditScore: 650,
      },
      processingFee: 2.0,
      features: [
        "Same-day disbursal",
        "Minimal documentation",
        "Auto-deducted from salary",
      ],
    },
    {
      id: "bnpl",
      name: "Buy Now Pay Later (BNPL)",
      description:
        "Short-term credit for purchases — split into easy installments.",
      interestRate: { min: 0, max: 18.0 }, // 0% for short tenures
      loanAmount: { min: 1000, max: 100000 },
      tenure: { min: 1, max: 12 },
      eligibility: {
        minIncome: 10000,
        employmentTypes: ["salaried", "self_employed", "student"],
        maxFoirRatio: 0.7,
        minCreditScore: 600,
      },
      processingFee: 0,
      features: [
        "Zero-cost EMI options",
        "Instant approval",
        "Wide merchant network",
      ],
    },
    {
      id: "sme_loan",
      name: "SME Business Loan",
      description:
        "Working capital or expansion loan for small and medium enterprises.",
      interestRate: { min: 12.0, max: 22.0 },
      loanAmount: { min: 200000, max: 10000000 },
      tenure: { min: 12, max: 84 },
      eligibility: {
        minIncome: 50000, // monthly business revenue
        employmentTypes: ["business_owner", "self_employed"],
        maxFoirRatio: 0.55,
        minCreditScore: 680,
        minBusinessAge: 2, // years
      },
      processingFee: 2.0,
      features: [
        "No personal collateral required up to ₹50L",
        "GST-based underwriting",
        "Flexible repayment schedule",
      ],
    },
    {
      id: "topup_loan",
      name: "Top-up Loan",
      description:
        "Additional loan on an existing home or personal loan with better rates.",
      interestRate: { min: 8.5, max: 14.0 },
      loanAmount: { min: 100000, max: 5000000 },
      tenure: { min: 12, max: 240 }, // up to 20 years if on home loan
      eligibility: {
        minIncome: 30000,
        employmentTypes: ["salaried", "self_employed"],
        maxFoirRatio: 0.5,
        minCreditScore: 720,
        requiresExistingLoan: true,
      },
      processingFee: 0.5,
      features: [
        "Lower interest than new personal loan",
        "No additional collateral",
        "Available after 12 EMIs of existing loan",
      ],
    },
    {
      id: "secured_loan",
      name: "Secured Loan (LAP)",
      description:
        "Loan Against Property — higher amounts at lower rates using property as collateral.",
      interestRate: { min: 8.0, max: 13.0 },
      loanAmount: { min: 500000, max: 50000000 },
      tenure: { min: 12, max: 180 },
      eligibility: {
        minIncome: 40000,
        employmentTypes: ["salaried", "self_employed", "business_owner"],
        maxFoirRatio: 0.6,
        minCreditScore: 680,
        requiresCollateral: true,
      },
      processingFee: 1.0,
      features: [
        "Lowest interest rates",
        "High loan amounts up to 70% of property value",
        "Long tenure available",
      ],
    },
  ];
  
  module.exports = LOAN_PRODUCTS;