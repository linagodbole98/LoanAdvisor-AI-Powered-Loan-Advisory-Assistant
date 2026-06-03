const ChatSession = require("../models/ChatSession");
const User = require("../models/User");
const { callLLM } = require("../services/llmService");
const { getRecommendations } = require("../services/recommendationService");

/**
 * POST /api/chat/advisor
 * Handle a chat message — multi-turn, session-aware, user-scoped
 */
const sendMessage = async (req, res, next) => {
  try {
    const { message, sessionId } = req.body;
    const userId = req.user._id;

    // Get user's loan profile
    const user = await User.findById(userId);
    const loanProfile = user.loanProfile;

    if (!loanProfile || !loanProfile.loanAmount) {
      return res.status(400).json({
        error:
          "Please complete your loan profile first before starting the advisory chat.",
      });
    }

    // Get or create session — ALWAYS scoped to this userId
    let session;
    if (sessionId) {
      // Security: ensure session belongs to the requesting user
      session = await ChatSession.findOne({ _id: sessionId, userId });
      if (!session) {
        return res.status(404).json({ error: "Session not found." });
      }
    } else {
      // Create a new session
      session = await ChatSession.create({
        userId,
        loanContext: loanProfile,
        messages: [],
      });
    }

    // Run recommendation engine to ground the AI response
    const recommendations = getRecommendations(loanProfile);

    // Build conversation history for multi-turn context
    const conversationHistory = session.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Call LLM with full context
    const aiResponse = await callLLM(
      message,
      conversationHistory,
      loanProfile,
      recommendations
    );

    // Persist both messages to session
    session.messages.push({ role: "user", content: message });
    session.messages.push({ role: "assistant", content: aiResponse });

    // Update recommendations snapshot on session
    session.recommendations = recommendations
      .filter((r) => r.eligible)
      .slice(0, 3)
      .map((r) => ({
        productId: r.productId,
        productName: r.productName,
        emi: r.emi,
        totalInterest: r.totalInterest,
        totalRepayment: r.totalRepayment,
        eligibilityScore: r.eligibilityScore,
      }));

    await session.save();

    res.json({
      sessionId: session._id,
      userMessage: message,
      assistantMessage: aiResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chat/sessions
 * List all chat sessions for the authenticated user
 */
const getSessions = async (req, res, next) => {
  try {
    // Strictly filter by userId — no cross-user data leakage
    const sessions = await ChatSession.find({ userId: req.user._id })
      .select("_id sessionTitle createdAt updatedAt messages")
      .sort({ updatedAt: -1 })
      .limit(20);

    res.json({
      sessions: sessions.map((s) => ({
        id: s._id,
        title: s.sessionTitle,
        messageCount: s.messages.length,
        lastUpdated: s.updatedAt,
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chat/sessions/:sessionId
 * Get full message history for a specific session (user-scoped)
 */
const getSessionById = async (req, res, next) => {
  try {
    const session = await ChatSession.findOne({
      _id: req.params.sessionId,
      userId: req.user._id, // Ensures ownership
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found." });
    }

    res.json({
      sessionId: session._id,
      title: session.sessionTitle,
      loanContext: session.loanContext,
      messages: session.messages,
      recommendations: session.recommendations,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { sendMessage, getSessions, getSessionById };