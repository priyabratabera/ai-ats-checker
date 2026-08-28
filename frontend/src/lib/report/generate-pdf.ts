import type { AnalysisResult } from "@/types/analysis";

const PAGE_WIDTH = 210;
const MARGIN = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const PAGE_HEIGHT = 297;
const BOTTOM_MARGIN = 22;

export async function generateReportPdf(result: AnalysisResult): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_HEIGHT - BOTTOM_MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const heading = (text: string, size = 14) => {
    ensureSpace(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.setTextColor(15, 23, 42);
    doc.text(text, MARGIN, y);
    y += size * 0.5;
  };

  const paragraph = (text: string, size = 10) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH) as string[];
    for (const line of lines) {
      ensureSpace(6);
      doc.text(line, MARGIN, y);
      y += 5.2;
    }
  };

  const spacer = (amount = 4) => {
    y += amount;
  };

  const rule = () => {
    ensureSpace(4);
    doc.setDrawColor(226, 232, 240);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 6;
  };

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(79, 70, 229);
  doc.text("ATS Resume Analysis Report", MARGIN, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${result.resumeMeta.fileName} - generated ${new Date(result.createdAt).toLocaleString()}`,
    MARGIN,
    y,
  );
  y += 10;
  rule();

  // Overall score
  heading("Overall ATS Score", 16);
  spacer(2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.setTextColor(79, 70, 229);
  doc.text(`${result.score.overall} / 100`, MARGIN, y + 10);
  y += 16;
  spacer(6);

  // Category breakdown
  heading("Score Breakdown", 13);
  spacer(2);
  for (const category of result.score.categories) {
    ensureSpace(7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);
    doc.text(category.label, MARGIN, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${category.score}%`, PAGE_WIDTH - MARGIN, y, { align: "right" });

    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(MARGIN, y + 1.5, CONTENT_WIDTH, 2, 1, 1, "F");
    doc.setFillColor(79, 70, 229);
    doc.roundedRect(MARGIN, y + 1.5, CONTENT_WIDTH * (category.score / 100), 2, 1, 1, "F");
    y += 9;
  }
  spacer(4);
  rule();

  // Keyword analysis
  heading("Keyword Analysis", 13);
  spacer(2);
  paragraph(
    `Matched: ${result.keywordAnalysis.matched.length}   Partial: ${result.keywordAnalysis.partial.length}   Missing: ${result.keywordAnalysis.missing.length}`,
  );
  spacer(2);
  if (result.keywordAnalysis.missing.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    ensureSpace(6);
    doc.text("Top missing keywords:", MARGIN, y);
    y += 5.5;
    paragraph(
      result.keywordAnalysis.missing
        .slice(0, 15)
        .map((m) => m.term)
        .join(", "),
    );
  }
  spacer(4);
  rule();

  // Semantic insights
  heading("Semantic Analysis", 13);
  spacer(2);
  paragraph(result.semanticInsights.summary);
  spacer(4);
  rule();

  // Recommendations
  heading("Recommendations", 13);
  spacer(2);
  result.recommendations.slice(0, 12).forEach((rec, idx) => {
    ensureSpace(8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`${idx + 1}. ${rec.title} (${rec.priority} priority)`, MARGIN, y);
    y += 5.2;
    paragraph(rec.description, 9.5);
    spacer(2);
  });

  // Footer page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 10, { align: "right" });
  }

  const safeName = result.resumeMeta.fileName.replace(/\.[^.]+$/, "");
  doc.save(`${safeName}-ats-report.pdf`);
}
