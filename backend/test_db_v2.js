import db from './src/models/index.js';

async function test() {
    try {
        console.log('Testing database connection...');
        await db.sequelize.authenticate();
        console.log('Connection stable.');

        const salesCount = await db.Sale.count();
        console.log('Total sales:', salesCount);

        const expensesCount = await db.Expense.count();
        console.log('Total expenses:', expensesCount);

        const latestSale = await db.Sale.findOne({ order: [['created_at', 'DESC']] });
        if (latestSale) {
            console.log('Latest sale date:', latestSale.created_at);
            console.log('Latest sale status:', latestSale.status);
            console.log('Latest sale amount:', latestSale.total_amount);
        } else {
            console.log('No sales found.');
        }

        process.exit(0);
    } catch (e) {
        console.error('Database test failed:', e);
        process.exit(1);
    }
}

test();
