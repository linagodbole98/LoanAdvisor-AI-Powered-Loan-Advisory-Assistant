const { body, validationResult } = require("express-validator");

// Reusable validation result handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// Auth validators
const registerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 50 }),
  body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  validate,
];

const loginValidation = [
  body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
  validate,
];

// Loan profile validators
const loanProfileValidation = [
  body("loanAmount")
    .isFloat({ min: 1000 })
    .withMessage("Loan amount must be at least ₹1,000"),
  body("monthlyIncome")
    .isFloat({ min: 1000 })
    .withMessage("Monthly income must be at least ₹1,000"),
  body("existingEMI")
    .isFloat({ min: 0 })
    .withMessage("Existing EMI must be 0 or more"),
  body("employmentType")
    .isIn(["salaried", "self_employed", "business_owner", "student"])
    .withMessage("Invalid employment type"),
  body("preferredTenure")
    .isInt({ min: 1, max: 360 })
    .withMessage("Tenure must be between 1 and 360 months"),
  body("riskProfile")
    .isIn(["conservative", "moderate", "aggressive"])
    .withMessage("Invalid risk profile"),
  validate,
];

// EMI calculator validators
const emiValidation = [
  body("principal").isFloat({ min: 1 }).withMessage("Principal must be positive"),
  body("annualRate")
    .isFloat({ min: 0, max: 100 })
    .withMessage("Annual rate must be between 0 and 100"),
  body("tenureMonths")
    .isInt({ min: 1, max: 360 })
    .withMessage("Tenure must be between 1 and 360 months"),
  validate,
];

// Chat message validator
const chatValidation = [
  body("message")
    .trim()
    .notEmpty()
    .withMessage("Message cannot be empty")
    .isLength({ max: 1000 })
    .withMessage("Message too long (max 1000 characters)"),
    body("sessionId").optional({ nullable: true }).isMongoId().withMessage("Invalid session ID"),
  validate,
];

module.exports = {
  registerValidation,
  loginValidation,
  loanProfileValidation,
  emiValidation,
  chatValidation,
};