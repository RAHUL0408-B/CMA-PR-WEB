import { PrismaClient } from '../generated/prisma/index.js';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Resolve the SQLite database path
const rawUrl = process.env.DATABASE_URL ?? 'file:./dev.db';
const filePart = rawUrl.startsWith('file:') ? rawUrl.slice(5) : rawUrl;
const dbPath = path.isAbsolute(filePart)
  ? filePart
  : path.resolve(process.cwd(), filePart);

console.log(`📦 Database: ${dbPath}`);

// In Prisma 7 with @prisma/adapter-better-sqlite3, 
// we pass the config object to the factory, which includes the url.
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });

// Singleton pattern for Prisma Client
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter, log: ['error', 'warn'] });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
