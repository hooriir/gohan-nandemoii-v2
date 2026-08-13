import "./globals.css";
import type { Metadata } from "next"; // 追記

export const metadata: Metadata = {
  title: "ごはん？なんでもいい～",
  description: "絶対に食べるご飯だけ登録すれば、AIが提案してくれます",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
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