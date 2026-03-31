function createBoard(id, clickable = false) {
  const board = document.getElementById(id);
  board.innerHTML = "";

  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.x = x;
      cell.dataset.y = y;

      if (clickable) {
        cell.addEventListener("click", () => shoot(x, y));
        cell.addEventListener("mouseenter", playRadar);
      }

      board.appendChild(cell);
    }
  }
}