import userModel from "../models/user.models.js";
import { validationResult } from "express-validator";
import * as userservice from "../services/user.service.js"
import redisClient from "../services/redis.service.js";

export const createUserController = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email, password } = req.body;
        const user = await userservice.createUser(email, password);
        const token = user.generateToken();

        delete user._doc.password; // Remove password from response

        res.status(201).json({ user, token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

export const loginUserController = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;
        const user = await userModel.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isMatch = await user.isValidatePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = user.generateToken();


        delete user._doc.password; // Remove password from response

        
        res.status(200).json({ user, token });

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

export const ProfileController = async (req, res) => {
    try {
        const user = await userModel.findById(req.user.id);
        res.status(200).json({ user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

export const logoutUserController = async (req, res) => {
    try {
        const token = req.cookies.token || req.headers.authorization.split(' ')[1];
        if (token) {
            await redisClient.set(token, 'blacklisted', 'EX', 60 * 60 * 24); // Blacklist token for 24 hours
        }
        res.clearCookie('token');
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

export const getAllUsersController = async (req, res) => {
    try {

        const loggedInUser = await userModel.findOne({
            email: req.user.email
        });

        const allUsers = await userservice.getAllUsers({ userId: loggedInUser._id });

        res.status(200).json({ users: allUsers });

        
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}
