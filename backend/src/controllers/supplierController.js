import db from '../config/db.js';
import { logActivity } from '../middleware/roleMiddleware.js';

const { Op } = db.Sequelize;

const getSuppliers = async (req, res, next) => {
    try {
        const { search, is_active, page = 1, limit = 20 } = req.query;
        const where = {};

        if (is_active !== undefined) {
            where.is_active = is_active === 'true';
        }

        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { contact_person: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } }
            ];
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await db.Supplier.findAndCountAll({
            where,
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

const getSupplier = async (req, res, next) => {
    try {
        const supplier = await db.Supplier.findByPk(req.params.id);
        if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found.' });

        res.json({ success: true, data: supplier });
    } catch (err) {
        next(err);
    }
};

const createSupplier = async (req, res, next) => {
    try {
        const { name, contact_person, email, phone, address, tax_number, payment_terms } = req.body;

        const supplier = await db.Supplier.create({
            name,
            contact_person: contact_person || null,
            email: email || null,
            phone: phone || null,
            address: address || null,
            tax_number: tax_number || null,
            payment_terms: payment_terms || 30
        });

        await logActivity(req.user.id, 'create', 'supplier', supplier.id, null, req.body, req);

        res.status(201).json({ success: true, message: 'Supplier added.', data: { id: supplier.id } });
    } catch (err) {
        next(err);
    }
};

const updateSupplier = async (req, res, next) => {
    try {
        const { id } = req.params;
        const supplier = await db.Supplier.findByPk(id);
        if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found.' });

        const { name, contact_person, email, phone, address, tax_number, payment_terms, is_active } = req.body;
        const oldValues = supplier.toJSON();

        await supplier.update({
            name,
            contact_person: contact_person || null,
            email: email || null,
            phone: phone || null,
            address: address || null,
            tax_number: tax_number || null,
            payment_terms: payment_terms || 30,
            is_active: is_active !== undefined ? is_active : supplier.is_active
        });

        await logActivity(req.user.id, 'update', 'supplier', id, oldValues, req.body, req);

        res.json({ success: true, message: 'Supplier updated.' });
    } catch (err) {
        next(err);
    }
};

const deleteSupplier = async (req, res, next) => {
    try {
        const supplier = await db.Supplier.findByPk(req.params.id);
        if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found.' });

        const oldValues = supplier.toJSON();
        await supplier.update({ is_active: false });

        await logActivity(req.user.id, 'delete', 'supplier', req.params.id, oldValues, null, req);

        res.json({ success: true, message: 'Supplier deactivated.' });
    } catch (err) {
        next(err);
    }
};

export { getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier };
