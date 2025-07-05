require('dotenv').config();
const express = require('express');
const create_error = require('http-errors');
const escape_html = require('escape-html');
const { Op } = require('sequelize');
const router = express.Router();
const db = require('../models/index');
const { devlog, deverr } = require('../util/devlog');
const {
    detect_authorization_xss,
    detect_body_xss,
    sanitize_body
} = require('../util/xss_util');
const user_roles = require('../util/role');
const project_status = require('../util/project');
const task_status = require('../util/task');
const {
    auth_verify,
    get_decoded_token,
    required_role
} = require('../util/jwt');

const IS_DEV = process.env.NODE_ENV === 'development';

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
 * Lista todos los proyectos a los que el usuario tiene acceso.
 */
router.get(
    '/',
    auth_verify,
    required_role([
        user_roles.administrator,
        user_roles.editor,
        user_roles.normalUser
    ]),
    async (req, res, next) => {
        try {
            // Decodifica el token
            const decoded_token = get_decoded_token(req.headers.authorization);

            // Consulta el id del usuario
            const user = await db.User.findOne({
                where: {
                    username:decoded_token.username
                }
            });
            // No se encontró el usuario
            if (!user)
                return next(create_error(500, "The request couldn't be processed."));

            let projects = null;
            // Consulta todos los proyectos en la bd
            if (user.role == user_roles.administrator) {
                devlog('Listing as admin');
                projects = await db.Project.findAll({
                    attributes: ['id', 'title', 'description', 'userOwner', 'status'],
                    where: {
                        isDeleted: false
                    }
                });
            }
            // Consultar solo los proyectos del usuario activo
            else {
                devlog('Listing as other user');
                projects = await db.Project.findAll({
                    attributes: ['id', 'title', 'description', 'userOwner', 'status'],
                    where: {
                        userOwner: user.id,
                        isDeleted: false
                    }
                });
            }

            // No se pudieron obtener los proyectos
            if (!projects)
                return next(create_error(500, "The request couldn't be processed."));

            return res.status(200).json({
                projects: projects
            });
        } catch (err) {
            if (IS_DEV)
                next(create_error(err.status, err.message));
            else
                return next(create_error(500, "The request couldn't be processed."));
        }
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
        try {
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
        } catch (err) {
            if (IS_DEV)
                next(create_error(err.status, err.message));
            else
                return next(create_error(500, "The request couldn't be processed."));
        }
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
            if (IS_DEV)
                next(create_error(err.status, err.message));
            else
                return next(create_error(500, "The request couldn't be processed."));
        }
    }
);

/**
 * Gestiona la eliminación de proyectos.
 * 
 * Nota: solo para administradores.
 */
router.delete(
    '/:id',
    auth_verify,
    required_role([
        user_roles.administrator
    ]),
    async (req, res, next) => {
        try {
            let id = req.params.id;

            // Detectar XSS
            if (escape_html(id) !== id)
                return next(create_error(500, "The request couldn't be processed."));

            // Sanitizar id
            id = escape_html(id);
    
            // Verificar si el proyecto existe
            const project = await db.Project.findByPk(id, {
                where: {
                    isDeleted: false
                }
            });
            // No existe
            if (!project)
                return next(create_error(404, 'Resource not found'));

            // Verificar si tienes tareas no cerradas
            const tasks = await db.Task.findAll({
                where: {
                    projectId: id,
                    isDeleted: false,
                    status: {
                        [Op.ne]: task_status.closed,
                        [Op.ne]: task_status.cancelled
                    }
                }
            });
            // Existen tareas activas en el proyecto
            if (tasks.length > 0)
                return next(create_error(409, 'Cannot delete a project with active tasks.'))
    
            // Realiza la eliminación
            await project.destroy();

            res.status(204).send();
        } catch (err) {
            if (IS_DEV)
                next(create_error(err.status, err.message));
            else
                return next(create_error(500, "The request couldn't be processed."));
        }
    }
);

module.exports = router;