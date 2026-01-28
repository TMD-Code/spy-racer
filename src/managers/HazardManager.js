import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import Hazard, { HAZARD_TYPES } from '../sprites/Hazard.js';

export default class HazardManager {
  constructor(scene) {
    this.scene = scene;
    this.hazards = scene.physics.add.group();
    this.spawnTimer = null;
    this.enabled = true;
    this.spawnRate = 8000; // Every 8 seconds

    this.setupSpawning();
  }

  setupSpawning() {
    // Delay start
    this.scene.time.delayedCall(5000, () => {
      this.scheduleNextSpawn();
    });
  }

  scheduleNextSpawn() {
    if (!this.enabled) return;

    const delay = Phaser.Math.Between(this.spawnRate * 0.7, this.spawnRate * 1.3);

    this.spawnTimer = this.scene.time.delayedCall(delay, () => {
      this.spawnHazard();
      this.scheduleNextSpawn();
    });
  }

  spawnHazard() {
    if (!this.enabled) return;

    // Random lane
    const lane = Phaser.Math.Between(0, CONFIG.lanes - 1);
    const x = CONFIG.roadMargin + (lane * CONFIG.laneWidth) + CONFIG.laneWidth / 2;
    const y = -50;

    // Random hazard type based on current level
    const type = this.getRandomHazardType();

    const hazard = new Hazard(this.scene, x, y, type);
    this.hazards.add(hazard);
  }

  getRandomHazardType() {
    const roll = Math.random();
    const level = this.scene.levelManager?.getLevelNumber() || 1;

    // More ice in later levels
    if (level >= 4 && roll < 0.3) {
      return HAZARD_TYPES.ICE_PATCH;
    } else if (roll < 0.6) {
      return HAZARD_TYPES.OIL_SPILL;
    } else {
      return HAZARD_TYPES.POTHOLE;
    }
  }

  update(delta, roadSpeed) {
    this.hazards.children.each((hazard) => {
      if (hazard.active) {
        hazard.update(delta, roadSpeed);
      }
    });
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  setSpawnRate(rate) {
    this.spawnRate = rate;
  }

  getHazards() {
    return this.hazards;
  }

  destroy() {
    if (this.spawnTimer) this.spawnTimer.remove();
    this.hazards.clear(true, true);
  }
}
