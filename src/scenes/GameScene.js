import Phaser from 'phaser';
import { SCENES, EVENTS, ENEMY_TYPES } from '../utils/constants.js';
import { CONFIG } from '../config.js';
import Player from '../sprites/Player.js';
import RoadManager from '../managers/RoadManager.js';
import TrafficManager from '../managers/TrafficManager.js';
import PowerUpManager from '../managers/PowerUpManager.js';
import LevelManager from '../managers/LevelManager.js';
import AudioManager from '../managers/AudioManager.js';
import HazardManager from '../managers/HazardManager.js';
import SceneryManager from '../managers/SceneryManager.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.GAME });
  }

  create(data) {
    // Get game mode from menu (default to campaign)
    this.gameMode = data?.mode || 'campaign';
    this.isEndlessMode = this.gameMode === 'endless';

    this.gameStarted = false;
    this.isPaused = false;
    this.tutorialShown = false;

    // Performance monitoring
    this.performanceMonitor = {
      frameCount: 0,
      lastCheck: 0,
      avgFPS: 60,
      checkInterval: 2000, // Check every 2 seconds
      lowFPSThreshold: 30,
      performanceMode: false
    };

    // Camera fade in
    this.cameras.main.fadeIn(500);

    // Create audio manager
    this.audio = new AudioManager(this.game);

    // Create damage flash overlay
    this.damageFlash = this.add.rectangle(
      CONFIG.width / 2,
      CONFIG.height / 2,
      CONFIG.width,
      CONFIG.height,
      0xff0000,
      0
    ).setDepth(100);

    // Create road
    this.roadManager = new RoadManager(this);

    // Create roadside scenery (trees, rocks, etc.)
    this.sceneryManager = new SceneryManager(this);

    // Create player
    this.player = new Player(this, CONFIG.width / 2, CONFIG.height - 100);
    this.player.audio = this.audio;

    // Create traffic manager
    this.trafficManager = new TrafficManager(this);

    // Create power-up manager
    this.powerUpManager = new PowerUpManager(this);

    // Create level manager (pass game mode)
    this.levelManager = new LevelManager(this, this.isEndlessMode);

    // Create hazard manager
    this.hazardManager = new HazardManager(this);

    // Setup collisions
    this.setupCollisions();

    // Launch HUD scene
    this.scene.launch(SCENES.HUD);
    this.hudScene = this.scene.get(SCENES.HUD);

    // Listen for game over
    this.events.on(EVENTS.GAME_OVER, this.handleGameOver, this);

    // Difficulty increase timer
    this.time.addEvent({
      delay: 30000, // Every 30 seconds
      callback: () => {
        if (this.gameStarted) {
          this.trafficManager.increaseDifficulty();
        }
      },
      loop: true
    });

    // Pause handling
    this.input.keyboard.on('keydown-ESC', () => {
      this.togglePause();
    });

    // Music toggle
    this.input.keyboard.on('keydown-M', () => {
      const musicOn = this.audio.toggleMusic();
      this.showFloatingText(CONFIG.width / 2, 100, musicOn ? 'MUSIC ON' : 'MUSIC OFF', '#00ffff');
    });

    // Initial HUD update
    this.events.emit(EVENTS.SCORE_UPDATE, 0);
    this.events.emit(EVENTS.HEALTH_UPDATE, this.player.health);
    this.events.emit(EVENTS.LIVES_UPDATE, this.player.lives);
    this.events.emit(EVENTS.WEAPON_UPDATE, this.player.currentWeapon, Infinity);

    // Show tutorial
    this.showTutorial();
  }

  showTutorial() {
    // Tutorial overlay
    this.tutorialOverlay = this.add.rectangle(
      CONFIG.width / 2,
      CONFIG.height / 2,
      CONFIG.width,
      CONFIG.height,
      0x000000,
      0.8
    ).setDepth(50);

    // Title - show game mode
    const modeTitle = this.isEndlessMode ? 'ENDLESS ARCADE' : 'CAMPAIGN MODE';
    const modeColor = this.isEndlessMode ? '#ff6600' : '#00ff00';

    this.tutorialTitle = this.add.text(CONFIG.width / 2, 70, modeTitle, {
      font: 'bold 28px monospace',
      fill: modeColor
    }).setOrigin(0.5).setDepth(51);

    // Goal
    const goalText = this.isEndlessMode
      ? 'Survive as long as possible! No levels, no end - just beat your high score!'
      : 'Complete all 5 levels and defeat the bosses!';

    this.tutorialGoal = this.add.text(CONFIG.width / 2, 115, goalText, {
      font: '13px monospace',
      fill: '#aaaaaa',
      wordWrap: { width: 400 },
      align: 'center'
    }).setOrigin(0.5).setDepth(51);

    // Enemy car example
    this.tutorialEnemy = this.add.image(100, 220, 'enemy').setDepth(51);
    this.tutorialEnemyLabel = this.add.text(150, 200, 'RED = ENEMY', {
      font: 'bold 20px monospace',
      fill: '#ff4444'
    }).setDepth(51);
    this.tutorialEnemyDesc = this.add.text(150, 225, 'SHOOT them for +100 points!', {
      font: '14px monospace',
      fill: '#ffffff'
    }).setDepth(51);

    // Civilian car example
    this.tutorialCivilian = this.add.image(100, 310, 'civilian').setDepth(51);
    this.tutorialCivilianLabel = this.add.text(150, 290, 'YELLOW = CIVILIAN', {
      font: 'bold 20px monospace',
      fill: '#f1c40f'
    }).setDepth(51);
    this.tutorialCivilianDesc = this.add.text(150, 315, 'AVOID them or lose points!', {
      font: '14px monospace',
      fill: '#ffffff'
    }).setDepth(51);

    // Controls
    this.tutorialControls = this.add.text(CONFIG.width / 2, 400,
      'CONTROLS:\n\n' +
      'WASD / Arrows = Move\n' +
      'SPACE = Shoot\n' +
      'SHIFT = Switch Weapon\n' +
      'ESC = Pause', {
      font: '14px monospace',
      fill: '#00ff00',
      align: 'center'
    }).setOrigin(0.5).setDepth(51);

    // Start prompt
    this.tutorialStart = this.add.text(CONFIG.width / 2, 530, '[ PRESS SPACE TO START ]', {
      font: 'bold 20px monospace',
      fill: '#ffffff'
    }).setOrigin(0.5).setDepth(51);

    // Blink effect
    this.tweens.add({
      targets: this.tutorialStart,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // Wait for space to start
    this.input.keyboard.once('keydown-SPACE', () => {
      this.hideTutorial();
    });

    this.input.once('pointerdown', () => {
      this.hideTutorial();
    });
  }

  hideTutorial() {
    // Fade out tutorial elements
    const tutorialElements = [
      this.tutorialOverlay, this.tutorialTitle, this.tutorialGoal,
      this.tutorialEnemy, this.tutorialEnemyLabel, this.tutorialEnemyDesc,
      this.tutorialCivilian, this.tutorialCivilianLabel, this.tutorialCivilianDesc,
      this.tutorialControls, this.tutorialStart
    ];

    this.tweens.add({
      targets: tutorialElements,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        tutorialElements.forEach(el => el.destroy());
        this.tutorialShown = true;
        this.gameStarted = true;

        // Start background music
        this.audio.startMusic();

        // Setup touch controls for mobile
        this.setupTouchControls();
      }
    });
  }

  setupTouchControls() {
    // Check if touch device
    if (!this.sys.game.device.input.touch) return;

    // Track which pointer is controlling joystick
    this.joystickPointerId = null;

    // Create virtual joystick area (left side)
    this.touchJoystick = {
      active: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0
    };

    // Joystick base (visual) - slightly larger for easier touch
    this.joystickBase = this.add.circle(90, CONFIG.height - 110, 55, 0x333333, 0.5)
      .setDepth(100).setScrollFactor(0);
    this.joystickThumb = this.add.circle(90, CONFIG.height - 110, 28, 0x666666, 0.8)
      .setDepth(101).setScrollFactor(0);

    // Fire button (right side) - larger touch target
    this.fireButton = this.add.circle(CONFIG.width - 75, CONFIG.height - 100, 45, 0xff0000, 0.6)
      .setDepth(100).setScrollFactor(0).setInteractive();
    this.fireButtonText = this.add.text(CONFIG.width - 75, CONFIG.height - 100, 'FIRE', {
      font: 'bold 14px monospace',
      fill: '#ffffff'
    }).setOrigin(0.5).setDepth(101);

    // Weapon switch button - larger touch target
    this.weaponButton = this.add.circle(CONFIG.width - 75, CONFIG.height - 190, 35, 0x0066ff, 0.6)
      .setDepth(100).setScrollFactor(0).setInteractive();
    this.weaponButtonText = this.add.text(CONFIG.width - 75, CONFIG.height - 190, 'WPN', {
      font: 'bold 11px monospace',
      fill: '#ffffff'
    }).setOrigin(0.5).setDepth(101);

    // Enable multi-touch
    this.input.addPointer(2);

    // Touch input handling with pointer tracking for multi-touch
    this.input.on('pointerdown', (pointer) => {
      // Left half = joystick (track specific pointer)
      if (pointer.x < CONFIG.width / 2 && this.joystickPointerId === null) {
        this.joystickPointerId = pointer.id;
        this.touchJoystick.active = true;
        this.touchJoystick.startX = pointer.x;
        this.touchJoystick.startY = pointer.y;
        this.joystickBase.setPosition(pointer.x, pointer.y);
        this.joystickThumb.setPosition(pointer.x, pointer.y);
        // Visual feedback
        this.joystickBase.setAlpha(0.7);
      }
    });

    this.input.on('pointermove', (pointer) => {
      // Only respond to the pointer that started the joystick
      if (this.touchJoystick.active && pointer.id === this.joystickPointerId) {
        const maxDist = 45;
        const deadZone = 5; // Small dead zone for precision
        let dx = pointer.x - this.touchJoystick.startX;
        let dy = pointer.y - this.touchJoystick.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > maxDist) {
          dx = (dx / dist) * maxDist;
          dy = (dy / dist) * maxDist;
        }

        this.joystickThumb.setPosition(
          this.touchJoystick.startX + dx,
          this.touchJoystick.startY + dy
        );

        // Apply dead zone and convert to player input
        if (dist < deadZone) {
          this.touchJoystick.currentX = 0;
          this.touchJoystick.currentY = 0;
        } else {
          this.touchJoystick.currentX = dx / maxDist;
          this.touchJoystick.currentY = dy / maxDist;
        }
      }
    });

    this.input.on('pointerup', (pointer) => {
      // Only reset if this is the joystick pointer
      if (pointer.id === this.joystickPointerId) {
        this.joystickPointerId = null;
        this.touchJoystick.active = false;
        this.touchJoystick.currentX = 0;
        this.touchJoystick.currentY = 0;
        // Return joystick to default position
        this.joystickBase.setPosition(90, CONFIG.height - 110);
        this.joystickThumb.setPosition(90, CONFIG.height - 110);
        this.joystickBase.setAlpha(0.5);
      }
    });

    // Fire button with visual feedback
    this.fireButton.on('pointerdown', () => {
      this.player.isTouchFiring = true;
      this.fireButton.setScale(0.9);
      this.fireButton.setAlpha(0.9);
    });
    this.fireButton.on('pointerup', () => {
      this.player.isTouchFiring = false;
      this.fireButton.setScale(1);
      this.fireButton.setAlpha(0.6);
    });
    this.fireButton.on('pointerout', () => {
      this.player.isTouchFiring = false;
      this.fireButton.setScale(1);
      this.fireButton.setAlpha(0.6);
    });

    // Weapon switch button with visual feedback
    this.weaponButton.on('pointerdown', () => {
      this.player.switchWeapon();
      this.weaponButton.setScale(0.9);
      this.weaponButton.setAlpha(0.9);
    });
    this.weaponButton.on('pointerup', () => {
      this.weaponButton.setScale(1);
      this.weaponButton.setAlpha(0.6);
    });
    this.weaponButton.on('pointerout', () => {
      this.weaponButton.setScale(1);
      this.weaponButton.setAlpha(0.6);
    });

    // Pass touch joystick reference to player
    this.player.touchJoystick = this.touchJoystick;
  }

  setupCollisions() {
    // Player bullets vs enemies
    this.physics.add.overlap(
      this.player.bullets,
      this.trafficManager.getEnemies(),
      this.bulletHitEnemy,
      null,
      this
    );

    // Player missiles vs enemies
    this.physics.add.overlap(
      this.player.missiles,
      this.trafficManager.getEnemies(),
      this.missileHitEnemy,
      null,
      this
    );

    // Player vs enemies
    this.physics.add.overlap(
      this.player,
      this.trafficManager.getEnemies(),
      this.playerHitEnemy,
      null,
      this
    );

    // Enemies vs oil slicks
    this.physics.add.overlap(
      this.player.oilSlicks,
      this.trafficManager.getEnemies(),
      this.enemyHitOil,
      null,
      this
    );

    // Player vs power-ups
    this.physics.add.overlap(
      this.player,
      this.powerUpManager.getPowerUps(),
      this.playerCollectPowerUp,
      null,
      this
    );

    // Player vs hazards
    this.physics.add.overlap(
      this.player,
      this.hazardManager.getHazards(),
      this.playerHitHazard,
      null,
      this
    );

    // Enemy vs enemy collision - prevents vehicles from overlapping each other
    this.physics.add.collider(
      this.trafficManager.getEnemies(),
      this.trafficManager.getEnemies(),
      this.enemyHitEnemy,
      null,
      this
    );

    // Note: Helicopter collisions are handled in update() since they're not in a physics group
  }

  enemyHitEnemy(enemy1, enemy2) {
    // When two enemies collide, push them apart horizontally
    if (!enemy1.active || !enemy2.active) return;

    // Determine which one should yield based on position
    if (enemy1.x < enemy2.x) {
      enemy1.x -= 5;
      enemy2.x += 5;
    } else {
      enemy1.x += 5;
      enemy2.x -= 5;
    }
  }

  playerHitHazard(player, hazard) {
    if (!player.active || !hazard.active) return;
    hazard.applyEffect(player);
  }

  playerCollectPowerUp(player, powerUp) {
    if (!player.active || !powerUp.active) return;
    powerUp.collect(player);
  }

  checkHelicopterCollisions() {
    const helicopters = this.trafficManager.getHelicopters();

    helicopters.forEach((helicopter) => {
      if (!helicopter.active) return;

      // Check bullets vs helicopter
      this.player.bullets.children.each((bullet) => {
        if (bullet.active && this.physics.overlap(bullet, helicopter)) {
          bullet.setActive(false);
          bullet.setVisible(false);
          bullet.body.enable = false;
          this.audio.play('enemyHit');
          helicopter.takeDamage(1);
        }
      });

      // Check missiles vs helicopter
      this.player.missiles.children.each((missile) => {
        if (missile.active && this.physics.overlap(missile, helicopter)) {
          missile.setActive(false);
          missile.setVisible(false);
          missile.body.enable = false;
          this.audio.play('explosion');
          helicopter.takeDamage(3);
        }
      });
    });
  }

  checkWeaponsVanInteraction() {
    const van = this.trafficManager.getWeaponsVan();
    if (!van || !van.active || !this.player || !this.player.active) return;

    // If player is inside van, lock their position
    if (this.player.insideVan === van) {
      this.player.x = van.x;
      this.player.y = van.y + 30;
      return;
    }

    // Check if player is overlapping with van's entry zone (rear of van)
    if (this.physics.overlap(this.player, van)) {
      van.tryEnterVan(this.player);
    }
  }

  checkEnemyProjectiles() {
    const enemies = this.trafficManager.getEnemies().children.entries;

    enemies.forEach((enemy) => {
      if (!enemy.active || !enemy.projectiles) return;

      enemy.projectiles.children.each((projectile) => {
        if (!projectile.active) return;

        // Check collision with player
        if (this.physics.overlap(projectile, this.player)) {
          // Skip if player is invulnerable
          if (this.player.isInvulnerable) {
            projectile.destroy();
            return;
          }

          // Damage player
          this.player.takeDamage(15);
          this.flashDamage();
          this.audio.play('hit');

          // Show damage text
          this.showFloatingText(this.player.x, this.player.y, '-15', '#ff0000');

          // Destroy projectile
          projectile.destroy();
        }

        // Clean up projectiles that go off screen
        if (projectile.y > CONFIG.height + 50 || projectile.y < -50 ||
            projectile.x < -50 || projectile.x > CONFIG.width + 50) {
          projectile.destroy();
        }
      });
    });
  }

  bulletHitEnemy(bullet, enemy) {
    if (!bullet.active || !enemy.active) return;

    // Disable bullet
    bullet.setActive(false);
    bullet.setVisible(false);
    bullet.body.enable = false;

    // Play sound
    this.audio.play('enemyHit');

    // Damage enemy
    const killed = enemy.takeDamage(1);
    if (killed) {
      this.audio.play('explosion');
    }
  }

  missileHitEnemy(missile, enemy) {
    if (!missile.active || !enemy.active) return;

    // Disable missile
    missile.setActive(false);
    missile.setVisible(false);
    missile.body.enable = false;

    // Play sound
    this.audio.play('explosion');

    // Missiles do more damage
    enemy.takeDamage(3);
  }

  playerHitEnemy(player, enemy) {
    if (!player.active || !enemy.active) return;
    if (player.isInvulnerable) return;

    // Flash screen red
    this.flashDamage();

    // Play hit sound
    this.audio.play('hit');

    // Calculate collision direction for push effect
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;

    // Determine if this is a side collision (push/ram) or front/rear collision
    const isSideCollision = Math.abs(dx) > Math.abs(dy) * 0.5;

    if (isSideCollision && enemy.enemyType !== ENEMY_TYPES.CIVILIAN) {
      // PUSH/RAM MECHANIC - Enemy pushes player sideways
      const pushForce = 150; // Strong sideways push
      const pushDirection = dx > 0 ? 1 : -1; // Push away from enemy

      // Apply immediate velocity push
      player.setVelocityX(player.body.velocity.x + (pushForce * pushDirection));

      // Also physically move player (immediate displacement)
      player.x += pushDirection * 15;

      // Show ram effect
      this.showFloatingText(player.x, player.y, 'RAMMED!', '#ff6600');

      // Reduce damage slightly for side hits (glancing blow)
      player.takeDamage(20);
      enemy.takeDamage(1);

      // Create spark effect at collision point
      this.createCollisionSparks(player.x - (pushDirection * 20), player.y);
    } else {
      // Front/rear collision - full damage
      player.takeDamage(30);
      enemy.takeDamage(2);
    }

    // Show floating text based on enemy type
    if (enemy.enemyType === ENEMY_TYPES.CIVILIAN) {
      this.showFloatingText(enemy.x, enemy.y, '-50', '#ff0000');
    }
  }

  createCollisionSparks(x, y) {
    // Create visual spark effect for collisions
    for (let i = 0; i < 5; i++) {
      const spark = this.add.graphics();
      spark.fillStyle(0xffff00, 1);
      spark.fillCircle(0, 0, 3);
      spark.setPosition(x + Phaser.Math.Between(-10, 10), y + Phaser.Math.Between(-10, 10));
      spark.setDepth(15);

      this.tweens.add({
        targets: spark,
        x: spark.x + Phaser.Math.Between(-30, 30),
        y: spark.y + Phaser.Math.Between(-30, 30),
        alpha: 0,
        scale: 0.5,
        duration: 300,
        onComplete: () => spark.destroy()
      });
    }
  }

  enemyHitOil(oilSlick, enemy) {
    if (!oilSlick.active || !enemy.active) return;
    if (enemy.spinningOut) return;

    enemy.spinningOut = true;

    // Spin out effect
    this.tweens.add({
      targets: enemy,
      angle: 360,
      duration: 500,
      onComplete: () => {
        if (enemy.active) {
          enemy.spinningOut = false;
          enemy.takeDamage(1);
        }
      }
    });
  }

  flashDamage() {
    this.damageFlash.setAlpha(0.4);
    this.tweens.add({
      targets: this.damageFlash,
      alpha: 0,
      duration: 200
    });
  }

  showFloatingText(x, y, text, color) {
    const floatingText = this.add.text(x, y, text, {
      font: 'bold 24px monospace',
      fill: color,
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: floatingText,
      y: y - 50,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => floatingText.destroy()
    });
  }

  update(time, delta) {
    if (!this.gameStarted || this.isPaused) return;

    try {
      // Performance monitoring
      this.updatePerformanceMonitor(time, delta);

      // Update road scrolling
      this.roadManager.update(delta, this.player.currentSpeed);

      // Update roadside scenery
      this.sceneryManager.update(delta, this.player.currentSpeed);

      // Update player
      this.player.update(time, delta);

      // Update traffic
      this.trafficManager.update(time, delta, this.player.currentSpeed);

      // Update power-ups
      this.powerUpManager.update(time, delta, this.player.currentSpeed);

      // Update hazards
      this.hazardManager.update(delta, this.player.currentSpeed);

      // Check helicopter collisions
      this.checkHelicopterCollisions();

      // Check enemy shooter projectiles
      this.checkEnemyProjectiles();

      // Check weapons van interaction
      this.checkWeaponsVanInteraction();

      // Update level progression
      this.levelManager.update(Math.floor(this.player.score));
    } catch (error) {
      console.error('Game update error:', error);
    }
  }

  updatePerformanceMonitor(time, delta) {
    this.performanceMonitor.frameCount++;

    // Check FPS periodically
    if (time - this.performanceMonitor.lastCheck >= this.performanceMonitor.checkInterval) {
      const elapsed = (time - this.performanceMonitor.lastCheck) / 1000;
      const fps = this.performanceMonitor.frameCount / elapsed;

      // Smooth FPS average
      this.performanceMonitor.avgFPS = this.performanceMonitor.avgFPS * 0.7 + fps * 0.3;

      // Reset counters
      this.performanceMonitor.frameCount = 0;
      this.performanceMonitor.lastCheck = time;

      // Adjust game if FPS is consistently low
      if (this.performanceMonitor.avgFPS < this.performanceMonitor.lowFPSThreshold && !this.performanceMonitor.performanceMode) {
        this.enablePerformanceMode();
      } else if (this.performanceMonitor.avgFPS > 45 && this.performanceMonitor.performanceMode) {
        this.disablePerformanceMode();
      }
    }
  }

  enablePerformanceMode() {
    this.performanceMonitor.performanceMode = true;

    // Reduce max vehicles on screen
    if (this.trafficManager) {
      this.trafficManager.maxVehicles = Math.max(2, this.trafficManager.maxVehicles - 1);
    }

    // Increase spawn delays
    if (this.trafficManager && this.trafficManager.spawnTimers.civilian) {
      this.trafficManager.civilianSpawnRate *= 1.3;
      this.trafficManager.spawnTimers.civilian.delay = this.trafficManager.civilianSpawnRate;
    }

    console.log('Performance mode enabled - reducing entities');
  }

  disablePerformanceMode() {
    this.performanceMonitor.performanceMode = false;

    // Restore settings from current level
    const level = this.levelManager?.getCurrentLevel();
    if (level && this.trafficManager) {
      this.trafficManager.maxVehicles = level.maxVehicles || 4;
      this.trafficManager.civilianSpawnRate = level.civilianSpawnRate;
      if (this.trafficManager.spawnTimers.civilian) {
        this.trafficManager.spawnTimers.civilian.delay = level.civilianSpawnRate;
      }
    }

    console.log('Performance mode disabled - restored settings');
  }

  togglePause() {
    if (!this.tutorialShown) return;

    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      this.physics.pause();
      this.showPauseMenu();
    } else {
      this.physics.resume();
      this.hidePauseMenu();
    }
  }

  showPauseMenu() {
    this.pauseOverlay = this.add.rectangle(
      CONFIG.width / 2,
      CONFIG.height / 2,
      CONFIG.width,
      CONFIG.height,
      0x000000,
      0.7
    ).setDepth(60);

    this.pauseText = this.add.text(CONFIG.width / 2, CONFIG.height / 2, 'PAUSED\n\nPress ESC to resume', {
      font: '32px monospace',
      fill: '#ffffff',
      align: 'center'
    }).setOrigin(0.5).setDepth(61);
  }

  hidePauseMenu() {
    if (this.pauseOverlay) this.pauseOverlay.destroy();
    if (this.pauseText) this.pauseText.destroy();
  }

  handleGameOver(finalScore) {
    this.gameStarted = false;

    // Stop music and play explosion
    this.audio.stopMusic();
    this.audio.play('explosion');

    // Save high score with validation
    const validatedHighScore = this.getValidatedHighScore();
    const flooredScore = Math.floor(finalScore);
    if (flooredScore > validatedHighScore) {
      this.saveValidatedHighScore(flooredScore);
    }

    // Stop HUD scene
    this.scene.stop(SCENES.HUD);

    // Transition to game over
    this.cameras.main.fadeOut(1000, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENES.GAME_OVER, { score: flooredScore });
    });
  }

  // Simple checksum for score validation (prevents trivial localStorage editing)
  generateScoreChecksum(score) {
    // Use a simple hash combining score with a salt (include mode for different scores)
    const salt = `SpyRacer2024${this.gameMode}`;
    const data = `${salt}${score}${salt.split('').reverse().join('')}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  getValidatedHighScore() {
    try {
      const key = this.isEndlessMode ? 'spyRacerEndlessHighScore' : 'spyRacerHighScore';
      const checkKey = this.isEndlessMode ? 'spyRacerEndlessScoreCheck' : 'spyRacerScoreCheck';

      const stored = localStorage.getItem(key);
      const checksum = localStorage.getItem(checkKey);
      if (!stored || !checksum) return 0;

      const score = parseInt(stored, 10);
      if (isNaN(score) || score < 0) return 0;

      // Validate checksum
      const expectedChecksum = this.generateScoreChecksum(score);
      if (checksum !== expectedChecksum) {
        // Checksum mismatch - score may have been tampered with
        console.warn('High score validation failed - resetting');
        localStorage.removeItem(key);
        localStorage.removeItem(checkKey);
        return 0;
      }

      return score;
    } catch (e) {
      return 0;
    }
  }

  saveValidatedHighScore(score) {
    try {
      const key = this.isEndlessMode ? 'spyRacerEndlessHighScore' : 'spyRacerHighScore';
      const checkKey = this.isEndlessMode ? 'spyRacerEndlessScoreCheck' : 'spyRacerScoreCheck';

      const checksum = this.generateScoreChecksum(score);
      localStorage.setItem(key, score.toString());
      localStorage.setItem(checkKey, checksum);
    } catch (e) {
      // localStorage not available - fail silently
    }
  }

  shutdown() {
    this.events.off(EVENTS.GAME_OVER, this.handleGameOver, this);
    if (this.trafficManager) this.trafficManager.destroy();
    if (this.powerUpManager) this.powerUpManager.destroy();
    if (this.hazardManager) this.hazardManager.destroy();
    if (this.levelManager) this.levelManager.destroy();
  }
}
