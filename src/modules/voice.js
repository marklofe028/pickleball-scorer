/**
 * Decode an audio Blob ArrayBuffer and resample it to a 16 kHz Float32Array.
 * Whisper always expects 16 kHz mono PCM; this also creates an independent
 * copy so the data survives AudioContext.close() and postMessage serialisation.
 */
async function resampleTo16k(arrayBuffer) {
  const decodeCtx = new AudioContext();
  const decoded = await decodeCtx.decodeAudioData(arrayBuffer);

  if (decoded.sampleRate === 16000) {
    const copy = new Float32Array(decoded.getChannelData(0));
    await decodeCtx.close();
    return copy;
  }

  const targetLength = Math.ceil(decoded.duration * 16000);
  const offlineCtx = new OfflineAudioContext(1, targetLength, 16000);
  const src = offlineCtx.createBufferSource();
  src.buffer = decoded;
  src.connect(offlineCtx.destination);
  src.start(0);
  const resampled = await offlineCtx.startRendering();
  await decodeCtx.close();
  return new Float32Array(resampled.getChannelData(0));
}

/**
 * VoiceEngine — wraps Web Speech API (recognition + synthesis).
 *
 * Modes:
 *   one-shot  (default) — tap mic, speak one command, recognition stops.
 *   continuous          — recognition restarts automatically after each result.
 *
 * Callbacks:
 *   onCommand({ type })   — fired when a command is parsed
 *   onTranscript(text)    — fired with raw transcript (for visual feedback)
 *   onListeningChange(bool)
 */
export class VoiceEngine {
  constructor({ teamAName = 'Team A', teamBName = 'Team B', onCommand, onTranscript, onListeningChange } = {}) {
    this.teamAName = teamAName.toLowerCase();
    this.teamBName = teamBName.toLowerCase();
    this.onCommand = onCommand || (() => {});
    this.onTranscript = onTranscript || (() => {});
    this.onListeningChange = onListeningChange || (() => {});

    this.recognition = null;
    this.synthesis = window.speechSynthesis || null;
    this.isListening = false;
    this.continuous = false;

    this._initRecognition();
  }

  get isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  get isSynthesisSupported() {
    return !!this.synthesis;
  }

  _initRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    this.recognition = new SR();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 3;

    this.recognition.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map(r => r[0].transcript)
        .join(' ')
        .toLowerCase()
        .trim();

      this.onTranscript(transcript);
      const cmd = this._parse(transcript);
      if (cmd) this.onCommand(cmd);
    };

    this.recognition.onaudiostart = () => {
      this.onListeningChange(true);
    };

    this.recognition.onerror = (e) => {
      const fatal = ['not-allowed', 'service-not-allowed', 'audio-capture'];
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        this.isListening = false;
        this.onCommand({ type: 'MIC_DENIED' });
      } else if (e.error === 'audio-capture') {
        this.isListening = false;
        this.onCommand({ type: 'VOICE_ERROR', message: 'Microphone not available' });
      } else if (e.error === 'network') {
        this.isListening = false;
        this.onCommand({ type: 'VOICE_ERROR', message: 'Voice needs an internet connection' });
      }
      // 'no-speech' and 'aborted' are expected — let onend handle restart
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        setTimeout(() => {
          try { this.recognition.start(); } catch { /* already restarting */ }
        }, 150);
      } else {
        this.onListeningChange(false);
      }
    };
  }

  /** Parse a lowercase transcript into a command object or null. */
  _parse(t) {
    const teamA = this.teamAName;
    const teamB = this.teamBName;

    // --- score reading (must check before point detection) ---
    if (/^score$/.test(t) || /what'?s? (the )?score/.test(t) || /read score|current score/.test(t)) {
      return { type: 'READ_SCORE' };
    }

    // --- game management ---
    if (/\bnew\s*game\b|\breset\b/.test(t)) return { type: 'NEW_GAME' };
    if (/\bundo\b|\btake\s*back\b/.test(t)) return { type: 'UNDO' };
    if (/\bside.?out\b|\bchange\s*serv/.test(t)) return { type: 'SIDE_OUT' };
    if (/who.{0,10}serv/.test(t) || /\bserving\b/.test(t)) return { type: 'WHO_SERVES' };

    // --- point detection ---
    const hasPointWord = /\b(point|scored?|gets?|fault|foul|wins?|won)\b/.test(t);
    const hasTeamA = t.includes(teamA) || /\bteam\s*a\b|\bone\b|\bfirst\b/.test(t);
    const hasTeamB = t.includes(teamB) || /\bteam\s*b\b|\btwo\b|\bsecond\b/.test(t);

    // Strict match: point keyword + team indicator
    if (hasPointWord && hasTeamA && !hasTeamB) return { type: 'POINT_A' };
    if (hasPointWord && hasTeamB && !hasTeamA) return { type: 'POINT_B' };

    // Lenient match: just the team indicator in a short utterance
    if (!hasPointWord && hasTeamA && !hasTeamB && t.length <= 25) return { type: 'POINT_A' };
    if (!hasPointWord && hasTeamB && !hasTeamA && t.length <= 25) return { type: 'POINT_B' };

    return null;
  }

  startListening() {
    if (!this.recognition || this.isListening) return;
    this.isListening = true;
    this.onListeningChange(true);
    try {
      this.recognition.start();
    } catch {
      this.isListening = false;
      this.onListeningChange(false);
    }
  }

  stopListening() {
    if (!this.recognition) return;
    this.continuous = false;
    this.isListening = false;
    this.onListeningChange(false);
    try { this.recognition.abort(); } catch { /* ignore */ }
  }

  toggleListening() {
    if (this.isListening) this.stopListening();
    else this.startListening();
  }

  setContinuous(enabled) {
    // no-op — auto-restart is always on when listening
  }

  speak(text) {
    if (!this.synthesis) return;
    this.synthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.92;
    utt.pitch = 1.0;
    utt.volume = 1.0;
    this.synthesis.speak(utt);
  }

  updateTeamNames(teamAName, teamBName) {
    this.teamAName = teamAName.toLowerCase();
    this.teamBName = teamBName.toLowerCase();
  }
}

