const mongoose = require("mongoose");

// ── Message Sub-Schema ─────────────────────────────────────────────────────────
const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["user", "assistant"],
    required: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: [5000, "Message too long"],
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// ── Chat Session Schema ────────────────────────────────────────────────────────
const chatSessionSchema = new mongoose.Schema(
  {
    // Scoped strictly to one user — enforced at schema + query level
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    sessionTitle: {
      type: String,
      default: "Loan Advisory Session",
      maxlength: [100, "Session title too long"],
      trim: true,
    },

    // Messages array — capped at 100 to prevent unbounded growth
    messages: {
      type: [messageSchema],
      default: [],
      validate: {
        validator: (v) => v.length <= 100,
        message: "Session cannot exceed 100 messages. Please start a new session.",
      },
    },

    // Snapshot of the loan profile at time of session creation
    // Stored so historical sessions remain accurate even if user updates profile
    loanContext: {
      loanAmount: { type: Number, min: 0 },
      monthlyIncome: { type: Number, min: 0 },
      existingEMI: { type: Number, min: 0, default: 0 },
      employmentType: {
        type: String,
        enum: ["salaried", "self_employed", "business_owner", "student"],
      },
      loanPurpose: { type: String, trim: true },
      preferredTenure: { type: Number, min: 1, max: 360 },
      riskProfile: {
        type: String,
        enum: ["conservative", "moderate", "aggressive"],
        default: "moderate",
      },
    },

    // Top recommendations snapshot for this session
    recommendations: [
      {
        productId: { type: String, trim: true },
        productName: { type: String, trim: true },
        emi: { type: Number, min: 0 },
        totalInterest: { type: Number, min: 0 },
        totalRepayment: { type: Number, min: 0 },
        eligibilityScore: { type: Number, min: 0, max: 200 },
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────────
// Compound index — covers both user-scoped listing and sorted queries
chatSessionSchema.index({ userId: 1, createdAt: -1 });
chatSessionSchema.index({ userId: 1, isActive: 1 });

// ── Virtuals ───────────────────────────────────────────────────────────────────
// messageCount — avoids sending full messages array just to get count
chatSessionSchema.virtual("messageCount").get(function () {
  return this.messages.length;
});

// lastMessage — useful for session list previews
chatSessionSchema.virtual("lastMessage").get(function () {
  if (!this.messages.length) return null;
  return this.messages[this.messages.length - 1];
});

// ── Static Methods ─────────────────────────────────────────────────────────────
// Find active session for a user (most recent)
chatSessionSchema.statics.findActiveForUser = function (userId) {
  return this.findOne({ userId, isActive: true }).sort({ updatedAt: -1 });
};

// ── Instance Methods ───────────────────────────────────────────────────────────
// Safe method to add a message — respects the 100-message cap
chatSessionSchema.methods.addMessage = function (role, content) {
  if (this.messages.length >= 100) {
    throw new Error("Session message limit reached. Please start a new session.");
  }
  this.messages.push({ role, content, timestamp: new Date() });
};

module.exports = mongoose.model("ChatSession", chatSessionSchema);