import Phaser from 'phaser';
import { CONFIG, COLORS } from '../config.js';

export default class RoadManager {
  constructor(scene) {
    this.scene = scene;
    this.roadTiles = [];
    this.tileHeight = 100;
    this.scrollSpeed = CONFIG.roadSpeed;
    this.currentColors = {
      road: COLORS.road,
      grass: COLORS.grass,
      line: COLORS.roadLine
    };

    this.createRoad();
  }

  createRoad() {
    // Create enough tiles to cover the screen plus buffer
    const tilesNeeded = Math.ceil(CONFIG.height / this.tileHeight) + 2;

    for (let i = 0; i < tilesNeeded; i++) {
      const tile = this.scene.add.image(
        CONFIG.width / 2,
        CONFIG.height - (i * this.tileHeight) - this.tileHeight / 2,
        'road'
      );
      tile.setDepth(-1);
      this.roadTiles.push(tile);
    }
  }

  setColors(roadColor, grassColor, lineColor) {
    // Check if colors actually changed
    if (this.currentColors.road === roadColor &&
        this.currentColors.grass === grassColor &&
        this.currentColors.line === lineColor) {
      return;
    }

    this.currentColors = { road: roadColor, grass: grassColor, line: lineColor };

    // Regenerate the road texture with new colors
    this.regenerateRoadTexture(roadColor, grassColor, lineColor);
  }

  regenerateRoadTexture(roadColor, grassColor, lineColor) {
    // Remove old texture
    if (this.scene.textures.exists('road')) {
      this.scene.textures.remove('road');
    }

    // Create new road texture with level colors
    const roadTile = this.scene.make.graphics({ x: 0, y: 0, add: false });

    // Road surface
    roadTile.fillStyle(roadColor, 1);
    roadTile.fillRect(0, 0, CONFIG.width, 100);

    // Lane markings
    roadTile.fillStyle(lineColor, 1);
    for (let i = 1; i < CONFIG.lanes; i++) {
      const x = CONFIG.roadMargin + (i * CONFIG.laneWidth);
      roadTile.fillRect(x - 2, 10, 4, 30);
      roadTile.fillRect(x - 2, 60, 4, 30);
    }

    // Road edges (always red/white for visibility)
    roadTile.fillStyle(COLORS.roadEdge, 1);
    roadTile.fillRect(CONFIG.roadMargin - 5, 0, 5, 100);
    roadTile.fillRect(CONFIG.width - CONFIG.roadMargin, 0, 5, 100);

    // Grass
    roadTile.fillStyle(grassColor, 1);
    roadTile.fillRect(0, 0, CONFIG.roadMargin - 5, 100);
    roadTile.fillRect(CONFIG.width - CONFIG.roadMargin + 5, 0, CONFIG.roadMargin - 5, 100);

    roadTile.generateTexture('road', CONFIG.width, 100);
    roadTile.destroy();

    // Update all existing tiles to use the new texture
    this.roadTiles.forEach((tile) => {
      tile.setTexture('road');
    });
  }

  update(delta, playerSpeed) {
    // Use player's current speed for scrolling
    this.scrollSpeed = playerSpeed || CONFIG.roadSpeed;

    // Move all tiles down
    const movement = (this.scrollSpeed * delta) / 1000;

    this.roadTiles.forEach((tile) => {
      tile.y += movement;

      // If tile is off the bottom of the screen, move it to the top
      if (tile.y > CONFIG.height + this.tileHeight / 2) {
        // Find the topmost tile
        let minY = Infinity;
        this.roadTiles.forEach((t) => {
          if (t.y < minY) minY = t.y;
        });

        tile.y = minY - this.tileHeight;
      }
    });
  }

  setSpeed(speed) {
    this.scrollSpeed = speed;
  }

  getSpeed() {
    return this.scrollSpeed;
  }
}
