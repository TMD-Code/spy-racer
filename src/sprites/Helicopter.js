import Phaser from 'phaser';
import { CONFIG } from '../config.js';

export default class Helicopter extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    // Start helicopter at visible position near top of screen
    super(scene, x, 80, 'helicopter');

    this.health = 5;
    this.points = 300;
    this.baseY = 80; // Keep helicopter in this general area

    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Physics setup
    this.body.setSize(50, 40);
    this.setDepth(10); // Above other sprites
    this.setScale(4.0); // Make helicopter much bigger so it's clearly visible

    // Movement state
    this.targetX = x;
    this.moveTimer = 0;
    this.bombTimer = 0;
    this.bombCooldown = 3000; // Drop bombs every 3 seconds
    this.hoverOffset = 0;
    this.hoverDirection = 1;

    // Bombs group
    this.bombs = scene.physics.add.group();

    // Create label above helicopter
    this.label = scene.add.text(x, 40, 'HELICOPTER', {
      font: 'bold 12px monospace',
      fill: '#ff0000',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(11);

    // Shadow on the road below helicopter
    this.shadow = scene.add.ellipse(x, this.baseY + 120, 50, 25, 0x000000, 0.4);
    this.shadow.setDepth(0);

    // Entry animation - fly in from left or right
    const startX = Math.random() < 0.5 ? -50 : CONFIG.width + 50;
    this.setPosition(startX, 80);
    scene.tweens.add({
      targets: this,
      x: x,
      duration: 1500,
      ease: 'Power2'
    });
  }

  update(time, delta, roadSpeed, player) {
    if (!this.active) return;

    this.moveTimer += delta;
    this.bombTimer += delta;

    // Manual hover effect (bobbing up and down)
    this.hoverOffset += delta * 0.005 * this.hoverDirection;
    if (Math.abs(this.hoverOffset) > 8) {
      this.hoverDirection *= -1;
    }

    // Move horizontally to follow player loosely
    if (this.moveTimer > 2000) {
      this.moveTimer = 0;
      if (player && player.active) {
        // Move toward player but not exactly
        const offset = Phaser.Math.Between(-30, 30);
        this.targetX = Phaser.Math.Clamp(
          player.x + offset,
          CONFIG.roadMargin + 50,
          CONFIG.width - CONFIG.roadMargin - 50
        );
      }
    }

    // Smooth horizontal movement toward target
    const dx = this.targetX - this.x;
    if (Math.abs(dx) > 10) {
      this.setVelocityX(dx > 0 ? 60 : -60);
    } else {
      this.setVelocityX(0);
    }

    // Keep helicopter at top of screen with hover effect
    this.y = this.baseY + this.hoverOffset;
    this.setVelocityY(0);

    // Slowly drift down over time (very slow)
    this.baseY += delta * 0.01;

    // Update label position
    if (this.label && this.label.active) {
      this.label.setPosition(this.x, this.y - 35);
    }

    // Update shadow position (directly below helicopter)
    if (this.shadow && this.shadow.active) {
      this.shadow.setPosition(this.x, this.y + 120);
    }

    // Drop bombs at player
    if (this.bombTimer > this.bombCooldown && player && player.active) {
      this.bombTimer = 0;
      this.dropBomb(player);
    }

    // Update bombs
    this.bombs.children.each((bomb) => {
      if (bomb.active) {
        // Update bomb shadow position
        if (bomb.shadow) {
          bomb.shadow.setPosition(bomb.targetX, bomb.targetY);
          // Pulse the shadow as bomb gets closer
          const totalDist = bomb.targetY - bomb.startY;
          const traveled = bomb.y - bomb.startY;
          const progress = Math.min(1, traveled / totalDist);
          bomb.shadow.setScale(0.5 + progress * 0.5);
          bomb.shadow.setAlpha(0.3 + progress * 0.5);
        }

        // Check if bomb reached target
        if (bomb.y >= bomb.targetY) {
          this.explodeBomb(bomb);
        }
      }
    });

    // Remove if drifted too far down
    if (this.baseY > CONFIG.height * 0.4) {
      this.destroyCompletely();
    }
  }

  dropBomb(player) {
    // Create bomb
    const bomb = this.bombs.create(this.x, this.y + 20, 'bomb');
    bomb.setDepth(5);
    bomb.startY = this.y + 20;

    // Target where the player currently is
    bomb.targetX = player.x;
    bomb.targetY = player.y;

    // Create shadow/target indicator on the road
    bomb.shadow = this.scene.add.image(player.x, player.y, 'bombShadow');
    bomb.shadow.setDepth(1);
    bomb.shadow.setAlpha(0.3);
    bomb.shadow.setScale(0.5);

    // Bomb falls toward target (tighter timing for more challenge)
    const fallTime = 900; // 0.9 seconds to fall
    const dx = bomb.targetX - bomb.x;
    const dy = bomb.targetY - bomb.y;

    bomb.setVelocity(dx / (fallTime / 1000), dy / (fallTime / 1000));

    // Play warning sound
    if (this.scene.audio) {
      this.scene.audio.play('missile');
    }
  }

  explodeBomb(bomb) {
    // Create explosion at bomb location
    const explosion = this.scene.add.sprite(bomb.x, bomb.y, 'explosion_0');
    explosion.setDepth(6);
    explosion.play('explode');
    explosion.once('animationcomplete', () => explosion.destroy());

    // Play explosion sound
    if (this.scene.audio) {
      this.scene.audio.play('explosion');
    }

    // Check if player is in blast radius
    const player = this.scene.player;
    if (player && player.active) {
      const distance = Phaser.Math.Distance.Between(bomb.x, bomb.y, player.x, player.y);
      if (distance < 60) {
        // Player hit by bomb
        this.scene.flashDamage();
        player.takeDamage(35);
      }
    }

    // Clean up
    if (bomb.shadow) {
      bomb.shadow.destroy();
    }
    bomb.destroy();
  }

  takeDamage(amount) {
    this.health -= amount;

    // Flash effect
    this.scene.tweens.add({
      targets: this,
      tint: 0xffffff,
      duration: 50,
      yoyo: true
    });

    if (this.health <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  die() {
    // Big explosion
    const explosion = this.scene.add.sprite(this.x, this.y, 'explosion_0');
    explosion.setScale(1.5);
    explosion.setDepth(15);
    explosion.play('explode');
    explosion.once('animationcomplete', () => explosion.destroy());

    // Show score text
    const scoreText = this.scene.add.text(this.x, this.y, '+300', {
      font: 'bold 24px monospace',
      fill: '#00ff00',
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

    // Award points
    if (this.scene.player) {
      this.scene.player.addScore(this.points);
    }

    // Play sound
    if (this.scene.audio) {
      this.scene.audio.play('explosion');
    }

    this.destroyCompletely();
  }

  destroyCompletely() {
    // Clean up all bombs
    this.bombs.children.each((bomb) => {
      if (bomb.shadow) bomb.shadow.destroy();
    });
    this.bombs.clear(true, true);

    // Clean up label and shadow
    if (this.label) this.label.destroy();
    if (this.shadow) this.shadow.destroy();

    this.destroy();
  }
}
