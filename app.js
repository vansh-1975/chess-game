const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const { Chess } = require("chess.js");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let chess = new Chess();
let players = { white: null, black: null };

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => res.render("index"));

function broadcastCounts() {
    const totalClients = io.engine.clientsCount;
    const activePlayers =
        (players.white ? 1 : 0) + (players.black ? 1 : 0);
    const spectators = totalClients - activePlayers;

    io.emit("counts", {
        players: activePlayers,
        spectators: spectators
    });
}

function sendStatus() {
    if (!players.white || !players.black) {
        io.emit("status", "Waiting for another player to join...");
    } else {
        io.emit("status", "Game in progress");
    }
}

io.on("connection", socket => {
    if (!players.white) {
        players.white = socket.id;
        socket.emit("playerRole", "w");
    } else if (!players.black) {
        players.black = socket.id;
        socket.emit("playerRole", "b");
    } else {
        socket.emit("spectatorRole");
    }

    socket.emit("boardState", chess.fen());
    sendStatus();
    broadcastCounts();

    socket.on("move", move => {
        if (
            (chess.turn() === "w" && socket.id !== players.white) ||
            (chess.turn() === "b" && socket.id !== players.black)
        ) {
            socket.emit("invalidMove");
            return;
        }

        let result;
        try {
            result = chess.move(move);
        } catch (e) {
            socket.emit("invalidMove");
            return;
        }

        if (!result) {
            socket.emit("invalidMove");
            return;
        }

        io.emit("boardState", chess.fen());

// GAME OVER LOGIC
if (chess.in_checkmate()) {
    const winner = chess.turn() === "w" ? "Black" : "White";
    io.emit("gameOver", {
        type: "checkmate",
        winner
    });
}
else if (chess.in_stalemate()) {
    io.emit("gameOver", {
        type: "stalemate"
    });
}
else if (chess.in_draw()) {
    io.emit("gameOver", {
        type: "draw"
    });
}

    });

    socket.on("restart", () => {
        if (socket.id === players.white || socket.id === players.black) {
            chess = new Chess();
            io.emit("boardState", chess.fen());
            sendStatus();
            broadcastCounts();
        }
    });

    socket.on("disconnect", () => {
        if (socket.id === players.white) players.white = null;
        if (socket.id === players.black) players.black = null;
        sendStatus();
        broadcastCounts();
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running on", PORT));
