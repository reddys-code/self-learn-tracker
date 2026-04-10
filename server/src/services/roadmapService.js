import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { isDatabaseConnected } from '../config/db.js';
import { RoadmapContent } from '../models/RoadmapContent.js';
import { DayProgress } from '../models/DayProgress.js';
import { readProgressFile, writeProgressFile } from '../utils/fileStore.js';
import { getUserById, listUsers } from './authService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedData = JSON.parse(readFileSync(path.resolve(__dirname, '../data/seedData.json'), 'utf8'));
const ROADMAP_SLUG = seedData.slug;

function normalizeId(value) {
  return String(value);
}

function normalizeProgressEntry(entry) {
  return {
    id: normalizeId(entry._id || entry.id),
    userId: normalizeId(entry.userId),
    dayNumber: Number(entry.dayNumber),
    status: entry.status,
    notes: entry.notes || '',
    evidenceUrl: entry.evidenceUrl || '',
    completedAt: entry.completedAt || null,
    updatedAt: entry.updatedAt || entry.updated_at || null,
    createdAt: entry.createdAt || null,
    updatedBy: entry.updatedBy ? normalizeId(entry.updatedBy) : null,
  };
}

function sortProgress(list) {
  return [...list].sort((a, b) => {
    if (a.dayNumber === b.dayNumber) {
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    }
    return a.dayNumber - b.dayNumber;
  });
}

function getTotalDays(content) {
  return content.weeks.reduce((sum, week) => sum + week.days.length, 0);
}
function createServiceError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function buildSummary(content, progressList) {
  const totalDays = getTotalDays(content);
  const progressMap = new Map(progressList.map((entry) => [entry.dayNumber, entry]));
  const statusCounts = {
    complete: 0,
    'in-progress': 0,
    blocked: 0,
    'not-started': 0,
  };

  for (let day = 1; day <= totalDays; day += 1) {
    const status = progressMap.get(day)?.status || 'not-started';
    statusCounts[status] += 1;
  }

  const completionPct = totalDays ? Math.round((statusCounts.complete / totalDays) * 100) : 0;

  const phaseProgress = content.weeks.reduce((acc, week) => {
    const existing = acc.get(week.phaseLabel) || {
      phaseLabel: week.phaseLabel,
      totalDays: 0,
      complete: 0,
    };

    week.days.forEach((day) => {
      existing.totalDays += 1;
      if ((progressMap.get(day.dayNumber)?.status || 'not-started') === 'complete') {
        existing.complete += 1;
      }
    });

    acc.set(week.phaseLabel, existing);
    return acc;
  }, new Map());

  const weeklyProgress = content.weeks.map((week) => {
    const complete = week.days.filter(
      (day) => (progressMap.get(day.dayNumber)?.status || 'not-started') === 'complete'
    ).length;
    return {
      weekNumber: week.weekNumber,
      title: week.title,
      phaseLabel: week.phaseLabel,
      complete,
      totalDays: week.days.length,
      percent: week.days.length ? Math.round((complete / week.days.length) * 100) : 0,
    };
  });

  const mostRecent = [...progressList]
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0] || null;

  return {
    totalDays,
    statusCounts,
    completionPct,
    phaseProgress: Array.from(phaseProgress.values()).map((phase) => ({
      ...phase,
      percent: phase.totalDays ? Math.round((phase.complete / phase.totalDays) * 100) : 0,
    })),
    weeklyProgress,
    latestUpdatedDay: mostRecent?.dayNumber || null,
    lastUpdatedAt: mostRecent?.updatedAt || null,
  };
}

export async function getRoadmapContent() {
  if (isDatabaseConnected()) {
    const existing = await RoadmapContent.findOne({ slug: ROADMAP_SLUG }).lean();
    if (existing) {
      return existing;
    }
  }
  return seedData;
}

