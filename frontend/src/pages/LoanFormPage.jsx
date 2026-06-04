import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loanService } from "../services/loanService";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const EMPLOYMENT_TYPES = [
  { value: "salaried", label: "Salaried Employee" },
  { value: "self_employed", label: "Self Employed / Freelancer" },
  { value: "business_owner", label: "Business Owner" },
  { value: "student", label: "Student" },
];

const LOAN_PURPOSES = [
  "Home Renovation", "Medical Emergency", "Education", "Wedding",
  "Travel", "Debt Consolidation", "Business Expansion", "Vehicle Purchase", "Other",
];

const RISK_PROFILES = [
  { value: "conservative", label: "Conservative", desc: "Prefer lower EMI, stable repayments" },
  { value: "moderate", label: "Moderate", desc: "Balance between rate and flexibility" },
  { value: "aggressive", label: "Aggressive", desc: "Willing to pay higher EMI for faster closure" },
];

const LoanFormPage = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    loanAmount: "",
    monthlyIncome: "",
    existingEMI: "0",
    employmentType: "salaried",
    loanPurpose: "Home Renovation",
    preferredTenure: "36",
    riskProfile: "moderate",
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loanService.recommend(form);
      // Refresh user from DB so loanProfile is up-to-date in AuthContext
      await refreshUser();
      toast.success("Profile submitted! Generating recommendations...");
      navigate("/dashboard");
    } catch (err) {
      const details = err.response?.data?.details;
      if (details?.length) {
        toast.error(details[0].message);
      } else {
        toast.error(err.response?.data?.error || "Submission failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Loan Profile</h1>
        <p className="text-gray-600 mt-1">
          Tell us about your financial situation to receive personalized recommendations.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Financial Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Financial Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loan Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="loanAmount"
                value={form.loanAmount}
                onChange={handleChange}
                required
                min="1000"
                placeholder="e.g. 500000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Income (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="monthlyIncome"
                value={form.monthlyIncome}
                onChange={handleChange}
                required
                min="1000"
                placeholder="e.g. 75000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Existing Monthly EMI (₹)
              </label>
              <input
                type="number"
                name="existingEMI"
                value={form.existingEMI}
                onChange={handleChange}
                min="0"
                placeholder="0 if none"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Tenure (months) <span className="text-red-500">*</span>
              </label>
              <select
                name="preferredTenure"
                value={form.preferredTenure}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {[6, 12, 18, 24, 36, 48, 60, 72, 84].map((m) => (
                  <option key={m} value={m}>{m} months ({Math.round(m/12*10)/10} yr)</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Profile */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employment Type <span className="text-red-500">*</span>
              </label>
              <select
                name="employmentType"
                value={form.employmentType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {EMPLOYMENT_TYPES.map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loan Purpose</label>
              <select
                name="loanPurpose"
                value={form.loanPurpose}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {LOAN_PURPOSES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Risk Profile */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Risk Profile</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {RISK_PROFILES.map((r) => (
                <label
                  key={r.value}
                  className={`cursor-pointer rounded-lg border-2 p-3 transition-colors ${
                    form.riskProfile === r.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="riskProfile"
                    value={r.value}
                    checked={form.riskProfile === r.value}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <p className="text-sm font-medium text-gray-900">{r.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-xs text-amber-800">
            ⚠️ <strong>Disclaimer:</strong> This recommendation is for informational purposes only.
            Final loan approval depends on underwriting, verification, and lender policies.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
        >
          {loading ? "Generating recommendations..." : "Get Recommendations →"}
        </button>
      </form>
    </div>
  );
};

export default LoanFormPage;