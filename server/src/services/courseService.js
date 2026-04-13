import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import { isDatabaseConnected } from '../config/db.js';
import { Course } from '../models/Course.js';
import { CourseProgress } from '../models/CourseProgress.js';
import { readCoursesFile, readProgressFile, writeCoursesFile, writeProgressFile } from '../utils/fileStore.js';
import { getSeedCourses } from '../data/seedCourses.js';
import { getUserById, listUsers } from './authService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../public/uploads');

export const VALID_STATUSES = new Set(['not-started', 'in-progress', 'blocked', 'complete']);

function normalizeId(value) {
  return String(value);
}

function createServiceError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function sanitizeText(value) {
  return String(value || '').trim();
}

function sanitizeStringList(input = []) {
  return Array.from(new Set((Array.isArray(input) ? input : []).map((item) => sanitizeText(item)).filter(Boolean)));
}

function sanitizeAttachments(input = []) {
  const normalizeAttachmentUrl = (url) => {
    const clean = sanitizeText(url);
    if (!clean) return '';
    if (/^(https?:)?\/\//i.test(clean) || clean.startsWith('/')) return clean;
    return `https://${clean}`;
  };

  const titleFromType = (type) => {
    const normalizedType = sanitizeText(type || 'link').toLowerCase();
    if (normalizedType === 'video') return 'Video link';
    if (normalizedType === 'pdf') return 'PDF resource';
    if (normalizedType === 'repo') return 'Repository';
    if (normalizedType === 'slides') return 'Slides';
    if (normalizedType === 'worksheet') return 'Worksheet';
    return 'Material link';
  };

  return (Array.isArray(input) ? input : [])
    .map((item) => ({
      type: sanitizeText(item?.type || 'link') || 'link',
      title: sanitizeText(item?.title || item?.label || item?.name),
      url: normalizeAttachmentUrl(item?.url),
      description: sanitizeText(item?.description),
    }))
    .filter((item) => item.url)
    .map((item, index) => ({
      ...item,
      title: item.title || titleFromType(item.type),
      id: item.id || `${item.type || 'asset'}-${index + 1}-${randomUUID().slice(0, 8)}`,
    }));
}

function sanitizeSections(input = []) {
  return (Array.isArray(input) ? input : [])
    .map((item) => ({ label: sanitizeText(item?.label), value: sanitizeText(item?.value) }))
    .filter((item) => item.label && item.value);
}

function ensureSearchText(day) {
  if (day.searchText) return sanitizeText(day.searchText);
  const text = [
    day.title,
    day.objective,
    day.primaryDeliverable,
    ...(day.tags || []),
    ...(day.sections || []).map((section) => `${section.label} ${section.value}`),
    ...(day.materials || []).map((material) => `${material.title} ${material.description || ''}`),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return text;
}

function sortWeeks(weeks = []) {
  return [...weeks]
    .map((week) => ({
      ...week,
      days: [...(week.days || [])].sort((a, b) => Number(a.dayNumber) - Number(b.dayNumber)),
    }))
    .sort((a, b) => Number(a.weekNumber) - Number(b.weekNumber));
}

function normalizeWeek(week = {}) {
  const days = (Array.isArray(week.days) ? week.days : []).map((day, index) => normalizeDay(day, index + 1));
  return {
    weekNumber: Number(week.weekNumber) || 1,
    phaseLabel: sanitizeText(week.phaseLabel),
    title: sanitizeText(week.title) || `Week ${Number(week.weekNumber) || 1}`,
    summary: sanitizeText(week.summary),
    accent: sanitizeText(week.accent) || '#2e6ca5',
    deliverables: sanitizeStringList(week.deliverables),
    days,
  };
}

function normalizeDay(day = {}, fallbackNumber = 1) {
  const sections = sanitizeSections(day.sections);
  const materials = sanitizeAttachments(day.materials);
  const normalized = {
    dayNumber: Number(day.dayNumber) || fallbackNumber,
    dayType: sanitizeText(day.dayType) || 'Weekday',
    hours: sanitizeText(day.hours) || '5h',
    title: sanitizeText(day.title) || `Day ${Number(day.dayNumber) || fallbackNumber}`,
    objective: sanitizeText(day.objective),
    sections,
    primaryDeliverable: sanitizeText(day.primaryDeliverable),
    materials,
    tags: sanitizeStringList(day.tags),
    searchText: '',
  };
  normalized.searchText = ensureSearchText(normalized);
  return normalized;
}

function normalizeTimeline(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      phase: sanitizeText(item?.phase),
      title: sanitizeText(item?.title),
      description: sanitizeText(item?.description),
    }))
    .filter((item) => item.phase || item.title || item.description);
}

