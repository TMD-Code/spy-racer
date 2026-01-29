import { CONFIG, COLORS } from '../config.js';
import { EVENTS } from '../utils/constants.js';
import Boss, { BOSS_TYPES } from '../sprites/Boss.js';

export const LEVELS = [
  {
    id: 1,
    name: 'HIGHWAY',
    description: 'Easy Drive',
    roadColor: 0x333333,
    grassColor: 0x2d5a27,
    lineColor: 0xffff00,
    enemySpawnRate: 6000,      // More forgiving start
    civilianSpawnRate: 4500,
    maxVehicles: 3,
    maxEnemiesPerWave: 2,      // Added wave size control
    helicopterEnabled: false,
    bossType: null, // No boss for level 1
    scoreThreshold: 0
  },
  {
    id: 2,
    name: 'CITY STREETS',
    description: 'More Traffic',
    roadColor: 0x444444,
    grassColor: 0x1a3d1a,
    lineColor: 0xffffff,
    enemySpawnRate: 5500,      // Gradual increase
    civilianSpawnRate: 4000,
    maxVehicles: 4,
    maxEnemiesPerWave: 2,
    helicopterEnabled: false,
    bossType: BOSS_TYPES.ARMORED_TRUCK,
    scoreThreshold: 750        // Raised for more play time
  },
  {
    id: 3,
    name: 'DESERT ROAD',
    description: 'Helicopter Incoming',
    roadColor: 0x8b7355,
    grassColor: 0xc2b280,
    lineColor: 0xffffff,
    enemySpawnRate: 5000,
    civilianSpawnRate: 3800,
    maxVehicles: 4,
    maxEnemiesPerWave: 3,
    helicopterEnabled: true,
    bossType: BOSS_TYPES.WEAPON_VAN,
    scoreThreshold: 2000       // More gradual progression
  },
  {
    id: 4,
    name: 'MOUNTAIN PASS',
    description: 'Enemy Territory',
    roadColor: 0x555555,
    grassColor: 0x4a7c4e,
    lineColor: 0xffff00,
    enemySpawnRate: 4500,
    civilianSpawnRate: 3500,
    maxVehicles: 5,
    maxEnemiesPerWave: 3,
    helicopterEnabled: true,
    bossType: BOSS_TYPES.TANK,
    scoreThreshold: 4000
  },
  {
    id: 5,
    name: 'NIGHT MISSION',
    description: 'Final Challenge',
    roadColor: 0x1a1a1a,
    grassColor: 0x0d1a0d,
    lineColor: 0x888888,
    enemySpawnRate: 4000,
    civilianSpawnRate: 3000,
    maxVehicles: 5,
    maxEnemiesPerWave: 4,
    helicopterEnabled: true,
    bossType: BOSS_TYPES.SUPER_HELICOPTER,
    scoreThreshold: 6500
  }
];

// Endless mode configuration
const ENDLESS_CONFIG = {
  name: 'ENDLESS ARCADE',
  description: 'Survive as long as you can!',
  roadColor: 0x333333,
  grassColor: 0x2d5a27,
  lineColor: 0xffff00,
  enemySpawnRate: 5000,
  civilianSpawnRate: 4000,
  maxVehicles: 4,
  maxEnemiesPerWave: 2,
  helicopterEnabled: true
};

