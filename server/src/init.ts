import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

// websocket
const wss = new WebSocketServer({ port: 8080 });

// types
type Square = 'X' | 'O' | '';

// room logic
const waitingRoom: string | null = null;
const rooms: Map<string, {
    players: WebSocket[];
    board: Square[];
    turn: string;
}> = new Map();

// connections
wss.on('connection', (ws) => {
    ws.on('error', console.error);
    ws.send('Server active');

    ws.on('message', (data) => {
        console.log('received: %s', data);
    });
});