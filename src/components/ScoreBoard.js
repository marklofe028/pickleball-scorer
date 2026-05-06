import { getScoreDisplay } from '../modules/scoring.js';
import { escapeHtml } from '../modules/utils.js';

export class ScoreBoard {
  constructor(container, dispatch) {
    this.container = container;
    this.dispatch = dispatch;
    this._init();
  }

  _init() {
    this.container.innerHTML = `
      <div class="screen scoreboard-screen">
        <header class="app-header">
          <button class="btn-icon" data-action="newGame" aria-label="New Game" title="New Game">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div class="app-header__brand">
            <img src="icons/icon.svg" class="app-header__logo" alt="">
            <span class="app-header__title">Pickle Score</span>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn-icon" data-action="showDiag" aria-label="Diagnostics" title="Mic diagnostics">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14M15.54 8.46a5 5 0 010 7.07M8.46 8.46a5 5 0 000 7.07"/></svg>
            </button>
            <button class="btn-icon" data-action="showVcmd" aria-label="Voice commands help" title="Voice commands" style="font-size:1rem;font-weight:700;color:var(--green)">?</button>
            <button class="btn-icon" data-action="history" aria-label="History" title="History">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>
            </button>
          </div>
        </header>

        <main class="scoreboard-main" role="main">
          <!-- Teams row -->
          <div class="teams-row">
            <div class="team team--a" id="teamA">
              <div class="team__header">
                <div class="team__serve-dot" id="serveDotA" aria-hidden="true"></div>
                <div class="team__name" id="teamAName">Team A</div>
              </div>
              <div class="team__score" id="scoreA" aria-live="polite">0</div>
              <button class="btn-point btn-point--a" data-team="A" id="btnA" aria-label="Point for Team A">
                + Point
              </button>
            </div>

            <div class="score-center">
              <div class="score-center__vs">VS</div>
              <div class="score-center__server" id="serverInfo"></div>
              <div class="score-format-badge" id="scoreFormatBadge"></div>
            </div>

            <div class="team team--b" id="teamB">
              <div class="team__header">
                <div class="team__serve-dot" id="serveDotB" aria-hidden="true"></div>
                <div class="team__name" id="teamBName">Team B</div>
              </div>
              <div class="team__score" id="scoreB" aria-live="polite">0</div>
              <button class="btn-point btn-point--b" data-team="B" id="btnB" aria-label="Point for Team B">
                + Point
              </button>
            </div>
          </div>

          <!-- Game meta -->
          <div class="game-meta" id="gameMeta"></div>

          <!-- Voice transcript feedback -->
          <div class="voice-transcript" id="voiceTranscript" style="display:none">
            <span class="voice-transcript__icon">🎤</span>
            <span id="voiceTranscriptText"></span>
          </div>

          <!-- Voice command pending confirmation -->
          <div class="voice-pending" id="voicePending" style="display:none" role="alertdialog" aria-label="Confirm voice command">
            <div class="voice-pending__label">Side-out detected — confirm?</div>
            <div class="voice-pending__actions">
              <button class="voice-pending__confirm" data-action="confirmVoicePending">Confirm</button>
              <button class="voice-pending__cancel" data-action="cancelVoicePending">Cancel</button>
            </div>
            <div class="voice-pending__bar"><div class="voice-pending__bar-fill" id="voicePendingBar"></div></div>
          </div>
        </main>

        <footer class="scoreboard-footer">
          <button class="footer-btn" data-action="undo" id="btnUndo" aria-label="Undo last point">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a7 7 0 010 14H4"/></svg>
            Undo
          </button>
          <button class="footer-btn footer-btn--voice" data-action="tapListen" id="btnListen" aria-label="Voice command — tap then speak">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0014 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
            <span id="listenLabel">Listen</span>
          </button>
          <button class="footer-btn footer-btn--speak" data-action="speakScore" aria-label="Read score aloud">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>
            Score
          </button>
          <button class="footer-btn" data-action="showVcmd" aria-label="Voice commands reference" style="color:var(--green);border-color:var(--green-dim)">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Commands
          </button>
        </footer>

        <!-- Voice Commands bottom sheet -->
        <div class="vcmd-overlay" id="vcmdOverlay" style="display:none" role="dialog" aria-modal="true" aria-label="Voice commands">
          <div class="vcmd-sheet">
            <div class="vcmd-sheet__header">
              <div class="vcmd-sheet__title">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0014 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
                Voice Commands
              </div>
              <button class="vcmd-close" data-action="closeVcmd" aria-label="Close">✕</button>
            </div>
            <div class="vcmd-note">
              Tap <strong>Listen</strong> then speak — or enable <strong>Always On</strong> for hands-free scoring. Use your team names for best accuracy.
            </div>
            <table class="voice-cmd-table">
              <tbody id="vcmdTeamRows">
                <tr><td class="voice-cmd-table__say">"score"</td><td>Read current score aloud</td></tr>
                <tr><td class="voice-cmd-table__say">"server"</td><td>Point for the serving team</td></tr>
                <tr><td class="voice-cmd-table__say">"receiver"</td><td>Point for the receiving team</td></tr>
                <tr><td class="voice-cmd-table__say">"point [team name]"</td><td>Add a point to that team</td></tr>
                <tr><td class="voice-cmd-table__say">"point a" / "point b"</td><td>Generic team A or B</td></tr>
                <tr><td class="voice-cmd-table__say">"change server"</td><td>Server 1 loses — server 2 takes over (same team)</td></tr>
                <tr><td class="voice-cmd-table__say">"second server"</td><td>Same as "change server"</td></tr>
                <tr><td class="voice-cmd-table__say">"side out"</td><td>Server 2 loses — other team gets serve</td></tr>
                <tr><td class="voice-cmd-table__say">"undo"</td><td>Reverse last rally</td></tr>
                <tr><td class="voice-cmd-table__say">"who's serving"</td><td>Announce serving team</td></tr>
                <tr><td class="voice-cmd-table__say">"new game"</td><td>Start a new game</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Game Over overlay -->
        <div class="gameover-overlay" id="gameoverOverlay" style="display:none" role="dialog" aria-modal="true">
          <div class="gameover-card">
            <div class="gameover-trophy">🏆</div>
            <div class="gameover-title">Game Over!</div>
            <div class="gameover-winner" id="gameoverWinner"></div>
            <div class="gameover-score" id="gameoverScore"></div>
            <div class="gameover-actions">
              <button class="btn-primary" data-action="newGame">New Game</button>
              <button class="btn-secondary" data-action="history">View History</button>
            </div>
          </div>
        </div>

        <!-- Listening pulse ring -->
        <div class="listening-ring" id="listeningRing" style="display:none"></div>

        <!-- Diagnostics overlay -->
        <div class="vcmd-overlay" id="diagOverlay" style="display:none" role="dialog" aria-modal="true" aria-label="Mic diagnostics">
          <div class="vcmd-sheet">
            <div class="vcmd-sheet__header">
              <div class="vcmd-sheet__title">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg>
                Mic Diagnostics
              </div>
              <button class="vcmd-close" data-action="closeDiag" aria-label="Close">✕</button>
            </div>

            <div class="diag-row">
              <span class="diag-label">Whisper model</span>
              <span class="diag-value" id="diagModelStatus">—</span>
            </div>
            <div class="diag-row">
              <span class="diag-label">Mic permission</span>
              <span class="diag-value" id="diagMicPerm">—</span>
            </div>

            <div class="diag-level-wrap">
              <div class="diag-level-label">Audio level</div>
              <div class="diag-level-bar-bg">
                <div class="diag-level-bar" id="diagLevelBar" style="width:0%"></div>
              </div>
            </div>

            <div class="diag-transcript-box" id="diagTranscriptBox">
              <span class="diag-transcript-placeholder">Transcript will appear here…</span>
            </div>

            <div style="display:flex;gap:8px;margin-top:12px">
              <button class="btn-primary" id="diagTestBtn" data-action="diagTest" style="flex:1;padding:10px">▶ Start Test</button>
            </div>
            <p class="form-hint" style="text-align:center;margin-top:8px" id="diagHint">Tap Start, then speak anything into the mic.</p>
          </div>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  update(state) {
    const { game, voiceListening, voicePending } = state;

    // Voice pending confirmation banner
    const pendingEl = this.container.querySelector('#voicePending');
    if (pendingEl) {
      if (voicePending) {
        pendingEl.style.display = 'flex';
        const remaining = Math.max(0, voicePending.expiresAt - Date.now());
        const pct = (remaining / 10000) * 100;
        const barFill = this.container.querySelector('#voicePendingBar');
        if (barFill) barFill.style.width = `${pct}%`;
      } else {
        pendingEl.style.display = 'none';
      }
    }
    if (!game) return;

    const {
      teamAName, teamBName, teamAScore, teamBScore,
      servingTeam, serverNumber, gameMode, scoringType, gameTarget,
      gameOver, winner,
    } = game;

    // Team names
    this._text('teamAName', teamAName);
    this._text('teamBName', teamBName);

    // Update voice sheet example rows with actual team names
    const r = this.container.querySelector('#vcmdTeamRows');
    if (r) {
      const a = escapeHtml(teamAName), b = escapeHtml(teamBName);
      r.querySelector('tr:nth-child(2) .voice-cmd-table__say').textContent = `"point ${teamAName}" / "point ${teamBName}"`;
    }

    // Scores with animate-on-change
    this._updateScore('scoreA', teamAScore);
    this._updateScore('scoreB', teamBScore);

    // Serve dots
    this._show('serveDotA', servingTeam === 'A');
    this._show('serveDotB', servingTeam === 'B');

    // Serving team highlight
    this._toggle('teamA', 'team--serving', servingTeam === 'A');
    this._toggle('teamB', 'team--serving', servingTeam === 'B');

    // Server info (doubles traditional only)
    const serverInfo = this.container.querySelector('#serverInfo');
    if (gameMode === 'doubles' && scoringType === 'traditional') {
      serverInfo.textContent = `Server ${serverNumber}`;
      serverInfo.style.display = 'block';
    } else {
      serverInfo.style.display = 'none';
    }

    // Score format badge (doubles traditional)
    const badge = this.container.querySelector('#scoreFormatBadge');
    if (gameMode === 'doubles' && scoringType === 'traditional') {
      badge.textContent = getScoreDisplay(game);
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }

    // Game meta
    const servingName = servingTeam === 'A' ? teamAName : teamBName;
    this._text('gameMeta', `${servingName} serving · ${gameMode} · ${scoringType} · to ${gameTarget}`);

    // Point buttons
    this._prop('btnA', 'disabled', gameOver);
    this._prop('btnB', 'disabled', gameOver);

    // Voice listen button
    const btnListen = this.container.querySelector('#btnListen');
    const listenLabel = this.container.querySelector('#listenLabel');
    btnListen.classList.toggle('footer-btn--active', voiceListening);
    listenLabel.textContent = voiceListening ? 'Listening…' : 'Listen';
    btnListen.disabled = false;

    // Listening ring
    this._show('listeningRing', voiceListening);

    // Game over overlay
    const overlay = this.container.querySelector('#gameoverOverlay');
    if (gameOver) {
      overlay.style.display = 'flex';
      const winnerName = winner === 'A' ? teamAName : teamBName;
      this._text('gameoverWinner', `${winnerName} Wins!`);
      this._text('gameoverScore', `${teamAScore} – ${teamBScore}`);
    } else {
      overlay.style.display = 'none';
    }
  }

  showVoiceTranscript(text) {
    const el = this.container.querySelector('#voiceTranscript');
    const textEl = this.container.querySelector('#voiceTranscriptText');
    if (!el || !textEl) return;
    textEl.textContent = `"${text}"`;
    el.style.display = 'flex';
    clearTimeout(this._transcriptTimer);
    this._transcriptTimer = setTimeout(() => { el.style.display = 'none'; }, 2500);
  }

  _updateScore(id, value) {
    const el = this.container.querySelector(`#${id}`);
    if (!el) return;
    const current = parseInt(el.textContent, 10);
    if (current !== value) {
      el.textContent = value;
      el.classList.remove('score--bump');
      void el.offsetWidth; // reflow to restart animation
      el.classList.add('score--bump');
    }
  }

