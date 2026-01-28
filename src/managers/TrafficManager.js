import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { ENEMY_TYPES } from '../utils/constants.js';
import Enemy from '../sprites/Enemy.js';
import Helicopter from '../sprites/Helicopter.js';

export default class TrafficManager {
  constructor(scene) {
    this.scene = scene;
    this.enemies = scene.physics.add.group();
    this.helicopters = [];
    this.spawnTimers = {};
    this.difficultyMultiplier = 1;
    this.helicopterEnabled = false;
    this.helicopterTimer = 0;
    this.helicopterCooldown = 20000; // 20 seconds between helicopters

    this.enemySpawnRate = CONFIG.enemySpawnRate;
    this.civilianSpawnRate = CONFIG.civilianSpawnRate;
    this.maxVehicles = CONFIG.maxVehiclesOnScreen || 4;

    // Track lane occupancy for spawn management
    this.laneOccupancy = new Array(CONFIG.lanes).fill(null);

    // Wave system - enemies come in groups with breaks
    this.waveActive = false;
    this.waveTimer = 0;
    this.waveCooldown = 8000; // 8 seconds between waves
    this.enemiesInWave = 0;
    this.maxEnemiesPerWave = 2;

    // Initial delay before spawning starts
    this.gameStartDelay = 2000;
    this.gameStarted = false;

    this.setupSpawning();
  }

  setupSpawning() {
    // Delay initial spawning to give player breathing room
    this.scene.time.delayedCall(this.gameStartDelay, () => {
      this.gameStarted = true;

      // Civilian spawn timer - predictable traffic
      this.spawnTimers.civilian = this.scene.time.addEvent({
        delay: this.civilianSpawnRate,
        callback: () => this.trySpawnCivilian(),
        loop: true
      });

      // Wave timer - enemies come in waves
      this.spawnTimers.wave = this.scene.time.addEvent({
        delay: this.waveCooldown,
        callback: () => this.startEnemyWave(),
        loop: true
      });
    });
  }

  setSpawnRates(enemyRate, civilianRate) {
    this.enemySpawnRate = enemyRate;
    this.civilianSpawnRate = civilianRate;

    // Update civilian timer
    if (this.spawnTimers.civilian) {
      this.spawnTimers.civilian.delay = civilianRate;
    }

    // Wave cooldown scales with enemy rate
    this.waveCooldown = Math.max(5000, enemyRate * 1.5);
    if (this.spawnTimers.wave) {
      this.spawnTimers.wave.delay = this.waveCooldown;
    }
  }

  setHelicopterEnabled(enabled) {
    this.helicopterEnabled = enabled;
  }

  getActiveVehicleCount() {
    let count = 0;
    this.enemies.children.each((enemy) => {
      if (enemy.active) count++;
    });
    return count;
  }

  findOpenLane(excludePlayerLane = false, fromBottom = false) {
    // Get current vehicle positions to find open lanes
    // Check different zones based on spawn direction
    const laneOccupied = new Array(CONFIG.lanes).fill(false);

    this.enemies.children.each((enemy) => {
      if (!enemy.active) return;

      const lane = this.getLaneFromX(enemy.x);
      if (lane < 0 || lane >= CONFIG.lanes) return;

      if (fromBottom) {
        // For enemies spawning from bottom, check bottom portion of screen
        if (enemy.y > CONFIG.height * 0.6) {
          laneOccupied[lane] = true;
        }
      } else {
        // For civilians spawning from top, check top portion of screen
        if (enemy.y < CONFIG.height * 0.4) {
          laneOccupied[lane] = true;
        }
      }
    });

    // Find player's lane if we should exclude it
    let playerLane = -1;
    if (excludePlayerLane && this.scene.player) {
      playerLane = this.getLaneFromX(this.scene.player.x);
    }

    // Find lanes that are open
    const openLanes = [];
    for (let i = 0; i < CONFIG.lanes; i++) {
      if (i !== playerLane && !laneOccupied[i]) {
        openLanes.push(i);
      }
    }

    // Return random open lane, or -1 if none available
    if (openLanes.length > 0) {
      return Phaser.Math.RND.pick(openLanes);
    }
    return -1;
  }

  getLaneFromX(x) {
    const laneX = x - CONFIG.roadMargin;
    return Math.floor(laneX / CONFIG.laneWidth);
  }

  getLaneX(lane) {
    return CONFIG.roadMargin + (lane * CONFIG.laneWidth) + CONFIG.laneWidth / 2;
  }

  trySpawnCivilian() {
    if (!this.gameStarted) return;

    // Check vehicle limit
    if (this.getActiveVehicleCount() >= this.maxVehicles) return;

    // Find an open lane
    const lane = this.findOpenLane(false);
    if (lane === -1) return; // No open lanes

    this.spawnCivilian(lane);
  }

  spawnCivilian(lane) {
    const x = this.getLaneX(lane);

    // Civilians always come from ahead (top of screen)
    const y = -60;

    const civilian = new Enemy(this.scene, x, y, ENEMY_TYPES.CIVILIAN);
    civilian.assignedLane = lane; // Track assigned lane
    this.enemies.add(civilian);
  }

