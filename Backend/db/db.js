import mongoose from "mongoose";



console.log('MONGO_URI:', process.env.MONGO_URI) // Debugging line to check the value of MONGO_URI

function connectDB() {
    mongoose.connect(process.env.MONGO_URI).then(() => {
        console.log('Connected to MongoDB')
    }).catch((err) => {
        console.error('Error connecting to MongoDB', err)
    })
}

export default connectDB;