  _text(id, val) {
    const el = this.container.querySelector(`#${id}`);
    if (el) el.textContent = val;
  }

  _toggle(id, cls, on) {
    const el = this.container.querySelector(`#${id}`);
    if (el) el.classList.toggle(cls, on);
  }

  _show(id, visible) {
    const el = this.container.querySelector(`#${id}`);
    if (el) el.style.visibility = visible ? 'visible' : 'hidden';
  }

  _prop(id, prop, val) {
    const el = this.container.querySelector(`#${id}`);
    if (el) el[prop] = val;
  }

  destroy() {
    if (this._clickHandler) {
      this.container.removeEventListener('click', this._clickHandler);
    }
  }

  _bindEvents() {
    this._clickHandler = (e) => {
      const team = e.target.closest('[data-team]')?.dataset.team;
      if (team) {
        navigator.vibrate?.(40);
        this.dispatch({ type: 'RALLY_WON', team });
        return;
      }

      const action = e.target.closest('[data-action]')?.dataset.action;
      switch (action) {
        case 'undo':           this.dispatch({ type: 'UNDO' }); break;
        case 'tapListen':      this.dispatch({ type: 'TAP_LISTEN' }); break;
        case 'speakScore':     this.dispatch({ type: 'SPEAK_SCORE' }); break;
        case 'toggleContinuous': this.dispatch({ type: 'TOGGLE_CONTINUOUS' }); break;
        case 'newGame':        this.dispatch({ type: 'CONFIRM_NEW_GAME' }); break;
        case 'history':        this.dispatch({ type: 'NAVIGATE', view: 'history' }); break;
        case 'showVcmd': {
          const ol = this.container.querySelector('#vcmdOverlay');
          if (ol) ol.style.display = 'flex';
          break;
        }
        case 'closeVcmd': {
          const ol = this.container.querySelector('#vcmdOverlay');
          if (ol) ol.style.display = 'none';
          break;
        }
        case 'showDiag': {
          const ol = this.container.querySelector('#diagOverlay');
          if (ol) ol.style.display = 'flex';
          this._diagCheckPerm();
          break;
        }
        case 'closeDiag': {
          const ol = this.container.querySelector('#diagOverlay');
          if (ol) ol.style.display = 'none';
          this._diagStop();
          break;
        }
        case 'diagTest':
          this._diagToggle();
          break;
        case 'confirmVoicePending':
          this.dispatch({ type: 'CONFIRM_VOICE_PENDING' });
          break;
        case 'cancelVoicePending':
          this.dispatch({ type: 'CANCEL_VOICE_PENDING' });
          break;
      }
    };
    this.container.addEventListener('click', this._clickHandler);
  }

