import dotenv from 'dotenv';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import { connectDatabase } from './config/db.js';
import { initSocket } from './config/socket.js';
import { seedCourseCatalog } from './services/courseService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const port = Number(process.env.PORT || 5000);

async function start() {
  await connectDatabase(process.env.MONGO_URI);
  await seedCourseCatalog();

  const httpServer = createServer(app);
  initSocket(httpServer);

  httpServer.listen(port, () => {
    console.log(`[server] Listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error('[server] Fatal startup error', error);
  process.exit(1);
});
