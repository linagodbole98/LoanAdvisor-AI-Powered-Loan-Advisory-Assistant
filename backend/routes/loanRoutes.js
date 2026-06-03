const express = require("express");
const router = express.Router();
const { recommend, calculateEMIRoute } = require("../controllers/loanController");
const { protect } = require("../middleware/authMiddleware");
const { loanProfileValidation, emiValidation } = require("../middleware/validationMiddleware");

// All loan routes require authentication
router.post("/recommend", protect, loanProfileValidation, recommend);
router.post("/calculate-emi", protect, emiValidation, calculateEMIRoute);

module.exports = router;