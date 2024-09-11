export default class AudioManager {
  constructor() {
    this.audio = {};
    this.isMuted = false;
  }

  setAudioElement(name, url) {
    const audioElement = document.createElement("audio");
    document.body.appendChild(audioElement);
    audioElement.setAttribute("src", url);
    this.audio[name] = audioElement;
  }

  preload() {
    // this.setAudioElement("bang", "bang.mp3");
    this.setAudioElement("blaster", "blaster.mp3");
    this.setAudioElement("boom", "bang.mp3");
    this.setAudioElement("burn", "burn.mp3");
    this.setAudioElement("energy", "energy.mp3");
    this.setAudioElement("explosion", "explosion.mp3");
    this.setAudioElement("fire", "fire.mp3");
    this.setAudioElement("laser", "laser.mp3");
    this.setAudioElement("shield", "shield.mp3");
    // boom.playMode("restart");
    // burn.playMode("restart");
  }

  play(name, resume = false) {
    if (this.isMuted) return;
    if (this.audio[name]) {
      if (!this.audio[name].paused) {
        this.audio[name].pause();
        if (!resume) {
          this.audio[name].currentTime = 0;
        }
      }
      this.audio[name].play().catch((error) => {
        console.log(`Audio ${name} play failed:`, error);
      });
    } else {
      console.log(`Audio ${name} not found`);
    }
  }

  pause(name) {
    if (this.audio[name]) {
      if (!this.audio[name].paused) {
        this.audio[name].pause();
      } else {
        console.log(`Audio ${name} is already paused`);
      }
    } else {
      console.log(`Audio ${name} not found`);
    }
  }

  stop(name) {
    if (this.audio[name]) {
      this.audio[name].pause();
      this.audio[name].currentTime = 0;
    } else {
      console.log(`Audio ${name} not found`);
    }
  }

  isPlaying(name) {
    if (this.audio[name]) {
      return !this.audio[name].paused;
    } else {
      console.log(`Audio ${name} not found`);
      return false;
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    Object.values(this.audio).forEach((audio) => {
      audio.muted = this.isMuted;
      if (this.isMuted) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
  }
}
