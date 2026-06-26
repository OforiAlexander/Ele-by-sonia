const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const nodemonPath = path.resolve(__dirname, '..', 'nodemon.json');
if (fs.existsSync(nodemonPath)) {
    const { env } = JSON.parse(fs.readFileSync(nodemonPath, 'utf-8'));
    for (const [key, value] of Object.entries(env)) {
        if (!process.env[key]) process.env[key] = String(value);
    }
}

const [, , cmd, ...args] = process.argv;
const result = spawnSync(cmd, args, { stdio: 'inherit', env: process.env, shell: false });
process.exit(result.status ?? 1);
