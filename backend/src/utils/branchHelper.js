export const getBranchQueryFilter = (req, tableAlias) => {
    if (!req.user || req.user.role_name === 'admin' || !req.user.branch_id) {
        return '';
    }
    const alias = tableAlias ? `${tableAlias}.` : '';
    return ` AND ${alias}branch_id = ${req.user.branch_id}`;
};

export const getBranchWhereFilter = (req) => {
    if (!req.user || req.user.role_name === 'admin' || !req.user.branch_id) {
        return {};
    }
    return { branch_id: req.user.branch_id };
};
