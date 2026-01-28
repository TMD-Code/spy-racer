import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { POWERUP_TYPES } from '../utils/constants.js';
import PowerUp from '../sprites/PowerUp.js';

export default class PowerUpManager {
  constructor(scene) {
    this.scene = scene;
    this.powerUps = scene.physics.add.group();
    this.spawnTimer = null;

    this.setupSpawning();
  }

  setupSpawning() {
    // Spawn first power-up after 3 seconds so player sees them early
    this.scene.time.delayedCall(3000, () => {
      this.spawnPowerUp();
      this.scheduleNextSpawn();
    });
  }

  scheduleNextSpawn() {
    // Spawn power-ups more frequently (every 5-10 seconds)
    const delay = Phaser.Math.Between(5000, 10000);

    this.spawnTimer = this.scene.time.delayedCall(delay, () => {
      this.spawnPowerUp();
      this.scheduleNextSpawn();
    });
  }

  spawnPowerUp() {
    const lane = Phaser.Math.Between(0, CONFIG.lanes - 1);
    const x = CONFIG.roadMargin + (lane * CONFIG.laneWidth) + CONFIG.laneWidth / 2;
    const y = -30;

    // Random power-up type with weighted probability
    const type = this.getRandomPowerUpType();

    const powerUp = new PowerUp(this.scene, x, y, type);
    this.powerUps.add(powerUp);
  }

  getRandomPowerUpType() {
    const roll = Math.random();

    // Weighted distribution - more weapon refills!
    if (roll < 0.50) {
      return POWERUP_TYPES.WEAPON_REFILL; // 50% chance - most common
    } else if (roll < 0.70) {
      return POWERUP_TYPES.SHIELD; // 20% chance
    } else if (roll < 0.85) {
      return POWERUP_TYPES.SPEED_BOOST; // 15% chance
    } else if (roll < 0.95) {
      return POWERUP_TYPES.SCORE_MULTIPLIER; // 10% chance
    } else {
      return POWERUP_TYPES.EXTRA_LIFE; // 5% chance (rare)
    }
  }

  update(time, delta, roadSpeed) {
    this.powerUps.children.each((powerUp) => {
      if (powerUp.active) {
        powerUp.update(time, delta, roadSpeed);
      }
    });
  }

  getPowerUps() {
    return this.powerUps;
  }

  destroy() {
    if (this.spawnTimer) this.spawnTimer.remove();
    this.powerUps.clear(true, true);
  }
}
