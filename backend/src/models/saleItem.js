import { DataTypes } from 'sequelize';

const SaleItem = (sequelize, DataTypes) => {
    const SaleItem = sequelize.define('SaleItem', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        sale_id: {
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
            defaultValue: 1
        },
        purchase_price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0
        },
        selling_price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0
        },
        subtotal: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0
        }
    }, {
        tableName: 'sale_items'
    });

    SaleItem.associate = (models) => {
        SaleItem.belongsTo(models.Sale, { foreignKey: 'sale_id', as: 'sale' });
        SaleItem.belongsTo(models.Medicine, { foreignKey: 'medicine_id', as: 'medicine' });
    };

    return SaleItem;
};

export default SaleItem;