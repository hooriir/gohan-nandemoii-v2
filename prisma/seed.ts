import { PrismaClient, RequestType, HouseholdRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 データベースのシード処理を開始します...');

  // 1. 既存データのクリーンアップ（安全のため、外部キー制約の順序に注意して削除）
  await prisma.mealRequest.deleteMany();
  await prisma.dishShowLog.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.dish.deleteMany();
  await prisma.householdInvite.deleteMany();
  await prisma.householdMember.deleteMany();
  await prisma.household.deleteMany();
  await prisma.user.deleteMany();

  console.log('既存データをクリアしました');

  // 2. テスト用ユーザーの作成（家族3人分: パパ、ママ、子ども）
  const hashedPassword = await bcrypt.hash('password123', 10);

  const papa = await prisma.user.create({
    data: {
      email: 'papa@example.com',
      name: 'パパ',
      password: hashedPassword,
    },
  });

  const mama = await prisma.user.create({
    data: {
      email: 'mama@example.com',
      name: 'ママ',
      password: hashedPassword,
    },
  });

  const child = await prisma.user.create({
    data: {
      email: 'child@example.com',
      name: '子ども',
      password: hashedPassword,
    },
  });

  console.log('ユーザーを3人作成しました');

  // 3. 世帯（Household）の作成
  const household = await prisma.household.create({
    data: {
      name: 'サンプル堀家のおうち',
    },
  });

  // 4. 世帯メンバーの紐づけ（パパをOWNER、ママと子どもをMEMBERに）
  await prisma.householdMember.createMany({
    data: [
      { householdId: household.id, userId: papa.id, role: HouseholdRole.OWNER },
      { householdId: household.id, userId: mama.id, role: HouseholdRole.MEMBER },
      { householdId: household.id, userId: child.id, role: HouseholdRole.MEMBER },
    ],
  });

  console.log('世帯を作成し、メンバーを所属させました');

  // 5. タグの作成（世帯スコープ）
  const tagMeat = await prisma.tag.create({
    data: { householdId: household.id, name: '肉料理' },
  });
  const tagQuick = await prisma.tag.create({
    data: { householdId: household.id, name: 'スピード' },
  });

  // 6. 共有メニュー（Dish）の作成（10品のうちいくつか抜粋）
  const curry = await prisma.dish.create({
    data: {
      householdId: household.id,
      createdById: papa.id,
      name: '特製ビーフカレー',
      tags: { connect: [{ id: tagMeat.id }] },
    },
  });

  const hamburg = await prisma.dish.create({
    data: {
      householdId: household.id,
      createdById: mama.id,
      name: 'ジューシーハンバーグ',
      tags: { connect: [{ id: tagMeat.id }] },
    },
  });

  const salad = await prisma.dish.create({
    data: {
      householdId: household.id,
      createdById: mama.id,
      name: '豆腐とわかめのサラダ',
      tags: { connect: [{ id: tagQuick.id }] },
    },
  });

  console.log('共有メニューを作成しました');

  // 7. 今日の MealRequest（希望）の作成
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.mealRequest.createMany({
    data: [
      {
        householdId: household.id,
        userId: papa.id,
        requestDate: today,
        type: RequestType.WANT,
        dishId: curry.id, // パパはカレーが食べたい
      },
      {
        householdId: household.id,
        userId: mama.id,
        requestDate: today,
        type: RequestType.ANY, // ママはなんでもいい
      },
      {
        householdId: household.id,
        userId: child.id,
        requestDate: today,
        type: RequestType.NG,
        dishId: hamburg.id, // 子どもはハンバーグがNG
      },
    ],
  });

  console.log('今日のメンバーの希望を作成しました');

  // 8. 履歴（DishShowLog）の作成
  await prisma.dishShowLog.create({
    data: {
      householdId: household.id,
      dishId: salad.id,
      decidedById: mama.id,
      keyword: 'さっぱりしたもの',
    },
  });

  console.log('過去の履歴を作成しました');
  console.log('すべてのシードデータの投入が完了しました！');
}

main()
  .catch((e) => {
    console.error('シード処理中にエラーが発生しました:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
