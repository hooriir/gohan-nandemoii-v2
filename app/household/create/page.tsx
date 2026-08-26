"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

export default function CreateHouseholdPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/household", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "世帯の作成に失敗しました。");
      }

      // 作成成功したらトップページへリダイレクト
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("予期せぬエラーが発生しました。");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#53cbfb] min-h-screen flex flex-col items-center justify-start p-4 text-white font-sans">
      <Header />

      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl text-gray-800 mt-12">
        <h2 className="text-2xl font-black text-center mb-2 text-slate-800">
          世帯（グループ）を作ろう
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          ごはんを一緒に決めるパートナーや家族のグループ名を入力してください。
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-600 text-sm font-bold rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              世帯名（例: 〇〇家、シェアハウスなど）
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 田中家"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#53cbfb] font-bold text-gray-800"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#e60012] hover:bg-[#c4000f] disabled:bg-gray-400 text-white font-black text-lg rounded-2xl shadow-lg transition-transform active:scale-95"
          >
            {loading ? "作成中..." : "世帯を作成してはじめる"}
          </button>
        </form>
      </div>
    </div>
  );
}
