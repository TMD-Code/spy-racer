import Phaser from 'phaser';
import { SCENES } from '../utils/constants.js';
import { CONFIG } from '../config.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.GAME_OVER });
  }

  init(data) {
    this.finalScore = data.score || 0;
  }

  create() {
    this.cameras.main.fadeIn(500);

    const centerX = CONFIG.width / 2;

    // Game Over title
    this.add.text(centerX, 120, 'GAME OVER', {
      font: 'bold 48px monospace',
      fill: '#ff0000',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);

    // Final score
    this.add.text(centerX, 200, `FINAL SCORE: ${this.finalScore}`, {
      font: 'bold 24px monospace',
      fill: '#ffffff'
    }).setOrigin(0.5);

    // High score with validation
    const highScore = this.getValidatedHighScore();
    const isNewHighScore = this.finalScore >= highScore && this.finalScore > 0;

    if (isNewHighScore) {
      const newHighScoreText = this.add.text(centerX, 250, 'NEW HIGH SCORE!', {
        font: 'bold 20px monospace',
        fill: '#ffff00'
      }).setOrigin(0.5);

      // Celebration animation
      this.tweens.add({
        targets: newHighScoreText,
        scale: 1.2,
        duration: 500,
        yoyo: true,
        repeat: -1
      });
    } else {
      this.add.text(centerX, 250, `HIGH SCORE: ${highScore}`, {
        font: '18px monospace',
        fill: '#aaaaaa'
      }).setOrigin(0.5);
    }

    // Retry button
    const retryButton = this.add.text(centerX, 350, '[ PRESS SPACE TO RETRY ]', {
      font: '20px monospace',
      fill: '#00ff00'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: retryButton,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // Menu button
    const menuButton = this.add.text(centerX, 400, '[ PRESS M FOR MENU ]', {
      font: '16px monospace',
      fill: '#aaaaaa'
    }).setOrigin(0.5);

    // Stats
    this.add.text(centerX, 480, 'MISSION STATS', {
      font: 'bold 16px monospace',
      fill: '#ffffff'
    }).setOrigin(0.5);

    this.add.text(centerX, 510, `Distance: ${Math.floor(this.finalScore / 10)} meters`, {
      font: '14px monospace',
      fill: '#aaaaaa'
    }).setOrigin(0.5);

    // Input handling
    this.input.keyboard.once('keydown-SPACE', () => {
      this.restartGame();
    });

    this.input.keyboard.once('keydown-M', () => {
      this.goToMenu();
    });

    this.input.once('pointerdown', () => {
      this.restartGame();
    });
  }

  restartGame() {
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENES.GAME);
    });
  }

  goToMenu() {
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENES.MENU);
    });
  }

  // Score validation (matches GameScene implementation)
  generateScoreChecksum(score) {
    const salt = 'SpyRacer2024';
    const data = `${salt}${score}${salt.split('').reverse().join('')}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  getValidatedHighScore() {
    try {
      const stored = localStorage.getItem('spyRacerHighScore');
      const checksum = localStorage.getItem('spyRacerScoreCheck');
      if (!stored || !checksum) return 0;

      const score = parseInt(stored, 10);
      if (isNaN(score) || score < 0) return 0;

      const expectedChecksum = this.generateScoreChecksum(score);
      if (checksum !== expectedChecksum) {
        return 0;
      }

      return score;
    } catch (e) {
      return 0;
    }
  }
}