export async function seedRoadmapContent() {
  if (!isDatabaseConnected()) {
    return { mode: 'fallback', content: seedData };
  }

  const content = await RoadmapContent.findOneAndUpdate(
    { slug: ROADMAP_SLUG },
    seedData,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return { mode: 'mongo', content };
}

export async function getWeeks({ phase, search } = {}) {
  const content = await getRoadmapContent();
  const query = (search || '').trim().toLowerCase();

  return content.weeks
    .filter((week) => !phase || phase === 'all' || week.phaseLabel === phase)
    .map((week) => {
      const filteredDays = query
        ? week.days.filter((day) => (day.searchText || '').toLowerCase().includes(query))
        : week.days;
      return {
        ...week,
        days: filteredDays,
      };
    })
    .filter((week) => week.days.length > 0 || !query);
}

export async function getProgressList(userId) {
  if (!userId) return [];

  if (isDatabaseConnected()) {
    const query = mongoose.Types.ObjectId.isValid(userId) ? { userId } : { userId: null };
    const progress = await DayProgress.find(query).sort({ dayNumber: 1 }).lean();
    return sortProgress(progress.map(normalizeProgressEntry));
  }

  const progress = await readProgressFile();
  return sortProgress(
    progress
      .filter((entry) => normalizeId(entry.userId) === normalizeId(userId))
      .map(normalizeProgressEntry)
  );
}

export async function getAllProgressList() {
  if (isDatabaseConnected()) {
    const progress = await DayProgress.find().sort({ updatedAt: -1 }).lean();
    return progress.map(normalizeProgressEntry);
  }
  const progress = await readProgressFile();
  return progress.map(normalizeProgressEntry);
}

export async function upsertProgress(userId, dayNumber, payload, updatedBy = null) {
  const update = {
    userId,
    dayNumber,
    status: payload.status,
    notes: payload.notes ?? '',
    evidenceUrl: payload.evidenceUrl ?? '',
    completedAt: payload.status === 'complete' ? new Date() : null,
    updatedBy: updatedBy || userId,
  };

  if (isDatabaseConnected()) {
    const doc = await DayProgress.findOneAndUpdate(
      { userId, dayNumber },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    return normalizeProgressEntry(doc);
  }

  const progress = await readProgressFile();
  const idx = progress.findIndex(
    (entry) => normalizeId(entry.userId) === normalizeId(userId) && Number(entry.dayNumber) === dayNumber
  );
  const merged = {
    ...(idx >= 0 ? progress[idx] : {}),
    ...update,
    id: idx >= 0 ? progress[idx].id : `${userId}-${dayNumber}`,
    userId,
    updatedAt: new Date().toISOString(),
    createdAt: idx >= 0 ? progress[idx].createdAt : new Date().toISOString(),
  };

  if (idx >= 0) {
    progress[idx] = merged;
  } else {
    progress.push(merged);
  }

  await writeProgressFile(progress);
  return normalizeProgressEntry(merged);
}

export async function getSummary(userId) {
  const [content, progressList] = await Promise.all([getRoadmapContent(), getProgressList(userId)]);
  return buildSummary(content, progressList);
}

export async function getUserProgressDetail(userId) {
  const [user, content, progressList] = await Promise.all([
    getUserById(userId),
    getRoadmapContent(),
    getProgressList(userId),
  ]);
  if (!user) {
    throw createServiceError('User not found.', 404);
  }
  return {
    user: {
      id: normalizeId(user._id || user.id),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive !== false,
    },
    progress: progressList,
    summary: buildSummary(content, progressList),
  };
}

export async function getAdminOverview() {
  const [content, users, allProgress] = await Promise.all([
    getRoadmapContent(),
    listUsers(),
    getAllProgressList(),
  ]);

  const activeUsers = users.filter((user) => user.isActive);
  const progressByUser = allProgress.reduce((acc, entry) => {
    const key = normalizeId(entry.userId);
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key).push(entry);
    return acc;
  }, new Map());

  const userSummaries = users.map((user) => {
    const progressList = sortProgress(progressByUser.get(normalizeId(user.id)) || []);
    const summary = buildSummary(content, progressList);
    return {
      ...user,
      completionPct: summary.completionPct,
      statusCounts: summary.statusCounts,
      totalDays: summary.totalDays,
      completeDays: summary.statusCounts.complete,
      inProgressDays: summary.statusCounts['in-progress'],
      blockedDays: summary.statusCounts.blocked,
      notStartedDays: summary.statusCounts['not-started'],
      lastUpdatedAt: summary.lastUpdatedAt || user.updatedAt || null,
      latestUpdatedDay: summary.latestUpdatedDay,
      weeklyProgress: summary.weeklyProgress,
      phaseProgress: summary.phaseProgress,
    };
  });

  const aggregateStatusCounts = {
    complete: 0,
    'in-progress': 0,
    blocked: 0,
    'not-started': 0,
  };

  const weeklyAggregate = content.weeks.map((week) => ({
    weekNumber: week.weekNumber,
    title: week.title,
    phaseLabel: week.phaseLabel,
    complete: 0,
    totalDays: week.days.length * Math.max(activeUsers.length, 1),
    percent: 0,
  }));

  const phaseAggregateMap = new Map();

  userSummaries
    .filter((user) => user.isActive)
    .forEach((user) => {
      Object.entries(user.statusCounts).forEach(([status, count]) => {
        aggregateStatusCounts[status] += count;
      });

      user.weeklyProgress.forEach((week) => {
        const target = weeklyAggregate.find((entry) => entry.weekNumber === week.weekNumber);
        if (target) {
          target.complete += week.complete;
        }
      });

      user.phaseProgress.forEach((phase) => {
        const current = phaseAggregateMap.get(phase.phaseLabel) || {
          phaseLabel: phase.phaseLabel,
          complete: 0,
          totalDays: 0,
        };
        current.complete += phase.complete;
        current.totalDays += phase.totalDays;
        phaseAggregateMap.set(phase.phaseLabel, current);
      });
    });

  weeklyAggregate.forEach((week) => {
    week.percent = week.totalDays ? Math.round((week.complete / week.totalDays) * 100) : 0;
  });

  const phaseProgress = Array.from(phaseAggregateMap.values()).map((phase) => ({
    ...phase,
    percent: phase.totalDays ? Math.round((phase.complete / phase.totalDays) * 100) : 0,
  }));

  const totalAssignments = activeUsers.length * getTotalDays(content);
  const overallCompletionPct = totalAssignments
    ? Math.round((aggregateStatusCounts.complete / totalAssignments) * 100)
    : 0;

  const usersById = new Map(users.map((user) => [normalizeId(user.id), user]));
  const recentActivity = [...allProgress]
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    .slice(0, 25)
    .map((entry) => ({
      ...entry,
      userName: usersById.get(normalizeId(entry.userId))?.name || 'Unknown user',
      userEmail: usersById.get(normalizeId(entry.userId))?.email || '',
    }));

  return {
    totalUsers: users.length,
    activeUsers: activeUsers.length,
    adminCount: users.filter((user) => user.role === 'admin').length,
    learnerCount: users.filter((user) => user.role === 'user').length,
    roadmapDays: getTotalDays(content),
    totalAssignments,
    aggregateStatusCounts,
    overallCompletionPct,
    weeklyProgress: weeklyAggregate,
    phaseProgress,
    users: userSummaries.sort((a, b) => b.completionPct - a.completionPct),
    recentActivity,
    generatedAt: new Date().toISOString(),
  };
}