export default class LevelManager {
  constructor(scene, isEndlessMode = false) {
    this.scene = scene;
    this.isEndlessMode = isEndlessMode;
    this.currentLevelIndex = 0;
    this.currentLevel = isEndlessMode ? { ...ENDLESS_CONFIG, id: 0 } : LEVELS[0];
    this.levelTransitioning = false;
    this.bossActive = false;
    this.currentBoss = null;

    // Endless mode tracking
    this.endlessTimer = 0;
    this.endlessDifficultyTier = 1;
    this.endlessColorIndex = 0;

    // Create level announcement text (hidden initially)
    this.levelText = scene.add.text(CONFIG.width / 2, CONFIG.height / 2 - 50, '', {
      font: 'bold 32px monospace',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(40).setAlpha(0);

    this.levelSubtext = scene.add.text(CONFIG.width / 2, CONFIG.height / 2, '', {
      font: '18px monospace',
      fill: '#aaaaaa',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(40).setAlpha(0);

    // Listen for boss defeat (only in campaign mode)
    if (!isEndlessMode) {
      scene.events.on('bossDefeated', this.onBossDefeated, this);
    }

    // Show initial level/mode announcement
    this.showLevelAnnouncement();
  }

  update(currentScore) {
    // Endless mode has different progression
    if (this.isEndlessMode) {
      this.updateEndlessMode(currentScore);
      return;
    }

    // Update boss if active (must happen even during transitions)
    if (this.currentBoss && this.currentBoss.active) {
      this.currentBoss.update(
        this.scene.time.now,
        this.scene.game.loop.delta,
        this.scene.player.currentSpeed
      );

      // Also check boss projectile collisions each frame for off-screen cleanup
      this.checkBossProjectiles();
    }

    // Don't check level progression during transitions or boss fights
    if (this.levelTransitioning || this.bossActive) return;

    // Check if we should advance to next level
    const nextLevelIndex = this.currentLevelIndex + 1;
    if (nextLevelIndex < LEVELS.length) {
      const nextLevel = LEVELS[nextLevelIndex];
      if (currentScore >= nextLevel.scoreThreshold) {
        this.triggerLevelTransition();
      }
    }
  }

  updateEndlessMode(currentScore) {
    // Track time for difficulty scaling
    this.endlessTimer += this.scene.game.loop.delta;

    // Increase difficulty every 45 seconds
    const difficultyInterval = 45000;
    const newTier = Math.floor(this.endlessTimer / difficultyInterval) + 1;

    if (newTier > this.endlessDifficultyTier) {
      this.endlessDifficultyTier = newTier;
      this.increaseEndlessDifficulty();
    }

    // Change road colors every 60 seconds for variety
    const colorInterval = 60000;
    const newColorIndex = Math.floor(this.endlessTimer / colorInterval);

    if (newColorIndex > this.endlessColorIndex) {
      this.endlessColorIndex = newColorIndex;
      this.cycleEndlessColors();
    }
  }

  increaseEndlessDifficulty() {
    // Show difficulty increase notification
    this.levelText.setText(`DIFFICULTY TIER ${this.endlessDifficultyTier}`);
    this.levelSubtext.setText('Enemies getting tougher!');

    this.scene.tweens.add({
      targets: [this.levelText, this.levelSubtext],
      alpha: 1,
      duration: 500,
      onComplete: () => {
        this.scene.time.delayedCall(2000, () => {
          this.scene.tweens.add({
            targets: [this.levelText, this.levelSubtext],
            alpha: 0,
            duration: 500
          });
        });
      }
    });

    // Update traffic manager for harder gameplay
    if (this.scene.trafficManager) {
      const tm = this.scene.trafficManager;

      // Decrease spawn rates (faster spawning)
      const newEnemyRate = Math.max(3000, 5000 - (this.endlessDifficultyTier * 300));
      const newCivilianRate = Math.max(2500, 4000 - (this.endlessDifficultyTier * 200));
      tm.setSpawnRates(newEnemyRate, newCivilianRate);

      // Increase max vehicles
      tm.maxVehicles = Math.min(6, 4 + Math.floor(this.endlessDifficultyTier / 2));

      // Increase enemies per wave
      tm.maxEnemiesPerWave = Math.min(4, 2 + Math.floor(this.endlessDifficultyTier / 3));

      // Enable helicopters after tier 2
      if (this.endlessDifficultyTier >= 2) {
        tm.setHelicopterEnabled(true);
        tm.helicopterCooldown = Math.max(12000, 20000 - (this.endlessDifficultyTier * 1500));
      }

      // Shorten weapons van cooldown in later tiers (reward for surviving)
      tm.weaponsVanCooldown = Math.max(15000, 25000 - (this.endlessDifficultyTier * 2000));
    }

    // Play sound
    if (this.scene.audio) {
      this.scene.audio.play('powerup');
    }
  }

  cycleEndlessColors() {
    // Cycle through level color schemes for visual variety
    const colorSchemes = [
      { road: 0x333333, grass: 0x2d5a27, line: 0xffff00 }, // Highway
      { road: 0x444444, grass: 0x1a3d1a, line: 0xffffff }, // City
      { road: 0x8b7355, grass: 0xc2b280, line: 0xffffff }, // Desert
      { road: 0x555555, grass: 0x4a7c4e, line: 0xffff00 }, // Mountain
      { road: 0x1a1a1a, grass: 0x0d1a0d, line: 0x888888 }  // Night
    ];

    const scheme = colorSchemes[this.endlessColorIndex % colorSchemes.length];

    // Update road colors
    if (this.scene.roadManager) {
      this.scene.roadManager.setColors(scheme.road, scheme.grass, scheme.line);
    }

    this.currentLevel.roadColor = scheme.road;
    this.currentLevel.grassColor = scheme.grass;
    this.currentLevel.lineColor = scheme.line;
  }

  checkBossProjectiles() {
    if (!this.currentBoss || !this.currentBoss.projectiles) return;

    this.currentBoss.projectiles.children.each((projectile) => {
      if (!projectile.active) return;

      // Clean up off-screen projectiles
      if (projectile.y > CONFIG.height + 50 || projectile.y < -50 ||
          projectile.x < -50 || projectile.x > CONFIG.width + 50) {
        projectile.destroy();
      }
    });
  }

  triggerLevelTransition() {
    // Check if current level has a boss
    const bossType = this.currentLevel.bossType;

    if (bossType && !this.bossActive) {
      // Spawn boss before transitioning
      this.spawnBoss(bossType);
    } else if (!bossType) {
      // No boss, just advance
      this.advanceLevel();
    }
  }

  spawnBoss(bossType) {
    this.bossActive = true;
    this.levelTransitioning = true;

    // Clear regular enemies to make room for boss
    if (this.scene.trafficManager) {
      this.scene.trafficManager.enemies.clear(true, true);
    }

    // Spawn the boss
    this.currentBoss = new Boss(
      this.scene,
      CONFIG.width / 2,
      -100,
      bossType
    );

    // Setup boss collisions
    this.setupBossCollisions();
  }

  setupBossCollisions() {
    if (!this.currentBoss) return;

    const boss = this.currentBoss;
    const player = this.scene.player;

    // Player bullets vs boss
    this.scene.physics.add.overlap(
      player.bullets,
      boss,
      (objA, objB) => {
        // Determine which is the bullet (from the group)
        const bullet = objA.texture?.key === 'bullet' ? objA : objB;
        if (!bullet.active || !boss.active) return;
        bullet.setActive(false);
        bullet.setVisible(false);
        bullet.body.enable = false;
        boss.takeDamage(1);
        if (this.scene.audio) this.scene.audio.play('enemyHit');
      }
    );

    // Player missiles vs boss
    this.scene.physics.add.overlap(
      player.missiles,
      boss,
      (objA, objB) => {
        // Determine which is the missile (from the group)
        const missile = objA.texture?.key === 'missile' ? objA : objB;
        if (!missile.active || !boss.active) return;
        missile.setActive(false);
        missile.setVisible(false);
        missile.body.enable = false;
        boss.takeDamage(3);
        if (this.scene.audio) this.scene.audio.play('explosion');
      }
    );

    // Player vs boss (collision damage)
    this.scene.physics.add.overlap(
      player,
      boss,
      () => {
        if (!player.active || !boss.active) return;
        if (player.isInvulnerable) return;
        player.takeDamage(boss.damage);
        this.scene.flashDamage();
        if (this.scene.audio) this.scene.audio.play('hit');
        this.scene.showFloatingText(player.x, player.y, `-${boss.damage}`, '#ff0000');
      }
    );

    // Boss projectiles vs player
    if (boss.getProjectiles()) {
      this.scene.physics.add.overlap(
        player,
        boss.getProjectiles(),
        (objA, objB) => {
          // Determine which is the projectile
          const projectile = objA === player ? objB : objA;
          if (!player.active || !projectile.active) return;
          if (player.isInvulnerable) {
            projectile.destroy();
            return;
          }
          projectile.destroy();
          player.takeDamage(15);
          this.scene.flashDamage();
          if (this.scene.audio) this.scene.audio.play('hit');
          this.scene.showFloatingText(player.x, player.y, '-15', '#ff0000');
        }
      );
    }
  }

  onBossDefeated() {
    this.bossActive = false;
    this.currentBoss = null;

    // Wait a moment then advance level
    this.scene.time.delayedCall(2000, () => {
      this.advanceLevel();
    });
  }

  advanceLevel() {
    this.currentLevelIndex++;
    if (this.currentLevelIndex >= LEVELS.length) {
      this.currentLevelIndex = LEVELS.length - 1;
      // Game complete!
      this.showGameComplete();
      return;
    }

    this.currentLevel = LEVELS[this.currentLevelIndex];
    this.levelTransitioning = true;

    // Show level announcement
    this.showLevelAnnouncement();

    // Update traffic manager spawn rates and settings
    if (this.scene.trafficManager) {
      this.scene.trafficManager.setSpawnRates(
        this.currentLevel.enemySpawnRate,
        this.currentLevel.civilianSpawnRate
      );
      this.scene.trafficManager.setHelicopterEnabled(this.currentLevel.helicopterEnabled);
      if (this.currentLevel.maxVehicles) {
        this.scene.trafficManager.maxVehicles = this.currentLevel.maxVehicles;
      }
      if (this.currentLevel.maxEnemiesPerWave) {
        this.scene.trafficManager.maxEnemiesPerWave = this.currentLevel.maxEnemiesPerWave;
      }
    }

    // Update road colors
    this.updateRoadColors();

    // Emit level change event
    this.scene.events.emit(EVENTS.LEVEL_COMPLETE, this.currentLevel);

    // End transition after announcement
    this.scene.time.delayedCall(3000, () => {
      this.levelTransitioning = false;
    });
  }

  showGameComplete() {
    const complete = this.scene.add.text(
      CONFIG.width / 2, CONFIG.height / 2,
      'CONGRATULATIONS!\n\nYOU COMPLETED\nALL LEVELS!', {
        font: 'bold 24px monospace',
        fill: '#00ff00',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center'
      }
    ).setOrigin(0.5).setDepth(50);

    this.scene.tweens.add({
      targets: complete,
      scale: 1.1,
      duration: 1000,
      yoyo: true,
      repeat: -1
    });
  }

  showLevelAnnouncement() {
    if (this.isEndlessMode) {
      this.levelText.setText('ENDLESS ARCADE');
      this.levelText.setFill('#ff6600');
      this.levelSubtext.setText('Survive as long as you can!');
    } else {
      this.levelText.setText(`LEVEL ${this.currentLevel.id}: ${this.currentLevel.name}`);
      this.levelText.setFill('#ffffff');
      this.levelSubtext.setText(this.currentLevel.description);
    }

    this.scene.tweens.add({
      targets: [this.levelText, this.levelSubtext],
      alpha: 1,
      duration: 500,
      onComplete: () => {
        this.scene.time.delayedCall(2000, () => {
          this.scene.tweens.add({
            targets: [this.levelText, this.levelSubtext],
            alpha: 0,
            duration: 500
          });
        });
      }
    });
  }

  updateRoadColors() {
    this.scene.currentRoadColors = {
      road: this.currentLevel.roadColor,
      grass: this.currentLevel.grassColor,
      line: this.currentLevel.lineColor
    };

    // Actually update the road manager with new colors
    if (this.scene.roadManager) {
      this.scene.roadManager.setColors(
        this.currentLevel.roadColor,
        this.currentLevel.grassColor,
        this.currentLevel.lineColor
      );
    }
  }

  getCurrentLevel() {
    return this.currentLevel;
  }

  getLevelNumber() {
    return this.currentLevel.id;
  }

  getBoss() {
    return this.currentBoss;
  }

  isBossActive() {
    return this.bossActive;
  }

  destroy() {
    this.scene.events.off('bossDefeated', this.onBossDefeated, this);
    if (this.currentBoss && this.currentBoss.active) {
      this.currentBoss.destroyCompletely();
    }
  }
}
