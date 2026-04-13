import { DataTypes } from 'sequelize';

const Payment = (sequelize, DataTypes) => {
    const Payment = sequelize.define('Payment', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        debt_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        customer_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0
        },
        payment_method: {
            type: DataTypes.ENUM('cash', 'card', 'bank_transfer', 'ebirr', 'ebirr_kaafi', 'mobile', 'other'),
            defaultValue: 'cash'
        },
        reference_number: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    }, {
        tableName: 'payments'
    });

    Payment.associate = (models) => {
        Payment.belongsTo(models.Debt, { foreignKey: 'debt_id', as: 'debt' });
        Payment.belongsTo(models.Customer, { foreignKey: 'customer_id', as: 'customer' });
        Payment.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    };

    return Payment;
};

export default Payment;