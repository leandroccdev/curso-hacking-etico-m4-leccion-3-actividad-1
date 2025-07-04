require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const create_error = require('http-errors');
const escape_html = require('escape-html');
const router = express.Router();
const db = require('../models/index');
const { devlog, deverr } = require('../util/devlog');
const { detect_xss, sanitize_body } = require('../util/xss_util');
const role = require('../util/role');

const BCRYPT_SALT_ITERATIONS = parseInt(process.env.SALT_ITERATIONS) || 10;
const PASSWORD_MIN_LENGTH = parseInt(process.env.PASSWORD_MIN_LENGTH);
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRE_IN = process.env.JWT_EXPIRE_IN;
const JWT_ALGORITHM = process.env.JWT_ALGORITHM;
const IS_DEV = process.env.NODE_ENV === 'development';

/**
 * Permite el registro de un usuario
 * 
 * Objeto esperado:
 * {
 *      "username": "",
 *      "password": ""
 * }
 */
router.post('/register', detect_xss, sanitize_body, async (req, res, next) => {
    let { username, password } = req.body;

    // No se recibieron los campos
    if (!username || !password) {
        return next(create_error(400, 'All fields are required.'));
    }

    // Sanitizado
    username = escape_html(username);
    password = escape_html(password);

    // Generación de contraseña
    let salt = await bcrypt.genSaltSync(BCRYPT_SALT_ITERATIONS)
    let password_hash = bcrypt.hashSync(password, salt);

    try {
        // Verifica que el nombre de usuario no exista
        const is_username_exists = await db.User.count({
            where: {
                username: username
            }
        }) > 0;

        // Usuario ya exsite
        if (is_username_exists)
            return next(create_error(400, 'The username already exists.'))

        // Creación del usuario
        let user = await db.User.create({
            username: username,
            password_hash: password_hash,
            role: role.normalUser
        });

        return res.status(201).json({
            user: {
                id: user.id,
                username: user.username
            }
        });
    } catch (err) {
        deverr(err);
        return next(create_error(400, "The request couldn't be processed."));
    }
});

module.exports = router;