"use client";

import { useRouter } from "next/navigation";

export default function ResetButton() {
  const router = useRouter();

  const handleReset = async () => {
    try {
      await fetch("/api/dish-show-log", {
        method: "DELETE",
      });
      router.refresh(); // サーバーサイドの最新状態で画面再更新
    } catch (e) {
      console.error("ログの削除に失敗しました:", e);
    }
  };

  return (
    <button
      onClick={handleReset}
      className="w-full max-w-xs py-3 bg-white text-[#53cbfb] font-bold rounded-full shadow-md transition-all active:scale-95 text-sm"
    >
      やっぱり決めなおす
    </button>
  );
}
