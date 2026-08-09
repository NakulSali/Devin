import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import connect from './db/db.js'
import userRoutes from './routes/user.routes.js'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import projectRoutes from './routes/project.routes.js'
import aiRoutes from './routes/ai.routes.js'

const app = express()

connect()


app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use('/users', userRoutes)
app.use('/projects', projectRoutes)
app.use('/ai', aiRoutes)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(express.static(path.join(__dirname, 'public')))

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

export default app