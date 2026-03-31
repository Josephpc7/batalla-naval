const socket = io();

let roomId = null;

createBoard("playerBoard");
createBoard("enemyBoard", true);

function createRoom() {
  socket.emit("createRoom");
}

function joinRoom() {
  const id = document.getElementById("roomInput").value;
  socket.emit("joinRoom", id);
}

socket.on("roomCreated", (id) => {
  roomId = id;
  document.getElementById("roomCode").innerText = "Sala: " + id;
});

socket.on("startGame", () => {
  alert("Juego iniciado");
  socket.emit("placeShips", { roomId, board: playerBoard });
});

socket.on("shotResult", ({ x, y, result }) => {
  const cell = document.querySelector(`#enemyBoard [data-x='${x}'][data-y='${y}']`);

  if (result === "hit") {
    cell.classList.add("hit");
    explosionEffect(cell);
    playExplosion();
  } else {
    cell.classList.add("miss");
    waterEffect(cell);
    playWater();
  }
});

function shoot(x, y) {
  socket.emit("shoot", { roomId, x, y });
}