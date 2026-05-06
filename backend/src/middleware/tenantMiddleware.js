import { AsyncLocalStorage } from 'node:async_hooks';
import { Sequelize, DataTypes } from 'sequelize';
import centralDb from '../config/centralDb.js';
import User from '../models/user.js';
import Role from '../models/role.js';
import Branch from '../models/branch.js';
import ActivityLog from '../models/activityLog.js';
import Category from '../models/category.js';
import Supplier from '../models/supplier.js';
import Medicine from '../models/medicine.js';
import Customer from '../models/customer.js';
import Sale from '../models/sale.js';
import SaleItem from '../models/saleItem.js';
import Debt from '../models/debt.js';
import Payment from '../models/payment.js';
import Expense from '../models/expense.js';
import PurchaseOrder from '../models/purchaseOrder.js';
import PurchaseOrderItem from '../models/purchaseOrderItem.js';

export const tenantContext = new AsyncLocalStorage();

const dbCache = new Map();

const getTenantDb = async (tenant) => {
    if (dbCache.has(tenant.tenant_code)) {
        return dbCache.get(tenant.tenant_code);
    }

    const config = tenant.db_config || {};
    const sequelize = new Sequelize(
        tenant.db_name,
        config.user || process.env.DB_USER || 'root',
        config.password || process.env.DB_PASSWORD || '',
        {
            host: config.host || process.env.DB_HOST || 'localhost',
            port: parseInt(config.port) || parseInt(process.env.DB_PORT) || 3306,
            dialect: 'mysql',
            logging: false,
            pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
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

    // Global hook for branch isolation
    sequelize.addHook('beforeFind', (options) => {
        const context = tenantContext.getStore();
        if (context && context.branchId) {
            const model = options.model || (options.include && options.include[0]?.model);
            // Only apply if the model has branch_id attribute
            if (sequelize.models[options.model?.name]?.rawAttributes?.branch_id) {
                options.where = { ...options.where, branch_id: context.branchId };
            }
        }
    });

    sequelize.addHook('beforeCreate', (instance) => {
        const context = tenantContext.getStore();
        if (context && context.branchId && !instance.branch_id) {
            instance.branch_id = context.branchId;
        }
    });

    sequelize.addHook('beforeSave', (instance) => {
        const context = tenantContext.getStore();
        if (context && context.branchId && !instance.branch_id) {
            instance.branch_id = context.branchId;
        }
    });

    // Optional: Sync database if it doesn't exist or is new
    // In production, migrations are preferred
    await sequelize.authenticate();
    
    dbCache.set(tenant.tenant_code, db);
    return db;
};

export const tenantMiddleware = async (req, res, next) => {
    const tenantCode = req.headers['x-tenant-id'] || 'default';
    
    try {
        const tenant = await centralDb.Tenant.findOne({ where: { tenant_code: tenantCode, is_active: true } });
        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Tenant not found or inactive.' });
        }

        const db = await getTenantDb(tenant);
        
        // Provide the db in req for explicit usage
        req.tenantDb = db;
        
        // Wrap in context for global usage via proxy
        tenantContext.run(db, () => {
            next();
        });
    } catch (err) {
        console.error('Tenant middleware error:', err);
        res.status(500).json({ success: false, message: 'Internal server error during tenant resolution.' });
    }
};