/**
 * WhisperEngine — offline-capable voice engine using Whisper via Transformers.js.
 *
 * Model (~40 MB) is downloaded on first use and cached in the browser's Cache API.
 * After the first online session it works fully offline.
 *
 * Same external interface as VoiceEngine plus:
 *   onModelStatus({ state: 'loading'|'ready'|'error', progress?, message? })
 */
export class WhisperEngine {
  constructor({ teamAName = 'Team A', teamBName = 'Team B', onCommand, onTranscript, onListeningChange, onModelStatus } = {}) {
    this.teamAName = teamAName.toLowerCase();
    this.teamBName = teamBName.toLowerCase();
    this.onCommand = onCommand || (() => {});
    this.onTranscript = onTranscript || (() => {});
    this.onListeningChange = onListeningChange || (() => {});
    this.onModelStatus = onModelStatus || (() => {});

    this.isListening = false;
    this.modelReady = false;
    this.synthesis = window.speechSynthesis || null;

    this._worker = null;
    this._stream = null;
    this._recorder = null;
    this._audioCtx = null;

    this._initWorker();
  }

  get isSupported() {
    return typeof Worker !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  }

  _initWorker() {
    if (!this.isSupported) return;
    this._worker = new Worker(new URL('./whisper-worker.js', import.meta.url), { type: 'module' });
    this._worker.onmessage = ({ data }) => {
      switch (data.type) {
        case 'progress':
          this.onModelStatus({ state: 'loading', progress: data.value });
          break;
        case 'ready':
          this.modelReady = true;
          this.onModelStatus({ state: 'ready' });
          break;
        case 'transcript': {
          const text = data.text.toLowerCase().trim();
          if (text) {
            this.onTranscript(text);
            const cmd = this._parse(text);
            if (cmd) this.onCommand(cmd);
          }
          // Auto-restart if still in listening mode
          if (this.isListening) this._record();
          else this.onListeningChange(false);
          break;
        }
        case 'error':
          this.onModelStatus({ state: 'error', message: data.message });
          if (this.isListening) this._record(); // retry on non-fatal errors
          break;
      }
    };
    this._worker.postMessage({ type: 'load' });
    this.onModelStatus({ state: 'loading', progress: 0 });
  }

  startListening() {
    if (this.isListening) return;
    if (!this.modelReady) {
      this.onCommand({ type: 'VOICE_ERROR', message: 'Voice model loading — please wait' });
      return;
    }
    this.isListening = true;
    this.onListeningChange(true);
    this._record();
  }

  stopListening() {
    this.isListening = false;
    this._stopRecord();
    this.onListeningChange(false);
  }

