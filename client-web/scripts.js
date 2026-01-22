handleClick = (number) => {
    console.log(`click in square ${number}`)
}

socket = new WebSocket("ws://localhost:8080", "ws");
console.log(socket);

display = document.getElementById("display");

display.innerHTML = 'buscando partida...'