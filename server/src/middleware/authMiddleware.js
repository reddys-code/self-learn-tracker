import { getUserById, sanitizeUser } from '../services/authService.js';
import { verifyAccessToken } from '../utils/auth.js';

function extractBearerToken(authorization = '') {
  if (!authorization || typeof authorization !== 'string') {
    return null;
  }
  const [scheme, token] = authorization.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }
  return token;
}

export async function protect(req, res, next) {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const payload = verifyAccessToken(token);
    const user = await getUserById(payload.sub);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User is inactive or does not exist.' });
    }

    req.user = sanitizeUser(user);
    req.tokenPayload = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

export function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  return next();
}
