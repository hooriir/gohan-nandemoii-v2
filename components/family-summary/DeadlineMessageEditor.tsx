"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  initialMessage: string;
  isOwner: boolean;
}

export default function DeadlineMessageEditor({ initialMessage, isOwner }: Props) {
  const router = useRouter();
  const [deadlineMessage, setDeadlineMessage] = useState(initialMessage);
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [tempMessage, setTempMessage] = useState("");
  const [isSavingMessage, setIsSavingMessage] = useState(false);

  const handleSaveMessage = async () => {
    if (!tempMessage.trim()) return;
    setIsSavingMessage(true);
    try {
      const res = await fetch("/api/household/message", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: tempMessage.trim() }),
      });

      if (res.ok) {
        setDeadlineMessage(tempMessage.trim());
        setIsEditingMessage(false);
        router.refresh();
      } else {
        alert("メッセージの更新に失敗しました。");
      }
    } catch (err) {
      console.error(err);
      alert("通信エラーが発生しました。");
    } finally {
      setIsSavingMessage(false);
    }
  };

  return (
    <div className="mb-6 flex items-center justify-center min-h-[32px]">
      {isEditingMessage ? (
        <div className="flex items-center gap-2 w-full max-w-xs">
          <input
            type="text"
            value={tempMessage}
            onChange={(e) => setTempMessage(e.target.value)}
            placeholder="例：午後5時までに決めてね"
            className="flex-1 px-3 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#53cbfb] font-bold text-gray-700"
          />
          <button
            onClick={handleSaveMessage}
            disabled={isSavingMessage}
            className="bg-[#e60012] hover:bg-[#c4000f] text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow transition-all active:scale-95"
          >
            保存
          </button>
          <button
            onClick={() => setIsEditingMessage(false)}
            className="text-gray-400 hover:text-gray-600 text-xs font-bold px-1"
          >
            キャンセル
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-bold text-gray-400 text-center">
            {deadlineMessage}
          </p>
          {isOwner && (
            <button
              onClick={() => {
                setTempMessage(deadlineMessage);
                setIsEditingMessage(true);
              }}
              className="text-[10px] text-[#53cbfb] hover:underline font-bold bg-sky-50 px-1.5 py-0.5 rounded transition-all"
            >
              編集
            </button>
          )}
        </div>
      )}
    </div>
  );
}
