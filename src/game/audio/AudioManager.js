import { AUDIO_ASSETS } from './audioManifest.js';

const DEFAULT_VOLUMES = Object.freeze({
    master: 1.0,
    music: 0.25,
    ambient: 0.22,
    sfx: 0.60
});

class AudioManager
{
    constructor (scene)
    {
        this.scene = scene;
        this.volumes = { ...DEFAULT_VOLUMES };
        this.music = null;
        this.musicKey = null;
        this.loops = new Map();
        this.cooldowns = new Map();
        this.sceneStates = new WeakMap();
        this.sceneLoopOwners = new Map();
        this.unlocked = false;
    }

    bindScene (scene)
    {
        this.scene = scene;
        return this;
    }

    has (key)
    {
        return Boolean(this.scene?.cache?.audio?.exists?.(key));
    }

    unlock ()
    {
        const sound = this.scene?.sound;
        if (!sound) return;
        try {
            if (sound.locked && typeof sound.unlock === 'function') sound.unlock();
            const context = sound.context;
            if (context?.state === 'suspended' && typeof context.resume === 'function') {
                context.resume().catch(() => {});
            }
            this.unlocked = true;
        } catch (_) {
            // Browser autoplay policy may still require another gesture.
        }
    }

    categoryVolume (category, gain = 1)
    {
        return Math.max(0, Math.min(1,
            this.volumes.master *
            (this.volumes[category] ?? this.volumes.sfx) *
            gain
        ));
    }

    setVolume (category, value)
    {
        if (!(category in this.volumes)) return;
        this.volumes[category] = Math.max(0, Math.min(1, value));
        if (category === 'master' && this.scene?.sound) this.scene.sound.volume = this.volumes.master;
    }

    canPlay (key, cooldown = 0)
    {
        if (!this.has(key)) return false;
        const now = this.scene?.time?.now ?? 0;
        const until = this.cooldowns.get(key) ?? 0;
        if (now < until) return false;
        if (cooldown > 0) this.cooldowns.set(key, now + cooldown);
        return true;
    }

    playSfx (key, options = {})
    {
        if (!this.canPlay(key, options.cooldown ?? 0)) return null;
        const category = AUDIO_ASSETS[key]?.category ?? 'sfx';
        const volume = this.categoryVolume(category, options.volume ?? 1);
        try {
            return this.scene.sound.play(key, {
                volume,
                rate: options.rate ?? 1,
                detune: options.detune ?? 0,
                loop: false
            });
        } catch (_) {
            return null;
        }
    }

    distanceGain (sourceX, maxDistance = 720, minGain = 0.1)
    {
        const playerX = this.scene?.player?.x;
        if (!Number.isFinite(sourceX) || !Number.isFinite(playerX)) return 1;
        const distance = Math.abs(sourceX - playerX);
        return Math.max(minGain, Math.min(1, 1 - distance / maxDistance));
    }

    playAtDistance (key, sourceX, options = {})
    {
        const gain = this.distanceGain(sourceX, options.maxDistance ?? 720, options.minGain ?? 0.1);
        return this.playSfx(key, {
            ...options,
            volume: (options.volume ?? 1) * gain
        });
    }

    ensureLoop (id, key, options = {})
    {
        const existing = this.loops.get(id);
        if (existing?.sound?.isPlaying && existing.key === key) {
            existing.baseGain = options.volume ?? existing.baseGain ?? 1;
            return existing.sound;
        }
        this.stopLoop(id, options.fadeOut ?? 0);
        if (!this.has(key)) return null;

        const category = AUDIO_ASSETS[key]?.category ?? 'ambient';
        try {
            const sound = this.scene.sound.add(key, {
                loop: true,
                volume: 0
            });
            sound.play();
            const target = this.categoryVolume(category, options.volume ?? 1);
            sound.setVolume(target);
            this.loops.set(id, { key, sound, category, baseGain: options.volume ?? 1, owner: options.owner ?? null });
            if (options.owner) this.sceneLoopOwners.set(id, options.owner);
            return sound;
        } catch (_) {
            return null;
        }
    }

    setLoopVolume (id, gain)
    {
        const entry = this.loops.get(id);
        if (!entry?.sound) return;
        entry.baseGain = gain;
        entry.sound.setVolume(this.categoryVolume(entry.category, gain));
    }

    stopLoop (id)
    {
        const entry = this.loops.get(id);
        if (!entry) return;
        try {
            entry.sound?.stop?.();
            entry.sound?.destroy?.();
        } catch (_) {}
        this.loops.delete(id);
        this.sceneLoopOwners.delete(id);
    }

