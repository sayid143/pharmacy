import { DataTypes } from 'sequelize';

const Customer = (sequelize, DataTypes) => {
    const Customer = sequelize.define('Customer', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: true,
            validate: { isEmail: true }
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        address: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        date_of_birth: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        outstanding_balance: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },
        insurance_number: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        credit_limit: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },
        loyalty_points: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'customers',
        underscored: true
    });

    Customer.associate = (models) => {
        Customer.hasMany(models.Sale, { foreignKey: 'customer_id', as: 'sales' });
        Customer.hasMany(models.Debt, { foreignKey: 'customer_id', as: 'debts' });
    };

    return Customer;
};

export default Customer;