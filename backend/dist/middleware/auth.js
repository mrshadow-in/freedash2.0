"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.requireRole = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const User_1 = __importDefault(require("../models/User"));
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.ENV.JWT_SECRET);
        // Check if user is banned
        const user = await User_1.default.findById(decoded.id || decoded.userId);
        if (user?.isBanned) {
            return res.status(403).json({ message: 'User is banned' });
        }
        req.user = { userId: decoded.id || decoded.userId, role: decoded.role };
        next();
    }
    catch (error) {
        return res.status(403).json({ message: 'Invalid token' });
    }
};
exports.authenticate = authenticate;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }
        next();
    };
};
exports.requireRole = requireRole;
const authorize = (role) => (0, exports.requireRole)([role]);
exports.authorize = authorize;
