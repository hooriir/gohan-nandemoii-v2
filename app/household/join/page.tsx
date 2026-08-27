"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";

export default function JoinHouseholdPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/household/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "世帯への参加に失敗しました。");
      }

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
          招待コードで参加
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          家族やパートナーから共有された招待コードを入力してください。
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-600 text-sm font-bold rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              招待コード（英数字）
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="例: a1b2c3d4"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#53cbfb] font-bold text-gray-800 uppercase tracking-widest text-center text-lg"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            app-disabled-style="true"
            className="w-full py-4 bg-[#e60012] hover:bg-[#c4000f] disabled:bg-gray-400 text-white font-black text-lg rounded-2xl shadow-lg transition-transform active:scale-95"
          >
            {loading ? "参加中..." : "世帯に参加する"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/household/create"
            className="text-xs text-sky-500 font-bold hover:underline"
          >
            やっぱり自分で新しい世帯を作る場合はこちら
          </Link>
        </div>
      </div>
    </div>
  );
}
