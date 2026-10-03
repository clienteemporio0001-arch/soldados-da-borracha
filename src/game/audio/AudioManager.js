import { AUDIO_ASSETS } from './audioManifest.js';

const DEFAULT_VOLUMES = Object.freeze({
    master: 1.0,
    music: 0.16,
    ambient: 0.20,
    sfx: 0.72
});

const AUDIO_SETTINGS_KEY = 'soldadoDaBorrachaAudioSettings';

class AudioManager
{
    constructor (scene)
    {
        this.scene = scene;
        this.volumes = { ...DEFAULT_VOLUMES };
        this.userMix = { music: 0.45, sounds: 1 };
        this.loadUserMix();
        this.music = null;
        this.musicKey = null;
        this.musicBaseGain = 1;
        this.loops = new Map();
        this.cooldowns = new Map();
        this.sceneStates = new WeakMap();
        this.sceneLoopOwners = new Map();
        this.soundTweens = new WeakMap();
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
        if (!sound) return false;

        try {
            if (sound.locked && typeof sound.unlock === 'function') sound.unlock();

            const context = sound.context;
            if (context?.state === 'suspended' && typeof context.resume === 'function') {
                const resumeResult = context.resume();
                if (resumeResult?.then) {
                    resumeResult
                        .then(() => {
                            this.unlocked = context.state === 'running';
                        })
                        .catch((error) => {
                            this.unlocked = false;
                            console.warn('[AudioManager] AudioContext resume failed:', error);
                        });
                }
            }

            this.unlocked = !context || context.state === 'running';
            return this.unlocked;
        } catch (error) {
            this.unlocked = false;
            console.warn('[AudioManager] Audio unlock failed:', error);
            return false;
        }
    }

    loadUserMix ()
    {
        try {
            const raw = globalThis?.localStorage?.getItem?.(AUDIO_SETTINGS_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw);
            if (Number.isFinite(saved?.music)) this.userMix.music = Math.max(0, Math.min(1, saved.music));
            if (Number.isFinite(saved?.sounds)) this.userMix.sounds = Math.max(0, Math.min(1, saved.sounds));
        } catch (_) {
            this.userMix = { music: 0.45, sounds: 1 };
        }
    }

    saveUserMix ()
    {
        try {
            globalThis?.localStorage?.setItem?.(AUDIO_SETTINGS_KEY, JSON.stringify(this.userMix));
        } catch (_) {
            // localStorage may be unavailable in some browser modes.
        }
    }

    categoryVolume (category, gain = 1)
    {
        const userLevel = category === 'music'
            ? this.userMix.music
            : (category === 'sfx' || category === 'ambient' ? this.userMix.sounds : 1);

        return Math.max(0, Math.min(1,
            this.volumes.master *
            (this.volumes[category] ?? this.volumes.sfx) *
            userLevel *
            gain
        ));
    }

    setVolume (category, value)
    {
        if (!(category in this.volumes)) return;
        this.volumes[category] = Math.max(0, Math.min(1, value));
        if (category === 'master' && this.scene?.sound) this.scene.sound.volume = this.volumes.master;
        this.refreshActiveVolumes();
    }

    setMusicLevel (value)
    {
        this.userMix.music = Math.max(0, Math.min(1, Number(value) || 0));
        this.saveUserMix();
        this.refreshActiveVolumes();
    }

    setSoundsLevel (value)
    {
        this.userMix.sounds = Math.max(0, Math.min(1, Number(value) || 0));
        this.saveUserMix();
        this.refreshActiveVolumes();
    }

    getMusicLevel ()
    {
        return this.userMix.music;
    }

    getSoundsLevel ()
    {
        return this.userMix.sounds;
    }

    refreshActiveVolumes ()
    {
        if (this.music) {
            const asset = AUDIO_ASSETS[this.musicKey] ?? {};
            const target = this.categoryVolume('music', this.musicBaseGain * (asset.gain ?? 1));
            if (Math.abs((this.music.volume ?? 0) - target) >= 0.015) this.music.setVolume?.(target);
        }

        for (const [id, entry] of this.loops.entries()) {
            if (!entry?.sound) continue;
            this.setLoopVolume(id, entry.baseGain ?? 1);
        }
    }

