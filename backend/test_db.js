import db from './src/models/index.js';
import dotenv from 'dotenv';
dotenv.config();

const { QueryTypes, Op } = db.Sequelize;

async function test() {
    try {
        console.log('--- Controller Logic Test ---');
        
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const localDate = `${year}-${month}-${day}`;
        
        console.log('Target Date:', localDate);

        const replacements = [localDate, localDate];

        const [stats] = await db.sequelize.query(
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
             WHERE s.status = 'completed' AND s.created_at BETWEEN ? AND ?`,
            { replacements: [replacements[0], replacements[1] + ' 23:59:59'], type: QueryTypes.SELECT }
        );

        console.log('Query Result (stats):', stats);
        
        const summary = {
                total_transactions: stats?.transactions_count || 0,
                total_revenue: parseFloat(stats?.total_revenue || 0),
                total_profit: parseFloat(stats?.gross_profit || 0),
                total_loss: parseFloat(stats?.gross_loss || 0),
                total_expenses: 0,
                net_profit: parseFloat(stats?.gross_profit || 0) - parseFloat(stats?.gross_loss || 0) - 0
        };

        console.log('Computed Summary:', summary);

        process.exit(0);
    } catch (e) {
        console.error('Test failed:', e);
        process.exit(1);
    }
}

test();
