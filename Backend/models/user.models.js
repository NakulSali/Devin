import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        minlength: [5, 'Email must be at least 5 characters long'],
        maxlength: [255, 'Email must be less than 255 characters long'],
        match: [/.+@.+\..+/, 'Please enter a valid email address']
    },
    password: {
        type: String,
        select: false,
        required: true,
        minlength: [6, 'Password must be at least 6 characters long'],
        maxlength: [128, 'Password must be less than 128 characters long']
    }
});

userSchema.statics.hashPassword = async function(password) {
    return await bcrypt.hash(password, 10);
}

userSchema.methods.isValidatePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
}

userSchema.methods.generateToken = function() {
    return jwt.sign(
        { id: this._id, email: this.email },
        process.env.JWT_SECRET,
        { expiresIn: '100h' }
    );
}

const userModel = mongoose.model('User', userSchema);

export default userModel;