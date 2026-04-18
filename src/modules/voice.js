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

    this.recognition.onerror = (e) => {
      if (e.error === 'not-allowed') {
        this.onCommand({ type: 'MIC_DENIED' });
      }
      // 'no-speech' and 'aborted' are expected — ignore silently
    };

    this.recognition.onend = () => {
      // Always auto-restart while listening — more reliable than continuous:true
      if (this.isListening) {
        setTimeout(() => {
          try { this.recognition.start(); } catch { /* already restarting */ }
        }, 120);
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
