import Phaser from 'phaser';
import { CONFIG } from '../config.js';

export const HAZARD_TYPES = {
  OIL_SPILL: 'oil_spill',
  ICE_PATCH: 'ice_patch',
  POTHOLE: 'pothole'
};

export default class Hazard extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type = HAZARD_TYPES.OIL_SPILL) {
    // Use generated texture based on type
    super(scene, x, y, 'hazard_' + type);

    this.hazardType = type;
    this.scene = scene;

    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Stats based on type
    const stats = this.getStatsForType(type);
    this.damage = stats.damage;
    this.slowAmount = stats.slowAmount;
    this.spinChance = stats.spinChance;
    this.duration = stats.duration;

    // Physics setup
    this.body.setSize(stats.width, stats.height);
    this.setDepth(1);

    // Lifetime
    if (this.duration > 0) {
      scene.time.delayedCall(this.duration, () => {
        this.fadeOut();
      });
    }
  }

  getStatsForType(type) {
    const stats = {
      [HAZARD_TYPES.OIL_SPILL]: {
        damage: 0,
        slowAmount: 0,
        spinChance: 0.7,
        duration: 10000,
        width: 60,
        height: 40
      },
      [HAZARD_TYPES.ICE_PATCH]: {
        damage: 0,
        slowAmount: 0.5,
        spinChance: 0.3,
        duration: 15000,
        width: 80,
        height: 50
      },
      [HAZARD_TYPES.POTHOLE]: {
        damage: 10,
        slowAmount: 0.3,
        spinChance: 0.1,
        duration: 0, // Permanent
        width: 30,
        height: 30
      }
    };
    return stats[type] || stats[HAZARD_TYPES.OIL_SPILL];
  }

  update(delta, roadSpeed) {
    if (!this.active) return;

    // Move with road
    this.y += (roadSpeed * delta) / 1000;

    // Remove if off screen
    if (this.y > CONFIG.height + 100) {
      this.destroy();
    }
  }

  applyEffect(player) {
    if (!player || !player.active) return;
    if (!this.active || !this.scene) return;

    // Check if player is invulnerable
    if (player.isInvulnerable) return;

    // Apply damage
    if (this.damage > 0) {
      player.takeDamage(this.damage);
      this.scene.flashDamage();
    }

    // Apply slow
    if (this.slowAmount > 0) {
      player.currentSpeed *= (1 - this.slowAmount);
    }

    // Spin out chance
    if (Math.random() < this.spinChance) {
      this.spinOutPlayer(player);
    }

    // Play sound
    if (this.scene.audio) {
      this.scene.audio.play('hit');
    }

    // Show warning text
    this.showWarning();
  }

  spinOutPlayer(player) {
    if (player.spinningOut) return;
    if (!this.scene) return;
    player.spinningOut = true;

    // Visual spin effect
    this.scene.tweens.add({
      targets: player,
      angle: 360,
      duration: 500,
      onComplete: () => {
        player.setAngle(0);
        player.spinningOut = false;
      }
    });

    // Temporarily disable controls
    player.setVelocity(0, 0);
  }

  showWarning() {
    if (!this.scene) return;

    const warnings = {
      [HAZARD_TYPES.OIL_SPILL]: 'OIL!',
      [HAZARD_TYPES.ICE_PATCH]: 'ICE!',
      [HAZARD_TYPES.POTHOLE]: 'BUMP!'
    };

    const warning = this.scene.add.text(this.x, this.y - 30, warnings[this.hazardType], {
      font: 'bold 16px monospace',
      fill: '#ffff00',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(20);

    this.scene.tweens.add({
      targets: warning,
      y: this.y - 60,
      alpha: 0,
      duration: 500,
      onComplete: () => warning.destroy()
    });
  }

  fadeOut() {
    // Guard against scene being destroyed or hazard already inactive
    if (!this.active || !this.scene) return;

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        if (this.active) this.destroy();
      }
    });
  }
}
