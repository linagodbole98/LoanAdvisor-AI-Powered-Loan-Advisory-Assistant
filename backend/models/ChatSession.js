const mongoose = require("mongoose");

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

const chatSessionSchema = new mongoose.Schema(
  {
    // Each session is scoped strictly to one user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionTitle: {
      type: String,
      default: "Loan Advisory Session",
    },
    messages: [messageSchema],
    // Snapshot of loan profile used in this session
    loanContext: {
      loanAmount: Number,
      monthlyIncome: Number,
      existingEMI: Number,
      employmentType: String,
      loanPurpose: String,
      preferredTenure: Number,
      riskProfile: String,
    },
    // Recommendations generated in this session
    recommendations: [
      {
        productId: String,
        productName: String,
        emi: Number,
        totalInterest: Number,
        totalRepayment: Number,
        eligibilityScore: Number,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a user can only access their own sessions (enforced at query level too)
chatSessionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("ChatSession", chatSessionSchema);