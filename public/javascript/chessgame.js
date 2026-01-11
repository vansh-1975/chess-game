const socket = io();
const chess = new Chess();
const boardEl = document.querySelector(".chessboard");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restart");
const countEl = document.getElementById("counts");
const toast = document.getElementById("toast");

let playerRole = null;
let selected = null;
let dragged = null;
let source = null;

const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

function renderBoard() {
    boardEl.innerHTML = "";
    const board = chess.board();

    board.forEach((row, r) => {
        row.forEach((piece, c) => {
            const sq = document.createElement("div");
            sq.className = `square ${(r + c) % 2 ? "dark" : "light"}`;

            if (piece) {
                const p = document.createElement("div");
                p.className = `piece ${piece.color === "w" ? "white" : "black"}`;
                p.textContent = getUnicode(piece);

                if (!isTouch && piece.color === playerRole) {
                    p.draggable = true;
                    p.ondragstart = () => {
                        dragged = p;
                        source = { r, c };
                    };
                    p.ondragend = () => {
                        dragged = null;
                        source = null;
                    };
                }

                sq.appendChild(p);
            }

            if (isTouch) {
                sq.addEventListener("click", () => onTap(piece, r, c, sq));
            }

            sq.ondragover = e => e.preventDefault();
            sq.ondrop = () => {
                if (dragged && source && playerRole) {
                    move(source, { r, c });
                }
            };

            boardEl.appendChild(sq);
        });
    });

    boardEl.classList.toggle("flipped", playerRole === "b");
}

function onTap(piece, r, c, sq) {
    if (!playerRole) return;

    document.querySelectorAll(".square.tap")
  .forEach(s => s.classList.remove("tap"));
sq.classList.add("tap");

    if (!selected) {
        if (piece && piece.color === playerRole) {
            selected = { r, c };
            sq.classList.add("drag-over");
        }
        return;
    }

    move(selected, { r, c });
    clearSelection();
}

function clearSelection() {
    selected = null;
    document
        .querySelectorAll(".drag-over")
        .forEach(el => el.classList.remove("drag-over"));
}

function move(from, to) {
    socket.emit("move", {
        from: `${String.fromCharCode(97 + from.c)}${8 - from.r}`,
        to: `${String.fromCharCode(97 + to.c)}${8 - to.r}`,
        promotion: "q"
    });
}

function getUnicode(p) {
    const u = {
        p:"♟", r:"♜", n:"♞", b:"♝", q:"♛", k:"♚",
        P:"♙", R:"♖", N:"♘", B:"♗", Q:"♕", K:"♔"
    };
    return u[p.color === "w" ? p.type.toUpperCase() : p.type];
}

function showToast(message, duration = 2000) {
    toast.textContent = message;
    toast.classList.remove("hidden");

    setTimeout(() => {
        toast.classList.add("hidden");
    }, duration);
}

function move(from, to) {
    if (gameEnded) return;
    socket.emit("move", {
        from: `${String.fromCharCode(97 + from.c)}${8 - from.r}`,
        to: `${String.fromCharCode(97 + to.c)}${8 - to.r}`,
        promotion: "q"
    });
}

socket.on("boardState", fen => {
    chess.load(fen);
    gameEnded = false;
    renderBoard();
});

socket.on("playerRole", r => {
    playerRole = r;
    renderBoard();
});

socket.on("spectatorRole", () => {
    playerRole = null;
    renderBoard();
});

socket.on("boardState", fen => {
    chess.load(fen);
    renderBoard();
});

socket.on("status", msg => {
    statusEl.textContent = msg;
});

socket.on("invalidMove", () => {
    showToast("Illegal move! Try again");
    selected = null;
    clearSelection();
});

restartBtn.onclick = () => {
    if (playerRole) socket.emit("restart");
};

socket.on("counts", data => {
    countEl.innerText =
        `Players: ${data.players} | Spectators: ${data.spectators}`;
});

socket.on("gameOver", data => {
    if (data.type === "checkmate") {
        showToast(`Checkmate! ${data.winner} wins 👑`, 4000);
        statusEl.textContent = `Checkmate — ${data.winner} wins`;
    }

    if (data.type === "stalemate") {
        showToast("Stalemate! It's a draw 🤝", 4000);
        statusEl.textContent = "Stalemate — Draw";
    }

    if (data.type === "draw") {
        showToast("Draw!", 4000);
        statusEl.textContent = "Draw";
    }
});
let gameEnded = false;
socket.on("gameOver", () => {
    gameEnded = true;
});
