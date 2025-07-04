require('dotenv').config();
const create_error = require('http-errors');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const escape_html = require('escape-html');
const { get_now } = require('../util/datetime');
const { devlog, deverr } = require('../util/devlog');
const db = require('../models/index');
const role = require('./role');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRE_IN = process.env.JWT_EXPIRE_IN;
const JWT_ALGORITHM = process.env.JWT_ALGORITHM;

/**
 * Middleware para verificar el token jwt y comprueba la sesión en base de datos.
 */
async function auth_verify(req, res, next) {
    try {
        // No viene Authorization en los headers
        if (!req.headers?.authorization)
            return next(create_error(401, "'Authorization' is missing."));

        // Parsea el token jwt
        const token = parse_token(req.headers?.authorization);
        if (!token)
            return next(create_error(400, 'Invalid token format.'))

        // Decodifica el token
        const decoded_token = decode(token);

        // Busca la sesion por id
        const user_session = await db.Session.findOne({
            where: {
                sessionId: decoded_token.session_id,
                active: true,
                expireAt: {
                    [Op.gt]: get_now()
                }
            }
        });

        // Sesión no encontrada o previamente quemada
        if (!user_session)
            return next(create_error(401, 'Unauthorized.'));

        // Verificación exitosa del token jwt
        next();

    } catch (err) {
        // Captura error de token expirado
        if (err instanceof jwt.TokenExpiredError)
            return next(create_error(401, 'Unauthorized.'));

        deverr(err);
        return next(create_error(400, "The request couldn't be processed."));
    }
}

/**
 * Permite decodificar un token jwt.
 * Si la decodificación falla el error deberá ser procesado externamente.
 * @param {string} token Token jwt a decodificar
 */
function decode(token) {
    return jwt.verify(
        token,
        JWT_SECRET,
        {
            algorithms: [JWT_ALGORITHM]
        }
    );
}

/**
 * Parsea y decodifica el token desde el header Authorization
 * Si el proceso falla, el error deberá ser proesado externamente
 * @param {string} authorization 
 * @returns el token decodificado o false
 */
function get_decoded_token(authorization) {
    const token = parse_token(authorization);
    if (!token)
        return false;

    return decode(token);
}

/**
 * Parsea el jwt token desde el header Authorization
 * @param {string} authorization Header Authorization
 * @returns jwt token o false
 */
function parse_token(authorization) {
    // No viene el header
    if (!authorization)
        return false;

    const token_match = authorization.match(/bearer ([a-z0-9_\-\.]*\.[a-z0-9_\-\.]*\.[a-z0-9_\-\.]*)/i);
    // No se puedo parsear el header
    if (!token_match)
        return false;

    return token_match[1];
}

/**
 * Middleware verifica el rol de usuario requerido o arroja un 403
 * @param {array} roles Los roles a verificar
 */
function required_role(roles) {
    return (req, res, next) => {
        const decoded_token = get_decoded_token(req.headers?.authorization);

        if (!roles.includes(decoded_token.role))
            return next(create_error(403, 'Forbidden.'));
        next();
    };
}

module.exports = {
    auth_verify: auth_verify,
    decode: decode,
    get_decoded_token: get_decoded_token,
    parse_token: parse_token,
    required_role: required_role
};