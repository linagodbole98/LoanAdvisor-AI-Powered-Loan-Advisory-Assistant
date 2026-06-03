const fetch = require("node-fetch");

const LLM_API_URL = process.env.LLM_API_URL;
const LLM_API_TOKEN = process.env.LLM_API_TOKEN;

/**
 * Build a grounded system prompt from the user's loan context.
 * Grounding prevents hallucination — the AI only knows what we inject.
 */
const buildSystemPrompt = (loanContext, recommendations) => {
  const eligibleProducts = recommendations.filter((r) => r.eligible);
  const topProduct = eligibleProducts[0];

  const productSummary = eligibleProducts
    .slice(0, 3)
    .map(
      (r) =>
        `- ${r.productName}: ₹${r.emi?.toLocaleString("en-IN")}/month EMI at ${r.interestRate}% for ${r.tenure} months (total repayment ₹${r.totalRepayment?.toLocaleString("en-IN")})`
    )
    .join("\n");

  return `You are a responsible, transparent loan advisory assistant for an Indian fintech platform.

BORROWER PROFILE:
- Loan Amount Requested: ₹${loanContext.loanAmount?.toLocaleString("en-IN")}
- Monthly Income: ₹${loanContext.monthlyIncome?.toLocaleString("en-IN")}
- Existing Monthly EMI: ₹${loanContext.existingEMI?.toLocaleString("en-IN") || 0}
- Employment Type: ${loanContext.employmentType}
- Loan Purpose: ${loanContext.loanPurpose || "Not specified"}
- Preferred Tenure: ${loanContext.preferredTenure} months
- Risk Profile: ${loanContext.riskProfile}

ELIGIBLE LOAN PRODUCTS (top 3 matches):
${productSummary || "No eligible products found based on current profile."}

TOP RECOMMENDATION: ${topProduct ? topProduct.productName : "None at this time"}

INSTRUCTIONS:
1. Answer ONLY based on the borrower profile and product data above. Never invent products, rates, or terms not listed.
2. Always explain EMI amounts and total costs clearly using the numbers above.
3. When comparing tenures, explain the trade-off: shorter = higher EMI but less total interest; longer = lower EMI but more total interest.
4. Be empathetic and clear — avoid jargon. Write in simple English.
5. Always end responses with this disclaimer: "⚠️ This is for informational purposes only. Final loan approval depends on underwriting, credit verification, and lender policies."
6. Do NOT guarantee loan approval, quote specific lender names, or make promises about rates.
7. If asked something outside your scope (investments, insurance, tax), politely decline and stay focused on loan advisory.
8. Keep responses concise — 3 to 5 sentences unless a detailed comparison is requested.`;
};

/**
 * Call the LLM wrapper API
 * @param {string} userMessage - The user's question
 * @param {Array} conversationHistory - Prior messages [{role, content}]
 * @param {object} loanContext - User's loan profile
 * @param {Array} recommendations - Engine output
 * @returns {string} - AI response text
 */
const callLLM = async (userMessage, conversationHistory, loanContext, recommendations) => {
  // Check if API is configured
  if (!LLM_API_TOKEN || LLM_API_TOKEN === "YOUR_API_TOKEN") {
    return getMockResponse(userMessage, loanContext, recommendations);
  }

  try {
    const systemPrompt = buildSystemPrompt(loanContext, recommendations);

    // Build messages array with conversation history for multi-turn support
    const messages = [
      ...conversationHistory.slice(-6), // Keep last 6 messages for context window efficiency
      { role: "user", content: userMessage },
    ];

    const response = await fetch(`${LLM_API_URL}/llm/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LLM_API_TOKEN}`,
      },
      body: JSON.stringify({
        prompt: `${systemPrompt}\n\nConversation so far:\n${messages
          .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
          .join("\n")}\n\nUser: ${userMessage}\nAssistant:`,
        metadata: {
          client: "loan-advisor",
          userId: "session", // Not passing real userId to external API for privacy
        },
      }),
      timeout: 30000,
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract text from response
    if (data.content && Array.isArray(data.content)) {
      const textBlock = data.content.find((b) => b.type === "text");
      return textBlock?.text || "I couldn't generate a response. Please try again.";
    }

    return data.response || data.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("LLM API call failed:", error.message);
    // Graceful fallback to mock response
    return getMockResponse(userMessage, loanContext, recommendations);
  }
};

/**
 * Mock AI responses when LLM API is unavailable.
 * Grounded in actual recommendation data — not hallucinated.
 */
