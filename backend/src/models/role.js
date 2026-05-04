import { DataTypes } from 'sequelize';

const Role = (sequelize, DataTypes) => {
    const Role = sequelize.define('Role', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true
        },
        description: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        permissions: {
            type: DataTypes.JSON,
            defaultValue: {}
        }
    }, {
        tableName: 'roles',
        timestamps: false
    });

    Role.associate = (models) => {
        Role.hasMany(models.User, { foreignKey: 'role_id', as: 'users' });
    };

    return Role;
};

export default Role;