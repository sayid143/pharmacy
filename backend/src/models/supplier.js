import { DataTypes } from 'sequelize';

const Supplier = (sequelize, DataTypes) => {
    const Supplier = sequelize.define('Supplier', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        contact_person: {
            type: DataTypes.STRING(100),
            allowNull: true
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
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        payment_terms: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        tax_number: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'suppliers',
        underscored: true
    });

    Supplier.associate = (models) => {
        Supplier.hasMany(models.Medicine, { foreignKey: 'supplier_id', as: 'medicines' });
        Supplier.hasMany(models.PurchaseOrder, { foreignKey: 'supplier_id', as: 'purchaseOrders' });
    };

    return Supplier;
};

export default Supplier;