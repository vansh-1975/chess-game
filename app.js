const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const { Chess } = require("chess.js");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const chess = new Chess();
const players = {};

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index");
});

io.on("connection", (sock) => {
    if (!players.white) {
        players.white = sock.id;
        sock.emit("playerRole", "w");
    } else if (!players.black) {
        players.black = sock.id;
        sock.emit("playerRole", "b");
    } else {
        sock.emit("spectatorRole");
    }

    sock.emit("boardState", chess.fen());

    sock.on("move", (move) => {
        if (
            (chess.turn() === "w" && sock.id !== players.white) ||
            (chess.turn() === "b" && sock.id !== players.black)
        ) return;

        try {
            const result = chess.move(move);
            if (result) {
                io.emit("boardState", chess.fen());
            } else {
                sock.emit("invalidMove", move);
            }
        } catch {
            sock.emit("invalidMove", move);
        }
    });

    sock.on("disconnect", () => {
        if (sock.id === players.white) delete players.white;
        if (sock.id === players.black) delete players.black;
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
