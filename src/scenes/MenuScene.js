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

    // Game mode selection
    this.selectedMode = 'campaign'; // 'campaign' or 'endless'

    // Title
    this.add.text(centerX, 80, 'SPY RACER', {
      font: 'bold 48px monospace',
      fill: '#ff6600',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(centerX, 130, 'A Spy Hunter Tribute', {
      font: '18px monospace',
      fill: '#aaaaaa'
    }).setOrigin(0.5);

    // Animated car preview
    this.playerPreview = this.add.image(centerX, centerY - 60, 'player');
    this.tweens.add({
      targets: this.playerPreview,
      y: centerY - 70,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Mode selection
    this.add.text(centerX, centerY + 30, 'SELECT MODE:', {
      font: 'bold 16px monospace',
      fill: '#ffffff'
    }).setOrigin(0.5);

    // Campaign mode button
    this.campaignButton = this.add.text(centerX, centerY + 70, '[ 1 ] CAMPAIGN MODE', {
      font: '18px monospace',
      fill: '#00ff00'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.campaignDesc = this.add.text(centerX, centerY + 95, '5 Levels with Bosses', {
      font: '12px monospace',
      fill: '#888888'
    }).setOrigin(0.5);

    // Endless mode button
    this.endlessButton = this.add.text(centerX, centerY + 130, '[ 2 ] ENDLESS ARCADE', {
      font: '18px monospace',
      fill: '#aaaaaa'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.endlessDesc = this.add.text(centerX, centerY + 155, 'Classic Spy Hunter - Survive!', {
      font: '12px monospace',
      fill: '#888888'
    }).setOrigin(0.5);

    // Start prompt
    this.startPrompt = this.add.text(centerX, centerY + 200, '[ PRESS SPACE TO START ]', {
      font: '20px monospace',
      fill: '#00ff00'
    }).setOrigin(0.5);

    // Blink effect
    this.tweens.add({
      targets: this.startPrompt,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // Controls info
    this.add.text(centerX, CONFIG.height - 120, 'CONTROLS: WASD/Arrows - Move | SPACE - Fire | SHIFT - Switch', {
      font: '11px monospace',
      fill: '#666666'
    }).setOrigin(0.5);

    // High scores display
    const campaignHighScore = this.getValidatedHighScore('campaign');
    const endlessHighScore = this.getValidatedHighScore('endless');

    this.add.text(centerX, CONFIG.height - 80, `CAMPAIGN HIGH: ${campaignHighScore}`, {
      font: '14px monospace',
      fill: '#ffff00'
    }).setOrigin(0.5);

    this.add.text(centerX, CONFIG.height - 55, `ENDLESS HIGH: ${endlessHighScore}`, {
      font: '14px monospace',
      fill: '#ff6600'
    }).setOrigin(0.5);

    // Mode selection handlers
    this.campaignButton.on('pointerdown', () => this.selectMode('campaign'));
    this.endlessButton.on('pointerdown', () => this.selectMode('endless'));

    // Keyboard mode selection
    this.input.keyboard.on('keydown-ONE', () => this.selectMode('campaign'));
    this.input.keyboard.on('keydown-TWO', () => this.selectMode('endless'));
    this.input.keyboard.on('keydown-UP', () => this.selectMode('campaign'));
    this.input.keyboard.on('keydown-DOWN', () => this.selectMode('endless'));

    // Start game
    this.input.keyboard.on('keydown-SPACE', () => this.startGame());
    this.input.keyboard.on('keydown-ENTER', () => this.startGame());

    // Update visual selection
    this.updateModeSelection();
  }

  selectMode(mode) {
    this.selectedMode = mode;
    this.updateModeSelection();
  }

  updateModeSelection() {
    if (this.selectedMode === 'campaign') {
      this.campaignButton.setFill('#00ff00');
      this.endlessButton.setFill('#aaaaaa');
      this.campaignDesc.setFill('#00ff00');
      this.endlessDesc.setFill('#888888');
    } else {
      this.campaignButton.setFill('#aaaaaa');
      this.endlessButton.setFill('#ff6600');
      this.campaignDesc.setFill('#888888');
      this.endlessDesc.setFill('#ff6600');
    }
  }

  startGame() {
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Pass the game mode to the game scene
      this.scene.start(SCENES.GAME, { mode: this.selectedMode });
    });
  }

  // Score validation (matches GameScene implementation)
  generateScoreChecksum(score, mode = 'campaign') {
    const salt = `SpyRacer2024${mode}`;
    const data = `${salt}${score}${salt.split('').reverse().join('')}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  getValidatedHighScore(mode = 'campaign') {
    try {
      const key = mode === 'endless' ? 'spyRacerEndlessHighScore' : 'spyRacerHighScore';
      const checkKey = mode === 'endless' ? 'spyRacerEndlessScoreCheck' : 'spyRacerScoreCheck';

      const stored = localStorage.getItem(key);
      const checksum = localStorage.getItem(checkKey);
      if (!stored || !checksum) return 0;

      const score = parseInt(stored, 10);
      if (isNaN(score) || score < 0) return 0;

      const expectedChecksum = this.generateScoreChecksum(score, mode);
      if (checksum !== expectedChecksum) {
        return 0;
      }

      return score;
    } catch (e) {
      return 0;
    }
  }
}
