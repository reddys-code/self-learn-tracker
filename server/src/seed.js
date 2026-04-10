import dotenv from 'dotenv';
import { connectDatabase } from './config/db.js';
import { seedCourseCatalog } from './services/courseService.js';

dotenv.config();

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
