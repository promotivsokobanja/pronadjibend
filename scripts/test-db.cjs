const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.count()
  .then(c => console.log('DB OK. Users:', c))
  .catch(e => console.error('DB Error:', e.message))
  .finally(() => p.$disconnect());
