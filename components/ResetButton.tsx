"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function ResetButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleReset = async () => {
    if (isDeleting || isPending) return; // 二重送信防止

    setIsDeleting(true);

    try {
      const res = await fetch("/api/dish-show-log", {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("削除に失敗しました");
      }

      // useTransition 内で画面再描画を実行し、完了まで loading 状態を維持
      startTransition(() => {
        router.refresh();
      });
    } catch (e) {
      console.error("ログの削除に失敗しました:", e);
      setIsDeleting(false);
    }
  };

  const isLoading = isDeleting || isPending;

  return (
    <button
      onClick={handleReset}
      disabled={isLoading}
      className="w-full max-w-xs py-3 bg-white text-[#53cbfb] font-bold rounded-full shadow-md transition-all active:scale-95 text-sm disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
    >
      {isLoading ? (
        <>
          <span className="inline-block w-4 h-4 border-2 border-[#53cbfb] border-t-transparent rounded-full animate-spin" />
          <span>リセット中...</span>
        </>
      ) : (
        <span>やっぱり決めなおす</span>
      )}
    </button>
  );
}
