'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        return queryInterface.bulkInsert(
            'user',
            [
                {
                    username: "admin",
                    // 2025#he048
                    password_hash: '$2b$10$Livu/kVASTP00Nt.vdX4mudgykvjGtqxBn/IM9snx.8hBFHicQibi',
                    role: 1,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    username: "editor",
                    // 2025#he048
                    password_hash: '$2b$10$DCIteqf.4pDxsyi3rLE20.XKt/kk96.5NQkVgk2PJBqMp9fJ7klSe',
                    role: 2,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    username: "user",
                    // 2025#he048
                    password_hash: "$2b$10$PtMOtSrbC2WKGxv0WS/3e.o2WJb5QYYTjP4EvRyfGGFX5rQ8VAIsm",
                    role: 3,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ]
        );
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.bulkDelete('user', null, {});
    }
};