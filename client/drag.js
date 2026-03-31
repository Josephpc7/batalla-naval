let playerBoard = Array(10).fill().map(() => Array(10).fill(0));

function placeShip(x, y) {
  if (playerBoard[y][x] === 0) {
    playerBoard[y][x] = 1;
    document.querySelector(`[data-x='${x}'][data-y='${y}']`).classList.add("ship");
  }
}

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("cell")) {
    placeShip(e.target.dataset.x, e.target.dataset.y);
  }
});