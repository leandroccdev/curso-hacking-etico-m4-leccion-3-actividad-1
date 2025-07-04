'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('user', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            username: {
                allowNull: false,
                type: Sequelize.STRING(40)
            },
            password_hash: {
                allowNull: false,
                type: Sequelize.STRING(60)
            },
            role: {
                allowNull: false,
                defaultValue: 3,
                /**
                 * Roles:
                 * 1: administrador
                 * 2: editor
                 * 3: usuario común
                 */
                type: Sequelize.TINYINT.UNSIGNED
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            }
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('user');
    }
};