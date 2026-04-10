import {
  getAdminOverview,
  getProgressList,
  getRoadmapContent,
  getSummary,
  getUserProgressDetail,
  getWeeks,
  seedRoadmapContent,
  upsertProgress,
} from '../services/roadmapService.js';
import { emitProgressUpdated } from '../config/socket.js';

const VALID_STATUSES = new Set(['not-started', 'in-progress', 'blocked', 'complete']);

export async function healthCheck(_req, res) {
  res.json({ ok: true, service: 'solution-architect-roadmap-api' });
}

export async function fetchContent(_req, res, next) {
  try {
    const content = await getRoadmapContent();
    res.json(content);
  } catch (error) {
    next(error);
  }
}

export async function fetchWeeks(req, res, next) {
  try {
    const weeks = await getWeeks({
      phase: req.query.phase,
      search: req.query.search,
    });
    res.json(weeks);
  } catch (error) {
    next(error);
  }
}

export async function fetchMyProgress(req, res, next) {
  try {
    const progress = await getProgressList(req.user.id);
    res.json(progress);
  } catch (error) {
    next(error);
  }
}

export async function saveMyProgress(req, res, next) {
  try {
    const dayNumber = Number(req.params.dayNumber);
    if (!Number.isInteger(dayNumber) || dayNumber < 1) {
      return res.status(400).json({ message: 'dayNumber must be a positive integer.' });
    }

    const status = req.body?.status;
    if (!VALID_STATUSES.has(status)) {
      return res.status(400).json({ message: 'status must be one of not-started, in-progress, blocked, complete.' });
    }

    const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : '';
    const evidenceUrl = typeof req.body?.evidenceUrl === 'string' ? req.body.evidenceUrl.trim() : '';

    const saved = await upsertProgress(req.user.id, dayNumber, { status, notes, evidenceUrl }, req.user.id);
    emitProgressUpdated({ userId: req.user.id, progress: saved });
    return res.json(saved);
  } catch (error) {
    next(error);
  }
}

export async function fetchMySummary(req, res, next) {
  try {
    const summary = await getSummary(req.user.id);
    res.json(summary);
  } catch (error) {
    next(error);
  }
}

export async function fetchAdminOverviewController(_req, res, next) {
  try {
    const overview = await getAdminOverview();
    res.json(overview);
  } catch (error) {
    next(error);
  }
}

export async function fetchAdminUserProgress(req, res, next) {
  try {
    const detail = await getUserProgressDetail(req.params.userId);
    res.json(detail);
  } catch (error) {
    next(error);
  }
}

export async function seedContent(_req, res, next) {
  try {
    const seeded = await seedRoadmapContent();
    res.json({ ok: true, ...seeded });
  } catch (error) {
    next(error);
  }
}
