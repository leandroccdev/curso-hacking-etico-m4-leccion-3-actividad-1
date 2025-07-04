'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        return queryInterface.bulkInsert(
            'user_role',
            [
                {
                    name: 'Administrator',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    name: 'Editor',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    name: 'Normal User',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ]
        );
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.bulkDelete('user_role', null, {});
    }
};
