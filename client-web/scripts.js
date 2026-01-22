const display = document.getElementById("display");
const board = document.getElementById("board");
const searchBtn = document.getElementById("search");

// Websocket
const socket = new WebSocket(`ws://${window.location.hostname}:8080`);
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

// Square clicks
const handleClick = (number) => {
    if (GameState.state === "playing" && GameState.board[number-1] === ''){
        message = {
            type:"movement",
            square: number,
        }
        socket.send(JSON.stringify(message));
        console.log(`click in square ${number}`);
    }
};

document.querySelectorAll('.square').forEach((square, index) => {
    square.addEventListener('click', () => handleClick(index + 1));
});

// Searching match
searchBtn.addEventListener('click', () => {

    GameState.state = "searching";
    display.innerHTML = "Buscando partida...";
    const message = {
        type:"search",
    }
    socket.send(JSON.stringify(message));
});

