"use client";

import { useState } from "react";

export default function InviteSection() {
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
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
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
    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
      <h3 className="font-bold text-slate-700 mb-2">家族を招待する</h3>
      <p className="text-xs text-slate-500 mb-4">
        招待コードを家族に伝えて、同じごはん世帯に参加してもらいましょう。
      </p>

      {!code ? (
        <button
          onClick={generateInviteCode}
          disabled={loading}
          className="bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs py-2 px-4 rounded-xl transition"
        >
          {loading ? "発行中..." : "招待コードを発行する"}
        </button>
      ) : (
        <div className="space-y-2">
          <div className="p-3 bg-white border border-sky-200 rounded-xl font-mono text-xl font-black text-sky-600 tracking-widest">
            {code}
          </div>
          <button
            onClick={copyToClipboard}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-2 px-4 rounded-xl transition"
          >
            {copied ? "コピーしました！" : "招待コードをコピー"}
          </button>
        </div>
      )}
    </div>
  );
}
