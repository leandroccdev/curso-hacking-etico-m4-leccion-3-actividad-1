'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class UserRole extends Model {
        static associate(models) {
            // Tiene muchos usuario
            this.hasMany(
                models.User,
                {
                    foreignKey: 'role',
                    as: 'users'
                }
            );
        }
    }
    UserRole.init({
        name: DataTypes.STRING
    }, {
        sequelize,
        freezeTableName: true,
        modelName: 'UserRole',
        tableName: 'user_role'
    });
    return UserRole;
};