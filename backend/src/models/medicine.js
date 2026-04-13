import { DataTypes } from 'sequelize';

const Medicine = (sequelize, DataTypes) => {
    const Medicine = sequelize.define('Medicine', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        generic_name: {
            type: DataTypes.STRING(200),
            allowNull: true
        },
        category_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        supplier_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        branch_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        batch_number: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        expiry_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
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
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        min_stock_level: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 10
        },
        barcode: {
            type: DataTypes.STRING(100),
            allowNull: true,
            unique: true
        },
        dosage_form: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        strength: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        unit: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'pcs'
        },
        image: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        requires_prescription: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'medicines'
    });

    Medicine.associate = (models) => {
        Medicine.belongsTo(models.Category, { foreignKey: 'category_id', as: 'category' });
        Medicine.belongsTo(models.Supplier, { foreignKey: 'supplier_id', as: 'supplier' });
        Medicine.belongsTo(models.Branch, { foreignKey: 'branch_id', as: 'branch' });
        Medicine.hasMany(models.SaleItem, { foreignKey: 'medicine_id', as: 'saleItems' });
    };

    return Medicine;
};

export default Medicine;