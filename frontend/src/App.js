
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const socket = io('https://syncspace-backend-1r7f.onrender.com');

const App = () => {
    const [content, setContent] = useState('');
    const [bold, setBold] = useState(false);
    const [italic, setItalic] = useState(false);
    const [underline, setUnderline] = useState(false);
    const canvasRef = useRef(null);
    const isDrawing = useRef(false);

    // State to manage drawing history
    const [drawings, setDrawings] = useState([]); // All drawings
    const [currentPath, setCurrentPath] = useState([]); // Current drawing path
    const [history, setHistory] = useState([]); // History for undo
    const [redoStack, setRedoStack] = useState([]); // Stack for redo

    useEffect(() => {
        socket.on('updateContent', (updatedContent) => {
            setContent(updatedContent);
        });

        socket.on('updateStyleBold', (bold) => {
            setBold(bold);
        });

        socket.on('updateStyleItalic', (italic) => {
            setItalic(italic);
        });

        socket.on('updateStyleUnderline', (underline) => {
            setUnderline(underline);
        });

        socket.on('draw', (data) => {
            const ctx = canvasRef.current.getContext('2d');
            ctx.strokeStyle = data.color;
            ctx.lineWidth = data.size;
            ctx.lineTo(data.x, data.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(data.x, data.y);
        });

        socket.on('undo', () => {
            handleUndo(true); // Call handleUndo with broadcast
        });

        socket.on('redo', () => {
            handleRedo(true); // Call handleRedo with broadcast
        });

        socket.on('clear', () => {
            handleClear(true); // Call handleClear with broadcast
        });

        return () => {
            socket.off('updateContent');
            socket.off('updateStyleBold');
            socket.off('updateStyleItalic');
            socket.off('updateStyleUnderline');
            socket.off('draw');
            socket.off('undo');
            socket.off('redo');
            socket.off('clear');
        };
    }, []);

    const handleEdit = (event) => {
        const updatedContent = event.target.value;
        setContent(updatedContent);
        socket.emit('edit', updatedContent);
    };

    const handleBold = () => {
        const newBoldState = !bold;
        setBold(newBoldState);
        socket.emit('bold', newBoldState);
    };

    const handleItalic = () => {
        const newItalicState = !italic;
        setItalic(newItalicState);
        socket.emit('italic', newItalicState);
    };

    const handleUnderline = () => {
        const newUnderlineState = !underline;
        setUnderline(newUnderlineState);
        socket.emit('underline', newUnderlineState);
    };

    const handleDownload = () => {
        const blob = new Blob([content], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'document.txt';
        link.click();
    };

    const startDrawing = (e) => {
        const x = e.nativeEvent.offsetX;
        const y = e.nativeEvent.offsetY;
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(x, y);
        isDrawing.current = true;
        setCurrentPath([{ x, y }]); // Start new path
    };
    
    const draw = (e) => {
        if (!isDrawing.current) return;
    
        const x = e.nativeEvent.offsetX;
        const y = e.nativeEvent.offsetY;
    
        socket.emit('draw', { x, y, color: 'white', size: 1 }); // Customize color and size as needed
    
        const ctx = canvasRef.current.getContext('2d');
        ctx.lineTo(x, y);
        ctx.stroke();
        setCurrentPath((prev) => [...prev, { x, y }]); // Update current path
    };
    
    const stopDrawing = () => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.closePath();
        isDrawing.current = false;

        // Save the completed path to drawings and history
        setDrawings((prev) => [...prev, currentPath]);
        setHistory((prev) => [...prev, currentPath]);
        setRedoStack([]); // Clear redo stack on new drawing
    };

    const handleUndo = (isBroadcast = false) => {
        if (history.length === 0) return;

        const lastDrawing = history[history.length - 1];
        setRedoStack((prev) => [...prev, lastDrawing]); // Add last drawing to redo stack
        setHistory((prev) => prev.slice(0, -1)); // Remove last drawing from history
        redrawCanvas(history.slice(0, -1)); // Redraw the canvas excluding the last drawing

        if (!isBroadcast) {
            socket.emit('undo'); // Broadcast undo action
        }
    };

    const handleRedo = (isBroadcast = false) => {
        if (redoStack.length === 0) return;

        const nextDrawing = redoStack[redoStack.length - 1];
        setHistory((prev) => [...prev, nextDrawing]); // Add to history
        setRedoStack((prev) => prev.slice(0, -1)); // Remove from redo stack
        redrawCanvas([...history, nextDrawing]); // Redraw the canvas with the next drawing

        if (!isBroadcast) {
            socket.emit('redo'); // Broadcast redo action
        }
    };

    const handleClear = (isBroadcast = false) => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); // Clear the canvas
        setDrawings([]); // Clear drawings
        setHistory([]); // Clear history
        setRedoStack([]); // Clear redo stack

        if (!isBroadcast) {
            socket.emit('clear'); // Broadcast clear action
        }
    };

    const redrawCanvas = (drawingsToRedraw) => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); // Clear the canvas

        drawingsToRedraw.forEach(path => {
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            path.forEach(point => {
                ctx.lineTo(point.x, point.y);
                ctx.stroke();
            });
        });
    };

    return (
        <div className="App">
            
            <div className='title'> <img className='logo' src='https://img.icons8.com/?size=50&id=WmOQrQ3SWxoJ&format=png&color=000000' alt='#'/> <h1 className='sync'>Sync</h1>  <h1 className='space'>Space</h1> <h1 className='realtime'> - Realtime Collaborative Editor</h1> </div>

            <div className='text-controls'>
                <button className='bold' onClick={handleBold}> <img src='https://img.icons8.com/?size=40&id=jPI1759X0CCN&format=png&color=000000' alt='bold'/> </button>
                <button className='italic' onClick={handleItalic}> <img src='https://img.icons8.com/?size=40&id=Jfv0sBG7oHn6&format=png&color=000000' alt='italic'/> </button>
                <button className='underline' onClick={handleUnderline}> <img src='https://img.icons8.com/?size=40&id=hSxUS8Ou2uxk&format=png&color=000000' alt='underline'/> </button>
            </div>

            <div className='download-container'>
                <button className='download' onClick={handleDownload}><img src='https://img.icons8.com/?size=40&id=cnDcRP3O64a9&format=png&color=000000' alt='#'/> DOWNLOAD</button>
            </div>

            <div className='whiteboard-controls'>
                <button className='undo' onClick={handleUndo}> <img src='https://img.icons8.com/?size=60&id=834&format=png&color=05FF00' alt='undo'/> </button>
                <button className='redo' onClick={handleRedo}> <img src='https://img.icons8.com/?size=60&id=835&format=png&color=05FF00' alt='redo'/> </button>
                <button className='clearall' onClick={handleClear}> <img src='https://img.icons8.com/?size=60&id=GzcCz09Hkfp9&format=png&color=FF0000' alt='clear'/> </button>
            </div>
            
            <div className='text-area-container'> 
            <textarea className='text-area'
                value={content}
                onChange={handleEdit}
                rows={18}
                cols={110}
                style={{
                    fontSize: '25px',
                    fontWeight: bold ? 'bold' : 'normal',
                    fontStyle: italic ? 'italic' : 'normal',
                    textDecoration: underline ? 'underline' : 'none'
                }}
            />
            </div> 

            <hr className='hr-line'/>

            <div className='whiteboard-container'> 
            <canvas
                className='whiteboard'
                ref={canvasRef}
                width={1010}
                height={670}
                style={{ border: '1px solid black' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
            />
            </div> 

        </div>
    );
};

export default App;
