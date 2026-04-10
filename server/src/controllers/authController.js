import { bootstrapAdmin, hasAnyUsers, verifyCredentials } from '../services/authService.js';
import { signAccessToken } from '../utils/auth.js';

export async function fetchSetupStatus(_req, res, next) {
  try {
    const usersExist = await hasAnyUsers();
    res.json({ needsSetup: !usersExist });
  } catch (error) {
    next(error);
  }
}

export async function createBootstrapAdmin(req, res, next) {
  try {
    const user = await bootstrapAdmin({
      name: req.body?.name,
      email: req.body?.email,
      password: req.body?.password,
    });

    const token = signAccessToken(user);
    res.status(201).json({ user, token });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const user = await verifyCredentials({
      email: req.body?.email,
      password: req.body?.password,
    });
    const token = signAccessToken(user);
    res.json({ user, token });
  } catch (error) {
    next(error);
  }
}

export async function me(req, res) {
  res.json({ user: req.user });
}
