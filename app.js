const express = require("express");
const path = require("path");
const http = require("http");
const socket = require("socket.io");
const { Chess } = require("chess.js");

const app = express();
const server = http.createServer(app);
const io = socket(server);

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

        let result = null;
        try {
            result = chess.move(move);
        } catch (err) {
            sock.emit("invalidMove", move);
            return;
        }

        if (result) {
            io.emit("boardState", chess.fen());
        } else {
            sock.emit("invalidMove", move);
        }
    });

    sock.on("disconnect", () => {
        if (sock.id === players.white) delete players.white;
        if (sock.id === players.black) delete players.black;
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);

