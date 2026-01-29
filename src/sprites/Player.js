import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { WEAPONS, EVENTS } from '../utils/constants.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');

    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Physics setup
    this.setCollideWorldBounds(true);
    this.body.setSize(52, 95); // Match visual sprite size for accurate collisions

    // Player state
    this.health = CONFIG.startingHealth;
    this.lives = CONFIG.startingLives;
    this.score = 0;
    this.currentSpeed = CONFIG.roadSpeed;
    this.isInvulnerable = false;
    this.invulnerabilityTimer = null;

    // Weapons
    this.currentWeapon = WEAPONS.MACHINE_GUN;
    this.weapons = {
      [WEAPONS.MACHINE_GUN]: { ammo: Infinity, lastFired: 0 },
      [WEAPONS.MISSILE]: { ammo: 5, lastFired: 0 },
      [WEAPONS.OIL_SLICK]: { ammo: 3, lastFired: 0 },
      [WEAPONS.SMOKE_SCREEN]: { ammo: 2, lastFired: 0 }
    };

    // Projectile groups
    this.bullets = scene.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 20,
      runChildUpdate: true
    });

    this.missiles = scene.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 5,
      runChildUpdate: true
    });

    this.oilSlicks = scene.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 10,
      runChildUpdate: true
    });

    // Input setup
    this.setupControls();

    // Shield visual (when invulnerable)
    this.shield = scene.add.graphics();
    this.shield.setVisible(false);

    // Weapons van interaction
    this.insideVan = null;
  }

  setupControls() {
    const { keyboard } = this.scene.input;

    this.cursors = keyboard.createCursorKeys();
    this.wasd = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };
    this.fireKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.switchWeaponKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    // Weapon switching
    this.switchWeaponKey.on('down', () => this.switchWeapon());
  }

  update(time, delta) {
    this.handleMovement();
    this.handleFiring(time);
    this.updateProjectiles();
    this.updateShieldVisual();

    // Add score based on distance traveled
    if (this.scene.gameStarted) {
      this.score += (CONFIG.distancePoints * delta) / 1000;
      this.scene.events.emit(EVENTS.SCORE_UPDATE, Math.floor(this.score));
    }
  }

  handleMovement() {
    // Don't allow movement when inside weapons van
    if (this.insideVan) {
      this.setVelocity(0, 0);
      return;
    }

    const speed = CONFIG.playerSpeed;

    // Check for touch joystick input
    const touchX = this.touchJoystick?.active ? this.touchJoystick.currentX : 0;
    const touchY = this.touchJoystick?.active ? this.touchJoystick.currentY : 0;

    // Horizontal movement (keyboard or touch)
    if (this.cursors.left.isDown || this.wasd.left.isDown || touchX < -0.3) {
      this.setVelocityX(-speed);
    } else if (this.cursors.right.isDown || this.wasd.right.isDown || touchX > 0.3) {
      this.setVelocityX(speed);
    } else if (Math.abs(touchX) > 0.1) {
      // Analog movement for touch
      this.setVelocityX(touchX * speed);
    } else {
      this.setVelocityX(0);
    }

    // Vertical movement (affects road speed perception)
    if (this.cursors.up.isDown || this.wasd.up.isDown || touchY < -0.3) {
      this.setVelocityY(-speed * 0.5);
      this.currentSpeed = Math.min(this.currentSpeed + 2, CONFIG.playerMaxSpeed);
    } else if (this.cursors.down.isDown || this.wasd.down.isDown || touchY > 0.3) {
      this.setVelocityY(speed * 0.5);
      this.currentSpeed = Math.max(this.currentSpeed - 2, CONFIG.playerMinSpeed);
    } else if (Math.abs(touchY) > 0.1) {
      // Analog movement for touch
      this.setVelocityY(touchY * speed * 0.5);
    } else {
      this.setVelocityY(0);
      // Gradually return to normal speed
      if (this.currentSpeed > CONFIG.roadSpeed) {
        this.currentSpeed -= 1;
      } else if (this.currentSpeed < CONFIG.roadSpeed) {
        this.currentSpeed += 1;
      }
    }

    // Road boundary danger - grass slows and damages player
    const roadLeft = CONFIG.roadMargin + 10;
    const roadRight = CONFIG.width - CONFIG.roadMargin - 10;

    // Check if player is on the grass (road edge danger zone)
    if (this.x < roadLeft || this.x > roadRight) {
      // Player is on grass - apply penalties
      this.onGrass = true;

      // Slow down significantly
      this.currentSpeed = Math.max(this.currentSpeed - 5, CONFIG.playerMinSpeed);

      // Apply resistance (push back toward road)
      if (this.x < roadLeft) {
        this.setVelocityX(this.body.velocity.x + 50); // Push right
      } else {
        this.setVelocityX(this.body.velocity.x - 50); // Push left
      }

      // Take damage over time (every 500ms while on grass)
      if (!this.grassDamageTimer) {
        this.grassDamageTimer = this.scene.time.now;
      }

      if (this.scene.time.now - this.grassDamageTimer > 500) {
        this.grassDamageTimer = this.scene.time.now;
        if (!this.isInvulnerable) {
          this.takeDamage(5);
          this.scene.showFloatingText(this.x, this.y - 30, 'OFF ROAD!', '#ff6600');
        }
      }

      // Visual feedback - shake/vibrate effect
      if (!this.grassShaking) {
        this.grassShaking = true;
        this.scene.tweens.add({
          targets: this,
          angle: { from: -3, to: 3 },
          duration: 50,
          yoyo: true,
          repeat: 2,
          onComplete: () => {
            this.angle = 0;
            this.grassShaking = false;
          }
        });
      }
    } else {
      this.onGrass = false;
      this.grassDamageTimer = null;
    }

    // Hard boundaries - can't go completely off screen
    const minX = 10;
    const maxX = CONFIG.width - 10;
    this.x = Phaser.Math.Clamp(this.x, minX, maxX);
  }

  handleFiring(time) {
    if (Phaser.Input.Keyboard.JustDown(this.fireKey)) {
      this.fire(time);
    }

    // Auto-fire for machine gun when held (keyboard or touch)
    const isFiring = this.fireKey.isDown || this.isTouchFiring;
    if (this.currentWeapon === WEAPONS.MACHINE_GUN && isFiring) {
      this.fire(time);
    }

    // Single shot weapons for touch
    if (this.isTouchFiring && this.currentWeapon !== WEAPONS.MACHINE_GUN) {
      this.fire(time);
      this.isTouchFiring = false; // Prevent continuous fire for non-machine guns
    }
  }

  fire(time) {
    const weapon = this.weapons[this.currentWeapon];
    let fireRate;

    switch (this.currentWeapon) {
      case WEAPONS.MACHINE_GUN:
        fireRate = CONFIG.machineGunFireRate;
        break;
      case WEAPONS.MISSILE:
        fireRate = CONFIG.missileFireRate;
        break;
      default:
        fireRate = 500;
    }

    if (time < weapon.lastFired + fireRate) return;
    if (weapon.ammo <= 0) return;

    weapon.lastFired = time;
    if (weapon.ammo !== Infinity) {
      weapon.ammo--;
      this.scene.events.emit(EVENTS.WEAPON_UPDATE, this.currentWeapon, weapon.ammo);
    }

    switch (this.currentWeapon) {
      case WEAPONS.MACHINE_GUN:
        this.fireBullet();
        break;
      case WEAPONS.MISSILE:
        this.fireMissile();
        break;
      case WEAPONS.OIL_SLICK:
        this.dropOilSlick();
        break;
      case WEAPONS.SMOKE_SCREEN:
        this.activateSmokeScreen();
        break;
    }
  }

  fireBullet() {
    const bullet = this.bullets.get(this.x, this.y - 30, 'bullet');
    if (bullet) {
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.body.enable = true;
      bullet.setVelocityY(-CONFIG.bulletSpeed);

      // Play sound
      if (this.audio) this.audio.play('shoot');
    }
  }

  fireMissile() {
    const missile = this.missiles.get(this.x, this.y - 30, 'missile');
    if (missile) {
      missile.setActive(true);
      missile.setVisible(true);
      missile.body.enable = true;
      missile.setVelocityY(-CONFIG.missileSpeed);

      // Play sound
      if (this.audio) this.audio.play('missile');
    }
  }

  dropOilSlick() {
    const slick = this.oilSlicks.get(this.x, this.y + 40, 'oilSlick');
    if (slick) {
      slick.setActive(true);
      slick.setVisible(true);
      slick.body.enable = true;
      slick.setVelocityY(this.currentSpeed); // Moves with road
      slick.lifespan = 5000; // 5 seconds

      this.scene.time.delayedCall(5000, () => {
        if (slick.active) {
          slick.setActive(false);
          slick.setVisible(false);
        }
      });
    }
  }

  activateSmokeScreen() {
    this.setInvulnerable(3000);
    this.smokeScreenActive = true;

    // Create dramatic smoke visual effect
    this.createSmokeEffect();

    // Play powerup sound
    if (this.audio) this.audio.play('powerup');

    // End smoke screen after duration
    this.scene.time.delayedCall(3000, () => {
      this.smokeScreenActive = false;
    });
  }

  createSmokeEffect() {
    // Initial burst of smoke puffs
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const distance = 20;
      const puffX = this.x + Math.cos(angle) * distance;
      const puffY = this.y + Math.sin(angle) * distance;

      this.createSmokePuff(puffX, puffY, 0);
    }

    // Continuous smoke emission while active
    this.smokeEmitter = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        if (!this.smokeScreenActive || !this.active) {
          this.smokeEmitter?.remove();
          return;
        }
        // Emit smoke puffs around the player
        const offsetX = Phaser.Math.Between(-25, 25);
        const offsetY = Phaser.Math.Between(-25, 25);
        this.createSmokePuff(this.x + offsetX, this.y + offsetY, 1);
      },
      loop: true
    });
  }

  createSmokePuff(x, y, type) {
    // Create a smoke puff graphic
    const puff = this.scene.add.graphics();
    const size = Phaser.Math.Between(15, 30);
    const gray = Phaser.Math.Between(0x666666, 0xcccccc);

    puff.fillStyle(gray, 0.6);
    puff.fillCircle(0, 0, size);
    puff.setPosition(x, y);
    puff.setDepth(9);

    // Animate the puff - expand and fade
    this.scene.tweens.add({
      targets: puff,
      scaleX: type === 0 ? 2.5 : 1.8,
      scaleY: type === 0 ? 2.5 : 1.8,
      alpha: 0,
      y: y - Phaser.Math.Between(20, 50),
      duration: type === 0 ? 800 : 600,
      ease: 'Power2',
      onComplete: () => puff.destroy()
    });
  }

  updateProjectiles() {
    // Remove off-screen projectiles
    this.bullets.children.each((bullet) => {
      if (bullet.active && bullet.y < -20) {
        bullet.setActive(false);
        bullet.setVisible(false);
        bullet.body.enable = false;
      }
    });

    this.missiles.children.each((missile) => {
      if (missile.active && missile.y < -20) {
        missile.setActive(false);
        missile.setVisible(false);
        missile.body.enable = false;
      }
    });
  }

  switchWeapon() {
    const weaponList = Object.values(WEAPONS);
    const currentIndex = weaponList.indexOf(this.currentWeapon);
    const nextIndex = (currentIndex + 1) % weaponList.length;
    this.currentWeapon = weaponList[nextIndex];

    const weapon = this.weapons[this.currentWeapon];
    this.scene.events.emit(EVENTS.WEAPON_UPDATE, this.currentWeapon, weapon.ammo);
  }

  takeDamage(amount) {
    if (this.isInvulnerable) return;

    this.health -= amount;
    this.scene.events.emit(EVENTS.HEALTH_UPDATE, this.health);

    // Flash effect
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 3
    });

    // Brief invulnerability after hit
    this.setInvulnerable(1000);

    if (this.health <= 0) {
      this.die();
    }
  }

  setInvulnerable(duration) {
    this.isInvulnerable = true;
    this.shield.setVisible(true);

    if (this.invulnerabilityTimer) {
      this.invulnerabilityTimer.remove();
    }

    this.invulnerabilityTimer = this.scene.time.delayedCall(duration, () => {
      this.isInvulnerable = false;
      this.shield.setVisible(false);
    });
  }

  updateShieldVisual() {
    if (this.shield.visible) {
      this.shield.clear();

      if (this.smokeScreenActive) {
        // Smoke screen visual - swirling gray/white circles
        const time = this.scene.time.now / 200;
        for (let i = 0; i < 3; i++) {
          const offset = (i * Math.PI * 2) / 3;
          const radius = 30 + Math.sin(time + offset) * 8;
          const alpha = 0.4 + Math.sin(time * 2 + offset) * 0.2;
          this.shield.lineStyle(3, 0xaaaaaa, alpha);
          this.shield.strokeCircle(this.x, this.y, radius);
        }
        // Inner glow
        this.shield.fillStyle(0xcccccc, 0.15);
        this.shield.fillCircle(this.x, this.y, 25);
      } else {
        // Regular invulnerability - cyan shield
        this.shield.lineStyle(2, 0x00ffff, 0.8);
        this.shield.strokeCircle(this.x, this.y, 35);
      }
    }
  }

  die() {
    this.lives--;
    this.scene.events.emit(EVENTS.LIVES_UPDATE, this.lives);

    // Explosion effect
    const explosion = this.scene.add.sprite(this.x, this.y, 'explosion_0');
    explosion.play('explode');
    explosion.once('animationcomplete', () => explosion.destroy());

    if (this.lives <= 0) {
      this.scene.events.emit(EVENTS.GAME_OVER, this.score);
    } else {
      // Respawn
      this.health = CONFIG.startingHealth;
      this.scene.events.emit(EVENTS.HEALTH_UPDATE, this.health);
      this.setPosition(CONFIG.width / 2, CONFIG.height - 100);
      this.setInvulnerable(2000);
    }
  }

  addAmmo(weaponType, amount) {
    if (this.weapons[weaponType]) {
      this.weapons[weaponType].ammo += amount;
      if (this.currentWeapon === weaponType) {
        this.scene.events.emit(EVENTS.WEAPON_UPDATE, weaponType, this.weapons[weaponType].ammo);
      }
    }
  }

  addScore(points) {
    this.score += points;
    this.scene.events.emit(EVENTS.SCORE_UPDATE, Math.floor(this.score));
  }

  heal(amount) {
    this.health = Math.min(this.health + amount, CONFIG.startingHealth);
    this.scene.events.emit(EVENTS.HEALTH_UPDATE, this.health);
  }

  addLife() {
    this.lives++;
    this.scene.events.emit(EVENTS.LIVES_UPDATE, this.lives);
  }

  destroy() {
    if (this.shield) this.shield.destroy();
    super.destroy();
  }
}
