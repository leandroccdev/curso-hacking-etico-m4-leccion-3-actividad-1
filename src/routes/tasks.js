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
    detect_authorization_xss,
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
 * Lista todas las tareas que el usuario pueda visualizar
 */
router.get(
    '/',
    detect_authorization_xss,
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

            // Consulta las tareas de acuerdo a la id del usuario
            let tasks = null;

            // Admin ve todas las tareas
            if (user.role === user_roles.administrator) {
                devlog('Listing as admin');
                tasks = await db.Task.findAll({
                    attributes: [
                        'id',
                        'title',
                        'description',
                        'progress',
                        'projectId',
                        'userAuthor',
                        'userExecutor',
                        'status'
                    ],
                    where: {
                        isDeleted: false
                    }
                });
            }

            // Listar como otro usuario
            else {
                devlog('Listing as another user');
                tasks = await db.Task.findAll({
                    attributes: [
                        'id',
                        'title',
                        'description',
                        'progress',
                        'projectId',
                        'userAuthor',
                        'userExecutor',
                        'status'
                    ],
                    where: {
                        isDeleted: false,
                        [Op.or]: [
                            {
                                userAuthor: user.id,
                            },
                            {
                                userExecutor: user.id
                            }
                        ]
                    }
                });
            }

            // No se pudieron obtener las tareas
            if(!tasks)
                return next(create_error(500, "The request couldn't be processed."));

            return res.status(200).json({
                tasks: tasks
            });
        } catch (err) {
            if (IS_DEV)
                return next(create_error(err.status, err.message));
            else
                return next(create_error(500, "The request couldn't be processed."));
        }
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
                return next(create_error(500, "The request couldn't be processed."));

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
                return next(create_error(err.status, err.message));
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
    detect_authorization_xss,
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
                return next(create_error(err.status, err.message));
            else
                return next(create_error(500, "The request couldn't be processed."));
        }
    }
);

/**
 * Permite asignar/reasignar un usuario a una tarea
 * 
 * La Asignación solo es posible en los siguientes estados:
 * - open: 1
 * Objeto esperado
 * {
 *      "userId": integer
 * }
 */
router.put(
    '/:id/user',
    detect_authorization_xss,
    detect_body_xss,
    auth_verify,
    required_role([
        user_roles.administrator,
        user_roles.editor
    ]),
    async (req, res, next) => {
        try {
            let id = req.params.id;
            let user_id = req.body.userId;

            // No viene userId
            if (!user_id)
                return next(create_error(400, "The field 'userId' is required."));

            // Verificar XSS en id
            if (id !== escape_html(id))
                return next(create_error(500, "The request couldn't be processed."));

            // Sanitizar user Id
            user_id  = escape_html(user_id);

            // Verifica que la tarea exista
            const task = await db.Task.findByPk(id, {
                where: {
                    isDeleted: false
                }
            });
            // Tarea no existe
            if (!task)
                return next(create_error(404, 'Task was not found'));

            // Verificar el estado de la tarea

            // No recibe asignaciones cuando ha sido cancelada
            if (task.status === task_status.cancelled)
                return next(create_error(409, "The task was cancelled."))

            // No recibe reasignaciones luego de ser asignada
            if (task.status !== task_status.open)
                return next(create_error(409, "The task can't receive an executor reasignation after starting."));

            // Buscar el usuario
            const user = await db.User.findByPk(user_id);
            // No se encontró el usuario
            if (!user)
                return next(create_error(500, "The request couldn't be processed."));

            // Asignar la tarea al usuario
            task.userExecutor = user_id;
            await task.save();

            // Asignación exitosa
            res.status(204).send();
        } catch (err) {
            if (IS_DEV)
                return next(create_error(err.status, err.message));
            else
                return next(create_error(500, "The request couldn't be processed."));
        }
    }
);

/**
 * Gestiona la edición de una tarea
 * 
 * La edición es posible en los siguientes estados
 * - open: 1
 * El cambio de proyecto solo es posible cuando el proyecto tiene los siguientes estados:
 * - proposal: 1
 * - planning: 2
 * Objeto esperado
 * {
 *      "title": string,
 *      "description": string,
 *      "projectId": integer,
 *      "status": string
 * }
 * 
 * Restricciones:
 * - El usuario debe ser el author del proyecto y de la tarea
 * 
 * El campo userExecutor se edita vía put /task/:id/user
 * El campo progress se edita via put /task/:id/progress
 * El campo userAuthor no es editable
 */
router.put(
    '/:id',
    detect_authorization_xss,
    detect_body_xss,
    auth_verify,
    required_role([
        user_roles.administrator,
        user_roles.editor
    ]),
     async (req, res, next) => {
        try {
            const task_id = req.params.id;
            let {
                title,
                description,
                projectId,
                status
            } = req.body;

            // Detectar XSS en task_id
            if (task_id !== escape_html(task_id))
                return next(create_error(500, "The request couldn't be processed."));

            // Campos vacíos
            if (!title || !description || !projectId || !status)
                return next(create_error(400, 'All fields are required.'));

            // Sanitizar campos
            title = escape_html(title);
            description = escape_html(description);
            projectId = escape_html(projectId);
            status = escape_html(status);

            // Decodifica el token
            const decoded_token = get_decoded_token(req.headers.authorization);

            // Buscar usuario de la sesión
            // Consulta el id del usuario
            const user = await db.User.findOne({
                where: {
                    username:decoded_token.username
                }
            });
            // No se encontró el usuario
            if (!user)
                return next(create_error(500, "The request couldn't be processed."));

            // Buscar proyecto
            devlog('Buscar proyecto');
            const project = await db.Project.findOne({
                where: {
                    [Op.and]: [
                        { id: projectId },
                        { isDeleted: false },
                        { userOwner: user.id }
                    ]
                }
            });
            // No existe
            if (!project)
                return next(create_error(404, "Project was not found."));

            // Buscar tarea
            devlog('Buscar tarea');
            const task = await db.Task.findOne({
                where: {
                    id: task_id,
                    isDeleted: false,
                    userAuthor: user.id
                }
            });
            // No existe
            if (!task)
                return next(create_error(404, "Task was not found."));

            // Verificar estado de la tarea
            if (task.status !== task_status.open)
                return next(create_error(409, "The task doesn't receive any modifications."));

            // Verificar si hay cambio de proyecto
            if (task.projectId !== projectId) {
                // Verificar si proyecto objetivo recive tareas
                const edit_allowed_in = [
                    project_status.proposal,
                    project_status.planning
                ];
                if (!edit_allowed_in.includes(project.status))
                    return next(create_error(409, "The project doesn't receive any more tasks."));
            }

            // Proceder con el update
            await task.update({
                title:       title,
                description: description,
                projectId:   projectId,
                status:      status
            });

            // Modificación exitosa
            return res.status(204).send();
        } catch (err) {
            if (IS_DEV)
                return next(create_error(err.status, err.message));
            else
                return next(create_error(500, "The request couldn't be processed."));
        }
    }
);

module.exports = router;