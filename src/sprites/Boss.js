import Phaser from 'phaser';
import { CONFIG } from '../config.js';

// Boss types for different levels
export const BOSS_TYPES = {
  ARMORED_TRUCK: 'armored_truck',    // Level 2 boss - tough, rams player
  WEAPON_VAN: 'weapon_van',          // Level 3 boss - shoots back
  TANK: 'tank',                      // Level 4 boss - very tough, slow
  SUPER_HELICOPTER: 'super_heli'     // Level 5 boss - final boss
};

export default class Boss extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type = BOSS_TYPES.ARMORED_TRUCK) {
    super(scene, x, y, 'enemy'); // Use enemy sprite, we'll tint it

    this.bossType = type;
    this.scene = scene;

    // Boss stats based on type
    const stats = this.getStatsForType(type);
    this.maxHealth = stats.health;
    this.health = stats.health;
    this.points = stats.points;
    this.speed = stats.speed;
    this.damage = stats.damage;
    this.canShoot = stats.canShoot;

    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Make boss bigger and distinctive
    this.setScale(stats.scale);
    this.setTint(stats.tint);
    this.body.setSize(40 * stats.scale, 60 * stats.scale);
    this.setDepth(8);

    // AI state
    this.attackTimer = 0;
    this.attackCooldown = stats.attackCooldown;
    this.moveTimer = 0;
    this.targetX = x;
    this.phase = 1; // Boss phases for harder behavior

    // Projectiles for bosses that shoot
    if (this.canShoot) {
      this.projectiles = scene.physics.add.group();
    }

    // Create health bar
    this.createHealthBar();

    // Create boss label
    this.label = scene.add.text(x, y - 60, stats.name, {
      font: 'bold 14px monospace',
      fill: '#ff0000',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(20);

    // Entry animation
    this.setPosition(x, -100);
    scene.tweens.add({
      targets: this,
      y: 120,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        this.entryComplete = true;
      }
    });

    // Boss warning
    this.showBossWarning();
  }

  getStatsForType(type) {
    const stats = {
      [BOSS_TYPES.ARMORED_TRUCK]: {
        name: 'ARMORED TRUCK',
        health: 12,              // Reduced from 15
        points: 500,
        speed: CONFIG.roadSpeed * 0.9,
        damage: 25,              // Reduced from 30
        scale: 1.5,
        tint: 0x444444,
        canShoot: false,
        attackCooldown: 2000
      },
      [BOSS_TYPES.WEAPON_VAN]: {
        name: 'WEAPON VAN',
        health: 10,              // Reduced from 12
        points: 750,
        speed: CONFIG.roadSpeed * 0.85,
        damage: 20,              // Reduced from 25
        scale: 1.4,
        tint: 0x880000,
        canShoot: true,
        attackCooldown: 1800     // Slightly slower attack
      },
      [BOSS_TYPES.TANK]: {
        name: 'BATTLE TANK',
        health: 18,              // Reduced from 25
        points: 1000,
        speed: CONFIG.roadSpeed * 0.7,
        damage: 35,              // Reduced from 40
        scale: 1.8,
        tint: 0x336633,
        canShoot: true,
        attackCooldown: 2500
      },
      [BOSS_TYPES.SUPER_HELICOPTER]: {
        name: 'ATTACK CHOPPER',
        health: 15,              // Reduced from 20
        points: 1500,
        speed: CONFIG.roadSpeed * 0.5,
        damage: 30,              // Reduced from 35
        scale: 1.6,
        tint: 0x333366,
        canShoot: true,
        attackCooldown: 1200     // Slightly slower attack
      }
    };
    return stats[type] || stats[BOSS_TYPES.ARMORED_TRUCK];
  }

  createHealthBar() {
    // Health bar background
    this.healthBarBg = this.scene.add.rectangle(
      CONFIG.width / 2, 50, 200, 16, 0x333333
    ).setDepth(30);

    // Health bar fill
    this.healthBarFill = this.scene.add.rectangle(
      CONFIG.width / 2, 50, 196, 12, 0xff0000
    ).setDepth(31);

    // Health bar text
    this.healthBarText = this.scene.add.text(
      CONFIG.width / 2, 50, 'BOSS', {
        font: 'bold 10px monospace',
        fill: '#ffffff'
      }
    ).setOrigin(0.5).setDepth(32);
  }

