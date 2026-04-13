import bcrypt from 'bcrypt';
import db from '../config/db.js';
import { logActivity } from '../middleware/roleMiddleware.js';
const { Op } = db.Sequelize;

const getUsers = async (req, res, next) => {
    try {
        const { search, role_id, branch_id, page = 1, limit = 20 } = req.query;
        
        const where = {};
        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } }
            ];
        }
        if (role_id) where.role_id = role_id;
        if (branch_id) where.branch_id = branch_id;
        where.id = { [Op.ne]: req.user.id };

        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        const { count, rows } = await db.User.findAndCountAll({
            where,
            include: [
                { model: db.Role, as: 'role', attributes: ['id', 'name'] },
                { model: db.Branch, as: 'branch', attributes: ['id', 'name'] }
            ],
            attributes: { exclude: ['password'] },
            order: [['name', 'ASC']],
            limit: parseInt(limit),
            offset
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (err) {
        next(err);
    }
};

const createUser = async (req, res, next) => {
    try {
        const { name, email, password, role_id, branch_id, phone } = req.body;
        
        const existing = await db.User.findOne({ where: { email } });
        if (existing) return res.status(409).json({ success: false, message: 'Email already exists.' });

        const user = await db.User.create({
            name,
            email,
            password,
            role_id,
            branch_id: branch_id || null,
            phone: phone || null
        });

        await logActivity(req.user.id, 'create', 'user', user.id, null, { name, email, role_id }, req);
        res.status(201).json({ success: true, message: 'User created.', data: { id: user.id } });
    } catch (err) {
        next(err);
    }
};

const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, email, role_id, branch_id, phone, is_active } = req.body;

        const user = await db.User.findByPk(id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        await user.update({
            name,
            email,
            role_id,
            branch_id: branch_id || null,
            phone: phone || null,
            is_active: is_active !== undefined ? is_active : user.is_active
        });

        await logActivity(req.user.id, 'update', 'user', id, user.previous(), req.body, req);
        res.json({ success: true, message: 'User updated.' });
    } catch (err) {
        next(err);
    }
};

const resetUserPassword = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        const user = await db.User.findByPk(id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        user.password = newPassword;
        await user.save();

        await logActivity(req.user.id, 'reset_password', 'user', id, null, null, req);
        res.json({ success: true, message: 'Password reset successfully.' });
    } catch (err) {
        next(err);
    }
};

const getActivityLogs = async (req, res, next) => {
    try {
        const { user_id, action, page = 1, limit = 50 } = req.query;
        
        const where = {};
        if (user_id) where.user_id = user_id;
        if (action) where.action = action;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        const { count, rows } = await db.ActivityLog.findAndCountAll({
            where,
            include: [{ model: db.User, as: 'user', attributes: ['id', 'name'] }],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (err) {
        next(err);
    }
};

const getRoles = async (req, res, next) => {
    try {
        const roles = await db.Role.findAll({ order: [['id', 'ASC']] });
        res.json({ success: true, data: roles });
    } catch (err) {
        next(err);
    }
};

export { getUsers, createUser, updateUser, resetUserPassword, getActivityLogs, getRoles };