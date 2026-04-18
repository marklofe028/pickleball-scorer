import { escapeHtml, formatDate } from '../modules/utils.js';

export class HistoryScreen {
  constructor(container, dispatch) {
    this.container = container;
    this.dispatch = dispatch;
    this._init();
  }

  _init() {
    this.container.innerHTML = `
      <div class="screen history-screen">
        <header class="app-header">
          <button class="btn-icon" data-action="back" aria-label="Back">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div class="app-header__brand">
            <span class="app-header__title">Game History</span>
          </div>
          <button class="btn-icon btn-icon--danger" data-action="clearHistory" aria-label="Clear history" title="Clear all history">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
        </header>
        <main class="history-content" id="historyList"></main>
      </div>
    `;

    this._bindEvents();
  }

  update(state) {
    const { gameHistory = [] } = state;
    const list = this.container.querySelector('#historyList');

    if (!gameHistory.length) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">🏓</div>
          <div class="empty-state__text">No games played yet.</div>
          <div class="empty-state__sub">Complete a game to see it here.</div>
        </div>
      `;
      return;
    }

    list.innerHTML = gameHistory.map((g, i) => {
      const isAWinner = g.winner === 'A';
      const winnerName = isAWinner ? g.teamAName : g.teamBName;
      const modeLabel = `${g.gameMode} · ${g.scoringType} · to ${g.gameTarget}`;

      return `
        <div class="history-card">
          <div class="history-card__header">
            <span class="history-card__date">${formatDate(g.date)}</span>
            <span class="history-card__mode">${escapeHtml(modeLabel)}</span>
          </div>
          <div class="history-card__teams">
            <div class="history-card__team-col ${isAWinner ? 'history-card__team-col--winner' : ''}">
              ${isAWinner ? '<span class="history-card__crown">🏆</span>' : ''}
              <span class="history-card__team-name">${escapeHtml(g.teamAName)}</span>
              <span class="history-card__team-score">${g.teamAScore}</span>
            </div>
            <div class="history-card__divider">–</div>
            <div class="history-card__team-col ${!isAWinner ? 'history-card__team-col--winner' : ''}">
              ${!isAWinner ? '<span class="history-card__crown">🏆</span>' : ''}
              <span class="history-card__team-name">${escapeHtml(g.teamBName)}</span>
              <span class="history-card__team-score">${g.teamBScore}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  _bindEvents() {
    this.container.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action === 'back') this.dispatch({ type: 'NAVIGATE', view: 'setup' });
      if (action === 'clearHistory') {
        if (confirm('Clear all game history?')) {
          this.dispatch({ type: 'CLEAR_HISTORY' });
        }
      }
    });
  }
}
