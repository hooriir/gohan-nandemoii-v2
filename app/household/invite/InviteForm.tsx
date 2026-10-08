"use client";

import { useState } from "react";
import Link from "next/link";

export default function InviteForm() {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateInviteCode = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/household/invite", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setCode(data.code);
      } else {
        alert(data.error || "招待コードの発行に失敗しました。");
      }
    } catch (err) {
      console.error(err);
      alert("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl text-gray-800 mt-12 text-center">
      <h2 className="text-2xl font-black mb-2 text-slate-800">
        家族を招待する
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        招待コードを家族に伝えて、同じごはん世帯に参加してもらいましょう。
      </p>

      {!code ? (
        <button
          onClick={generateInviteCode}
          disabled={loading}
          className="w-full py-4 bg-[#e60012] hover:bg-[#c4000f] disabled:bg-gray-400 text-white font-black text-base rounded-2xl shadow-lg transition-transform active:scale-95 cursor-pointer"
        >
          {loading ? "発行中..." : "招待コードを発行する"}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 border border-sky-200 rounded-2xl font-mono text-2xl font-black text-sky-600 tracking-widest">
            {code}
          </div>
          <button
            onClick={copyToClipboard}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-2xl shadow transition cursor-pointer"
          >
            {copied ? "コピーしました！" : "招待コードをコピー"}
          </button>
          <p className="text-xs text-gray-500 font-medium pt-1">
            ※ 有効期限：7日間 ／ 最大5人まで使えます
          </p>
        </div>
      )}

      <div className="mt-8 pt-4 border-t border-slate-100 text-center">
        <Link
          href="/"
          className="text-xs text-sky-500 font-bold hover:underline"
        >
          トップページへ戻る
        </Link>
      </div>
    </div>
  );
}
