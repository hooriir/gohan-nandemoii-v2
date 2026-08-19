import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "ごはん？なんでもいい〜",
  description: "家族の好きなメニューだけを登録して検索表示できるアプリです。これを使えば、なんでもいい～と言われてもOK！",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="bg-[#54C7F3] min-h-screen antialiased overflow-y-scroll overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
