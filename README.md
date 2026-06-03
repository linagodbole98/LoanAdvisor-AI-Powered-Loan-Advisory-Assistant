# 💰 LoanAdvisor — AI-Powered Loan Advisory Assistant

A full-stack fintech application that helps users explore loan products, compare EMI options, and receive personalized AI-grounded recommendations responsibly.

---

## Architecture Overview

```
loan-advisor/
├── backend/                    # Node.js + Express API
│   ├── config/
│   │   ├── db.js               # MongoDB connection
│   │   └── products.js         # Mock product catalog (source of truth)
│   ├── controllers/
│   │   ├── authController.js   # Register, login, getMe
│   │   ├── chatController.js   # Multi-turn AI chat, session management
│   │   ├── loanController.js   # Recommend, calculate EMI
│   │   └── productController.js
│   ├── middleware/
│   │   ├── authMiddleware.js   # JWT verification, user injection
│   │   └── validationMiddleware.js  # express-validator rules
│   ├── models/
│   │   ├── User.js             # User schema (password hashed)
│   │   └── ChatSession.js      # Session + messages (scoped to userId)
│   ├── routes/                 # Express routers
│   ├── services/
│   │   ├── recommendationService.js  # Rule-based eligibility engine
│   │   └── llmService.js            # LLM wrapper integration + fallback
│   ├── utils/
│   │   └── emiCalculator.js    # EMI formula, amortization schedule
│   └── server.js
│
├── frontend/                   # React 18 + Tailwind CSS
│   └── src/
│       ├── context/AuthContext.jsx   # Global auth state
│       ├── pages/
│       │   ├── LoginPage.jsx
│       │   ├── RegisterPage.jsx
│       │   ├── LoanFormPage.jsx      # Profile input
│       │   ├── DashboardPage.jsx     # Recommendations + PDF export
│       │   └── ChatPage.jsx          # Multi-turn AI chat
│       ├── services/
│       │   ├── api.js                # Axios instance + interceptors
│       │   └── loanService.js        # API function wrappers
│       └── utils/
│           ├── formatters.js         # INR format, EMI calc, tenure
│           └── pdfExport.js          # jsPDF recommendation summary
│
└── README.md
```

---

## Setup Instructions

### Prerequisites
- Node.js >= 18
- MongoDB (local or Atlas)
- npm

### 1. Clone and install

```bash
git clone <repo-url>
cd loan-advisor

# Install all dependencies
npm run install:all
```

### 2. Configure backend environment

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/loan_advisor
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=7d
LLM_API_URL=https://llm-wrapper-741152993481.asia-south1.run.app
LLM_API_TOKEN=YOUR_API_TOKEN   # ← Replace with your real token
FRONTEND_URL=http://localhost:3000
```

### 3. Configure frontend environment

```bash
cd frontend
cp .env.example .env
```

Contents:
```
REACT_APP_API_URL=http://localhost:5000/api
```

### 4. Run both servers

```bash
# From root directory
npm run dev
```

Or separately:
```bash
npm run dev:backend    # Port 5000
npm run dev:frontend   # Port 3000
```

### 5. Open the app

Navigate to `http://localhost:3000`, register an account, fill your loan profile, and get recommendations.

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Create new account |
| POST | `/api/auth/login` | No | Login, returns JWT |
| GET | `/api/auth/me` | Yes | Get current user |
| GET | `/api/products` | No | All loan products |
| GET | `/api/products/:id` | No | Single product |
| POST | `/api/loan/recommend` | Yes | Run recommendation engine |
| POST | `/api/loan/calculate-emi` | Yes | Calculate EMI + comparisons |
| POST | `/api/chat/advisor` | Yes | Send chat message |
| GET | `/api/chat/sessions` | Yes | List user's chat sessions |
| GET | `/api/chat/sessions/:id` | Yes | Get session messages |

---

## EMI Formula

Standard reducing-balance formula:

```
EMI = P × r × (1 + r)^n / ((1 + r)^n − 1)

where:
  P = principal loan amount
  r = monthly interest rate = annual rate / 12 / 100
  n = tenure in months
```

Total Interest = (EMI × n) − P
Total Repayment = EMI × n

---

## Recommendation Engine Logic

Rule-based eligibility checks (in order):

1. **Employment type** — must match product's allowed types
2. **Loan amount** — must be within product's min/max range
3. **Income** — must meet product's minimum income threshold
4. **FOIR (Fixed Obligation to Income Ratio)** — (existingEMI + proposedEMI) / income must not exceed product limit (typically 50-60%)
5. **Special conditions** — collateral, existing loan relationship

