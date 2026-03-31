const explosionSound = new Howl({
  src: ['sounds/explosion.mp3']
});

const waterSound = new Howl({
  src: ['sounds/water.mp3']
});

const radarSound = new Howl({
  src: ['sounds/radar.mp3']
});

function playExplosion() { explosionSound.play(); }
function playWater() { waterSound.play(); }
function playRadar() { radarSound.play(); }