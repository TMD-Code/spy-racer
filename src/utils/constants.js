export const SCENES = {
  BOOT: 'BootScene',
  MENU: 'MenuScene',
  GAME: 'GameScene',
  HUD: 'HUDScene',
  GAME_OVER: 'GameOverScene'
};

export const WEAPONS = {
  MACHINE_GUN: 'machineGun',
  MISSILE: 'missile',
  OIL_SLICK: 'oilSlick',
  SMOKE_SCREEN: 'smokeScreen'
};

export const ENEMY_TYPES = {
  CIVILIAN: 'civilian',
  CHASER: 'chaser',
  MOTORCYCLE: 'motorcycle',
  HELICOPTER: 'helicopter',
  BOSS: 'boss',
  ARMORED: 'armored',       // Heavy, slow, takes more damage
  SHOOTER: 'shooter',       // Shoots at player
  BLOCKER: 'blocker'        // Tries to block player path
};

export const POWERUP_TYPES = {
  WEAPON_REFILL: 'weaponRefill',
  SHIELD: 'shield',
  SPEED_BOOST: 'speedBoost',
  EXTRA_LIFE: 'extraLife',
  SCORE_MULTIPLIER: 'scoreMultiplier'
};

export const EVENTS = {
  SCORE_UPDATE: 'scoreUpdate',
  HEALTH_UPDATE: 'healthUpdate',
  LIVES_UPDATE: 'livesUpdate',
  WEAPON_UPDATE: 'weaponUpdate',
  GAME_OVER: 'gameOver',
  LEVEL_COMPLETE: 'levelComplete'
};
