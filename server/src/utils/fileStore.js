import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storageDir = path.resolve(__dirname, '../../storage');
const files = {
  progress: path.join(storageDir, 'progress.json'),
  users: path.join(storageDir, 'users.json'),
  courses: path.join(storageDir, 'courses.json'),
};

async function ensureStorage() {
  await mkdir(storageDir, { recursive: true });
}

async function readJson(filePath, fallback) {
  await ensureStorage();
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await writeJson(filePath, fallback);
      return fallback;
    }
    throw error;
  }
}

async function writeJson(filePath, value) {
  await ensureStorage();
  await writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

export async function readProgressFile() {
  return readJson(files.progress, []);
}

export async function writeProgressFile(progress) {
  return writeJson(files.progress, progress);
}

export async function readUsersFile() {
  return readJson(files.users, []);
}

export async function writeUsersFile(users) {
  return writeJson(files.users, users);
}

export async function readCoursesFile() {
  return readJson(files.courses, []);
}

export async function writeCoursesFile(courses) {
  return writeJson(files.courses, courses);
}
