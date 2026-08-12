"use server";

import { redirect } from "next/navigation";
import { z } from "zod"; 
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const registerSchema = z.object({
  name: z
    .string()
    .min(1, { message: "お名前を入力してください" })
    .max(20, { message: "お名前は20文字以内で入力してください" }),
  email: z
    .string()
    .min(1, { message: "メールアドレスを入力してください" })
    .email({ message: "正しいメールアドレスの形式で入力してください" }),
  password: z
    .string()
    .min(6, { message: "パスワードは6文字以上で入力してください" })
    .max(100),
});

export async function registerUser(formData: FormData) {
  const supabase = await createClient();
  const rawData = Object.fromEntries(formData.entries());
  const validatedFields = registerSchema.safeParse(rawData);

  if (!validatedFields.success) {
    const errorMessages = validatedFields.error.issues
      .map((issue) => issue.message)
      .join(", ");
    throw new Error(`入力内容に不備があります: ${errorMessages}`);
  }

  const { name, email, password } = validatedFields.data;
  
  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name,
      },
    },
  });

  if (error) {
    throw new Error(`新規登録に失敗しました: ${error.message}`);
  }

  if (signUpData.user) {
    // 登録時は Auth UUID (id) を基準にUpsert
    await prisma.user.upsert({
      where: { id: signUpData.user.id },
      update: {
        email,
        name,
      },
      create: {
        id: signUpData.user.id,
        email,
        name,
        password: "SUPABASE_AUTH_USER",
      },
    });
  }

  redirect("/login");
}

const profileSchema = z.object({
  name: z.string().min(1, { message: "お名前を入力してください" }).max(20),
  email: z.string().email({ message: "正しいメールアドレスの形式で入力してください" }),
  password: z.string().optional(),
});

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインしていません");

  const isGoogleUser =
    user.app_metadata?.provider === "google" ||
    user.identities?.some((identity) => identity.provider === "google");

  const rawData = Object.fromEntries(formData.entries());
  const validatedFields = profileSchema.safeParse(rawData);

  if (!validatedFields.success) {
    const errorMessages = validatedFields.error.issues
      .map((issue) => issue.message)
      .join(", ");
    throw new Error(`入力内容に不備があります: ${errorMessages}`);
  }

  const { name, email, password } = validatedFields.data;

  const updateAttributes: {
    email?: string;
    password?: string;
    data: { name: string };
  } = {
    data: { name },
  };

  if (!isGoogleUser) {
    if (email && email !== user.email) {
      updateAttributes.email = email;
    }

    if (password && password.trim() !== "") {
      if (password.length < 6) {
        throw new Error("新しいパスワードは6文字以上で入力してください");
      }
      updateAttributes.password = password;
    }
  }

  const { error: authError } = await supabase.auth.updateUser(updateAttributes);
  if (authError) {
    throw new Error(`アカウント情報の更新に失敗しました: ${authError.message}`);
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        email: isGoogleUser ? user.email : (email || user.email),
      },
    });
  } catch (err) {
    console.error("Prismaユーザー更新失敗:", err);
  }
}

const dishSchema = z.object({
  name: z.string().min(1, { message: "ごはん名を入力してください" }).max(50),
  tagsInput: z.string().optional(),
  imageFile: z.instanceof(File).optional(),
});

export async function createDish(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || !user.id) {
    throw new Error("認証が必要です。ログインしてください。");
  }

  const rawData = Object.fromEntries(formData.entries());
  const validatedFields = dishSchema.safeParse(rawData);

  if (!validatedFields.success) {
    const errorMessages = validatedFields.error.issues.map((i) => i.message).join(", ");
    throw new Error(`入力内容に不備があります: ${errorMessages}`);
  }
  const { name, tagsInput, imageFile } = validatedFields.data;

  let imageUrl: string | null = null;
  
  if (imageFile && imageFile.size > 0 && imageFile.name !== "undefined") {
    const fileExt = imageFile.name.split(".").pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("dish-images")
      .upload(fileName, imageFile, {
        contentType: imageFile.type,
        upsert: true,
      });

    if (error) {
      throw new Error(`画像のアップロードに失敗しました: ${error.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from("dish-images")
      .getPublicUrl(fileName);
      
    imageUrl = publicUrlData.publicUrl;
  }

  const tagNames = tagsInput
    ? tagsInput
        .replace(/[,，、]/g, " ")
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    : [];

  try {
    const displayName = user.user_metadata?.name || user.email?.split("@")[0] || "ユーザー";
    
    await prisma.user.upsert({
      where: { id: user.id },
      update: { email: user.email || "" },
      create: {
        id: user.id,
        email: user.email || "",
        name: displayName,
        password: "AUTH_USER",
      },
    });

    let tagConnectIds: { id: string }[] = [];

    if (tagNames.length > 0) {
      const existingTags = await prisma.tag.findMany({
        where: { name: { in: tagNames } },
        select: { id: true, name: true },
      });

      const existingNames = existingTags.map((t) => t.name);
      const newNames = tagNames.filter((name) => !existingNames.includes(name));

      if (newNames.length > 0) {
        await prisma.tag.createMany({
          data: newNames.map((name) => ({ name })),
          skipDuplicates: true,
        });
      }

      const allTags = await prisma.tag.findMany({
        where: { name: { in: tagNames } },
        select: { id: true },
      });

      tagConnectIds = allTags.map((t) => ({ id: t.id }));
    }

    await prisma.dish.create({
      data: {
        name,
        imageUrl,
        userId: user.id,
        tags: {
          connect: tagConnectIds,
        },
      },
    });
  } catch (prismaError) {
    console.error("Prisma保存エラー:", prismaError);
    const errorMessage = prismaError instanceof Error ? prismaError.message : "不明なエラー";
    throw new Error(`データベースの保存に失敗しました: ${errorMessage}`);
  }

  redirect("/menus");
}

export async function deleteDish(dishId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.id) {
    throw new Error("認証が必要です。ログインしてください。");
  }

  if (!dishId) {
    throw new Error("料理IDが正しくありません");
  }

  const dish = await prisma.dish.findUnique({
    where: { id: dishId },
  });

  if (!dish) {
    return;
  }

  if (dish.userId !== user.id) {
    throw new Error("削除する権限がありません");
  }

  if (dish.imageUrl) {
    const fileName = dish.imageUrl.split("/").pop();
    if (fileName) {
      const { error: storageError } = await supabase.storage
        .from("dish-images")
        .remove([fileName]);
      
      if (storageError) {
        console.error("Storage削除エラー:", storageError.message);
      }
    }
  }

  try {
    await prisma.dish.delete({
      where: { id: dishId },
    });
  } catch (prismaError) {
    const existing = await prisma.dish.findUnique({ where: { id: dishId } });
    if (existing) {
      console.error("Prisma削除エラー:", prismaError);
      const errorMessage = prismaError instanceof Error ? prismaError.message : "不明なエラー";
      throw new Error(`データベースからの削除に失敗しました: ${errorMessage}`);
    }
  }

  revalidatePath("/menus");
}