import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

declare module 'ws' {
    interface WebSocket {
        roomId?: string;
        sylbol?: string;
    }
}

const wss = new WebSocketServer({ port: 8080 });

type Square = 'X' | 'O' | '';
let waitingRoom: string | null = null;
const rooms: Map<string, {
    players: WebSocket[];
    board: Square[];
    turn: string;
}> = new Map();

wss.on('connection', (ws) => {
    ws.on('error', console.error);
    ws.on('message', (packet) => {
        let data = JSON.parse(packet.toString());
        switch (data.type) {
            case "search": handleSearch(ws);
            case "movement": handleMove(ws, data);
        }
    });
});

let handleSearch = (player:WebSocket) => {
    if (waitingRoom === null){ 
        const roomId = uuidv4();
        rooms.set(roomId, {
            players: [player],
            board: Array(9).fill(''),
            turn: 'X'
        });

        waitingRoom = roomId;
        player.roomId=roomId;

        console.log(`Sala ${roomId} creada. Jugador 1 esperando`)
    } else {
        const roomId = waitingRoom;
        const room = rooms.get(roomId);

        if (room) {
            room.players.push(player);
            player.roomId=roomId;
            waitingRoom = null;
            console.log(`Partida lista en la sala: ${roomId}`);
            room.players[0].send(JSON.stringify({type:'match', symbol:'X'}));
            room.players[1].send(JSON.stringify({type:'match', symbol:'0'}));
        }
    }
}

// let handleMove = (player:WebSocket, data:string) {}