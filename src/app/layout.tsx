import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ThemeProvider } from "@/lib/theme-provider";
import { BreadcrumbProvider } from "@/lib/breadcrumb-store";

export const metadata: Metadata = {
  title: "E-Book Factory",
  description: "AI-powered e-book generation with n8n agent architecture",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <BreadcrumbProvider>
            <div className="flex h-screen overflow-hidden app-bg">
              <Sidebar />
              <div className="flex flex-1 flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto dot-grid p-6 lg:p-8 app-bg">
                  {children}
                </main>
              </div>
            </div>
          </BreadcrumbProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
