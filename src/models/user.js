'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class User extends Model {
        static associate(models) {
            // Tiene muchas sesiones
            this.hasMany(
                models.Session,
                {
                    foreignKey: 'userId',
                    as: 'session'
                }
            );
            // Tiene un rol
            this.belongsTo(
                models.UserRole,
                {
                    foreignKey: 'role',
                    as: 'userRole'
                }
            );
        }
    }
    User.init({
        username: {
            allowNull: false,
            type: DataTypes.STRING(40)
        },
        password_hash: {
            allowNull: false,
            type: DataTypes.STRING(60)
        },
        role: {
            allowNull: false,
            defaultValue: 'user',
            /**
                 * Roles:
                 * 1: administrador
                 * 2: editor
                 * 3: usuario común
                 */
            type: DataTypes.TINYINT.UNSIGNED
        }
    }, {
        sequelize,
        freezeTableName: true,
        modelName: 'User',
        tableName: 'user',
        underscored: false
    });
    return User;
};