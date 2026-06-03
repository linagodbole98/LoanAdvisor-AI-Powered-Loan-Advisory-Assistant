import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { loanService } from "../services/loanService";
import { useAuth } from "../context/AuthContext";
import { formatINR, formatTenure } from "../utils/formatters";
import { generatePDF } from "../utils/pdfExport";
import toast from "react-hot-toast";

const ScoreBadge = ({ score }) => {
  const color = score >= 120 ? "green" : score >= 80 ? "blue" : "gray";
  const labels = { green: "bg-green-100 text-green-700", blue: "bg-blue-100 text-blue-700", gray: "bg-gray-100 text-gray-600" };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${labels[color]}`}>
      Score: {score}
    </span>
  );
};

const ProductCard = ({ rec, index, isTop }) => (
  <div className={`bg-white rounded-xl border-2 ${isTop ? "border-blue-500" : "border-gray-200"} p-5 relative`}>
    {isTop && (
      <span className="absolute -top-3 left-4 bg-blue-600 text-white text-xs font-medium px-3 py-0.5 rounded-full">
        ⭐ Top Recommendation
      </span>
    )}
    <div className="flex items-start justify-between mb-3">
      <div>
        <h3 className="font-semibold text-gray-900">{rec.productName}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{rec.description}</p>
      </div>
      <ScoreBadge score={rec.eligibilityScore} />
    </div>

    <div className="grid grid-cols-2 gap-3 mb-4">
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-500">Monthly EMI</p>
        <p className="text-lg font-bold text-blue-700">{formatINR(rec.emi)}</p>
      </div>
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-500">Interest Rate</p>
        <p className="text-lg font-bold text-gray-900">{rec.interestRate}% p.a.</p>
      </div>
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-500">Total Interest</p>
        <p className="text-sm font-semibold text-orange-600">{formatINR(rec.totalInterest)}</p>
      </div>
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-500">Total Repayment</p>
        <p className="text-sm font-semibold text-gray-900">{formatINR(rec.totalRepayment)}</p>
      </div>
    </div>

    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
      <span>Tenure: {formatTenure(rec.tenure)}</span>
      <span>Processing fee: {formatINR(rec.processingFee)}</span>
      <span>EMI burden: {Math.round(rec.foirAfterLoan * 100)}% of income</span>
    </div>

    {rec.features && (
      <div className="flex flex-wrap gap-1 mb-3">
        {rec.features.map((f, i) => (
          <span key={i} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{f}</span>
        ))}
      </div>
    )}

    {rec.reasons && (
      <div className="border-t border-gray-100 pt-3">
        <p className="text-xs font-medium text-gray-600 mb-1">Why this product:</p>
        <ul className="space-y-0.5">
          {rec.reasons.map((r, i) => (
            <li key={i} className="text-xs text-gray-500">• {r}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

const IneligibleCard = ({ rec }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 opacity-70">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-sm font-medium text-gray-700">{rec.productName}</span>
      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Not eligible</span>
    </div>
    <ul className="space-y-0.5">
      {rec.ineligibilityReasons?.map((r, i) => (
        <li key={i} className="text-xs text-gray-400">• {r}</li>
      ))}
    </ul>
  </div>
);

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const recommendations = JSON.parse(
    localStorage.getItem("recommendation") || localStorage.getItem("recommentation")
  );
  const [data, setData] = useState(recommendations);
  const [loading, setLoading] = useState(true);
  const [showIneligible, setShowIneligible] = useState(false);
  const savedProfile = JSON.parse(localStorage.getItem("loanProfile"));

  
  console.log(user,"user",recommendations)

  const fetchRecommendations = useCallback(async () => {
    try {
      const profileToUse = user?.loanProfile || savedProfile;
      if (!profileToUse?.loanAmount) {
        navigate("/loan-form");
        return;
      }
      const res = await loanService.recommend(profileToUse);
      setData(res.data || recommendations);
    } catch (err) {
      if (err.response?.status === 400) {
        navigate("/loan-form");
      } else {
        toast.error("Failed to load recommendations");
      }
    } finally {
      setLoading(false);
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin text-3xl mb-3">⚙️</div>
          <p className="text-gray-600">Analyzing your profile...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const eligible = data.recommendations.filter((r) => r.eligible);
  const ineligible = data.recommendations.filter((r) => !r.eligible);

  const handleDownloadPDF = () => {
    try {
      generatePDF(data);
      toast.success("PDF downloaded!");
    } catch {
      toast.error("PDF generation failed");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Loan Recommendations</h1>
          <p className="text-gray-600 mt-1">{data.message}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            📄 Download PDF
          </button>
          <button
            onClick={() => navigate("/chat")}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            💬 Ask AI Advisor
          </button>
        </div>
      </div>

      {/* Profile summary */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
        <p className="text-sm font-medium text-blue-900 mb-2">Your Profile Summary</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div><span className="text-blue-600">Loan:</span> <span className="font-medium">{formatINR(data.profile.loanAmount)}</span></div>
          <div><span className="text-blue-600">Income:</span> <span className="font-medium">{formatINR(data.profile.monthlyIncome)}/mo</span></div>
          <div><span className="text-blue-600">Existing EMI:</span> <span className="font-medium">{formatINR(data.profile.existingEMI)}</span></div>
          <div><span className="text-blue-600">Tenure:</span> <span className="font-medium">{formatTenure(data.profile.preferredTenure)}</span></div>
        </div>
      </div>

      {/* Eligible products */}
      {eligible.length > 0 ? (
        <div className="space-y-4 mb-6">
          {eligible.map((rec, i) => (
            <ProductCard key={rec.productId} rec={rec} index={i} isTop={i === 0} />
          ))}
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6 text-center">
          <p className="text-red-700 font-medium">No eligible products found</p>
          <p className="text-red-600 text-sm mt-1">Try reducing the loan amount or increasing tenure.</p>
          <button onClick={() => navigate("/loan-form")} className="mt-3 text-sm text-blue-600 hover:underline">
            Update Profile →
          </button>
        </div>
      )}

      {/* Ineligible products toggle */}
      {ineligible.length > 0 && (
        <div>
          <button
            onClick={() => setShowIneligible(!showIneligible)}
            className="text-sm text-gray-500 hover:text-gray-700 mb-3"
          >
            {showIneligible ? "▼" : "▶"} {ineligible.length} products you don't qualify for currently
          </button>
          {showIneligible && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ineligible.map((r) => <IneligibleCard key={r.productId} rec={r} />)}
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-xs text-amber-800">
          ⚠️ <strong>Important:</strong> {data.disclaimer}
        </p>
      </div>
    </div>
  );
};

export default DashboardPage;