function normalizeStats(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({ value: sanitizeText(item?.value), label: sanitizeText(item?.label) }))
    .filter((item) => item.value || item.label);
}

function normalizeBrochure(brochure = {}) {
  return {
    eyebrow: sanitizeText(brochure.eyebrow),
    headline: sanitizeText(brochure.headline),
    lead: sanitizeText(brochure.lead),
    strapTitle: sanitizeText(brochure.strapTitle),
    strapText: sanitizeText(brochure.strapText),
    pdfUrl: sanitizeText(brochure.pdfUrl),
    heroImageUrl: sanitizeText(brochure.heroImageUrl),
    chips: sanitizeStringList(brochure.chips),
    audience: sanitizeStringList(brochure.audience),
    outcomes: sanitizeStringList(brochure.outcomes),
    differentiators: sanitizeStringList(brochure.differentiators),
    cadence: sanitizeStringList(brochure.cadence),
    timeline: normalizeTimeline(brochure.timeline),
  };
}

function normalizeCoursePayload(payload = {}, fallback = {}) {
  const weeks = sortWeeks((Array.isArray(payload.weeks) ? payload.weeks : fallback.weeks || []).map((week) => normalizeWeek(week)));
  const durationDays = weeks.reduce((sum, week) => sum + week.days.length, 0);
  const slugSource = sanitizeText(payload.slug || fallback.slug || payload.title || fallback.title);
  const slug = slugSource
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

  return {
    slug: slug || `course-${randomUUID().slice(0, 8)}`,
    title: sanitizeText(payload.title || fallback.title) || 'Untitled course',
    category: sanitizeText(payload.category || fallback.category) || 'General',
    level: sanitizeText(payload.level || fallback.level) || 'Intermediate',
    status: ['draft', 'published', 'archived'].includes(payload.status) ? payload.status : (fallback.status || 'draft'),
    shortDescription: sanitizeText(payload.shortDescription || fallback.shortDescription),
    tagline: sanitizeText(payload.tagline || fallback.tagline),
    durationDays,
    brochure: normalizeBrochure({ ...(fallback.brochure || {}), ...(payload.brochure || {}) }),
    stats: normalizeStats(payload.stats || fallback.stats),
    downloads: sanitizeAttachments(payload.downloads || fallback.downloads),
    featuredScreens: sanitizeStringList(payload.featuredScreens || fallback.featuredScreens),
    weeks,
  };
}

function normalizeCourseEntity(course) {
  if (!course) return null;
  const plain = typeof course.toObject === 'function' ? course.toObject() : { ...course };
  const normalized = normalizeCoursePayload(plain, plain);
  return {
    id: normalizeId(plain._id || plain.id || normalized.slug),
    createdAt: plain.createdAt || null,
    updatedAt: plain.updatedAt || null,
    createdBy: plain.createdBy ? normalizeId(plain.createdBy._id || plain.createdBy) : null,
    updatedBy: plain.updatedBy ? normalizeId(plain.updatedBy._id || plain.updatedBy) : null,
    ...normalized,
  };
}

function courseCard(course) {
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    category: course.category,
    level: course.level,
    status: course.status,
    shortDescription: course.shortDescription,
    tagline: course.tagline,
    durationDays: course.durationDays,
    brochure: {
      eyebrow: course.brochure?.eyebrow || '',
      headline: course.brochure?.headline || course.title,
      lead: course.brochure?.lead || course.shortDescription,
      pdfUrl: course.brochure?.pdfUrl || '',
      heroImageUrl: course.brochure?.heroImageUrl || '',
      chips: course.brochure?.chips || [],
    },
    stats: course.stats || [],
    downloads: course.downloads || [],
    featuredScreens: course.featuredScreens || [],
    weekCount: course.weeks?.length || 0,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}

