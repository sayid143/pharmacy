import { Sequelize, DataTypes } from 'sequelize';
import pg from 'pg';
const { Client } = pg;
import 'dotenv/config';

const centralSequelize = new Sequelize(
    process.env.CENTRAL_DB_NAME || 'pharmacare_central',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        dialect: 'postgres',
        logging: false,
        pool: { max: 10, min: 0, acquire: 60000, idle: 10000 },
        retry: {
            match: [
                /SequelizeConnectionError/,
                /SequelizeConnectionRefusedError/,
                /SequelizeHostNotFoundError/,
                /SequelizeHostNotReachableError/,
                /SequelizeInvalidConnectionError/,
                /SequelizeConnectionTimedOutError/,
                /Connection lost/
            ],
            max: 5
        },
        define: {
            timestamps: true,
            underscored: true,
            freezeTableName: true
        }
    }
);

const Tenant = centralSequelize.define('Tenant', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    tenant_code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    db_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    db_config: {
        type: DataTypes.JSON,
        allowNull: true // Store overrides for host, user, pass if different
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

const centralDb = {
    sequelize: centralSequelize,
    Tenant,
    async init() {
        const dbName = process.env.CENTRAL_DB_NAME || 'pharmacare_central';
        
        // Ensure database exists
        const client = new Client({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 5432,
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
            database: 'postgres'
        });

        try {
            await client.connect();
            const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
            if (res.rowCount === 0) {
                await client.query(`CREATE DATABASE ${dbName}`);
                console.log(`Central Database ${dbName} created successfully`);
            }
        } catch (err) {
            console.error('Error creating central database:', err);
        } finally {
            await client.end();
        }
        
        let retries = 5;
        while (retries > 0) {
            try {
                await centralSequelize.authenticate();
                await centralSequelize.sync();
                break;
            } catch (err) {
                retries--;
                if (retries === 0) throw err;
                await new Promise(res => setTimeout(res, 2000));
            }
        }
        
        // Seed default tenant if none exists
        const count = await Tenant.count();
        if (count === 0) {
            await Tenant.create({
                name: 'Default Pharmacy',
                tenant_code: 'default',
                db_name: process.env.DB_NAME || 'pharmacare'
            });
        }
    }
};

export default centralDb;

