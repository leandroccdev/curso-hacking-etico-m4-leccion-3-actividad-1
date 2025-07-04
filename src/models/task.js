'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Task extends Model {
        static associate(models) {
            // Pertenece a un proyecto
            this.belongsTo(
                models.Task,
                {
                    foreignKey: 'projectId',
                    as: 'project'
                }
            );
            // Tiene un autor
            this.belongsTo(
                models.User,
                {
                    foreignKey: 'author',
                    as: 'author'
                }
            );
            // Tiene un trabajador
            this.hasOne(
                models.User,
                {
                    foreignKey: 'executor',
                    as: 'executor'
                }
            );
        }
    }
    Task.init({
        title: {
            allowNull: false,
            type: DataTypes.STRING(40)
        },
        description: {
            allowNull: false,
            type: DataTypes.TEXT
        },
        progress: {
            allowNull: false,
            default: 0,
            type: DataTypes.DECIMAL(10, 2)
        },
        projectId: {
            allowNull: false,
            type: DataTypes.INTEGER
        },
        author: {
            allowNull: false,
            type: DataTypes.INTEGER
        },
        executor: {
            allowNull: false,
            type: DataTypes.INTEGER
        },
        status: {
            allowNull: false,
            type: DataTypes.STRING(20)
        },
        isDeleted: {
            allowNull: false,
            defaultValue: false,
            type: DataTypes.BOOLEAN
        }
    }, {
        sequelize,
        freezeTableName: true,
        modelName: 'Task',
        tableName: 'task',
        underscored: false,
        paranoid: true,
        hooks: {
            beforeDestroy: async (instance, options) => {
                // Update del flag isDeleted antes de la eliminación de la fila
                await instance.update(
                    {
                        isDeleted: true
                    },
                    // Usa la misma transacción
                    {
                        transaction: options.transaction,
                        hooks: false
                    }
                );
            }
        }
    });
    return Task;
};