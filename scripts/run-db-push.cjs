const { execSync } = require('child_process');
execSync('npx.cmd prisma db push', { stdio: 'inherit', cwd: __dirname + '/..' });
