import db from '../config/db.js';
import { logActivity } from '../middleware/roleMiddleware.js';
import sendEmail from '../utils/sendEmail.js';

const { Op } = db.Sequelize;

const getDebts = async (req, res, next) => {
    try {
        const { status, customer_id, start_date, end_date, page = 1, limit = 20 } = req.query;

        const where = {};
        if (status) where.status = status;
        if (customer_id) where.customer_id = customer_id;

        if (start_date) where.created_at = { [Op.gte]: start_date };
        if (end_date) {
            where.created_at = { ...where.created_at, [Op.lte]: end_date };
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await db.Debt.findAndCountAll({
            where,
            include: [
                { model: db.Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'email'] },
                {
                    model: db.Sale,
                    as: 'sale',
                    attributes: ['id', 'invoice_number', 'total_amount', 'amount_paid', 'payment_status', 'payment_method', 'created_at'],
                    include: [
                        {
                            model: db.SaleItem,
                            as: 'items',
                            include: [{ model: db.Medicine, as: 'medicine', attributes: ['id', 'name'] }]
                        }
                    ]
                }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset,
            distinct: true
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

const recordPayment = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { debt_id, amount, payment_method = 'cash', reference_number, notes } = req.body;

        const debt = await db.Debt.findByPk(debt_id, { transaction });
        if (!debt) return res.status(404).json({ success: false, message: 'Debt not found.' });

        if (debt.status === 'paid') {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Debt already fully paid.' });
        }

        const paymentAmount = parseFloat(amount);
        if (paymentAmount > debt.balance) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: `Payment exceeds balance. Maximum: ${debt.balance}` });
        }

        const paymentData = {
            debt_id,
            amount: paymentAmount,
            payment_method,
            reference_number: reference_number || null,
            notes: notes || null,
            user_id: req.user.id
        };

        // Only include customer_id if it exists to avoid potential null constraint issues
        // if the database wasn't properly synced as nullable.
        if (debt.customer_id) {
            paymentData.customer_id = debt.customer_id;
        }

        const payment = await db.Payment.create(paymentData, { transaction });

        const newPaidAmount = parseFloat(debt.paid_amount) + paymentAmount;
        const newBalance = Math.max(parseFloat(debt.amount) - newPaidAmount, 0);
        const newStatus = newBalance <= 0 ? 'paid' : 'partial';

        await debt.update({
            paid_amount: newPaidAmount,
            balance: newBalance,
            status: newStatus,
            payment_method: payment_method // Update debt payment method to the latest one
        }, { transaction });

        if (debt.customer_id) {
            await db.Customer.decrement('outstanding_balance', {
                by: paymentAmount,
                where: { id: debt.customer_id },
                transaction
            });
        }

        // ✅ Synchronize with Sale record
        if (debt.sale_id) {
            const sale = await db.Sale.findByPk(debt.sale_id, { transaction });
            if (sale) {
                const updatedSalePaid = parseFloat(sale.amount_paid) + paymentAmount;
                const isNowFullyPaid = (parseFloat(sale.total_amount) - updatedSalePaid) <= 0.01;
                const updatedSaleStatus = isNowFullyPaid ? 'paid' : 'partial';

                const updateData = {
                    amount_paid: updatedSalePaid,
                    payment_status: updatedSaleStatus
                };

                // If it's now fully paid, or if it was marked as 'credit', replace with the actual payment method
                if (isNowFullyPaid || sale.payment_method === 'credit') {
                    updateData.payment_method = payment_method;
                }

                await sale.update(updateData, { transaction });
            }
        }

        await transaction.commit();
        await logActivity(req.user.id, 'payment', 'debt', debt_id, { balance: debt.balance }, { amount: paymentAmount }, req);

        res.json({
            success: true,
            message: 'Payment recorded successfully.',
            data: {
                payment_id: payment.id,
                new_balance: newBalance,
                status: newStatus
            }
        });
    } catch (err) {
        await transaction.rollback();
        next(err);
    }
};

