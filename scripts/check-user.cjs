const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('pikaso123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'ivandragutinovic@gmail.com',
      password: hash,
      role: 'BAND'
    }
  });
  console.log('User created:', user.email);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
