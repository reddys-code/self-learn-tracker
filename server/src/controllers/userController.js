import { createUser, listUsers, updateUser } from '../services/authService.js';
import { emitUsersUpdated } from '../config/socket.js';

export async function fetchUsers(_req, res, next) {
  try {
    const users = await listUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
}

export async function createManagedUser(req, res, next) {
  try {
    const user = await createUser({
      name: req.body?.name,
      email: req.body?.email,
      password: req.body?.password,
      role: req.body?.role,
      isActive: req.body?.isActive !== false,
      assignedCourseIds: Array.isArray(req.body?.assignedCourseIds) ? req.body.assignedCourseIds : [],
      createdBy: req.user?.id || null,
    });
    emitUsersUpdated({ type: 'created', userId: user.id });
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
}

export async function updateManagedUser(req, res, next) {
  try {
    const user = await updateUser(req.params.userId, req.body || {});
    emitUsersUpdated({ type: 'updated', userId: user.id });
    res.json(user);
  } catch (error) {
    next(error);
  }
}
