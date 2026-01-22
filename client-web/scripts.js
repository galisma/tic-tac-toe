// Game state and UI elements
const display = document.getElementById("display");
const board = document.getElementById("board");
const searchBtn = document.getElementById("search");

const handleClick = (number) => {
    console.log(`click in square ${number}`);
    // Future game logic here
};

// Initialize square event listeners
document.querySelectorAll('.square').forEach((square, index) => {
    square.addEventListener('click', () => handleClick(index + 1));
});

// Search button listener
searchBtn.addEventListener('click', () => {
    console.log("Buscando partida...");
    // Future search logic here
});

// WebSocket setup
const socket = new WebSocket("ws://localhost:8080", "ws");

socket.onopen = () => {
    console.log("WebSocket connection established");
};

socket.onmessage = (event) => {
    console.log("Message from server:", event.data);
};

display.innerHTML = '3 en raya';