  async _record() {
    if (!this.isListening) return;
    try {
      this._stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this._audioCtx = new AudioContext();

      const source = this._audioCtx.createMediaStreamSource(this._stream);
      const analyser = this._audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);

      const chunks = [];
      this._recorder = new MediaRecorder(this._stream);
      this._recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      this._recorder.onstop = async () => {
        this._cleanupRecording();
        if (!chunks.length) { if (this.isListening) this._record(); return; }
        try {
          const blob = new Blob(chunks, { type: this._recorder?.mimeType || 'audio/webm' });
          const arrayBuffer = await blob.arrayBuffer();
          const audio = await resampleTo16k(arrayBuffer);
          this._worker.postMessage({ type: 'transcribe', audio, sampleRate: 16000 });
        } catch {
          if (this.isListening) this._record();
        }
      };

      this._recorder.start(100);

      // Silence detection — stop after 800 ms quiet following detected speech
      const bufData = new Uint8Array(analyser.frequencyBinCount);
      let speechStarted = false;
      let silenceTimer = null;

      const tick = () => {
        if (!this.isListening || this._recorder?.state !== 'recording') return;
        analyser.getByteTimeDomainData(bufData);
        let sum = 0;
        for (let i = 0; i < bufData.length; i++) {
          const v = (bufData[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / bufData.length);

        if (rms > 0.015) {
          speechStarted = true;
          clearTimeout(silenceTimer);
          silenceTimer = null;
        } else if (speechStarted && !silenceTimer) {
          silenceTimer = setTimeout(() => {
            if (this._recorder?.state === 'recording') this._recorder.stop();
          }, 800);
        }
        requestAnimationFrame(tick);
      };
      tick();

      // Hard max: 7 seconds per segment
      setTimeout(() => {
        if (this._recorder?.state === 'recording') this._recorder.stop();
      }, 7000);

    } catch (e) {
      this.isListening = false;
      this.onListeningChange(false);
      if (e.name === 'NotAllowedError') {
        this.onCommand({ type: 'MIC_DENIED' });
      } else {
        this.onCommand({ type: 'VOICE_ERROR', message: 'Microphone unavailable' });
      }
    }
  }

  _cleanupRecording() {
    this._stream?.getTracks().forEach(t => t.stop());
    this._audioCtx?.close().catch(() => {});
    this._stream = null;
    this._audioCtx = null;
    this._recorder = null;
  }

  _stopRecord() {
    try { if (this._recorder?.state === 'recording') this._recorder.stop(); } catch {}
    this._cleanupRecording();
  }

  speak(text) {
    if (!this.synthesis) return;
    this.synthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.92;
    utt.pitch = 1.0;
    utt.volume = 1.0;
    this.synthesis.speak(utt);
  }

  updateTeamNames(teamAName, teamBName) {
    this.teamAName = teamAName.toLowerCase();
    this.teamBName = teamBName.toLowerCase();
  }

  _parse(t) {
    const teamA = this.teamAName;
    const teamB = this.teamBName;

    if (/^score$/.test(t) || /what'?s? (the )?score/.test(t) || /read score|current score/.test(t)) {
      return { type: 'READ_SCORE' };
    }
    if (/\bnew\s*game\b|\breset\b/.test(t)) return { type: 'NEW_GAME' };
    if (/\bundo\b|\btake\s*back\b/.test(t)) return { type: 'UNDO' };
    if (/\bside.?out\b|\bchange\s*serv/.test(t)) return { type: 'SIDE_OUT' };
    if (/who.{0,10}serv/.test(t) || /\bserving\b/.test(t)) return { type: 'WHO_SERVES' };

    const hasPointWord = /\b(point|scored?|gets?|fault|foul|wins?|won)\b/.test(t);
    const hasTeamA = t.includes(teamA) || /\bteam\s*a\b|\bone\b|\bfirst\b/.test(t);
    const hasTeamB = t.includes(teamB) || /\bteam\s*b\b|\btwo\b|\bsecond\b/.test(t);

    if (hasPointWord && hasTeamA && !hasTeamB) return { type: 'POINT_A' };
    if (hasPointWord && hasTeamB && !hasTeamA) return { type: 'POINT_B' };
    if (!hasPointWord && hasTeamA && !hasTeamB && t.length <= 25) return { type: 'POINT_A' };
    if (!hasPointWord && hasTeamB && !hasTeamA && t.length <= 25) return { type: 'POINT_B' };

    return null;
  }
}
