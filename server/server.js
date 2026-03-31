const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "https://batalla-naval-ten.vercel.app"
    ],
    methods: ["GET", "POST"]
  }
});

app.get("/", (req, res) => {
  res.send("Servidor Batalla Naval activo 🚀");
});

let rooms = {};

io.on("connection", (socket) => {
  console.log("Jugador conectado:", socket.id);

  socket.on("createRoom", () => {
    const roomId = Math.random().toString(36).substr(2, 5);

    rooms[roomId] = {
      players: [socket.id],
      boards: {},
      turn: null
    };

    socket.join(roomId);
    socket.emit("roomCreated", roomId);
  });

  socket.on("joinRoom", (roomId) => {
    if (rooms[roomId] && rooms[roomId].players.length < 2) {
      rooms[roomId].players.push(socket.id);
      socket.join(roomId);

      rooms[roomId].turn = rooms[roomId].players[0];

      io.to(roomId).emit("startGame");
    }
  });

  socket.on("placeShips", ({ roomId, board }) => {
    if (!rooms[roomId]) return;

    rooms[roomId].boards[socket.id] = board;

    if (Object.keys(rooms[roomId].boards).length === 2) {
      io.to(roomId).emit("allReady");
    }
  });

  socket.on("shoot", ({ roomId, x, y }) => {
    const room = rooms[roomId];
    if (!room || socket.id !== room.turn) return;

    const opponent = room.players.find(p => p !== socket.id);
    const board = room.boards[opponent];

    let result = "miss";

    if (board[y][x] === 1) {
      board[y][x] = 2;
      result = "hit";
    } else {
      board[y][x] = 3;
    }

    room.turn = opponent;

    io.to(roomId).emit("shotResult", { x, y, result });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Servidor corriendo en puerto", PORT);
});