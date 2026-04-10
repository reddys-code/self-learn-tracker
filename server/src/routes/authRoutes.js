import { Router } from 'express';
import { createBootstrapAdmin, fetchSetupStatus, login, me } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/setup-status', fetchSetupStatus);
router.post('/bootstrap-admin', createBootstrapAdmin);
router.post('/login', login);
router.get('/me', protect, me);

export default router;
