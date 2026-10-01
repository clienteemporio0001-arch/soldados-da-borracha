// Evento reutilizavel da onca para as fases 2 a 5.
// Asset visual fornecido pelo usuario em 2026-10-01.
// Origem externa/licenca comercial nao foram informadas; manter pendente ate documentacao da fonte.
export class OncaEncounter
{
    constructor (scene, options = {})
    {
        this.scene = scene;
        this.phase = options.phase ?? 2;
        this.canSpawn = options.canSpawn ?? (() => ({ allowed: true, bossActive: false }));
        this.state = 'IDLE';
        this.active = false;
        this.attackCount = 0;
        this.side = 1;
        this.direction = 1;
        this.chargeEndX = 0;
        this.chargeEndsAt = 0;
        this.hitRegistered = false;
        this.body = null;
        this.visual = null;
        this.overlap = null;
        this.effects = [];
        this.activeTimers = [];
        this.destroyed = false;
        this.deathSeen = false;
        this.speed = 530;
        this.exitSpeed = 620;
        this.visualScale = 0.38;
        this.nextEligibleAt = scene.time.now + 12000;

        if (!scene.anims.exists('onca-run')) {
            scene.anims.create({
                key: 'onca-run',
                frames: scene.anims.generateFrameNumbers('onca', { start: 0, end: 7 }),
                frameRate: 13,
                repeat: -1
            });
        }

        this.checkTimer = scene.time.addEvent({
            delay: 5500,
            loop: true,
            callback: () => this.trySpawn()
        });

        scene.events.once('shutdown', () => this.destroy());
    }

    phaseChance ()
    {
        if (this.phase === 2) return 0.20;
        if (this.phase === 3) return 0.27;
        if (this.phase === 4) return 0.29;
        return 0.34;
    }

    trySpawn ()
    {
        if (this.destroyed || this.active || this.scene.phaseCompleted || this.scene.isPlayerDead) return;
        if (this.scene.time.now < this.nextEligibleAt) return;

        const eligibility = this.canSpawn() || {};
        const allowed = typeof eligibility === 'boolean' ? eligibility : eligibility.allowed !== false;
        const bossActive = typeof eligibility === 'object' && eligibility.bossActive === true;
        if (!allowed) return;

        const chance = bossActive ? 0.25 : this.phaseChance();
        if (Math.random() > chance) {
            this.nextEligibleAt = this.scene.time.now + 5000;
            return;
        }

        this.startWarning();
    }

    startWarning ()
    {
        if (this.active || this.destroyed) return;

        this.active = true;
        this.state = 'WARNING';
        this.scene.audioManager?.playSfx?.('jaguar_growl', { cooldown: 1800, volume: 0.9 });
        this.attackCount = 0;
        this.hitRegistered = false;
        this.side = Math.random() < 0.5 ? -1 : 1;

        const cam = this.scene.cameras.main;
        const edgeX = this.side < 0 ? cam.scrollX + 28 : cam.scrollX + cam.width - 28;
        const y = Math.max(500, Math.min(590, this.scene.player.y + 18));

        const eyeA = this.trackEffect(this.scene.add.circle(edgeX - this.side * 7, y - 38, 2.6, 0xe5c45c, 0.72).setDepth(29));
        const eyeB = this.trackEffect(this.scene.add.circle(edgeX + this.side * 2, y - 37, 2.6, 0xe5c45c, 0.72).setDepth(29));

        for (let i = 0; i < 6; i += 1) {
            const leaf = this.trackEffect(
                this.scene.add.ellipse(
                    edgeX + this.side * (8 + i * 5),
                    y + 15 - (i % 3) * 8,
                    10,
                    5,
                    i % 2 === 0 ? 0x547044 : 0x776440,
                    0.62
                ).setDepth(27)
            );
            this.scene.tweens.add({
                targets: leaf,
                x: leaf.x - this.side * (18 + i * 4),
                y: leaf.y - 16 - (i % 2) * 8,
                angle: this.side * (35 + i * 17),
                alpha: 0,
                duration: 520 + i * 28,
                onComplete: () => this.destroyEffect(leaf)
            });
        }

        this.scene.tweens.add({ targets: [eyeA, eyeB], alpha: { from: 0.35, to: 0.9 }, duration: 130, yoyo: true, repeat: 2 });

        const warningText = this.trackEffect(
            this.scene.add.text(
                512,
                185,
                'Algo se move na mata...',
                {
                    fontFamily: 'Arial',
                    fontSize: '16px',
                    color: '#d7d0aa',
                    backgroundColor: '#07100ca6',
                    padding: { x: 10, y: 5 }
                }
            ).setOrigin(0.5).setScrollFactor(0).setDepth(175)
        );
        this.scene.tweens.add({
            targets: warningText,
            alpha: 0,
            delay: 380,
            duration: 300,
            onComplete: () => this.destroyEffect(warningText)
        });

        this.schedule(700, () => this.startCharge(this.side));
    }

