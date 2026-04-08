import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ThemeProvider } from "./theme-provider";
import { ThemeToggle } from "./ThemeToggle";
import AIChatWidget from "../components/AIChatWidget";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Data Pipeline Dashboard",
  description:
    "Self-hosted data analytics dashboard — upload CSVs, visualize data, track KPIs, and detect anomalies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.add('light')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
        <nav className="border-b border-border-subtle bg-bg-secondary/90 backdrop-blur-md sticky top-0 z-50">
          <div className="mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-[#8b5cf6] flex items-center justify-center shadow-lg shadow-accent/20">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <Link
                  href="/"
                  className="text-lg font-bold text-text-primary tracking-tight"
                >
                  DataPipe
                </Link>
              </div>
              <div className="flex items-center gap-6">
                <Link
                  href="/"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/datasets"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Datasets
                </Link>
                <Link
                  href="/query"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  SQL Query
                </Link>
                <Link
                  href="/dax"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  DAX
                </Link>
                <Link
                  href="/pivot"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Pivot
                </Link>
                <Link
                  href="/spreadsheet"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Spreadsheet
                </Link>
                <Link
                  href="/builder"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Builder
                </Link>
                <Link
                  href="/model"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Data Model
                </Link>
                <Link
                  href="/connect"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Connect
                </Link>
                <div className="relative group">
                  <Link
                    href="/planning"
                    className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Planning
                  </Link>
                  <div className="absolute left-0 top-full mt-1 hidden group-hover:block bg-bg-card border border-border-subtle rounded-lg shadow-xl py-1 min-w-[160px] z-50">
                    <Link href="/planning" className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors">
                      Scenarios
                    </Link>
                    <Link href="/planning/simulator" className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors">
                      Simulator
                    </Link>
                    <Link href="/planning/forecast" className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors">
                      Forecast
                    </Link>
                    <Link href="/planning/compare" className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors">
                      Compare
                    </Link>
                    <Link href="/planning/budget" className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors">
                      Budget
                    </Link>
                    <Link href="/planning/variance" className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors">
                      Variance
                    </Link>
                    <Link href="/planning/goal-seek" className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors">
                      Goal Seek
                    </Link>
                    <Link href="/planning/headcount" className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors">
                      Headcount
                    </Link>
                    <Link href="/planning/cashflow" className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors">
                      Cash Flow
                    </Link>
                  </div>
                </div>
                <Link
                  href="/ask"
                  className="text-sm font-medium text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
                >
                  <span>&#10024;</span> Ask
                </Link>
                <Link
                  href="/profiling"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Profiling
                </Link>
                <Link
                  href="/alerts"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Alerts
                </Link>
                <Link
                  href="/lineage"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Lineage
                </Link>
                <Link
                  href="/audit"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Audit
                </Link>
                <Link
                  href="/chat"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  AI Chat
                </Link>
                <Link
                  href="/benchmarks"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Benchmarks
                </Link>
                <Link
                  href="/templates"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Templates
                </Link>
                <Link
                  href="/reports"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Reports
                </Link>
                <Link
                  href="/demo"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Demo
                </Link>
                <Link
                  href="/upload"
                  className="text-sm px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors"
                >
                  Upload CSV
                </Link>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border-subtle py-6 mt-12">
          <div className="mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-text-muted">
            Built by Andrew Arbo &middot; Data Pipeline Dashboard
          </div>
        </footer>
        <AIChatWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
