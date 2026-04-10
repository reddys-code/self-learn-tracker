import { Router } from 'express';
import {
  createAdminCourse,
  fetchAdminCourses,
  fetchAdminOverviewController,
  fetchAdminUserProgress,
  fetchMyProgress,
  fetchMySummary,
  fetchPortalCourseDetailController,
  fetchPortalCourses,
  fetchPortalOverview,
  fetchPublicCourse,
  fetchPublicCourses,
  healthCheck,
  saveMyProgress,
  seedContent,
  updateAdminCourse,
  uploadAdminAsset,
} from '../controllers/courseController.js';
import { adminOnly, protect } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/health', healthCheck);
router.post('/seed', seedContent);

router.get('/public/courses', fetchPublicCourses);
router.get('/public/courses/:courseRef', fetchPublicCourse);

router.get('/portal/overview', protect, fetchPortalOverview);
router.get('/portal/courses', protect, fetchPortalCourses);
router.get('/portal/courses/:courseRef', protect, fetchPortalCourseDetailController);
router.get('/portal/courses/:courseRef/progress', protect, fetchMyProgress);
router.put('/portal/courses/:courseRef/progress/:dayNumber', protect, saveMyProgress);
router.get('/portal/courses/:courseRef/summary', protect, fetchMySummary);

router.get('/admin/overview', protect, adminOnly, fetchAdminOverviewController);
router.get('/admin/courses', protect, adminOnly, fetchAdminCourses);
router.post('/admin/courses', protect, adminOnly, createAdminCourse);
router.patch('/admin/courses/:courseRef', protect, adminOnly, updateAdminCourse);
router.post('/admin/uploads', protect, adminOnly, uploadAdminAsset);
router.get('/admin/courses/:courseRef/users/:userId/progress', protect, adminOnly, fetchAdminUserProgress);

export default router;
