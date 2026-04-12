import { Router } from 'express';
import { createBootstrapAdmin, fetchSetupStatus, login, me, updateMyThemePreference } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/setup-status', fetchSetupStatus);
router.post('/bootstrap-admin', createBootstrapAdmin);
router.post('/login', login);
router.get('/me', protect, me);
router.patch('/me/theme', protect, updateMyThemePreference);

export default router;
