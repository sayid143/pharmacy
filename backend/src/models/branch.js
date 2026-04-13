import { DataTypes } from 'sequelize';

const Branch = (sequelize, DataTypes) => {
    const Branch = sequelize.define('Branch', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        address: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'branches'
    });

    Branch.associate = (models) => {
        Branch.hasMany(models.User, { foreignKey: 'branch_id', as: 'users' });
        Branch.hasMany(models.Medicine, { foreignKey: 'branch_id', as: 'medicines' });
        Branch.hasMany(models.Sale, { foreignKey: 'branch_id', as: 'sales' });
        Branch.hasMany(models.Expense, { foreignKey: 'branch_id', as: 'expenses' });
    };

    return Branch;
};

export default Branch;