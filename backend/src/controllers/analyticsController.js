import db from '../config/db.js';
import logger from '../middleware/logger.js';

const { QueryTypes, Op } = db.Sequelize;

const getDashboard = async (req, res, next) => {
    try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        const tzStart = startOfToday.toISOString();
        const tzEnd = endOfToday.toISOString();

        const monthStartObj = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        monthStartObj.setHours(0, 0, 0, 0);
        const tzMonthStart = monthStartObj.toISOString();

        let todaySales;
        try {
            const [results] = await db.sequelize.query(
                `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue,
                  COALESCE(SUM(si.profit), 0) as profit
           FROM sales s
           LEFT JOIN (SELECT sale_id, SUM((selling_price - purchase_price) * quantity) as profit FROM sale_items GROUP BY sale_id) si ON s.id = si.sale_id
           WHERE s.created_at >= ? AND s.created_at <= ? AND s.status = 'completed'`,
                { replacements: [tzStart, tzEnd], type: QueryTypes.SELECT }
            );
            todaySales = results;
        } catch (e) {
            logger.error(`[Dashboard] todaySales query failed: ${e.message}`);
            throw e;
        }

        let monthlySales;
        try {
            const [results] = await db.sequelize.query(
                `SELECT COALESCE(SUM(total_amount), 0) as revenue, COUNT(*) as count
           FROM sales WHERE created_at >= ? AND status = 'completed'`,
                { replacements: [tzMonthStart], type: QueryTypes.SELECT }
            );
            monthlySales = results;
        } catch (e) {
            logger.error(`[Dashboard] monthlySales query failed: ${e.message}`);
            throw e;
        }

        const [lowStock] = await db.sequelize.query(
            `SELECT COUNT(*) as count FROM medicines WHERE quantity <= min_stock_level AND is_active = TRUE`,
            { type: QueryTypes.SELECT }
        );

        const [expiringSoon] = await db.sequelize.query(
            `SELECT COUNT(*) as count FROM medicines WHERE expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND expiry_date > CURDATE() AND is_active = TRUE`,
            { type: QueryTypes.SELECT }
        );

        const [debts] = await db.sequelize.query(
            `SELECT COUNT(*) as count, COALESCE(SUM(balance), 0) as total FROM debts WHERE status IN ('pending', 'partial', 'overdue')`,
            { type: QueryTypes.SELECT }
        );

        const [todayDebts] = await db.sequelize.query(
            `SELECT COALESCE(SUM(balance), 0) as total FROM debts WHERE created_at >= ? AND created_at <= ?`,
            { replacements: [tzStart, tzEnd], type: QueryTypes.SELECT }
        );

        const totalMedicines = await db.Medicine.count({ where: { is_active: true } });
        const outOfStock = await db.Medicine.count({ where: { is_active: true, quantity: 0 } });
        const inStock = await db.Medicine.count({
            where: {
                is_active: true,
                quantity: { [db.Sequelize.Op.gt]: 0 }
            }
        });
        const totalCustomers = await db.Customer.count({ where: { is_active: true } });

        const topMedicines = await db.sequelize.query(
            `SELECT m.name, SUM(si.quantity) as total_qty, SUM(si.subtotal) as revenue
       FROM sale_items si
       JOIN medicines m ON si.medicine_id = m.id
       JOIN sales s ON si.sale_id = s.id
       WHERE DATE(s.created_at) >= ? AND s.status = 'completed'
       GROUP BY m.id, m.name
       ORDER BY total_qty DESC
       LIMIT 5`,
            { replacements: [tzMonthStart], type: QueryTypes.SELECT }
        );

        const weeklyTrend = await db.sequelize.query(
            `SELECT DATE(created_at) as date, COALESCE(SUM(total_amount), 0) as revenue, COUNT(*) as transactions
       FROM sales
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND status = 'completed'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
            { type: QueryTypes.SELECT }
        );

        const monthlyTrend = await db.sequelize.query(
            `SELECT DATE_FORMAT(created_at, '%Y-%m') as month,
              COALESCE(SUM(total_amount), 0) as revenue,
              COUNT(*) as transactions
       FROM sales WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH) AND status = 'completed'
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY month ASC`,
            { type: QueryTypes.SELECT }
        );

        const recentSales = await db.sequelize.query(
            `SELECT s.id, s.invoice_number, s.total_amount, s.payment_method, s.payment_status,
               s.created_at, c.name as customer_name
        FROM sales s LEFT JOIN customers c ON s.customer_id = c.id
        ORDER BY s.created_at DESC LIMIT 5`,
            { type: QueryTypes.SELECT }
        );

        const stockAlerts = await db.sequelize.query(
            `SELECT id, name, quantity, min_stock_level, expiry_date,
               DATEDIFF(expiry_date, CURDATE()) as days_to_expiry
        FROM medicines
        WHERE (quantity <= min_stock_level OR expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY))
          AND is_active = TRUE
        ORDER BY quantity ASC LIMIT 8`,
            { type: QueryTypes.SELECT }
        );

        let monthlyExpenses;
        try {
            const [results] = await db.sequelize.query(
                `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE DATE(expense_date) >= ?`,
                { replacements: [tzMonthStart], type: QueryTypes.SELECT }
            );
            monthlyExpenses = results;
        } catch (e) {
            logger.error(`[Dashboard] monthlyExpenses query failed: ${e.message}`);
            throw e;
        }

        let totalStats;
        try {
            const [results] = await db.sequelize.query(
                `    SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue,
                      COALESCE(SUM(si.profit), 0) as profit
               FROM sales s
               LEFT JOIN (SELECT sale_id, SUM((selling_price - purchase_price) * quantity) as profit FROM sale_items GROUP BY sale_id) si ON s.id = si.sale_id
               WHERE s.status = 'completed'`,
                { type: QueryTypes.SELECT }
            );
            totalStats = results;
        } catch (e) {
            logger.error(`[Dashboard] totalStats query failed: ${e.message}`);
            throw e;
        }

        res.json({
            success: true,
            data: {
                summary: {
                    today_revenue: parseFloat(todaySales?.revenue || 0),
                    today_profit: parseFloat(todaySales?.profit || 0),
                    today_transactions: todaySales?.count || 0,
                    total_sales_count: totalStats?.count || 0,
                    total_profit_amount: parseFloat(totalStats?.profit || 0),
                    monthly_revenue: parseFloat(monthlySales?.revenue || 0),
                    monthly_transactions: monthlySales?.count || 0,
                    monthly_expenses: parseFloat(monthlyExpenses?.total || 0),
                    monthly_profit: parseFloat(monthlySales?.revenue || 0) - parseFloat(monthlyExpenses?.total || 0),
                    low_stock_count: lowStock?.count || 0,
                    expiring_soon_count: expiringSoon?.count || 0,
                    outstanding_debts: debts?.count || 0,
                    outstanding_debt_amount: parseFloat(debts?.total || 0),
                    today_debt_amount: parseFloat(todayDebts?.total || 0),
                    total_medicines: totalMedicines,
                    in_stock_count: inStock,
                    out_of_stock_count: outOfStock,
                    total_customers: totalCustomers
                },
                top_medicines: topMedicines,
                weekly_trend: weeklyTrend,
                monthly_trend: monthlyTrend,
                recent_sales: recentSales,
                stock_alerts: stockAlerts
            }
        });
    } catch (err) {
        next(err);
    }
};

const getMonthlyReport = async (req, res, next) => {
    try {
        const { year = new Date().getFullYear(), month } = req.query;

        let dateFilter = 'YEAR(created_at) = ?';
        const replacements = [year];
        if (month) {
            dateFilter += ' AND MONTH(created_at) = ?';
            replacements.push(month);
        }

        const dailySales = await db.sequelize.query(
            `SELECT DATE(created_at) as date, COUNT(*) as transactions,
              SUM(total_amount) as revenue, SUM(tax_amount) as tax,
              SUM(discount_amount) as discounts
       FROM sales WHERE ${dateFilter} AND status = 'completed'
       GROUP BY DATE(created_at) ORDER BY date ASC`,
            { replacements, type: QueryTypes.SELECT }
        );

        const paymentBreakdown = await db.sequelize.query(
            `SELECT payment_method, COUNT(*) as count, SUM(total_amount) as total
       FROM sales WHERE ${dateFilter} AND status = 'completed'
       GROUP BY payment_method`,
            { replacements, type: QueryTypes.SELECT }
        );

        const categoryRevenue = await db.sequelize.query(
            `SELECT c.name as category, SUM(si.subtotal) as revenue, SUM(si.quantity) as quantity
       FROM sale_items si
       JOIN medicines m ON si.medicine_id = m.id
       JOIN categories c ON m.category_id = c.id
       JOIN sales s ON si.sale_id = s.id
       WHERE YEAR(s.created_at) = ? AND status = 'completed'
       ${month ? 'AND MONTH(s.created_at) = ?' : ''}
       GROUP BY c.id, c.name ORDER BY revenue DESC`,
            { replacements: month ? [year, month] : [year], type: QueryTypes.SELECT }
        );

        const expenses = await db.sequelize.query(
            `SELECT category, SUM(amount) as total
       FROM expenses WHERE YEAR(expense_date) = ?
       ${month ? 'AND MONTH(expense_date) = ?' : ''}
       GROUP BY category`,
            { replacements: month ? [year, month] : [year], type: QueryTypes.SELECT }
        );

        res.json({ success: true, data: { daily_sales: dailySales, payment_breakdown: paymentBreakdown, category_revenue: categoryRevenue, expenses } });
    } catch (err) {
        next(err);
    }
};

const getProfitLoss = async (req, res, next) => {
    try {
        const { start_date, end_date } = req.query;
        const start = start_date || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        const end = end_date || new Date().toISOString().split('T')[0];

        const [revenue] = await db.sequelize.query(
            `SELECT COALESCE(SUM(s.total_amount), 0) as total_revenue,
              COALESCE(SUM(si.profit), 0) as gross_profit
       FROM sales s
       LEFT JOIN (SELECT sale_id, SUM((selling_price - purchase_price) * quantity) as profit FROM sale_items GROUP BY sale_id) si ON s.id = si.sale_id
       WHERE DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed'`,
            { replacements: [start, end], type: QueryTypes.SELECT }
        );

        const [expenses] = await db.sequelize.query(
            `SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expenses WHERE expense_date BETWEEN ? AND ?`,
            { replacements: [start, end], type: QueryTypes.SELECT }
        );

        const grossProfitVal = parseFloat(revenue?.gross_profit || 0);
        const totalRevenueVal = parseFloat(revenue?.total_revenue || 0);
        const totalExpensesVal = parseFloat(expenses?.total_expenses || 0);
        const netProfit = grossProfitVal - totalExpensesVal;
        const margin = totalRevenueVal > 0 ? (netProfit / totalRevenueVal) * 100 : 0;

        res.json({
            success: true,
            data: {
                period: { start, end },
                total_revenue: totalRevenueVal,
                gross_profit: grossProfitVal,
                total_expenses: totalExpensesVal,
                net_profit: netProfit,
                profit_margin: Math.round(margin * 100) / 100
            }
        });
    } catch (err) {
        next(err);
    }
};

