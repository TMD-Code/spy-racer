import Phaser from 'phaser';
import { SCENES } from '../utils/constants.js';
import { CONFIG, COLORS } from '../config.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.BOOT });
  }

  preload() {
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      font: '20px monospace',
      fill: '#ffffff'
    }).setOrigin(0.5, 0.5);

    // Update progress bar
    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0x00ff00, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Load real sprite assets from Kenney packs
    this.loadSpriteAssets();
  }

  loadSpriteAssets() {
    // Track which assets we're loading for fallback generation
    this.assetsToLoad = [];

    // Vehicles
    this.loadWithFallback('player', 'assets/images/vehicles/player.png');
    this.loadWithFallback('enemy', 'assets/images/vehicles/enemy.png');
    this.loadWithFallback('civilian', 'assets/images/vehicles/civilian.png');
    this.loadWithFallback('civilian2', 'assets/images/vehicles/civilian2.png');
    this.loadWithFallback('motorcycle', 'assets/images/vehicles/motorcycle.png');
    this.loadWithFallback('helicopter', 'assets/images/vehicles/helicopter.png');
    this.loadWithFallback('weaponsVan', 'assets/Kenny assets/kenney_racing-pack/PNG/Cars/car_black_5.png');

    // Weapons
    this.loadWithFallback('bullet', 'assets/images/weapons/bullet.png');
    this.loadWithFallback('missile', 'assets/images/weapons/missile.png');
    this.loadWithFallback('oilSlick', 'assets/images/weapons/oilSlick.png');

    // Power-ups
    this.loadWithFallback('powerup', 'assets/images/powerups/powerup.png');
    this.loadWithFallback('shieldPowerup', 'assets/images/powerups/shield.png');
    this.loadWithFallback('lifePowerup', 'assets/images/powerups/life.png');
    this.loadWithFallback('speedPowerup', 'assets/images/powerups/speed.png');

    // Scenery
    this.loadWithFallback('tree_large', 'assets/Kenny assets/kenney_racing-pack/PNG/Objects/tree_large.png');
    this.loadWithFallback('tree_small', 'assets/Kenny assets/kenney_racing-pack/PNG/Objects/tree_small.png');
    this.loadWithFallback('rock1', 'assets/Kenny assets/kenney_racing-pack/PNG/Objects/rock1.png');
    this.loadWithFallback('rock2', 'assets/Kenny assets/kenney_racing-pack/PNG/Objects/rock2.png');
    this.loadWithFallback('rock3', 'assets/Kenny assets/kenney_racing-pack/PNG/Objects/rock3.png');

    // Handle load errors - generate fallback textures
    this.load.on('loaderror', (file) => {
      console.warn(`Failed to load asset: ${file.key}, generating fallback`);
      this.failedAssets = this.failedAssets || [];
      this.failedAssets.push(file.key);
    });
  }

  loadWithFallback(key, path) {
    this.assetsToLoad.push(key);
    this.load.image(key, path);
  }

  createFallbackTextures() {
    const failedAssets = this.failedAssets || [];

    failedAssets.forEach((key) => {
      console.log(`Generating fallback texture for: ${key}`);

      switch (key) {
        case 'player': {
          const player = this.make.graphics({ x: 0, y: 0, add: false });
          player.fillStyle(0x0066ff, 1);
          player.fillRect(8, 5, 24, 50);
          player.fillStyle(0x003399, 1);
          player.fillRect(12, 10, 16, 20);
          player.fillStyle(0x00ccff, 1);
          player.fillRect(14, 15, 12, 10);
          player.generateTexture('player', 40, 60);
          break;
        }
        case 'enemy': {
          const enemy = this.make.graphics({ x: 0, y: 0, add: false });
          enemy.fillStyle(0xff3333, 1);
          enemy.fillRect(8, 5, 24, 50);
          enemy.fillStyle(0x990000, 1);
          enemy.fillRect(12, 10, 16, 20);
          enemy.generateTexture('enemy', 40, 60);
          break;
        }
        case 'civilian':
        case 'civilian2': {
          const civilian = this.make.graphics({ x: 0, y: 0, add: false });
          civilian.fillStyle(0xf1c40f, 1);
          civilian.fillRect(8, 5, 24, 50);
          civilian.fillStyle(0xb8960b, 1);
          civilian.fillRect(12, 10, 16, 20);
          civilian.generateTexture(key, 40, 60);
          break;
        }
        case 'motorcycle': {
          const moto = this.make.graphics({ x: 0, y: 0, add: false });
          moto.fillStyle(0xff4444, 1);
          moto.fillRect(10, 5, 12, 40);
          moto.fillStyle(0x333333, 1);
          moto.fillCircle(16, 8, 6);
          moto.fillCircle(16, 42, 6);
          moto.generateTexture('motorcycle', 32, 50);
          break;
        }
        case 'helicopter': {
          const heli = this.make.graphics({ x: 0, y: 0, add: false });
          heli.fillStyle(0x444444, 1);
          heli.fillEllipse(30, 25, 40, 30);
          heli.fillStyle(0x666666, 1);
          heli.fillRect(10, 22, 40, 6);
          heli.fillStyle(0x333333, 1);
          heli.fillRect(5, 23, 50, 4);
          heli.generateTexture('helicopter', 60, 50);
          break;
        }
        case 'weaponsVan': {
          // Large friendly weapons van - blue/white color scheme
          const van = this.make.graphics({ x: 0, y: 0, add: false });
          // Van body (blue)
          van.fillStyle(0x2266cc, 1);
          van.fillRect(10, 5, 40, 90);
          // Van top (lighter blue)
          van.fillStyle(0x4488ee, 1);
          van.fillRect(15, 10, 30, 30);
          // Van rear door (where player enters) - green highlight
          van.fillStyle(0x00ff00, 1);
          van.fillRect(15, 75, 30, 15);
          // White stripe
          van.fillStyle(0xffffff, 1);
          van.fillRect(10, 45, 40, 5);
          // Wheels
          van.fillStyle(0x333333, 1);
          van.fillCircle(15, 20, 6);
          van.fillCircle(45, 20, 6);
          van.fillCircle(15, 80, 6);
          van.fillCircle(45, 80, 6);
          van.generateTexture('weaponsVan', 60, 100);
          break;
        }
        case 'bullet': {
          const bullet = this.make.graphics({ x: 0, y: 0, add: false });
          bullet.fillStyle(0xffff00, 1);
          bullet.fillRect(2, 0, 4, 12);
          bullet.generateTexture('bullet', 8, 12);
          break;
        }
        case 'missile': {
          const missile = this.make.graphics({ x: 0, y: 0, add: false });
          missile.fillStyle(0xff6600, 1);
          missile.fillRect(3, 0, 6, 20);
          missile.fillStyle(0xffff00, 1);
          missile.fillTriangle(6, 0, 0, 6, 12, 6);
          missile.generateTexture('missile', 12, 20);
          break;
        }
        case 'oilSlick': {
          const oil = this.make.graphics({ x: 0, y: 0, add: false });
          oil.fillStyle(0x222222, 0.8);
          oil.fillEllipse(20, 15, 40, 30);
          oil.generateTexture('oilSlick', 40, 30);
          break;
        }
        case 'powerup':
        case 'shieldPowerup':
        case 'lifePowerup':
        case 'speedPowerup': {
          const powerup = this.make.graphics({ x: 0, y: 0, add: false });
          const colors = {
            powerup: 0x00ff00,
            shieldPowerup: 0x00ffff,
            lifePowerup: 0xff0066,
            speedPowerup: 0xffff00
          };
          powerup.fillStyle(colors[key] || 0x00ff00, 1);
          powerup.fillCircle(15, 15, 15);
          powerup.fillStyle(0xffffff, 0.5);
          powerup.fillCircle(12, 10, 5);
          powerup.generateTexture(key, 30, 30);
          break;
        }
        default: {
          // Generic fallback - pink square (easy to spot missing assets)
          const fallback = this.make.graphics({ x: 0, y: 0, add: false });
          fallback.fillStyle(0xff00ff, 1);
          fallback.fillRect(0, 0, 32, 32);
          fallback.generateTexture(key, 32, 32);
          console.warn(`Unknown asset key: ${key}, using pink fallback`);
        }
      }
    });
  }

  create() {
    // Generate fallback textures for any assets that failed to load
    this.createFallbackTextures();

    // Generate graphics that we don't have real assets for
    this.createGeneratedGraphics();

    // Create explosion animation
    this.anims.create({
      key: 'explode',
      frames: [
        { key: 'explosion_0' },
        { key: 'explosion_1' },
        { key: 'explosion_2' },
        { key: 'explosion_3' }
      ],
      frameRate: 12,
      repeat: 0
    });

    // Generate sound effects
    this.createSoundEffects();

    // Go to menu
    this.scene.start(SCENES.MENU);
  }

  createGeneratedGraphics() {
    // Bomb
    const bomb = this.make.graphics({ x: 0, y: 0, add: false });
    bomb.fillStyle(0x333333, 1);
    bomb.fillEllipse(8, 10, 12, 16);
    bomb.fillStyle(0xff0000, 1);
    bomb.fillCircle(8, 4, 4);
    bomb.generateTexture('bomb', 16, 20);

    // Bomb shadow (target indicator)
    const bombShadow = this.make.graphics({ x: 0, y: 0, add: false });
    bombShadow.lineStyle(2, 0xff0000, 0.8);
    bombShadow.strokeCircle(15, 15, 12);
    bombShadow.lineBetween(15, 5, 15, 25);
    bombShadow.lineBetween(5, 15, 25, 15);
    bombShadow.generateTexture('bombShadow', 30, 30);

    // Explosion frames
    for (let i = 0; i < 4; i++) {
      const explosion = this.make.graphics({ x: 0, y: 0, add: false });
      const size = 20 + (i * 10);
      const alpha = 1 - (i * 0.2);
      explosion.fillStyle(0xff6600, alpha);
      explosion.fillCircle(30, 30, size);
      explosion.fillStyle(0xffff00, alpha);
      explosion.fillCircle(30, 30, size * 0.6);
      explosion.generateTexture(`explosion_${i}`, 60, 60);
    }

    // Hazard textures
    // Oil spill
    const oilSpill = this.make.graphics({ x: 0, y: 0, add: false });
    oilSpill.fillStyle(0x222222, 0.8);
    oilSpill.fillEllipse(30, 20, 60, 40);
    oilSpill.fillStyle(0x333333, 0.5);
    oilSpill.fillEllipse(25, 18, 40, 25);
    oilSpill.generateTexture('hazard_oil_spill', 60, 40);

    // Ice patch
    const icePatch = this.make.graphics({ x: 0, y: 0, add: false });
    icePatch.fillStyle(0xaaddff, 0.6);
    icePatch.fillEllipse(40, 25, 80, 50);
    icePatch.fillStyle(0xffffff, 0.4);
    icePatch.fillEllipse(35, 20, 50, 30);
    icePatch.generateTexture('hazard_ice_patch', 80, 50);

    // Pothole
    const pothole = this.make.graphics({ x: 0, y: 0, add: false });
    pothole.fillStyle(0x111111, 1);
    pothole.fillCircle(15, 15, 15);
    pothole.fillStyle(0x333333, 1);
    pothole.fillCircle(15, 15, 10);
    pothole.generateTexture('hazard_pothole', 30, 30);

    // Road tile
    const roadTile = this.make.graphics({ x: 0, y: 0, add: false });
    roadTile.fillStyle(COLORS.road, 1);
    roadTile.fillRect(0, 0, CONFIG.width, 100);
    // Lane markings
    roadTile.fillStyle(COLORS.roadLine, 1);
    for (let i = 1; i < CONFIG.lanes; i++) {
      const x = CONFIG.roadMargin + (i * CONFIG.laneWidth);
      roadTile.fillRect(x - 2, 10, 4, 30);
      roadTile.fillRect(x - 2, 60, 4, 30);
    }
    // Road edges
    roadTile.fillStyle(COLORS.roadEdge, 1);
    roadTile.fillRect(CONFIG.roadMargin - 5, 0, 5, 100);
    roadTile.fillRect(CONFIG.width - CONFIG.roadMargin, 0, 5, 100);
    // Grass
    roadTile.fillStyle(COLORS.grass, 1);
    roadTile.fillRect(0, 0, CONFIG.roadMargin - 5, 100);
    roadTile.fillRect(CONFIG.width - CONFIG.roadMargin + 5, 0, CONFIG.roadMargin - 5, 100);
    roadTile.generateTexture('road', CONFIG.width, 100);
  }

  createSoundEffects() {
    try {
      // Check if Web Audio API is available
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('Web Audio API not supported - audio disabled');
        this.game.registry.set('audioEnabled', false);
        this.game.registry.set('sounds', {});
        this.game.registry.set('audioContext', null);
        return;
      }

      // Create audio context
      const audioContext = new AudioContextClass();

      // Helper to create a sound buffer
      const createSound = (frequency, duration, type = 'square', volume = 0.3) => {
        try {
          const sampleRate = audioContext.sampleRate;
          const samples = duration * sampleRate;
          const buffer = audioContext.createBuffer(1, samples, sampleRate);
          const data = buffer.getChannelData(0);

          for (let i = 0; i < samples; i++) {
            const t = i / sampleRate;
            let sample = 0;

            if (type === 'square') {
              sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1;
            } else if (type === 'sine') {
              sample = Math.sin(2 * Math.PI * frequency * t);
            } else if (type === 'noise') {
              sample = Math.random() * 2 - 1;
            } else if (type === 'sawtooth') {
              sample = 2 * (t * frequency - Math.floor(0.5 + t * frequency));
            }

            // Apply envelope
            const envelope = Math.exp(-3 * t / duration);
            data[i] = sample * volume * envelope;
          }

          return buffer;
        } catch (e) {
          console.warn(`Failed to create sound buffer: ${e.message}`);
          return null;
        }
      };

      // Store sounds in the game registry
      this.game.registry.set('sounds', {
        shoot: createSound(800, 0.1, 'square', 0.2),
        missile: createSound(200, 0.3, 'sawtooth', 0.3),
        explosion: createSound(100, 0.4, 'noise', 0.4),
        hit: createSound(150, 0.15, 'noise', 0.3),
        powerup: createSound(600, 0.2, 'sine', 0.3),
        enemyHit: createSound(300, 0.1, 'square', 0.2)
      });

      this.game.registry.set('audioContext', audioContext);
      this.game.registry.set('audioEnabled', true);

    } catch (e) {
      console.warn('Failed to initialize audio system:', e.message);
      this.game.registry.set('audioEnabled', false);
      this.game.registry.set('sounds', {});
      this.game.registry.set('audioContext', null);
    }
  }
}
