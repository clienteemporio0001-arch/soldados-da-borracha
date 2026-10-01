export function applyWetGroundMovement (scene, direction, moveSpeed, grounded, time)
{
    const weather = scene.weatherSystem;
    if (
        !weather ||
        !weather.isRaining ||
        !grounded ||
        scene.isDashing === true ||
        time < (scene.knockbackUntil || 0) ||
        !scene.player?.body
    ) {
        return false;
    }

    const body = scene.player.body;
    const deltaSeconds = Math.max(0.008, Math.min(0.034, (scene.game?.loop?.delta || 16.67) / 1000));
    const current = body.velocity.x;
    const target = direction * moveSpeed;

    let acceleration = direction === 0 ? 1850 : 3200;
    if (direction !== 0 && current !== 0 && Math.sign(current) !== direction) acceleration = 2400;

    const maxStep = acceleration * deltaSeconds;
    let next = current;

    if (Math.abs(target - current) <= maxStep) next = target;
    else next += Math.sign(target - current) * maxStep;

    if (direction === 0 && Math.abs(next) < 8) next = 0;
    body.setVelocityX(next);
    return true;
}

export function createTropicalStormSystem (scene, config = {})
{
    const phase = config.phase ?? 1;
    const DRY_DURATION = 30000;
    const RAIN_DURATION = 20000;
    const ENTER_DURATION = 2500;
    const EXIT_DURATION = 2000;
    const dryHoldDuration = DRY_DURATION - ENTER_DURATION - EXIT_DURATION;

    const system = {
        scene,
        phase,
        state: 'DRY',
        isRaining: false,
        destroyed: false,
        stateTimer: null,
        lightningTimer: null,
        splashTimer: null,
        thunderTimer: null,
        cloudsFar: null,
        cloudsNear: null,
        overlay: null,
        flash: null,
        lightning: null,
        dropsBack: [],
        dropsFront: [],
        splashes: [],
        cloudOffsetFar: 0,
        cloudOffsetNear: 0
    };

    const phaseConfig = {
        1: { overlay: 0.105, backAlpha: 0.34, frontAlpha: 0.58, wind: 92, cloudTint: 0x344d50 },
        2: { overlay: 0.13, backAlpha: 0.38, frontAlpha: 0.64, wind: 98, cloudTint: 0x30484b },
        3: { overlay: 0.145, backAlpha: 0.40, frontAlpha: 0.68, wind: 112, cloudTint: 0x33464b },
        4: { overlay: 0.16, backAlpha: 0.42, frontAlpha: 0.70, wind: 108, cloudTint: 0x3b4145 },
        5: { overlay: 0.075, backAlpha: 0.32, frontAlpha: 0.56, wind: 105, cloudTint: 0x1d2d33 }
    }[phase] || { overlay: 0.13, backAlpha: 0.38, frontAlpha: 0.64, wind: 100, cloudTint: 0x30484b };

    const safeRemove = timer => {
        if (timer?.remove) timer.remove(false);
    };

    const makeCloudLayer = (depth, alpha, yBase, scale, tint) => {
        const container = scene.add.container(0, 0).setScrollFactor(0).setDepth(depth).setAlpha(0).setVisible(false);
        for (let group = 0; group < 5; group += 1) {
            const gx = group * 250 - 90;
            const gy = yBase + (group % 2) * 24;
            const cloud = scene.add.container(gx, gy);
            cloud.add([
                scene.add.ellipse(0, 0, 210, 78, tint, alpha),
                scene.add.ellipse(-70, 8, 145, 64, tint, alpha * 0.94),
                scene.add.ellipse(72, 10, 165, 68, tint, alpha * 0.96),
                scene.add.ellipse(18, -25, 130, 58, tint, alpha * 0.88),
                scene.add.ellipse(-30, 28, 190, 45, tint, alpha * 0.82)
            ]);
            cloud.setScale(scale);
            container.add(cloud);
        }
        return container;
    };

    system.cloudsFar = makeCloudLayer(38, 0.72, 54, 1.12, phaseConfig.cloudTint + 0x0d0d0d);
    system.cloudsNear = makeCloudLayer(44, 0.82, 82, 1.22, phaseConfig.cloudTint);

    system.overlay = scene.add.rectangle(512, 384, 1024, 768, 0x132b35, 0)
        .setScrollFactor(0)
        .setDepth(55)
        .setVisible(false);

    system.flash = scene.add.rectangle(512, 384, 1024, 768, 0xcfd9d2, 0)
        .setScrollFactor(0)
        .setDepth(68)
        .setVisible(false);

    system.lightning = scene.add.graphics()
        .setScrollFactor(0)
        .setDepth(64)
        .setAlpha(0)
        .setVisible(false);

    const makeDrop = (front, index) => {
        const length = front ? 20 + (index % 5) * 3 : 10 + (index % 4) * 2;
        const width = front ? 1.7 : 1.1;
        const drop = scene.add.rectangle(
            (index * 137) % 1080 - 30,
            (index * 83) % 800 - 40,
            width,
            length,
            front ? 0xcbd8d8 : 0x9fb6b7,
            0
        )
            .setScrollFactor(0)
            .setDepth(front ? 86 : 48)
            .setAngle(phase === 3 ? -13 : -10)
            .setVisible(false);
        drop.weatherSpeed = front ? 720 + (index % 7) * 42 : 470 + (index % 6) * 32;
        drop.weatherDrift = phaseConfig.wind * (front ? 1 : 0.72);
        drop.weatherBaseAlpha = front ? phaseConfig.frontAlpha : phaseConfig.backAlpha;
        return drop;
    };

    for (let i = 0; i < 28; i += 1) system.dropsBack.push(makeDrop(false, i));
    for (let i = 0; i < 28; i += 1) system.dropsFront.push(makeDrop(true, i));

    for (let i = 0; i < 8; i += 1) {
        const splash = scene.add.ellipse(-100, 715, 18, 4, 0xc0d0cf, 0)
            .setScrollFactor(0)
            .setDepth(87)
            .setVisible(false);
        system.splashes.push(splash);
    }
    system.nextSplashIndex = 0;

    const setRainVisualAlpha = strength => {
        const value = Math.max(0, Math.min(1, strength));
        system.dropsBack.forEach(drop => {
            drop.setVisible(value > 0.01);
            drop.setAlpha(drop.weatherBaseAlpha * value);
        });
        system.dropsFront.forEach(drop => {
            drop.setVisible(value > 0.01);
            drop.setAlpha(drop.weatherBaseAlpha * value);
        });
    };

    const scheduleState = (delay, callback) => {
        safeRemove(system.stateTimer);
        system.stateTimer = scene.time.delayedCall(delay, () => {
            system.stateTimer = null;
            if (system.destroyed) return;
            callback();
        });
    };

    const stopLightning = () => {
        safeRemove(system.lightningTimer);
        system.lightningTimer = null;
        if (system.lightning) {
            system.lightning.clear();
            system.lightning.setVisible(false).setAlpha(0);
        }
        if (system.flash) system.flash.setVisible(false).setAlpha(0);
    };

    const drawLightning = () => {
        if (system.destroyed || (!system.isRaining && system.state !== 'STORM_ENTER') || !system.lightning) return;
        const g = system.lightning;
        g.clear();
        g.lineStyle(2.2, 0xf1e7bd, 0.82);
        const startX = 160 + Math.random() * 700;
        let x = startX;
        let y = 12;
        g.beginPath();
        g.moveTo(x, y);
        const points = [];
        for (let i = 0; i < 6; i += 1) {
            x += -28 + Math.random() * 56;
            y += 28 + Math.random() * 22;
            points.push({ x, y });
            g.lineTo(x, y);
        }
        g.strokePath();
        if (points.length > 3) {
            const branch = points[2];
            g.lineStyle(1.2, 0xe8e2c8, 0.54);
            g.beginPath();
            g.moveTo(branch.x, branch.y);
            g.lineTo(branch.x + (Math.random() < 0.5 ? -48 : 48), branch.y + 45);
            g.lineTo(branch.x + (Math.random() < 0.5 ? -72 : 72), branch.y + 75);
            g.strokePath();
        }
        g.setVisible(true).setAlpha(0.9);

        system.flash.setVisible(true).setAlpha(phase === 5 ? 0.07 : 0.11);
        safeRemove(system.thunderTimer);
        system.thunderTimer = scene.time.delayedCall(200 + Math.random() * 500, () => {
            system.thunderTimer = null;
            if (system.destroyed) return;
            const key = Math.random() < 0.5 ? 'thunder_01' : 'thunder_02';
            scene.audioManager?.playSfx?.(key, { cooldown: 650, volume: phase === 5 ? 0.68 : 0.82 });
        });
        scene.tweens.add({
            targets: system.flash,
            alpha: 0,
            duration: 170,
            onComplete: () => system.flash?.setVisible(false)
        });
        scene.tweens.add({
            targets: g,
            alpha: 0,
            duration: 190,
            onComplete: () => {
                if (!g?.active) return;
                g.clear();
                g.setVisible(false);
            }
        });
    };

    const scheduleLightning = () => {
        if (system.destroyed || !system.isRaining) return;
        safeRemove(system.lightningTimer);
        system.lightningTimer = scene.time.delayedCall(3000 + Math.random() * 4000, () => {
            system.lightningTimer = null;
            if (system.destroyed || !system.isRaining) return;
            drawLightning();
            scheduleLightning();
        });
    };

    const scheduleSplash = () => {
        safeRemove(system.splashTimer);
        if (system.destroyed || !system.isRaining) return;
        system.splashTimer = scene.time.delayedCall(260, () => {
            system.splashTimer = null;
            if (system.destroyed || !system.isRaining) return;
            if (Math.random() < 0.52) {
                const splash = system.splashes[system.nextSplashIndex++ % system.splashes.length];
                scene.tweens.killTweensOf(splash);
                splash.setPosition(40 + Math.random() * 944, 690 + Math.random() * 34)
                    .setScale(0.55, 0.55)
                    .setAlpha(0.38)
                    .setVisible(true);
                scene.tweens.add({
                    targets: splash,
                    scaleX: 1.3,
                    scaleY: 0.4,
                    alpha: 0,
                    duration: 150,
                    onComplete: () => splash?.setVisible(false)
                });
            }
            scheduleSplash();
        });
    };

    const enterStorm = () => {
        if (system.destroyed) return;
        system.state = 'STORM_ENTER';
        system.cloudsFar.setVisible(true);
        system.cloudsNear.setVisible(true);
        system.overlay.setVisible(true);
        scene.tweens.add({ targets: system.cloudsFar, alpha: 0.70, duration: ENTER_DURATION, ease: 'Sine.Out' });
        scene.tweens.add({ targets: system.cloudsNear, alpha: 0.88, duration: ENTER_DURATION, ease: 'Sine.Out' });
        scene.tweens.add({ targets: system.overlay, alpha: phaseConfig.overlay * 0.7, duration: ENTER_DURATION, ease: 'Sine.Out' });

        scene.time.delayedCall(Math.max(600, ENTER_DURATION - 700), () => {
            if (!system.destroyed && system.state === 'STORM_ENTER' && Math.random() < 0.55) drawLightning();
        });

        scheduleState(ENTER_DURATION, startRain);
    };

    const startRain = () => {
        if (system.destroyed) return;
        system.state = 'RAIN';
        system.isRaining = true;
        setRainVisualAlpha(1);
        scene.audioManager?.ensureLoop?.('rain_loop', 'rain_loop', {
            volume: phase === 5 ? 0.72 : 0.86,
            owner: scene.sys?.settings?.key
        });
        scene.audioManager?.setLoopVolume?.('forest_ambient', 0.45);
        system.overlay.setVisible(true);
        scene.tweens.add({ targets: system.overlay, alpha: phaseConfig.overlay, duration: 420, ease: 'Sine.Out' });
        scheduleLightning();
        scheduleSplash();
        scheduleState(RAIN_DURATION, exitStorm);
    };

    const exitStorm = () => {
        if (system.destroyed) return;
        system.state = 'STORM_EXIT';
        system.isRaining = false;
        stopLightning();
        scene.audioManager?.stopLoop?.('rain_loop');
        scene.audioManager?.setLoopVolume?.('forest_ambient', 1);
        safeRemove(system.splashTimer);
        system.splashTimer = null;
        system.splashes.forEach(splash => {
            if (splash?.active) {
                scene.tweens.killTweensOf(splash);
                splash.setAlpha(0).setVisible(false);
            }
        });
        scene.tweens.add({
            targets: [...system.dropsBack, ...system.dropsFront],
            alpha: 0,
            duration: 700,
            onComplete: () => setRainVisualAlpha(0)
        });
        scene.tweens.add({ targets: system.cloudsFar, alpha: 0, duration: EXIT_DURATION, ease: 'Sine.In' });
        scene.tweens.add({ targets: system.cloudsNear, alpha: 0, duration: EXIT_DURATION, ease: 'Sine.In' });
        scene.tweens.add({
            targets: system.overlay,
            alpha: 0,
            duration: EXIT_DURATION,
            ease: 'Sine.In',
            onComplete: () => {
                if (system.destroyed) return;
                system.overlay.setVisible(false);
                system.cloudsFar.setVisible(false);
                system.cloudsNear.setVisible(false);
            }
        });
        scheduleState(EXIT_DURATION + dryHoldDuration, enterStorm);
    };

    scheduleState(DRY_DURATION - ENTER_DURATION, enterStorm);

    system.update = () => {
        if (system.destroyed) return;
        const delta = Math.max(8, Math.min(34, scene.game?.loop?.delta || 16.67)) / 1000;

        if (system.state !== 'DRY') {
            system.cloudOffsetFar = (system.cloudOffsetFar + 8 * delta) % 260;
            system.cloudOffsetNear = (system.cloudOffsetNear + 15 * delta) % 260;
            system.cloudsFar.x = -system.cloudOffsetFar;
            system.cloudsNear.x = -system.cloudOffsetNear;
        }

        if (!system.isRaining) return;

        const advanceDrops = drops => {
            drops.forEach(drop => {
                drop.y += drop.weatherSpeed * delta;
                drop.x += drop.weatherDrift * delta;
                if (drop.y > 790 || drop.x > 1085) {
                    drop.y = -20 - Math.random() * 120;
                    drop.x = -40 + Math.random() * 1040;
                }
            });
        };
        advanceDrops(system.dropsBack);
        advanceDrops(system.dropsFront);
    };

    system.cleanup = () => {
        if (system.destroyed) return;
        system.destroyed = true;
        system.isRaining = false;
        system.state = 'DRY';

        safeRemove(system.stateTimer);
        safeRemove(system.lightningTimer);
        safeRemove(system.splashTimer);
        safeRemove(system.thunderTimer);
        system.stateTimer = null;
        system.lightningTimer = null;
        system.splashTimer = null;
        system.thunderTimer = null;
        scene.audioManager?.stopLoop?.('rain_loop');

        const allTargets = [
            system.cloudsFar,
            system.cloudsNear,
            system.overlay,
            system.flash,
            system.lightning,
            ...system.dropsBack,
            ...system.dropsFront,
            ...system.splashes
        ].filter(Boolean);

        allTargets.forEach(target => {
            if (scene.tweens && target?.active) scene.tweens.killTweensOf(target);
        });
        allTargets.forEach(target => {
            if (target?.active) target.destroy();
        });

        system.dropsBack.length = 0;
        system.dropsFront.length = 0;
        system.splashes.length = 0;
        system.cloudsFar = null;
        system.cloudsNear = null;
        system.overlay = null;
        system.flash = null;
        system.lightning = null;
    };

    scene.events.once('shutdown', () => system.cleanup());
    return system;
}
