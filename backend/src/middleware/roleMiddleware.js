import db from '../config/db.js';

const logActivity = async (userId, action, entityType, entityId, oldValues, newValues, req) => {
    try {
        await db.ActivityLog.create({
            user_id: userId,
            action,
            entity_type: entityType,
            entity_id: entityId,
            old_values: oldValues ? JSON.stringify(oldValues) : null,
            new_values: newValues ? JSON.stringify(newValues) : null,
            ip_address: req?.ip || null,
            user_agent: req?.headers?.['user-agent'] || null
        });
    } catch (err) {
        console.error('Activity log error:', err.message);
    }
};

const authorize = (roles) => {
    if (!Array.isArray(roles)) roles = [roles];
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }
        const userRole = req.user.role_name;
        const permissions = req.user.permissions;

        if (userRole === 'admin' || (permissions && permissions.all)) {
            return next();
        }

        if (!roles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role: ${roles.join(' or ')}.`
            });
        }
        next();
    };
};

export { authorize, logActivity };