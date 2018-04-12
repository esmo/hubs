AFRAME.registerComponent("in-world-hud", {
  schema: {
    haptic: { type: "selector" },
    raycaster: { type: "selector" }
  },
  init() {
    this.mic = this.el.querySelector(".mic");

    const muted = this.el.sceneEl.is("muted");
    this.mic.setAttribute("src", muted ? "#muted" : "#unmuted");

    this.showCorrectMuteState = () => {
      const muted = this.el.sceneEl.is("muted");
      this.mic.setAttribute("src", muted ? "#muted" : "#unmuted");
    };

    this.onStateChange = evt => {
      if (evt.detail !== "muted") return;
      this.showCorrectMuteState();
    };

    this.onMicHover = () => {
      this.hoveredOnMic = true;
      this.data.haptic.emit("haptic_pulse", { intensity: "low" });
      this.mic.setAttribute("material", "color", "#1DD");
    };

    this.onMicHoverExit = () => {
      this.hoveredOnMic = false;
      this.mic.setAttribute("material", "color", "#FFF");
      this.showCorrectMuteState();
    };

    this.onMicDown = () => {
      this.data.haptic.emit("haptic_pulse", { intensity: "medium" });
      this.el.sceneEl.removeEventListener("micAudio", this.onAudioFrequencyChange);
      this.mic.setAttribute("material", "color", this.el.sceneEl.is("muted") ? "#0FA" : "#F33");
      this.el.emit("action_mute");
      window.setTimeout(() => {
        this.mic.setAttribute("material", "color", "#FFF");
        this.el.sceneEl.addEventListener("micAudio", this.onAudioFrequencyChange);
      }, 150);
    };

    this.onClick = () => {
      if (this.hoveredOnMic) {
        this.onMicDown();
      }
    };

    this.onAudioFrequencyChange = e => {
      if (this.hoveredOnMic) return;
      const red = 1.0 - e.detail.volume / 10.0;
      this.mic.object3DMap.mesh.material.color = { r: red, g: 9, b: 9 };
    };

    this.el.sceneEl.addEventListener("mediaStream", evt => {
      this.ms = evt.detail.ms;
      const ctx = THREE.AudioContext.getContext();
      const source = ctx.createMediaStreamSource(this.ms);
      this.analyser = ctx.createAnalyser();
      this.levels = new Uint8Array(this.analyser.frequencyBinCount);
      source.connect(this.analyser);
    });
  },

  play() {
    this.mic.addEventListener("raycaster-intersected", this.onMicHover);
    this.mic.addEventListener("raycaster-intersected-cleared", this.onMicHoverExit);

    this.el.sceneEl.addEventListener("stateadded", this.onStateChange);
    this.el.sceneEl.addEventListener("stateremoved", this.onStateChange);

    this.el.addEventListener("click", this.onClick);

    this.el.sceneEl.addEventListener("micAudio", this.onAudioFrequencyChange);
  },

  pause() {
    this.el.sceneEl.removeEventListener("stateadded", this.onStateChange);
    this.el.sceneEl.removeEventListener("stateremoved", this.onStateChange);

    this.el.removeEventListener("click", this.onClick);

    this.el.sceneEl.removeEventListener("micAudio", this.onAudioFrequencyChange);
  },

  tick: function() {
    if (!this.analyser) return;

    this.analyser.getByteFrequencyData(this.levels);

    let sum = 0;
    for (let i = 0; i < this.levels.length; i++) {
      sum += this.levels[i];
    }
    this.volume = sum / this.levels.length;
    this.el.emit("micAudio", {
      volume: this.volume,
      levels: this.levels
    });
  }
});
