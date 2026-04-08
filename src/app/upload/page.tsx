"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { parseCSV, detectAllColumnTypes } from "@/lib/csv-parser";
import JSZip from "jszip";

const SAMPLE_DATASETS: Record<string, string> = {
  "sales-performance-2026.csv": `Month,Revenue,Customers,Churn_Rate,MRR,Support_Tickets
Jan 2026,142500,1205,3.2,118750,89
Feb 2026,156800,1287,2.8,130667,76
Mar 2026,163200,1342,2.5,136000,82
Apr 2026,171900,1398,2.9,143250,91
May 2026,185400,1456,2.3,154500,68
Jun 2026,192700,1523,2.1,160583,72
Jul 2026,198300,1589,2.4,165250,85
Aug 2026,210500,1645,1.9,175417,63
Sep 2026,205800,1612,3.1,171500,97
Oct 2026,224100,1701,2.0,186750,71
Nov 2026,231600,1768,1.8,193000,65
Dec 2026,248900,1834,1.6,207417,58`,

  "pnl-income-statement-2025.csv": `Month,Revenue,COGS,Gross_Profit,Gross_Margin_%,OpEx,Marketing,R&D,G&A,EBITDA,Net_Income
Jan 2025,895000,380000,515000,57.5,310000,95000,140000,75000,-105000,-135000
Feb 2025,920000,395000,525000,57.1,320000,105000,135000,80000,-115000,-140000
Mar 2025,980000,410000,570000,58.2,295000,110000,145000,70000,-50000,-75000
Apr 2025,1050000,440000,610000,58.1,330000,120000,150000,85000,-75000,-100000
May 2025,1100000,460000,640000,58.2,300000,100000,155000,72000,13000,-8000
Jun 2025,1150000,480000,670000,58.3,340000,125000,160000,88000,-43000,-68000
Jul 2025,1080000,450000,630000,58.3,315000,115000,145000,78000,-23000,-48000
Aug 2025,1200000,500000,700000,58.3,325000,130000,165000,82000,-2000,-27000
Sep 2025,1175000,490000,685000,58.3,310000,105000,155000,75000,40000,15000
Oct 2025,1250000,520000,730000,58.4,335000,135000,170000,90000,0,-25000
Nov 2025,1180000,495000,685000,58.1,300000,110000,148000,73000,54000,29000
Dec 2025,1300000,540000,760000,58.5,345000,140000,175000,95000,5000,-20000`,

  "department-budget-2025.csv": `Department,Quarter,Budget,Actual,Variance,Variance_%,Headcount,Cost_per_Head
Engineering,Q1 2025,450000,485000,35000,7.8,35,13857
Engineering,Q2 2025,460000,510000,50000,10.9,38,13421
Engineering,Q3 2025,470000,520000,50000,10.6,40,13000
Engineering,Q4 2025,480000,495000,15000,3.1,42,11786
Marketing,Q1 2025,280000,265000,-15000,-5.4,18,14722
Marketing,Q2 2025,290000,310000,20000,6.9,20,15500
Marketing,Q3 2025,300000,325000,25000,8.3,22,14773
Marketing,Q4 2025,310000,295000,-15000,-4.8,21,14048
Sales,Q1 2025,350000,380000,30000,8.6,25,15200
Sales,Q2 2025,360000,345000,-15000,-4.2,24,14375
Sales,Q3 2025,370000,395000,25000,6.8,27,14630
Sales,Q4 2025,380000,410000,30000,7.9,28,14643
HR,Q1 2025,180000,175000,-5000,-2.8,12,14583
HR,Q2 2025,185000,190000,5000,2.7,13,14615
HR,Q3 2025,190000,195000,5000,2.6,13,15000
HR,Q4 2025,195000,200000,5000,2.6,14,14286`,

  "saas-kpi-dashboard.csv": `Month,MRR,ARR,Total_Customers,New_Customers,Churned_Customers,Churn_Rate_%,ARPU,LTV,CAC,LTV_CAC_Ratio,Net_Revenue_Retention_%,Gross_Margin_%,Monthly_Burn,Runway_Months
Jan 2026,180000,2160000,850,45,12,1.4,211.76,15126,1200,12.6,103.2,78.5,-25000,96.0
Feb 2026,192000,2304000,883,48,15,1.7,217.44,12791,1100,11.6,104.1,79.2,-22000,109.1
Mar 2026,205000,2460000,916,50,17,1.9,223.80,11779,1050,11.2,105.5,80.1,-18000,133.3
Apr 2026,215000,2580000,949,52,19,2.0,226.55,11328,1150,9.8,102.8,77.8,-28000,85.7
May 2026,228000,2736000,985,55,19,1.9,231.47,12183,1300,9.4,106.2,79.5,-20000,120.0
Jun 2026,240000,2880000,1021,48,12,1.2,235.06,19588,950,20.6,107.1,81.3,-15000,160.0
Jul 2026,252000,3024000,1057,52,16,1.5,238.41,15894,1100,14.4,104.5,78.9,-22000,109.1
Aug 2026,263000,3156000,1093,50,14,1.3,240.62,18509,1250,14.8,105.8,80.5,-17000,141.2
Sep 2026,275000,3300000,1128,48,13,1.2,243.79,20316,1050,19.3,106.3,81.8,-14000,171.4
Oct 2026,288000,3456000,1165,52,15,1.3,247.21,19016,1150,16.5,107.5,79.8,-19000,126.3
Nov 2026,300000,3600000,1202,55,18,1.5,249.58,16639,1200,13.9,104.9,80.2,-16000,150.0
Dec 2026,315000,3780000,1240,50,12,1.0,254.03,25403,1000,25.4,108.2,82.1,-12000,200.0`,

  "revenue-forecast-2025.csv": `Month,Forecast,Actual,Variance,Forecast_Accuracy_%,Previous_Year,YoY_Growth_%,Pipeline_Value,Win_Rate_%
Jan 2025,850000,895000,45000,94.7,720000,24.3,2400000,28.5
Feb 2025,880000,920000,40000,95.5,745000,23.5,2650000,31.2
Mar 2025,920000,980000,60000,93.5,790000,24.1,2800000,29.8
Apr 2025,960000,1050000,90000,90.6,825000,27.3,3100000,33.5
May 2025,1000000,1100000,100000,90.0,860000,27.9,3200000,34.1
Jun 2025,1030000,1150000,120000,88.3,890000,29.2,3500000,32.8
Jul 2025,1060000,1080000,20000,98.1,920000,17.4,2900000,27.5
Aug 2025,1090000,1200000,110000,89.9,955000,25.7,3400000,35.2
Sep 2025,1100000,1175000,75000,93.2,975000,20.5,3150000,30.8
Oct 2025,1130000,1250000,120000,89.4,1010000,23.8,3600000,34.7
Nov 2025,1150000,1180000,30000,97.5,1035000,14.0,2750000,28.2
Dec 2025,1180000,1300000,120000,89.8,1060000,22.6,3800000,36.5`
};

