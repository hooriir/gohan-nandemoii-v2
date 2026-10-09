"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

interface Dish {
  id: string;
  name: string;
  imageUrl: string | null;
}

interface RecommendResponse {
  dish: Dish;
  reason: string;
  isAiGeneration: boolean;
}

interface Props {
  initialResult: RecommendResponse | null;
  suggestionDishNames: string[];
  userId: string;
}

export default function MyDishForm({
  initialResult,
  suggestionDishNames,
  userId,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ?open=true パラメータがあるか判定
  const shouldOpen = searchParams.get("open") === "true";

  // フォーム用ステート
  const [myRequestType] = useState<"WANT" | "NG" | "ANY">("WANT");
  const [dishNameInput, setDishNameInput] = useState("");
  // ?open=true の場合は最初からフォームを開いた状態（true）にする
  const [isSelecting, setIsSelecting] = useState(shouldOpen);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendResponse | null>(initialResult);

  // 希望保存ロジック
  const handleSearch = useCallback(
    async (selectedDishName: string) => {
      if (!userId) return;

      const cleanName = selectedDishName.trim() || "なんでもいい";
      setDishNameInput(cleanName);
      setLoading(true);

      try {
        const res = await fetch("/api/meal-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: myRequestType,
            keyword: cleanName,
          }),
        });

        if (res.ok) {
          setResult({
            dish: {
              id: "",
              name: cleanName,
              imageUrl: null,
            },
            reason: "",
            isAiGeneration: false,
          });
          setIsSelecting(false);
          router.refresh();
        } else {
          alert("希望の保存に失敗しました。");
        }
      } catch (err) {
        console.error("エラーが発生しました:", err);
      } finally {
        setLoading(false);
      }
    },
    [userId, myRequestType, router]
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(dishNameInput);
  };

  /* 【1】決定済み・結果表示画面 */
  if (result && !isSelecting) {
    return (
      <div className="flex flex-col items-center">
        {/* メニュー画像 */}
        <div className="w-full h-48 md:h-56 rounded-2xl overflow-hidden mb-4 flex items-center justify-center bg-gray-50 relative border border-gray-100">
          <div className="w-28 h-28 relative flex items-center justify-center">
            <Image
              src="/images/tubu.svg"
              alt="イラスト"
              width={100}
              height={100}
              className="object-contain"
            />
          </div>
        </div>

        {/* メニュー名（キーワード） */}
        <h2 className="text-2xl md:text-3xl font-black text-gray-800 mb-8 tracking-wide">
          {result.dish.name}
        </h2>

        <div className="w-full max-w-sm flex flex-col gap-3">
          <button
            onClick={() => router.push("/family-summary")}
            className="w-full py-3 bg-[#e60012] hover:bg-[#c4000f] text-white font-black rounded-full shadow-md transition-all active:scale-95 text-sm"
          >
            みんなのごはんを見る
          </button>

          <button
            onClick={() => setIsSelecting(true)}
            className="w-full py-2.5 bg-[#53cbfb] hover:bg-sky-400 text-white font-bold rounded-full transition-all text-sm"
          >
            メニューを変更する
          </button>
        </div>
      </div>
    );
  }

  /* 【2】未決定（初期画面） */
  if (!isSelecting) {
    return (
      <div className="flex flex-col items-center py-4">
        <div className="w-24 h-24 mb-4 relative flex items-center justify-center">
          <Image
            src="/images/chawan.svg"
            alt="決まってないよ"
            width={90}
            height={90}
            className="object-contain"
          />
        </div>
        <p className="text-gray-500 font-bold mb-8 text-sm">
          決まってないよ
        </p>

        <div className="w-full max-w-sm flex flex-col items-center gap-3">
          <button
            onClick={() => setIsSelecting(true)}
            className="w-full py-3.5 bg-[#e60012] hover:bg-[#c4000f] text-white font-black rounded-full shadow-md transition-transform active:scale-95 text-base tracking-wide"
          >
            ごはんを決める！
          </button>

          <button
            onClick={() => router.push("/family-summary")}
            className="w-full py-2.5 bg-white border-2 border-[#53cbfb] text-[#53cbfb] font-bold rounded-full hover:bg-sky-50 transition-all text-sm"
          >
            みんなのごはんを見る
          </button>
        </div>
      </div>
    );
  }

  /* 【3】「ごはんを決める！」「変更する」押下時、または ?open=true 時の入力フォーム */
  return (
    <div className="py-2">
      <h2 className="text-lg font-black text-gray-700 mb-4">
        キーワードを入力
      </h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="キーワードを入力（例：さっぱり、カレーなど）"
            value={dishNameInput}
            onChange={(e) => setDishNameInput(e.target.value)}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#53cbfb] font-bold text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-[#e60012] hover:bg-[#c4000f] text-white font-black rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 text-sm"
          >
            {loading ? "決定中..." : "これ！"}
          </button>
        </div>

        {/* メニュー名のタグ候補一覧 */}
        {suggestionDishNames.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center max-h-36 overflow-y-auto p-1">
            {suggestionDishNames.map((item, index) => (
              <button
                key={index}
                type="button"
                disabled={loading}
                onClick={() => {
                  setDishNameInput(item);
                  handleSearch(item);
                }}
                className="bg-sky-100 text-[#53cbfb] hover:bg-sky-200 text-xs font-bold px-3 py-1.5 rounded-full transition-all active:scale-95"
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </form>

      <button
        onClick={() => setIsSelecting(false)}
        className="mt-6 text-xs text-gray-400 font-bold underline"
      >
        キャンセル
      </button>
    </div>
  );
}
