"use client";

import jsPDF from "jspdf";
import type { DatasetStats } from "./stats";
import type { Insight } from "./insights";
import type { QualityMetrics } from "./quality";

interface ReportData {
  datasetName: string;
  stats: DatasetStats;
  insights: Insight[];
  quality: QualityMetrics;
}

export function generateReport(data: ReportData): void {
  const { datasetName, stats, insights, quality } = data;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 0;

  // --- Header bar ---
  doc.setFillColor(26, 35, 50); // dark header #1a2332
  doc.rect(0, 0, pageWidth, 36, "F");
  doc.setTextColor(240, 244, 248);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`Data Analysis Report`, 14, 16);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(datasetName, 14, 26);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), pageWidth - 14, 26, { align: "right" });

  y = 46;

  // --- Executive Summary ---
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Executive Summary", 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);

  const topInsights = insights.slice(0, 3);
  if (topInsights.length === 0) {
    doc.text("No significant insights detected.", 18, y);
    y += 6;
  } else {
    for (const insight of topInsights) {
      const lines = doc.splitTextToSize(`• ${insight.text}`, pageWidth - 32);
      doc.text(lines, 18, y);
      y += lines.length * 5 + 2;
    }
  }

  y += 6;

  // --- Data Quality ---
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Data Quality", 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);

  const qualityItems = [
    `Quality Score: ${quality.qualityScore}/100`,
    `Completeness: ${quality.completeness}%`,
    `Uniqueness: ${quality.uniqueness}%`,
    `Anomalies Detected: ${quality.anomalyCount}`,
  ];
  for (const item of qualityItems) {
    doc.text(`• ${item}`, 18, y);
    y += 6;
  }

  y += 8;

  // --- Key Metrics Table ---
  const numericCols = stats.columns.filter(
    (c) => c.type === "number" && c.mean !== undefined
  );

  if (numericCols.length > 0) {
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Key Metrics", 14, y);
    y += 8;

    // Table header
    const colWidths = [50, 30, 30, 30, 30];
    const headers = ["Column", "Mean", "Min", "Max", "Std Dev"];
    const startX = 14;

    doc.setFillColor(241, 245, 249);
    doc.rect(startX, y - 4, colWidths.reduce((a, b) => a + b, 0), 8, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);

    let xPos = startX;
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], xPos + 2, y);
      xPos += colWidths[i];
    }
    y += 8;

    // Table rows with alternating colors
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);

    numericCols.forEach((col, rowIdx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      if (rowIdx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(startX, y - 4, colWidths.reduce((a, b) => a + b, 0), 7, "F");
      }

      xPos = startX;
      const rowData = [
        col.column,
        col.mean?.toLocaleString() ?? "-",
        col.min?.toLocaleString() ?? "-",
        col.max?.toLocaleString() ?? "-",
        col.stddev?.toLocaleString() ?? "-",
      ];
      for (let i = 0; i < rowData.length; i++) {
        doc.text(String(rowData[i]), xPos + 2, y);
        xPos += colWidths[i];
      }
      y += 7;
    });

    y += 8;
  }

  // --- Anomalies ---
  const anomalyCols = stats.columns.filter(
    (c) => c.anomalies && c.anomalies.length > 0
  );

  if (anomalyCols.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Anomalies", 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);

    for (const col of anomalyCols) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const anomalyValues = col.anomalies!.map((v) => v.toLocaleString()).join(", ");
      const text = `${col.column}: ${col.anomalies!.length} anomalous value(s) — ${anomalyValues}`;
      const lines = doc.splitTextToSize(`• ${text}`, pageWidth - 32);
      doc.text(lines, 18, y);
      y += lines.length * 5 + 2;
    }
  }

  // --- Footer ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "Generated by Data Pipeline Dashboard",
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  // Download
  const safeName = datasetName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  doc.save(`report_${safeName}.pdf`);
}
