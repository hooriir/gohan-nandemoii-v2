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
  availableDishes?: string[];
}

export default function MyDishForm({
  initialResult,
  suggestionDishNames,
  userId,
  availableDishes = [],
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const shouldOpen = searchParams.get("open") === "true";

  // モーダルの開閉ステート
  const [isModalOpen, setIsModalOpen] = useState(shouldOpen);

  // タブの選択ステート ("WANT" または "NG")
  const [activeTab, setActiveTab] = useState<"WANT" | "NG">("WANT");

  // 入力フィールドのステート
  const [inputKeyword, setInputKeyword] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendResponse | null>(initialResult);

  // 保存処理
  const handleSaveRequest = useCallback(
    async (keyword: string, type: "WANT" | "NG") => {
      if (!userId) return;

      const cleanName = keyword.trim();
      if (!cleanName) return;

      setLoading(true);

      try {
        const res = await fetch("/api/meal-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: type,
            keyword: cleanName,
          }),
        });

        if (res.ok) {
          const displayName =
            type === "NG"
              ? `${cleanName}はやだ！`
              : `${cleanName}がいい！`;

          setResult({
            dish: {
              id: "",
              name: displayName,
              imageUrl: null,
            },
            reason: "",
            isAiGeneration: false,
          });
          setIsModalOpen(false);
          setInputKeyword("");
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
    [userId, router]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSaveRequest(inputKeyword, activeTab);
  };

  return (
    <>
      {/* ---------------------------------------------------- */}
      {/* 1. メインカード表示（決定済み・または未決定）          */}
      {/* ---------------------------------------------------- */}
      {result ? (
        /* 決定済み（結果表示） */
        <div className="flex flex-col items-center">
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

          <h2 className="text-2xl md:text-3xl font-black text-gray-800 mb-8 tracking-wide">
            {result.dish.name}
          </h2>

          <div className="w-full max-w-sm flex flex-col gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full py-3 bg-[#53cbfb] hover:bg-sky-400 text-white font-bold rounded-full transition-all text-sm shadow-md active:scale-95"
            >
              希望を変更する
            </button>

            {/* ▼ 「希望を変更する」ボタンの下にTOPへ戻るボタンを追加 */}
            <button
              onClick={() => router.push("/")}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-full transition-all text-sm active:scale-95"
            >
              TOPへ戻る
            </button>
          </div>
        </div>
      ) : (
        /* 未決定（初期状態） */
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
              onClick={() => setIsModalOpen(true)}
              className="w-full py-3.5 bg-[#e60012] hover:bg-[#c4000f] text-white font-black rounded-full shadow-md transition-transform active:scale-95 text-base tracking-wide"
            >
              ごはんを決める！
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. モーダルダイアログ（ポップアップ）                  */}
      {/* ---------------------------------------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 animate-fadeIn">
          {/* 背景タップで閉じる */}
          <div
            className="absolute inset-0"
            onClick={() => !loading && setIsModalOpen(false)}
          />

          {/* モーダルコンテンツ本体（スマホでは下から出てくるボトムシート風） */}
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl text-gray-800 z-10 max-h-[90vh] flex flex-col">
            {/* ヘッダー */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[#54C7F3] text-center text-2xl font-black mb-8 tracking-wider">
                今日の気分は？
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={loading}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* モーダル内タブ切替（WANT / NG） */}
            <div className="flex rounded-2xl bg-gray-100 p-1 mb-5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("WANT");
                  setInputKeyword("");
                }}
                className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 ${
                  activeTab === "WANT"
                    ? "bg-white text-[#54C7F3] shadow-md"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                食べたい
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("NG");
                  setInputKeyword("");
                }}
                className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 ${
                  activeTab === "NG"
                    ? "bg-red-500 text-white shadow-md"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                食べたくない
              </button>
            </div>

            {/* フォーム入力エリア */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={
                      activeTab === "WANT"
                        ? "例：カレー、さっぱりしたもの"
                        : "例：辛いもの、魚"
                    }
                    value={inputKeyword}
                    onChange={(e) => setInputKeyword(e.target.value)}
                    disabled={loading}
                    className="flex-1 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#53cbfb] font-bold text-sm"
                  />
                  <button
                    type="submit"
                    disabled={loading || !inputKeyword.trim()}
                    className={`px-5 py-3 text-white font-black rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-40 text-xs shrink-0 ${
                      activeTab === "NG"
                        ? "bg-gray-800 hover:bg-gray-700"
                        : "bg-[#e60012] hover:bg-[#c4000f]"
                    }`}
                  >
                    {loading ? "登録中..." : activeTab === "NG" ? "やだ！" : "これ！"}
                  </button>
                </div>
              </form>

              {/* 選択候補（登録メニュー） */}
              {availableDishes.length > 0 && (
                <div className="text-left pt-2">
                  <p className="text-[11px] font-bold text-gray-400 mb-2">
                    登録メニューからタップして決定：
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-gray-50 rounded-2xl border border-gray-100">
                    {availableDishes.map((dishName, index) => (
                      <button
                        key={index}
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setInputKeyword(dishName);
                          handleSaveRequest(dishName, activeTab);
                        }}
                        className={`text-xs font-bold px-3 py-2 rounded-xl transition-all active:scale-95 ${
                          activeTab === "NG"
                            ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                            : "bg-white text-[#54C7F3] border border-sky-200 hover:bg-sky-50"
                        }`}
                      >
                        {activeTab === "NG" ? `✕ ${dishName}` : dishName}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* タグからの選択 */}
              {suggestionDishNames.length > 0 && (
                <div className="text-left pt-1">
                  <p className="text-[11px] font-bold text-gray-400 mb-2">
                    タグから選ぶ：
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
                    {suggestionDishNames.map((item, index) => (
                      <button
                        key={index}
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setInputKeyword(item);
                          handleSaveRequest(item, activeTab);
                        }}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all active:scale-95 ${
                          activeTab === "NG"
                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {activeTab === "NG" ? `✕ ${item}` : item}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* フッター */}
            <div className="mt-4 pt-3 border-t border-gray-100 text-center">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={loading}
                className="text-xs text-gray-400 font-bold underline py-1"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
