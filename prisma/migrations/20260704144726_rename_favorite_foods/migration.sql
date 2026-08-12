/*
  Warnings:

  - You are about to drop the column `favoriteDishs` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "favoriteDishs",
ADD COLUMN     "favoriteFoods" TEXT;
