import projectModel from "../models/project.model.js"; 
import mongoose from "mongoose";



export const createProject = async (name, userId) => {

    if (!name) {
        throw new Error('Project name is required');
    }

    if (!userId) {
        throw new Error('User ID is required');
    }

    let project;
    try {
        project = await projectModel.create({
            name,
            users: [userId]
        });
    } catch (error) {
        if (error.code === 11000) {
            throw new Error('Project name must be unique');
        }
        throw new Error('Error creating project');
    }

    return project; 
}

export const getAllProjects = async (userId) => {
    if (!userId) {
        throw new Error('User ID is required');
    }
    const allUserProjects = await projectModel.find({ users: userId });
    return allUserProjects;
}

export const addUsersToProject = async ({ projectId, users, userId }) => {

    if (!projectId) {
        throw new Error("projectId is required")
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error("Invalid projectId")
    }

    if (!users) {
        throw new Error("users are required")
    }

    if (!Array.isArray(users) || users.some(userId => !mongoose.Types.ObjectId.isValid(userId))) {
        throw new Error("Invalid userId(s) in users array")
    }

    if (!userId) {
        throw new Error("userId is required")
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error("Invalid userId")
    }


    const project = await projectModel.findOne({
        _id: projectId,
        users: userId
    })

    console.log(project)

    if (!project) {
        throw new Error("User not belong to this project")
    }

    const updatedProject = await projectModel.findOneAndUpdate({
        _id: projectId
    }, {
        $addToSet: {
            users: {
                $each: users
            }
        }
    }, {
        new: true
    })

    return updatedProject



}


export const getProjectById = async ({ projectId, userId }) => {

    if (!projectId) {
        throw new Error("projectId is required")
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error("Invalid projectId")
    }

    const project = await projectModel.findOne({
        _id: projectId,
        users: userId
    }).populate('users', '-password');

    return project;
}

export const updateFileTree = async ({ projectId, fileTree }) => {
    if (!projectId) {
        throw new Error("projectId is required")
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error("Invalid projectId")
    }

    if (!fileTree) {
        throw new Error("fileTree is required")
    }

    const updatedProject = await projectModel.findOneAndUpdate(
        { _id: projectId },
        { fileTree },
        { new: true }
    )

    return updatedProject
}

export const saveMessages = async ({ projectId, messages }) => {
    if (!projectId) throw new Error('projectId is required')
    if (!mongoose.Types.ObjectId.isValid(projectId)) throw new Error('Invalid projectId')
    if (!Array.isArray(messages) || messages.length === 0) throw new Error('messages must be a non-empty array')

    const updatedProject = await projectModel.findByIdAndUpdate(
        projectId,
        { $push: { messages: { $each: messages } } },
        { new: true }
    )

    return updatedProject
}

export const getMessages = async ({ projectId }) => {
    if (!projectId) throw new Error('projectId is required')
    if (!mongoose.Types.ObjectId.isValid(projectId)) throw new Error('Invalid projectId')

    const project = await projectModel.findById(projectId).select('messages')
    return project ? project.messages : []
}