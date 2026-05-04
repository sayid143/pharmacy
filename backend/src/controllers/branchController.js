import db from '../config/db.js';
import { logActivity } from '../middleware/roleMiddleware.js';

const getBranches = async (req, res, next) => {
    try {
        const branches = await db.Branch.findAll({
            include: [
                {
                    model: db.User,
                    as: 'users',
                    attributes: []
                }
            ],
            attributes: {
                include: [
                    [db.sequelize.fn('COUNT', db.sequelize.col('users.id')), 'staff_count']
                ]
            },
            group: ['Branch.id'],
            order: [['name', 'ASC']]
        });
        res.json({ success: true, data: branches });
    } catch (err) {
        next(err);
    }
};

const createBranch = async (req, res, next) => {
    try {
        const { name, address, phone, email } = req.body;
        const branch = await db.Branch.create({
            name,
            address: address || null,
            phone: phone || null,
            email: email || null
        });

        await logActivity(req.user.id, 'create', 'branch', branch.id, null, req.body, req);
        res.status(201).json({ success: true, message: 'Branch added.', data: { id: branch.id } });
    } catch (err) {
        next(err);
    }
};

const updateBranch = async (req, res, next) => {
    try {
        const { id } = req.params;
        const branch = await db.Branch.findByPk(id);
        if (!branch) return res.status(404).json({ success: false, message: 'Branch not found.' });

        const { name, address, phone, email, is_active } = req.body;
        const oldValues = branch.toJSON();

        await branch.update({
            name,
            address: address || null,
            phone: phone || null,
            email: email || null,
            is_active: is_active !== undefined ? is_active : branch.is_active
        });

        await logActivity(req.user.id, 'update', 'branch', id, oldValues, req.body, req);
        res.json({ success: true, message: 'Branch updated.' });
    } catch (err) {
        next(err);
    }
};

export { getBranches, createBranch, updateBranch };
