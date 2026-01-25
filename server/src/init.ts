import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
// 22:53 saturday, 24. this is starting to look like spaguetti lmao
// play again function incoming

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
type Status = 'playing' | 'finished';
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
    status: Status;
    moveCount: number;
    rematchVotes: Set<WebSocket>;
}> = new Map();

const handleLeave = (player: WebSocket) => {
    if (player.roomId === waitingRoom) {
        waitingRoom = null;
    }

    if (player.roomId && rooms.has(player.roomId)) {
        const room = rooms.get(player.roomId);
        if (!room) return;
        room.players = room.players.filter(p => p !== player);
        if (room.players.length > 0) {
            room.players[0].send(JSON.stringify({
                type: "message",
                text: "SERVER: THE OTHER PLAYER LEFT. GAME ENDED."
            }));
            room.players[0].send(JSON.stringify({ type: "end", result: "abandoned" }));
        }

        rooms.delete(player.roomId);
        player.roomId = undefined;
    }
}

const handleMessage = (player: WebSocket, data: any) => {
    const room = rooms.get(player.roomId || '');
    if (!room) return;
    if (typeof data.text !== 'string') return;

    const sanitizedText = data.text.trim().substring(0, 200);
    if (sanitizedText.length === 0) return;
    const opponentIndex = player.symbol === 'X' ? 1 : 0;
    room.players[opponentIndex].send(JSON.stringify({ type: "message", text: sanitizedText }));
}

const handleRematch = (player: WebSocket, data: any) => {
    const room = rooms.get(player.roomId || '');
    if (!room) {
        player.send(JSON.stringify({ type: "error", message: "Opponent has disconnected" }));
        return;
    }

    // 1. Validation: Is opponent still here?
    if (room.players.length < 2) {
        player.send(JSON.stringify({ type: "error", message: "Opponent has left the game" }));
        return;
    }

    // 2. Handle Vote logic
    if (data.vote === true) {
        room.rematchVotes.add(player);
    } else {
        // Cancel vote
        room.rematchVotes.delete(player);
    }

    // 3. Notify opponent
    const opponentIndex = player.symbol === 'X' ? 1 : 0;
    if (room.players[opponentIndex]) {
        room.players[opponentIndex].send(JSON.stringify({ 
            type: "rematch_update", 
            otherPlayerVoted: data.vote // Forward the true/false status
        }));
    }

    // 4. Start Game if both TRUE
    if (room.rematchVotes.size >= 2) {
        room.board = Array(9).fill('');
        room.moveCount = 0;
        room.status = 'playing';
        room.rematchVotes.clear(); // Clear for next game

        room.players.forEach(p => {
            p.send(JSON.stringify({ type: "match", symbol: p.symbol }));
            p.send(JSON.stringify({ type: "message", text: "SERVER: REMATCH STARTED!" }));
        });
        room.turn = 'X';
    }
}

const handleMove = (player: WebSocket, data: any) => {
    const room = rooms.get(player.roomId || '');
    if (!room) return;
    
    // 1. Validate Turn
    if (room.turn !== player.symbol) {
        player.send(JSON.stringify({ type: "error", message: "Not your turn" }));
        return;
    }

    // 2. Validate Move
    if (room.board[data.square] !== '') {
         player.send(JSON.stringify({ type: "error", message: "Square already taken" }));
         return;
    }

    const playerIndex = player.symbol === 'X' ? 0 : 1;
    const opponentIndex = player.symbol === 'X' ? 1 : 0;

    room.board[data.square] = player.symbol;
    room.turn = room.turn === 'X' ? 'O' : 'X';
    room.moveCount++;
    
    // Forward 'move' packet (renamed from 'movement')
    room.players[opponentIndex].send(JSON.stringify({ type: "move", square: data.square }));

    // Check winner
    if (room.moveCount >= 5) {
        const boardValue = parseInt(room.board.map(square => square === player.symbol ? '1' : '0').join(''), 2);
        if (WINNING_COMBOS.some(pattern => (boardValue & pattern) === pattern)) {
            const winPacket = JSON.stringify({ "type": "end", "result": "win", "winner": player.symbol });
            const losePacket = JSON.stringify({ "type": "end", "result": "lose", "winner": player.symbol });
            
            room.players[playerIndex].send(winPacket);
            room.players[opponentIndex].send(losePacket);
            
            room.status = 'finished';
            return;
        }
    }

    // Check tie
    if (room.moveCount >= 9) {
        const tiePacket = JSON.stringify({ "type": "end", "result": "tie", "winner": null });
        room.players.forEach(p => p.send(tiePacket));
        room.status = 'finished';
    }
}

const handleSearch = (player: WebSocket) => {
    if (waitingRoom === null) {
        const roomId = uuidv4();
        rooms.set(roomId, {
            players: [player],
            board: Array(9).fill(''),
            turn: 'X',
            moveCount: 0,
            status: 'playing',
            rematchVotes: new Set(),
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
            const data = JSON.parse(packet.toString());
            switch (data.type) {
                case "search": handleSearch(ws); break;
                case "move": handleMove(ws, data); break;
                case "message": handleMessage(ws, data); break;
                case "leave": handleLeave(ws); break;
                case "rematch": handleRematch(ws, data); break;
                default: console.log("Unknown package received");
            }
        } catch (error) {
            console.error("Error processing message:", error);
        }
    });
});