function normalizeProgressEntry(entry) {
  return {
    id: normalizeId(entry._id || entry.id),
    userId: normalizeId(entry.userId),
    courseId: normalizeId(entry.courseId),
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

function totalDaysInCourse(course) {
  return course.weeks.reduce((sum, week) => sum + week.days.length, 0);
}

export function buildCourseSummary(course, progressList) {
  const totalDays = totalDaysInCourse(course);
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

  const weeklyProgress = course.weeks.map((week) => {
    const complete = week.days.filter((day) => (progressMap.get(day.dayNumber)?.status || 'not-started') === 'complete').length;
    return {
      weekNumber: week.weekNumber,
      title: week.title,
      phaseLabel: week.phaseLabel,
      complete,
      totalDays: week.days.length,
      percent: week.days.length ? Math.round((complete / week.days.length) * 100) : 0,
    };
  });

  const phaseMap = new Map();
  course.weeks.forEach((week) => {
    const phaseLabel = week.phaseLabel || `Week ${week.weekNumber}`;
    const existing = phaseMap.get(phaseLabel) || { phaseLabel, totalDays: 0, complete: 0 };
    week.days.forEach((day) => {
      existing.totalDays += 1;
      if ((progressMap.get(day.dayNumber)?.status || 'not-started') === 'complete') {
        existing.complete += 1;
      }
    });
    phaseMap.set(phaseLabel, existing);
  });

  const mostRecent = [...progressList].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0] || null;

  return {
    totalDays,
    statusCounts,
    completionPct,
    weeklyProgress,
    phaseProgress: Array.from(phaseMap.values()).map((item) => ({
      ...item,
      percent: item.totalDays ? Math.round((item.complete / item.totalDays) * 100) : 0,
    })),
    latestUpdatedDay: mostRecent?.dayNumber || null,
    lastUpdatedAt: mostRecent?.updatedAt || null,
  };
}

async function seedFallbackCourses(existingCourses = []) {
  const seeds = getSeedCourses();
  const map = new Map(existingCourses.map((course) => [course.slug, course]));
  let changed = false;
  seeds.forEach((seed) => {
    if (!map.has(seed.slug)) {
      map.set(seed.slug, {
        ...seed,
        id: seed.id || seed.slug,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      changed = true;
    }
  });
  const list = Array.from(map.values());
  if (changed) {
    await writeCoursesFile(list);
  }
  return list;
}

export async function seedCourseCatalog() {
  if (isDatabaseConnected()) {
    const seeds = getSeedCourses();
    for (const seed of seeds) {
      const payload = normalizeCoursePayload(seed, seed);
      const existing = await Course.findOne({ slug: payload.slug });
      if (!existing) {
        await Course.create(payload);
      }
    }
    return { mode: 'mongo', seeded: seeds.length };
  }

  const existing = await readCoursesFile();
  const list = await seedFallbackCourses(existing);
  return { mode: 'fallback', seeded: list.length };
}

async function getCoursesRaw() {
  if (isDatabaseConnected()) {
    const courses = await Course.find().sort({ updatedAt: -1, title: 1 }).lean();
    return courses.map(normalizeCourseEntity);
  }
  const courses = await seedFallbackCourses(await readCoursesFile());
  return courses.map(normalizeCourseEntity);
}

export async function listAllCourses() {
  return getCoursesRaw();
}

export async function listPublicCourseCards() {
  const courses = await getCoursesRaw();
  return courses.filter((course) => course.status === 'published').map(courseCard);
}

export async function getCourseByRef(ref, { includeDraft = false } = {}) {
  if (!ref) return null;

  if (isDatabaseConnected()) {
    const query = mongoose.Types.ObjectId.isValid(ref)
      ? { $or: [{ _id: ref }, { slug: ref }] }
      : { slug: ref };
    const course = await Course.findOne(query).lean();
    const normalized = normalizeCourseEntity(course);
    if (!normalized) return null;
    if (!includeDraft && normalized.status !== 'published') return null;
    return normalized;
  }

  const courses = await getCoursesRaw();
  const course = courses.find((item) => item.id === ref || item.slug === ref) || null;
  if (!course) return null;
  if (!includeDraft && course.status !== 'published') return null;
  return course;
}

export async function createCourse(payload, actorId = null) {
  const normalized = normalizeCoursePayload(payload, {});
  const existing = await getCourseByRef(normalized.slug, { includeDraft: true });
  if (existing) {
    throw createServiceError('A course with this slug already exists.');
  }

  if (isDatabaseConnected()) {
    const doc = await Course.create({
      ...normalized,
      createdBy: actorId && mongoose.Types.ObjectId.isValid(actorId) ? actorId : null,
      updatedBy: actorId && mongoose.Types.ObjectId.isValid(actorId) ? actorId : null,
    });
    return normalizeCourseEntity(doc);
  }

  const courses = await getCoursesRaw();
  const now = new Date().toISOString();
  const next = {
    ...normalized,
    id: randomUUID(),
    createdBy: actorId,
    updatedBy: actorId,
    createdAt: now,
    updatedAt: now,
  };
  courses.push(next);
  await writeCoursesFile(courses);
  return normalizeCourseEntity(next);
}

export function getCourseEditorTemplate() {
  return {
    id: '',
    slug: '',
    title: 'Untitled Course',
    category: 'General',
    level: 'Intermediate',
    status: 'draft',
    shortDescription: '',
    tagline: '',
    brochure: {
      eyebrow: 'NEW COURSE',
      headline: '',
      lead: '',
      strapTitle: '',
      strapText: '',
      pdfUrl: '',
      heroImageUrl: '',
      chips: [],
      audience: [],
      outcomes: [],
      differentiators: [],
      cadence: [],
      timeline: [],
    },
    stats: [],
    downloads: [],
    featuredScreens: [],
    weeks: [
      {
        weekNumber: 1,
        phaseLabel: 'Phase 1',
        title: 'Week 1',
        summary: '',
        accent: '#2e6ca5',
        deliverables: [],
        days: [
          {
            dayNumber: 1,
            dayType: 'Weekday',
            hours: '5h',
            title: 'Day 1',
            objective: '',
            sections: [{ label: 'Module', value: '' }],
            primaryDeliverable: '',
            materials: [],
            tags: [],
          },
        ],
      },
    ],
  };
}

export async function updateCourse(courseRef, payload, actorId = null) {
  const existing = await getCourseByRef(courseRef, { includeDraft: true });
  if (!existing) {
    throw createServiceError('Course not found.', 404);
  }

  const merged = normalizeCoursePayload(payload, existing);
  if (merged.slug !== existing.slug) {
    const slugClash = await getCourseByRef(merged.slug, { includeDraft: true });
    if (slugClash && slugClash.id !== existing.id) {
      throw createServiceError('Another course already uses that slug.');
    }
  }

  if (isDatabaseConnected()) {
    const updateDoc = {
      ...merged,
      updatedBy: actorId && mongoose.Types.ObjectId.isValid(actorId) ? actorId : null,
    };
    const updated = await Course.findOneAndUpdate(
      mongoose.Types.ObjectId.isValid(existing.id) ? { _id: existing.id } : { slug: existing.slug },
      updateDoc,
      { new: true }
    ).lean();
    return normalizeCourseEntity(updated);
  }

  const courses = await getCoursesRaw();
  const index = courses.findIndex((course) => course.id === existing.id);
  const nextCourse = {
    ...courses[index],
    ...merged,
    updatedBy: actorId,
    updatedAt: new Date().toISOString(),
  };
  courses[index] = nextCourse;
  await writeCoursesFile(courses);
  return normalizeCourseEntity(nextCourse);
}

function getCourseAccessIds(user) {
  return new Set((user?.assignedCourseIds || []).map((item) => normalizeId(item)));
}

export async function listCoursesForUser(userId) {
  const [user, courses] = await Promise.all([getUserById(userId), getCoursesRaw()]);
  if (!user) {
    throw createServiceError('User not found.', 404);
  }

  if (user.role === 'admin') {
    return courses;
  }

  const accessIds = getCourseAccessIds(user);
  if (!accessIds.size) {
    return courses.filter((course) => course.status === 'published');
  }

  return courses.filter((course) => course.status === 'published' && accessIds.has(course.id));
}

export async function getPortalCourseCards(userId) {
  const [courses, allProgress] = await Promise.all([listCoursesForUser(userId), getAllProgressList()]);
  const progressByCourse = new Map();
  allProgress
    .filter((entry) => normalizeId(entry.userId) === normalizeId(userId))
    .forEach((entry) => {
      const key = normalizeId(entry.courseId);
      if (!progressByCourse.has(key)) progressByCourse.set(key, []);
      progressByCourse.get(key).push(entry);
    });

  return courses.map((course) => ({
    ...courseCard(course),
    summary: buildCourseSummary(course, progressByCourse.get(course.id) || []),
  }));
}

export async function getPortalCourseDetail(userId, courseRef) {
  const [user, course] = await Promise.all([
    getUserById(userId),
    getCourseByRef(courseRef, { includeDraft: true }),
  ]);

  if (!user) {
    throw createServiceError('User not found.', 404);
  }
  if (!course) {
    throw createServiceError('Course not found.', 404);
  }
  if (user.role === 'admin') return course;

  const accessIds = getCourseAccessIds(user);
  const allowed = course.status === 'published' && (!accessIds.size || accessIds.has(course.id));
  if (!allowed) {
    throw createServiceError('You do not have access to this course.', 403);
  }
  return course;
}

export async function getProgressList(userId, courseRef) {
  const course = await getPortalCourseDetail(userId, courseRef);
  if (isDatabaseConnected()) {
    const userQueryId = mongoose.Types.ObjectId.isValid(userId) ? userId : null;
    const courseQueryId = mongoose.Types.ObjectId.isValid(course.id) ? course.id : null;
    if (!userQueryId || !courseQueryId) return [];
    const progress = await CourseProgress.find({ userId: userQueryId, courseId: courseQueryId }).sort({ dayNumber: 1 }).lean();
    return sortProgress(progress.map(normalizeProgressEntry));
  }

  const progress = await readProgressFile();
  return sortProgress(
    progress
      .filter((entry) => normalizeId(entry.userId) === normalizeId(userId) && normalizeId(entry.courseId) === normalizeId(course.id))
      .map(normalizeProgressEntry)
  );
}

export async function getAllProgressList() {
  if (isDatabaseConnected()) {
    const progress = await CourseProgress.find().sort({ updatedAt: -1 }).lean();
    return progress.map(normalizeProgressEntry);
  }
  const progress = await readProgressFile();
  return progress.map(normalizeProgressEntry);
}

export async function upsertProgress(userId, courseRef, dayNumber, payload, updatedBy = null) {
  const course = await getPortalCourseDetail(userId, courseRef);
  const update = {
    userId,
    courseId: course.id,
    dayNumber,
    status: payload.status,
    notes: payload.notes ?? '',
    evidenceUrl: payload.evidenceUrl ?? '',
    completedAt: payload.status === 'complete' ? new Date() : null,
    updatedBy: updatedBy || userId,
  };

  if (isDatabaseConnected()) {
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(course.id)) {
      throw createServiceError('Invalid Mongo identifiers for progress save.', 400);
    }
    const doc = await CourseProgress.findOneAndUpdate(
      { userId, courseId: course.id, dayNumber },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    return normalizeProgressEntry(doc);
  }

  const progress = await readProgressFile();
  const idx = progress.findIndex(
    (entry) => normalizeId(entry.userId) === normalizeId(userId)
      && normalizeId(entry.courseId) === normalizeId(course.id)
      && Number(entry.dayNumber) === Number(dayNumber)
  );
  const merged = {
    ...(idx >= 0 ? progress[idx] : {}),
    ...update,
    id: idx >= 0 ? progress[idx].id : `${userId}-${course.id}-${dayNumber}`,
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

export async function getCourseSummaryForUser(userId, courseRef) {
  const [course, progressList] = await Promise.all([
    getPortalCourseDetail(userId, courseRef),
    getProgressList(userId, courseRef),
  ]);
  return buildCourseSummary(course, progressList);
}

export async function getLearnerOverview(userId) {
  const [user, courses, allProgress] = await Promise.all([
    getUserById(userId),
    listCoursesForUser(userId),
    getAllProgressList(),
  ]);
  if (!user) throw createServiceError('User not found.', 404);

  const progressByCourse = new Map();
  allProgress
    .filter((entry) => normalizeId(entry.userId) === normalizeId(userId))
    .forEach((entry) => {
      const key = normalizeId(entry.courseId);
      if (!progressByCourse.has(key)) progressByCourse.set(key, []);
      progressByCourse.get(key).push(entry);
    });

  const cards = courses.map((course) => {
    const progress = progressByCourse.get(course.id) || [];
    return {
      ...courseCard(course),
      summary: buildCourseSummary(course, progress),
    };
  });

  const aggregate = {
    complete: 0,
    'in-progress': 0,
    blocked: 0,
    'not-started': 0,
    totalDays: 0,
  };

  cards.forEach((course) => {
    aggregate.complete += course.summary.statusCounts.complete;
    aggregate['in-progress'] += course.summary.statusCounts['in-progress'];
    aggregate.blocked += course.summary.statusCounts.blocked;
    aggregate['not-started'] += course.summary.statusCounts['not-started'];
    aggregate.totalDays += course.summary.totalDays;
  });

  const completionPct = aggregate.totalDays ? Math.round((aggregate.complete / aggregate.totalDays) * 100) : 0;
  const recentActivity = allProgress
    .filter((entry) => normalizeId(entry.userId) === normalizeId(userId))
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    .slice(0, 12)
    .map((entry) => ({
      ...entry,
      userName: user.name,
      courseTitle: cards.find((course) => course.id === entry.courseId)?.title || 'Course',
    }));

  return {
    learner: user,
    courses: cards,
    aggregateStatusCounts: {
      complete: aggregate.complete,
      'in-progress': aggregate['in-progress'],
      blocked: aggregate.blocked,
      'not-started': aggregate['not-started'],
    },
    overallCompletionPct: completionPct,
    recentActivity,
  };
}

function emptySummaryForCourse(course) {
  return buildCourseSummary(course, []);
}

export async function getUserCourseProgressDetail(userId, courseRef) {
  const [user, course] = await Promise.all([
    getUserById(userId),
    getCourseByRef(courseRef, { includeDraft: true }),
  ]);
  if (!user) throw createServiceError('User not found.', 404);
  if (!course) throw createServiceError('Course not found.', 404);

  let progress = [];
  if (isDatabaseConnected()) {
    if (mongoose.Types.ObjectId.isValid(userId) && mongoose.Types.ObjectId.isValid(course.id)) {
      const rows = await CourseProgress.find({ userId, courseId: course.id }).sort({ dayNumber: 1 }).lean();
      progress = sortProgress(rows.map(normalizeProgressEntry));
    }
  } else {
    const rows = await readProgressFile();
    progress = sortProgress(
      rows
        .filter((entry) => normalizeId(entry.userId) === normalizeId(userId) && normalizeId(entry.courseId) === normalizeId(course.id))
        .map(normalizeProgressEntry)
    );
  }

  return {
    user,
    course: courseCard(course),
    progress,
    summary: buildCourseSummary(course, progress),
  };
}

export async function getAdminOverview({ courseRef = '' } = {}) {
  const [courses, users, allProgress] = await Promise.all([getCoursesRaw(), listUsers(), getAllProgressList()]);
  const selectedCourse = await (async () => {
    if (courseRef) {
      return getCourseByRef(courseRef, { includeDraft: true });
    }
    return courses.find((course) => course.status !== 'archived') || courses[0] || null;
  })();

  const courseCards = courses.map((course) => {
    const assignedUsers = users.filter((user) => (user.assignedCourseIds || []).includes(course.id));
    return {
      ...courseCard(course),
      assignedLearners: assignedUsers.length,
    };
  });

  if (!selectedCourse) {
    return {
      courses: courseCards,
      selectedCourse: null,
      users: [],
      activeUsers: users.filter((user) => user.isActive).length,
      adminCount: users.filter((user) => user.role === 'admin').length,
      aggregateStatusCounts: { complete: 0, 'in-progress': 0, blocked: 0, 'not-started': 0 },
      weeklyProgress: [],
      phaseProgress: [],
      overallCompletionPct: 0,
      recentActivity: [],
    };
  }

  const selectedProgress = allProgress.filter((entry) => normalizeId(entry.courseId) === normalizeId(selectedCourse.id));
  const progressByUser = new Map();
  selectedProgress.forEach((entry) => {
    const key = normalizeId(entry.userId);
    if (!progressByUser.has(key)) progressByUser.set(key, []);
    progressByUser.get(key).push(entry);
  });

  const relevantUsers = users.filter((user) => {
    if (user.role === 'admin') return true;
    const assigned = user.assignedCourseIds || [];
    return !assigned.length || assigned.includes(selectedCourse.id);
  });

  const userSummaries = relevantUsers.map((user) => {
    const progressList = sortProgress(progressByUser.get(user.id) || []);
    const summary = buildCourseSummary(selectedCourse, progressList);
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

  const activeUsers = userSummaries.filter((user) => user.isActive && user.role !== 'admin');
  const aggregateStatusCounts = { complete: 0, 'in-progress': 0, blocked: 0, 'not-started': 0 };
  const weeklyAggregate = selectedCourse.weeks.map((week) => ({
    weekNumber: week.weekNumber,
    title: week.title,
    phaseLabel: week.phaseLabel,
    complete: 0,
    totalDays: week.days.length * Math.max(activeUsers.length, 1),
    percent: 0,
  }));
  const phaseAggregateMap = new Map();

  activeUsers.forEach((user) => {
    Object.entries(user.statusCounts).forEach(([status, count]) => {
      aggregateStatusCounts[status] += count;
    });
    user.weeklyProgress.forEach((week) => {
      const target = weeklyAggregate.find((entry) => entry.weekNumber === week.weekNumber);
      if (target) target.complete += week.complete;
    });
    user.phaseProgress.forEach((phase) => {
      const existing = phaseAggregateMap.get(phase.phaseLabel) || {
        phaseLabel: phase.phaseLabel,
        complete: 0,
        totalDays: 0,
      };
      existing.complete += phase.complete;
      existing.totalDays += phase.totalDays;
      phaseAggregateMap.set(phase.phaseLabel, existing);
    });
  });

  weeklyAggregate.forEach((week) => {
    week.percent = week.totalDays ? Math.round((week.complete / week.totalDays) * 100) : 0;
  });

  const phaseProgress = Array.from(phaseAggregateMap.values()).map((phase) => ({
    ...phase,
    percent: phase.totalDays ? Math.round((phase.complete / phase.totalDays) * 100) : 0,
  }));

  const totalSlots = Object.values(aggregateStatusCounts).reduce((sum, count) => sum + count, 0);
  const overallCompletionPct = totalSlots ? Math.round((aggregateStatusCounts.complete / totalSlots) * 100) : 0;

  const recentActivity = selectedProgress
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    .slice(0, 18)
    .map((entry) => ({
      ...entry,
      userName: users.find((user) => user.id === entry.userId)?.name || 'Learner',
      courseTitle: selectedCourse.title,
    }));

  return {
    courses: courseCards,
    selectedCourse: courseCard(selectedCourse),
    users: userSummaries,
    activeUsers: activeUsers.length,
    adminCount: users.filter((user) => user.role === 'admin').length,
    aggregateStatusCounts,
    weeklyProgress: weeklyAggregate,
    phaseProgress,
    overallCompletionPct,
    recentActivity,
  };
}

function extensionFromFileName(fileName = '', mimeType = '') {
  const clean = sanitizeText(fileName);
  if (clean.includes('.')) {
    return clean.split('.').pop().toLowerCase();
  }
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('jpeg')) return 'jpg';
  if (mimeType.includes('spreadsheet')) return 'xlsx';
  if (mimeType.includes('presentation')) return 'pptx';
  if (mimeType.includes('wordprocessingml')) return 'docx';
  return 'bin';
}

function sanitizeFileStem(fileName = 'asset') {
  return sanitizeText(fileName)
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'asset';
}

export async function storeBase64Asset({ fileName, mimeType = '', dataUrl, folder = 'courses' }) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.includes(',')) {
    throw createServiceError('Upload payload must contain a base64 dataUrl.', 400);
  }
  const [, base64Data] = dataUrl.split(',', 2);
  const buffer = Buffer.from(base64Data, 'base64');
  if (!buffer.length) {
    throw createServiceError('Uploaded file is empty.', 400);
  }
  if (buffer.length > 15 * 1024 * 1024) {
    throw createServiceError('File too large. Keep uploads under 15 MB for this built-in uploader.', 400);
  }

  const ext = extensionFromFileName(fileName, mimeType);
  const stem = sanitizeFileStem(fileName);
  const safeFolder = sanitizeFileStem(folder) || 'courses';
  const relativeDir = path.join('uploads', safeFolder);
  const absoluteDir = path.resolve(uploadsDir, safeFolder);
  await mkdir(absoluteDir, { recursive: true });
  const finalName = `${Date.now()}-${stem}.${ext}`;
  const absolutePath = path.join(absoluteDir, finalName);
  await writeFile(absolutePath, buffer);
  return {
    url: `/${relativeDir}/${finalName}`,
    name: fileName,
    size: buffer.length,
    mimeType,
  };
}
