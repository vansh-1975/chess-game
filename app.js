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

function assignRole(socket) {
    if (!players.white) {
        players.white = socket.id;
        socket.emit("role", "w");
    } else if (!players.black) {
        players.black = socket.id;
        socket.emit("role", "b");
    } else {
        socket.emit("role", "spectator");
    }
    socket.emit("status",
        !players.white || !players.black
            ? "Waiting for another player to join..."
            : "Game in progress"
    );
}

function broadcastStatus() {
    if (!players.white || !players.black) {
        io.emit("status", "Waiting for another player to join...");
    } else {
        io.emit("status", "Game in progress");
    }
}

io.on("connection", socket => {
    assignRole(socket);
    socket.emit("board", chess.fen());
    broadcastStatus();

    socket.on("move", move => {
        const isWhite = socket.id === players.white;
        const isBlack = socket.id === players.black;

        if (
            (chess.turn() === "w" && !isWhite) ||
            (chess.turn() === "b" && !isBlack)
        ) return;

        try {
            const result = chess.move(move);
            if (result) {
                io.emit("board", chess.fen());
                if (chess.isGameOver()) {
                    io.emit("status", "Game Over");
                }
            }
        } catch {
            socket.emit("invalid");
        }
    });

    socket.on("restart", () => {
        if (socket.id === players.white || socket.id === players.black) {
            chess = new Chess();
            io.emit("board", chess.fen());
            io.emit("status", "Game restarted");
        }
    });

    socket.on("disconnect", () => {
        if (socket.id === players.white) players.white = null;
        if (socket.id === players.black) players.black = null;

        // Reassign roles
        const sockets = Array.from(io.sockets.sockets.keys());
        players.white = sockets[0] || null;
        players.black = sockets[1] || null;

        if (players.white) io.to(players.white).emit("role", "w");
        if (players.black) io.to(players.black).emit("role", "b");

        sockets.slice(2).forEach(id =>
            io.to(id).emit("role", "spectator")
        );

        broadcastStatus();
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running on", PORT));
