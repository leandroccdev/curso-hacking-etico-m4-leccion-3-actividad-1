'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('project', {
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
                type: Sequelize.STRING(100)
            },
            // id del usuario quien crea el proyecto
            owner: {
                allowNull: false,
                type: Sequelize.INTEGER
            },
            /**
             * Estados posibles:
             * - proposal:1
             * - planning: 2
             * - aproved: 3
             * - in-progress: 4
             * - on-pause: 5
             * - finished: 6
             * - cancelled: 7
             */
            status: {
                allowNull: false,
                type: Sequelize.TINYINT
            },
            // No se soporta eliminación real
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
                allowNull: false,
                type: Sequelize.DATE
            },
            deletedAt: {
                allowNull: false,
                type: Sequelize.DATE
            }
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('project');
    }
};