  async _resampleTo16k(arrayBuffer) {
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

  // ── Diagnostics ───────────────────────────────────────────────────────────

  _diagCheckPerm() {
    navigator.permissions?.query({ name: 'microphone' }).then(r => {
      const el = this.container.querySelector('#diagMicPerm');
      if (el) {
        el.textContent = r.state;
        el.style.color = r.state === 'granted' ? 'var(--green)' : r.state === 'denied' ? '#f66' : 'var(--text-dim)';
      }
    }).catch(() => {
      const el = this.container.querySelector('#diagMicPerm');
      if (el) el.textContent = 'unknown';
    });
  }

  _diagToggle() {
    if (this._diagStream) { this._diagStop(); return; }
    this._diagStart();
  }

  async _diagStart() {
    const btn = this.container.querySelector('#diagTestBtn');
    const hint = this.container.querySelector('#diagHint');
    const box = this.container.querySelector('#diagTranscriptBox');
    const bar = this.container.querySelector('#diagLevelBar');

    try {
      this._diagStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });

      // Update mic permission display
      const permEl = this.container.querySelector('#diagMicPerm');
      if (permEl) { permEl.textContent = 'granted'; permEl.style.color = 'var(--green)'; }

      // Audio level meter
      this._diagAudioCtx = new AudioContext();
      const source = this._diagAudioCtx.createMediaStreamSource(this._diagStream);
      const analyser = this._diagAudioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);

