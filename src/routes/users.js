require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const create_error = require('http-errors');
const escape_html = require('escape-html');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../models/index');
const { devlog, deverr } = require('../util/devlog');
const { detect_body_xss, sanitize_body } = require('../util/xss_util');
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
router.post('/register', detect_body_xss, sanitize_body, async (req, res, next) => {
    let { username, password } = req.body;

    // No se recibieron los campos
    if (!username || !password)
        return next(create_error(400, 'All fields are required.'));

    // Sanitizado
    username = escape_html(username);
    password = escape_html(password);

    // Valida largo de contraseña
    if (PASSWORD_MIN_LENGTH > password.length)
        return next(create_error(400, `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`));

    try {
        // Generación de contraseña
        let salt = await bcrypt.genSaltSync(BCRYPT_SALT_ITERATIONS)
        let password_hash = bcrypt.hashSync(password, salt);

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

/**
 * Permite la autenticación de usuarios.
 * Nota: las sesiones previamente creadas no se queman.
 * 
 * Objeto esperado:
 * {
 *      "username": "",
 *      "password": ""
 * }
 */
router.post('/auth', detect_body_xss, sanitize_body, async (req, res, next) => {
        let { username, password } = req.body;

    // No se recibieron los campos
    if (!username || !password) {
        return next(create_error(400, 'All fields are required.'));
    }

    // Sanitizado
    username = escape_html(username);
    password = escape_html(password);

    const auth_err = create_error(401, 'Invalid credentials.');

    try {
        // Busca nombre de usuario
        const is_username_exists = await db.User.count({
            where: {
                username: username
            }
        }) > 0;

        // Usuario ya exsite
        if (!is_username_exists)
            return next(auth_err);

        // Recupera contraseña desde mysql
        const user = await db.User.findOne({
            attributes: [ 'id', 'password_hash', 'role' ],
            where: {
                username: username
            }
        });

        // No se encontró el user
        if (!user)
            return next(auth_err);

        // Comapra contraseñas
        const is_password_ok = bcrypt.compareSync(password, user.password_hash);
        if (!is_password_ok)
            return next(auth_err);

        // Autenticación exitosa, generación de sesion y token
        const session_id = uuidv4();
        const token = jwt.sign(
            {
                role: user.role,
                session_id: session_id,
                username: user.username,
            },
            JWT_SECRET,
            {
                algorithm: JWT_ALGORITHM,
                expiresIn: JWT_EXPIRE_IN
            }
        );
        const decoded_token = jwt.verify(
            token,
            JWT_SECRET,
            {
                algorithms: [JWT_ALGORITHM]
            }
        );
        // Crea la sesión en mysql
        await db.Session.create({
            active: true,
            expireAt: decoded_token.exp,
            userId: user.id,
            sessionId: session_id,
            token: token
        });

        // Calcula el tiempo de exp del token jwt
        const expires_in = decoded_token.exp - Math.floor(Date.now() / 1000);

        return res.status(200).json({
            auth_token: {
                token: token,
                expires_in: expires_in
            },
            user: {
                username: username,
                role: decoded_token.role
            }
        });
    } catch (err) {
        deverr(err);
        return next(auth_err);
    }
});

module.exports = router;