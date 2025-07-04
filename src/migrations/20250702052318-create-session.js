'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('session', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            userId: {
                allowNull: false,
                references: {
                    model: 'user',
                    key: 'id'
                },
                onUpdat: 'RESTRICT',
                onDelete: 'RESTRICT',
                type: Sequelize.INTEGER
            },
            sessionId: {
                allowNull: false,
                type: Sequelize.STRING(36)
            },
            token: {
                allowNull: false,
                type: Sequelize.TEXT
            },
            active: {
                allowNull: false,
                defaultValue: true,
                type: Sequelize.BOOLEAN
            },
            expireAt: {
                allowNull: false,
                type: Sequelize.INTEGER
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
        await queryInterface.dropTable('session');
    }
};