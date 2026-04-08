import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "./theme-provider";
import Navigation from "@/components/Navigation";
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
  title: "DataPipe - The All-in-One Data Platform",
  description:
    "SQL, Excel, BI, Planning, and AI — all in your browser. Upload CSVs, visualize data, build dashboards, and run AI analytics.",
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
        <Navigation />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border-subtle py-6 mt-12">
          <div className="mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-text-muted">
            Built by Andrew Arbo &middot; DataPipe
          </div>
        </footer>
        <AIChatWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
