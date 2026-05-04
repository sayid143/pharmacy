import { DataTypes } from 'sequelize';

const Sale = (sequelize, DataTypes) => {
    const Sale = sequelize.define('Sale', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        invoice_number: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true
        },
        customer_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        branch_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        subtotal: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0
        },
        tax_rate: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0
        },
        tax_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },
        discount_type: {
            type: DataTypes.ENUM('fixed', 'percentage'),
            defaultValue: 'fixed'
        },
        discount_value: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },
        discount_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },
        total_amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0
        },
        amount_paid: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },
        change_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },
        payment_method: {
            type: DataTypes.ENUM('cash', 'card', 'credit', 'bank_transfer', 'ebirr', 'ebirr_kaafi', 'mobile', 'other'),
            defaultValue: 'cash'
        },
        payment_status: {
            type: DataTypes.ENUM('paid', 'partial', 'credit', 'unpaid'),
            defaultValue: 'paid'
        },
        status: {
            type: DataTypes.ENUM('completed', 'refunded', 'cancelled'),
            defaultValue: 'completed'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'sales'
    });

    Sale.associate = (models) => {
        Sale.belongsTo(models.Customer, { foreignKey: 'customer_id', as: 'customer' });
        Sale.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
        Sale.belongsTo(models.Branch, { foreignKey: 'branch_id', as: 'branch' });
        Sale.hasMany(models.SaleItem, { foreignKey: 'sale_id', as: 'items' });
        Sale.hasOne(models.Debt, { foreignKey: 'sale_id', as: 'debt' });
    };

    return Sale;
};

export default Sale;