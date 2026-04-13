import { DataTypes } from 'sequelize';

const Expense = (sequelize, DataTypes) => {
    const Expense = sequelize.define('Expense', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        title: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        category: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        payment_method: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'cash'
        },
        receipt_image: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        branch_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        expense_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        }
    }, {
        tableName: 'expenses'
    });

    Expense.associate = (models) => {
        Expense.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
        Expense.belongsTo(models.Branch, { foreignKey: 'branch_id', as: 'branch' });
    };

    return Expense;
};

export default Expense;