    ensureActors ()
    {
        if (this.body && this.visual) return;

        this.body = this.scene.add.rectangle(-500, -500, 116, 54, 0x000000, 0);
        this.scene.physics.add.existing(this.body);
        this.body.body.setAllowGravity(false);
        this.body.body.setSize(116, 54);
        this.body.body.enable = true;

        this.visual = this.scene.add.sprite(-500, -500, 'onca', 0)
            .setOrigin(0.5)
            .setScale(this.visualScale)
            .setDepth(28);
        this.visual.play('onca-run');

        this.overlap = this.scene.physics.add.overlap(
            this.scene.player,
            this.body,
            () => this.hitPlayer()
        );
    }

    startCharge (side = this.side)
    {
        if (!this.active || this.destroyed || this.scene.isPlayerDead || this.scene.phaseCompleted) {
            this.cleanupActive(true);
            return;
        }

        this.ensureActors();
        this.clearEffects();
        this.state = 'CHARGE';
        this.hitRegistered = false;
        this.scene.audioManager?.playSfx?.('jaguar_charge', { cooldown: 420, volume: 0.9 });
        this.side = side;

        const cam = this.scene.cameras.main;
        const startX = side < 0 ? cam.scrollX - 180 : cam.scrollX + cam.width + 180;
        const y = Math.max(500, Math.min(590, this.scene.player.y + 18));
        const targetX = this.scene.player.x;
        this.direction = targetX >= startX ? 1 : -1;
        this.chargeEndX = targetX + this.direction * 340;
        this.chargeEndsAt = this.scene.time.now + 1550;

        this.body.setPosition(startX, y);
        this.body.body.enable = true;
        this.body.body.setVelocity(this.direction * this.speed, 0);

        this.visual.setPosition(startX, y - 8)
            .setVisible(true)
            .setAlpha(1)
            .setFlipX(this.direction < 0);
        if (!this.visual.anims.isPlaying) this.visual.play('onca-run');
    }

    finishCharge ()
    {
        if (this.state !== 'CHARGE') return;

        this.body.body.setVelocity(0, 0);
        this.attackCount += 1;

        if (this.attackCount >= 3) {
            this.startExit();
            return;
        }

        this.state = 'TURN';
        this.hitRegistered = false;
        this.visual.setAlpha(0.55);

        const turnSide = this.direction > 0 ? 1 : -1;
        this.schedule(520, () => this.startCharge(turnSide));
    }

    startExit ()
    {
        if (!this.body || !this.visual) {
            this.cleanupActive(true);
            return;
        }

        this.state = 'EXIT';
        this.hitRegistered = false;
        const cam = this.scene.cameras.main;
        const distLeft = Math.abs(this.body.x - (cam.scrollX - 220));
        const distRight = Math.abs(this.body.x - (cam.scrollX + cam.width + 220));
        this.direction = distRight <= distLeft ? 1 : -1;
        this.body.body.setVelocity(this.direction * this.exitSpeed, 0);
        this.visual.setAlpha(0.9).setFlipX(this.direction < 0);
    }

