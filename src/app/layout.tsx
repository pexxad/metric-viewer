import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { configureAmplify } from "@/lib/amplify/config";
import "./globals.css";

configureAmplify();

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "metric-viewer",
  description: "Time-series data visualization",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${notoSansJP.variable} h-full antialiased`}
    >
      <body className="h-full">{children}</body>
    </html>
  );
}
