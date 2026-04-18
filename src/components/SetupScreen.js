import { escapeHtml } from '../modules/utils.js';

export class SetupScreen {
  constructor(container, dispatch) {
    this.container = container;
    this.dispatch = dispatch;
    this._init();
  }

  _init() {
    this.container.innerHTML = `
      <div class="screen setup-screen">
        <header class="app-header">
          <div class="app-header__brand">
            <img src="icons/icon.svg" class="app-header__logo" alt="">
            <span class="app-header__title">Pickle Score</span>
          </div>
          <button class="btn-icon" data-action="history" aria-label="Game History" title="History">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>
          </button>
        </header>

        <main class="setup-content">
          <h2 class="setup-heading">New Game</h2>

          <section class="form-section">
            <label class="form-label">Team / Player Names</label>
            <div class="team-inputs">
              <div class="team-input-wrap team-input-wrap--a">
                <span class="team-dot team-dot--a"></span>
                <input class="form-input" id="teamA" type="text" placeholder="Team A" maxlength="20" autocomplete="off" spellcheck="false">
              </div>
              <div class="team-input-sep">vs</div>
              <div class="team-input-wrap team-input-wrap--b">
                <span class="team-dot team-dot--b"></span>
                <input class="form-input" id="teamB" type="text" placeholder="Team B" maxlength="20" autocomplete="off" spellcheck="false">
              </div>
            </div>
          </section>

          <section class="form-section">
            <label class="form-label">Game Mode</label>
            <div class="toggle-group" id="gameModeGroup">
              <button class="toggle-btn" data-value="doubles">Doubles</button>
              <button class="toggle-btn" data-value="singles">Singles</button>
            </div>
          </section>

          <section class="form-section">
            <label class="form-label">Game To</label>
            <div class="toggle-group" id="gameTargetGroup">
              <button class="toggle-btn" data-value="11">11</button>
              <button class="toggle-btn" data-value="15">15</button>
              <button class="toggle-btn" data-value="21">21</button>
            </div>
          </section>

          <section class="form-section">
            <label class="form-label">Scoring Type</label>
            <div class="toggle-group" id="scoringTypeGroup">
              <button class="toggle-btn" data-value="traditional">Traditional</button>
              <button class="toggle-btn" data-value="rally">Rally</button>
            </div>
            <p class="form-hint" id="scoringHint"></p>
          </section>

          <button class="btn-primary btn-start" data-action="start">
            ▶ &nbsp;Start Game
          </button>

          <button class="btn-ghost btn-history-link" data-action="history">
            View Game History
          </button>

          <div class="voice-help">
            <button class="voice-help__toggle" data-action="toggleVoiceHelp" aria-expanded="false">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0014 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
              Voice Commands
              <svg class="voice-help__chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="voice-help__body" id="voiceHelpBody" hidden>
              <p class="voice-help__note">Tap <strong>Listen</strong> on the scoreboard then speak a command. Tap <strong>Always On</strong> to keep mic open continuously.</p>
              <table class="voice-cmd-table">
                <tbody>
                  <tr><td class="voice-cmd-table__say">"score"</td><td>Reads current score aloud</td></tr>
                  <tr><td class="voice-cmd-table__say">"point [team name]"</td><td>Adds a point to that team</td></tr>
                  <tr><td class="voice-cmd-table__say">"point a" / "point b"</td><td>Generic team A or B point</td></tr>
                  <tr><td class="voice-cmd-table__say">"undo"</td><td>Reverses last rally</td></tr>
                  <tr><td class="voice-cmd-table__say">"who's serving"</td><td>Announces serving team</td></tr>
                  <tr><td class="voice-cmd-table__say">"new game"</td><td>Starts a new game</td></tr>
                </tbody>
              </table>
              <p class="voice-help__tip">💡 Use your team names for best accuracy — e.g. <em>"point Lakers"</em></p>
            </div>
          </div>
        </main>
      </div>
    `;

    this._bindEvents();
  }

  update(state) {
    const { settings } = state;

    const teamAInput = this.container.querySelector('#teamA');
    const teamBInput = this.container.querySelector('#teamB');

    // Only pre-fill if field is empty and value is non-default
    if (teamAInput && !teamAInput.value && settings.teamAName && settings.teamAName !== 'Team A') {
      teamAInput.value = settings.teamAName;
    }
    if (teamBInput && !teamBInput.value && settings.teamBName && settings.teamBName !== 'Team B') {
      teamBInput.value = settings.teamBName;
    }

    this._setActive('gameModeGroup', settings.gameMode || 'doubles');
    this._setActive('gameTargetGroup', String(settings.gameTarget || 11));
    this._setActive('scoringTypeGroup', settings.scoringType || 'traditional');
    this._updateHint(settings.scoringType || 'traditional', settings.gameMode || 'doubles');
  }

  _setActive(groupId, value) {
    const group = this.container.querySelector(`#${groupId}`);
    if (!group) return;
    group.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === value);
    });
  }

  _updateHint(scoringType, gameMode) {
    const hint = this.container.querySelector('#scoringHint');
    if (!hint) return;
    if (scoringType === 'traditional' && gameMode === 'doubles') {
      hint.textContent = 'Score called as: Serving – Receiving – Server#. First team starts with Server 2.';
    } else if (scoringType === 'traditional') {
      hint.textContent = 'Only the serving player scores. Side-out on lost rally.';
    } else {
      hint.textContent = 'Every rally scores a point. Serve switches when receiving team wins.';
    }
  }

  _bindEvents() {
    this.container.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('.toggle-btn');
      if (toggleBtn) {
        const group = toggleBtn.closest('.toggle-group');
        group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        toggleBtn.classList.add('active');
        const groupId = group.id;
        const value = toggleBtn.dataset.value;
        if (groupId === 'scoringTypeGroup' || groupId === 'gameModeGroup') {
          const scoringType = this.container.querySelector('#scoringTypeGroup .toggle-btn.active')?.dataset.value || 'traditional';
          const gameMode = this.container.querySelector('#gameModeGroup .toggle-btn.active')?.dataset.value || 'doubles';
          this._updateHint(scoringType, gameMode);
        }
        return;
      }

      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action === 'start') this._handleStart();
      if (action === 'history') this.dispatch({ type: 'NAVIGATE', view: 'history' });
      if (action === 'toggleVoiceHelp') {
        const body = this.container.querySelector('#voiceHelpBody');
        const btn = this.container.querySelector('[data-action="toggleVoiceHelp"]');
        const open = !body.hidden;
        body.hidden = open;
        btn.setAttribute('aria-expanded', String(!open));
        btn.classList.toggle('voice-help__toggle--open', !open);
      }
    });
  }

  _handleStart() {
    const teamAName = this.container.querySelector('#teamA')?.value.trim() || 'Team A';
    const teamBName = this.container.querySelector('#teamB')?.value.trim() || 'Team B';
    const gameMode = this.container.querySelector('#gameModeGroup .toggle-btn.active')?.dataset.value || 'doubles';
    const gameTarget = parseInt(this.container.querySelector('#gameTargetGroup .toggle-btn.active')?.dataset.value || '11', 10);
    const scoringType = this.container.querySelector('#scoringTypeGroup .toggle-btn.active')?.dataset.value || 'traditional';

    this.dispatch({ type: 'START_GAME', config: { teamAName, teamBName, gameMode, gameTarget, scoringType } });
  }
}
