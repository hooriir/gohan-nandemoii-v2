import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * ログインユーザーのIDから、所属している世帯とメンバー情報を取得する
 */
export async function getHouseholdContext(userId: string) {
  const member = await prisma.householdMember.findUnique({
    where: { userId },
    include: {
      household: true,
    },
  });

  if (!member) {
    return null;
  }

  return {
    member,
    household: member.household,
    householdId: member.householdId,
  };
}

/**
 * 世帯に所属していることを保証する（未所属ならエラーを投げる）
 */
export async function assertHouseholdMember(userId: string) {
  const context = await getHouseholdContext(userId);
  if (!context) {
    throw new Error('UNAUTHORIZED_HOUSEHOLD: 世帯に所属していません。');
  }
  return context;
}
