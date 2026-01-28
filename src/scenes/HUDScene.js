import Phaser from 'phaser';
import { SCENES, EVENTS, WEAPONS } from '../utils/constants.js';
import { CONFIG } from '../config.js';

export default class HUDScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.HUD });
  }

  create() {
    // Get reference to game scene
    this.gameScene = this.scene.get(SCENES.GAME);

    // Level display (top center)
    this.levelText = this.add.text(CONFIG.width / 2, 10, 'LEVEL 1: HIGHWAY', {
      font: 'bold 14px monospace',
      fill: '#00ffff',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5, 0);

    // Score display
    this.scoreText = this.add.text(10, 10, 'SCORE: 0', {
      font: 'bold 18px monospace',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    });

    // Lives display
    this.livesText = this.add.text(10, 35, 'LIVES: 3', {
      font: 'bold 16px monospace',
      fill: '#ff6666',
      stroke: '#000000',
      strokeThickness: 3
    });

    // Health bar background
    this.add.rectangle(CONFIG.width - 110, 20, 104, 18, 0x333333);

    // Health bar
    this.healthBar = this.add.rectangle(CONFIG.width - 110, 20, 100, 14, 0x00ff00);
    this.healthBar.setOrigin(0.5);

    this.add.text(CONFIG.width - 160, 12, 'HP', {
      font: 'bold 14px monospace',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    });

    // Weapon display
    this.weaponText = this.add.text(10, CONFIG.height - 50, 'WEAPON: MACHINE GUN', {
      font: 'bold 14px monospace',
      fill: '#ffff00',
      stroke: '#000000',
      strokeThickness: 2
    });

    this.ammoText = this.add.text(10, CONFIG.height - 30, 'AMMO: ∞', {
      font: 'bold 14px monospace',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    });

    // Speed indicator
    this.speedText = this.add.text(CONFIG.width - 80, CONFIG.height - 30, 'SPEED: 100%', {
      font: '12px monospace',
      fill: '#aaaaaa'
    });

    // Subscribe to events
    this.gameScene.events.on(EVENTS.SCORE_UPDATE, this.updateScore, this);
    this.gameScene.events.on(EVENTS.HEALTH_UPDATE, this.updateHealth, this);
    this.gameScene.events.on(EVENTS.LIVES_UPDATE, this.updateLives, this);
    this.gameScene.events.on(EVENTS.WEAPON_UPDATE, this.updateWeapon, this);
    this.gameScene.events.on(EVENTS.LEVEL_COMPLETE, this.updateLevel, this);
  }

  updateScore(score) {
    this.scoreText.setText(`SCORE: ${score}`);
  }

  updateHealth(health) {
    const healthPercent = health / CONFIG.startingHealth;
    this.healthBar.setScale(healthPercent, 1);

    // Color based on health
    if (healthPercent > 0.6) {
      this.healthBar.setFillStyle(0x00ff00);
    } else if (healthPercent > 0.3) {
      this.healthBar.setFillStyle(0xffff00);
    } else {
      this.healthBar.setFillStyle(0xff0000);
    }
  }

  updateLives(lives) {
    this.livesText.setText(`LIVES: ${lives}`);

    // Flash when losing a life
    this.tweens.add({
      targets: this.livesText,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 2
    });
  }

  updateWeapon(weapon, ammo) {
    const weaponNames = {
      [WEAPONS.MACHINE_GUN]: 'MACHINE GUN',
      [WEAPONS.MISSILE]: 'MISSILES',
      [WEAPONS.OIL_SLICK]: 'OIL SLICK',
      [WEAPONS.SMOKE_SCREEN]: 'SMOKE SCREEN'
    };

    this.weaponText.setText(`WEAPON: ${weaponNames[weapon]}`);
    this.ammoText.setText(`AMMO: ${ammo === Infinity ? '∞' : ammo}`);
  }

  updateLevel(level) {
    this.levelText.setText(`LEVEL ${level.id}: ${level.name}`);

    // Flash effect for level change
    this.tweens.add({
      targets: this.levelText,
      scale: 1.3,
      duration: 200,
      yoyo: true,
      repeat: 2
    });
  }

  update() {
    // Update speed indicator
    if (this.gameScene.player) {
      const speedPercent = Math.round(
        (this.gameScene.player.currentSpeed / CONFIG.roadSpeed) * 100
      );
      this.speedText.setText(`SPEED: ${speedPercent}%`);
    }

    // Update level display from level manager
    if (this.gameScene.levelManager) {
      const level = this.gameScene.levelManager.getCurrentLevel();
      if (level && this.levelText.text !== `LEVEL ${level.id}: ${level.name}`) {
        this.levelText.setText(`LEVEL ${level.id}: ${level.name}`);
      }
    }
  }

  shutdown() {
    this.gameScene.events.off(EVENTS.SCORE_UPDATE, this.updateScore, this);
    this.gameScene.events.off(EVENTS.HEALTH_UPDATE, this.updateHealth, this);
    this.gameScene.events.off(EVENTS.LIVES_UPDATE, this.updateLives, this);
    this.gameScene.events.off(EVENTS.WEAPON_UPDATE, this.updateWeapon, this);
    this.gameScene.events.off(EVENTS.LEVEL_COMPLETE, this.updateLevel, this);
  }
}
