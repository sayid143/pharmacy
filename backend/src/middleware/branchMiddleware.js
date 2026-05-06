import { tenantContext } from './tenantMiddleware.js';

export const branchMiddleware = (req, res, next) => {
    if (!req.user) return next();

    const currentContext = tenantContext.getStore();
    if (!currentContext) return next();

    // Check if user is Admin. Admins can see all branches.
    // Others are restricted to their assigned branch.
    const isAdmin = req.user.role_name === 'admin';
    const branchId = isAdmin ? null : req.user.branch_id;

    const newContext = {
        ...currentContext,
        branchId,
        isAdmin,
        userId: req.user.id
    };

    // Update the context for the rest of the request
    tenantContext.run(newContext, () => {
        next();
    });
};
