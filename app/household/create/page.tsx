"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { createClient } from "@/utils/supabase/client";

export default function CreateHouseholdPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Header表示用の状態
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    // ログインユーザー名等の表示用データ取得
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserName(
          user.user_metadata?.name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "ユーザー"
        );
      }
    };

    fetchUser();
  }, []);

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
      <Header
        userName={userName}
        householdName={null}
        isOwner={false}
      />

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

        {/* 招待コードで世帯に参加するボタンエリア */}
        <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col items-center">
          <p className="text-xs text-gray-400 font-bold mb-3">
            すでに作成済みの世帯がある場合
          </p>
          <Link
            href="/household/join"
            className="w-full py-3 bg-sky-50 hover:bg-sky-100 text-[#53cbfb] font-black text-center text-sm rounded-xl border border-sky-200 transition-colors"
          >
            または世帯に参加する（招待コードを入力）
          </Link>
        </div>
      </div>
    </div>
  );
}
