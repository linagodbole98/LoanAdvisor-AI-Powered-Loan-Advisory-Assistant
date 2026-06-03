const LOAN_PRODUCTS = require("../config/products");
const { calculateEMI, calculateFOIR } = require("../utils/emiCalculator");

/**
 * Rule-based Eligibility & Recommendation Engine
 *
 * Evaluates each product against the user's financial profile
 * and returns ranked recommendations with scores and reasons.
 */

/**
 * Main recommendation function
 * @param {object} profile - User's loan profile
 * @returns {Array} - Sorted list of eligible products with EMI details
 */
const getRecommendations = (profile) => {
  const {
    loanAmount,
    monthlyIncome,
    existingEMI = 0,
    employmentType,
    loanPurpose,
    preferredTenure,
    riskProfile,
  } = profile;

  const results = [];

  for (const product of LOAN_PRODUCTS) {
    const evaluation = evaluateProduct(product, {
      loanAmount,
      monthlyIncome,
      existingEMI,
      employmentType,
      loanPurpose,
      preferredTenure,
      riskProfile,
    });

    if (evaluation.eligible) {
      // Calculate EMI using the representative rate for this product + profile
      const rate = getApplicableRate(product, riskProfile, monthlyIncome);
      const tenure = clampTenure(preferredTenure, product.tenure);
      const emiResult = calculateEMI(loanAmount, rate, tenure);
      const foir = calculateFOIR(monthlyIncome, existingEMI, emiResult.emi);

      results.push({
        productId: product.id,
        productName: product.name,
        description: product.description,
        interestRate: rate,
        tenure,
        emi: emiResult.emi,
        totalInterest: emiResult.totalInterest,
        totalRepayment: emiResult.totalRepayment,
        processingFee: Math.round((loanAmount * product.processingFee) / 100),
        foirAfterLoan: Math.round(foir * 100) / 100,
        eligibilityScore: evaluation.score,
        reasons: evaluation.reasons,
        features: product.features,
        eligible: true,
      });
    } else {
      // Still return ineligible products so UI can show why
      results.push({
        productId: product.id,
        productName: product.name,
        description: product.description,
        eligible: false,
        ineligibilityReasons: evaluation.reasons,
        eligibilityScore: 0,
      });
    }
  }

  // Sort eligible products by score descending
  results.sort((a, b) => b.eligibilityScore - a.eligibilityScore);

  return results;
};

/**
 * Evaluate a single product against user profile
 */
const evaluateProduct = (product, profile) => {
  const {
    loanAmount,
    monthlyIncome,
    existingEMI,
    employmentType,
    preferredTenure,
    riskProfile,
  } = profile;

  const reasons = [];
  let score = 100;
  let eligible = true;

  // 1. Employment type check
  if (!product.eligibility.employmentTypes.includes(employmentType)) {
    eligible = false;
    reasons.push(
      `Requires employment type: ${product.eligibility.employmentTypes.join(" or ")}`
    );
  }

  // 2. Loan amount range check
  if (loanAmount < product.loanAmount.min) {
    eligible = false;
    reasons.push(
      `Minimum loan amount is ₹${product.loanAmount.min.toLocaleString("en-IN")}`
    );
  }
  if (loanAmount > product.loanAmount.max) {
    eligible = false;
    reasons.push(
      `Maximum loan amount is ₹${product.loanAmount.max.toLocaleString("en-IN")}`
    );
  }

  // 3. Income check
  if (monthlyIncome < product.eligibility.minIncome) {
    eligible = false;
    reasons.push(
      `Minimum monthly income required: ₹${product.eligibility.minIncome.toLocaleString("en-IN")}`
    );
  }

  // 4. FOIR check — estimate EMI using mid rate
  if (eligible) {
    const rate = getApplicableRate(product, riskProfile, monthlyIncome);
    const tenure = clampTenure(preferredTenure, product.tenure);
    const emiResult = calculateEMI(loanAmount, rate, tenure);
    const foir = calculateFOIR(monthlyIncome, existingEMI, emiResult.emi);

    if (foir > product.eligibility.maxFoirRatio) {
      eligible = false;
      reasons.push(
        `Post-loan EMI burden (${Math.round(foir * 100)}% of income) exceeds allowed limit of ${Math.round(product.eligibility.maxFoirRatio * 100)}%`
      );
    } else {
      // Healthy FOIR boosts score
      const foirMargin = product.eligibility.maxFoirRatio - foir;
      score += Math.round(foirMargin * 50);
      reasons.push(`EMI burden will be ${Math.round(foir * 100)}% of income ✓`);
    }
  }

  // 5. Special conditions
  if (product.eligibility.requiresExistingLoan) {
    // Cannot verify in prototype — note as assumption
    reasons.push("Requires existing loan relationship with lender");
    score -= 10;
  }

  if (product.eligibility.requiresCollateral) {
    reasons.push("Property collateral required");
    score -= 5; // Slight penalty for complexity, still recommended if eligible
  }

  // 6. Scoring bonuses based on suitability
  // Salary advance bonus for salaried + short tenure
  if (product.id === "salary_advance" && employmentType === "salaried" && preferredTenure <= 6) {
    score += 20;
    reasons.push("Ideal for short-tenure salaried needs ✓");
  }

  // SME loan bonus for business owners
  if (product.id === "sme_loan" && employmentType === "business_owner") {
    score += 25;
    reasons.push("Designed specifically for business owners ✓");
  }

  // Personal loan bonus for high income, low existing EMI
  if (
    product.id === "personal_loan" &&
    monthlyIncome >= 50000 &&
    existingEMI / monthlyIncome < 0.4
  ) {
    score += 15;
    reasons.push("Strong income profile for personal loan ✓");
  }

  // Secured loan bonus for conservative risk profile
  if (product.id === "secured_loan" && riskProfile === "conservative") {
    score += 20;
    reasons.push("Lower rate suits conservative risk preference ✓");
  }

  return { eligible, score: Math.max(0, score), reasons };
};

/**
 * Determine applicable interest rate based on risk profile and income
 * Conservative → lower rate (best creditworthy), Aggressive → higher rate
 */
const getApplicableRate = (product, riskProfile, monthlyIncome) => {
  const { min, max } = product.interestRate;
  const range = max - min;

  let riskMultiplier;
  switch (riskProfile) {
    case "conservative":
      riskMultiplier = 0.2; // Close to min rate
      break;
    case "moderate":
      riskMultiplier = 0.5; // Mid rate
      break;
    case "aggressive":
      riskMultiplier = 0.8; // Closer to max rate
      break;
    default:
      riskMultiplier = 0.5;
  }

  // Income-based adjustment — higher income → better rate
  const incomeAdjustment = monthlyIncome >= 100000 ? -0.1 : monthlyIncome >= 50000 ? 0 : 0.1;

  const rate = min + range * Math.max(0, Math.min(1, riskMultiplier + incomeAdjustment));
  return Math.round(rate * 100) / 100;
};

/**
 * Clamp preferred tenure within product limits
 */
const clampTenure = (preferredTenure, tenureLimits) => {
  return Math.max(tenureLimits.min, Math.min(tenureLimits.max, preferredTenure));
};

module.exports = { getRecommendations };