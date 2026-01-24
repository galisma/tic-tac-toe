const display = document.getElementById("display");
const board = document.getElementById("board");
const searchBtn = document.getElementById("search");

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

// Handlers
const handleMovement = (data) => {
    console.log(`received ${data.type} ${data.square}`)
    GameState.turn = true;
    display.innerHTML = "Tu turno";

    const opponent_symbol = GameState.symbol === 'X' ? 'O' : 'X';
    GameState.board[data.square] = opponent_symbol;
    document.getElementById(`sq-${data.square}`).innerHTML = opponent_symbol;
}

const handleClick = (number) => {
    if (GameState.state === "playing" && GameState.board[number] === '' && GameState.turn === true ) {
        document.getElementById(`sq-${number}`).innerHTML = GameState.symbol;
        GameState.turn = false
        display.innerHTML = "Turno del rival"
        socket.send(JSON.stringify({type:"movement",square:number}));
    }
};

const hanldleMatch = (data) => {
    console.log('Match found');
    GameState.state = "playing";
    GameState.symbol = data.symbol;

    searchBtn.style.display = 'none';
    if (GameState.symbol === 'X') {
        display.innerHTML = "Tu turno"
        GameState.turn = true;
    } else {
        display.innerHTML = "Turno del rival";
    }
}

document.querySelectorAll('.square').forEach((square, index) => {
    square.addEventListener('click', () => handleClick(index));
});

// Searching match
searchBtn.addEventListener('click', () => {
    if (socket.readyState !== 1){
        console.log("Error conectando con el servidor")
        return;
    }
    GameState.state = "searching";
    display.innerHTML = "Buscando partida...";
    socket.send(JSON.stringify({type:"search"}));
});

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    switch (data.type){
        case "match": hanldleMatch(data); break;
        case "movement": handleMovement(data); break;
        default: console.log(`Error, received ${data.type}`)
    }
}
