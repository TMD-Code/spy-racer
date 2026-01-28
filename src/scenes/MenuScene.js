import Phaser from 'phaser';
import { SCENES } from '../utils/constants.js';
import { CONFIG } from '../config.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.MENU });
  }

  create() {
    const centerX = CONFIG.width / 2;
    const centerY = CONFIG.height / 2;

    // Title
    this.add.text(centerX, 120, 'SPY RACER', {
      font: 'bold 48px monospace',
      fill: '#ff6600',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(centerX, 180, 'A Spy Hunter Tribute', {
      font: '18px monospace',
      fill: '#aaaaaa'
    }).setOrigin(0.5);

    // Animated car preview
    this.playerPreview = this.add.image(centerX, centerY - 20, 'player');
    this.tweens.add({
      targets: this.playerPreview,
      y: centerY - 30,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Start button
    const startButton = this.add.text(centerX, centerY + 100, '[ PRESS SPACE TO START ]', {
      font: '20px monospace',
      fill: '#00ff00'
    }).setOrigin(0.5);

    // Blink effect
    this.tweens.add({
      targets: startButton,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // Controls info
    this.add.text(centerX, CONFIG.height - 150, 'CONTROLS:', {
      font: 'bold 16px monospace',
      fill: '#ffffff'
    }).setOrigin(0.5);

    this.add.text(centerX, CONFIG.height - 120, 'WASD or Arrow Keys - Move', {
      font: '14px monospace',
      fill: '#aaaaaa'
    }).setOrigin(0.5);

    this.add.text(centerX, CONFIG.height - 100, 'SPACE - Fire Weapon', {
      font: '14px monospace',
      fill: '#aaaaaa'
    }).setOrigin(0.5);

    this.add.text(centerX, CONFIG.height - 80, 'SHIFT - Switch Weapon', {
      font: '14px monospace',
      fill: '#aaaaaa'
    }).setOrigin(0.5);

    // High score display with validation
    const highScore = this.getValidatedHighScore();
    this.add.text(centerX, CONFIG.height - 40, `HIGH SCORE: ${highScore}`, {
      font: 'bold 16px monospace',
      fill: '#ffff00'
    }).setOrigin(0.5);

    // Input handling
    this.input.keyboard.once('keydown-SPACE', () => {
      this.startGame();
    });

    // Also allow click/touch to start
    this.input.once('pointerdown', () => {
      this.startGame();
    });
  }

  startGame() {
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENES.GAME);
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