      this._diagAnimFrame = null;
      const tick = () => {
        if (!this._diagStream) return;
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / buf.length);
        if (bar) bar.style.width = Math.min(100, rms * 400) + '%';
        this._diagAnimFrame = requestAnimationFrame(tick);
      };
      tick();

      // Record + transcribe via Whisper worker
      const chunks = [];
      this._diagRecorder = new MediaRecorder(this._diagStream);
      this._diagRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      this._diagRecorder.onstop = async () => {
        if (!chunks.length) return;
        try {
          const blob = new Blob(chunks, { type: this._diagRecorder.mimeType });
          const arrayBuffer = await blob.arrayBuffer();
          if (hint) hint.textContent = 'Processing with Whisper…';

          // Resample to 16 kHz independent Float32Array before sending to worker
          const audio = await this._resampleTo16k(arrayBuffer);
          const durationSec = (audio.length / 16000).toFixed(2);
          if (hint) hint.textContent = `Processing ${durationSec}s of audio with Whisper…`;

          if (audio.length < 3200) { // < 0.2s — too short to be real speech
            if (box) box.innerHTML = `<span style="color:#f66">Audio too short (${durationSec}s) — speak longer before stopping</span>`;
            if (btn) btn.textContent = '▶ Start Test';
            return;
          }

          // Reuse the app's voice worker via a one-shot approach
          const workerUrl = new URL('../modules/whisper-worker.js', import.meta.url);
          if (!this._diagWorker) {
            this._diagWorker = new Worker(workerUrl, { type: 'module' });
            this._diagWorkerReady = false;
            this._diagWorker.postMessage({ type: 'load' });
          }

          const sendTranscribe = () => {
            this._diagWorker.onmessage = ({ data }) => {
              if (data.type === 'transcript') {
                if (box) box.innerHTML = `<span style="color:var(--green);font-size:1rem">"${data.text || '(nothing heard)'}"</span>`;
                if (hint) hint.textContent = 'Done. Tap Start to test again.';
              } else if (data.type === 'error') {
                if (box) box.innerHTML = `<span style="color:#f66">Error: ${data.message}</span>`;
                if (hint) hint.textContent = 'Whisper error — see above.';
              }
            };
            this._diagWorker.postMessage({ type: 'transcribe', audio, sampleRate: 16000 });
          };

          if (this._diagWorkerReady) {
            sendTranscribe();
          } else {
            if (hint) hint.textContent = 'Waiting for model to load…';
            this._diagWorker.onmessage = ({ data }) => {
              if (data.type === 'ready') { this._diagWorkerReady = true; sendTranscribe(); }
              else if (data.type === 'error') {
                if (box) box.innerHTML = `<span style="color:#f66">Model error: ${data.message}</span>`;
                if (hint) hint.textContent = 'Could not load Whisper model.';
              }
            };
          }
        } catch (err) {
          if (box) box.innerHTML = `<span style="color:#f66">Decode error: ${err.message}</span>`;
        }
        if (btn) { btn.textContent = '▶ Start Test'; }
        this._diagStream?.getTracks().forEach(t => t.stop());
        this._diagStream = null;
        cancelAnimationFrame(this._diagAnimFrame);
        if (bar) bar.style.width = '0%';
      };

      this._diagRecorder.start();
      if (btn) btn.textContent = '⏹ Stop & Transcribe';
      if (hint) hint.textContent = 'Recording… tap Stop when done speaking.';
      if (box) box.innerHTML = '<span class="diag-transcript-placeholder">Waiting for audio…</span>';

    } catch (err) {
      const permEl = this.container.querySelector('#diagMicPerm');
      if (permEl) { permEl.textContent = 'denied'; permEl.style.color = '#f66'; }
      if (hint) hint.textContent = `Mic error: ${err.message}`;
    }
  }

  _diagStop() {
    if (this._diagRecorder?.state === 'recording') this._diagRecorder.stop();
    else {
      this._diagStream?.getTracks().forEach(t => t.stop());
      this._diagStream = null;
    }
    cancelAnimationFrame(this._diagAnimFrame);
    this._diagAudioCtx?.close().catch(() => {});
    this._diagAudioCtx = null;
    const bar = this.container.querySelector('#diagLevelBar');
    if (bar) bar.style.width = '0%';
    const btn = this.container.querySelector('#diagTestBtn');
    if (btn) btn.textContent = '▶ Start Test';
  }
}
