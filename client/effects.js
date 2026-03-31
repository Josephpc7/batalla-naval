function explosionEffect(cell) {
  gsap.fromTo(cell, 
    { scale: 1 }, 
    { scale: 1.5, yoyo: true, repeat: 1, duration: 0.2 }
  );
}

function waterEffect(cell) {
  gsap.to(cell, {
    backgroundColor: "#00aaff",
    duration: 0.3
  });
}

function shake() {
  gsap.fromTo("#playerBoard", 
    { x: -5 }, 
    { x: 5, repeat: 5, yoyo: true, duration: 0.05 }
  );
}