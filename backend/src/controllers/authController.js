import bcrypt from 'bcrypt';
import db from '../config/db.js';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../config/jwt.js';
import { logActivity } from '../middleware/roleMiddleware.js';
import logger from '../middleware/logger.js';

const register = async (req, res, next) => {
    try {
        const { name, email, password, role_id, branch_id, phone } = req.body;

        const existing = await db.User.findOne({ where: { email } });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'Email already registered.'
            });
        }

        const user = await db.User.create({
            name,
            email,
            password,
            role_id: role_id || 3,
            branch_id: branch_id || null,
            phone: phone || null
        });

        await logActivity(user.id, 'register', 'user', user.id, null, { name, email }, req);

        res.status(201).json({
            success: true,
            message: 'User registered successfully.',
            data: { id: user.id, name, email }
        });
    } catch (err) {
        logger.error(`Registration error: ${err.message}`);
        next(err);
    }
};

const login = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        const user = await db.User.findOne({
            where: {
                [db.Sequelize.Op.or]: [
                    { name: username },
                    { email: username }
                ],
                is_active: true
            },
            include: [
                { model: db.Role, as: 'role' },
                { model: db.Branch, as: 'branch' }
            ]
        });

        if (!user) {
            logger.warn(`Login attempt failed: User not found or inactive - ${username}`);
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password.'
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            logger.warn(`Login attempt failed: Invalid password for user - ${username}`);
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password.'
            });
        }

        const tokenPayload = {
            id: user.id,
            name: user.name,
            role: user.role?.name,
            branch_id: user.branch_id
        };

        const token = generateToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        await user.update({ last_login: new Date() });
        await logActivity(user.id, 'login', 'user', user.id, null, null, req);

        const userData = user.get({ plain: true });
        delete userData.password;

        res.json({
            success: true,
            message: 'Login successful.',
            data: {
                token,
                refreshToken,
                user: {
                    ...userData,
                    role_name: userData.role?.name,
                    permissions: userData.role?.permissions
                }
            }
        });
    } catch (err) {
        logger.error(`Login error: ${err.message}`);
        next(err);
    }
};

const getProfile = async (req, res, next) => {
    try {
        const user = await db.User.findByPk(req.user.id, {
            include: [
                { model: db.Role, as: 'role' },
                { model: db.Branch, as: 'branch' }
            ],
            attributes: { exclude: ['password'] }
        });

        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        const userData = user.toJSON();
        res.json({
            success: true,
            data: {
                ...userData,
                role_name: userData.role?.name,
                branch_name: userData.branch?.name
            }
        });
    } catch (err) {
        next(err);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const { name, phone } = req.body;
        const avatar = req.file ? `/uploads/${req.file.filename}` : undefined;

        const user = await db.User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        const updateData = {};
        if (name) updateData.name = name;
        if (phone) updateData.phone = phone;
        if (avatar) updateData.avatar = avatar;

        await user.update(updateData);

        res.json({ success: true, message: 'Profile updated successfully.' });
    } catch (err) {
        next(err);
    }
};

const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await db.User.findByPk(req.user.id);

        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) return res.status(400).json({ success: false, message: 'Current password is incorrect.' });

        user.password = newPassword; // Handled by Sequelize beforeSave hook or hashed manually
        await user.save();

        await logActivity(req.user.id, 'change_password', 'user', req.user.id, null, null, req);
        res.json({ success: true, message: 'Password changed successfully.' });
    } catch (err) {
        next(err);
    }
};

const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken: token } = req.body;
        if (!token) return res.status(400).json({ success: false, message: 'Refresh token required.' });

        const decoded = verifyRefreshToken(token);
        const user = await db.User.findOne({
            where: { id: decoded.id, is_active: true },
            include: [{ model: db.Role, as: 'role' }]
        });

        if (!user) return res.status(401).json({ success: false, message: 'User not found.' });

        const newToken = generateToken({ id: user.id, name: user.name, role: user.role?.name });

        res.json({ success: true, data: { token: newToken } });
    } catch (err) {
        next(err);
    }
};

const getRegistrationRoles = async (req, res, next) => {
    try {
        const roles = await db.Role.findAll({
            order: [['id', 'ASC']]
        });
        res.json({ success: true, data: roles });
    } catch (err) {
        next(err);
    }
};

export { register, login, getProfile, updateProfile, changePassword, refreshToken, getRegistrationRoles };