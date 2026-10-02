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
      const response = await fetch("/api/recommend/mediate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "メニューの決定に失敗しました。");
      }

      const data = await response.json();
      const decidedDishName = data.dish?.name || data.dishName || "今日のごはん";
      const decidedDishId = data.dish?.id || data.dishId || null;
      const decidedReason = data.reason || "家族みんなの希望から決定しました！";

      const saveLogRes = await fetch("/api/dish-show-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dishId: decidedDishId,
          dishName: decidedDishName,
          reason: decidedReason,
        }),
      });

      if (!saveLogRes.ok) {
        const logErrData = await saveLogRes.json();
        throw new Error(logErrData.error || "本日の決定ログの保存に失敗しました。");
      }

      router.refresh();
      router.push("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "予期せぬエラーが発生しました。";
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
