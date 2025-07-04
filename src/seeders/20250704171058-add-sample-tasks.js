'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        return queryInterface.bulkInsert(
            'task',
            [
                {
                    title: "Construcción del API de proyectos",
                    description: "Construir el api solicitada en la lección 3 del modulo 4",
                    progress: 40.5,
                    projectId: 2,
                    author: 1,
                    executor: 3,
                    status: 2, // in progress
                    createdAt: new Date()
                },
                {
                    title: "Realización de pruebas para informa",
                    description: "Desarrollar las pruebas solicitadas por el pto. 4 del informea lección 3 modulo 4",
                    progress: 0,
                    projectId: 2,
                    author: 1,
                    executor: 3,
                    status: 1, // open
                    createdAt: new Date()
                },
                {
                    title: "Realización de informe",
                    description: "Realización del informea lección 3 modulo 4",
                    progress: 0,
                    projectId: 2,
                    author: 1,
                    executor: 3,
                    status: 1, // open
                    createdAt: new Date()
                }
            ]
        );
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.bulkDelete('task', null, {});
    }
};
