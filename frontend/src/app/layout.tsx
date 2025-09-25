import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Examply - 스마트한 문제 풀이 학습",
  description: "PDF 문제집을 AI로 분석하여 개인 맞춤형 플래시카드 학습을 제공합니다",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                borderRadius: '10px',
                background: '#333',
                color: '#fff',
                border: '1px solid #444',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
                style: {
                  borderRadius: '10px',
                  background: '#333',
                  color: '#fff',
                  border: '1px solid #10b981',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
                style: {
                  borderRadius: '10px',
                  background: '#333',
                  color: '#fff',
                  border: '1px solid #ef4444',
                },
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
