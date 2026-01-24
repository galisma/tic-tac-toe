import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

const WINNING_COMBOS = [
    7,   // 000000111 (bottom row)
    56,  // 000111000 (middle row)
    448, // 111000000 (top row)
    73,  // 001001001 (right column)
    146, // 010010010 (middle column)
    292, // 100100100 (left column)
    273, // 100010001 (main diagonal)
    84   // 001010100 (anti diagonal)
];

type Square = 'X' | 'O' | '';
declare module 'ws' {
    interface WebSocket {
        roomId?: string;
        symbol?: Square;
    }
}

const wss = new WebSocketServer({ port: 8080, maxPayload: 1024 * 10 });

let waitingRoom: string | null = null;
const rooms: Map<string, {
    players: WebSocket[];
    board: Square[];
    turn: Square;
    moveCount: number;
}> = new Map();

let handleLeave = (player: WebSocket) => {
    // 1. If the player was in the waiting room, clear it
    if (player.roomId === waitingRoom) {
        waitingRoom = null;
    }

    if (player.roomId && rooms.has(player.roomId)) {
        const room = rooms.get(player.roomId)!;

        // 2. Remove player from the room
        room.players = room.players.filter(p => p !== player);

        // 3. If someone is still there, notify them and close the match
        if (room.players.length > 0) {
            room.players[0].send(JSON.stringify({
                type: "message",
                text: "SERVER: THE OTHER PLAYER LEFT. GAME ENDED."
            }));
            room.players[0].send(JSON.stringify({ type: "end", result: "abandoned" }));
        }

        // 4. Always delete the room once someone leaves
        rooms.delete(player.roomId);
        player.roomId = undefined;
    }
}

let handleMessage = (player: WebSocket, data: any) => {
    const room = rooms.get(player.roomId || '');
    if (!room) return;
    if (typeof data.text !== 'string') return;

    const sanitizedText = data.text.trim().substring(0, 200);
    if (sanitizedText.length === 0) return;
    const opponentIndex = player.symbol === 'X' ? 1 : 0;
    room.players[opponentIndex].send(JSON.stringify({ type: "message", text: sanitizedText }));
}

let handleMove = (player: WebSocket, data: any) => {
    const room = rooms.get(player.roomId || '');

    if (!room) return;
    let playerIndex = player.symbol === 'X' ? 0 : 1;
    let opponentIndex = player.symbol === 'X' ? 1 : 0;

    if (room.turn === player.symbol && room.board[data.square] === '') {
        room.board[data.square] = player.symbol;
        room.turn = room.turn === 'X' ? 'O' : 'X';
        room.moveCount++;
        room.players[opponentIndex].send(JSON.stringify(data));

        // Check winner
        if (room.moveCount >= 5) {
            // Map the board to a number 
            const boardValue = parseInt(room.board.map(square => square === player.symbol ? '1' : '0').join(''), 2);
            // Check if the number contains a winning combo (using bitwise &)
            if (WINNING_COMBOS.some(pattern => (boardValue & pattern) === pattern)) {
                room.players[playerIndex].send(JSON.stringify({ "type": "end", "result": "win" }));
                room.players[playerIndex].send(JSON.stringify({ "type": "message", "text": `SERVER: PLAYER ${player.symbol} WON` }));
                room.players[opponentIndex].send(JSON.stringify({ "type": "end", "result": "lose" }));
                room.players[opponentIndex].send(JSON.stringify({ "type": "message", "text": `SERVER: PLAYER ${player.symbol} WON` }));
                // return before server declares a TIE
                return;
            }
        }

        // Check tie
        if (room.moveCount >= 9) {
            room.players[playerIndex].send(JSON.stringify({ "type": "end", "result": "tie" }));
            room.players[playerIndex].send(JSON.stringify({ "type": "message", "text": "SERVER: THE GAME IS A TIE" }));
            room.players[opponentIndex].send(JSON.stringify({ "type": "end", "result": "tie" }));
            room.players[opponentIndex].send(JSON.stringify({ "type": "message", "text": "SERVER: THE GAME IS A TIE" }));
        }
    }
}

let handleSearch = (player: WebSocket) => {
    if (waitingRoom === null) {
        const roomId = uuidv4();
        rooms.set(roomId, {
            players: [player],
            board: Array(9).fill(''),
            turn: 'X',
            moveCount: 0,
        });

        waitingRoom = roomId;
        player.roomId = roomId;

        console.log(`Room ${roomId} created. Player 1 is waiting...`);
    } else {
        const roomId = waitingRoom;
        const room = rooms.get(roomId);

        if (room) {
            room.players.push(player);
            player.roomId = roomId;
            waitingRoom = null;
            console.log(`Game ready in room: ${roomId}`);
            room.players[0].send(JSON.stringify({ type: 'match', symbol: 'X' }));
            room.players[1].send(JSON.stringify({ type: 'match', symbol: 'O' }));

            room.players[0].symbol = 'X';
            room.players[1].symbol = 'O';
        }
    }
}

wss.on('connection', (ws) => {
    ws.on('error', console.error);

    ws.on('close', () => {
        handleLeave(ws);
    });

    ws.on('message', (packet) => {
        try {
            let data = JSON.parse(packet.toString());
            switch (data.type) {
                case "search": handleSearch(ws); break;
                case "movement": handleMove(ws, data); break;
                case "message": handleMessage(ws, data); break;
                case "leave": handleLeave(ws); break;
                default: console.log("Unknown package received");
            }
        } catch (error) {
            console.error("Error processing message:", error);
        }
    });
});