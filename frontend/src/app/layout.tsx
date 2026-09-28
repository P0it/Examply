import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Examply",
  description: "PDF 문제집에서 문제를 뽑아 한 문제씩 풉니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: '8px',
              background: '#ffffff',
              color: '#282e3e',
              border: '1px solid #d9dde8',
              boxShadow: '0 4px 16px 0 rgba(40, 46, 62, 0.1)',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#ffffff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } },
          }}
        />
      </body>
    </html>
  );
}