    playMusic (key, options = {})
    {
        if (this.musicKey === key && this.music?.isPlaying) return this.music;
        if (!this.has(key)) return null;

        if (this.music) {
            try {
                this.music.stop();
                this.music.destroy();
            } catch (_) {}
            this.music = null;
            this.musicKey = null;
        }

        try {
            this.music = this.scene.sound.add(key, {
                loop: options.loop !== false,
                volume: this.categoryVolume('music', options.volume ?? 1)
            });
            this.musicKey = key;
            this.music.play();
            return this.music;
        } catch (_) {
            this.music = null;
            this.musicKey = null;
            return null;
        }
    }

    startScene (scene, options = {})
    {
        this.bindScene(scene);
        this.unlock();
        if (options.music) this.playMusic(options.music, { volume: options.musicVolume ?? 1 });
        if (options.ambient) {
            this.ensureLoop('forest_ambient', options.ambient, {
                volume: options.ambientVolume ?? 1,
                owner: scene.sys?.settings?.key ?? 'scene'
            });
        }
    }

    updateScene (scene, context = {})
    {
        this.bindScene(scene);
        const time = context.time ?? scene.time?.now ?? 0;
        const grounded = context.grounded ?? Boolean(scene.player?.body?.blocked?.down || scene.player?.body?.touching?.down);
        const state = this.sceneStates.get(scene) ?? {
            grounded,
            jumpsUsed: scene.jumpsUsed ?? 0,
            dashing: Boolean(scene.isDashing),
            attacking: Boolean(scene.isAttacking),
            health: scene.health ?? 100,
            snakeHealth: scene.snakeHealth,
            carapanaHealth: scene.carapanaHealth,
            curupiraState: scene.curupiraState,
            curupiraHealth: scene.curupiraHealth,
            caboquimState: scene.caboclinhoState,
            caboquimHealth: scene.caboclinhoHealth,
            mapinguariState: scene.bossState,
            mapinguariProgress: scene.bossProgress,
            stepIndex: 0,
            nextStepAt: 0,
            lastFallSpeed: 0
        };

        const body = scene.player?.body;
        const velocityX = body?.velocity?.x ?? 0;
        const velocityY = body?.velocity?.y ?? 0;

        if (!grounded) state.lastFallSpeed = Math.max(state.lastFallSpeed, velocityY);
        if (grounded && !state.grounded && state.lastFallSpeed > 180) {
            this.playSfx('player_land', {
                cooldown: 160,
                volume: Math.min(1, 0.55 + state.lastFallSpeed / 950)
            });
            state.lastFallSpeed = 0;
        }

        const currentJumps = scene.jumpsUsed ?? 0;
        if (currentJumps > state.jumpsUsed) {
            this.playSfx(currentJumps > 1 ? 'player_double_jump' : 'player_jump', { cooldown: 100 });
        } else if (state.grounded && !grounded && velocityY < -120) {
            this.playSfx('player_jump', { cooldown: 100 });
        } else if (!state.grounded && grounded) {
            state.jumpsUsed = 0;
        }

        const dashing = Boolean(scene.isDashing);
        if (dashing && !state.dashing) this.playSfx('player_dash', { cooldown: 180 });

        const attacking = Boolean(scene.isAttacking);
        if (attacking && !state.attacking) this.playSfx('player_machete_swing', { cooldown: 160 });

        const health = scene.health ?? state.health;
        if (health < state.health) {
            this.playSfx(health <= 0 ? 'player_death' : 'player_hurt', {
                cooldown: health <= 0 ? 650 : 750,
                volume: health <= 0 ? 0.9 : 0.8
            });
        }

        const walking = grounded && !dashing && time >= (scene.knockbackUntil || 0) && Math.abs(velocityX) > 70;
        if (walking && time >= state.nextStepAt) {
            state.stepIndex = (state.stepIndex + 1) % 2;
            this.playSfx(state.stepIndex ? 'player_step_01' : 'player_step_02', {
                cooldown: 180,
                volume: scene.weatherSystem?.isRaining ? 0.46 : 0.56
            });
            state.nextStepAt = time + 240 + (state.stepIndex ? 25 : 0);
        }

        if (scene.snake?.active && scene.snakeVisual?.visible && Math.abs(scene.snake.x - scene.player.x) < 260) {
            this.playAtDistance('snake_hiss', scene.snake.x, { cooldown: 3200, volume: 0.72, maxDistance: 420 });
        }

        const carapanaAlive = scene.carapana?.active && scene.carapanaVisual?.visible && scene.carapana?.body?.enable !== false;
        if (carapanaAlive) {
            const gain = this.distanceGain(scene.carapana.x, 620, 0);
            if (gain > 0.04) {
                this.ensureLoop('carapana_buzz', 'carapana_buzz', { volume: 0.42 * gain, owner: scene.sys?.settings?.key });
                this.setLoopVolume('carapana_buzz', 0.42 * gain);
            } else {
                this.stopLoop('carapana_buzz');
            }
        } else {
            this.stopLoop('carapana_buzz');
        }

        if (Number.isFinite(scene.snakeHealth) && Number.isFinite(state.snakeHealth) && scene.snakeHealth < state.snakeHealth) {
            this.playSfx('player_machete_hit', { cooldown: 90, volume: 0.78 });
        }
        if (Number.isFinite(scene.carapanaHealth) && Number.isFinite(state.carapanaHealth) && scene.carapanaHealth < state.carapanaHealth) {
            this.playSfx('player_machete_hit', { cooldown: 90, volume: 0.68 });
        }

        const curupiraBossActive = scene.arenaStarted && !scene.arenaCleared;
        const caboquimBossActive = scene.caboclinhoTestActive && !scene.caboclinhoTestComplete;
        const mapinguariBossActive = scene.bossStarted && !scene.bossDefeated;
        const bossActive = curupiraBossActive || caboquimBossActive || mapinguariBossActive;
        if (bossActive) {
            this.playMusic('music_boss');
            this.setLoopVolume('forest_ambient', 0.46);
        } else {
            this.playMusic('music_forest');
            this.setLoopVolume('forest_ambient', scene.weatherSystem?.isRaining ? 0.45 : 1);
        }

        if (scene.curupiraState !== state.curupiraState) {
            if (scene.curupiraState === 'ATTACK') {
                const pattern = scene.curupiraAttackPattern;
                this.playSfx(pattern === 0 ? 'curupira_dash' : pattern === 3 ? 'curupira_whistle' : 'curupira_slam', { cooldown: 180 });
            }
            if (scene.curupiraState === 'DEFEATED') this.playSfx('curupira_defeat', { cooldown: 1000 });
        }
        if (Number.isFinite(scene.curupiraHealth) && Number.isFinite(state.curupiraHealth) && scene.curupiraHealth < state.curupiraHealth) {
            this.playSfx('player_machete_hit', { cooldown: 100 });
            this.playSfx('curupira_hit', { cooldown: 140 });
        }

        if (scene.caboclinhoState !== state.caboquimState) {
            if (scene.caboclinhoState === 'DASH' || scene.caboclinhoState === 'AIR_DASH') this.playSfx('caboquim_dash', { cooldown: 160 });
            if (scene.caboclinhoState === 'BOW_SHOT') this.playSfx('bow_release', { cooldown: 130 });
            if (scene.caboclinhoState === 'DEFEATED') this.playSfx('caboquim_defeat', { cooldown: 1000 });
        }
        if (Number.isFinite(scene.caboclinhoHealth) && Number.isFinite(state.caboquimHealth) && scene.caboclinhoHealth < state.caboquimHealth) {
            this.playSfx('player_machete_hit', { cooldown: 100 });
            this.playSfx('caboquim_hit', { cooldown: 140 });
        }

        if (scene.bossState !== state.mapinguariState) {
            const current = scene.bossState;
            if (/CHARGE/i.test(String(current))) this.playSfx('mapinguari_charge', { cooldown: 180 });
            if (/ATTACK|SLAM|TREE/i.test(String(current))) this.playSfx('mapinguari_impact', { cooldown: 220 });
            if (/DEFEATED/i.test(String(current))) this.playSfx('mapinguari_defeat', { cooldown: 1000 });
        }
        if (
            Number.isFinite(scene.bossProgress) &&
            Number.isFinite(state.mapinguariProgress) &&
            scene.bossProgress > state.mapinguariProgress
        ) {
            this.playSfx('player_machete_hit', { cooldown: 100 });
            this.playSfx('mapinguari_hit', { cooldown: 140 });
        }

        state.grounded = grounded;
        state.jumpsUsed = currentJumps;
        state.dashing = dashing;
        state.attacking = attacking;
        state.health = health;
        state.snakeHealth = scene.snakeHealth;
        state.carapanaHealth = scene.carapanaHealth;
        state.curupiraState = scene.curupiraState;
        state.curupiraHealth = scene.curupiraHealth;
        state.caboquimState = scene.caboclinhoState;
        state.caboquimHealth = scene.caboclinhoHealth;
        state.mapinguariState = scene.bossState;
        state.mapinguariProgress = scene.bossProgress;
        this.sceneStates.set(scene, state);
    }

    cleanupScene (scene)
    {
        const owner = scene?.sys?.settings?.key;
        for (const [id, entry] of [...this.loops.entries()]) {
            if (!owner || entry.owner === owner) this.stopLoop(id);
        }
        this.sceneStates.delete(scene);
        if (this.scene === scene) this.scene = null;
    }
}

export function getAudioManager (scene)
{
    const game = scene?.game;
    if (!game) return null;
    if (!game.__soldadosAudioManager) game.__soldadosAudioManager = new AudioManager(scene);
    return game.__soldadosAudioManager.bindScene(scene);
}

export { DEFAULT_VOLUMES };
