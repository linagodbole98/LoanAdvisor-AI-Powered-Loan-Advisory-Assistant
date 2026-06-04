import api from "./api";

// Auth
export const authService = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
};

// Loan
export const loanService = {
  recommend: (profile) => api.post("/loan/recommend", profile),
  calculateEMI: (data) => api.post("/loan/calculate-emi", data),
};

// Chat
export const chatService = {
  /**
   * Send a chat message.
   * @param {string} message - User text
   * @param {string|null} sessionId - Existing session to continue
   * @param {object} filePayload - Optional: { imageBase64, imageMediaType } or { pdfBase64 }
   */
  sendMessage: (message, sessionId, filePayload = {}) =>
    api.post("/chat/advisor", { message, sessionId, ...filePayload }),
  getSessions: () => api.get("/chat/sessions"),
  getSession: (sessionId) => api.get(`/chat/sessions/${sessionId}`),
};

// Products
export const productService = {
  getAll: () => api.get("/products"),
  getById: (id) => api.get(`/products/${id}`),
};