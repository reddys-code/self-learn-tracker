import {
  VALID_STATUSES,
  createCourse,
  getAdminOverview,
  getCourseEditorTemplate,
  getCourseByRef,
  getCourseSummaryForUser,
  getLearnerOverview,
  getPortalCourseCards,
  getPortalCourseDetail,
  getProgressList,
  getUserCourseProgressDetail,
  listAllCourses,
  listPublicCourseCards,
  seedCourseCatalog,
  storeBase64Asset,
  updateCourse,
  upsertProgress,
} from '../services/courseService.js';
import { emitCoursesUpdated, emitProgressUpdated } from '../config/socket.js';

export async function healthCheck(_req, res) {
  res.json({ ok: true, service: 'education-course-portal-api' });
}

export async function seedContent(_req, res, next) {
  try {
    const seeded = await seedCourseCatalog();
    res.json({ ok: true, ...seeded });
  } catch (error) {
    next(error);
  }
}

export async function fetchPublicCourses(_req, res, next) {
  try {
    const courses = await listPublicCourseCards();
    res.json(courses);
  } catch (error) {
    next(error);
  }
}

export async function fetchPublicCourse(req, res, next) {
  try {
    const course = await getCourseByRef(req.params.courseRef, { includeDraft: false });
    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }
    return res.json(course);
  } catch (error) {
    return next(error);
  }
}

export async function fetchPortalOverview(req, res, next) {
  try {
    const overview = await getLearnerOverview(req.user.id);
    res.json(overview);
  } catch (error) {
    next(error);
  }
}

export async function fetchPortalCourses(req, res, next) {
  try {
    const courses = await getPortalCourseCards(req.user.id);
    res.json(courses);
  } catch (error) {
    next(error);
  }
}

export async function fetchPortalCourseDetailController(req, res, next) {
  try {
    const course = await getPortalCourseDetail(req.user.id, req.params.courseRef);
    res.json(course);
  } catch (error) {
    next(error);
  }
}

export async function fetchMyProgress(req, res, next) {
  try {
    const progress = await getProgressList(req.user.id, req.params.courseRef);
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

    const saved = await upsertProgress(req.user.id, req.params.courseRef, dayNumber, { status, notes, evidenceUrl }, req.user.id);
    emitProgressUpdated({ userId: req.user.id, courseRef: req.params.courseRef, progress: saved });
    return res.json(saved);
  } catch (error) {
    return next(error);
  }
}

export async function fetchMySummary(req, res, next) {
  try {
    const summary = await getCourseSummaryForUser(req.user.id, req.params.courseRef);
    res.json(summary);
  } catch (error) {
    next(error);
  }
}

export async function fetchAdminOverviewController(req, res, next) {
  try {
    const overview = await getAdminOverview({ courseRef: req.query.courseRef || '' });
    res.json(overview);
  } catch (error) {
    next(error);
  }
}

export async function fetchAdminUserProgress(req, res, next) {
  try {
    const detail = await getUserCourseProgressDetail(req.params.userId, req.params.courseRef);
    res.json(detail);
  } catch (error) {
    next(error);
  }
}

export async function fetchAdminCourses(req, res, next) {
  try {
    const courses = await listAllCourses();
    res.json(courses);
  } catch (error) {
    next(error);
  }
}

export async function fetchAdminCourseTemplate(_req, res, next) {
  try {
    const template = getCourseEditorTemplate();
    res.json(template);
  } catch (error) {
    next(error);
  }
}

export async function createAdminCourse(req, res, next) {
  try {
    const course = await createCourse(req.body || {}, req.user.id);
    emitCoursesUpdated({ type: 'created', courseId: course.id });
    res.status(201).json(course);
  } catch (error) {
    next(error);
  }
}

export async function updateAdminCourse(req, res, next) {
  try {
    const course = await updateCourse(req.params.courseRef, req.body || {}, req.user.id);
    emitCoursesUpdated({ type: 'updated', courseId: course.id });
    res.json(course);
  } catch (error) {
    next(error);
  }
}

export async function uploadAdminAsset(req, res, next) {
  try {
    const fileName = req.body?.fileName;
    const mimeType = req.body?.mimeType || '';
    const dataUrl = req.body?.dataUrl;
    const folder = req.body?.folder || 'courses';
    const result = await storeBase64Asset({ fileName, mimeType, dataUrl, folder });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}
