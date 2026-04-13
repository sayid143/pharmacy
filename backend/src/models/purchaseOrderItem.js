import { DataTypes } from 'sequelize';

const PurchaseOrderItem = (sequelize, DataTypes) => {
    const PurchaseOrderItem = sequelize.define('PurchaseOrderItem', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        purchase_order_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        medicine_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        purchase_price: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },
        subtotal: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },
        received_quantity: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
    }, {
        tableName: 'purchase_order_items'
    });

    PurchaseOrderItem.associate = (models) => {
        PurchaseOrderItem.belongsTo(models.PurchaseOrder, { foreignKey: 'purchase_order_id', as: 'purchaseOrder' });
        PurchaseOrderItem.belongsTo(models.Medicine, { foreignKey: 'medicine_id', as: 'medicine' });
    };

    return PurchaseOrderItem;
};

export default PurchaseOrderItem;