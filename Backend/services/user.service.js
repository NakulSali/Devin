import userModel from "../models/user.models.js";
import bcrypt from "bcryptjs";

export const createUser = async (email, password) => {
    if (!email || !password) {
        throw new Error('Email and password are required');
    }

    // check if user already exists
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
        throw new Error('User already exists');
    }

    // hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create the user
    const user = await userModel.create({
        email,
        password: hashedPassword
    });

    return user;
}

export const getAllUsers = async ({ userId }) => {
    const users = await userModel.find({ _id: { $ne: userId } }).select('-password');
    return users;
}