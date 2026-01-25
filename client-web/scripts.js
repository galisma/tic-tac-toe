const display = document.getElementById("display");
// const board = document.getElementById("board");
const searchBtn = document.getElementById("search-btn");
const againBtn = document.getElementById("again-btn");
const leaveBtn = document.getElementById("leave-btn");
const muteBtn = document.getElementById("mute-btn");

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
let muted = false;
const GameState = {
    turn: false,
    symbol: null, // 'X', 'O', 'null'
    result: null, // 'WIN', 'LOSE', 'TIE', 'null'
    state: "idle", // 'idle', 'searching', 'playing', 'finished'
    board: ['', '', '', '', '', '', '', '', ''],
}

const cleanGameState = () => {
    GameState.turn = false;
    GameState.symbol = null;
    GameState.result = null;
    GameState.state = "idle";
    GameState.board = ['', '', '', '', '', '', '', '', ''];
    document.querySelectorAll('.square').forEach((sq) => {
        sq.textContent = '';
    });
}

const mute = () => {
    if (muted) {
        muted = false;
        muteBtn.style.backgroundColor = "var(--square-bg)";
        muteBtn.textContent = "Mute";
    } else {
        muted = true;
        muteBtn.style.backgroundColor = "#e63946";
        muteBtn.textContent = "Unmute";
    }
}

const leave = () => {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ "type": "leave" }));
    }
    leaveBtn.style.display = 'none';
    searchBtn.style.display = 'flex';
    searchBtn.textContent = "Search Match";
    chatSection.style.display = 'none';
    againBtn.style.display = 'none';
    display.textContent = "Tic-Tac-Toe";
    cleanGameState();
}

const addChatMessage = (text) => {
    if (muted) {
        return;
    }
    const msgDiv = document.createElement("div");
    msgDiv.textContent = text;
    chatLog.appendChild(msgDiv);
    chatLog.scrollTop = chatLog.scrollHeight;
}

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    socket.send(JSON.stringify({ type: "message", text }));
    addChatMessage(text);
    chatInput.value = "";
});

const handleChat = (data) => {
    addChatMessage(`>${data.text}`);
}

// Handlers
const handleMovement = (data) => {
    GameState.turn = true;
    display.innerHTML = "Your turn";

    const opponent_symbol = GameState.symbol === 'X' ? 'O' : 'X';
    GameState.board[data.square] = opponent_symbol;
    document.getElementById(`sq-${data.square}`).textContent = opponent_symbol;
}

const handleClick = (number) => {
    if (GameState.state === "playing" && GameState.board[number] === '' && GameState.turn === true) {
        document.getElementById(`sq-${number}`).textContent = GameState.symbol;
        GameState.turn = false
        display.innerHTML = "Opponent's turn";
        socket.send(JSON.stringify({ type: "move", square: number }));
    }
};

const handleEnd = (data) => {
    console.log(`Game ended: result ${data.result}`);
    GameState.state = "finished";
    switch (data.result) {
        case "win":
            display.innerHTML = "You won!"; break;
        case "lose":
            display.innerHTML = "You lost!"; break;
        case "tie":
            display.innerHTML = "It's a tie!"; break;
        case "abandoned":
            display.innerHTML = "Opponent left"; break;
    }
    againBtn.style.display = 'flex';
}


// Flag for rematch voting
let isRematchVoted = false;

const handleRematchUpdate = (data) => {
    // This is called when the OPPONENT toggles their vote
    if (data.otherPlayerVoted) {
        display.textContent = "Opponent is ready for Rematch!";
        // Visual feedback
        if (!isRematchVoted) {
            againBtn.style.backgroundColor = 'lightgreen';
            againBtn.textContent = "Opponent Ready! Click to Start";
        }
    } else {
        // Opponent cancelled
        display.textContent = "Opponent cancelled rematch vote.";
        if (!isRematchVoted) {
            againBtn.style.backgroundColor = "var(--square-bg)";
            againBtn.textContent = "Play Again";
        }
    }
}

const handleGameError = (data) => {
    addChatMessage("Error: " + data.message);

    // If error happened during vote (e.g. opponent left), reset the button
    if (isRematchVoted || data.message.includes("Opponent has disconnected")) {
        isRematchVoted = false;
        againBtn.style.backgroundColor = "var(--square-bg)";
        againBtn.textContent = "Play Again";
        againBtn.disabled = true; // Disable button
        againBtn.style.cursor = "not-allowed";
        display.textContent = data.message;
    }
}

const handleMatch = (data) => {
    cleanGameState();
    leaveBtn.style.display = 'flex';
    againBtn.style.display = 'none';
    againBtn.style.backgroundColor = "var(--square-bg)";
    againBtn.textContent = "Play Again";
    isRematchVoted = false; // Reset vote

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

againBtn.addEventListener('click', () => {
    // Toggle Logic
    if (!isRematchVoted) {
        // VOTE TRUE
        isRematchVoted = true;
        againBtn.style.backgroundColor = 'orange';
        againBtn.textContent = "Waiting... (Click to Cancel)";
        display.textContent = "Waiting for opponent...";
        socket.send(JSON.stringify({ type: "rematch", vote: true }));
    } else {
        // VOTE FALSE (Cancel)
        isRematchVoted = false;
        againBtn.style.backgroundColor = "var(--square-bg)";
        againBtn.textContent = "Play Again";
        display.textContent = "Cancelled. Click to play again.";
        socket.send(JSON.stringify({ type: "rematch", vote: false }));
    }
});

// Searching match
searchBtn.addEventListener('click', () => {
    if (GameState.state === "searching") {
        leave();
        searchBtn.textContent = "Search";
        return;
    }

    searchBtn.textContent = "Cancel";
    if (socket.readyState !== 1) {
        console.log("Error connecting to the server")
        return;
    }

    GameState.state = "searching";
    display.innerHTML = "Searching for a match...";
    socket.send(JSON.stringify({ type: "search" }));
});

socket.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);
        switch (data.type) {
            case "match": handleMatch(data); break;
            case "move": handleMovement(data); break;
            case "end": handleEnd(data); break;
            case "rematch_update": handleRematchUpdate(data); break;
            case "error": handleGameError(data); break;
            case "message": handleChat(data); break;
            default: console.log(`Error, received ${data.type}`)
        }
    } catch (error) {
        console.error("Error processing message:", error);
    }
}