
import http from 'http'
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import projectModel from './models/project.model.js'
import { getAIResults } from './services/ai.service.js'
import { saveMessages } from './services/project.service.js'

// Normalize sender to only _id + email to avoid schema issues with extra fields
const normalizeSender = (sender) => ({
    _id: String(sender?._id || ''),
    email: sender?.email || ''
})

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

            // Save the user's message to DB
            try {
                const msgToSave = { sender: normalizeSender(data.sender), message: data.message, timestamp: new Date() }
                console.log('[DB SAVE] @ai user message:', JSON.stringify(msgToSave))
                await saveMessages({
                    projectId: socket.project._id.toString(),
                    messages: [msgToSave]
                });
                console.log('[DB SAVE] @ai user message saved OK')
            } catch (e) {
                console.error('Failed to save user message to DB:', e);
            }

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

                const aiMessage = { sender: { _id: 'ai', email: 'ai' }, message: aiResponse, timestamp: new Date() };

                // Save AI response to DB
                try {
                    console.log('[DB SAVE] AI message, length:', aiResponse.length)
                    await saveMessages({
                        projectId: socket.project._id.toString(),
                        messages: [aiMessage]
                    });
                    console.log('[DB SAVE] AI message saved OK')
                } catch (e) {
                    console.error('Failed to save AI message to DB:', e);
                }

                // Send AI response to ALL clients in the room (including sender)
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

        // Save regular (non-AI) user message to DB
        try {
            const msgToSave = { sender: normalizeSender(data.sender), message: data.message, timestamp: new Date() }
            console.log('[DB SAVE] regular message:', JSON.stringify(msgToSave))
            await saveMessages({
                projectId: socket.project._id.toString(),
                messages: [msgToSave]
            });
            console.log('[DB SAVE] regular message saved OK')
        } catch (e) {
            console.error('Failed to save message to DB:', e);
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
