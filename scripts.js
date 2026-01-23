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

// Handlers
const handleClick = (number) => {
    if (GameState.state === "playing" && GameState.board[number] === '' && GameState.turn === true ) {
        socket.send(JSON.stringify({type:"movement",square:number}));
        console.log(`Clicked square ${number}`);
    }
};

const hanldleMatch = (data) => {
    console.log('Match found');
    GameState.state = "playing";
    GameState.symbol = data.symbol;
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
    GameState.state = "searching";
    display.innerHTML = "Buscando partida...";
    socket.send(JSON.stringify({type:"search"}));
});

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type == "match"){
        hanldleMatch(data);
    }
}
