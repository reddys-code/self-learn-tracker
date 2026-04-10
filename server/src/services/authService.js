import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import { isDatabaseConnected } from '../config/db.js';
import { User } from '../models/User.js';
import { readUsersFile, writeUsersFile } from '../utils/fileStore.js';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeId(value) {
  return String(value);
}

function normalizeCourseIds(input = []) {
  if (!Array.isArray(input)) return [];
  return Array.from(new Set(input.map((item) => String(item || '').trim()).filter(Boolean)));
}

function toMongoCourseIds(ids = []) {
  return normalizeCourseIds(ids).filter((id) => mongoose.Types.ObjectId.isValid(id));
}

function sortUsers(users) {
  return [...users].sort((a, b) => a.name.localeCompare(b.name));
}

function createServiceError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function sanitizeUser(user) {
  if (!user) return null;
  const plain = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  return {
    id: normalizeId(plain._id || plain.id),
    name: plain.name,
    email: plain.email,
    role: plain.role,
    isActive: plain.isActive !== false,
    lastLoginAt: plain.lastLoginAt || null,
    createdAt: plain.createdAt || null,
    updatedAt: plain.updatedAt || null,
    assignedCourseIds: (plain.assignedCourseIds || []).map((item) => normalizeId(item._id || item)),
  };
}

async function getUsersRaw() {
  if (isDatabaseConnected()) {
    return User.find().lean();
  }
  return readUsersFile();
}

async function writeUsersRaw(users) {
  if (isDatabaseConnected()) {
    throw new Error('writeUsersRaw should not be used in Mongo mode.');
  }
  await writeUsersFile(users);
}

export async function hasAnyUsers() {
  if (isDatabaseConnected()) {
    return (await User.countDocuments()) > 0;
  }
  const users = await readUsersFile();
  return users.length > 0;
}

export async function getUserById(id) {
  if (!id) return null;
  if (isDatabaseConnected()) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return User.findById(id).lean();
  }
  const users = await readUsersFile();
  return users.find((user) => normalizeId(user.id || user._id) === normalizeId(id)) || null;
}

export async function getUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  if (isDatabaseConnected()) {
    return User.findOne({ email: normalizedEmail }).lean();
  }
  const users = await readUsersFile();
  return users.find((user) => user.email === normalizedEmail) || null;
}

export async function createUser({ name, email, password, role = 'user', isActive = true, createdBy = null, assignedCourseIds = [] }) {
  const cleanName = String(name || '').trim();
  const cleanEmail = normalizeEmail(email);
  const cleanPassword = String(password || '');
  const cleanRole = role === 'admin' ? 'admin' : 'user';
  const cleanAssignedCourseIds = normalizeCourseIds(assignedCourseIds);

  if (cleanName.length < 2) {
    throw createServiceError('Name must be at least 2 characters long.');
  }
  if (!cleanEmail.includes('@')) {
    throw createServiceError('A valid email address is required.');
  }
  if (cleanPassword.length < 8) {
    throw createServiceError('Password must be at least 8 characters long.');
  }

  const existing = await getUserByEmail(cleanEmail);
  if (existing) {
    throw createServiceError('A user with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(cleanPassword, 10);

  if (isDatabaseConnected()) {
    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      role: cleanRole,
      isActive,
      assignedCourseIds: toMongoCourseIds(cleanAssignedCourseIds),
      createdBy: createdBy && mongoose.Types.ObjectId.isValid(createdBy) ? createdBy : null,
    });
    return sanitizeUser(user);
  }

  const users = await readUsersFile();
  const now = new Date().toISOString();
  const newUser = {
    id: randomUUID(),
    name: cleanName,
    email: cleanEmail,
    passwordHash,
    role: cleanRole,
    isActive: Boolean(isActive),
    lastLoginAt: null,
    assignedCourseIds: cleanAssignedCourseIds,
    createdAt: now,
    updatedAt: now,
    createdBy: createdBy || null,
  };
  users.push(newUser);
  await writeUsersRaw(sortUsers(users));
  return sanitizeUser(newUser);
}

