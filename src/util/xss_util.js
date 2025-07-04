var create_error = require('http-errors');
const escape_html = require('escape-html');

/**
 * Middleware para detectar XSS usando escape_html
 */
function detect_body_xss(req, res, next) {
    for (const k of Object.keys(req.body)) {
        const escaped_field = escape_html(req.body[k]);
        const field = req.body[k].toString();

        if (escaped_field !== field)
            return next(create_error(400, "The request couldn't be processed."))
    }
    next();
}

/**
 * Middleware para detectar XSS en la cabecera Authorization
 */
function detect_authorization_xss(req, res, next) {
    const authorization = req.headers?.authorization || null;

    if (authorization && escape_html(authorization) !== authorization)
        return next(create_error(400, "The request couldn't be processed."));

    next();
}

/**
 *  Middleware para sanitizar los campos de req.body.
 * 
 * La sanitización se realiza con el modulo escape-html.
 */
function sanitize_body(req, res, next) {
    for (const k of Object.keys(req.body))
        req.body[k] = escape_html(req.body[k]);
    next();
}

module.exports = {
    detect_authorization_xss: detect_authorization_xss,
    detect_body_xss: detect_body_xss,
    sanitize_body: sanitize_body
};