  showBossWarning() {
    const warning = this.scene.add.text(
      CONFIG.width / 2, CONFIG.height / 2, 'WARNING!\nBOSS APPROACHING', {
        font: 'bold 28px monospace',
        fill: '#ff0000',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center'
      }
    ).setOrigin(0.5).setDepth(50);

    // Flash effect
    this.scene.tweens.add({
      targets: warning,
      alpha: 0.3,
      duration: 200,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        this.scene.tweens.add({
          targets: warning,
          alpha: 0,
          y: CONFIG.height / 2 - 50,
          duration: 500,
          onComplete: () => warning.destroy()
        });
      }
    });

    // Play warning sound
    if (this.scene.audio) {
      this.scene.audio.play('missile');
    }
  }

  update(time, delta, roadSpeed) {
    if (!this.active || !this.entryComplete) return;

    this.moveTimer += delta;
    this.attackTimer += delta;

    // Update label position
    if (this.label && this.label.active) {
      this.label.setPosition(this.x, this.y - 60);
    }

    // Update health bar
    this.updateHealthBar();

    // Boss AI based on type
    this.runBossAI(delta, roadSpeed);

    // Update projectiles
    if (this.projectiles) {
      this.projectiles.children.each((proj) => {
        if (proj.active && proj.y > CONFIG.height + 50) {
          proj.destroy();
        }
      });
    }

    // Check phase changes based on health
    this.updatePhase();
  }

  runBossAI(delta, roadSpeed) {
    const player = this.scene.player;
    if (!player || !player.active) return;

    // Move with road (stays on screen)
    const relativeSpeed = roadSpeed - this.speed;
    this.setVelocityY(relativeSpeed);

    // Keep boss on screen
    if (this.y < 80) {
      this.y = 80;
      this.setVelocityY(0);
    }
    if (this.y > CONFIG.height * 0.4) {
      this.y = CONFIG.height * 0.4;
    }

    // Horizontal movement - track player loosely
    if (this.moveTimer > 1000) {
      this.moveTimer = 0;
      this.targetX = player.x + Phaser.Math.Between(-30, 30);
      this.targetX = Phaser.Math.Clamp(
        this.targetX,
        CONFIG.roadMargin + 40,
        CONFIG.width - CONFIG.roadMargin - 40
      );
    }

    const dx = this.targetX - this.x;
    const moveSpeed = 50 + (this.phase * 20); // Faster in later phases
    if (Math.abs(dx) > 10) {
      this.setVelocityX(dx > 0 ? moveSpeed : -moveSpeed);
    } else {
      this.setVelocityX(0);
    }

    // Attack based on boss type
    if (this.attackTimer > this.attackCooldown / this.phase) {
      this.attackTimer = 0;
      this.attack(player);
    }
  }

  attack(player) {
    if (this.canShoot) {
      // Shoot at player
      this.shootAtPlayer(player);
    }

    // All bosses can ram - speed boost toward player periodically
    if (this.phase >= 2 && Math.random() < 0.3) {
      this.ramAttack(player);
    }
  }

  shootAtPlayer(player) {
    const projectile = this.projectiles.create(this.x, this.y + 40, 'bullet');
    projectile.setTint(0xff0000);
    projectile.setScale(1.5);
    projectile.setDepth(5);

    // Calculate direction to player
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const speed = 250 + (this.phase * 50);

    projectile.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );

    // Play sound
    if (this.scene.audio) {
      this.scene.audio.play('shoot');
    }
  }

  ramAttack(player) {
    // Quick dash toward player
    this.scene.tweens.add({
      targets: this,
      y: this.y + 80,
      duration: 300,
      yoyo: true,
      ease: 'Power2'
    });
  }

  updatePhase() {
    const healthPercent = this.health / this.maxHealth;

    if (healthPercent <= 0.3 && this.phase < 3) {
      this.phase = 3;
      this.setTint(0xff0000); // Enraged
      this.showPhaseChange('ENRAGED!');
    } else if (healthPercent <= 0.6 && this.phase < 2) {
      this.phase = 2;
      this.setTint(0xff6600); // Damaged
      this.showPhaseChange('PHASE 2');
    }
  }

  showPhaseChange(text) {
    const phaseText = this.scene.add.text(this.x, this.y - 80, text, {
      font: 'bold 16px monospace',
      fill: '#ffff00',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(25);

    this.scene.tweens.add({
      targets: phaseText,
      y: this.y - 120,
      alpha: 0,
      duration: 1000,
      onComplete: () => phaseText.destroy()
    });
  }

  updateHealthBar() {
    const healthPercent = this.health / this.maxHealth;
    this.healthBarFill.setScale(healthPercent, 1);

    // Color based on health
    if (healthPercent > 0.6) {
      this.healthBarFill.setFillStyle(0x00ff00);
    } else if (healthPercent > 0.3) {
      this.healthBarFill.setFillStyle(0xffff00);
    } else {
      this.healthBarFill.setFillStyle(0xff0000);
    }
  }

  takeDamage(amount) {
    this.health -= amount;

    // Flash white
    this.scene.tweens.add({
      targets: this,
      alpha: 0.5,
      duration: 50,
      yoyo: true
    });

    // Screen shake
    this.scene.cameras.main.shake(100, 0.005);

    // Play hit sound
    if (this.scene.audio) {
      this.scene.audio.play('enemyHit');
    }

    if (this.health <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  die() {
    // Epic explosion sequence
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 200, () => {
        if (!this.scene) return;
        const offsetX = Phaser.Math.Between(-30, 30);
        const offsetY = Phaser.Math.Between(-30, 30);
        const explosion = this.scene.add.sprite(
          this.x + offsetX, this.y + offsetY, 'explosion_0'
        );
        explosion.setScale(1.5);
        explosion.setDepth(15);
        explosion.play('explode');
        explosion.once('animationcomplete', () => explosion.destroy());

        if (this.scene.audio) {
          this.scene.audio.play('explosion');
        }
      });
    }

    // Big screen shake
    this.scene.cameras.main.shake(500, 0.02);

    // Show big score
    const scoreText = this.scene.add.text(this.x, this.y, `+${this.points}`, {
      font: 'bold 32px monospace',
      fill: '#00ff00',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(30);

    this.scene.tweens.add({
      targets: scoreText,
      y: this.y - 100,
      alpha: 0,
      scale: 1.5,
      duration: 1500,
      onComplete: () => scoreText.destroy()
    });

    // Award points
    if (this.scene.player) {
      this.scene.player.addScore(this.points);
    }

    // Show victory message
    this.scene.time.delayedCall(500, () => {
      const victory = this.scene.add.text(
        CONFIG.width / 2, CONFIG.height / 2, 'BOSS DEFEATED!', {
          font: 'bold 28px monospace',
          fill: '#00ff00',
          stroke: '#000000',
          strokeThickness: 4
        }
      ).setOrigin(0.5).setDepth(50);

      this.scene.tweens.add({
        targets: victory,
        scale: 1.2,
        duration: 500,
        yoyo: true,
        repeat: 2,
        onComplete: () => {
          this.scene.tweens.add({
            targets: victory,
            alpha: 0,
            duration: 500,
            onComplete: () => victory.destroy()
          });
        }
      });
    });

    // Notify scene that boss is defeated
    this.scene.events.emit('bossDefeated');

    this.destroyCompletely();
  }

  destroyCompletely() {
    if (this.healthBarBg) this.healthBarBg.destroy();
    if (this.healthBarFill) this.healthBarFill.destroy();
    if (this.healthBarText) this.healthBarText.destroy();
    if (this.label) this.label.destroy();
    if (this.projectiles) this.projectiles.clear(true, true);
    this.destroy();
  }

  getProjectiles() {
    return this.projectiles;
  }
}
