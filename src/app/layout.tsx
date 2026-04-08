import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ThemeProvider } from "./theme-provider";
import { ThemeToggle } from "./ThemeToggle";
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
                  href="/chat"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  AI Chat
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
        </ThemeProvider>
      </body>
    </html>
  );
}
