import { Op } from 'sequelize';
import db from '../config/db.js';
import { logActivity } from '../middleware/roleMiddleware.js';

const getMedicines = async (req, res, next) => {
    try {
        const {
            search, category_id, supplier_id, branch_id,
            low_stock, out_of_stock, expired, expiring_soon,
            page = 1, limit = 20
        } = req.query;

        const where = { is_active: true };

        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { generic_name: { [Op.like]: `%${search}%` } },
                { barcode: { [Op.like]: `%${search}%` } }
            ];
        }
        if (category_id) where.category_id = category_id;
        if (supplier_id) where.supplier_id = supplier_id;
        if (branch_id) where.branch_id = branch_id;
        
        if (low_stock === 'true') {
            where.quantity = { [Op.lte]: db.Sequelize.col('min_stock_level') };
            where.quantity[Op.gt] = 0;
        }
        if (out_of_stock === 'true') where.quantity = { [Op.lte]: 0 };
        
        const todayStr = new Date().toISOString().split('T')[0];

        if (expired === 'true') {
            where.expiry_date = { [Op.lte]: todayStr };
        }
        if (expiring_soon === 'true') {
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];
            where.expiry_date = {
                [Op.gt]: todayStr,
                [Op.lte]: thirtyDaysStr
            };
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await db.Medicine.findAndCountAll({
            where,
            include: [
                { model: db.Category, as: 'category', attributes: ['id', 'name'] },
                { model: db.Supplier, as: 'supplier', attributes: ['id', 'name'] },
                { model: db.Branch, as: 'branch', attributes: ['id', 'name'] }
            ],
            order: [['name', 'ASC']],
            limit: parseInt(limit),
            offset
        });

        const medicines = rows.map(m => {
            const med = m.toJSON();
            const daysToExpiry = Math.ceil((new Date(med.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
            let stockStatus = 'ok';
            if (med.quantity <= med.min_stock_level) stockStatus = 'low';
            else if (daysToExpiry <= 30) stockStatus = 'expiring';
            return { ...med, days_to_expiry: daysToExpiry, stock_status: stockStatus };
        });

        res.json({
            success: true,
            data: medicines,
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

const getMedicine = async (req, res, next) => {
    try {
        const medicine = await db.Medicine.findOne({
            where: { id: req.params.id, is_active: true },
            include: [
                { model: db.Category, as: 'category', attributes: ['id', 'name'] },
                { model: db.Supplier, as: 'supplier', attributes: ['id', 'name'] },
                { model: db.Branch, as: 'branch', attributes: ['id', 'name'] }
            ]
        });

        if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found.' });

        const med = medicine.toJSON();
        const daysToExpiry = Math.ceil((new Date(med.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
        res.json({ success: true, data: { ...med, days_to_expiry: daysToExpiry } });
    } catch (err) {
        next(err);
    }
};

const createMedicine = async (req, res, next) => {
    try {
        const {
            name, generic_name, category_id, supplier_id, branch_id,
            batch_number, expiry_date, purchase_price, selling_price,
            quantity, min_stock_level = 10, barcode, dosage_form,
            strength, unit = 'pcs', description, requires_prescription = false
        } = req.body;

        const image = req.file ? `/uploads/${req.file.filename}` : null;

        const medicine = await db.Medicine.create({
            name,
            generic_name: generic_name || null,
            category_id: category_id || null,
            supplier_id: supplier_id || null,
            branch_id: branch_id || req.user.branch_id || null,
            batch_number: batch_number || null,
            expiry_date,
            purchase_price,
            selling_price,
            quantity,
            min_stock_level,
            barcode: barcode || null,
            dosage_form: dosage_form || null,
            strength: strength || null,
            unit,
            image,
            description: description || null,
            requires_prescription
        });

        await logActivity(req.user.id, 'create', 'medicine', medicine.id, null, req.body, req);

        res.status(201).json({
            success: true,
            message: 'Medicine added successfully.',
            data: { id: medicine.id }
        });
    } catch (err) {
        next(err);
    }
};

const updateMedicine = async (req, res, next) => {
    try {
        const { id } = req.params;
        const medicine = await db.Medicine.findOne({ where: { id, is_active: true } });

        if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found.' });

        const {
            name, generic_name, category_id, supplier_id, batch_number,
            expiry_date, purchase_price, selling_price, quantity, min_stock_level,
            barcode, dosage_form, strength, unit, description, requires_prescription
        } = req.body;

        const image = req.file ? `/uploads/${req.file.filename}` : medicine.image;

        await medicine.update({
            name,
            generic_name: generic_name || null,
            category_id: category_id || null,
            supplier_id: supplier_id || null,
            batch_number: batch_number || null,
            expiry_date,
            purchase_price,
            selling_price,
            quantity,
            min_stock_level,
            barcode: barcode || null,
            dosage_form: dosage_form || null,
            strength: strength || null,
            unit,
            image,
            description: description || null,
            requires_prescription
        });

        await logActivity(req.user.id, 'update', 'medicine', id, medicine.previous(), req.body, req);

        res.json({ success: true, message: 'Medicine updated successfully.' });
    } catch (err) {
        next(err);
    }
};

const deleteMedicine = async (req, res, next) => {
    try {
        const { id } = req.params;
        const medicine = await db.Medicine.findOne({ where: { id, is_active: true } });

        if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found.' });

        await medicine.update({ is_active: false });
        await logActivity(req.user.id, 'delete', 'medicine', id, medicine.toJSON(), null, req);

        res.json({ success: true, message: 'Medicine deleted successfully.' });
    } catch (err) {
        next(err);
    }
};

const getMedicineByBarcode = async (req, res, next) => {
    try {
        const medicine = await db.Medicine.findOne({
            where: { barcode: req.params.barcode, is_active: true },
            include: [{ model: db.Category, as: 'category', attributes: ['id', 'name'] }]
        });

        if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found.' });
        res.json({ success: true, data: medicine });
    } catch (err) {
        next(err);
    }
};

const getStats = async (req, res, next) => {
    try {
        const total = await db.Medicine.count({ where: { is_active: true } });
        const outOfStock = await db.Medicine.count({ where: { is_active: true, quantity: { [Op.lte]: 0 } } });
        const inStock = await db.Medicine.count({
            where: {
                is_active: true,
                quantity: { [Op.gt]: 0 }
            }
        });
        const lowStock = await db.Medicine.count({
            where: {
                is_active: true,
                quantity: {
                    [Op.lte]: db.Sequelize.col('min_stock_level'),
                    [Op.gt]: 0
                }
            }
        });
        const todayStr = new Date().toISOString().split('T')[0];
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];

        const expired = await db.Medicine.count({
            where: {
                is_active: true,
                expiry_date: { [Op.lte]: todayStr }
            }
        });
        const expiringSoon = await db.Medicine.count({
            where: {
                is_active: true,
                expiry_date: {
                    [Op.gt]: todayStr,
                    [Op.lte]: thirtyDaysStr
                }
            }
        });

        res.json({
            success: true,
            data: { total, inStock, lowStock, outOfStock, expired, expiringSoon }
        });
    } catch (err) {
        next(err);
    }
};

export { getMedicines, getMedicine, createMedicine, updateMedicine, deleteMedicine, getMedicineByBarcode, getStats };