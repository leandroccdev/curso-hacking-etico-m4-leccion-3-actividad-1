'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('task', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            title: {
                allowNull: false,
                type: Sequelize.STRING(40)
            },
            description: {
                allowNull: false,
                type: Sequelize.TEXT
            },
            /**
             * De 0 a 100
             */
            progress: {
                allowNull: false,
                default: 0,
                type: Sequelize.DECIMAL(10, 2)
            },
            projectId: {
                allowNull: false,
                type: Sequelize.INTEGER
            },
            // Usuario quien crea la tarea
            userAuthor: {
                allowNull: false,
                type: Sequelize.INTEGER
            },
            // Usuario quien desarrolla la tarea
            userExecutor: {
                allowNull: true,
                type: Sequelize.INTEGER
            },
            /**
             * Estados posibles
             * - open: 1
             * - in-progress: 2
             * - blocked: 3
             * - in-review: 4
             * - in-testing: 5
             * - cancelled: 6
             * - completed: 7
             * - closed: 8
             * - in-audit: 9
             */
            status: {
                allowNull: false,
                type: Sequelize.TINYINT
            },
            // Para el soft delete
            isDeleted: {
                allowNull: false,
                defaultValue: false,
                type: Sequelize.BOOLEAN
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: true,
                type: Sequelize.DATE
            },
            deletedAt: {
                allowNull: true,
                type: Sequelize.DATE
            }
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('task');
    }
};