const socket = io();
const chess = new Chess();
const boardEl = document.querySelector(".chessboard");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restart");

let playerRole = null;   // "w" | "b" | "spectator"
let dragged = null;
let source = null;
let selected = null;

socket.on("connect", () => {
    if (statusEl) statusEl.textContent = "Connected. Waiting for opponent...";
});

const isTouch =
    "ontouchstart" in window || navigator.maxTouchPoints > 0;

/* ===========================
   BOARD RENDERING
=========================== */
function renderBoard() {
    boardEl.innerHTML = "";
    const board = chess.board();

    board.forEach((row, r) => {
        row.forEach((piece, c) => {
            const sq = document.createElement("div");
            sq.className = `square ${(r + c) % 2 ? "dark" : "light"}`;
            sq.dataset.row = r;
            sq.dataset.col = c;

            if (piece) {
                const p = document.createElement("div");
                p.className = `piece ${piece.color === "w" ? "white" : "black"}`;
                p.textContent = getUnicode(piece);

                // 🖱️ DRAG SUPPORT (DESKTOP)
                if (!isTouch && piece.color === playerRole) {
                    p.draggable = true;

                    p.addEventListener("dragstart", () => {
                        dragged = p;
                        source = { r, c };
                    });

                    p.addEventListener("dragend", () => {
                        dragged = null;
                        source = null;
                    });
                }

                sq.appendChild(p);
            }

            // 📱 TAP SUPPORT (MOBILE)
            if (isTouch) {
                sq.addEventListener("click", () =>
                    tapMove(piece, r, c, sq)
                );
            }

            // DROP TARGET
            sq.addEventListener("dragover", e => e.preventDefault());
            sq.addEventListener("drop", () => {
                if (dragged && source) {
                    move(source, { r, c });
                }
            });

            boardEl.appendChild(sq);
        });
    });

    // 🔄 FLIP BOARD FOR BLACK
    boardEl.classList.toggle("flipped", playerRole === "b");
}

/* ===========================
   TOUCH MOVE HANDLING
=========================== */
function tapMove(piece, r, c, sq) {
    if (!selected && piece && piece.color === playerRole) {
        selected = { r, c };
        sq.classList.add("drag-over");
    } else if (selected) {
        move(selected, { r, c });
        selected = null;
        clearHighlights();
    }
}

function clearHighlights() {
    document
        .querySelectorAll(".square.drag-over")
        .forEach(sq => sq.classList.remove("drag-over"));
}

/* ===========================
   SEND MOVE TO SERVER
=========================== */
function move(from, to) {
    socket.emit("move", {
        from: `${String.fromCharCode(97 + from.c)}${8 - from.r}`,
        to: `${String.fromCharCode(97 + to.c)}${8 - to.r}`,
        promotion: "q"
    });
}

/* ===========================
   PIECE UNICODE
=========================== */
function getUnicode(p) {
    const u = {
        p:"♟", r:"♜", n:"♞", b:"♝", q:"♛", k:"♚",
        P:"♙", R:"♖", N:"♘", B:"♗", Q:"♕", K:"♔"
    };
    return u[p.color === "w" ? p.type.toUpperCase() : p.type];
}

/* ===========================
   SOCKET EVENTS (NEW + OLD)
=========================== */

// ROLE ASSIGNMENT
socket.on("role", r => {
    playerRole = r === "spectator" ? null : r;
    renderBoard();
});

// BACKWARD COMPAT (old server)
socket.on("playerRole", r => {
    playerRole = r;
    renderBoard();
});
socket.on("spectatorRole", () => {
    playerRole = null;
    renderBoard();
});

// BOARD SYNC
socket.on("board", fen => {
    chess.load(fen);
    renderBoard();
});
socket.on("boardState", fen => {
    chess.load(fen);
    renderBoard();
});

// STATUS MESSAGE (WAITING / GAME STATE)
socket.on("status", msg => {
    if (statusEl) statusEl.textContent = msg;
});

// INVALID MOVE
socket.on("invalidMove", () => {
    showToast("Illegal move! Please try again.");
    dragged = null;
    source = null;
    selected = null;
    clearHighlights();
    renderBoard();
});
socket.on("invalid", () => {
    showToast("Illegal move! Please try again.");
});

/* ===========================
   RESTART GAME
=========================== */
if (restartBtn) {
    restartBtn.addEventListener("click", () => {
        socket.emit("restart");
    });
}

function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 10);

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}
