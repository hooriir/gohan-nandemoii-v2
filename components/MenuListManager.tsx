"use client";

import { useOptimistic } from "react";
import Image from "next/image";
import Link from "next/link";
import DeleteButton from "@/components/DeleteButton";
import DishForm from "@/components/DishForm";

export type Tag = {
  id: string;
  name: string;
};

export type Dish = {
  id: string;
  name: string;
  imageUrl: string | null;
  tags: Tag[];
  isPending?: boolean;
};

interface MenuListManagerProps {
  initialDishes: Dish[];
}

type OptimisticAction =
  | { type: "add"; dish: Dish }
  | { type: "delete"; id: string };

export default function MenuListManager({ initialDishes }: MenuListManagerProps) {
  const [optimisticDishes, setOptimisticDishes] = useOptimistic(
    initialDishes,
    (state, action: OptimisticAction) => {
      switch (action.type) {
        case "add":
          return [action.dish, ...state];
        case "delete":
          return state.filter((dish) => dish.id !== action.id);
        default:
          return state;
      }
    }
  );

  const handleAddOptimisticDish = (newDish: Dish) => {
    setOptimisticDishes({ type: "add", dish: newDish });
  };

  const handleDeleteOptimisticDish = (dishId: string) => {
    setOptimisticDishes({ type: "delete", id: dishId });
  };

  return (
    <>
      <div className="text-center mb-10 pb-10 border-b border-slate-100">
        <h2 className="text-base font-black text-slate-700 flex flex-col items-center gap-1 mb-1">
          ごはん登録
        </h2>
        <p className="text-[11px] font-bold text-slate-400 mb-6">
          いつも食べてるあのごはんを登録しとく
        </p>

        <DishForm addOptimisticDish={handleAddOptimisticDish} />
      </div>

      <div>
        <div className="text-center mb-8">
          <h2 className="text-base font-black text-slate-700 flex flex-col items-center gap-1 mb-1">
            ごはん一覧
          </h2>
        </div>

        {optimisticDishes.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8">
            登録された料理はまだありません。
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {optimisticDishes.map((dish) => (
              <div
                key={dish.id}
                className={`flex flex-col items-center text-center transition-all duration-200 ${
                  dish.isPending ? "opacity-60 scale-98" : "opacity-100 scale-100"
                }`}
              >

                <div className="w-full aspect-square bg-[#f4f9fd] border-2 border-[#e3f2fd] rounded-3xl overflow-hidden relative mb-3 flex items-center justify-center">
                  {dish.imageUrl ? (
                    <Image
                      src={dish.imageUrl}
                      alt={dish.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                      unoptimized={dish.imageUrl.startsWith("blob:")} // blobURLの場合は非最適化で高速表示
                    />
                  ) : (
                    <span className="text-[#c2e4fa] font-bold text-xl select-none">
                      No Image
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-[#333333] text-lg mb-1 flex items-center gap-2">
                  <span>{dish.name}</span>
                  {dish.isPending && (
                    <span className="text-xs font-normal text-slate-400">
                      (保存中...)
                    </span>
                  )}
                </h3>

                <p className="text-xs text-slate-400 font-bold mb-4 min-h-[18px] flex flex-wrap justify-center gap-1">
                  {dish.tags && dish.tags.length > 0 ? (
                    dish.tags.map((t) => (
                      <span key={t.id || t.name}>#{t.name}</span>
                    ))
                  ) : (
                    <span className="text-slate-300">#タグなし</span>
                  )}
                </p>

                <div className="flex gap-3 w-full max-w-[180px]">
                  {dish.isPending ? (
                    <button
                      type="button"
                      disabled
                      className="w-full bg-slate-200 text-slate-400 text-xs font-bold py-2 rounded-xl cursor-not-allowed"
                    >
                      保存中...
                    </button>
                  ) : (
                    <>
                      <Link
                        href={`/menus/${dish.id}/edit`}
                        className="flex-1 bg-[#00b2fe] hover:bg-[#009de0] text-white text-xs font-bold py-2 rounded-xl transition-colors text-center block shadow-sm"
                      >
                        編集
                      </Link>
                      <DeleteButton
                        dishId={dish.id}
                        onOptimisticDelete={handleDeleteOptimisticDish}
                      />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}