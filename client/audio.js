const explosionSound = new Howl({
  src: ['https://cdn.pixabay.com/download/audio/2022/03/15/audio_115b9b3c1d.mp3']
});

const waterSound = new Howl({
  src: ['https://cdn.pixabay.com/download/audio/2022/03/10/audio_273b8b4f9c.mp3']
});

const radarSound = new Howl({
  src: ['https://cdn.pixabay.com/download/audio/2021/08/04/audio_c6ccf9a8b2.mp3']
});

function playExplosion() { explosionSound.play(); }
function playWater() { waterSound.play(); }
function playRadar() { radarSound.play(); }