import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import { prisma } from '@/lib/prisma';
import ProfileForm from '@/components/profile/ProfileForm';
import { getCurrentUserContext } from '@/lib/getCurrentUserContext';

export const revalidate = 0;

export default async function ProfilePage() {
  // Server Component 用ヘルパーからユーザーコンテキストを取得
  const userContext = await getCurrentUserContext();

  // 未ログインの場合はログインページへ
  if (!userContext || !userContext.user) {
    redirect('/login');
  }

  const user = userContext.user;

  // Googleプロバイダー判定
  const isGoogleUser =
    user.app_metadata?.provider === 'google' ||
    user.identities?.some((identity) => identity.provider === 'google');

  // ユーザー所属の世帯情報を取得
  const member = await prisma.householdMember.findFirst({
    where: { userId: user.id },
    include: {
      household: { select: { id: true, name: true } },
    },
  });

  const initialData = {
    name: userContext.userName || user.user_metadata?.name || '',
    email: user.email || '',
    isGoogleUser: !!isGoogleUser,
    householdName: userContext.householdName || member?.household?.name || '',
    hasHousehold: !!member,
    role: member?.role || null,
  };

  return (
    <div className="bg-[#54C7F3] min-h-screen flex flex-col font-sans">
      <main className="flex-1 flex flex-col items-center py-8 px-4">
        <Header
          userName={userContext.userName}
          householdName={userContext.householdName}
          isOwner={userContext.isOwner}
        />

        <div className="flex flex-col md:flex-row gap-6 sm:gap-8 max-w-4xl w-full px-4 items-stretch justify-center">
          <ProfileForm initialData={initialData} />
        </div>
      </main>
    </div>
  );
}
