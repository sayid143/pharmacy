import { DataTypes } from 'sequelize';

const Debt = (sequelize, DataTypes) => {
    const Debt = sequelize.define('Debt', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        customer_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        customer_name: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        customer_phone: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        sale_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0
        },
        paid_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },
        balance: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },
        due_date: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        payment_method: {
            type: DataTypes.ENUM('cash', 'card', 'credit', 'bank_transfer', 'ebirr', 'ebirr_kaafi', 'mobile', 'other'),
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('pending', 'partial', 'paid', 'overdue', 'unpaid'),
            defaultValue: 'pending'
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        }
    }, {
        tableName: 'debts'
    });

    Debt.associate = (models) => {
        Debt.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
        Debt.belongsTo(models.Customer, { foreignKey: 'customer_id', as: 'customer' });
        Debt.belongsTo(models.Sale, { foreignKey: 'sale_id', as: 'sale' });
        Debt.hasMany(models.Payment, { foreignKey: 'debt_id', as: 'payments' });
    };

    return Debt;
};

export default Debt;