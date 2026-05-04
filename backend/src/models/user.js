import { DataTypes } from 'sequelize';
import bcrypt from 'bcrypt';

const User = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
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
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: { isEmail: true }
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        avatar: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        role_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 2
        },
        branch_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        last_login: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'users',
        hooks: {
            beforeCreate: async (user) => {
                if (user.password) {
                    user.password = await bcrypt.hash(user.password, 12);
                }
            },
            beforeUpdate: async (user) => {
                if (user.changed('password')) {
                    user.password = await bcrypt.hash(user.password, 12);
                }
            }
        }
    });

    User.prototype.comparePassword = async function(candidatePassword) {
        return await bcrypt.compare(candidatePassword, this.password);
    };

    User.prototype.toJSON = function() {
        const values = { ...this.get() };
        delete values.password;
        return values;
    };

    User.associate = (models) => {
        User.belongsTo(models.Role, { foreignKey: 'role_id', as: 'role' });
        User.belongsTo(models.Branch, { foreignKey: 'branch_id', as: 'branch' });
        User.hasMany(models.ActivityLog, { foreignKey: 'user_id', as: 'activityLogs' });
        User.hasMany(models.Sale, { foreignKey: 'user_id', as: 'sales' });
        User.hasMany(models.Expense, { foreignKey: 'user_id', as: 'expenses' });
    };

    return User;
};

export default User;