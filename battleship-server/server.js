const { WebSocketServer, WebSocket } = require('ws');
const { v4: uuidv4 } = require('uuid');
const http = require('http');

const PORT = process.env.PORT || 3001;

// ─── HTTP server (Render needs an HTTP port) ───────────────────────────────
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'online',
    rooms: rooms.size,
    players: clients.size,
    uptime: Math.floor(process.uptime())
  }));
});

const wss = new WebSocketServer({ server });

// ─── State ─────────────────────────────────────────────────────────────────
const clients = new Map();   // clientId -> { ws, roomId, playerNum }
const rooms   = new Map();   // roomCode -> Room
let matchmakingQueue = [];   // clientIds waiting for random match

// ─── Room structure ────────────────────────────────────────────────────────
function createRoom(code, isPrivate = false) {
  return {
    code,
    isPrivate,
    players: [null, null],   // [clientId1, clientId2]
    ready: [false, false],   // placement done
    boards: [null, null],    // enemy boards for each player
    ships: [null, null],     // ship definitions
    attackViews: [           // what each player has revealed
      Array.from({ length: 10 }, () => Array(10).fill(0)),
      Array.from({ length: 10 }, () => Array(10).fill(0)),
    ],
    currentTurn: 0,          // 0 or 1
    phase: 'waiting',        // waiting | placement | battle | finished
    winner: null,
    createdAt: Date.now(),
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function send(clientId, msg) {
  const client = clients.get(clientId);
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(msg));
  }
}

function broadcast(roomCode, msg, exceptClientId = null) {
  const room = rooms.get(roomCode);
  if (!room) return;
  room.players.forEach(cid => {
    if (cid && cid !== exceptClientId) send(cid, msg);
  });
}

function getOpponent(room, playerNum) {
  return playerNum === 0 ? 1 : 0;
}

function getRoomPlayer(room, clientId) {
  return room.players.indexOf(clientId);
}

// ─── WebSocket connection ──────────────────────────────────────────────────
wss.on('connection', (ws) => {
  const clientId = uuidv4();
  clients.set(clientId, { ws, roomId: null, playerNum: null });

  console.log(`[+] Client connected: ${clientId.slice(0,8)}`);

  send(clientId, { type: 'connected', clientId });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    handleMessage(clientId, msg);
  });

  ws.on('close', () => handleDisconnect(clientId));
  ws.on('error', (err) => console.error('WS error:', err.message));
});

