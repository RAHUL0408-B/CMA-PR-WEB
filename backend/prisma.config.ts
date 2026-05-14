import "dotenv/config";
import { defineConfig } from "prisma/config";
import path from "path";

const dbUrl = process.env.DATABASE_URL || "file:" + path.join(process.cwd(), "dev.db");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: dbUrl,
  },
});
