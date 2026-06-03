/**
 * PDF Export — Loan Recommendation Summary
 * Uses jsPDF + autoTable for a clean downloadable report.
 */
export const generatePDF = (data) => {
    // Dynamic import to avoid loading jsPDF on every page
    import("jspdf").then(({ jsPDF }) => {
      import("jspdf-autotable").then(() => {
        const doc = new jsPDF();
        const { profile, recommendations } = data;
  
        // Title
        doc.setFontSize(20);
        doc.setTextColor(30, 78, 216);
        doc.text("LoanAdvisor — Recommendation Report", 14, 20);
  
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 14, 28);
  
        // Profile section
        doc.setFontSize(13);
        doc.setTextColor(0);
        doc.text("Your Financial Profile", 14, 40);
  
        doc.autoTable({
          startY: 45,
          head: [["Parameter", "Value"]],
          body: [
            ["Loan Amount", `₹${profile.loanAmount?.toLocaleString("en-IN")}`],
            ["Monthly Income", `₹${profile.monthlyIncome?.toLocaleString("en-IN")}`],
            ["Existing EMI", `₹${profile.existingEMI?.toLocaleString("en-IN") || 0}`],
            ["Employment Type", profile.employmentType],
            ["Loan Purpose", profile.loanPurpose || "—"],
            ["Preferred Tenure", `${profile.preferredTenure} months`],
            ["Risk Profile", profile.riskProfile],
          ],
          styles: { fontSize: 10 },
          headStyles: { fillColor: [37, 99, 235] },
        });
  
        // Recommendations section
        const eligible = recommendations.filter((r) => r.eligible);
        if (eligible.length > 0) {
          doc.text("Eligible Loan Products", 14, doc.lastAutoTable.finalY + 15);
  
          doc.autoTable({
            startY: doc.lastAutoTable.finalY + 20,
            head: [["Product", "Rate", "Tenure", "EMI/mo", "Total Interest", "Total Repayment"]],
            body: eligible.map((r) => [
              r.productName,
              `${r.interestRate}% p.a.`,
              `${r.tenure} months`,
              `₹${r.emi?.toLocaleString("en-IN")}`,
              `₹${r.totalInterest?.toLocaleString("en-IN")}`,
              `₹${r.totalRepayment?.toLocaleString("en-IN")}`,
            ]),
            styles: { fontSize: 9 },
            headStyles: { fillColor: [37, 99, 235] },
          });
        }
  
        // Disclaimer
        const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 200;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          "DISCLAIMER: This recommendation is for informational purposes only. Final loan approval depends on\nunderwriting, credit verification, and lender policies. This is not a guarantee of loan approval.",
          14,
          finalY
        );
  
        doc.save("loan-recommendation.pdf");
      });
    });
  };