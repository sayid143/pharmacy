import { Sequelize } from "sequelize";
import pg from 'pg';
const { Client, Pool } = pg;
import db from '../models/index.js';

const sequelize = new Sequelize(
    process.env.DB_NAME || 'pharmacare',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        dialect: 'postgres',
        logging: false,
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        dialectOptions: {
            // SSL is required for Supabase
            ssl: { 
                rejectUnauthorized: false 
            }
        }
    }
);

const createDatabaseIfNotExists = async () => {
    const dbName = process.env.DB_NAME || 'pharmacare';
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: 'postgres' // Connect to default postgres DB to create new one
    });

    try {
        await client.connect();
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
        if (res.rowCount === 0) {
            await client.query(`CREATE DATABASE ${dbName}`);
            console.log(`Database ${dbName} created successfully`);
        }
    } catch (err) {
        console.error('Error creating database:', err);
    } finally {
        await client.end();
    }
};

createDatabaseIfNotExists().then(() => {
    console.log('Database ensured to exist');
    db.testConnection().then(async () => {
        console.log('PostgreSQL Connection established');
        
        // Auto-fix ENUM types for Supabase/Postgres
        try {
            await sequelize.query("ALTER TYPE debt_status_enum ADD VALUE IF NOT EXISTS 'unpaid'");
            await sequelize.query("ALTER TYPE debt_status_enum ADD VALUE IF NOT EXISTS 'cancelled'");
            console.log('Database ENUM types verified/updated.');
        } catch (err) {
            // Ignore error if value already exists (some Postgres versions don't support IF NOT EXISTS for ADD VALUE)
            console.log('ENUM update note: ' + err.message);
        }
    });
});

export { sequelize };
export default db;

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pharmacare',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

export { pool };