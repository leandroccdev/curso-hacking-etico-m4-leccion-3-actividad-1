'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = (process.env.NODE_ENV || 'development').toUpperCase();
const db = {};

const DB_NAME = process.env[`${env}.DB_NAME`];
const DB_USER = process.env[`${env}.DB_USER`];
const DB_PASSWORD = process.env[`${env}.DB_PASSWORD`];
const DB_PORT = process.env[`${env}.DB_PORT`];
const DB_HOST = process.env[`${env}.DB_HOST`];

// Inicializa la conexión a MySQL
let sequelize = new Sequelize(
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
    {
        host: DB_HOST,
        dialect: 'mysql',
        port: DB_PORT | 3306,
        // Habilita logging de SQL para ambiente de desarrollo
        logging: env.toLocaleLowerCase() === 'development' ? console.log : false
    }
);

// Testea la conexión a MySQL
sequelize.authenticate().catch(err => {
    process.stdout.write("\n[MySQL Error]: " + err.original.sqlMessage + "\n\n");
    process.exit(1);
});

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
