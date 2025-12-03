import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { createError } from './errorHandler';
import { config } from '../config/config';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw createError('Access token required', 401);
    }

    // Verify token with user service
    try {
      const response = await axios.get(`${config.services.userServiceUrl}/api/users/profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      req.user = response.data.user;
      next();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw createError('Invalid token', 401);
      }
      throw createError('Authentication failed', 401);
    }
  } catch (error) {
    next(error);
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(createError('Authentication required', 401));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(createError('Insufficient permissions', 403));
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole(['admin']);
export const requireEditor = requireRole(['admin', 'editor']);
export const requireAuthor = requireRole(['admin', 'editor', 'author']);