export async function bootstrapAdmin(payload) {
  if (await hasAnyUsers()) {
    throw createServiceError('Bootstrap is disabled because users already exist.');
  }
  return createUser({ ...payload, role: 'admin', isActive: true, createdBy: null });
}

export async function verifyCredentials({ email, password }) {
  const user = await getUserByEmail(email);
  if (!user || !user.isActive) {
    throw createServiceError('Invalid email or password.', 401);
  }

  const passwordHash = user.passwordHash;
  const isValid = await bcrypt.compare(String(password || ''), passwordHash);
  if (!isValid) {
    throw createServiceError('Invalid email or password.', 401);
  }

  await touchLastLogin(normalizeId(user._id || user.id));
  const refreshed = await getUserById(normalizeId(user._id || user.id));
  return sanitizeUser(refreshed);
}

export async function touchLastLogin(userId) {
  if (!userId) return null;
  if (isDatabaseConnected()) {
    await User.findByIdAndUpdate(userId, { lastLoginAt: new Date() });
    return null;
  }

  const users = await readUsersFile();
  const idx = users.findIndex((user) => normalizeId(user.id) === normalizeId(userId));
  if (idx >= 0) {
    users[idx] = {
      ...users[idx],
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await writeUsersRaw(sortUsers(users));
  }
  return null;
}

export async function listUsers() {
  const users = await getUsersRaw();
  return sortUsers(users.map((user) => sanitizeUser(user)));
}

export async function updateUser(userId, updates = {}) {
  const allowedFields = {
    name: typeof updates.name === 'string' ? updates.name.trim() : undefined,
    email: typeof updates.email === 'string' ? normalizeEmail(updates.email) : undefined,
    role: updates.role === 'admin' ? 'admin' : updates.role === 'user' ? 'user' : undefined,
    isActive: typeof updates.isActive === 'boolean' ? updates.isActive : undefined,
    assignedCourseIds: Array.isArray(updates.assignedCourseIds) ? normalizeCourseIds(updates.assignedCourseIds) : undefined,
  };
  const password = typeof updates.password === 'string' && updates.password ? updates.password : undefined;

  if (allowedFields.email) {
    const existing = await getUserByEmail(allowedFields.email);
    if (existing && normalizeId(existing._id || existing.id) !== normalizeId(userId)) {
      throw createServiceError('Another user already uses that email address.');
    }
  }

  if (password && password.length < 8) {
    throw createServiceError('Password must be at least 8 characters long.');
  }

  if (isDatabaseConnected()) {
    const updateDoc = {};
    Object.entries(allowedFields).forEach(([key, value]) => {
      if (value === undefined) return;
      if (key === 'assignedCourseIds') {
        updateDoc[key] = toMongoCourseIds(value);
      } else {
        updateDoc[key] = value;
      }
    });
    if (password) {
      updateDoc.passwordHash = await bcrypt.hash(password, 10);
    }
    const updated = await User.findByIdAndUpdate(userId, updateDoc, { new: true }).lean();
    if (!updated) {
      throw createServiceError('User not found.', 404);
    }
    return sanitizeUser(updated);
  }

  const users = await readUsersFile();
  const idx = users.findIndex((user) => normalizeId(user.id) === normalizeId(userId));
  if (idx < 0) {
    throw createServiceError('User not found.', 404);
  }

  const current = users[idx];
  const nextUser = {
    ...current,
    ...Object.fromEntries(Object.entries(allowedFields).filter(([, value]) => value !== undefined)),
    updatedAt: new Date().toISOString(),
  };
  if (password) {
    nextUser.passwordHash = await bcrypt.hash(password, 10);
  }
  users[idx] = nextUser;
  await writeUsersRaw(sortUsers(users));
  return sanitizeUser(nextUser);
}
