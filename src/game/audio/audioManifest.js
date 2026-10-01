export const AUDIO_ASSETS = {
    music_forest: { category: 'music', path: 'audio/music/music_forest.ogg', license: 'CC0-1.0', gain: 1 },
    music_boss: { category: 'music', path: 'audio/music/music_boss.ogg', license: 'CC0-1.0', gain: 0.92 },
    music_final: { category: 'music', path: null, license: null },

    forest_ambient: { category: 'ambient', path: 'audio/ambient/forest_ambient.mp3', license: 'CC0-1.0', gain: 1 },
    rain_loop: { category: 'ambient', path: 'audio/weather/rain_loop.ogg', license: 'CC0-1.0', gain: 2.0 },
    thunder_01: { category: 'sfx', path: 'audio/weather/thunder_01.ogg', license: 'CC0-1.0', gain: 0.9 },
    thunder_02: { category: 'sfx', path: 'audio/weather/thunder_02.ogg', license: 'CC0-1.0', gain: 0.82, detune: -160 },

    player_step_01: { category: 'sfx', path: 'audio/player/player_step_01_v2.ogg', license: 'CC0-1.0', gain: 0.94 },
    player_step_02: { category: 'sfx', path: 'audio/player/player_step_02_v2.ogg', license: 'CC0-1.0', gain: 0.94 },
    player_step_03: { category: 'sfx', path: 'audio/player/player_step_03_v2.ogg', license: 'CC0-1.0', gain: 0.94 },
    player_step_04: { category: 'sfx', path: 'audio/player/player_step_04_v2.ogg', license: 'CC0-1.0', gain: 0.94 },
    player_jump: { category: 'sfx', path: 'audio/player/player_jump_v4.ogg', license: 'CC0-1.0', gain: 0.95, rate: 1.0 },
    player_double_jump: { category: 'sfx', path: 'audio/player/player_jump_v4.ogg', license: 'CC0-1.0', gain: 0.95, rate: 1.0 },
    player_land: { category: 'sfx', path: 'audio/player/player_step_02.ogg', license: 'CC0-1.0', gain: 0.82, rate: 0.88 },
    player_dash: { category: 'sfx', path: 'audio/player/air_02.ogg', license: 'CC0-1.0', gain: 0.82, rate: 0.92 },
    player_machete_swing: { category: 'sfx', path: 'audio/player/blade_01.ogg', license: 'CC0-1.0', gain: 0.82 },
    player_machete_hit: { category: 'sfx', path: 'audio/player/blade_02.ogg', license: 'CC0-1.0', gain: 0.88 },
    player_hurt: { category: 'sfx', path: 'audio/player/player_hurt.ogg', license: 'CC0-1.0', gain: 0.82 },
    player_death: { category: 'sfx', path: 'audio/player/player_death.ogg', license: 'CC0-1.0', gain: 0.9 },

    fruit_bite: { category: 'sfx', path: 'audio/items/fruit_bite.ogg', license: 'CC0-1.0', gain: 0.76, rate: 1.0 },

    snake_hiss: { category: 'sfx', path: 'audio/enemies/snake_hiss.ogg', license: 'CC0-1.0', gain: 0.82, rate: 1.22 },
    carapana_buzz: { category: 'sfx', path: 'audio/enemies/carapana_buzz.ogg', license: 'CC0-1.0', gain: 0.70, rate: 1.22 },
    monkey_call: { category: 'sfx', path: 'audio/enemies/monkey_call.ogg', license: 'CC0-1.0', gain: 0.90, rate: 1.08 },
    monkey_throw: { category: 'sfx', path: 'audio/enemies/monkey_call.ogg', license: 'CC0-1.0', gain: 0.42, rate: 1.26 },
    rock_throw: { category: 'sfx', path: 'audio/player/air_01.ogg', license: 'CC0-1.0', gain: 0.5, rate: 1.28 },
    rock_impact: { category: 'sfx', path: 'audio/enemies/stone_01.ogg', license: 'CC0-1.0', gain: 0.72 },
    jaguar_growl: { category: 'sfx', path: 'audio/enemies/jaguar_growl.ogg', license: 'CC0-1.0', gain: 0.86, rate: 0.82 },
    jaguar_charge: { category: 'sfx', path: 'audio/player/air_02.ogg', license: 'CC0-1.0', gain: 0.8, rate: 0.76 },

    curupira_whistle: { category: 'sfx', path: 'audio/bosses/spell_01.ogg', license: 'CC0-1.0', gain: 0.78, rate: 1.2 },
    curupira_dash: { category: 'sfx', path: 'audio/player/air_02.ogg', license: 'CC0-1.0', gain: 0.78, rate: 1.02 },
    curupira_slam: { category: 'sfx', path: 'audio/enemies/stone_01.ogg', license: 'CC0-1.0', gain: 0.9, rate: 0.72 },
    curupira_hit: { category: 'sfx', path: 'audio/bosses/creature_hurt_01.ogg', license: 'CC0-1.0', gain: 0.72 },
    curupira_defeat: { category: 'sfx', path: 'audio/bosses/creature_roar_01.ogg', license: 'CC0-1.0', gain: 0.75, rate: 0.82 },

    caboquim_dash: { category: 'sfx', path: 'audio/player/air_01.ogg', license: 'CC0-1.0', gain: 0.72, rate: 1.15 },
    bow_release: { category: 'sfx', path: 'audio/player/air_01.ogg', license: 'CC0-1.0', gain: 0.64, rate: 1.35 },
    arrow_impact: { category: 'sfx', path: 'audio/enemies/stone_01.ogg', license: 'CC0-1.0', gain: 0.62, rate: 1.1 },
    caboquim_hit: { category: 'sfx', path: 'audio/bosses/creature_hurt_01.ogg', license: 'CC0-1.0', gain: 0.66, rate: 1.15 },
    caboquim_defeat: { category: 'sfx', path: 'audio/bosses/creature_roar_01.ogg', license: 'CC0-1.0', gain: 0.64, rate: 1.1 },

    mapinguari_roar: { category: 'sfx', path: 'audio/bosses/mapinguari_roar.ogg', license: 'CC0-1.0', gain: 1, rate: 0.72 },
    mapinguari_charge: { category: 'sfx', path: 'audio/bosses/creature_roar_01.ogg', license: 'CC0-1.0', gain: 0.88, rate: 0.68 },
    mapinguari_impact: { category: 'sfx', path: 'audio/enemies/stone_01.ogg', license: 'CC0-1.0', gain: 1, rate: 0.58 },
    mapinguari_hit: { category: 'sfx', path: 'audio/bosses/creature_hurt_01.ogg', license: 'CC0-1.0', gain: 0.82, rate: 0.76 },
    mapinguari_defeat: { category: 'sfx', path: 'audio/bosses/mapinguari_roar.ogg', license: 'CC0-1.0', gain: 0.94, rate: 0.62 }
};

export const AUDIO_KEYS = Object.freeze(Object.keys(AUDIO_ASSETS));
