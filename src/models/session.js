'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Session extends Model {
        static associate(models) {
            // Pertenece a un usuario
            this.belongsTo(
                models.User,
                {
                    foreignKey: 'userId',
                    as: 'user'
                }
            );
        }
    }
    Session.init({
        userId: {
            allowNull: false,
            type: DataTypes.INTEGER
        },
        sessionId: {
            allowNull: DataTypes.STRING(36),
            type: DataTypes.TEXT
        },
        token: {
            allowNull: false,
            type: DataTypes.TEXT
        },
        active: {
            allowNull: false,
            defaultValue: true,
            type: DataTypes.BOOLEAN
        },
        expireAt: {
            allowNull: false,
            type: DataTypes.INTEGER
        }
    }, {
        sequelize,
        freezeTableName: true,
        modelName: 'Session',
        tableName: 'session'
    });
    return Session;
};