async function downloadAllSampleData() {
  const zip = new JSZip();
  for (const [filename, content] of Object.entries(SAMPLE_DATASETS)) {
    zip.file(filename, content);
  }
  zip.file("README.txt", `Data Pipeline Dashboard — Sample Datasets
==========================================

5 CSV files included:
1. sales-performance-2026.csv — Monthly sales KPIs (Revenue, Customers, Churn, MRR)
2. pnl-income-statement-2025.csv — P&L with Revenue, COGS, EBITDA, Net Income, Margins
3. department-budget-2025.csv — Budget vs Actual per department per quarter
4. saas-kpi-dashboard.csv — SaaS metrics: MRR, ARR, LTV, CAC, Churn, NRR, Runway
5. revenue-forecast-2025.csv — Forecast vs Actual with YoY Growth, Pipeline, Win Rate

Upload any of these CSV files to explore the dashboard features:
- Interactive charts with Bar, Line, Area, Pie views
- SQL Query Editor
- AI Data Analyst (ask questions in natural language)
- Anomaly Detection
- Forecast/Trend Predictions
- Calculated Columns (formulas)
- PDF Report Generation
`);
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "sample-datasets.zip";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadSingleCSV(filename: string) {
  const content = SAMPLE_DATASETS[filename];
  if (!content) return;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function UploadPage() {
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState("");
  const [preview, setPreview] = useState<{
    headers: string[];
    rows: Record<string, string>[];
    types: Record<string, string>;
  } | null>(null);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const processFile = useCallback((f: File) => {
    setFile(f);
    setName(f.name.replace(/\.csv$/i, "").replace(/[_-]/g, " "));
    setError("");

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvContent(text);
      const parsed = parseCSV(text);
      if (parsed.headers.length === 0) {
        setError("CSV appears to be empty or invalid.");
        return;
      }
      const types = detectAllColumnTypes(parsed.headers, parsed.rows);
      setPreview({
        headers: parsed.headers,
        rows: parsed.rows.slice(0, 10),
        types,
      });
    };
    reader.readAsText(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const f = e.dataTransfer.files[0];
      if (f && f.name.endsWith(".csv")) {
        processFile(f);
      } else {
        setError("Please upload a .csv file");
      }
    },
    [processFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) processFile(f);
    },
    [processFile]
  );

  const handleUpload = async () => {
    if (!csvContent || !name) return;
    setUploading(true);
    setError("");

    try {
      const res = await fetch("/api/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          fileName: file?.name ?? "upload.csv",
          csvContent,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Upload failed");
        return;
      }

      const data = await res.json();
      router.push(`/datasets/${data.id}`);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Upload Dataset</h1>
        <p className="text-sm text-text-muted mt-1">
          Upload a CSV file to analyze. Column types are auto-detected.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
          dragActive
            ? "border-accent bg-accent-subtle"
            : "border-border-color hover:border-accent/50"
        }`}
      >
        <div className="w-12 h-12 rounded-xl bg-accent-subtle mx-auto flex items-center justify-center mb-4">
          <svg
            className="w-6 h-6 text-accent"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
        <p className="text-text-secondary mb-2">
          {file ? file.name : "Drag & drop your CSV file here"}
        </p>
        <p className="text-sm text-text-muted mb-4">or</p>
        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors cursor-pointer">
          Browse Files
          <input
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="hidden"
          />
        </label>
      </div>

      {/* Sample Data Downloads */}
      <div className="mt-6 bg-bg-card rounded-xl border border-border-subtle p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-text-primary font-semibold">Sample Datasets</p>
            <p className="text-xs text-text-muted mt-0.5">5 enterprise-grade CSV datasets to explore all features</p>
          </div>
          <button
            onClick={downloadAllSampleData}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium flex-shrink-0 transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download All (ZIP)
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.keys(SAMPLE_DATASETS).map((filename) => (
            <button
              key={filename}
              onClick={() => downloadSingleCSV(filename)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-secondary hover:bg-border-subtle border border-border-subtle text-left transition-colors group"
            >
              <svg className="w-4 h-4 text-text-muted group-hover:text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="min-w-0">
                <p className="text-xs text-text-secondary font-medium truncate">{filename}</p>
                <p className="text-[10px] text-text-muted">{SAMPLE_DATASETS[filename].split("\n").length - 1} rows</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-lg bg-danger-subtle border border-danger/20 text-danger text-sm">
          {error}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="mt-8 space-y-6">
          {/* Dataset name */}
          <div>
            <label className="block text-sm text-text-secondary mb-2">
              Dataset Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-bg-input border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
            />
          </div>

          {/* Column detection */}
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-3">
              Detected Columns ({preview.headers.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {preview.headers.map((h) => {
                const type = preview.types[h];
                const colors: Record<string, string> = {
                  number: "bg-blue-900/30 text-blue-400 border-blue-800/50",
                  date: "bg-purple-900/30 text-purple-400 border-purple-800/50",
                  string:
                    "bg-emerald-900/30 text-emerald-400 border-emerald-800/50",
                };
                return (
                  <span
                    key={h}
                    className={`px-3 py-1.5 rounded-lg text-sm border ${colors[type] ?? "bg-bg-card text-text-secondary border-border-subtle"}`}
                  >
                    {h}{" "}
                    <span className="text-xs opacity-70">({type})</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Preview table */}
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-3">
              Preview (first 10 rows)
            </h3>
            <div className="overflow-x-auto rounded-lg border border-border-subtle">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-bg-secondary">
                    {preview.headers.map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-2.5 text-text-muted font-medium"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-border-subtle/50 hover:bg-bg-card-hover"
                    >
                      {preview.headers.map((h) => (
                        <td key={h} className="px-4 py-2 text-text-primary">
                          {row[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upload button */}
          <button
            onClick={handleUpload}
            disabled={uploading || !name}
            className="w-full py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading..." : "Upload & Analyze"}
          </button>
        </div>
      )}
    </div>
  );
}
