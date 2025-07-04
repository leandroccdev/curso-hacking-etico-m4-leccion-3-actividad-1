'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        return queryInterface.bulkInsert(
            'project',
            [
                {
                    title: "Proyecto ejemplo",
                    description: "Este es un proyecto de ejemplo",
                    owner: 1,
                    status: 3, // aproved
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    title: "Lección 3 - Modulo 4",
                    description: "Representa la lección 3 del modulo 4 de hacking ético",
                    owner: 1,
                    status: 4, // in progress
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ]
        );
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.bulkDelete('project', null, {});
    }
};