Scoring bonuses:
- Salary advance + salaried + short tenure → +20
- SME loan + business_owner → +25
- Personal loan + income ≥ 50k + FOIR < 40% → +15
- Secured loan + conservative profile → +20

---

## Prompt Strategy (AI Grounding)

The system prompt injected into every LLM call contains:

1. **Borrower profile** — exact values (income, EMI, employment, amount, tenure, risk)
2. **Top 3 eligible products** — with computed EMI, rate, and total repayment figures
3. **Strict instructions** to:
   - Only reference products and figures provided in the prompt
   - Always end with the responsible AI disclaimer
   - Never guarantee approval or name specific lenders
   - Decline out-of-scope questions (investments, insurance)
   - Keep responses concise (3-5 sentences)

Multi-turn context: last 6 messages are included in each request to support conversation continuity without exceeding context windows.

---

## Security Considerations

### Authentication
- Passwords hashed with bcrypt (cost factor 12)
- JWT tokens signed with HS256, expire in 7 days
- Password field excluded from all MongoDB queries by default (`select: false`)

### Data Isolation
- Every ChatSession and loan profile query is filtered by `userId` — no cross-user data is possible at the query level
- JWT middleware attaches the verified user object to `req.user`; controllers never trust user-supplied IDs for ownership checks

### API Security
- Helmet.js sets security headers (XSS, CSRF, content-type sniffing)
- CORS restricted to frontend origin
- Rate limiting: 100 req/15 min globally, 20 req/min on chat endpoint
- Request body limited to 10kb to prevent payload attacks
- Input validation on all endpoints via express-validator

### LLM Safety
- User's real MongoDB userId is never sent to the external LLM API
- No PII (name, email) is sent in LLM prompts — only anonymized financial parameters
- Fallback mock responses activate automatically if LLM API is unavailable

---

## AI Safeguards

| Risk | Mitigation |
|------|-----------|
| Hallucinated products | System prompt only contains the 6 products from the catalog |
| Made-up interest rates | Rates are injected as computed values, AI cannot modify them |
| Approval guarantee | Instruction explicitly forbids approval language |
| Out-of-scope advice | AI instructed to decline investment/insurance questions |
| Prompt injection | User messages have 1000-char limit; no tool calling available to injected prompts |
| LLM downtime | Deterministic mock fallback with grounded data |

---

## Assumptions

1. Credit score is not collected from users (would require bureau API in production). Risk profile serves as a proxy.
2. FOIR is calculated using the estimated EMI at the assigned rate — actual lender FOIR may use gross income vs net.
3. Business age for SME loans cannot be verified in this prototype — it's noted as an assumption in eligibility reasons.
4. All interest rates are illustrative; real rates depend on creditworthiness, tenure, and lender.
5. "Top-up loan" and "Secured loan" eligibility assumes conditions exist (existing loan, collateral) — shown as informational notes.

---

## Limitations

- No real credit bureau integration
- No actual lender API connections
- MongoDB Atlas free tier may have connection limits under load
- LLM responses are non-deterministic — same question may yield slightly different wording
- PDF export requires client-side jsPDF — not server-rendered

---

## Future Improvements

- **Credit score integration** via CIBIL/Experian API for accurate eligibility
- **Real lender APIs** — fetch live rates from NBFCs/banks
- **Amortization schedule UI** — interactive month-by-month breakdown
- **Multilingual support** — Hindi/Marathi prompt templates
- **Voice input** — Web Speech API for accessibility
- **Admin panel** — manage product catalog in MongoDB without code changes
- **Audit trail** — log every recommendation for compliance review
- **Refresh tokens** — sliding expiry for better UX
- **Email verification** — confirm user identity before showing financial data

---

## Test Cases

| Scenario | Expected Result |
|----------|----------------|
| Income 75k, EMI 0, Loan 5L, salaried, 36mo | Personal Loan ✓ recommended |
| Income 20k, EMI 5k, Loan 10L | FOIR exceeded — no eligible products |
| Business owner, Loan 10L, income 80k | SME Loan scored highest |
| Salaried, income 30k, Loan 50k, 3mo | Salary Advance recommended |
| Conservative risk, Loan 20L, income 1L, has collateral | Secured Loan boosted |
| Student, Loan 5k, purpose Shopping | BNPL eligible |

---

*Built for the AI-Powered Loan Advisory Assignment. Architecture prioritizes clean separation of concerns, responsible AI behavior, and correct financial calculations.*
