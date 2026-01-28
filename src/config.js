export const CONFIG = {
  // Game dimensions
  width: 480,
  height: 640,

  // Road settings
  roadSpeed: 200,
  lanes: 5,
  laneWidth: 80,
  roadMargin: 40,

  // Player settings
  playerSpeed: 300,
  playerAcceleration: 150,
  playerDeceleration: 100,
  playerMaxSpeed: 400,
  playerMinSpeed: 100,

  // Weapons
  machineGunFireRate: 150,
  missileFireRate: 500,
  bulletSpeed: 500,
  missileSpeed: 350,

  // Enemies (Spy Hunter style - sparse traffic, wave-based)
  enemySpawnRate: 5000,      // 5 seconds between enemies
  civilianSpawnRate: 4000,   // 4 seconds between civilians
  maxVehiclesOnScreen: 4,    // Maximum traffic at once
  minSpawnDistance: 150,     // Minimum Y distance between spawns

  // Scoring
  enemyKillPoints: 100,
  distancePoints: 10,
  civilianPenalty: 50,

  // Lives
  startingLives: 3,
  startingHealth: 100
};

export const COLORS = {
  road: 0x333333,
  roadLine: 0xffff00,
  roadEdge: 0xff0000,
  grass: 0x2d5a27
};

export const KEYS = {
  up: ['W', 'UP'],
  down: ['S', 'DOWN'],
  left: ['A', 'LEFT'],
  right: ['D', 'RIGHT'],
  fire: ['SPACE'],
  switchWeapon: ['SHIFT']
};
