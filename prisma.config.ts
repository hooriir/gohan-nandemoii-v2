
// prisma.config.ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    // db push やマイグレーション時は DIRECT_URL (ポート5432) を使う設定にします
    url: env("DIRECT_URL"),
  },
});
