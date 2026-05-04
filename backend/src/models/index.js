import { Sequelize, DataTypes } from 'sequelize';
import logger from '../middleware/logger.js';
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
            max: 20,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        timezone: '+00:00',
        define: {
            timestamps: true,
            underscored: true,
            freezeTableName: true
        }
    }
);

const db = {
    sequelize,
    Sequelize,
    User: User(sequelize, DataTypes),
    Role: Role(sequelize, DataTypes),
    Branch: Branch(sequelize, DataTypes),
    ActivityLog: ActivityLog(sequelize, DataTypes),
    Category: Category(sequelize, DataTypes),
    Supplier: Supplier(sequelize, DataTypes),
    Medicine: Medicine(sequelize, DataTypes),
    Customer: Customer(sequelize, DataTypes),
    Sale: Sale(sequelize, DataTypes),
    SaleItem: SaleItem(sequelize, DataTypes),
    Debt: Debt(sequelize, DataTypes),
    Payment: Payment(sequelize, DataTypes),
    Expense: Expense(sequelize, DataTypes),
    PurchaseOrder: PurchaseOrder(sequelize, DataTypes),
    PurchaseOrderItem: PurchaseOrderItem(sequelize, DataTypes)
};

Object.keys(db).forEach(modelName => {
    if (db[modelName]?.associate) {
        db[modelName].associate(db);
    }
});

db.testConnection = async () => {
    try {
        await sequelize.authenticate();
        logger.info('MySQL database connected successfully');
        return true;
    } catch (err) {
        logger.error(`Database connection failed: ${err.message}`);
        return false;
    }
};

db.syncModels = async (options = {}) => {
    try {
        const shouldAlter = options.alter || process.env.DB_ALTER === 'true';
        await sequelize.sync({ alter: shouldAlter, ...options });

        const roleCount = await db.Role.count();
        if (roleCount === 0) {
            await db.Role.bulkCreate([
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