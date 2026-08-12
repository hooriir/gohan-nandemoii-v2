"use client";

import { useTransition } from "react";
import { deleteDish } from "@/app/actions";

interface DeleteButtonProps {
  dishId: string;
  onOptimisticDelete?: (dishId: string) => void;
}

export default function DeleteButton({
  dishId,
  onOptimisticDelete,
}: DeleteButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = async () => {
    if (!confirm("本当に削除しますか？")) return;

    startTransition(async () => {
      try {
        if (onOptimisticDelete) {
          onOptimisticDelete(dishId);
        }

        // ▼▼▼ FormDataを使わず、dishId（文字列）を直接渡す ▼▼▼
        await deleteDish(dishId);
      } catch (error) {
        console.error("削除エラー:", error);
        alert("削除に失敗しました。");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white text-xs font-bold py-2 rounded-xl transition-colors text-center shadow-sm"
    >
      {isPending ? "削除中..." : "削除"}
    </button>
  );
}