  startEnemyWave() {
    if (!this.gameStarted) return;
    if (this.waveActive) return;

    // Start a new wave
    this.waveActive = true;
    this.enemiesInWave = 0;

    // Spawn first enemy immediately
    this.spawnWaveEnemy();

    // Spawn remaining enemies with delay
    if (this.maxEnemiesPerWave > 1) {
      this.spawnTimers.waveEnemy = this.scene.time.addEvent({
        delay: 1500, // 1.5 seconds between enemies in wave
        callback: () => this.spawnWaveEnemy(),
        repeat: this.maxEnemiesPerWave - 2 // Already spawned one
      });
    }
  }

  spawnWaveEnemy() {
    // Check vehicle limit
    if (this.getActiveVehicleCount() >= this.maxVehicles) {
      this.endWave();
      return;
    }

    // Find an open lane from bottom (enemies spawn from behind)
    // Also try to avoid player's lane for fair gameplay
    const lane = this.findOpenLane(true, true); // fromBottom = true
    if (lane === -1) {
      this.endWave();
      return;
    }

    this.spawnEnemy(lane);
    this.enemiesInWave++;

    if (this.enemiesInWave >= this.maxEnemiesPerWave) {
      this.endWave();
    }
  }

  endWave() {
    this.waveActive = false;
    if (this.spawnTimers.waveEnemy) {
      this.spawnTimers.waveEnemy.remove();
    }
  }

  spawnEnemy(lane) {
    const x = this.getLaneX(lane);

    // Enemies come from behind (bottom) - they're chasing you
    const y = CONFIG.height + 60;

    // Get current level for enemy variety
    const level = this.scene.levelManager?.getLevelNumber() || 1;

    // Randomly choose enemy type based on level
    const roll = Math.random();
    let type;

    if (level >= 4 && roll < 0.15) {
      type = ENEMY_TYPES.ARMORED; // Armored appears in level 4+
    } else if (level >= 3 && roll < 0.25) {
      type = ENEMY_TYPES.SHOOTER; // Shooters appear in level 3+
    } else if (level >= 2 && roll < 0.35) {
      type = ENEMY_TYPES.BLOCKER; // Blockers appear in level 2+
    } else if (roll < 0.6) {
      type = ENEMY_TYPES.CHASER;
    } else {
      type = ENEMY_TYPES.MOTORCYCLE;
    }

    const enemy = new Enemy(this.scene, x, y, type);
    enemy.assignedLane = lane;
    this.enemies.add(enemy);
  }

  spawnHelicopter() {
    // Only one helicopter at a time
    if (this.helicopters.length > 0) return;

    const x = Phaser.Math.Between(
      CONFIG.roadMargin + 50,
      CONFIG.width - CONFIG.roadMargin - 50
    );
    const y = -60;

    const helicopter = new Helicopter(this.scene, x, y);
    this.helicopters.push(helicopter);

    // Play warning sound
    if (this.scene.audio) {
      this.scene.audio.play('missile');
    }

    // Show warning
    const warning = this.scene.add
      .text(CONFIG.width / 2, 100, 'WARNING: HELICOPTER!', {
        font: 'bold 20px monospace',
        fill: '#ff0000',
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(50);

    this.scene.tweens.add({
      targets: warning,
      alpha: 0,
      y: 80,
      duration: 2000,
      onComplete: () => warning.destroy()
    });
  }

  update(time, delta, roadSpeed) {
    // Update ground enemies
    this.enemies.children.each((enemy) => {
      if (enemy.active) {
        enemy.update(time, delta, roadSpeed);
      }
    });

    // Update helicopters
    this.helicopters = this.helicopters.filter((heli) => {
      if (heli.active) {
        heli.update(time, delta, roadSpeed, this.scene.player);
        return true;
      }
      return false;
    });

    // Spawn helicopters (with longer cooldown)
    if (this.helicopterEnabled && this.gameStarted) {
      this.helicopterTimer += delta;
      if (
        this.helicopterTimer >= this.helicopterCooldown &&
        this.helicopters.length === 0
      ) {
        this.helicopterTimer = 0;
        this.spawnHelicopter();
      }
    }
  }

  increaseDifficulty() {
    this.difficultyMultiplier += 0.08;  // Slower difficulty scaling

    // Slightly increase spawn rates (but keep them reasonable)
    const newCivilianRate = Math.max(
      3000,                              // Higher minimum
      this.civilianSpawnRate * 0.95      // Slower decrease
    );
    this.setSpawnRates(this.enemySpawnRate, newCivilianRate);

    // Increase enemies per wave (max 4, controlled by level)
    // Only increment every other difficulty increase
    if (this.difficultyMultiplier % 0.16 < 0.08) {
      this.maxEnemiesPerWave = Math.min(4, this.maxEnemiesPerWave + 1);
    }

    // Reduce wave cooldown slightly (higher minimum)
    this.waveCooldown = Math.max(6000, this.waveCooldown - 300);

    // Reduce helicopter cooldown (higher minimum)
    this.helicopterCooldown = Math.max(15000, this.helicopterCooldown - 1500);
  }

  getEnemies() {
    return this.enemies;
  }

  getHelicopters() {
    return this.helicopters;
  }

  destroy() {
    Object.values(this.spawnTimers).forEach((timer) => {
      if (timer && timer.remove) timer.remove();
    });
    this.enemies.clear(true, true);
    this.helicopters.forEach((heli) => {
      if (heli.active) heli.destroyCompletely();
    });
    this.helicopters = [];
  }
}
