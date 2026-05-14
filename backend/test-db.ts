import { prisma } from './src/lib/prisma.js';

async function main() {
  try {
    console.log('Testing database connection...');
    const users = await prisma.user.findMany();
    console.log('Connection successful, users count:', users.length);
  } catch (err) {
    console.error('Connection failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
