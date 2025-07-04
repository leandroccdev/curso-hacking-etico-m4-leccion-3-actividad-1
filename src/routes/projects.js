require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const create_error = require('http-errors');
const escape_html = require('escape-html');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../models/index');
const { devlog, deverr } = require('../util/devlog');
const { get_now } = require('../util/datetime');
const {
    detect_authorization_xss,
    detect_body_xss,
    sanitize_body
} = require('../util/xss_util');
const user_roles = require('../util/role');
const project_status = require('../util/project');
const {
    auth_verify,
    get_decoded_token,
    required_role
} = require('../util/jwt');

/**
 * Lista los estados posibles para un proyecto.
 */
router.get(
    '/status',
    auth_verify,
    (req, res, next) => {
        return res.status(200).json({
            project: {
                status: project_status
            }
        });
    }
);

/**
 * Permite crear un proyecto.
 * 
 * Rol requerido: administrador, editor
 * 
 * Objeto esperado:
 * {
 *      "title": string,
 *      "description": string,
 * }
 * 
 * Estado por defecto: 1 (proposal)
 * Owner por defecto: usuario actual
 */
router.post(
    '/',
    detect_authorization_xss,
    detect_body_xss,
    auth_verify,
    required_role([
        user_roles.administrator,
        user_roles.editor
    ]),
    sanitize_body,
    async (req, res, next) => {
        let { title, description } = req.body;

        // Campos vacíos
        if (!title || !description)
            return next(create_error(400, 'All fields are required.'));

        // Sanitizado de campos
        title = escape_html(title);
        description = escape_html(description);

        // Decodifica el token para obtener el usuario
        const decoded_token = get_decoded_token(req.headers?.authorization);

        // Obtiene el usuario
        const user = await db.User.findOne({
            where: {
                username: decoded_token.username
            }
        });
        // No se encontró el usuario
        if (!user)
            return next(create_error(500, "The request couldn't be processed."))

        // Crear nuevo proyecto
        const project = await db.Project.create({
            title: title,
            description: description,
            userOwner: user.id,
            status: project_status.proposal
        });
        // No se pudo crear el proyecto
        if (!project)
            return next(create_error(500, "The request couldn't be processed."));

        // Proyecto creado
        return res.status(200).json({
            project: {
                id: project.id,
                title: project.title,
                description: project.description,
                status: project.status,
                owner: project.owner
            }
        });
    }
);

/**
 * Permite actualizar un proyecto
 * 
 * Objeto esperado:
 * {
 *      "id": integer, // campo requerido
 *      "title": string, // opcional
 *      "description": string, // opcional
 *      status: integer // opcional
 * }
 */
router.put(
    '/',
    detect_authorization_xss,
    detect_body_xss,
    auth_verify,
    required_role([
        user_roles.administrator,
        user_roles.editor
    ]),
    sanitize_body,
    async (req, res, next) => {
        try {
            const {id, title, description, status} = req.body;

            if (!id)
                return next(create_error(400, "'id' field is required."));

            // Obtiene el token decodificado
            const decoded_token = get_decoded_token(req.headers?.authorization);

            // Obtiene el proyecto para realizar la edición
            const project = await db.Project.findByPk(id);

            // No se encontró el proyecto
            if (!project)
                return next(create_error(404, 'Resource not found.'));

            // Actualiza todos los campos con cambios menos el id
            await project.update({
                title: title,
                description: description,
                status: status
            });

            res.status(200).json();
        } catch (err) {
            next(create_error(err.status, err.message));
        }
    }
);

module.exports = router;