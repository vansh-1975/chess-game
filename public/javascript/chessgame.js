const socket = io();
const chess = new Chess();
const boardEl = document.querySelector(".chessboard");

let playerRole = null;
let dragged = null;
let source = null;
let selected = null;

const isTouch =
    "ontouchstart" in window || navigator.maxTouchPoints > 0;

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

                if (!isTouch && piece.color === playerRole) {
                    p.draggable = true;
                    p.addEventListener("dragstart", () => {
                        dragged = p;
                        source = { r, c };
                    });
                    p.addEventListener("dragend", () => {
                        dragged = source = null;
                    });
                }

                sq.appendChild(p);
            }

            if (isTouch) {
                sq.addEventListener("click", () => tapMove(piece, r, c, sq));
            }

            sq.addEventListener("dragover", e => e.preventDefault());
            sq.addEventListener("drop", () => {
                if (dragged) move(source, { r, c });
            });

            boardEl.appendChild(sq);
        });
    });

    boardEl.classList.toggle("flipped", playerRole === "b");
}

function tapMove(piece, r, c, sq) {
    if (!selected && piece && piece.color === playerRole) {
        selected = { r, c };
        sq.classList.add("drag-over");
    } else if (selected) {
        move(selected, { r, c });
        selected = null;
    }
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

socket.on("playerRole", r => { playerRole = r; renderBoard(); });
socket.on("spectatorRole", () => { playerRole = null; renderBoard(); });
socket.on("boardState", fen => { chess.load(fen); renderBoard(); });

socket.on("invalid-move", move => {
    showToast("Illegal move! Please try again.");
    dragged = null;
    source = null;
    selected = null;
    renderBoard();
});

function showToast(message) {
    let toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add("show");
    }, 10);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}
