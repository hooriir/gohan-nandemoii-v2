import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import Button from "@/components/Button";
import { z } from "zod";

const updateDishSchema = z.object({
  name: z.string().min(1, "ごはん名は必須です。").max(100, "ごはん名は100文字以内で入力してください。"),
  tagsInput: z.string().optional(),
});

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMenuPage({ params }: EditPageProps) {
  const supabase = await createClient();
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  if (!supabaseUser || !supabaseUser.id) {
    redirect("/login");
  }

  // 所属世帯の取得
  const member = await prisma.householdMember.findUnique({
    where: { userId: supabaseUser.id },
  });

  if (!member) {
    redirect("/login");
  }

  const { id } = await params;

  // 世帯IDに一致する料理を取得
  const dish = await prisma.dish.findFirst({
    where: {
      id,
      householdId: member.householdId,
    },
    include: { tags: true },
  });

  if (!dish) {
    notFound();
  }

  const tagsString = dish.tags.map((t) => t.name).join(" ");

  async function updateDish(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const { data: { user: actionUser } } = await supabase.auth.getUser();

    if (!actionUser || !actionUser.id) {
      redirect("/login");
    }

    const actionMember = await prisma.householdMember.findUnique({
      where: { userId: actionUser.id },
    });

    if (!actionMember) {
      redirect("/login");
    }

    const existingDish = await prisma.dish.findFirst({
      where: {
        id,
        householdId: actionMember.householdId,
      },
    });

    if (!existingDish) {
      redirect("/menus");
    }

    const rawData = {
      name: formData.get("name"),
      tagsInput: formData.get("tagsInput"),
    };

    const parsedResult = updateDishSchema.safeParse(rawData);

    if (!parsedResult.success) {
      console.error("バリデーションエラー:", parsedResult.error.format());
      return;
    }

    const { name, tagsInput } = parsedResult.data;
    const imageFile = formData.get("image") as File;

    let imageUrl = existingDish.imageUrl;

    if (imageFile && imageFile.size > 0) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}-${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from("dish-images")
        .upload(fileName, imageFile);

      if (error) {
        console.error("画像のアップロードに失敗しました:", error);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("dish-images")
        .getPublicUrl(fileName);

      imageUrl = publicUrl;
    }

    const tagNames = tagsInput
      ? tagsInput
          .replace(/[,，、]/g, " ")
          .split(/\s+/)
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    // タグの紐付け・作成処理（世帯単位）
    let tagConnectIds: { id: string }[] = [];

    if (tagNames.length > 0) {
      // 既存のタグを検索
      const existingTags = await prisma.tag.findMany({
        where: { householdId: actionMember.householdId, name: { in: tagNames } },
        select: { id: true, name: true },
      });

      const existingNames = existingTags.map((t) => t.name);
      const newNames = tagNames.filter((tagName) => !existingNames.includes(tagName));

      // 新規タグを作成
      if (newNames.length > 0) {
        await prisma.tag.createMany({
          data: newNames.map((tagName) => ({
            name: tagName,
            householdId: actionMember.householdId,
          })),
          skipDuplicates: true,
        });
      }

      // すべての該当タグIDを取得
      const allTags = await prisma.tag.findMany({
        where: { householdId: actionMember.householdId, name: { in: tagNames } },
        select: { id: true },
      });

      tagConnectIds = allTags.map((t) => ({ id: t.id }));
    }

    await prisma.dish.update({
      where: { id },
      data: {
        name,
        imageUrl,
        tags: {
          set: [],
          connect: tagConnectIds,
        },
      },
    });

    revalidatePath("/menus");
    revalidatePath(`/menus/${id}/edit`);

    redirect("/menus");
  }

  return (
    <div className="bg-brand-bg min-h-screen p-4 sm:p-8 flex flex-col items-center font-sans">
      <div className="w-full max-w-[500px] bg-white rounded-3xl shadow-xl p-6 sm:p-10 border border-slate-100 mt-10">
        <h2 className="text-[#54C7F3] text-center text-xl font-black mb-6 tracking-wider">
          ごはん情報を編集
        </h2>

        <form action={updateDish} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              ごはんの写真（変更する場合のみ選択）
            </label>
            {dish.imageUrl && (
              <div className="mb-2 text-xs text-slate-400">
                現在の画像が登録されています。変更したい場合は新しい画像を選択してください。
              </div>
            )}
            <input
              type="file"
              name="image"
              accept="image/*"
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-600 hover:file:bg-sky-100 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              ごはん名
            </label>
            <input
              type="text"
              name="name"
              required
              defaultValue={dish.name}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:border-brand-blue focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              キーワード
            </label>
            <input
              type="text"
              name="tagsInput"
              defaultValue={tagsString}
              placeholder="キーワード（例：さっぱり 日本食）"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:border-brand-blue focus:bg-white transition-all"
            />
          </div>

          <div className="flex gap-3 pt-4 items-center">
            <Link
              href="/menus"
              className="flex-1 border-2 border-sky-400 hover:bg-sky-100 text-sky-400 font-bold text-center mt-4 py-3 rounded-lg transition-colors leading-normal text-sm"
            >
              キャンセル
            </Link>
            <div className="flex-1">
              <Button type="submit" text="変更を保存" variant="blue" />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