const getMockResponse = (userMessage, loanContext, recommendations) => {
  const eligibleProducts = recommendations.filter((r) => r.eligible);
  const topProduct = eligibleProducts[0];
  const lowerMessage = userMessage.toLowerCase();

  const disclaimer =
    "\n\n⚠️ This is for informational purposes only. Final loan approval depends on underwriting, credit verification, and lender policies.";

  // EMI / repayment questions
  if (lowerMessage.includes("emi") || lowerMessage.includes("repayment") || lowerMessage.includes("monthly")) {
    if (topProduct) {
      return `For your requested loan of ₹${loanContext.loanAmount?.toLocaleString("en-IN")}, the estimated EMI for ${topProduct.productName} would be ₹${topProduct.emi?.toLocaleString("en-IN")}/month over ${topProduct.tenure} months at ${topProduct.interestRate}% p.a. Your total repayment would be ₹${topProduct.totalRepayment?.toLocaleString("en-IN")}, which includes ₹${topProduct.totalInterest?.toLocaleString("en-IN")} in interest.${disclaimer}`;
    }
    return `Based on your profile, I wasn't able to find an eligible product. Please review your income and existing EMI obligations.${disclaimer}`;
  }

  // Tenure comparison questions
  if (lowerMessage.includes("tenure") || lowerMessage.includes("shorter") || lowerMessage.includes("longer") || lowerMessage.includes("years")) {
    if (topProduct) {
      return `Comparing tenures for ${topProduct.productName}: A shorter tenure means higher monthly EMI but significantly less total interest paid — better if you can afford it. A longer tenure reduces your monthly burden but increases total interest cost. For your profile, ${topProduct.tenure} months appears suitable given your income of ₹${loanContext.monthlyIncome?.toLocaleString("en-IN")}/month.${disclaimer}`;
    }
    return `Shorter tenures save on interest but increase monthly EMI. Longer tenures reduce EMI but increase total interest. The right choice depends on your monthly cash flow.${disclaimer}`;
  }

  // Recommendation / best product questions
  if (lowerMessage.includes("recommend") || lowerMessage.includes("best") || lowerMessage.includes("suitable") || lowerMessage.includes("which")) {
    if (topProduct) {
      return `Based on your financial profile, ${topProduct.productName} appears most suitable. It matches your employment type (${loanContext.employmentType}), fits within your repayment capacity, and offers an EMI of ₹${topProduct.emi?.toLocaleString("en-IN")}/month — which keeps your total EMI obligation at ${Math.round(topProduct.foirAfterLoan * 100)}% of your income.${disclaimer}`;
    }
    return `Based on your current profile, no products are immediately eligible. This may be due to income thresholds or high existing EMI. Consider applying for a lower loan amount or extending tenure.${disclaimer}`;
  }

  // Compare products
  if (lowerMessage.includes("compare") || lowerMessage.includes("difference") || lowerMessage.includes("vs")) {
    if (eligibleProducts.length >= 2) {
      const p1 = eligibleProducts[0];
      const p2 = eligibleProducts[1];
      return `Comparing your top two options: ${p1.productName} offers an EMI of ₹${p1.emi?.toLocaleString("en-IN")} at ${p1.interestRate}% over ${p1.tenure} months (total: ₹${p1.totalRepayment?.toLocaleString("en-IN")}). ${p2.productName} offers ₹${p2.emi?.toLocaleString("en-IN")} at ${p2.interestRate}% over ${p2.tenure} months (total: ₹${p2.totalRepayment?.toLocaleString("en-IN")}). ${p1.productName} scores higher for your profile.${disclaimer}`;
    }
    return `Only one product is eligible for your current profile: ${topProduct?.productName || "none"}. Consider adjusting your loan amount or tenure to unlock more options.${disclaimer}`;
  }

  // Default greeting / general
  if (topProduct) {
    return `Hello! Based on your profile — ₹${loanContext.monthlyIncome?.toLocaleString("en-IN")} monthly income and ₹${loanContext.loanAmount?.toLocaleString("en-IN")} loan request — I recommend the ${topProduct.productName} with an estimated EMI of ₹${topProduct.emi?.toLocaleString("en-IN")}/month. Feel free to ask about EMI details, tenure comparisons, or product differences.${disclaimer}`;
  }

  return `Hello! I'm your loan advisory assistant. Please submit your loan profile first so I can provide personalized recommendations based on your income, existing obligations, and loan requirements.${disclaimer}`;
};

module.exports = { callLLM };