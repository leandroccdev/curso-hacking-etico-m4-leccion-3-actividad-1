'use strict';
const {
	Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
	class Project extends Model {
		static associate(models) {
			// Tiene un dueño
			this.belongsTo(
				models.User,
				{
					foreignKey: 'userOwner',
					as: 'owner'
				}
			);
			// Tiene muchas tareas
			this.hasMany(
				models.Task,
				{
					foreignKey: 'projectId',
					as: 'project'
				}
			);
		}
	}
	Project.init({
		title: {
			allowNull: false,
			type: DataTypes.STRING(40)
		},
		description: {
			allowNull: false,
			type: DataTypes.STRING(100)
		},
		userOwner: {
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
		modelName: 'Project',
		tableName: 'project',
		underscored: false,
		// Activa soft delete
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
	return Project;
};