"use client";

import IdleTimer from "./IdleTimer";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* 30分無操作で自動ログアウト（テスト時は timeoutMinutes={0.2} などにすると12秒でテストできます） */}
      <IdleTimer timeoutMinutes={30} />
      {children}
    </>
  );
}