    hitPlayer ()
    {
        if (this.state !== 'CHARGE' || this.hitRegistered || this.scene.isPlayerDead) return;

        this.hitRegistered = true;
        this.state = 'DEAD';
        this.scene.health = 0;
        if (typeof this.scene.updateHealthHud === 'function') this.scene.updateHealthHud();
        if (typeof this.scene.handlePlayerDeath === 'function') this.scene.handlePlayerDeath();
        this.cleanupActive(true);
    }

    update (time)
    {
        if (this.destroyed) return;

        if (this.scene.isPlayerDead) {
            if (!this.deathSeen) {
                this.deathSeen = true;
                this.cleanupActive(true);
            }
            return;
        }
        this.deathSeen = false;

        if (this.scene.phaseCompleted) {
            this.cleanupActive(false);
            return;
        }

        if (!this.active || !this.body || !this.visual) return;

        this.visual.setPosition(this.body.x, this.body.y - 8);

        if (this.state === 'CHARGE') {
            const passed = this.direction > 0
                ? this.body.x >= this.chargeEndX
                : this.body.x <= this.chargeEndX;
            if (passed || time >= this.chargeEndsAt) this.finishCharge();
            return;
        }

        if (this.state === 'EXIT') {
            const cam = this.scene.cameras.main;
            const outside = this.direction > 0
                ? this.body.x > cam.scrollX + cam.width + 260
                : this.body.x < cam.scrollX - 260;
            if (outside) this.cleanupActive(true);
        }
    }

    schedule (delay, callback)
    {
        const timer = this.scene.time.delayedCall(delay, () => {
            const index = this.activeTimers.indexOf(timer);
            if (index >= 0) this.activeTimers.splice(index, 1);
            if (!this.active || this.destroyed) return;
            callback();
        });
        this.activeTimers.push(timer);
        return timer;
    }

    trackEffect (effect)
    {
        if (effect) this.effects.push(effect);
        return effect;
    }

    destroyEffect (effect)
    {
        const index = this.effects.indexOf(effect);
        if (index >= 0) this.effects.splice(index, 1);
        if (effect?.active) effect.destroy();
    }

    clearEffects ()
    {
        this.effects.forEach(effect => {
            if (!effect?.active) return;
            if (this.scene.tweens) this.scene.tweens.killTweensOf(effect);
            effect.destroy();
        });
        this.effects.length = 0;
    }

    cleanupActive (startCooldown = true)
    {
        this.activeTimers.forEach(timer => timer?.remove(false));
        this.activeTimers.length = 0;
        this.clearEffects();

        const world = this.scene.physics?.world;
        if (world && this.overlap) {
            world.removeCollider(this.overlap);
        }
        this.overlap = null;

        if (this.body) {
            if (this.body.body) {
                this.body.body.setVelocity(0, 0);
                this.body.body.enable = false;
            }
            this.body.destroy();
            this.body = null;
        }

        if (this.visual) {
            if (this.scene.tweens) this.scene.tweens.killTweensOf(this.visual);
            if (this.visual.active) this.visual.destroy();
            this.visual = null;
        }

        this.active = false;
        this.state = 'IDLE';
        this.hitRegistered = false;
        this.attackCount = 0;

        if (startCooldown && !this.destroyed) {
            this.nextEligibleAt = this.scene.time.now + 25000 + Math.random() * 20000;
        }
    }

    destroy ()
    {
        if (this.destroyed) return;
        this.destroyed = true;
        if (this.checkTimer) {
            this.checkTimer.remove(false);
            this.checkTimer = null;
        }
        this.cleanupActive(false);
    }
}
