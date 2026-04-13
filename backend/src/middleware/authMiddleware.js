import { verifyToken } from '../config/jwt.js';
import db from '../config/db.js';
import logger from './logger.js';

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'No authentication token provided.' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        const user = await db.User.findOne({
            where: { id: decoded.id, is_active: true },
            include: [{ model: db.Role, as: 'role' }, { model: db.Branch, as: 'branch' }]
        });

        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found or account disabled.' });
        }

        const userData = user.toJSON();
        req.user = {
            ...userData,
            role_name: userData.role?.name,
            permissions: userData.role?.permissions
        };

        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Authentication token has expired.' });
        }
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: 'Invalid authentication token.' });
        }
        logger.error(`Auth error: ${err.message}`);
        return res.status(401).json({ success: false, message: 'Authentication failed.' });
    }
};

const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        const user = await db.User.findByPk(decoded.id, {
            include: [{ model: db.Role, as: 'role' }]
        });

        if (user) {
            const userData = user.toJSON();
            req.user = {
                ...userData,
                role_name: userData.role?.name,
                permissions: userData.role?.permissions
            };
        }
        next();
    } catch (err) {
        next();
    }
};

export { authenticate, optionalAuth };