// ─── Message handler ───────────────────────────────────────────────────────
function handleMessage(clientId, msg) {
  const { type } = msg;
  console.log(`[MSG] ${clientId.slice(0,8)} -> ${type}`);

  switch (type) {

    case 'CREATE_ROOM': {
      const code = generateRoomCode();
      const room = createRoom(code, true);
      room.players[0] = clientId;
      rooms.set(code, room);
      clients.get(clientId).roomId = code;
      clients.get(clientId).playerNum = 0;
      send(clientId, { type: 'ROOM_CREATED', code, playerNum: 0 });
      break;
    }

    case 'JOIN_ROOM': {
      const code = (msg.code || '').toUpperCase().trim();
      const room = rooms.get(code);

      if (!room) {
        send(clientId, { type: 'ERROR', message: 'Sala no encontrada. Verifica el código.' });
        return;
      }
      if (room.players[1] !== null) {
        send(clientId, { type: 'ERROR', message: 'Sala llena. La partida ya comenzó.' });
        return;
      }
      if (room.players[0] === clientId) {
        send(clientId, { type: 'ERROR', message: 'Ya estás en esta sala.' });
        return;
      }

      room.players[1] = clientId;
      room.phase = 'placement';
      clients.get(clientId).roomId = code;
      clients.get(clientId).playerNum = 1;

      send(clientId, { type: 'ROOM_JOINED', code, playerNum: 1 });
      broadcast(code, { type: 'OPPONENT_JOINED', phase: 'placement' });
      break;
    }

    case 'FIND_MATCH': {
      // Remove from any previous queue entry
      matchmakingQueue = matchmakingQueue.filter(id => id !== clientId);

      if (matchmakingQueue.length > 0) {
        const opponentId = matchmakingQueue.shift();
        const opClient = clients.get(opponentId);
        if (!opClient || opClient.ws.readyState !== WebSocket.OPEN) {
          // Opponent disconnected, add self to queue
          matchmakingQueue.push(clientId);
          send(clientId, { type: 'MATCHMAKING', status: 'waiting' });
          return;
        }

        const code = generateRoomCode();
        const room = createRoom(code, false);
        room.players[0] = opponentId;
        room.players[1] = clientId;
        room.phase = 'placement';
        rooms.set(code, room);

        opClient.roomId = code;
        opClient.playerNum = 0;
        clients.get(clientId).roomId = code;
        clients.get(clientId).playerNum = 1;

        send(opponentId, { type: 'MATCH_FOUND', code, playerNum: 0 });
        send(clientId,   { type: 'MATCH_FOUND', code, playerNum: 1 });
      } else {
        matchmakingQueue.push(clientId);
        send(clientId, { type: 'MATCHMAKING', status: 'waiting' });
      }
      break;
    }

    case 'CANCEL_MATCHMAKING': {
      matchmakingQueue = matchmakingQueue.filter(id => id !== clientId);
      send(clientId, { type: 'MATCHMAKING', status: 'cancelled' });
      break;
    }

    case 'PLACE_SHIPS': {
      const client = clients.get(clientId);
      if (!client || !client.roomId) return;
      const room = rooms.get(client.roomId);
      if (!room || room.phase !== 'placement') return;

      const pNum = getRoomPlayer(room, clientId);
      if (pNum === -1) return;

      // Validate ships server-side
      const { board, ships } = msg;
      if (!validateShips(board, ships)) {
        send(clientId, { type: 'ERROR', message: 'Configuración de barcos inválida.' });
        return;
      }

      room.boards[pNum] = board;
      room.ships[pNum] = ships;
      room.ready[pNum] = true;

      send(clientId, { type: 'SHIPS_CONFIRMED' });

      const oppNum = getOpponent(room, pNum);
      if (room.players[oppNum]) {
        send(room.players[oppNum], { type: 'OPPONENT_READY' });
      }

      if (room.ready[0] && room.ready[1]) {
        room.phase = 'battle';
        room.currentTurn = 0;
        broadcast(client.roomId, {
          type: 'BATTLE_START',
          firstTurn: 0  // player 0 goes first
        });
      }
      break;
    }

    case 'ATTACK': {
      const client = clients.get(clientId);
      if (!client || !client.roomId) return;
      const room = rooms.get(client.roomId);
      if (!room || room.phase !== 'battle') return;

      const pNum = getRoomPlayer(room, clientId);
      if (pNum !== room.currentTurn) {
        send(clientId, { type: 'ERROR', message: 'No es tu turno.' });
        return;
      }

      const { r, c } = msg;
      if (r < 0 || r > 9 || c < 0 || c > 9) return;

      const oppNum = getOpponent(room, pNum);
      const oppBoard = room.boards[oppNum];
      const oppShips = room.ships[oppNum];
      const view = room.attackViews[pNum];

      if (view[r][c] !== 0) {
        send(clientId, { type: 'ERROR', message: 'Ya atacaste esa posición.' });
        return;
      }

      const isHit = oppBoard[r][c] === 1;
      let sunkShip = null;

      if (isHit) {
        view[r][c] = 2;
        // Check if ship sunk
        const ship = oppShips.find(s => s.cells.some(cell => cell.r === r && cell.c === c));
        if (ship) {
          const shipCell = ship.cells.find(cell => cell.r === r && cell.c === c);
          if (shipCell) shipCell.hit = true;

          if (ship.cells.every(cell => cell.hit)) {
            ship.sunk = true;
            sunkShip = ship;
            ship.cells.forEach(cell => { view[cell.r][cell.c] = 3; });
          }
        }
      } else {
        view[r][c] = 1;
      }

      const result = {
        r, c,
        hit: isHit,
        sunk: sunkShip ? { id: sunkShip.id, name: sunkShip.name, cells: sunkShip.cells } : null,
        attackerNum: pNum,
      };

      // Check win condition
      const allSunk = oppShips.every(s => s.sunk);
      if (allSunk) {
        room.phase = 'finished';
        room.winner = pNum;
        broadcast(client.roomId, { type: 'ATTACK_RESULT', ...result });
        broadcast(client.roomId, { type: 'GAME_OVER', winner: pNum, loser: oppNum });
        return;
      }

      // Switch turns
      room.currentTurn = oppNum;
      broadcast(client.roomId, { type: 'ATTACK_RESULT', ...result, nextTurn: oppNum });
      break;
    }

    case 'CHAT': {
      const client = clients.get(clientId);
      if (!client || !client.roomId) return;
      const room = rooms.get(client.roomId);
      if (!room) return;
      const pNum = getRoomPlayer(room, clientId);
      const text = (msg.text || '').slice(0, 120);
      if (!text.trim()) return;
      broadcast(client.roomId, {
        type: 'CHAT',
        playerNum: pNum,
        text: text.trim()
      });
      break;
    }

    case 'REMATCH_REQUEST': {
      const client = clients.get(clientId);
      if (!client || !client.roomId) return;
      const room = rooms.get(client.roomId);
      if (!room || room.phase !== 'finished') return;
      const pNum = getRoomPlayer(room, clientId);
      const oppNum = getOpponent(room, pNum);
      if (room.players[oppNum]) {
        send(room.players[oppNum], { type: 'REMATCH_REQUEST', fromPlayer: pNum });
      }
      break;
    }

    case 'REMATCH_ACCEPT': {
      const client = clients.get(clientId);
      if (!client || !client.roomId) return;
      const room = rooms.get(client.roomId);
      if (!room) return;

      // Reset room for new game
      room.phase = 'placement';
      room.ready = [false, false];
      room.boards = [null, null];
      room.ships = [null, null];
      room.attackViews = [
        Array.from({ length: 10 }, () => Array(10).fill(0)),
        Array.from({ length: 10 }, () => Array(10).fill(0)),
      ];
      room.currentTurn = 0;
      room.winner = null;

      broadcast(client.roomId, { type: 'REMATCH_START' });
      break;
    }

    default:
      console.log(`Unknown message type: ${type}`);
  }
}

