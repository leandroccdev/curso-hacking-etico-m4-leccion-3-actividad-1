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
        }
    }
    User.init({
        name: {
            allowNull: false,
            type: DataTypes.STRING(40)
        },
        password: {
            allowNull: false,
            type: DataTypes.STRING(60)
        },
        role: {
            allowNull: false,
            defaultValue: 'user',
            type: DataTypes.ENUM('administrator', 'editor', 'user')
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