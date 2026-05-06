import mysql from 'mysql2/promise';
import 'dotenv/config';

const addBranchId = async () => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'railway'
    });

    try {
        console.log('Updating debts table...');
        try {
            await connection.query('ALTER TABLE debts ADD COLUMN branch_id INT NULL AFTER user_id');
            console.log('branch_id added to debts.');
        } catch (err) {
            if (err.code === 'ER_DUP_COLUMN_NAMES') console.log('branch_id already exists in debts.');
            else throw err;
        }

        console.log('Updating customers table...');
        try {
            await connection.query('ALTER TABLE customers ADD COLUMN branch_id INT NULL AFTER is_active');
            console.log('branch_id added to customers.');
        } catch (err) {
            if (err.code === 'ER_DUP_COLUMN_NAMES') console.log('branch_id already exists in customers.');
            else throw err;
        }

        console.log('Database updates completed!');
    } catch (err) {
        console.error('Error updating database:', err.message);
    } finally {
        await connection.end();
    }
};

addBranchId();
