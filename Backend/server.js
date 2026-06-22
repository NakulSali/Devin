
import http from 'http'
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import projectModel from './models/project.model.js'
import { getAIResults } from './services/ai.service.js'

import dotenv from 'dotenv'
dotenv.config() // loads .env first

const { default: app } = await import('./app.js') // dynamic import, runs AFTER dotenv

const port = process.env.PORT || 3000




const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: '*'
    }
})


io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        const projectId = socket.handshake.query.projectId;

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return next(new Error('Invalid project ID'));
        }


        socket.project = await projectModel.findById(projectId).select('_id').lean();

        if (!token) {
            return next(new Error('Authentication error: Token not provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded) {
            return next(new Error('Authentication error: Invalid token'));
        }

        socket.user = decoded;


        next();
    } catch (err) {


        console.error('Socket authentication error:', err);
        next(new Error('Authentication error: Invalid token'));
    }
});


io.on('connection', (socket) => {
    console.log('A user connected:', socket.id)

    socket.join(socket.project._id.toString()); // Join the project room


    socket.on('project-message', async (data) => {

        const message = data.message;
        
        const aiIsPresent = message.includes('@ai');

        if (aiIsPresent) {
            // Broadcast the original message to other users in the room
            socket.broadcast.to(socket.project._id.toString()).emit('project-message', data);

            // Call the AI service
            try {
                const prompt = message.replace('@ai', '').trim();
                const aiResponse = await getAIResults(prompt);

                // Try to parse the AI response and save the fileTree to the database
                try {
                    const cleaned = aiResponse.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
                    const parsed = JSON.parse(cleaned);
                    if (parsed.fileTree && Object.keys(parsed.fileTree).length > 0) {
                        await projectModel.findByIdAndUpdate(socket.project._id, {
                            fileTree: parsed.fileTree
                        });
                        console.log(`Saved AI-generated fileTree to database for project: ${socket.project._id}`);
                    }
                } catch (dbErr) {
                    console.error('Failed to parse/save AI-generated file tree:', dbErr);
                }

                // Send AI response to ALL clients in the room (including sender)
                // aiResponse is already a JSON string from the AI (e.g. {"text":"...","fileTree":{...}})
                // Do NOT wrap it again — that would bury the fileTree inside a nested text field
                io.to(socket.project._id.toString()).emit('project-message', {
                    sender: { _id: 'ai' },
                    message: aiResponse
                });
            } catch (err) {
                console.error('AI service error:', err);
                // Send error message back to the sender
                socket.emit('project-message', {
                    sender: { _id: 'ai' },
                    message: JSON.stringify({ text: 'Sorry, AI encountered an error. Please try again.' })
                });
            }

            return;
        }

        // Emit to ALL clients in the room EXCEPT the sender
        // The sender already adds the message locally in the frontend send() function
        socket.broadcast.to(socket.project._id.toString()).emit('project-message', data);
    });


    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        socket.leave(socket.project._id.toString());
    });
});

// Start listening now
server.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})
