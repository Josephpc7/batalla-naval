const explosionSound = new Howl({ src: ['https://actions.google.com/sounds/v1/explosions/explosion.ogg'] });
const waterSound = new Howl({ src: ['https://actions.google.com/sounds/v1/water/water_splash.ogg'] });
const radarSound = new Howl({ src: ['https://actions.google.com/sounds/v1/alarms/beep_short.ogg'] });

function playExplosion() { explosionSound.play(); }
function playWater() { waterSound.play(); }
function playRadar() { radarSound.play(); }