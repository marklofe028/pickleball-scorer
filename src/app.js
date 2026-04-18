import { createInitialState, rallyWon, getScoreAnnouncement } from './modules/scoring.js';
import { loadAppState, saveAppState } from './modules/storage.js';
import { VoiceEngine } from './modules/voice.js';
import { showToast } from './modules/utils.js';
import { SetupScreen } from './components/SetupScreen.js';
import { ScoreBoard } from './components/ScoreBoard.js';
import { HistoryScreen } from './components/HistoryScreen.js';

const DEFAULT_STATE = {
  view: 'setup',
  game: null,
  gameHistory: [],
  voiceListening: false,
  voiceContinuous: false,
  settings: {
    teamAName: 'Team A',
    teamBName: 'Team B',
    gameMode: 'doubles',
    scoringType: 'traditional',
    gameTarget: 11,
  },
};

class App {
  constructor() {
    this.root = document.getElementById('app');
    const saved = loadAppState();
    this.state = { ...DEFAULT_STATE, ...saved, voiceListening: false };
    this.undoStack = [];
    this.voice = null;
    this.currentComponent = null;
    this.currentView = null;

    this.dispatch = this.dispatch.bind(this);
    this._render();
    this._registerSW();
  }

  dispatch(action) {
    switch (action.type) {

      case 'NAVIGATE':
        this._setState({ view: action.view });
        break;

      case 'START_GAME': {
        const game = createInitialState(action.config);
        this.undoStack = [];
        this._setState({
          view: 'game',
          game,
          settings: { ...this.state.settings, ...action.config },
        });
        this._initVoice(action.config.teamAName, action.config.teamBName);
        break;
      }

      case 'RALLY_WON': {
        const { game } = this.state;
        if (!game || game.gameOver) return;
        this.undoStack.push(game);
        const next = rallyWon(game, action.team);
        this._setState({ game: next });

        if (next.gameOver) {
          const winnerName = next.winner === 'A' ? next.teamAName : next.teamBName;
          this.voice?.speak(`Game over! ${winnerName} wins!`);
          // Save to history
          const record = {
            id: Date.now(),
            date: new Date().toISOString(),
            teamAName: next.teamAName,
            teamBName: next.teamBName,
            teamAScore: next.teamAScore,
            teamBScore: next.teamBScore,
            winner: next.winner,
            gameMode: next.gameMode,
            scoringType: next.scoringType,
            gameTarget: next.gameTarget,
          };
          this._setState({ gameHistory: [record, ...this.state.gameHistory].slice(0, 100) });
        } else {
          this.voice?.speak(getScoreAnnouncement(next));
        }
        break;
      }

      case 'UNDO': {
        if (!this.undoStack.length) {
          showToast('Nothing to undo');
          return;
        }
        const prev = this.undoStack.pop();
        this._setState({ game: prev });
        showToast('↩ Undone');
        break;
      }

      case 'CONFIRM_NEW_GAME': {
        const { game } = this.state;
        const inProgress = game && !game.gameOver && (game.teamAScore > 0 || game.teamBScore > 0);
        if (inProgress && !confirm('Abandon current game and start a new one?')) return;
        this.voice?.stopListening();
        this.undoStack = [];
        this._setState({ view: 'setup', game: null, voiceListening: false });
        break;
      }

      case 'TAP_LISTEN': {
        if (!this.voice) this._initVoice();
        if (!this.voice?.isSupported) {
          showToast('Voice not supported in this browser');
          return;
        }
        if (this.state.voiceListening) {
          this.voice.stopListening();
        } else {
          this.voice.setContinuous(false);
          this.voice.startListening();
        }
        break;
      }

      case 'TOGGLE_CONTINUOUS': {
        if (!this.voice) this._initVoice();
        if (!this.voice?.isSupported) {
          showToast('Voice not supported in this browser');
          return;
        }
        const next = !this.state.voiceContinuous;
        this._setState({ voiceContinuous: next });
        this.voice.setContinuous(next);
        if (next) {
          this.voice.startListening();
          showToast('🎤 Always-on voice enabled');
        } else {
          this.voice.stopListening();
          showToast('🎤 Always-on voice disabled');
        }
        break;
      }

      case 'SPEAK_SCORE': {
        const { game } = this.state;
        if (!this.voice) this._initVoice();
        if (game) this.voice?.speak(getScoreAnnouncement(game));
        break;
      }

      case 'CLEAR_HISTORY':
        this._setState({ gameHistory: [] });
        showToast('History cleared');
        break;
    }
  }

  _setState(patch) {
    this.state = { ...this.state, ...patch };
    saveAppState(this.state);
    this._render();
  }

  _render() {
    const { view } = this.state;

    if (this.currentView !== view) {
      this.root.innerHTML = '';
      switch (view) {
        case 'setup':   this.currentComponent = new SetupScreen(this.root, this.dispatch); break;
        case 'game':    this.currentComponent = new ScoreBoard(this.root, this.dispatch); break;
        case 'history': this.currentComponent = new HistoryScreen(this.root, this.dispatch); break;
      }
      this.currentView = view;
    }

    this.currentComponent?.update(this.state);
  }

  _initVoice(teamAName, teamBName) {
    const a = teamAName || this.state.settings.teamAName || 'Team A';
    const b = teamBName || this.state.settings.teamBName || 'Team B';

    if (!this.voice) {
      this.voice = new VoiceEngine({
        teamAName: a,
        teamBName: b,
        onCommand: (cmd) => this._handleVoiceCommand(cmd),
        onTranscript: (text) => {
          if (this.currentComponent instanceof ScoreBoard) {
            this.currentComponent.showVoiceTranscript(text);
          }
        },
        onListeningChange: (listening) => {
          this._setState({ voiceListening: listening });
        },
      });
    } else {
      this.voice.updateTeamNames(a, b);
    }
  }

  _handleVoiceCommand(cmd) {
    switch (cmd.type) {
      case 'POINT_A':    showToast(`🎤 Point → ${this.state.game?.teamAName || 'Team A'}`); this.dispatch({ type: 'RALLY_WON', team: 'A' }); break;
      case 'POINT_B':    showToast(`🎤 Point → ${this.state.game?.teamBName || 'Team B'}`); this.dispatch({ type: 'RALLY_WON', team: 'B' }); break;
      case 'UNDO':       showToast('🎤 Undo'); this.dispatch({ type: 'UNDO' }); break;
      case 'NEW_GAME':   showToast('🎤 New game'); this.dispatch({ type: 'CONFIRM_NEW_GAME' }); break;
      case 'READ_SCORE': this.dispatch({ type: 'SPEAK_SCORE' }); break;
      case 'WHO_SERVES': {
        const { game } = this.state;
        if (game) {
          const name = game.servingTeam === 'A' ? game.teamAName : game.teamBName;
          this.voice?.speak(`${name} is serving.`);
        }
        break;
      }
      case 'MIC_DENIED':
        showToast('Microphone access denied');
        this._setState({ voiceListening: false, voiceContinuous: false });
        break;
    }
  }

  _registerSW() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => { /* offline sw not critical */ });
      });
    }
  }
}

new App();
