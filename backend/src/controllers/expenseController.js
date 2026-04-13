import db from '../config/db.js';
import { logActivity } from '../middleware/roleMiddleware.js';

const { Op } = db.Sequelize;

const getExpenses = async (req, res, next) => {
    try {
        const { category, start_date, end_date, branch_id, page = 1, limit = 20 } = req.query;

        const where = {};
        if (category) where.category = category;
        if (start_date) where.expense_date = { [Op.gte]: start_date };
        if (end_date) where.expense_date = { ...where.expense_date, [Op.lte]: end_date };
        if (branch_id) where.branch_id = branch_id;
        
        if (req.query.search) {
            const searchTerm = `%${req.query.search}%`;
            where[Op.or] = [
                { title: { [Op.like]: searchTerm } },
                { description: { [Op.like]: searchTerm } },
                { category: { [Op.like]: searchTerm } }
            ];
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await db.Expense.findAndCountAll({
            where,
            include: [
                { model: db.User, as: 'user', attributes: ['id', 'name'] },
                { model: db.Branch, as: 'branch', attributes: ['id', 'name'] }
            ],
            order: [['expense_date', 'DESC']],
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

const createExpense = async (req, res, next) => {
    try {
        const { title, category, amount, description, expense_date, branch_id, payment_method } = req.body;
        const receipt_image = req.file ? `/uploads/${req.file.filename}` : null;

        const expense = await db.Expense.create({
            title,
            category,
            amount,
            payment_method: payment_method || 'cash',
            description: description || null,
            receipt_image,
            branch_id: branch_id || req.user.branch_id || null,
            user_id: req.user.id,
            expense_date
        });

        await logActivity(req.user.id, 'create', 'expense', expense.id, null, req.body, req);
        res.status(201).json({ success: true, message: 'Expense recorded.', data: { id: expense.id } });
    } catch (err) {
        next(err);
    }
};

const updateExpense = async (req, res, next) => {
    try {
        const { id } = req.params;
        const expense = await db.Expense.findByPk(id);
        if (!expense) return res.status(404).json({ success: false, message: 'Expense not found.' });

        const { title, category, amount, description, expense_date, payment_method } = req.body;
        const oldValues = expense.toJSON();

        await expense.update({
            title,
            category,
            amount,
            payment_method: payment_method || expense.payment_method,
            description: description || null,
            expense_date
        });

        await logActivity(req.user.id, 'update', 'expense', id, oldValues, req.body, req);
        res.json({ success: true, message: 'Expense updated.' });
    } catch (err) {
        next(err);
    }
};

const deleteExpense = async (req, res, next) => {
    try {
        const expense = await db.Expense.findByPk(req.params.id);
        if (!expense) return res.status(404).json({ success: false, message: 'Expense not found.' });

        const oldValues = expense.toJSON();
        await expense.destroy();

        await logActivity(req.user.id, 'delete', 'expense', req.params.id, oldValues, null, req);
        res.json({ success: true, message: 'Expense deleted.' });
    } catch (err) {
        next(err);
    }
};

const getExpenseSummary = async (req, res, next) => {
    try {
        const { year = new Date().getFullYear() } = req.query;

        // Note: Using raw SQL for complex grouping if needed, but Sequelize can do most
        const monthly = await db.Expense.findAll({
            attributes: [
                [db.sequelize.fn('MONTH', db.sequelize.col('expense_date')), 'month'],
                [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
            ],
            where: db.sequelize.where(db.sequelize.fn('YEAR', db.sequelize.col('expense_date')), year),
            group: [db.sequelize.fn('MONTH', db.sequelize.col('expense_date'))],
            order: [[db.sequelize.fn('MONTH', db.sequelize.col('expense_date')), 'ASC']]
        });

        const byCategory = await db.Expense.findAll({
            attributes: [
                'category',
                [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total'],
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
            ],
            where: db.sequelize.where(db.sequelize.fn('YEAR', db.sequelize.col('expense_date')), year),
            group: ['category'],
            order: [[db.sequelize.fn('SUM', db.sequelize.col('amount')), 'DESC']]
        });

        const yearTotal = await db.Expense.sum('amount', {
            where: db.sequelize.where(db.sequelize.fn('YEAR', db.sequelize.col('expense_date')), year)
        });

        const today = new Date();
        const startOfTodayStr = today.toISOString().split('T')[0];
        
        const startOfWeekDate = new Date(today);
        startOfWeekDate.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Monday
        const startOfWeekStr = startOfWeekDate.toISOString().split('T')[0];

        const startOfMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfMonthStr = startOfMonthDate.toISOString().split('T')[0];

        const todayTotal = await db.Expense.sum('amount', {
            where: { expense_date: startOfTodayStr }
        });

        const weekTotal = await db.Expense.sum('amount', {
            where: { expense_date: { [Op.gte]: startOfWeekStr } }
        });

        const monthTotal = await db.Expense.sum('amount', {
            where: { expense_date: { [Op.gte]: startOfMonthStr } }
        });

        const overallTotal = await db.Expense.sum('amount');

        res.json({
            success: true,
            data: {
                monthly: monthly.map(m => m.toJSON()),
                by_category: byCategory.map(c => c.toJSON()),
                year_total: parseFloat(yearTotal) || 0,
                today_total: parseFloat(todayTotal) || 0,
                week_total: parseFloat(weekTotal) || 0,
                month_total: parseFloat(monthTotal) || 0,
                overall_total: parseFloat(overallTotal) || 0
            }
        });
    } catch (err) {
        next(err);
    }
};

export { getExpenses, createExpense, updateExpense, deleteExpense, getExpenseSummary };