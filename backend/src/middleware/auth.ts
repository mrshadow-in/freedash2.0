import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import User from '../models/User';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        role: string;
    };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, ENV.JWT_SECRET) as any;

        // Check if user is banned
        const user = await User.findById(decoded.id || decoded.userId);
        if (user?.isBanned) {
            return res.status(403).json({ message: 'User is banned' });
        }

        req.user = { userId: decoded.id || decoded.userId, role: decoded.role };
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid token' });
    }
};

export const requireRole = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }
        next();
    };
};

export const authorize = (role: string) => requireRole([role]);
