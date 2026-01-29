import Phaser from 'phaser';
import { CONFIG, COLORS } from '../config.js';

/**
 * SceneryManager - Handles roadside scenery like trees, rocks, etc.
 * Creates a more immersive Spy Hunter-like environment
 */
export default class SceneryManager {
  constructor(scene) {
    this.scene = scene;

    // Scenery groups
    this.leftScenery = [];
    this.rightScenery = [];

    // Spawn timing
    this.spawnTimer = 0;
    this.spawnInterval = 400; // Spawn scenery every 400ms

    // Available scenery types with their properties
    this.sceneryTypes = [
      { key: 'tree_large', scale: 0.4, weight: 3 },
      { key: 'tree_small', scale: 0.5, weight: 4 },
      { key: 'rock1', scale: 0.6, weight: 2 },
      { key: 'rock2', scale: 0.6, weight: 2 },
      { key: 'rock3', scale: 0.6, weight: 1 }
    ];

    // Calculate total weight for random selection
    this.totalWeight = this.sceneryTypes.reduce((sum, s) => sum + s.weight, 0);

    // Road boundaries
    this.leftEdge = CONFIG.roadMargin - 10;
    this.rightEdge = CONFIG.width - CONFIG.roadMargin + 10;

    // Initialize with some scenery already on screen
    this.initializeScenery();
  }

  initializeScenery() {
    // Populate both sides with initial scenery
    for (let y = 0; y < CONFIG.height + 100; y += 80) {
      // Left side
      if (Math.random() < 0.7) {
        this.spawnSceneryAt('left', y);
      }
      // Right side
      if (Math.random() < 0.7) {
        this.spawnSceneryAt('right', y);
      }
    }
  }

  getRandomSceneryType() {
    let random = Math.random() * this.totalWeight;
    for (const scenery of this.sceneryTypes) {
      random -= scenery.weight;
      if (random <= 0) {
        return scenery;
      }
    }
    return this.sceneryTypes[0];
  }

  spawnSceneryAt(side, yPos) {
    const sceneryType = this.getRandomSceneryType();

    // Check if texture exists
    if (!this.scene.textures.exists(sceneryType.key)) {
      return null;
    }

    // Calculate x position with some randomness
    let x;
    if (side === 'left') {
      x = Phaser.Math.Between(5, this.leftEdge - 5);
    } else {
      x = Phaser.Math.Between(this.rightEdge + 5, CONFIG.width - 5);
    }

    const scenery = this.scene.add.image(x, yPos, sceneryType.key);
    scenery.setScale(sceneryType.scale);
    scenery.setDepth(-0.5); // Just above road, below vehicles

    // Add slight random rotation for variety
    scenery.setRotation(Phaser.Math.FloatBetween(-0.1, 0.1));

    // Store reference
    if (side === 'left') {
      this.leftScenery.push(scenery);
    } else {
      this.rightScenery.push(scenery);
    }

    return scenery;
  }

  spawnNewScenery() {
    // Spawn at top of screen (off-screen)
    const y = -50;

    // Left side - 70% chance
    if (Math.random() < 0.7) {
      this.spawnSceneryAt('left', y);
    }

    // Right side - 70% chance
    if (Math.random() < 0.7) {
      this.spawnSceneryAt('right', y);
    }
  }

  update(delta, roadSpeed) {
    const speed = roadSpeed || CONFIG.roadSpeed;
    const movement = (speed * delta) / 1000;

    // Update spawn timer
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnNewScenery();
    }

    // Move and clean up left scenery
    this.leftScenery = this.leftScenery.filter((scenery) => {
      if (!scenery || !scenery.active) return false;

      scenery.y += movement;

      // Remove if off screen
      if (scenery.y > CONFIG.height + 100) {
        scenery.destroy();
        return false;
      }
      return true;
    });

    // Move and clean up right scenery
    this.rightScenery = this.rightScenery.filter((scenery) => {
      if (!scenery || !scenery.active) return false;

      scenery.y += movement;

      // Remove if off screen
      if (scenery.y > CONFIG.height + 100) {
        scenery.destroy();
        return false;
      }
      return true;
    });
  }

  destroy() {
    this.leftScenery.forEach((s) => s && s.destroy());
    this.rightScenery.forEach((s) => s && s.destroy());
    this.leftScenery = [];
    this.rightScenery = [];
  }
}
