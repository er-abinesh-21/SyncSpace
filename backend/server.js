import express from 'express';
import http from 'http';
import { Server as socketIo } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.static('uploads')); // Serve uploaded files

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads'); // Specify the directory to save uploaded files
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // Use the original file name
    }
});

const upload = multer({ storage: storage });

app.post('/upload', upload.single('file'), (req, res) => {
    res.send('File uploaded successfully!');
});

const server = http.createServer(app);
const io = new socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('edit', (content) => {
        socket.broadcast.emit('updateContent', content);
    });

    socket.on('bold', (bold) => {
        socket.broadcast.emit('updateStyleBold', bold);
    });

    socket.on('italic', (italic) => {
        socket.broadcast.emit('updateStyleItalic', italic);
    });

    socket.on('underline', (underline) => {
        socket.broadcast.emit('updateStyleUnderline', underline);
    });

    socket.on('draw', (data) => {
        socket.broadcast.emit('draw', data);
    });

    socket.on('undo', () => {
        socket.broadcast.emit('undo'); // Broadcast undo action
    });

    socket.on('redo', () => {
        socket.broadcast.emit('redo'); // Broadcast redo action
    });

    socket.on('clear', () => {
        socket.broadcast.emit('clear'); // Broadcast clear action
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
