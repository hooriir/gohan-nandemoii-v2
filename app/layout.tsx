import "./globals.css";
import type { Metadata, Viewport } from "next";
import ClientProviders from "@/components/ClientProviders";

export const metadata: Metadata = {
  title: "ごはん？なんでもいい〜",
  description:
    "家族の好きなメニューだけを登録して検索表示できるアプリです。これを使えば、なんでもいい～と言われてもOK！",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "なんでもいい",
  },
  icons: {
    apple: "/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#54C7F3",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="bg-[#54C7F3] min-h-screen antialiased overflow-y-scroll overflow-x-hidden">
        {/* クライアント側でタイマーを動かすためのプロバイダー */}
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
