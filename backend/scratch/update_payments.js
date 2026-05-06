import mysql from 'mysql2/promise';
import 'dotenv/config';

const updatePayments = async () => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'railway'
    });

    try {
        console.log('Updating payments table...');
        try {
            await connection.query('ALTER TABLE payments ADD COLUMN branch_id INT NULL AFTER user_id');
            console.log('branch_id added to payments.');
        } catch (err) {
            if (err.code === 'ER_DUP_COLUMN_NAMES') console.log('branch_id already exists in payments.');
            else throw err;
        }
        console.log('Database updates completed!');
    } catch (err) {
        console.error('Error updating database:', err.message);
    } finally {
        await connection.end();
    }
};

updatePayments();
