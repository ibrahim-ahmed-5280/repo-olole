import { loadConfig } from '../config/env';
import { connectDb, disconnectDb, syncIndexes } from '../db';

const config = loadConfig();
await connectDb(config.MONGODB_URI);
const result = await syncIndexes();
for (const [collection, dropped] of Object.entries(result)) {
  console.log(`✔ ${collection}${dropped.length ? ` (dropped stale: ${dropped.join(', ')})` : ''}`);
}
console.log('Indexes are in sync.');
await disconnectDb();