// ─── Disconnect handler ────────────────────────────────────────────────────
function handleDisconnect(clientId) {
  console.log(`[-] Client disconnected: ${clientId.slice(0,8)}`);

  // Remove from matchmaking queue
  matchmakingQueue = matchmakingQueue.filter(id => id !== clientId);

  const client = clients.get(clientId);
  if (client && client.roomId) {
    const room = rooms.get(client.roomId);
    if (room) {
      broadcast(client.roomId, { type: 'OPPONENT_DISCONNECTED' }, clientId);
      // Clean up room after delay (allow reconnect?)
      setTimeout(() => {
        if (rooms.has(client.roomId)) {
          const r = rooms.get(client.roomId);
          // If both gone, delete room
          const activePlayers = r.players.filter(id => id && clients.has(id));
          if (activePlayers.length === 0) rooms.delete(client.roomId);
        }
      }, 30000);
    }
  }

  clients.delete(clientId);
}

// ─── Ship validation ───────────────────────────────────────────────────────
const SHIPS_DEF = [
  { id: 'carrier',    size: 5 },
  { id: 'battleship', size: 4 },
  { id: 'cruiser',    size: 3 },
  { id: 'submarine',  size: 3 },
  { id: 'destroyer',  size: 2 },
];
const TOTAL_CELLS = SHIPS_DEF.reduce((s, sh) => s + sh.size, 0);

function validateShips(board, ships) {
  if (!board || !ships) return false;
  if (board.length !== 10 || board.some(row => row.length !== 10)) return false;
  if (ships.length !== 5) return false;

  // Check each expected ship exists
  for (const def of SHIPS_DEF) {
    const ship = ships.find(s => s.id === def.id);
    if (!ship || ship.cells.length !== def.size) return false;
    // Verify cells are within bounds and marked on board
    for (const cell of ship.cells) {
      if (cell.r < 0 || cell.r > 9 || cell.c < 0 || cell.c > 9) return false;
      if (board[cell.r][cell.c] !== 1) return false;
    }
  }

  // Count board cells
  const boardCells = board.flat().filter(v => v === 1).length;
  if (boardCells !== TOTAL_CELLS) return false;

  return true;
}

// ─── Cleanup stale rooms every 10 minutes ─────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.createdAt > 2 * 60 * 60 * 1000) { // 2 hours
      rooms.delete(code);
      console.log(`[GC] Removed stale room ${code}`);
    }
  }
}, 10 * 60 * 1000);

// ─── Start ─────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`⚓ Batalla Naval Server running on port ${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}`);
  console.log(`   HTTP status: http://localhost:${PORT}`);
});
