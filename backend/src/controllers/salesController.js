import db from '../config/db.js';
import { logActivity } from '../middleware/roleMiddleware.js';
const { Op } = db.Sequelize;

const generateInvoiceNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const random = Math.floor(Math.random() * 90000) + 10000;
    return `INV-${year}-${random}`;
};

const createSale = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const {
            customer_id, customer_name, customer_phone, items, tax_rate = 0, discount_type = 'fixed',
            discount_value = 0, payment_method = 'cash', amount_paid, due_date, notes
        } = req.body;

        if (!items || !items.length) {
            return res.status(400).json({ success: false, message: 'At least one item is required.' });
        }

        let subtotal = 0;
        const saleItems = [];

        for (const item of items) {
            const medicine = await db.Medicine.findOne({
                where: { id: item.medicine_id, is_active: true },
                transaction
            });

            if (!medicine) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: `Medicine ID ${item.medicine_id} not found.` });
            }
            if (medicine.quantity < item.quantity) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${medicine.name}. Available: ${medicine.quantity}`
                });
            }

            const finalSellingPrice = (item.selling_price !== undefined && item.selling_price !== null && item.selling_price !== '' && !isNaN(item.selling_price))
                ? parseFloat(item.selling_price)
                : parseFloat(medicine.selling_price);

            const itemSubtotal = finalSellingPrice * item.quantity;
            subtotal += itemSubtotal;
            saleItems.push({
                ...item,
                selling_price: finalSellingPrice,
                purchase_price: medicine.purchase_price,
                itemSubtotal
            });
        }

        const taxAmount = (subtotal * parseFloat(tax_rate)) / 100;
        let discountAmount = 0;
        if (discount_type === 'percentage') {
            discountAmount = (subtotal * parseFloat(discount_value)) / 100;
        } else {
            discountAmount = parseFloat(discount_value);
        }

        const totalAmount = subtotal + taxAmount - discountAmount;
        // Explicitly check for 0 or '0' to avoid defaulting to totalAmount
        const paidAmount = (amount_paid === 0 || amount_paid === '0') ? 0 : (amount_paid ? parseFloat(amount_paid) : totalAmount);
        const changeAmount = paidAmount - totalAmount;
        const paymentStatus = paidAmount >= totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';
        const effectivePaymentMethod = paymentStatus === 'unpaid' ? 'credit' : payment_method;

        const invoiceNumber = generateInvoiceNumber();

        const sale = await db.Sale.create({
            invoice_number: invoiceNumber,
            customer_id: customer_id || null,
            user_id: req.user.id,
            branch_id: req.user.branch_id || null,
            subtotal,
            tax_rate,
            tax_amount: taxAmount,
            discount_type,
            discount_value,
            discount_amount: discountAmount,
            total_amount: totalAmount,
            amount_paid: paidAmount,
            change_amount: changeAmount > 0 ? changeAmount : 0,
            payment_method: effectivePaymentMethod,
            payment_status: paymentStatus,
            notes: notes || null
        }, { transaction });

        for (const item of saleItems) {
            await db.SaleItem.create({
                sale_id: sale.id,
                medicine_id: item.medicine_id,
                quantity: item.quantity,
                purchase_price: item.purchase_price,
                selling_price: item.selling_price,
                subtotal: item.itemSubtotal
            }, { transaction });

            await db.Medicine.decrement('quantity', { by: item.quantity, where: { id: item.medicine_id }, transaction });
        }

        if (paymentStatus === 'unpaid' || paymentStatus === 'partial') {
            const debtBalance = totalAmount - paidAmount;
            if (debtBalance > 0 && (customer_id || customer_name)) {
                // If no due_date provided, default to 30 days from now
                let finalDueDate = due_date;
                if (!finalDueDate) {
                    const defaultDueDate = new Date();
                    defaultDueDate.setDate(defaultDueDate.getDate() + 30);
                    finalDueDate = defaultDueDate.toISOString().split('T')[0];
                }

                await db.Debt.create({
                    customer_id: customer_id || null,
                    customer_name: customer_name || null,
                    customer_phone: customer_phone || null,
                    sale_id: sale.id,
                    amount: totalAmount,
                    paid_amount: paidAmount,
                    balance: debtBalance,
                    due_date: finalDueDate,
                    payment_method: effectivePaymentMethod,
                    status: paymentStatus, // matches sale paymentStatus (pending or partial)
                    user_id: req.user.id
                }, { transaction });

                if (customer_id) {
                    await db.Customer.increment('outstanding_balance', { by: debtBalance, where: { id: customer_id }, transaction });
                }
            } else if (debtBalance > 0 && !customer_id && !customer_name) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'A customer name or ID is required for debt sales.' });
            }
        }

        await transaction.commit();
        await logActivity(req.user.id, 'create', 'sale', sale.id, null, { invoiceNumber, totalAmount }, req);

        res.status(201).json({
            success: true,
            message: 'Sale created successfully.',
            data: {
                id: sale.id,
                invoice_number: invoiceNumber,
                total_amount: totalAmount,
                change_amount: changeAmount > 0 ? changeAmount : 0,
                payment_status: paymentStatus
            }
        });
    } catch (err) {
        await transaction.rollback();
        next(err);
    }
};

const getSales = async (req, res, next) => {
    try {
        const { search, start_date, end_date, payment_method, status, page = 1, limit = 20 } = req.query;

        const where = {};
        if (start_date) where.created_at = { [Op.gte]: start_date };
        if (end_date) { where.created_at = { ...where.created_at, [Op.lte]: end_date }; }
        if (payment_method) where.payment_method = payment_method;
        if (status) where.status = status;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await db.Sale.findAndCountAll({
            where,
            include: [
                { model: db.Customer, as: 'customer', attributes: ['id', 'name'] },
                { model: db.User, as: 'user', attributes: ['id', 'name'] },
                {
                    model: db.SaleItem,
                    as: 'items',
                    include: [{ model: db.Medicine, as: 'medicine', attributes: ['id', 'name', 'unit', 'selling_price'] }]
                }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset,
            distinct: true // Required when including hasMany relations with count
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

const getSale = async (req, res, next) => {
    try {
        const sale = await db.Sale.findByPk(req.params.id, {
            include: [
                { model: db.Customer, as: 'customer', attributes: ['id', 'name', 'phone'] },
                { model: db.User, as: 'user', attributes: ['id', 'name'] }
            ]
        });

        if (!sale) return res.status(404).json({ success: false, message: 'Sale not found.' });

        const items = await db.SaleItem.findAll({
            where: { sale_id: req.params.id },
            include: [{ model: db.Medicine, as: 'medicine', attributes: ['id', 'name', 'barcode', 'unit', 'selling_price'] }]
        });

        res.json({ success: true, data: { ...sale.toJSON(), items } });
    } catch (err) {
        next(err);
    }
};

const refundSale = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const { items: refundItems, reason } = req.body;

        const sale = await db.Sale.findByPk(id, { transaction });
        if (!sale) return res.status(404).json({ success: false, message: 'Sale not found.' });
        if (sale.status === 'refunded') {
            return res.status(400).json({ success: false, message: 'Sale already refunded.' });
        }

        const itemsToRefund = refundItems || await db.SaleItem.findAll({ where: { sale_id: id }, transaction });

        for (const item of itemsToRefund) {
            await db.Medicine.increment('quantity', { by: item.quantity, where: { id: item.medicine_id }, transaction });
        }

        const notes = sale.notes ? `${sale.notes} | REFUND: ${reason || 'No reason provided'}` : `REFUND: ${reason || 'No reason provided'}`;
        await sale.update({ status: 'refunded', notes }, { transaction });

        await transaction.commit();
        await logActivity(req.user.id, 'refund', 'sale', id, null, { reason }, req);
        res.json({ success: true, message: 'Sale refunded successfully.' });
    } catch (err) {
        await transaction.rollback();
        next(err);
    }
};

const deleteSale = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const sale = await db.Sale.findByPk(req.params.id, { transaction });
        if (!sale) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Transaction not found.' });
        }

        // Restore medicine quantities before deleting
        const items = await db.SaleItem.findAll({ where: { sale_id: req.params.id }, transaction });
        for (const item of items) {
            await db.Medicine.increment('quantity', { by: item.quantity, where: { id: item.medicine_id }, transaction });
        }

        // Remove related debt if any
        await db.Debt.destroy({ where: { sale_id: req.params.id }, transaction });

        // Remove sale items then the sale itself
        await db.SaleItem.destroy({ where: { sale_id: req.params.id }, transaction });
        await sale.destroy({ transaction });

        await transaction.commit();
        res.json({ success: true, message: 'Transaction deleted successfully.' });
    } catch (err) {
        await transaction.rollback();
        next(err);
    }
};

const updateSale = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const {
            customer_id, customer_name, customer_phone, items, tax_rate = 0, discount_type = 'fixed',
            discount_value = 0, payment_method = 'cash', amount_paid, due_date, notes
        } = req.body;

        const sale = await db.Sale.findByPk(id, { transaction });
        if (!sale) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Transaction not found.' });
        }

        if (!items || !items.length) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'At least one item is required.' });
        }

        // Restore medicine quantities from the old sale items
        const oldItems = await db.SaleItem.findAll({ where: { sale_id: id }, transaction });
        for (const oldItem of oldItems) {
            await db.Medicine.increment('quantity', { by: oldItem.quantity, where: { id: oldItem.medicine_id }, transaction });
        }

        // Revert old debt if it existed
        const oldDebt = await db.Debt.findOne({ where: { sale_id: id }, transaction });
        if (oldDebt && sale.customer_id) {
            await db.Customer.decrement('outstanding_balance', { by: oldDebt.balance, where: { id: sale.customer_id }, transaction });
        }

        // Remove old SaleItems and Debt
        await db.SaleItem.destroy({ where: { sale_id: id }, transaction });
        await db.Debt.destroy({ where: { sale_id: id }, transaction });

        let subtotal = 0;
        const saleItems = [];

        for (const item of items) {
            const medicine = await db.Medicine.findOne({
                where: { id: item.medicine_id, is_active: true },
                transaction
            });

            if (!medicine) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: `Medicine ID ${item.medicine_id} not found.` });
            }
            if (medicine.quantity < item.quantity) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${medicine.name}. Available: ${medicine.quantity}`
                });
            }

            const finalSellingPrice = (item.selling_price !== undefined && item.selling_price !== null && item.selling_price !== '' && !isNaN(item.selling_price))
                ? parseFloat(item.selling_price)
                : parseFloat(medicine.selling_price);

            const itemSubtotal = finalSellingPrice * item.quantity;
            subtotal += itemSubtotal;
            saleItems.push({
                ...item,
                selling_price: finalSellingPrice,
                purchase_price: medicine.purchase_price,
                itemSubtotal
            });
        }

        const taxAmount = (subtotal * parseFloat(tax_rate)) / 100;
        let discountAmount = 0;
        if (discount_type === 'percentage') {
            discountAmount = (subtotal * parseFloat(discount_value)) / 100;
        } else {
            discountAmount = parseFloat(discount_value);
        }

        const totalAmount = subtotal + taxAmount - discountAmount;
        // Explicitly check for 0 or '0' to avoid defaulting to totalAmount
        const paidAmount = (amount_paid === 0 || amount_paid === '0') ? 0 : (amount_paid ? parseFloat(amount_paid) : totalAmount);
        const changeAmount = paidAmount - totalAmount;
        const paymentStatus = paidAmount >= totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';
        const effectivePaymentMethod = paymentStatus === 'unpaid' ? 'credit' : payment_method;

        await sale.update({
            customer_id: customer_id || null,
            subtotal,
            tax_rate,
            tax_amount: taxAmount,
            discount_type,
            discount_value,
            discount_amount: discountAmount,
            total_amount: totalAmount,
            amount_paid: paidAmount,
            change_amount: changeAmount > 0 ? changeAmount : 0,
            payment_method: effectivePaymentMethod,
            payment_status: paymentStatus,
            notes: notes || sale.notes
        }, { transaction });

        for (const item of saleItems) {
            await db.SaleItem.create({
                sale_id: sale.id,
                medicine_id: item.medicine_id,
                quantity: item.quantity,
                purchase_price: item.purchase_price,
                selling_price: item.selling_price,
                subtotal: item.itemSubtotal
            }, { transaction });

            await db.Medicine.decrement('quantity', { by: item.quantity, where: { id: item.medicine_id }, transaction });
        }

        if (paymentStatus === 'unpaid' || paymentStatus === 'partial') {
            const debtBalance = totalAmount - paidAmount;
            if (debtBalance > 0 && (customer_id || customer_name)) {
                // If no due_date provided, default to 30 days from now
                let finalDueDate = due_date;
                if (!finalDueDate) {
                    const defaultDueDate = new Date();
                    defaultDueDate.setDate(defaultDueDate.getDate() + 30);
                    finalDueDate = defaultDueDate.toISOString().split('T')[0];
                }

                await db.Debt.create({
                    customer_id: customer_id || null,
                    customer_name: customer_name || null,
                    customer_phone: customer_phone || null,
                    sale_id: sale.id,
                    amount: totalAmount,
                    paid_amount: paidAmount,
                    balance: debtBalance,
                    due_date: finalDueDate,
                    payment_method: effectivePaymentMethod,
                    status: paymentStatus, // matches sale paymentStatus (pending or partial)
                    user_id: req.user.id
                }, { transaction });

                if (customer_id) {
                    await db.Customer.increment('outstanding_balance', { by: debtBalance, where: { id: customer_id }, transaction });
                }
            } else if (debtBalance > 0 && !customer_id && !customer_name) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'A customer name or ID is required for debt sales.' });
            }
        }

        await transaction.commit();
        await logActivity(req.user.id, 'update', 'sale', sale.id, null, { invoiceNumber: sale.invoice_number, totalAmount }, req);

        res.json({
            success: true,
            message: 'Sale updated successfully.',
            data: {
                id: sale.id,
                invoice_number: sale.invoice_number,
                total_amount: totalAmount,
                change_amount: changeAmount > 0 ? changeAmount : 0,
                payment_status: paymentStatus
            }
        });
    } catch (err) {
        await transaction.rollback();
        next(err);
    }
};

export { createSale, getSales, getSale, updateSale, refundSale, deleteSale };