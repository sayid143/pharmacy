import db from '../config/db.js';
import { logActivity } from '../middleware/roleMiddleware.js';

const { Op } = db.Sequelize;

const getCustomers = async (req, res, next) => {
    try {
        const { search, page = 1, limit = 20 } = req.query;
        const where = { is_active: true };

        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { phone: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } }
            ];
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await db.Customer.findAndCountAll({
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

const getCustomer = async (req, res, next) => {
    try {
        const customer = await db.Customer.findByPk(req.params.id);
        if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

        const history = await db.Sale.findAll({
            where: { customer_id: req.params.id },
            attributes: ['id', 'invoice_number', 'total_amount', 'payment_status', 'created_at'],
            order: [['created_at', 'DESC']],
            limit: 10
        });

        res.json({ success: true, data: { ...customer.toJSON(), sale_history: history } });
    } catch (err) {
        next(err);
    }
};

const createCustomer = async (req, res, next) => {
    try {
        const { name, email, phone, address, date_of_birth, gender, insurance_number, credit_limit } = req.body;

        const customer = await db.Customer.create({
            name,
            email: email || null,
            phone: phone || null,
            address: address || null,
            date_of_birth: date_of_birth || null,
            gender: gender || null,
            insurance_number: insurance_number || null,
            credit_limit: credit_limit || 0
        });

        await logActivity(req.user.id, 'create', 'customer', customer.id, null, req.body, req);

        res.status(201).json({ success: true, message: 'Customer added.', data: { id: customer.id } });
    } catch (err) {
        next(err);
    }
};

const updateCustomer = async (req, res, next) => {
    try {
        const { id } = req.params;
        const customer = await db.Customer.findByPk(id);
        if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

        const { name, email, phone, address, credit_limit, is_active } = req.body;
        const oldValues = customer.toJSON();

        await customer.update({
            name,
            email: email || null,
            phone: phone || null,
            address: address || null,
            credit_limit: credit_limit || 0,
            is_active: is_active !== undefined ? is_active : customer.is_active
        });

        await logActivity(req.user.id, 'update', 'customer', id, oldValues, req.body, req);

        res.json({ success: true, message: 'Customer updated.' });
    } catch (err) {
        next(err);
    }
};

const deleteCustomer = async (req, res, next) => {
    try {
        const customer = await db.Customer.findByPk(req.params.id);
        if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

        const oldValues = customer.toJSON();
        await customer.update({ is_active: false });

        await logActivity(req.user.id, 'delete', 'customer', req.params.id, oldValues, null, req);

        res.json({ success: true, message: 'Customer deactivated successfully.' });
    } catch (err) {
        next(err);
    }
};

export { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer };
