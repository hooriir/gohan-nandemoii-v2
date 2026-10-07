"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MediateButton() {
  const router = useRouter();
  const [isMediating, setIsMediating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMediateAndDecide = async () => {
    setIsMediating(true);
    setError(null);

    try {
      // AI調停APIを実行（API内でDishShowLogの保存まで自動で行われます）
      const response = await fetch("/api/recommend/mediate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "メニューの決定に失敗しました。");
      }

      // 決定完了後、キャッシュを更新してトップページへ遷移
      router.refresh();
      router.push("/");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "予期せぬエラーが発生しました。";
      setError(msg);
    } finally {
      setIsMediating(false);
    }
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-600 text-xs font-bold rounded-xl text-center">
          {error}
        </div>
      )}
      <button
        onClick={handleMediateAndDecide}
        disabled={isMediating}
        className="w-full py-3.5 bg-[#e60012] hover:bg-[#c4000f] disabled:bg-gray-300 text-white font-black rounded-xl shadow-md transition-transform active:scale-95 text-base md:text-lg"
      >
        {isMediating ? "AIが調整中..." : "今日のごはんを決定する！"}
      </button>
    </div>
  );
}
