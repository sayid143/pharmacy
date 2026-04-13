import { DataTypes } from 'sequelize';

const ActivityLog = (sequelize, DataTypes) => {
    const ActivityLog = sequelize.define('ActivityLog', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        action: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        entity_type: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        entity_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        old_values: {
            type: DataTypes.JSON,
            allowNull: true
        },
        new_values: {
            type: DataTypes.JSON,
            allowNull: true
        },
        ip_address: {
            type: DataTypes.STRING(45),
            allowNull: true
        },
        user_agent: {
            type: DataTypes.STRING(255),
            allowNull: true
        }
    }, {
        tableName: 'activity_logs'
    });

    ActivityLog.associate = (models) => {
        ActivityLog.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    };

    return ActivityLog;
};

export default ActivityLog;