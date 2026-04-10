import { Router } from 'express';
import {
  fetchAdminOverviewController,
  fetchAdminUserProgress,
  fetchContent,
  fetchMyProgress,
  fetchMySummary,
  fetchWeeks,
  healthCheck,
  saveMyProgress,
  seedContent,
} from '../controllers/roadmapController.js';
import { adminOnly, protect } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/health', healthCheck);
router.get('/content', fetchContent);
router.get('/weeks', fetchWeeks);
router.post('/seed', seedContent);

router.get('/progress/me', protect, fetchMyProgress);
router.put('/progress/:dayNumber', protect, saveMyProgress);
router.get('/summary/me', protect, fetchMySummary);

router.get('/admin/overview', protect, adminOnly, fetchAdminOverviewController);
router.get('/admin/users/:userId/progress', protect, adminOnly, fetchAdminUserProgress);

export default router;
