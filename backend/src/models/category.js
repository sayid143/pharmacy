import { DataTypes } from 'sequelize';

const Category = (sequelize, DataTypes) => {
    const Category = sequelize.define('Category', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },
        description: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'categories'
    });

    Category.associate = (models) => {
        Category.hasMany(models.Medicine, { foreignKey: 'category_id', as: 'medicines' });
    };

    return Category;
};

export default Category;