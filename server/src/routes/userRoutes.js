import { Router } from 'express';
import { createManagedUser, fetchUsers, updateManagedUser } from '../controllers/userController.js';
import { adminOnly, protect } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect, adminOnly);
router.get('/', fetchUsers);
router.post('/', createManagedUser);
router.patch('/:userId', updateManagedUser);

export default router;
