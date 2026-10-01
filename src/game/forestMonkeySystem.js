export function createForestMonkeySystem (scene, config = {})
{
    const system = {
        scene,
        perches: config.perches ?? [],
        damage: config.damage ?? 10,
        maxMonkeys: config.maxMonkeys ?? 1,
        throwMin: config.throwMin ?? 2800,
        throwMax: config.throwMax ?? 3500,
        maxProjectiles: config.maxProjectiles ?? 2,
        aimLead: config.aimLead ?? 0.2,
        aimError: config.aimError ?? 35,
        spawnChance: config.spawnChance ?? 0.6,
        isPaused: config.isPaused ?? (() => false),
        monkeys: [],
        projectiles: [],
        perchCooldowns: new Map(),
        destroyed: false,
        deathSeen: false,
        nextSpawnAt: scene.time.now + 5500
    };

    const randomBetween = (min, max) => min + Math.random() * (max - min);

    const destroyTimer = (timer) => {
        if (timer && typeof timer.remove === 'function') timer.remove(false);
    };

    const destroyProjectile = (projectile, impact = false) => {
        if (!projectile || projectile.destroyed) return;
        projectile.destroyed = true;
        destroyTimer(projectile.lifeTimer);
        projectile.lifeTimer = null;

        const world = scene.physics?.world;
        if (world && projectile.groundCollider) world.removeCollider(projectile.groundCollider);
        if (world && projectile.playerOverlap) world.removeCollider(projectile.playerOverlap);
        projectile.groundCollider = null;
        projectile.playerOverlap = null;

        const x = projectile.rock?.x ?? 0;
        const y = projectile.rock?.y ?? 0;
        if (impact && !system.destroyed) {
            for (let i = 0; i < 4; i += 1) {
                const dust = scene.add.circle(
                    x + (i - 1.5) * 4,
                    y,
                    2 + (i % 2),
                    i % 2 ? 0x756856 : 0x91816b,
                    0.5
                ).setDepth(19);
                scene.tweens.add({
                    targets: dust,
                    x: dust.x + (i - 1.5) * 8,
                    y: dust.y - 10 - i * 2,
                    alpha: 0,
                    duration: 180 + i * 25,
                    onComplete: () => dust.destroy()
                });
            }
        }

        if (projectile.rock?.active) projectile.rock.destroy();
        const index = system.projectiles.indexOf(projectile);
        if (index >= 0) system.projectiles.splice(index, 1);
    };

    const clearProjectiles = () => {
        [...system.projectiles].forEach(projectile => destroyProjectile(projectile, false));
    };

    const setMonkeyState = (monkey, state) => {
        if (!monkey || monkey.removed) return;
        monkey.state = state;
        const parts = monkey.parts;
        if (!parts) return;

        if (state === 'IDLE') {
            parts.handStone.setVisible(false);
            parts.throwArm.setAngle(-18);
            parts.otherArm.setAngle(14);
            parts.torso.setAngle(0);
        } else if (state === 'AIM') {
            parts.handStone.setVisible(true);
            parts.throwArm.setAngle(-88);
            parts.otherArm.setAngle(24);
            parts.torso.setAngle(monkey.facing * -7);
        } else if (state === 'THROW') {
            parts.handStone.setVisible(false);
            parts.throwArm.setAngle(64);
            parts.otherArm.setAngle(-8);
            parts.torso.setAngle(monkey.facing * 8);
        } else if (state === 'RECOVER') {
            parts.handStone.setVisible(false);
            parts.throwArm.setAngle(12);
            parts.otherArm.setAngle(6);
            parts.torso.setAngle(0);
        }
    };

    const createMonkeyVisual = (x, y) => {
        const container = scene.add.container(x, y).setDepth(18);
        const tailA = scene.add.ellipse(-22, 5, 38, 7, 0x5f412b).setAngle(-28);
        const tailB = scene.add.ellipse(-37, -7, 28, 6, 0x5f412b).setAngle(24);
        const leftLeg = scene.add.ellipse(-9, 20, 8, 26, 0x67472f).setAngle(28);
        const rightLeg = scene.add.ellipse(9, 20, 8, 26, 0x67472f).setAngle(-28);
        const torso = scene.add.ellipse(0, 0, 28, 38, 0x704b30);
        const chest = scene.add.ellipse(2, 3, 16, 23, 0x8a6444, 0.65);
        const throwArm = scene.add.rectangle(-15, -3, 7, 31, 0x67472f).setOrigin(0.5, 0.1).setAngle(-18);
        const otherArm = scene.add.rectangle(15, -2, 7, 29, 0x67472f).setOrigin(0.5, 0.1).setAngle(14);
        const head = scene.add.circle(0, -25, 12, 0x704b30);
        const face = scene.add.ellipse(2, -24, 15, 12, 0xb18a62);
        const earL = scene.add.circle(-10, -25, 4, 0x8a6444);
        const earR = scene.add.circle(10, -25, 4, 0x8a6444);
        const eyeL = scene.add.circle(-2, -26, 1.4, 0x11100d);
        const eyeR = scene.add.circle(5, -26, 1.4, 0x11100d);
        const handStone = scene.add.circle(-16, -28, 4.5, 0x71685d).setVisible(false);
        container.add([
            tailA, tailB, leftLeg, rightLeg, torso, chest,
            throwArm, otherArm, head, face, earL, earR, eyeL, eyeR, handStone
        ]);
        return {
            container,
            parts: {
                tailA, tailB, leftLeg, rightLeg, torso, throwArm, otherArm,
                head, eyeL, eyeR, handStone
            }
        };
    };

    const removeMonkey = (monkey, immediate = false) => {
        if (!monkey || monkey.removed) return;
        monkey.removed = true;
        monkey.state = 'EXIT';
        monkey.timers.forEach(destroyTimer);
        monkey.timers.length = 0;
        if (scene.tweens) scene.tweens.killTweensOf(monkey.visual);

        const finish = () => {
            if (monkey.visual?.active) monkey.visual.destroy();
            const index = system.monkeys.indexOf(monkey);
            if (index >= 0) system.monkeys.splice(index, 1);
            if (!system.destroyed) {
                system.perchCooldowns.set(
                    monkey.perchIndex,
                    scene.time.now + randomBetween(8000, 15000)
                );
                system.nextSpawnAt = Math.max(system.nextSpawnAt, scene.time.now + randomBetween(2500, 4500));
            }
        };

        if (immediate || !monkey.visual?.active) {
            finish();
            return;
        }

        scene.tweens.add({
            targets: monkey.visual,
            y: monkey.visual.y - 34,
            scaleX: 0.82,
            scaleY: 0.82,
            alpha: 0,
            duration: 360,
            ease: 'Quad.In',
            onComplete: finish
        });
    };

    const clearMonkeys = (immediate = true) => {
        [...system.monkeys].forEach(monkey => removeMonkey(monkey, immediate));
    };

    const clearThreats = () => {
        clearProjectiles();
        clearMonkeys(true);
    };

    const launchRock = (monkey) => {
        if (
            system.destroyed ||
            monkey.removed ||
            scene.isPlayerDead ||
            scene.phaseCompleted ||
            system.isPaused() ||
            system.projectiles.length >= system.maxProjectiles
        ) {
            return;
        }

        const startX = monkey.visual.x + monkey.facing * 18;
        const startY = monkey.visual.y - 18;
        const playerVelocityX = scene.player.body?.velocity?.x ?? 0;
        const targetX = scene.player.x +
            playerVelocityX * system.aimLead +
            randomBetween(-system.aimError, system.aimError);
        const dx = targetX - startX;
        const horizontalSpeed = Math.max(160, Math.min(260, Math.abs(dx) / 1.55));
        const vx = Math.sign(dx || monkey.facing) * horizontalSpeed;
        const vy = -randomBetween(180, 260);
        const gravity = randomBetween(500, 700);

        const rock = scene.add.circle(startX, startY, 6, 0x6f665a).setDepth(21);
        rock.setStrokeStyle(1, 0x403b35, 0.85);
        scene.physics.add.existing(rock);
        rock.body.setAllowGravity(true);
        rock.body.setGravityY(gravity);
        rock.body.setVelocity(vx, vy);
        rock.body.setCircle(6);
        rock.body.setCollideWorldBounds(false);

        const projectile = {
            rock,
            hit: false,
            destroyed: false,
            groundCollider: null,
            playerOverlap: null,
            lifeTimer: null
        };

        projectile.groundCollider = scene.physics.add.collider(
            rock,
            scene.platforms,
            () => destroyProjectile(projectile, true)
        );

        projectile.playerOverlap = scene.physics.add.overlap(
            rock,
            scene.player,
            () => {
                if (projectile.hit || projectile.destroyed || scene.isPlayerDead) return;
                projectile.hit = true;
                const knockX = vx < 0 ? -randomBetween(90, 130) : randomBetween(90, 130);
                const knockY = -randomBetween(70, 110);
                if (typeof scene.damagePlayer === 'function') {
                    scene.damagePlayer(system.damage, knockX, knockY);
                }
                destroyProjectile(projectile, false);
            }
        );

        projectile.lifeTimer = scene.time.delayedCall(4000, () => destroyProjectile(projectile, false));
        system.projectiles.push(projectile);
    };

    const scheduleMonkeyThrow = (monkey) => {
        if (!monkey || monkey.removed) return;
        const timer = scene.time.delayedCall(
            randomBetween(system.throwMin, system.throwMax),
            () => {
                const index = monkey.timers.indexOf(timer);
                if (index >= 0) monkey.timers.splice(index, 1);
                if (
                    monkey.removed ||
                    system.destroyed ||
                    scene.isPlayerDead ||
                    scene.phaseCompleted ||
                    system.isPaused()
                ) {
                    return;
                }
                if (system.projectiles.length >= system.maxProjectiles) {
                    scheduleMonkeyThrow(monkey);
                    return;
                }

                monkey.facing = scene.player.x >= monkey.visual.x ? 1 : -1;
                monkey.visual.setScale(monkey.facing, 1);
                setMonkeyState(monkey, 'AIM');

                const telegraph = randomBetween(350, 500);
                const aimTimer = scene.time.delayedCall(telegraph, () => {
                    if (monkey.removed || scene.isPlayerDead || system.isPaused()) return;
                    setMonkeyState(monkey, 'THROW');
                    launchRock(monkey);

                    const recoverTimer = scene.time.delayedCall(180, () => {
                        if (monkey.removed) return;
                        setMonkeyState(monkey, 'RECOVER');

                        const idleTimer = scene.time.delayedCall(260, () => {
                            if (monkey.removed) return;
                            setMonkeyState(monkey, 'IDLE');
                            scheduleMonkeyThrow(monkey);
                        });
                        monkey.timers.push(idleTimer);
                    });
                    monkey.timers.push(recoverTimer);
                });
                monkey.timers.push(aimTimer);
            }
        );
        monkey.timers.push(timer);
    };

    const spawnMonkey = (perch, perchIndex) => {
        const { container, parts } = createMonkeyVisual(perch.x, perch.y);
        const monkey = {
            visual: container,
            parts,
            perch,
            perchIndex,
            state: 'IDLE',
            timers: [],
            removed: false,
            facing: scene.player.x >= perch.x ? 1 : -1,
            phase: Math.random() * Math.PI * 2
        };
        container.setScale(monkey.facing, 1);
        system.monkeys.push(monkey);
        setMonkeyState(monkey, 'IDLE');
        scheduleMonkeyThrow(monkey);

        const stayTimer = scene.time.delayedCall(
            randomBetween(8000, 16000),
            () => removeMonkey(monkey, false)
        );
        monkey.timers.push(stayTimer);
    };

    const findEligiblePerches = () => {
        const cam = scene.cameras.main;
        const centerX = cam.scrollX + cam.width * 0.5;
        const worldWidth = scene.physics.world.bounds.width;
        return system.perches
            .map((perch, index) => ({ perch, index }))
            .filter(({ perch, index }) => {
                const cooldown = system.perchCooldowns.get(index) ?? 0;
                if (scene.time.now < cooldown) return false;
                if (perch.x < cam.scrollX - 80 || perch.x > cam.scrollX + cam.width + 80) return false;
                if (Math.abs(perch.x - scene.player.x) < 190) return false;
                if (Math.abs(perch.x - centerX) < 105) return false;
                if (perch.x > worldWidth - 260) return false;
                return !system.monkeys.some(monkey => monkey.perchIndex === index && !monkey.removed);
            });
    };

    const trySpawn = () => {
        if (
            system.destroyed ||
            scene.phaseCompleted ||
            scene.isPlayerDead ||
            system.isPaused() ||
            system.monkeys.length >= system.maxMonkeys ||
            scene.time.now < system.nextSpawnAt
        ) {
            return;
        }

        const eligible = findEligiblePerches();
        if (eligible.length === 0) return;
        if (Math.random() > system.spawnChance) {
            system.nextSpawnAt = scene.time.now + 2500;
            return;
        }

        const selected = eligible[Math.floor(Math.random() * eligible.length)];
        spawnMonkey(selected.perch, selected.index);
        system.nextSpawnAt = scene.time.now + randomBetween(2800, 5200);
    };

    system.spawnTimer = scene.time.addEvent({
        delay: 1800,
        loop: true,
        callback: trySpawn
    });

    system.update = (time) => {
        if (system.destroyed) return;

        if (scene.isPlayerDead) {
            if (!system.deathSeen) {
                system.deathSeen = true;
                clearThreats();
                system.nextSpawnAt = scene.time.now + 5000;
            }
            return;
        }
        system.deathSeen = false;

        if (scene.phaseCompleted || system.isPaused()) {
            if (system.monkeys.length || system.projectiles.length) clearThreats();
            return;
        }

        for (const monkey of system.monkeys) {
            if (monkey.removed || !monkey.visual?.active) continue;
            const wave = Math.sin(time * 0.004 + monkey.phase);
            const tailWave = Math.sin(time * 0.006 + monkey.phase);
            monkey.parts.torso.y = wave * 1.2;
            monkey.parts.head.y = -25 + wave * 0.7;
            monkey.parts.tailA.angle = -28 + tailWave * 6;
            monkey.parts.tailB.angle = 24 - tailWave * 7;
            if (monkey.state === 'IDLE') {
                monkey.parts.throwArm.angle = -18 + wave * 4;
                monkey.parts.otherArm.angle = 14 - wave * 4;
            }
        }

        const bounds = scene.physics.world.bounds;
        [...system.projectiles].forEach(projectile => {
            if (!projectile.rock?.active) {
                destroyProjectile(projectile, false);
                return;
            }
            if (
                projectile.rock.x < bounds.x - 120 ||
                projectile.rock.x > bounds.right + 120 ||
                projectile.rock.y > bounds.bottom + 120
            ) {
                destroyProjectile(projectile, false);
            }
        });
    };

    system.cleanup = () => {
        if (system.destroyed) return;
        system.destroyed = true;

        destroyTimer(system.spawnTimer);
        system.spawnTimer = null;

        system.monkeys.forEach(monkey => {
            if (!monkey) return;
            monkey.removed = true;
            monkey.state = 'EXIT';
            monkey.timers?.forEach(destroyTimer);
            if (monkey.timers) monkey.timers.length = 0;
            if (monkey.visual?.active) monkey.visual.destroy();
        });
        system.monkeys.length = 0;

        const world = scene.physics?.world;
        system.projectiles.forEach(projectile => {
            if (!projectile) return;
            projectile.destroyed = true;
            destroyTimer(projectile.lifeTimer);
            projectile.lifeTimer = null;
            if (world && projectile.groundCollider) world.removeCollider(projectile.groundCollider);
            if (world && projectile.playerOverlap) world.removeCollider(projectile.playerOverlap);
            projectile.groundCollider = null;
            projectile.playerOverlap = null;
            if (projectile.rock?.active) projectile.rock.destroy();
        });
        system.projectiles.length = 0;
        system.perchCooldowns.clear();
    };

    scene.events.once('shutdown', () => system.cleanup());
    return system;
}
