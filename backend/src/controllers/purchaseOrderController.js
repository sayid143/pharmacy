import db from '../config/db.js';
import { logActivity } from '../middleware/roleMiddleware.js';

const { Op } = db.Sequelize;

const getPurchaseOrders = async (req, res, next) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const where = {};
        if (status) where.status = status;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await db.PurchaseOrder.findAndCountAll({
            where,
            include: [
                { model: db.Supplier, as: 'supplier', attributes: ['id', 'name'] },
                { model: db.User, as: 'user', attributes: ['id', 'name'] }
            ],
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

const getPurchaseOrder = async (req, res, next) => {
    try {
        const order = await db.PurchaseOrder.findByPk(req.params.id, {
            include: [
                { model: db.Supplier, as: 'supplier' },
                { model: db.User, as: 'user', attributes: ['id', 'name'] },
                {
                    model: db.PurchaseOrderItem,
                    as: 'items',
                    include: [{ model: db.Medicine, as: 'medicine', attributes: ['id', 'name', 'barcode'] }]
                }
            ]
        });

        if (!order) return res.status(404).json({ success: false, message: 'Purchase order not found.' });

        res.json({ success: true, data: order });
    } catch (err) {
        next(err);
    }
};

const createPurchaseOrder = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { supplier_id, items, expected_date, notes } = req.body;

        const year = new Date().getFullYear();
        const po_number = `PO-${year}-${Math.floor(Math.random() * 90000) + 10000}`;
        const totalAmount = items.reduce((sum, i) => sum + (parseFloat(i.quantity_ordered) * parseFloat(i.unit_price)), 0);

        const order = await db.PurchaseOrder.create({
            order_number: po_number,
            supplier_id,
            branch_id: req.user.branch_id || null,
            user_id: req.user.id,
            total_amount: totalAmount,
            expected_date: expected_date || null,
            notes: notes || null,
            status: 'pending'
        }, { transaction });

        for (const item of items) {
            const subtotal = parseFloat(item.quantity_ordered) * parseFloat(item.unit_price);
            await db.PurchaseOrderItem.create({
                purchase_order_id: order.id,
                medicine_id: item.medicine_id,
                quantity_ordered: item.quantity_ordered,
                unit_price: item.unit_price,
                subtotal: subtotal
            }, { transaction });
        }

        await transaction.commit();
        await logActivity(req.user.id, 'create', 'purchase_order', order.id, null, { po_number, totalAmount }, req);

        res.status(201).json({ success: true, message: 'Purchase order created.', data: { id: order.id, po_number } });
    } catch (err) {
        await transaction.rollback();
        next(err);
    }
};

const updatePurchaseOrderStatus = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const { status } = req.body;

        const order = await db.PurchaseOrder.findByPk(id, { transaction });
        if (!order) return res.status(404).json({ success: false, message: 'Purchase order not found.' });

        if (order.status === 'received' && status !== 'received') {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Cannot change status of a received order.' });
        }

        const oldStatus = order.status;
        await order.update({ status }, { transaction });

        if (status === 'received' && oldStatus !== 'received') {
            const items = await db.PurchaseOrderItem.findAll({ where: { purchase_order_id: id }, transaction });
            for (const item of items) {
                await db.Medicine.increment('quantity', {
                    by: item.quantity_ordered,
                    where: { id: item.medicine_id },
                    transaction
                });

                // Also update purchase price if it changed? Optional but good for "real" system
                await db.Medicine.update({ purchase_price: item.unit_price }, {
                    where: { id: item.medicine_id },
                    transaction
                });
            }
        }

        await transaction.commit();
        await logActivity(req.user.id, 'update_status', 'purchase_order', id, { oldStatus }, { status }, req);

        res.json({ success: true, message: 'Purchase order status updated.' });
    } catch (err) {
        await transaction.rollback();
        next(err);
    }
};

export { getPurchaseOrders, getPurchaseOrder, createPurchaseOrder, updatePurchaseOrderStatus };
