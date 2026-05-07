import { Sequelize, DataTypes } from 'sequelize';
import logger from '../middleware/logger.js';
import { tenantContext } from '../middleware/tenantMiddleware.js';
import User from './user.js';
import Role from './role.js';
import Branch from './branch.js';
import ActivityLog from './activityLog.js';
import Category from './category.js';
import Supplier from './supplier.js';
import Medicine from './medicine.js';
import Customer from './customer.js';
import Sale from './sale.js';
import SaleItem from './saleItem.js';
import Debt from './debt.js';
import Payment from './payment.js';
import Expense from './expense.js';
import PurchaseOrder from './purchaseOrder.js';
import PurchaseOrderItem from './purchaseOrderItem.js';

// Default static connection (fallback/migration)
const staticSequelize = new Sequelize(
    process.env.DB_NAME || 'pharmacare',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        dialect: 'postgres',
        logging: false,
        pool: { max: 20, min: 0, acquire: 60000, idle: 10000 },
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

const staticDb = {
    sequelize: staticSequelize,
    Sequelize,
    User: User(staticSequelize, DataTypes),
    Role: Role(staticSequelize, DataTypes),
    Branch: Branch(staticSequelize, DataTypes),
    ActivityLog: ActivityLog(staticSequelize, DataTypes),
    Category: Category(staticSequelize, DataTypes),
    Supplier: Supplier(staticSequelize, DataTypes),
    Medicine: Medicine(staticSequelize, DataTypes),
    Customer: Customer(staticSequelize, DataTypes),
    Sale: Sale(staticSequelize, DataTypes),
    SaleItem: SaleItem(staticSequelize, DataTypes),
    Debt: Debt(staticSequelize, DataTypes),
    Payment: Payment(staticSequelize, DataTypes),
    Expense: Expense(staticSequelize, DataTypes),
    PurchaseOrder: PurchaseOrder(staticSequelize, DataTypes),
    PurchaseOrderItem: PurchaseOrderItem(staticSequelize, DataTypes)
};

Object.keys(staticDb).forEach(modelName => {
    if (staticDb[modelName]?.associate) {
        staticDb[modelName].associate(staticDb);
    }
});

// Proxy to dynamically switch db based on context
const db = new Proxy(staticDb, {
    get(target, prop) {
        const contextDb = tenantContext.getStore();
        if (contextDb) {
            return contextDb[prop];
        }
        return target[prop];
    }
});

db.testConnection = async () => {
    try {
        let retries = 5;
        while (retries > 0) {
            try {
                await staticSequelize.authenticate();
                logger.info('Static PostgreSQL database connected successfully');
                return true;
            } catch (err) {
                retries--;
                logger.warn(`Static database connection attempt failed (${retries} retries left): ${err.message}`);
                if (retries === 0) throw err;
                await new Promise(res => setTimeout(res, 2000));
            }
        }
        return false;
    } catch (err) {
        logger.error(`Static database connection failed: ${err.message}`);
        return false;
    }
};

db.syncModels = async (options = {}) => {
    try {
        const shouldAlter = options.alter || process.env.DB_ALTER === 'true';
        await staticSequelize.sync({ alter: shouldAlter, ...options });

        const roleCount = await staticDb.Role.count();
        if (roleCount === 0) {
            await staticDb.Role.bulkCreate([
                { name: 'admin', description: 'System Administrator', permissions: { all: true } },
                { name: 'pharmacist', description: 'Licensed Pharmacist', permissions: { medicines: true, sales: true, reports: true, customers: true } },
                { name: 'cashier', description: 'Sales Cashier', permissions: { sales: true, customers: true } }
            ]);
        }
        return true;
    } catch (err) {
        logger.error(`Model sync failed: ${err.message}`);
        return false;
    }
};

export default db;