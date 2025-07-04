var create_error = require('http-errors');
const escape_html = require('escape-html');

/**
 * Middleware para detectar XSS usando escape_html
 */
function detect_xss(req, res, next) {
    for (const k of Object.keys(req.body))
        if (escape_html(req.body[k]) !== req.body[k])
            return next(create_error(400, "The request couldn't be processed."))
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
    detect_xss: detect_xss,
    sanitize_body: sanitize_body
};