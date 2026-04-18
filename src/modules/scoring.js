/**
 * Pickleball scoring engine — pure functions, no side effects.
 *
 * Traditional doubles: score announced as Serving-Receiving-ServerNumber.
 * The first serving team starts with Server 2 only (initial-serve rule).
 * After any side-out, teams get both Server 1 then Server 2.
 */

export function createInitialState(config = {}) {
  const gameMode = config.gameMode || 'doubles';
  const scoringType = config.scoringType || 'traditional';
  const isTraditionalDoubles = gameMode === 'doubles' && scoringType === 'traditional';

  return {
    teamAName: config.teamAName || 'Team A',
    teamBName: config.teamBName || 'Team B',
    teamAScore: 0,
    teamBScore: 0,
    servingTeam: 'A',
    // Doubles traditional: start at server 2 (the initial-serve rule).
    // All other modes: 0 = N/A.
    serverNumber: isTraditionalDoubles ? 2 : 0,
    gameMode,
    scoringType,
    gameTarget: config.gameTarget || 11,
    gameOver: false,
    winner: null,
  };
}

/**
 * Process a rally result.
 * @param {object} state - current game state
 * @param {'A'|'B'} winningTeam - team that won the rally
 * @returns {object} new state (original is never mutated)
 */
export function rallyWon(state, winningTeam) {
  if (state.gameOver) return state;

  const next = { ...state };
  const isServingTeam = winningTeam === state.servingTeam;

  if (state.scoringType === 'traditional') {
    if (isServingTeam) {
      // Serving team wins rally → they score
      if (winningTeam === 'A') next.teamAScore = state.teamAScore + 1;
      else next.teamBScore = state.teamBScore + 1;
    } else {
      // Receiving team wins rally
      if (state.gameMode === 'doubles' && state.serverNumber === 1) {
        // Rotate to server 2, same team still serves
        next.serverNumber = 2;
      } else {
        // Side-out: other team gets serve
        next.servingTeam = winningTeam;
        next.serverNumber = state.gameMode === 'doubles' ? 1 : 0;
      }
    }
  } else {
    // Rally scoring: every rally scores a point
    if (winningTeam === 'A') next.teamAScore = state.teamAScore + 1;
    else next.teamBScore = state.teamBScore + 1;

    if (!isServingTeam) {
      next.servingTeam = winningTeam;
    }
  }

  checkWin(next);
  return next;
}

function checkWin(state) {
  const { teamAScore, teamBScore, gameTarget } = state;
  if (teamAScore >= gameTarget && teamAScore - teamBScore >= 2) {
    state.gameOver = true;
    state.winner = 'A';
  } else if (teamBScore >= gameTarget && teamBScore - teamAScore >= 2) {
    state.gameOver = true;
    state.winner = 'B';
  }
}

/** Returns a spoken-word score announcement. */
export function getScoreAnnouncement(state) {
  const {
    teamAName, teamBName, teamAScore, teamBScore,
    servingTeam, serverNumber, gameMode, scoringType,
    gameOver, winner,
  } = state;

  if (gameOver) {
    const winnerName = winner === 'A' ? teamAName : teamBName;
    const loserScore = winner === 'A' ? teamBScore : teamAScore;
    const winnerScore = winner === 'A' ? teamAScore : teamBScore;
    return `Game over! ${winnerName} wins, ${winnerScore} to ${loserScore}!`;
  }

  const servingName = servingTeam === 'A' ? teamAName : teamBName;
  const sScore = servingTeam === 'A' ? teamAScore : teamBScore;
  const rScore = servingTeam === 'A' ? teamBScore : teamAScore;

  if (gameMode === 'doubles' && scoringType === 'traditional') {
    return `${sScore} — ${rScore} — ${serverNumber}. ${servingName} serving.`;
  }

  return `${teamAName} ${teamAScore}, ${teamBName} ${teamBScore}. ${servingName} serving.`;
}

/** Returns the score string shown on screen (pickleball format for doubles traditional). */
export function getScoreDisplay(state) {
  const { teamAScore, teamBScore, servingTeam, serverNumber, gameMode, scoringType } = state;

  if (gameMode === 'doubles' && scoringType === 'traditional') {
    const sScore = servingTeam === 'A' ? teamAScore : teamBScore;
    const rScore = servingTeam === 'A' ? teamBScore : teamAScore;
    return `${sScore} – ${rScore} – ${serverNumber}`;
  }

  return `${teamAScore} – ${teamBScore}`;
}
