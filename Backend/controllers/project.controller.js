import projectModel from '../models/project.model.js'
import * as projectService from '../services/project.service.js'
import { validationResult } from 'express-validator'
import userModel from '../models/user.models.js';

export const createProject = async (req, res) => {
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { name } = req.body;
        const loggedInUserId = await userModel.findOne({ email: req.user.email }).select('_id');
        const userId = loggedInUserId._id;

        const newProject = await projectService.createProject( name, userId );
        res.status(201).json({ project: newProject });


    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}

export const getAllProject = async (req, res) => {
    try {
       const loggedInUser = await userModel.findOne({
         email: req.user.email

         })

        const allUserProjects = await projectService.getAllProjects(loggedInUser._id);
        res.status(200).json({ projects: allUserProjects });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}

export const addUserToProject = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { projectId, users } = req.body;
        const loggedInUserId = await userModel.findOne({ email: req.user.email }).select('_id');
        
        const project = await projectService.addUsersToProject({ 
            projectId,
            users,
            userId: loggedInUserId._id
        });

        res.status(200).json({ project }); // ← this was missing!

    } catch (error) {   
        console.error(error);
        res.status(400).json({ error: error.message });
    }
}

export const getProjectById = async (req, res) => {
    try {
        const { projectId } = req.params;
        const loggedInUserId = await userModel.findOne({ email: req.user.email }).select('_id');
        const project = await projectService.getProjectById({ projectId, userId: loggedInUserId._id });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.status(200).json({ project });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
}

export const updateFileTree = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { projectId, fileTree } = req.body;

        const project = await projectService.updateFileTree({
            projectId,
            fileTree
        });

        res.status(200).json({ project });

    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
}