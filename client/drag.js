let playerBoard = Array(10).fill().map(() => Array(10).fill(0));

document.getElementById("playerBoard").addEventListener("click", (e) => {
  if (e.target.classList.contains("cell")) {
    const x = parseInt(e.target.dataset.x);
    const y = parseInt(e.target.dataset.y);

    if (playerBoard[y][x] === 0) {
      playerBoard[y][x] = 1;
      e.target.classList.add("ship");
    }
  }
});