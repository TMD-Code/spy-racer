import Phaser from 'phaser';
import { CONFIG } from '../config.js';

/**
 * WeaponsVan - The iconic Spy Hunter weapons truck
 * Like the original: van pulls over, player enters, gets armed, van drives away
 */
export default class WeaponsVan extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'weaponsVan');

    this.scene = scene;

    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Van state
    this.state = 'approaching'; // approaching, pulling_over, stopped, arming, driving_away
    this.isOpen = false;
    this.playerInside = false;
    this.insideTimer = 0;
    this.maxInsideTime = 2500; // 2.5 seconds inside the van
    this.weaponsGiven = false;

    // Van moves slightly slower than road speed so player can catch up
    this.speed = CONFIG.roadSpeed * 0.8;

    // Pull over position (left side of road)
    this.pullOverX = CONFIG.roadMargin + 50;

    // Scale up to look like a van (larger than regular cars)
    this.setScale(1.5);

    // Physics setup - larger body for the van
    this.body.setSize(50, 90);
    this.setDepth(5);

    // Create "WEAPONS" label
    this.label = scene.add.text(x, y - 60, 'WEAPONS', {
      font: 'bold 12px monospace',
      fill: '#00ff00',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(6);

    // Create door indicator
    this.doorIndicator = scene.add.text(x, y + 50, '▼ ENTER ▼', {
      font: 'bold 10px monospace',
      fill: '#00ffff',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(6);

    // Blink the door indicator
    this.blinkTween = scene.tweens.add({
      targets: this.doorIndicator,
      alpha: 0.3,
      duration: 300,
      yoyo: true,
      repeat: -1
    });

    // Entry animation - van enters from top
    this.setY(-100);
    scene.tweens.add({
      targets: this,
      y: 150,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        this.isOpen = true;
      }
    });

    // Play arrival sound/warning
    this.showArrivalWarning();
  }

  showArrivalWarning() {
    const warning = this.scene.add.text(CONFIG.width / 2, 80, 'WEAPONS VAN APPROACHING!', {
      font: 'bold 18px monospace',
      fill: '#00ff00',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(50);

    this.scene.tweens.add({
      targets: warning,
      alpha: 0,
      y: 60,
      duration: 2500,
      onComplete: () => warning.destroy()
    });

    if (this.scene.audio) {
      this.scene.audio.play('powerup');
    }
  }

  update(time, delta, roadSpeed) {
    if (!this.active) return;

    // Update based on state
    switch (this.state) {
      case 'approaching':
        // Move with road (van is slower, so player catches up)
        const relativeSpeed = roadSpeed - this.speed;
        this.setVelocityY(relativeSpeed);
        this.setVelocityX(0);
        break;

      case 'pulling_over':
        // Van is pulling to the side - handled by tween
        this.setVelocityY(0);
        break;

      case 'stopped':
      case 'arming':
        // Van is stationary, move with road to stay in place relative to ground
        this.setVelocityY(roadSpeed);
        this.setVelocityX(0);

        // Handle arming timer
        if (this.playerInside) {
          this.insideTimer += delta;

          // Give weapons once
          if (!this.weaponsGiven) {
            this.giveWeapons();
            this.weaponsGiven = true;
          }

          // Update progress bar position
          if (this.progressBg) {
            this.progressBg.setPosition(this.x, this.y - 80);
          }
          if (this.progressBar) {
            this.progressBar.setPosition(this.x - 29, this.y - 80);
          }

          // Exit after time limit
          if (this.insideTimer >= this.maxInsideTime) {
            this.ejectPlayer();
          }
        }
        break;

      case 'driving_away':
        // Van drives away fast - handled by tween
        break;
    }

    // Update label position
    if (this.label && this.label.active) {
      this.label.setPosition(this.x, this.y - 60);
    }

    // Update door indicator position
    if (this.doorIndicator && this.doorIndicator.active) {
      this.doorIndicator.setPosition(this.x, this.y + 60);
      this.doorIndicator.setVisible(this.isOpen && !this.playerInside && this.state === 'approaching');
    }

    // Remove if off screen
    if (this.y > CONFIG.height + 150 || this.y < -200) {
      this.destroyCompletely();
    }
  }

  // Called when player overlaps with van from behind
  tryEnterVan(player) {
    if (!this.isOpen || this.playerInside || this.state !== 'approaching') return false;

    // Check if player is behind the van (approaching from below)
    if (player.y > this.y + 20) {
      this.playerEnters(player);
      return true;
    }

    return false;
  }

  playerEnters(player) {
    this.playerInside = true;
    this.isOpen = false;
    this.insideTimer = 0;
    this.state = 'pulling_over';

    // Make player invulnerable while inside
    player.isInvulnerable = true;

    // Store player's original speed
    this.playerOriginalSpeed = player.currentSpeed;

    // Slow down the player
    player.currentSpeed = CONFIG.roadSpeed * 0.3;

    // Hide player temporarily (they're "inside" the van)
    player.setAlpha(0.3);

    // Lock player position to van
    player.insideVan = this;

    // Update label
    this.label.setText('PULLING OVER...');
    this.label.setFill('#ffff00');

    // Hide door indicator
    if (this.doorIndicator) {
      this.doorIndicator.setVisible(false);
    }

    // Play sound
    if (this.scene.audio) {
      this.scene.audio.play('powerup');
    }

    // Pull over animation - van moves to the left side
    this.scene.tweens.add({
      targets: this,
      x: this.pullOverX,
      duration: 800,
      ease: 'Power2',
      onUpdate: () => {
        // Keep player aligned with van
        if (player.insideVan === this) {
          player.setX(this.x);
          player.setY(this.y + 50);
        }
      },
      onComplete: () => {
        this.state = 'stopped';
        this.startArming(player);
      }
    });
  }

  startArming(player) {
    this.state = 'arming';

    // Update label
    this.label.setText('ARMING...');
    this.label.setFill('#ffff00');

    // Show entering message
    this.scene.showFloatingText(this.x, this.y, 'ENTERING VAN', '#00ff00');

    // Create arming progress bar
    this.progressBg = this.scene.add.rectangle(this.x, this.y - 80, 60, 8, 0x333333).setDepth(10);
    this.progressBar = this.scene.add.rectangle(this.x - 29, this.y - 80, 0, 6, 0x00ff00).setOrigin(0, 0.5).setDepth(11);

    // Animate progress bar
    this.scene.tweens.add({
      targets: this.progressBar,
      width: 58,
      duration: this.maxInsideTime,
      ease: 'Linear'
    });
  }

  giveWeapons() {
    const player = this.scene.player;
    if (!player) return;

    const WEAPONS = {
      MACHINE_GUN: 'machineGun',
      MISSILE: 'missile',
      OIL_SLICK: 'oilSlick',
      SMOKE_SCREEN: 'smokeScreen'
    };

    // Refill all weapons
    player.weapons[WEAPONS.MISSILE].ammo = Math.min(player.weapons[WEAPONS.MISSILE].ammo + 5, 10);
    player.weapons[WEAPONS.OIL_SLICK].ammo = Math.min(player.weapons[WEAPONS.OIL_SLICK].ammo + 3, 6);
    player.weapons[WEAPONS.SMOKE_SCREEN].ammo = Math.min(player.weapons[WEAPONS.SMOKE_SCREEN].ammo + 2, 4);

    // Full health restore
    player.health = Math.min(player.health + 50, 100);

    // Update HUD
    this.scene.events.emit('healthUpdate', player.health);
    this.scene.events.emit('weaponUpdate', player.currentWeapon, player.weapons[player.currentWeapon].ammo);

    // Show weapons received message
    this.scene.showFloatingText(this.x, this.y - 30, '+MISSILES +OIL +SMOKE', '#00ff00');
    this.scene.showFloatingText(this.x, this.y - 10, '+50 HEALTH', '#00ffff');

    // Update label
    this.label.setText('ARMED!');
    this.label.setFill('#00ff00');
  }

  ejectPlayer() {
    const player = this.scene.player;
    if (!player) return;

    this.playerInside = false;
    this.state = 'driving_away';

    // Restore player visibility
    player.setAlpha(1);
    player.insideVan = null;

    // Restore player speed
    player.currentSpeed = this.playerOriginalSpeed || CONFIG.roadSpeed;

    // Give brief invulnerability after exiting
    player.setInvulnerable(2000);

    // Move player to the right of the van (back on road)
    player.setX(CONFIG.width / 2);
    player.setY(this.y + 80);

    // Clean up progress bar
    if (this.progressBg) this.progressBg.destroy();
    if (this.progressBar) this.progressBar.destroy();

    // Show exit message
    this.scene.showFloatingText(player.x, player.y, 'FULLY ARMED!', '#00ff00');

    // Play sound
    if (this.scene.audio) {
      this.scene.audio.play('powerup');
    }

    // Van drives off screen (forward/up)
    this.label.setText('');

    this.scene.tweens.add({
      targets: this,
      y: -200,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        this.destroyCompletely();
      }
    });
  }

  destroyCompletely() {
    if (this.blinkTween) this.blinkTween.stop();
    if (this.label) this.label.destroy();
    if (this.doorIndicator) this.doorIndicator.destroy();
    if (this.progressBg) this.progressBg.destroy();
    if (this.progressBar) this.progressBar.destroy();

    // Eject player if still inside
    if (this.playerInside && this.scene.player) {
      this.scene.player.setAlpha(1);
      this.scene.player.insideVan = null;
      this.scene.player.isInvulnerable = false;
    }

    this.destroy();
  }
}
