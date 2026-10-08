import { redirect } from "next/navigation";
import Header from "@/components/Header";
import ProfileForm from "@/components/profile/ProfileForm";
import { getCurrentUserContext } from "@/lib/getCurrentUserContext";

export const revalidate = 0;

export default async function ProfilePage() {
  // Server Component 用ヘルパーからユーザーコンテキストを取得
  const userContext = await getCurrentUserContext();

  // 未ログインの場合はログインページへ
  if (!userContext || !userContext.user) {
    redirect("/login");
  }

  const { user, userName, householdName, householdId, role, isOwner, isGoogleUser } = userContext;

  const initialData = {
    name: userName || "",
    email: user.email || "",
    isGoogleUser: !!isGoogleUser, // 👈 userContext から直接受け取る
    householdName: householdName || "",
    hasHousehold: !!householdId,
    role: role || null,
  };

  return (
    <div className="bg-[#54C7F3] min-h-screen flex flex-col font-sans">
      <main className="flex-1 flex flex-col items-center py-8 px-4">
        <Header
          userName={userName}
          householdName={householdName}
          isOwner={isOwner}
        />

        <div className="flex flex-col md:flex-row gap-6 sm:gap-8 max-w-4xl w-full px-4 items-stretch justify-center">
          <ProfileForm initialData={initialData} />
        </div>
      </main>
    </div>
  );
}
