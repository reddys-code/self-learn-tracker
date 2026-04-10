import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDatabase } from './config/db.js';
import { seedCourseCatalog } from './services/courseService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  await connectDatabase(process.env.MONGO_URI);
  const result = await seedCourseCatalog();
  console.log('[seed] completed', result);
  process.exit(0);
}

run().catch((error) => {
  console.error('[seed] failed', error);
  process.exit(1);
});
