import { Sequelize, DataTypes } from 'sequelize';
import mysql from 'mysql2/promise';
import 'dotenv/config';

const centralSequelize = new Sequelize(
    process.env.CENTRAL_DB_NAME || 'pharmacare_central',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        dialect: 'mysql',
        logging: false,
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
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await connection.end();

        await centralSequelize.authenticate();
        await centralSequelize.sync();
        
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
