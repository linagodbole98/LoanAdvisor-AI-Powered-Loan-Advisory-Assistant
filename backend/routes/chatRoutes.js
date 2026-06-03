const express = require("express");
const router = express.Router();
const { sendMessage, getSessions, getSessionById } = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");
const { chatValidation } = require("../middleware/validationMiddleware");

// All chat routes are protected
router.post("/advisor", protect, chatValidation, sendMessage);
router.get("/sessions", protect, getSessions);
router.get("/sessions/:sessionId", protect, getSessionById);

module.exports = router;