    canPlay (key, cooldown = 0, cooldownKey = key)
    {
        if (!this.has(key)) return false;
        const now = this.scene?.time?.now ?? 0;
        const until = this.cooldowns.get(cooldownKey) ?? 0;
        if (now < until) return false;
        if (cooldown > 0) this.cooldowns.set(cooldownKey, now + cooldown);
        return true;
    }

    playSfx (key, options = {})
    {
        if (!this.canPlay(key, options.cooldown ?? 0, options.cooldownKey ?? key)) return null;

        if (this.scene?.sound?.locked || this.scene?.sound?.context?.state === 'suspended') {
            this.unlock();
        }

        const asset = AUDIO_ASSETS[key] ?? {};
        const category = asset.category ?? 'sfx';
        const volume = this.categoryVolume(category, (options.volume ?? 1) * (asset.gain ?? 1));
        try {
            return this.scene.sound.play(key, {
                volume,
                rate: options.rate ?? asset.rate ?? 1,
                detune: options.detune ?? asset.detune ?? 0,
                loop: false
            });
        } catch (error) {
            console.warn(`[AudioManager] Failed to play SFX "${key}":`, error);
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

    killSoundTween (sound)
    {
        if (!sound) return;
        const tween = this.soundTweens.get(sound);
        if (tween) {
            tween.stop?.();
            tween.remove?.();
            this.soundTweens.delete(sound);
        }
    }

    disposeSound (sound)
    {
        if (!sound) return;
        this.killSoundTween(sound);
        sound.stop?.();
        sound.destroy?.();
    }

    fadeSoundVolume (sound, target, duration = 0, onComplete = null)
    {
        if (!sound || !sound.manager) return;
        const safeTarget = Math.max(0, Math.min(1, target));
        this.killSoundTween(sound);

        if (!this.scene?.tweens || duration <= 0) {
            sound.setVolume?.(safeTarget);
            onComplete?.();
            return;
        }

        const tween = this.scene.tweens.add({
            targets: sound,
            volume: safeTarget,
            duration,
            ease: 'Sine.InOut',
            onComplete: () => {
                this.soundTweens.delete(sound);
                onComplete?.();
            }
        });
        this.soundTweens.set(sound, tween);
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

        const asset = AUDIO_ASSETS[key] ?? {};
        const category = asset.category ?? 'ambient';
        try {
            const sound = this.scene.sound.add(key, {
                loop: true,
                volume: 0,
                rate: options.rate ?? asset.rate ?? 1,
                detune: options.detune ?? asset.detune ?? 0
            });
            sound.play();
            const baseGain = options.volume ?? 1;
            const target = this.categoryVolume(category, baseGain * (asset.gain ?? 1));
            this.loops.set(id, { key, sound, category, baseGain, owner: options.owner ?? null });
            if (options.owner) this.sceneLoopOwners.set(id, options.owner);
            this.fadeSoundVolume(sound, target, options.fadeIn ?? 350);
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
        const asset = AUDIO_ASSETS[entry.key] ?? {};
        const target = this.categoryVolume(entry.category, gain * (asset.gain ?? 1));
        if (Math.abs((entry.sound.volume ?? 0) - target) < 0.015) return;
        entry.sound.setVolume(target);
    }

    stopLoop (id, fadeMs = 0)
    {
        const entry = this.loops.get(id);
        if (!entry) return;
        this.loops.delete(id);
        this.sceneLoopOwners.delete(id);
        const dispose = () => this.disposeSound(entry.sound);
        if (fadeMs > 0 && entry.sound?.isPlaying) this.fadeSoundVolume(entry.sound, 0, fadeMs, dispose);
        else dispose();
    }

    playMusic (key, options = {})
    {
        if (this.musicKey === key && this.music?.isPlaying) {
            const nextBaseGain = options.volume ?? this.musicBaseGain ?? 1;
            if (nextBaseGain !== this.musicBaseGain) {
                this.musicBaseGain = nextBaseGain;
                this.refreshActiveVolumes();
            }
            return this.music;
        }
        if (!this.has(key)) return null;

        const previous = this.music;
        const asset = AUDIO_ASSETS[key] ?? {};
        try {
            const next = this.scene.sound.add(key, {
                loop: options.loop !== false,
                volume: 0,
                rate: asset.rate ?? 1
            });
            next.play();
            this.music = next;
            this.musicKey = key;
            this.musicBaseGain = options.volume ?? 1;
            const target = this.categoryVolume('music', this.musicBaseGain * (asset.gain ?? 1));
            this.fadeSoundVolume(next, target, options.fadeIn ?? 700);

            if (previous && previous !== next) {
                this.fadeSoundVolume(previous, 0, options.fadeOut ?? 650, () => {
                    this.disposeSound(previous);
                });
            }
            return next;
        } catch (_) {
            return null;
        }
    }

    startScene (scene, options = {})
    {
        this.bindScene(scene);
        this.unlock();

        const unlockFromGesture = () => {
            this.bindScene(scene);
            this.unlock();
        };
        scene.input?.once?.('pointerdown', unlockFromGesture);
        scene.input?.keyboard?.once?.('keydown', unlockFromGesture);

        if (options.music) this.playMusic(options.music, { volume: options.musicVolume ?? 1 });
        if (options.ambient) {
            this.ensureLoop('forest_ambient', options.ambient, {
                volume: options.ambientVolume ?? 1,
                fadeIn: 700,
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
            this.playSfx('player_double_jump', { cooldown: 100 });
        } else if (state.grounded && !grounded && velocityY < -120) {
            this.playSfx('player_double_jump', { cooldown: 100 });
        } else if (!state.grounded && grounded) {
            state.jumpsUsed = 0;
        }

        const dashing = Boolean(scene.isDashing);
        if (dashing && !state.dashing) this.playSfx('player_dash', { cooldown: 180 });

        const attacking = Boolean(scene.isAttacking);

        const health = scene.health ?? state.health;
        if (health < state.health) {
            this.playSfx(health <= 0 ? 'player_death' : 'player_hurt', {
                cooldown: health <= 0 ? 650 : 750,
                volume: health <= 0 ? 0.9 : 0.8
            });
        }

        const walking =
            grounded &&
            !dashing &&
            !scene.isPlayerDead &&
            time >= (scene.knockbackUntil || 0) &&
            Math.abs(velocityX) > 70;

        if (!walking) {
            state.nextStepAt = Math.max(state.nextStepAt, time);
        } else if (time >= state.nextStepAt) {
            const stepKeys = ['player_step_01', 'player_step_02', 'player_step_03', 'player_step_04'];
            const stepRates = [0.98, 1.01, 0.97, 1.03];
            state.stepIndex = (state.stepIndex + 1) % stepKeys.length;
            const raining = Boolean(scene.weatherSystem?.isRaining);
            const stepRate = stepRates[state.stepIndex] - (raining ? 0.01 : 0);

            this.playSfx(stepKeys[state.stepIndex], {
                cooldown: 150,
                volume: raining ? 0.88 : 0.96,
                rate: stepRate
            });
            state.nextStepAt = time + (state.stepIndex % 2 === 0 ? 205 : 215);
        }

        if (scene.snake?.active && scene.snakeVisual?.visible) {
            const snakeDistance = Math.abs(scene.snake.x - scene.player.x);
            if (snakeDistance < 90) {
                this.playAtDistance('snake_hiss', scene.snake.x, {
                    cooldown: 1800,
                    cooldownKey: 'snake_hiss_contact',
                    volume: 1,
                    maxDistance: 420
                });
            } else if (snakeDistance < 370) {
                this.playAtDistance('snake_hiss', scene.snake.x, {
                    cooldown: 2500,
                    cooldownKey: 'snake_hiss_near',
                    volume: 1,
                    maxDistance: 460
                });
            }
        }

        const carapanaAlive = scene.carapana?.active && scene.carapanaVisual?.visible && scene.carapana?.body?.enable !== false;
        if (carapanaAlive) {
            const gain = this.distanceGain(scene.carapana.x, 780, 0);
            if (gain > 0.04) {
                this.ensureLoop('carapana_buzz', 'carapana_buzz', { volume: 0.48 * gain, owner: scene.sys?.settings?.key });
                this.setLoopVolume('carapana_buzz', 0.48 * gain);
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
