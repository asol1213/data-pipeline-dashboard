# Data Pipeline Dashboard

A self-hosted data analytics dashboard built with Next.js. Upload CSV files, auto-detect column types, visualize with interactive charts, track KPIs, and detect statistical anomalies — like a mini self-hosted Tableau.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4)

**[Live Demo](https://data-pipeline-dashboard-omega.vercel.app)**

## Features

- **CSV Upload & Parsing** — Drag-and-drop or file picker with client-side CSV parsing. No external libraries needed.
- **Auto Column Detection** — Automatically identifies numeric, date, and string columns from your data.
- **Interactive Charts** — Bar and line charts powered by Recharts. Toggle between chart types per metric.
- **KPI Dashboard** — At-a-glance cards showing row counts, column counts, averages, min/max ranges.
- **Anomaly Detection** — Highlights values that are >2 standard deviations from the column mean.
- **Data Table** — Sortable, searchable, paginated table with column type badges.
- **Dark Theme** — Professional dark UI with CSS custom properties.
- **No API Keys** — Runs entirely locally with JSON file storage.

## Demo Data

Ships with a pre-populated "Sales Performance 2026" dataset (12 months of revenue, customer, churn, MRR, and support ticket data) so the dashboard looks real immediately on first load.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Charts | Recharts |
| Storage | JSON files (no database required) |

## Getting Started

```bash
# Clone the repository
git clone https://github.com/andrewaarbo/data-pipeline-dashboard.git
cd data-pipeline-dashboard

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
  app/
    page.tsx                          # Dashboard (KPI cards, charts, data table)
    upload/page.tsx                    # CSV upload with drag-and-drop
    datasets/page.tsx                  # Dataset listing
    datasets/[id]/page.tsx            # Single dataset detail view
    api/
      datasets/route.ts               # GET all, POST new dataset
      datasets/[id]/route.ts          # GET/DELETE single dataset
      datasets/[id]/stats/route.ts    # GET computed statistics
  components/
    ChartCard.tsx                      # Reusable bar/line chart component
    DataTable.tsx                      # Sortable, searchable data table
    KPICard.tsx                        # KPI metric card
  lib/
    csv-parser.ts                      # CSV parsing & column type detection
    stats.ts                           # Statistics: mean, stddev, anomalies
    store.ts                           # JSON file-based storage
    seed.ts                            # Demo data seeding
  data/
    datasets.json                      # Dataset metadata index
```

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/datasets` | List all datasets |
| POST | `/api/datasets` | Upload new dataset (JSON body with `name`, `fileName`, `csvContent`) |
| GET | `/api/datasets/[id]` | Get single dataset with all rows |
| DELETE | `/api/datasets/[id]` | Delete a dataset |
| GET | `/api/datasets/[id]/stats` | Get computed statistics (means, anomalies, etc.) |

## Author

**Andrew Arbo** — Data engineering and analytics. Previously at Deloitte.
