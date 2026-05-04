import { DataTypes } from 'sequelize';

const PurchaseOrder = (sequelize, DataTypes) => {
    const PurchaseOrder = sequelize.define('PurchaseOrder', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        order_number: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true
        },
        supplier_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        branch_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        total_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },
        status: {
            type: DataTypes.ENUM('pending', 'ordered', 'received', 'cancelled'),
            defaultValue: 'pending'
        },
        expected_date: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'purchase_orders'
    });

    PurchaseOrder.associate = (models) => {
        PurchaseOrder.belongsTo(models.Supplier, { foreignKey: 'supplier_id', as: 'supplier' });
        PurchaseOrder.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
        PurchaseOrder.belongsTo(models.Branch, { foreignKey: 'branch_id', as: 'branch' });
        PurchaseOrder.hasMany(models.PurchaseOrderItem, { foreignKey: 'purchase_order_id', as: 'items' });
    };

    return PurchaseOrder;
};

export default PurchaseOrder;