const sendPaymentReminder = async (req, res, next) => {
    try {
        const { debt_id } = req.params;
        const debt = await db.Debt.findByPk(debt_id, {
            include: [{ model: db.Customer, as: 'customer', attributes: ['name', 'email'] }]
        });

        if (!debt) return res.status(404).json({ success: false, message: 'Debt not found.' });
        if (!debt.customer?.email) return res.status(400).json({ success: false, message: 'Customer has no email address.' });

        await sendEmail({
            to: debt.customer.email,
            subject: 'Payment Reminder - PharmaCare',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e40af, #059669); padding: 30px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">PharmaCare</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
            <h2>Payment Reminder</h2>
            <p>Dear <strong>${debt.customer.name}</strong>,</p>
            <p>This is a friendly reminder about your outstanding balance:</p>
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #1e40af;">
              <p><strong>Total Amount:</strong> $${parseFloat(debt.amount).toFixed(2)}</p>
              <p><strong>Amount Paid:</strong> $${parseFloat(debt.paid_amount).toFixed(2)}</p>
              <p><strong>Outstanding Balance:</strong> <span style="color: #dc2626; font-size: 1.2em;">${parseFloat(debt.balance).toFixed(2)}</span></p>
              <p><strong>Due Date:</strong> ${debt.due_date || 'Please contact us'}</p>
            </div>
            <p style="margin-top: 20px;">Please visit our pharmacy to make your payment at your earliest convenience.</p>
            <p>Thank you for your business!</p>
            <p><strong>PharmaCare Team</strong></p>
          </div>
        </div>
      `
        });

        res.json({ success: true, message: `Payment reminder sent to ${debt.customer.email}.` });
    } catch (err) {
        next(err);
    }
};

const getDebtSummary = async (req, res, next) => {
    try {
        const { start_date, end_date } = req.query;
        const where = {};

        if (start_date) where.created_at = { [Op.gte]: start_date };
        if (end_date) {
            where.created_at = { ...where.created_at, [Op.lte]: end_date };
        }

        const today = new Date().toISOString().split('T')[0];

        // 1. Total Debts (Number of debt records)
        const totalDebtsCount = await db.Debt.count({ where });

        // 2. Paid Debts (Total amount paid toward debts)
        const totalPaidAmount = await db.Debt.sum('paid_amount', { where }) || 0;

        // 3. Outstanding Debts (Total remaining unpaid amount)
        const totalOutstandingAmount = await db.Debt.sum('balance', { where }) || 0;

        // 4. Overdue Debts (Debts where due_date < today and status != paid)
        const overdueDebtsCount = await db.Debt.count({
            where: {
                ...where,
                due_date: { [Op.lt]: today },
                status: { [Op.ne]: 'paid' }
            }
        });

        res.json({
            success: true,
            data: {
                total_debts_count: totalDebtsCount,
                total_paid_amount: parseFloat(totalPaidAmount),
                total_outstanding_amount: parseFloat(totalOutstandingAmount),
                overdue_debts_count: overdueDebtsCount
            }
        });
    } catch (err) {
        next(err);
    }
};

const createDebt = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { customer_name, customer_phone, amount, paid_amount, payment_method = 'cash', due_date, notes } = req.body;

        const totalAmount = parseFloat(amount);
        const paidAmount = parseFloat(paid_amount || 0);
        const balance = Math.max(totalAmount - paidAmount, 0);
        const status = balance <= 0 ? 'paid' : (paidAmount > 0 ? 'partial' : 'pending');

        const debt = await db.Debt.create({
            customer_name,
            customer_phone,
            amount: totalAmount,
            paid_amount: paidAmount,
            balance: balance,
            payment_method,
            due_date: due_date || null,
            notes: notes || null,
            status: status,
            user_id: req.user.id
        }, { transaction });

        await transaction.commit();
        await logActivity(req.user.id, 'create', 'debt', debt.id, null, { amount: totalAmount }, req);

        res.status(201).json({
            success: true,
            message: 'Debt record created successfully.',
            data: debt
        });
    } catch (err) {
        await transaction.rollback();
        next(err);
    }
};

const deleteDebt = async (req, res, next) => {
    try {
        const { id } = req.params;
        const debt = await db.Debt.findByPk(id);

        if (!debt) {
            return res.status(404).json({ success: false, message: 'Debt record not found.' });
        }

        // If it's a customer-linked debt, we might want to decrement their outstanding balance
        // but only if it's NOT already paid? Actually, best to just delete the record if requested.
        // User asked to delete the record safely.

        await debt.destroy();

        await logActivity(req.user.id, 'delete', 'debt', id, { amount: debt.amount, balance: debt.balance }, null, req);

        res.json({
            success: true,
            message: 'Debt record deleted successfully.'
        });
    } catch (err) {
        next(err);
    }
};

export { getDebts, recordPayment, sendPaymentReminder, getDebtSummary, createDebt, deleteDebt };