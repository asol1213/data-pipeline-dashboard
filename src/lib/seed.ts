import { saveDataset, getAllDatasets } from "./store";
import type { DatasetFull } from "./store";

const SEED_ID = "sales-q1-2026";

const seedRows = [
  { Month: "Jan 2026", Revenue: "142500", Customers: "1205", Churn_Rate: "3.2", MRR: "118750", Support_Tickets: "89" },
  { Month: "Feb 2026", Revenue: "156800", Customers: "1287", Churn_Rate: "2.8", MRR: "130667", Support_Tickets: "76" },
  { Month: "Mar 2026", Revenue: "163200", Customers: "1342", Churn_Rate: "2.5", MRR: "136000", Support_Tickets: "82" },
  { Month: "Apr 2026", Revenue: "171900", Customers: "1398", Churn_Rate: "2.9", MRR: "143250", Support_Tickets: "91" },
  { Month: "May 2026", Revenue: "185400", Customers: "1456", Churn_Rate: "2.3", MRR: "154500", Support_Tickets: "68" },
  { Month: "Jun 2026", Revenue: "192700", Customers: "1523", Churn_Rate: "2.1", MRR: "160583", Support_Tickets: "72" },
  { Month: "Jul 2026", Revenue: "198300", Customers: "1589", Churn_Rate: "2.4", MRR: "165250", Support_Tickets: "85" },
  { Month: "Aug 2026", Revenue: "210500", Customers: "1645", Churn_Rate: "1.9", MRR: "175417", Support_Tickets: "63" },
  { Month: "Sep 2026", Revenue: "205800", Customers: "1612", Churn_Rate: "3.1", MRR: "171500", Support_Tickets: "97" },
  { Month: "Oct 2026", Revenue: "224100", Customers: "1701", Churn_Rate: "2.0", MRR: "186750", Support_Tickets: "71" },
  { Month: "Nov 2026", Revenue: "231600", Customers: "1768", Churn_Rate: "1.8", MRR: "193000", Support_Tickets: "65" },
  { Month: "Dec 2026", Revenue: "248900", Customers: "1834", Churn_Rate: "1.6", MRR: "207417", Support_Tickets: "58" },
];

export function ensureSeedData() {
  const datasets = getAllDatasets();
  if (datasets.some((d) => d.id === SEED_ID)) return;

  const dataset: DatasetFull = {
    id: SEED_ID,
    name: "Sales Performance 2026",
    fileName: "sales_performance_2026.csv",
    uploadedAt: "2026-04-01T00:00:00.000Z",
    rowCount: seedRows.length,
    columnCount: 6,
    headers: ["Month", "Revenue", "Customers", "Churn_Rate", "MRR", "Support_Tickets"],
    columnTypes: {
      Month: "string",
      Revenue: "number",
      Customers: "number",
      Churn_Rate: "number",
      MRR: "number",
      Support_Tickets: "number",
    },
    rows: seedRows,
  };

  saveDataset(dataset);
}
