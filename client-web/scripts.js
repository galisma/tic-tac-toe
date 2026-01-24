const display = document.getElementById("display");
const board = document.getElementById("board");
const searchBtn = document.getElementById("search");
const againBtn = document.getElementById("again");
const leaveBtn = document.getElementById("leave");

// Chat
const chatSection = document.getElementById("chat");
const chatLog = document.getElementById("chatlog");
const chatForm = document.getElementById("chatform");
const chatInput = document.getElementById("chatinput");

// Websocket
const host = window.location.hostname || "localhost";
const socket = new WebSocket(`ws://${host}:8080`);
socket.onopen = () => {
    console.log("Websocket connected");
};

// Game state //TODO: move to typescript
const GameState = {
    turn: false,
    symbol: null, // 'X', 'O', 'null'
    result: null, // 'WIN', 'LOSE', 'TIE', 'null'
    state: "idle", // 'idle', 'searching', 'playing', 'finished'
    board: ['', '', '', '', '', '', '', '', ''],
}

const addChatMessage = (text) => {
    const msgDiv = document.createElement("div");
    msgDiv.textContent = text;
    chatLog.appendChild(msgDiv);
    chatLog.scrollTop = chatLog.scrollHeight;
}

// Handlers
const handleMovement = (data) => {
    GameState.turn = true;
    display.innerHTML = "Your turn";

    const opponent_symbol = GameState.symbol === 'X' ? 'O' : 'X';
    GameState.board[data.square] = opponent_symbol;
    document.getElementById(`sq-${data.square}`).innerHTML = opponent_symbol;
}

const handleClick = (number) => {
    if (GameState.state === "playing" && GameState.board[number] === '' && GameState.turn === true) {
        document.getElementById(`sq-${number}`).innerHTML = GameState.symbol;
        GameState.turn = false
        display.innerHTML = "Opponent's turn";
        socket.send(JSON.stringify({ type: "movement", square: number }));
    }
};

const handleEnd = (data) => {
    console.log(`Game ended: result ${data.result}`);
    switch (data.result) {
        case "win":
            display.innerHTML = "You won!"; break;
        case "lose":
            display.innerHTML = "You lost!"; break;
        case "tie":
            display.innerHTML = "It's a tie!";
    }
    
}

const handleChat = (data) => {
    addChatMessage(`>${data.text}`);
}

const hanldleMatch = (data) => {
    console.log('Match found');
    GameState.state = "playing";
    GameState.symbol = data.symbol;

    searchBtn.style.display = 'none';
    chatSection.style.display = 'flex';
    if (GameState.symbol === 'X') {
        display.innerHTML = "Your turn";
        GameState.turn = true;
    } else {
        display.innerHTML = "Opponent's turn";
    }
}

document.querySelectorAll('.square').forEach((square, index) => {
    square.addEventListener('click', () => handleClick(index));
});

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    socket.send(JSON.stringify({ type: "message", text }));
    addChatMessage(text, "me");
    chatInput.value = "";
});

// Searching match
searchBtn.addEventListener('click', () => {
    if (socket.readyState !== 1) {
        console.log("Error connecting to the server")
        return;
    }
    GameState.state = "searching";
    display.innerHTML = "Searching for a match...";
    socket.send(JSON.stringify({ type: "search" }));
});

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    switch (data.type) {
        case "match": hanldleMatch(data); break;
        case "movement": handleMovement(data); break;
        case "end": handleEnd(data); break;
        case "message": handleChat(data); break;
        default: console.log(`Error, received ${data.type}`)
    }
}
