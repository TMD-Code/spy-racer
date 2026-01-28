import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { ENEMY_TYPES } from '../utils/constants.js';

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type = ENEMY_TYPES.CIVILIAN) {
    const textureMap = {
      [ENEMY_TYPES.CIVILIAN]: 'civilian',
      [ENEMY_TYPES.CHASER]: 'enemy',
      [ENEMY_TYPES.MOTORCYCLE]: 'motorcycle',
      [ENEMY_TYPES.ARMORED]: 'enemy',
      [ENEMY_TYPES.SHOOTER]: 'enemy',
      [ENEMY_TYPES.BLOCKER]: 'enemy'
    };

    super(scene, x, y, textureMap[type] || 'enemy');

    this.enemyType = type;
    this.scene = scene;

    // Stats based on type
    const stats = this.getStatsForType(type);
    this.health = stats.health;
    this.points = stats.points;
    this.speed = stats.speed;
    this.canShoot = stats.canShoot;
    this.shootCooldown = stats.shootCooldown || 2000;
    this.shootTimer = 0;

    // Visual modifications based on type
    if (stats.scale) this.setScale(stats.scale);
    if (stats.tint) this.setTint(stats.tint);

    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Physics setup
    this.body.setSize(36 * (stats.scale || 1), 56 * (stats.scale || 1));

    // AI state
    this.aiState = 'driving';
    this.targetX = x;
    this.laneChangeTimer = 0;
    this.spinningOut = false;

    // Projectiles for shooters
    if (this.canShoot) {
      this.projectiles = scene.physics.add.group();
    }

    // Create label above enemy
    this.createLabel();
  }

  getStatsForType(type) {
    const stats = {
      [ENEMY_TYPES.CIVILIAN]: {
        health: 1,
        points: -CONFIG.civilianPenalty,
        speed: CONFIG.roadSpeed * 0.8,
        canShoot: false
      },
      [ENEMY_TYPES.CHASER]: {
        health: 2,
        points: CONFIG.enemyKillPoints,
        speed: CONFIG.roadSpeed * 1.2,
        canShoot: false
      },
      [ENEMY_TYPES.MOTORCYCLE]: {
        health: 1,
        points: CONFIG.enemyKillPoints,
        speed: CONFIG.roadSpeed * 1.4,
        canShoot: false
      },
      [ENEMY_TYPES.ARMORED]: {
        health: 5,
        points: CONFIG.enemyKillPoints * 2,
        speed: CONFIG.roadSpeed * 1.0,
        scale: 1.3,
        tint: 0x555555,
        canShoot: false
      },
      [ENEMY_TYPES.SHOOTER]: {
        health: 2,
        points: CONFIG.enemyKillPoints * 1.5,
        speed: CONFIG.roadSpeed * 0.9,
        tint: 0x990000,
        canShoot: true,
        shootCooldown: 2000
      },
      [ENEMY_TYPES.BLOCKER]: {
        health: 3,
        points: CONFIG.enemyKillPoints,
        speed: CONFIG.roadSpeed * 0.6,
        scale: 1.2,
        tint: 0x333399,
        canShoot: false
      }
    };
    return stats[type] || stats[ENEMY_TYPES.CHASER];
  }

  createLabel() {
    const labelConfig = {
      [ENEMY_TYPES.CIVILIAN]: { text: 'AVOID', color: '#f1c40f' },
      [ENEMY_TYPES.CHASER]: { text: 'ENEMY', color: '#ff4444' },
      [ENEMY_TYPES.MOTORCYCLE]: { text: 'ENEMY', color: '#ff4444' },
      [ENEMY_TYPES.ARMORED]: { text: 'ARMOR', color: '#888888' },
      [ENEMY_TYPES.SHOOTER]: { text: 'SNIPER', color: '#ff0000' },
      [ENEMY_TYPES.BLOCKER]: { text: 'BLOCK', color: '#4444ff' }
    };

    const config = labelConfig[this.enemyType] || labelConfig[ENEMY_TYPES.CHASER];

    this.label = this.scene.add.text(this.x, this.y - 45, config.text, {
      font: 'bold 10px monospace',
      fill: config.color,
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    this.label.setAlpha(0);
    this.scene.tweens.add({
      targets: this.label,
      alpha: 1,
      duration: 300
    });
  }

  update(time, delta, roadSpeed) {
    if (!this.active) return;

    // Move with road (relative speed)
    const relativeSpeed = roadSpeed - this.speed;
    this.setVelocityY(relativeSpeed);

    // Update label position
    if (this.label && this.label.active) {
      this.label.setPosition(this.x, this.y - 45);
    }

    // AI behavior based on type
    switch (this.enemyType) {
      case ENEMY_TYPES.CIVILIAN:
        this.civilianAI(delta);
        break;
      case ENEMY_TYPES.CHASER:
        this.chaserAI(delta);
        break;
      case ENEMY_TYPES.MOTORCYCLE:
        this.motorcycleAI(delta);
        break;
      case ENEMY_TYPES.ARMORED:
        this.armoredAI(delta);
        break;
      case ENEMY_TYPES.SHOOTER:
        this.shooterAI(delta, time);
        break;
      case ENEMY_TYPES.BLOCKER:
        this.blockerAI(delta);
        break;
    }

    // Update projectiles
    if (this.projectiles) {
      this.projectiles.children.each((proj) => {
        if (proj.active && proj.y > CONFIG.height + 50) {
          proj.destroy();
        }
      });
    }

    // Remove if off screen
    if (this.y > CONFIG.height + 100 || this.y < -100) {
      this.destroyWithLabel();
    }
  }

  civilianAI(delta) {
    this.setVelocityX(0);
    if (this.assignedLane !== undefined) {
      const targetX = CONFIG.roadMargin + (this.assignedLane * CONFIG.laneWidth) + CONFIG.laneWidth / 2;
      if (Math.abs(this.x - targetX) > 5) {
        const moveDir = this.x < targetX ? 1 : -1;
        this.setVelocityX(moveDir * 30);
      }
    }
  }

  chaserAI(delta) {
    const player = this.scene.player;
    if (!player || !player.active) {
      this.setVelocityX(0);
      return;
    }

    this.laneChangeTimer += delta;

    if (this.laneChangeTimer > 2000) {
      this.laneChangeTimer = 0;
      this.targetX = player.x;
    }

    const dx = this.targetX - this.x;
    const chaseSpeed = 60;

    if (Math.abs(dx) > 15) {
      this.setVelocityX(dx > 0 ? chaseSpeed : -chaseSpeed);
    } else {
      this.setVelocityX(0);
    }

    if (this.y > player.y + 100) {
      this.speed = CONFIG.roadSpeed * 1.3;
    } else if (this.y > player.y) {
      this.speed = CONFIG.roadSpeed * 1.1;
    } else {
      this.speed = CONFIG.roadSpeed * 0.7;
    }
  }

  motorcycleAI(delta) {
    this.laneChangeTimer += delta;

    if (this.laneChangeTimer > 1500) {
      this.laneChangeTimer = 0;
      const currentLane = Math.floor((this.x - CONFIG.roadMargin) / CONFIG.laneWidth);
      let newLane;

      if (currentLane <= 1) {
        newLane = currentLane + 1;
      } else if (currentLane >= CONFIG.lanes - 2) {
        newLane = currentLane - 1;
      } else {
        newLane = currentLane + (Math.random() < 0.5 ? -1 : 1);
      }

      this.targetX = CONFIG.roadMargin + (newLane * CONFIG.laneWidth) + CONFIG.laneWidth / 2;
    }

    if (Math.abs(this.x - this.targetX) > 5) {
      const moveDir = this.x < this.targetX ? 1 : -1;
      this.setVelocityX(moveDir * 80);
    } else {
      this.setVelocityX(0);
    }
  }

  armoredAI(delta) {
    // Armored cars drive straight and are hard to kill
    // They slowly chase the player but don't weave
    const player = this.scene.player;
    if (!player || !player.active) {
      this.setVelocityX(0);
      return;
    }

    this.laneChangeTimer += delta;

    // Very slow targeting - easy to avoid
    if (this.laneChangeTimer > 3000) {
      this.laneChangeTimer = 0;
      this.targetX = player.x;
    }

    const dx = this.targetX - this.x;
    if (Math.abs(dx) > 20) {
      this.setVelocityX(dx > 0 ? 40 : -40);
    } else {
      this.setVelocityX(0);
    }
  }

  shooterAI(delta, time) {
    const player = this.scene.player;
    if (!player || !player.active) {
      this.setVelocityX(0);
      return;
    }

    // Stay in lane, don't chase
    this.setVelocityX(0);

    // Shoot at player periodically
    this.shootTimer += delta;
    if (this.shootTimer >= this.shootCooldown) {
      this.shootTimer = 0;
      this.shootAtPlayer(player);
    }
  }

  shootAtPlayer(player) {
    if (!this.projectiles) return;

    const projectile = this.projectiles.create(this.x, this.y + 30, 'bullet');
    projectile.setTint(0xff0000);
    projectile.setDepth(5);

    // Shoot toward player
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const speed = 200;

    projectile.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );

    // Store reference for collision detection
    projectile.isEnemyProjectile = true;

    if (this.scene.audio) {
      this.scene.audio.play('shoot');
    }
  }

  blockerAI(delta) {
    const player = this.scene.player;
    if (!player || !player.active) {
      this.setVelocityX(0);
      return;
    }

    // Try to get ahead and block player's path
    this.laneChangeTimer += delta;

    if (this.laneChangeTimer > 1000) {
      this.laneChangeTimer = 0;
      // Move to player's lane
      this.targetX = player.x;
    }

    const dx = this.targetX - this.x;
    if (Math.abs(dx) > 10) {
      this.setVelocityX(dx > 0 ? 100 : -100);
    } else {
      this.setVelocityX(0);
    }

    // Stay ahead of player
    if (this.y > player.y - 150) {
      this.speed = CONFIG.roadSpeed * 0.4; // Very slow to stay ahead
    } else {
      this.speed = CONFIG.roadSpeed * 0.8;
    }
  }

  takeDamage(amount) {
    this.health -= amount;

    this.scene.tweens.add({
      targets: this,
      tint: 0xffffff,
      duration: 50,
      yoyo: true,
      onComplete: () => {
        // Restore original tint
        const stats = this.getStatsForType(this.enemyType);
        if (stats.tint) {
          this.setTint(stats.tint);
        } else {
          this.clearTint();
        }
      }
    });

    if (this.health <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  die() {
    const explosion = this.scene.add.sprite(this.x, this.y, 'explosion_0');
    explosion.play('explode');
    explosion.once('animationcomplete', () => explosion.destroy());

    this.showScoreText();

    if (this.scene.player) {
      this.scene.player.addScore(this.points);
    }

    this.destroyWithLabel();
  }

  showScoreText() {
    const isPositive = this.points > 0;
    const text = isPositive ? `+${this.points}` : `${this.points}`;
    const color = isPositive ? '#00ff00' : '#ff0000';

    const scoreText = this.scene.add.text(this.x, this.y, text, {
      font: 'bold 20px monospace',
      fill: color,
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(25);

    this.scene.tweens.add({
      targets: scoreText,
      y: this.y - 60,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => scoreText.destroy()
    });
  }

  getProjectiles() {
    return this.projectiles;
  }

  destroyWithLabel() {
    if (this.label) {
      this.label.destroy();
      this.label = null;
    }
    if (this.projectiles) {
      this.projectiles.clear(true, true);
    }
    this.destroy();
  }
}
