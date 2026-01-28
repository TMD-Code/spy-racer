import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { POWERUP_TYPES, WEAPONS } from '../utils/constants.js';

export default class PowerUp extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type = POWERUP_TYPES.WEAPON_REFILL) {
    const textureMap = {
      [POWERUP_TYPES.WEAPON_REFILL]: 'powerup',
      [POWERUP_TYPES.SHIELD]: 'shieldPowerup',
      [POWERUP_TYPES.SPEED_BOOST]: 'powerup',
      [POWERUP_TYPES.EXTRA_LIFE]: 'shieldPowerup',
      [POWERUP_TYPES.SCORE_MULTIPLIER]: 'powerup'
    };

    super(scene, x, y, textureMap[type] || 'powerup');

    this.powerUpType = type;

    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Physics setup
    this.body.setSize(24, 24);

    // Create label
    this.createLabel();

    // Floating animation
    this.scene.tweens.add({
      targets: this,
      y: y - 5,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Glow effect
    this.scene.tweens.add({
      targets: this,
      alpha: 0.6,
      duration: 300,
      yoyo: true,
      repeat: -1
    });
  }

  createLabel() {
    const labelConfig = {
      [POWERUP_TYPES.WEAPON_REFILL]: { text: 'AMMO', color: '#00ff00' },
      [POWERUP_TYPES.SHIELD]: { text: 'SHIELD', color: '#00aaff' },
      [POWERUP_TYPES.SPEED_BOOST]: { text: 'SPEED', color: '#ffaa00' },
      [POWERUP_TYPES.EXTRA_LIFE]: { text: '+1 LIFE', color: '#ff00ff' },
      [POWERUP_TYPES.SCORE_MULTIPLIER]: { text: 'x2 PTS', color: '#ffff00' }
    };

    const config = labelConfig[this.powerUpType] || labelConfig[POWERUP_TYPES.WEAPON_REFILL];

    this.label = this.scene.add.text(this.x, this.y - 25, config.text, {
      font: 'bold 10px monospace',
      fill: config.color,
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
  }

  update(time, delta, roadSpeed) {
    if (!this.active) return;

    // Move with road
    this.setVelocityY(roadSpeed);

    // Update label position
    if (this.label && this.label.active) {
      this.label.setPosition(this.x, this.y - 25);
    }

    // Remove if off screen
    if (this.y > CONFIG.height + 50) {
      this.destroyWithLabel();
    }
  }

  collect(player) {
    // Play sound
    if (this.scene.audio) {
      this.scene.audio.play('powerup');
    }

    // Apply effect based on type
    switch (this.powerUpType) {
      case POWERUP_TYPES.WEAPON_REFILL:
        // Add ammo to all weapons
        player.addAmmo(WEAPONS.MISSILE, 3);
        player.addAmmo(WEAPONS.OIL_SLICK, 2);
        player.addAmmo(WEAPONS.SMOKE_SCREEN, 1);
        this.showCollectText('+AMMO', '#00ff00');
        break;

      case POWERUP_TYPES.SHIELD:
        player.setInvulnerable(5000);
        this.showCollectText('SHIELD!', '#00aaff');
        break;

      case POWERUP_TYPES.SPEED_BOOST:
        player.currentSpeed = CONFIG.playerMaxSpeed;
        this.showCollectText('SPEED!', '#ffaa00');
        break;

      case POWERUP_TYPES.EXTRA_LIFE:
        player.addLife();
        this.showCollectText('+1 LIFE!', '#ff00ff');
        break;

      case POWERUP_TYPES.SCORE_MULTIPLIER:
        player.addScore(500);
        this.showCollectText('+500!', '#ffff00');
        break;
    }

    this.destroyWithLabel();
  }

  showCollectText(text, color) {
    const collectText = this.scene.add.text(this.x, this.y, text, {
      font: 'bold 16px monospace',
      fill: color,
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(30);

    this.scene.tweens.add({
      targets: collectText,
      y: this.y - 40,
      alpha: 0,
      scale: 1.5,
      duration: 800,
      ease: 'Power2',
      onComplete: () => collectText.destroy()
    });
  }

  destroyWithLabel() {
    if (this.label) {
      this.label.destroy();
      this.label = null;
    }
    this.destroy();
  }
}
