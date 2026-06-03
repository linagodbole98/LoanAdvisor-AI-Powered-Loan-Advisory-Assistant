const User = require("../models/User");
const { getRecommendations } = require("../services/recommendationService");
const { calculateEMI } = require("../utils/emiCalculator");

/**
 * POST /api/loan/recommend
 * Run recommendation engine for user's loan profile
 */
const recommend = async (req, res, next) => {
  try {
    const {
      loanAmount,
      monthlyIncome,
      existingEMI = 0,
      employmentType,
      loanPurpose,
      preferredTenure,
      riskProfile,
    } = req.body;

    const profile = {
      loanAmount: parseFloat(loanAmount),
      monthlyIncome: parseFloat(monthlyIncome),
      existingEMI: parseFloat(existingEMI),
      employmentType,
      loanPurpose,
      preferredTenure: parseInt(preferredTenure),
      riskProfile,
    };

    // Save profile to user account for session persistence
    await User.findByIdAndUpdate(req.user._id, { loanProfile: profile });

    // Run rule-based recommendation engine
    const recommendations = getRecommendations(profile);

    const eligibleCount = recommendations.filter((r) => r.eligible).length;

    res.json({
      message: `Found ${eligibleCount} eligible product(s) for your profile`,
      profile,
      recommendations,
      disclaimer:
        "These recommendations are for informational purposes only. Final loan approval depends on underwriting, verification, and lender policies.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/loan/calculate-emi
 * Calculate EMI, total interest, and repayment for given parameters
 */
const calculateEMIRoute = async (req, res, next) => {
  try {
    const { principal, annualRate, tenureMonths } = req.body;

    const result = calculateEMI(
      parseFloat(principal),
      parseFloat(annualRate),
      parseInt(tenureMonths)
    );

    // Optionally return a tenure comparison
    const comparisons = [];
    const tenures = [12, 24, 36, 48, 60].filter(
      (t) => t !== parseInt(tenureMonths) && t >= 6
    );

    for (const t of tenures.slice(0, 3)) {
      const comp = calculateEMI(parseFloat(principal), parseFloat(annualRate), t);
      comparisons.push({ tenureMonths: t, ...comp });
    }

    res.json({
      principal: parseFloat(principal),
      annualRate: parseFloat(annualRate),
      tenureMonths: parseInt(tenureMonths),
      ...result,
      tenureComparisons: comparisons,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { recommend, calculateEMIRoute };