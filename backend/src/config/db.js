import { Sequelize } from "sequelize";
import mysql from 'mysql2/promise';
import db from '../models/index.js';

const sequelize = new Sequelize(
    process.env.DB_NAME || 'pharmacare',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        dialect: 'mysql',
        logging: false,
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

const createDatabaseIfNotExists = async () => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || ''
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'pharmacare'} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.end();
};

createDatabaseIfNotExists().then(() => {
    console.log('Database ensured to exist');
    db.testConnection().then(() => {
        console.log('');
    });
});

export { sequelize };
export default db;

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pharmacare',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export { pool };