import readline from 'node:readline';
import { Writable } from 'node:stream';
import { createAdminSchema } from '@reveal/shared';
import { loadConfig } from '../config/env';
import { connectDb, disconnectDb, syncIndexes } from '../db';
import { Admin } from '../models/admin';
import { hashPassword } from '../services/auth';
import { audit } from '../services/audit';

/**
 * Provision an admin account.
 *   npm run admin:create -- --username owner --role owner [--email you@example.org]
 * The password is read from the REVEAL_ADMIN_PASSWORD environment variable or prompted for (hidden).
 * No default passwords exist anywhere in the project.
 */
function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function promptHidden(question: string): Promise<string> {
  let muted = false;
  const output = new Writable({
    write(chunk, _enc, cb) {
      if (!muted) process.stdout.write(chunk);
      cb();
    },
  });
  const rl = readline.createInterface({ input: process.stdin, output, terminal: true });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
    muted = true;
  });
}

const username = arg('username');
const role = arg('role') ?? 'owner';
const email = arg('email');
if (!username) {
  console.error('Usage: npm run admin:create -- --username <name> [--role owner|editor|reviewer] [--email <email>]');
  process.exit(1);
}

const config = loadConfig();
await connectDb(config.MONGODB_URI);
await syncIndexes();

const existingCount = await Admin.countDocuments();
if (existingCount === 0 && role !== 'owner') {
  console.error('The first admin account must have the "owner" role.');
  process.exit(1);
}

let password = process.env.REVEAL_ADMIN_PASSWORD;
if (!password) {
  password = await promptHidden('Password (min 12 chars, upper+lower+digit): ');
  const confirm = await promptHidden('Confirm password: ');
  if (password !== confirm) {
    console.error('Passwords do not match.');
    process.exit(1);
  }
}

const parsed = createAdminSchema.safeParse({ username, role, password, ...(email ? { email } : {}) });
if (!parsed.success) {
  console.error(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n'));
  process.exit(1);
}
if (await Admin.exists({ username: parsed.data.username })) {
  console.error(`An admin named "${parsed.data.username}" already exists.`);
  process.exit(1);
}

const admin = await Admin.create({
  username: parsed.data.username,
  email: parsed.data.email,
  role: parsed.data.role,
  passwordHash: await hashPassword(parsed.data.password),
});
await audit(null, 'users.created_cli', 'admin', String(admin._id), { role: admin.role });
console.log(`✔ Created ${admin.role} "${admin.username}".`);
await disconnectDb();