const getReports = async (req, res, next) => {
    try {
        const { type = 'monthly', startDate, endDate, branch_id } = req.query;
        let whereSales = { status: 'completed' };
        let whereExpenses = {};

        if (branch_id) {
            whereSales.branch_id = branch_id;
            whereExpenses.branch_id = branch_id;
        }

        if (type === 'custom' && startDate && endDate) {
            whereSales.created_at = { [Op.between]: [new Date(startDate), new Date(endDate)] };
            whereExpenses.expense_date = { [Op.between]: [startDate, endDate] };
        } else if (type === 'daily') {
            const today = new Date().toISOString().split('T')[0];
            whereSales.created_at = { [Op.gte]: today };
            whereExpenses.expense_date = today;
        } else if (type === 'weekly') {
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            whereSales.created_at = { [Op.gte]: lastWeek };
            whereExpenses.expense_date = { [Op.gte]: lastWeek.toISOString().split('T')[0] };
        } else {
            // Default to monthly (current month)
            const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            whereSales.created_at = { [Op.gte]: monthStart };
            whereExpenses.expense_date = { [Op.gte]: monthStart.toISOString().split('T')[0] };
        }

        const sales = await db.Sale.findAll({
            where: whereSales,
            attributes: [
                [db.sequelize.fn('DATE', db.sequelize.col('created_at')), 'date'],
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
                [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'revenue'],
                [db.sequelize.fn('SUM', db.sequelize.col('tax_amount')), 'tax'],
                [db.sequelize.fn('SUM', db.sequelize.col('discount_amount')), 'discounts']
            ],
            group: [db.sequelize.fn('DATE', db.sequelize.col('created_at'))],
            order: [[db.sequelize.fn('DATE', db.sequelize.col('created_at')), 'ASC']]
        });

        const expenses = await db.Expense.findAll({
            where: whereExpenses,
            attributes: [
                'category',
                [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
            ],
            group: ['category']
        });

        const topProducts = await db.sequelize.query(
            `SELECT m.name, SUM(si.quantity) as qty, SUM(si.subtotal) as revenue
             FROM sale_items si
             JOIN medicines m ON si.medicine_id = m.id
             JOIN sales s ON si.sale_id = s.id
             WHERE s.status = 'completed' AND s.created_at ${type === 'custom' ? 'BETWEEN ? AND ?' : '>= ?'}
             GROUP BY m.id, m.name
             ORDER BY revenue DESC LIMIT 10`,
            {
                replacements: type === 'custom' ? [startDate, endDate] : [whereSales.created_at[Op.gte]],
                type: QueryTypes.SELECT
            }
        );

        res.json({
            success: true,
            data: {
                sales,
                expenses,
                topProducts,
                summary: {
                    total_revenue: sales.reduce((acc, s) => acc + parseFloat(s.get('revenue') || 0), 0),
                    total_expenses: expenses.reduce((acc, e) => acc + parseFloat(e.get('total') || 0), 0),
                    total_transactions: sales.reduce((acc, s) => acc + parseInt(s.get('count') || 0), 0)
                }
            }
        });
    } catch (err) {
        next(err);
    }
};


const getDetailedReportData = async (whereSales, whereExpenses, replacements, type) => {
    try {
        logger.info(`[Reports] Generating ${type} report with replacements: ${JSON.stringify(replacements)}`);

        // 1. Unified SQL for Sales KPIs (Revenue, Profit, Loss, Count)
        const statsArr = await db.sequelize.query(
            `SELECT 
                COUNT(*) as transactions_count,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COALESCE(SUM(si.gain_total), 0) as gross_profit,
                COALESCE(SUM(si.loss_total), 0) as gross_loss,
                COALESCE(SUM(si.cost_total), 0) as total_cost
             FROM sales s
             LEFT JOIN (
                 SELECT 
                    sale_id, 
                    SUM(CASE WHEN selling_price > purchase_price THEN (selling_price - purchase_price) * quantity ELSE 0 END) as gain_total,
                    SUM(CASE WHEN selling_price < purchase_price THEN (purchase_price - selling_price) * quantity ELSE 0 END) as loss_total,
                    SUM(purchase_price * quantity) as cost_total
                 FROM sale_items 
                 GROUP BY sale_id
             ) si ON s.id = si.sale_id
             WHERE s.status = 'completed' AND s.created_at >= ? AND s.created_at <= ?`,
            { replacements, type: QueryTypes.SELECT }
        );
        
        const stats = (statsArr && statsArr.length > 0) ? statsArr[0] : { transactions_count: 0, total_revenue: 0, gross_profit: 0, gross_loss: 0, total_cost: 0 };
        logger.info(`[Reports] ${type} stats: ${JSON.stringify(stats)}`);

        // 2. Expenses Summary
        const expenses = await db.Expense.findAll({
            where: whereExpenses,
            attributes: [
                'category',
                [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total'],
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
            ],
            group: ['category']
        });

        const totalExpenses = expenses.reduce((acc, e) => acc + parseFloat(e.get('total') || 0), 0);
        logger.info(`[Reports] ${type} total expenses: ${totalExpenses}`);

        // 3. ACTUAL Collected Money Payment Breakdown & Debt Stats
        const salesCollected = await db.sequelize.query(
            `SELECT payment_method as name, SUM(amount_paid) as total_collected
             FROM sales
             WHERE status = 'completed' AND created_at >= ? AND created_at <= ?
             GROUP BY payment_method`,
            { replacements, type: QueryTypes.SELECT }
        );

        const paymentsCollected = await db.sequelize.query(
            `SELECT payment_method as name, SUM(amount) as total_collected
             FROM payments
             WHERE created_at >= ? AND created_at <= ?
             GROUP BY payment_method`,
            { replacements, type: QueryTypes.SELECT }
        );

        const actualCollectedMap = {};
        let totalActualCollected = 0;

        [...salesCollected, ...paymentsCollected].forEach(item => {
            const method = item.name || 'other';
            const amount = parseFloat(item.total_collected || 0);
            
            // For 'credit' method, the collected part (partial payments) 
            // should stay in totalActualCollected but we will merge the label later
            actualCollectedMap[method] = (actualCollectedMap[method] || 0) + amount;
            totalActualCollected += amount;
        });

        // 3.5 Fetch Debt Stats generated in this period
        const debtsGenerated = await db.sequelize.query(
            `SELECT 
                SUM(CASE WHEN paid_amount = 0 THEN balance ELSE 0 END) as full_debt,
                SUM(CASE WHEN paid_amount > 0 AND balance > 0 THEN balance ELSE 0 END) as partial_debt,
                SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END) as total_uncollected
             FROM debts
             WHERE status != 'cancelled' AND created_at >= ? AND created_at <= ?`,
            { replacements, type: QueryTypes.SELECT }
        );
        const debtStats = (debtsGenerated && debtsGenerated.length > 0) ? debtsGenerated[0] : { full_debt: 0, partial_debt: 0, total_uncollected: 0 };

        // MERGE UNCOLLECTED DEBT INTO CREDIT ROW
        const totalDebt = parseFloat(debtStats.total_uncollected || 0);
        if (totalDebt > 0) {
            actualCollectedMap['credit'] = (actualCollectedMap['credit'] || 0) + totalDebt;
        }

        const unifiedCollectedBreakdown = Object.keys(actualCollectedMap).map(key => ({
            name: key,
            total: actualCollectedMap[key],
            count: 0 
        }));

        // 4. Detailed Sales Trend (Revenue & Profit per day)
        const salesTrend = await db.sequelize.query(
            `SELECT 
                DATE(s.created_at) as date,
                SUM(s.total_amount) as revenue,
                SUM(COALESCE(si.gain_total, 0) - COALESCE(si.loss_total, 0)) as profit
             FROM sales s
             LEFT JOIN (
                 SELECT 
                    sale_id, 
                    SUM(CASE WHEN selling_price > purchase_price THEN (selling_price - purchase_price) * quantity ELSE 0 END) as gain_total,
                    SUM(CASE WHEN selling_price < purchase_price THEN (purchase_price - selling_price) * quantity ELSE 0 END) as loss_total
                 FROM sale_items 
                 GROUP BY sale_id
             ) si ON s.id = si.sale_id
             WHERE s.status = 'completed' AND s.created_at >= ? AND s.created_at <= ?
             GROUP BY DATE(s.created_at)
             ORDER BY date ASC`,
            { replacements, type: QueryTypes.SELECT }
        );

        // Scope created_at specifically to avoid ambiguity when Sequelize generates a flat join without limit constraints 
        const refinedWhere = { ...whereSales };
        if (refinedWhere.created_at) {
            refinedWhere['$Sale.created_at$'] = refinedWhere.created_at;
            delete refinedWhere.created_at;
        }

        // 5. Consolidated Transaction List (Sales + Standalone Payments)
        const recentTransactionsRaw = await db.Sale.findAll({
            where: refinedWhere,
            include: [
                {
                    model: db.SaleItem,
                    as: 'items',
                    include: [{ model: db.Medicine, as: 'medicine' }]
                },
                { model: db.Customer, as: 'customer' }
            ],
            order: [[db.sequelize.col('Sale.created_at'), 'DESC']]
        });

        const recentPaymentsRaw = await db.Payment.findAll({
            where: {
                created_at: { [Op.between]: [replacements[0], replacements[1] + ' 23:59:59'] }
            },
            include: [{ model: db.Customer, as: 'customer' }],
            order: [['created_at', 'DESC']]
        });

        const recentTransactions = [
            ...recentTransactionsRaw.map(s => {
                const saleData = s.get({ plain: true });
                return {
                    id: saleData.id,
                    invoice_number: saleData.invoice_number,
                    date: saleData.created_at || saleData.createdAt,
                    customer_name: saleData.customer?.name || 'Walk-in',
                    medicines: (saleData.items || []).map(i => i.medicine?.name).filter(Boolean).join(', '),
                    items: (saleData.items || []).map(i => ({ name: i.medicine?.name, quantity: i.quantity })),
                    total_amount: saleData.total_amount,
                    amount_paid: saleData.amount_paid,
                    payment_method: saleData.payment_method,
                    desc: 'Sale'
                };
            }),
            ...recentPaymentsRaw.map(p => {
                const pData = p.get({ plain: true });
                return {
                    id: `p-${pData.id}`,
                    invoice_number: `PAY-${pData.id}`,
                    date: pData.created_at || pData.createdAt,
                    customer_name: pData.customer?.name || 'Walk-in',
                    medicines: 'Debt Payment Collection',
                    items: [],
                    total_amount: 0,
                    amount_paid: pData.amount,
                    payment_method: pData.payment_method,
                    desc: 'Debt Payment'
                };
            })
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        // 6. Top Medicines
        const topMedicines = await db.sequelize.query(
            `SELECT m.name, SUM(si.quantity) as sold_count, SUM(si.selling_price * si.quantity) as total_revenue
             FROM sale_items si
             JOIN medicines m ON si.medicine_id = m.id
             JOIN sales s ON si.sale_id = s.id
             WHERE s.status = 'completed' AND s.created_at >= ? AND s.created_at <= ?
             GROUP BY m.id
             ORDER BY sold_count DESC
             LIMIT 5`,
            { replacements, type: QueryTypes.SELECT }
        );

        const result = {
            summary: {
                total_transactions: parseInt(stats?.transactions_count || 0),
                total_revenue: parseFloat(stats?.total_revenue || 0),
                total_profit: parseFloat(stats?.gross_profit || 0),
                total_loss: parseFloat(stats?.gross_loss || 0),
                total_expenses: totalExpenses,
                net_profit: parseFloat(stats?.gross_profit || 0) - parseFloat(stats?.gross_loss || 0) - totalExpenses,
                
                // --- NEW RECONCILIATION METRICS ---
                actual_collected: totalActualCollected,
                full_debt: parseFloat(debtStats.full_debt || 0),
                partial_debt: parseFloat(debtStats.partial_debt || 0),
                total_uncollected_debt: parseFloat(debtStats.total_uncollected || 0)
            },
            sales_trend: salesTrend,
            payment_breakdown: unifiedCollectedBreakdown,
            expenses_by_category: expenses.map(e => ({
                category: e.category,
                total: parseFloat(e.get('total') || 0)
            })),
            recent_transactions: recentTransactions,
            top_medicines: topMedicines
        };

        logger.info(`[Reports] Generated ${type} report successfully. Trend points: ${result.sales_trend.length}, Transactions: ${result.recent_transactions.length}`);

        return result;
    } catch (e) {
        logger.error(`[Reports] Error in getDetailedReportData: ${e.message}`, { stack: e.stack });
        throw e;
    }
};

const getDailyReport = async (req, res, next) => {
    try {
        const now = new Date();
        const localDate = new Date().toISOString().split('T')[0];

        const whereSales = { 
            status: 'completed',
            [Op.and]: [
                db.sequelize.where(db.sequelize.fn('DATE', db.sequelize.col('Sale.created_at')), localDate)
            ]
        };
        const whereExpenses = { expense_date: localDate };
        const data = await getDetailedReportData(whereSales, whereExpenses, [localDate, localDate], 'daily');
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

const getWeeklyReport = async (req, res, next) => {
    try {
        const today = new Date();
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        const startStr = lastWeek.toISOString().split('T')[0];
        const endStr = today.toISOString().split('T')[0];
        
        const whereSales = { 
            status: 'completed',
            [Op.and]: [
                db.sequelize.where(db.sequelize.fn('DATE', db.sequelize.col('Sale.created_at')), { [Op.between]: [startStr, endStr] })
            ]
        };
        const whereExpenses = { expense_date: { [Op.between]: [startStr, endStr] } };
        const data = await getDetailedReportData(whereSales, whereExpenses, [startStr, endStr], 'weekly');
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

const getReportByMonth = async (req, res, next) => {
    try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const startStr = monthStart.toISOString().split('T')[0];
        const endStr = now.toISOString().split('T')[0];
        
        const whereSales = { 
            status: 'completed',
            [Op.and]: [
                db.sequelize.where(db.sequelize.fn('DATE', db.sequelize.col('Sale.created_at')), { [Op.between]: [startStr, endStr] })
            ]
        };
        const whereExpenses = { expense_date: { [Op.between]: [startStr, endStr] } };
        const data = await getDetailedReportData(whereSales, whereExpenses, [startStr, endStr], 'monthly');
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

const getCustomReport = async (req, res, next) => {
    try {
        const { start, end } = req.query;
        if (!start || !end) {
            return res.status(400).json({ success: false, message: 'Start and end dates are required.' });
        }
        const whereSales = { 
            status: 'completed',
            created_at: { [Op.gte]: start, [Op.lte]: end }
        };
        const whereExpenses = { expense_date: { [Op.gte]: start, [Op.lte]: end } };
        const data = await getDetailedReportData(whereSales, whereExpenses, [start, end], 'custom');
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export {
    getDashboard,
    getMonthlyReport,
    getProfitLoss,
    getReports,
    getDailyReport,
    getWeeklyReport,
    getReportByMonth,
    getCustomReport
};