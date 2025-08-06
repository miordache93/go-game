/**
 * Scoring Controls Component
 *
 * Provides UI for the scoring phase:
 * - Display current score
 * - Mark dead stones instruction
 * - Finalize game button
 * - Resume playing button
 */

import React from 'react';
import { GameScore, Player } from '@go-game/types';
import styles from '../game.module.scss';

interface ScoringControlsProps {
  score: GameScore | null;
  onFinalize: () => void;
  onResume: () => void;
  disabled?: boolean;
}

export const ScoringControls: React.FC<ScoringControlsProps> = ({
  score,
  onFinalize,
  onResume,
  disabled = false,
}) => {
  if (!score) return null;

  const formatScore = (player: 'black' | 'white') => {
    const playerScore = score[player];
    return (
      <div className={styles.scoreDetails}>
        <div className={styles.scoreRow}>
          <span>Territory:</span>
          <span>{playerScore.territory}</span>
        </div>
        <div className={styles.scoreRow}>
          <span>Captures:</span>
          <span>{playerScore.captures}</span>
        </div>
        {player === 'white' && 'komi' in playerScore && (
          <div className={styles.scoreRow}>
            <span>Komi:</span>
            <span>{playerScore.komi}</span>
          </div>
        )}
        <div className={`${styles.scoreRow} ${styles.totalScore}`}>
          <span>Total:</span>
          <span>{playerScore.total}</span>
        </div>
      </div>
    );
  };

  const getWinnerText = () => {
    if (!score.winner) return 'Tie Game!';
    const winner = score.winner === Player.BLACK ? 'Black' : 'White';
    const margin = Math.abs(score.black.total - score.white.total);
    return `${winner} wins by ${margin} points!`;
  };

  return (
    <div className={styles.scoringControls}>
      <h3 className={styles.scoringTitle}>Scoring Phase</h3>

      <div className={styles.scoringInstructions}>
        <p>Click on stones to mark them as dead.</p>
        <p>Dead stones will be added to captures.</p>
      </div>

      <div className={styles.scoreDisplay}>
        <div className={styles.playerScore}>
          <h4>
            <span className={styles.blackStone}>●</span> Black
          </h4>
          {formatScore('black')}
        </div>

        <div className={styles.playerScore}>
          <h4>
            <span className={styles.whiteStone}>○</span> White
          </h4>
          {formatScore('white')}
        </div>
      </div>

      <div className={styles.winnerDisplay}>{getWinnerText()}</div>

      <div className={styles.scoringActions}>
        <button
          className={`${styles.button} ${styles.primaryButton}`}
          onClick={onFinalize}
          disabled={disabled}
        >
          Accept & Finish Game
        </button>

        <button
          className={`${styles.button} ${styles.secondaryButton}`}
          onClick={onResume}
          disabled={disabled}
        >
          Resume Playing
        </button>
      </div>
    </div>
  );
};
