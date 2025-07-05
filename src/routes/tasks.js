require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const create_error = require('http-errors');
const escape_html = require('escape-html');
const jwt = require('jsonwebtoken');
const { Op, where } = require('sequelize');
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
const task_status = require('../util/task');
const {
    auth_verify,
    get_decoded_token,
    required_role
} = require('../util/jwt');

const IS_DEV = process.env.NODE_ENV === 'development';

/**
 * Permite listar los estados de las  tareas
 */
router.get(
    '/status',
    auth_verify,
     (req, res, next) => {
            return res.status(200).json({
                project: {
                    status: task_status
                }
            });
        }
);

/**
 * Permite crear una nueva tarea.
 * 
 * Objeto esperado
 * {
 *      "title": string,
 *      "description": string,
 *      "projectId": integer,
 * }
 * 
 * Valores por defecto:
 * - status inicial: 1 (open)
 * - userExecutor: no seteado
 * - progress: 0
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
            let { title, description, progress, projectId } = req.body;

            // Campos vacíos
            if (!title || !description || !projectId)
                return next(create_error(400, 'All fields are required.'));

            // Busca el proyecto
            const project = await db.Project.findByPk(projectId);
            // No se encontró el proyecto
            if (!project)
                return next(create_error(404, 'Project not found.'));

            // Verifica estado del projecto
            // Estado planning no acepta tareas aún
            if (project_status.proposal === project.status)
                return next(create_error(409, "The project doesn't accept tasks yet."))

            // Estados cancelado y finalizado no admiten creación de tareas
            if (project_status.finished === project.status ||
                project_status.cancelled === project.status)
                return next(create_error(409, "The project doesn't accept more tasks."));

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

            // Creación de la tarea
            const task = await db.Task.create({
                title: title,
                description: description,
                progress: 0,
                projectId: projectId,
                status: task_status.open,
                userAuthor: user.id,
                createdAt: new Date()
            });
            // Error al crear tarea
            if (!task)
                return next(create_error(500, "The request couldn't be processed."));

            // Tarea creada
            res.status(200).json({
                task: {
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    progress: task.progress,
                    projectId: task.projectId,
                    status: task.status,
                    userAuthor: task.userAuthor
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
 * Gestiona la eliminación de una tarea
 * La eliminación es posible en los siguientes estados:
 * - open: 1
 * - cancelled: 6
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

            // Verificar is la tarea existe
            const task = await db.Task.findByPk(id, {
                where: {
                    isDeleted: false
                }
            });
            // No existe
            if (!task)
                return next(create_error(404, 'Resource not found'));

            // Verificar estado de tarea
            if (task.status !== task_status.open && task.status !== task_status.cancelled)
                return next(create_error(409, "The task can't be deleted after started."));

            // Eliminar tarea
            task.destroy();

            return res.status(204).send();
        } catch (err) {
            if (IS_DEV)
                next(create_error(err.status, err.message));
            else
                return next(create_error(500, "The request couldn't be processed."));
        }
    }
);

module.exports = router;