const ChatSession = require("../models/ChatSession");
const User = require("../models/User");
const { callLLM, callLLMWithImage, callLLMWithPDF } = require("../services/llmService");
const { getRecommendations } = require("../services/recommendationService");

/**
 * POST /api/chat/advisor
 * Handle a chat message — multi-turn, session-aware, user-scoped.
 * Supports three modes:
 *   1. Plain text  { message, sessionId? }
 *   2. With image  { message, sessionId?, imageBase64, imageMediaType }
 *   3. With PDF    { message, sessionId?, pdfBase64 }
 */
const sendMessage = async (req, res, next) => {
  try {
    const { message, sessionId, imageBase64, imageMediaType, pdfBase64 } = req.body;
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

    // Generate a traceId for observability
    const traceId = `la-${userId.toString().slice(-6)}-${Date.now()}`;

    // Dispatch to correct LLM method based on what was uploaded
    let aiResponse;
    if (imageBase64 && imageMediaType) {
      // Method 2a: image-grounded query
      aiResponse = await callLLMWithImage(
        message,
        imageBase64,
        imageMediaType,
        loanProfile,
        recommendations
      );
    } else if (pdfBase64) {
      // Method 2b: PDF-grounded query
      aiResponse = await callLLMWithPDF(message, pdfBase64, loanProfile, recommendations);
    } else {
      // Method 1/3: plain text with metadata
      aiResponse = await callLLM(
        message,
        conversationHistory,
        loanProfile,
        recommendations,
        traceId
      );
    }

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
      mode: imageBase64 ? "image" : pdfBase64 ? "pdf" : "text",
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