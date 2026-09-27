import { Scene } from 'phaser';

export class Level2Scene extends Scene
{
    constructor ()
    {
        super('Level2Scene');
    }

    create ()
    {
        this.worldWidth = 3300;
        const worldHeight = 768;

        this.physics.world.setBounds(0, 0, this.worldWidth, worldHeight);
        this.cameras.main.setBounds(0, 0, this.worldWidth, worldHeight);
        this.cameras.main.setBackgroundColor('#04110e');

        this.createDeepForest();
        this.createPlatforms();
        this.createCurupiraSigns();

        this.player = this.add.rectangle(150, 560, 45, 70, 0x000000, 0);
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);
        this.player.body.setMaxVelocity(260, 900);
        this.player.body.setSize(45, 70);
        this.physics.add.collider(this.player, this.platforms);

        this.playerVisual = this.createPlayerVisual();
        this.syncPlayerVisual();

        this.maxHealth = 100;
        this.health = 100;
        this.maxHunger = 100;
        this.hunger = 100;
        this.nextHungerDrainAt = this.time.now + 2000;
        this.nextStarvationDamageAt = this.time.now + 2000;
        this.invulnerableUntil = 0;
        this.knockbackUntil = 0;
        this.isPlayerDead = false;
        this.phaseCompleted = false;

        this.doubleJumpUnlocked = false;
        this.jumpsUsed = 0;
        this.jumpWasDown = false;

        this.isAttacking = false;
        this.attackStartedAt = 0;
        this.nextAttackAt = 0;
        this.attackDirection = 1;
        this.attackHitSnakeRegistered = false;
        this.attackHitCarapanaRegistered = false;
        this.attackHitCurupiraRegistered = false;

        this.createSnake();
        this.createCarapana();
        this.createAttackHitbox();
        this.createFruits();
        this.createArena();
        this.createCurupira();
        this.createFinalZone();

        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey('A');
        this.keyD = this.input.keyboard.addKey('D');
        this.keyW = this.input.keyboard.addKey('W');
        this.spaceKey = this.input.keyboard.addKey('SPACE');
        this.keyJ = this.input.keyboard.addKey('J');
        this.keyX = this.input.keyboard.addKey('X');

        this.keyJ.on('down', () => this.startAttack());
        this.keyX.on('down', () => this.startAttack());

        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setDeadzone(220, 160);

        this.createHud();
        this.createHealthHud();
        this.createHungerHud();
        this.showLevelTitle();

        this.spawnPoint = { x: 150, y: 560 };
    }

    createDeepForest ()
    {
        const sky = this.add.graphics().setDepth(-50).setScrollFactor(0);
        sky.fillStyle(0x04110e, 1);
        sky.fillRect(0, 0, 1024, 768);
        sky.fillStyle(0x071b16, 0.85);
        sky.fillRect(0, 250, 1024, 518);

        const distant = this.add.graphics().setDepth(-35).setScrollFactor(0.18);
        distant.fillStyle(0x071a14, 1);
        distant.fillRect(-400, 480, this.worldWidth + 1000, 300);

        for (let x = 20; x < this.worldWidth; x += 220)
        {
            const offset = (x / 220) % 2 === 0 ? 0 : 35;
            distant.fillStyle(0x0b271d, 0.95);
            distant.fillRect(x, 265 + offset, 38, 390 - offset);
            distant.fillStyle(0x103522, 0.98);
            distant.fillCircle(x + 19, 245 + offset, 100);
            distant.fillCircle(x - 52, 285 + offset, 72);
            distant.fillCircle(x + 80, 285 + offset, 78);
        }

        const roots = this.add.graphics().setDepth(4);
        roots.lineStyle(14, 0x3b2a1d, 0.9);
        [[420, 650, 530, 610], [890, 650, 1000, 600], [1490, 650, 1610, 590], [2180, 650, 2300, 600], [2850, 650, 2970, 585]].forEach(([x1,y1,x2,y2]) => {
            roots.beginPath();
            roots.moveTo(x1, y1);
            roots.lineTo(x2, y2);
            roots.strokePath();
        });

        const vines = this.add.graphics().setDepth(-10).setScrollFactor(0.55);
        vines.lineStyle(5, 0x17452c, 0.75);
        [360, 780, 1260, 1740, 2360, 2920].forEach((x, i) => {
            vines.beginPath();
            vines.moveTo(x, 40);
            vines.lineTo(x - 10 + (i % 2) * 20, 360 + (i % 3) * 60);
            vines.strokePath();
        });

        this.add.rectangle(1200, 520, 2100, 145, 0xc5d5c9, 0.06).setDepth(-14).setScrollFactor(0.25);
        this.add.rectangle(2500, 570, 1900, 105, 0xffffff, 0.045).setDepth(-13).setScrollFactor(0.45);

        const foreground = this.add.graphics().setDepth(30).setScrollFactor(1.08).setAlpha(0.72);
        foreground.fillStyle(0x0a2517, 0.98);
        [70, 300, 620, 980, 1280, 1640, 2000, 2380, 2760, 3140].forEach((x, i) => {
            const size = 34 + (i % 3) * 8;
            foreground.fillCircle(x, 650, size);
            foreground.fillCircle(x + size * 0.7, 655, size * 0.72);
        });
    }

    createPlatforms ()
    {
        this.platforms = this.physics.add.staticGroup();
        const add = (x, y, width, height) => {
            const p = this.add.rectangle(x, y, width, height, 0x000000, 0);
            this.physics.add.existing(p, true);
            this.platforms.add(p);
            return p;
        };

        add(400, 710, 800, 116);
        add(1160, 710, 600, 116);
        add(1900, 710, 760, 116);
        add(2780, 710, 980, 116);

        add(560, 590, 150, 28);
        add(900, 535, 170, 28);
        add(1350, 600, 130, 30);
        add(1620, 540, 190, 28);
        add(2050, 585, 150, 30);
        add(2290, 535, 160, 28);

        // Trecho de teste do salto duplo. A primeira plataforma elevada não é alcançável com o salto normal.
        add(2860, 505, 180, 28);
        add(3110, 390, 190, 28);

        const terrain = this.add.graphics().setDepth(5);
        const ground = [
            [0, 652, 800, 116], [860, 652, 600, 116], [1520, 652, 760, 116], [2340, 652, 960, 116]
        ];
        ground.forEach(([x,y,w,h], i) => {
            terrain.fillStyle(i % 2 === 0 ? 0x443020 : 0x4d3522, 1);
            terrain.fillRect(x, y, w, h);
            terrain.fillStyle(0x24492b, 1);
            terrain.fillRect(x, y, w, 13);
        });

        [[485,576,150,28],[815,521,170,28],[1285,585,130,30],[1525,526,190,28],[1975,570,150,30],[2210,521,160,28],[2770,491,180,28],[3015,376,190,28]].forEach(([x,y,w,h], i) => {
            terrain.fillStyle(i % 3 === 0 ? 0x4c3421 : 0x596051, 1);
            terrain.fillRoundedRect(x, y, w, h, 10);
            terrain.fillStyle(0x2f5b35, 0.9);
            terrain.fillRect(x + 8, y - 4, w - 16, 6);
        });
    }

    createCurupiraSigns ()
    {
        const signs = this.add.graphics().setDepth(10);
        signs.fillStyle(0x7c684c, 0.8);
        [[2110,632,-1],[2160,620,1],[2210,635,-1],[2260,622,1]].forEach(([x,y,d]) => {
            signs.fillEllipse(x, y, 18, 9);
            signs.fillCircle(x - d * 7, y - 6, 4);
            signs.fillCircle(x - d * 1, y - 8, 3);
            signs.fillCircle(x + d * 5, y - 6, 3);
        });

        signs.lineStyle(4, 0xb47b4c, 0.72);
        [[2360,470,2400,430],[2410,455,2455,415]].forEach(([x1,y1,x2,y2]) => {
            signs.beginPath();
            signs.moveTo(x1,y1);
            signs.lineTo(x2,y2);
            signs.strokePath();
        });

        this.signLeaves = [
            this.add.ellipse(2320, 520, 16, 7, 0x39643c, 0.75).setDepth(9),
            this.add.ellipse(2350, 500, 14, 6, 0x447246, 0.72).setDepth(9),
            this.add.ellipse(2390, 530, 18, 7, 0x315a37, 0.72).setDepth(9)
        ];
        this.signLeaves.forEach((leaf, index) => {
            this.tweens.add({
                targets: leaf,
                x: leaf.x + 12 + index * 3,
                y: leaf.y - 5,
                angle: 18 + index * 12,
                duration: 700 + index * 120,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut'
            });
        });

        this.curupiraHint = this.add.ellipse(2480, 500, 34, 62, 0x190c08, 0.55).setDepth(7);
        this.tweens.add({
            targets: this.curupiraHint,
            alpha: { from: 0.1, to: 0.58 },
            x: 2515,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
    }

    createPlayerVisual ()
    {
        const visual = this.add.container(this.player.x, this.player.y).setDepth(20);
        const leftLeg = this.add.rectangle(-8, 16, 11, 28, 0x44372a).setOrigin(0.5, 0.08);
        const rightLeg = this.add.rectangle(8, 16, 11, 28, 0x44372a).setOrigin(0.5, 0.08);
        const torso = this.add.rectangle(0, -7, 30, 34, 0x6c7350);
        const leftArm = this.add.rectangle(-17, -14, 9, 30, 0x8a6549).setOrigin(0.5, 0.12);
        const rightArmRig = this.add.container(17, -14);
        const rightArm = this.add.rectangle(0, 0, 9, 30, 0x8a6549).setOrigin(0.5, 0.12);
        const machete = this.add.container(7, 21);
        machete.add([
            this.add.rectangle(0, 0, 6, 16, 0x5a3e2a).setOrigin(0.5, 0.9),
            this.add.rectangle(0, -20, 7, 30, 0xc6cec7).setOrigin(0.5, 0.9),
            this.add.triangle(0, -38, -4, 0, 4, 0, 0, -10, 0xbec8c0).setOrigin(0.5, 1)
        ]);
        machete.angle = 18;
        rightArmRig.add([rightArm, machete]);
        const head = this.add.circle(0, -34, 13, 0x9b7254);
        const hat = this.add.rectangle(0, -47, 34, 7, 0x5a432c);
        visual.add([leftLeg, rightLeg, torso, leftArm, rightArmRig, head, hat]);
        visual.parts = { leftLeg, rightLeg, torso, leftArm, rightArmRig, rightArm, machete, head, hat };
        visual.facing = 1;
        return visual;
    }

    syncPlayerVisual ()
    {
        this.playerVisual.setPosition(this.player.x, this.player.y);
    }

    animatePlayerVisual (time)
    {
        const p = this.playerVisual.parts;
        const vx = this.player.body.velocity.x;
        const vy = this.player.body.velocity.y;
        const grounded = this.player.body.blocked.down || this.player.body.touching.down;
        if (vx > 1) this.playerVisual.facing = 1;
        if (vx < -1) this.playerVisual.facing = -1;
        this.playerVisual.setScale(this.playerVisual.facing, 1);

        const t = time * 0.001;
        let left = 5;
        let right = -5;
        let torso = 0;
        if (!grounded) {
            left = vy < 0 ? -18 : 18;
            right = vy < 0 ? 24 : 34;
            torso = vy < 0 ? -3 : 3;
        } else if (Math.abs(vx) > 5) {
            const swing = Math.sin(t * 12);
            left = swing * 24;
            right = -swing * 20;
            p.leftLeg.angle = -swing * 24;
            p.rightLeg.angle = swing * 24;
        } else {
            const breathe = Math.sin(t * 2.5);
            p.head.y = -34 + breathe * 0.8;
        }
        p.leftArm.angle += (left - p.leftArm.angle) * 0.2;
        p.rightArmRig.angle += (right - p.rightArmRig.angle) * 0.2;
        p.torso.angle += (torso - p.torso.angle) * 0.2;
        this.playerBaseRightArmAngle = right;
        this.playerBaseTorsoAngle = torso;
    }

    createAttackHitbox ()
    {
        this.attackHitbox = this.add.rectangle(-100, -100, 54, 46, 0x000000, 0);
        this.physics.add.existing(this.attackHitbox);
        this.attackHitbox.body.setAllowGravity(false);
        this.attackHitbox.body.enable = false;

        this.physics.add.overlap(this.attackHitbox, this.snake, () => this.tryHitSnake());
        this.physics.add.overlap(this.attackHitbox, this.carapana, () => this.tryHitCarapana());
        this.physics.add.overlap(this.attackHitbox, this.curupira, () => this.tryHitCurupira());
    }

    startAttack ()
    {
        if (this.phaseCompleted || this.isPlayerDead || this.isAttacking || this.time.now < this.nextAttackAt) return;
        this.isAttacking = true;
        this.attackStartedAt = this.time.now;
        this.nextAttackAt = this.time.now + 400;
        this.attackDirection = this.playerVisual.facing || 1;
        this.attackHitSnakeRegistered = false;
        this.attackHitCarapanaRegistered = false;
        this.attackHitCurupiraRegistered = false;
    }

    updateAttack (time)
    {
        if (!this.isAttacking) {
            this.attackHitbox.body.enable = false;
            return;
        }
        const elapsed = time - this.attackStartedAt;
        const progress = Math.min(elapsed / 300, 1);
        const swing = Math.sin(progress * Math.PI);
        const parts = this.playerVisual.parts;
        parts.rightArmRig.angle = (this.playerBaseRightArmAngle ?? parts.rightArmRig.angle) + 55 * swing;
        parts.machete.angle = 18 + 40 * swing;
        parts.torso.angle = (this.playerBaseTorsoAngle ?? parts.torso.angle) + 5 * swing;

        if (elapsed >= 90 && elapsed <= 210) {
            this.attackHitbox.body.enable = true;
            this.attackHitbox.setPosition(this.player.x + 46 * this.attackDirection, this.player.y - 2);
        } else {
            this.attackHitbox.body.enable = false;
        }

        if (elapsed >= 300) {
            this.isAttacking = false;
            this.attackHitbox.body.enable = false;
            parts.machete.angle = 18;
        }
    }

    createSnake ()
    {
        this.snake = this.add.rectangle(1180, 620, 72, 24, 0x000000, 0);
        this.physics.add.existing(this.snake);
        this.snake.body.setSize(72, 24);
        this.snake.body.setCollideWorldBounds(true);
        this.snake.body.setVelocityX(70);
        this.physics.add.collider(this.snake, this.platforms);
        this.snakeHealth = 50;
        this.snakeAlive = true;
        this.snakeVisual = this.add.container(this.snake.x, this.snake.y).setDepth(19);
        this.snakeVisual.facing = 1;
        const body = this.add.ellipse(0, 0, 64, 16, 0x638342);
        const head = this.add.ellipse(30, -2, 22, 18, 0x72924c);
        this.snakeVisual.add([body, head]);
        this.physics.add.overlap(this.player, this.snake, () => this.handleSnakeContact());
    }

    updateSnake ()
    {
        if (!this.snakeAlive || this.phaseCompleted) return;
        if (this.snake.x >= 1280) { this.snake.body.setVelocityX(-70); this.snakeVisual.facing = -1; }
        else if (this.snake.x <= 1060) { this.snake.body.setVelocityX(70); this.snakeVisual.facing = 1; }
        this.snakeVisual.setPosition(this.snake.x, this.snake.y);
        this.snakeVisual.setScale(this.snakeVisual.facing, 1);
    }

    handleSnakeContact ()
    {
        if (!this.snakeAlive || this.phaseCompleted) return;
        this.damagePlayer(25, this.player.x < this.snake.x ? -220 : 220, -260);
    }

    tryHitSnake ()
    {
        if (!this.isAttacking || !this.attackHitbox.body.enable || this.attackHitSnakeRegistered || !this.snakeAlive) return;
        this.attackHitSnakeRegistered = true;
        this.snakeHealth = Math.max(0, this.snakeHealth - 25);
        if (this.snakeHealth <= 0) {
            this.snakeAlive = false;
            this.snake.body.enable = false;
            this.tweens.add({ targets: this.snakeVisual, alpha: 0, duration: 450, onComplete: () => this.snakeVisual.setVisible(false) });
        }
    }

    createCarapana ()
    {
        this.carapana = this.add.rectangle(1740, 430, 38, 24, 0x000000, 0);
        this.physics.add.existing(this.carapana);
        this.carapana.body.setAllowGravity(false);
        this.carapana.body.setCollideWorldBounds(true);
        this.carapanaHealth = 25;
        this.carapanaAlive = true;
        this.carapanaVisual = this.add.container(this.carapana.x, this.carapana.y).setDepth(19);
        this.carapanaVisual.add([
            this.add.ellipse(-6, 0, 24, 8, 0x4b3d2d),
            this.add.circle(10, -1, 5, 0x6b5940),
            this.add.ellipse(0, -8, 22, 8, 0xcbd8cf, 0.42),
            this.add.ellipse(0, 8, 22, 8, 0xcbd8cf, 0.42)
        ]);
        this.physics.add.overlap(this.player, this.carapana, () => this.handleCarapanaContact());
    }

    updateCarapana (time)
    {
        if (!this.carapanaAlive || this.phaseCompleted) return;
        const dx = this.player.x - this.carapana.x;
        const dy = this.player.y - this.carapana.y;
        const d = Math.hypot(dx, dy);
        if (d <= 300) {
            this.carapana.body.setVelocity(dx / d * 105, dy / d * 105);
        } else {
            const targetX = 1740 + Math.sin(time * 0.0012) * 110;
            const targetY = 430 + Math.sin(time * 0.004) * 20;
            this.carapana.body.setVelocity((targetX - this.carapana.x) * 0.9, (targetY - this.carapana.y) * 0.9);
        }
        this.carapanaVisual.setPosition(this.carapana.x, this.carapana.y + Math.sin(time * 0.006) * 4);
        this.carapanaVisual.angle = Math.sin(time * 0.004) * 5;
    }

    handleCarapanaContact ()
    {
        if (!this.carapanaAlive || this.phaseCompleted) return;
        this.damagePlayer(10, this.player.x < this.carapana.x ? -120 : 120, 0);
    }

    tryHitCarapana ()
    {
        if (!this.isAttacking || !this.attackHitbox.body.enable || this.attackHitCarapanaRegistered || !this.carapanaAlive) return;
        this.attackHitCarapanaRegistered = true;
        this.carapanaHealth = 0;
        this.carapanaAlive = false;
        this.carapana.body.enable = false;
        this.tweens.add({ targets: this.carapanaVisual, y: this.carapanaVisual.y + 70, angle: 70, alpha: 0, duration: 500 });
    }

    damagePlayer (amount, vx = 0, vy = 0)
    {
        if (this.phaseCompleted || this.isPlayerDead || this.time.now < this.invulnerableUntil) return;
        this.health = Math.max(0, this.health - amount);
        this.invulnerableUntil = this.time.now + 1000;
        this.knockbackUntil = this.time.now + 150;
        this.player.body.setVelocity(vx, vy);
        this.updateHealthHud();
        this.flashPlayerDamage();
        if (this.health <= 0) this.handlePlayerDeath();
    }

    flashPlayerDamage ()
    {
        this.tweens.killTweensOf(this.playerVisual);
        this.tweens.add({ targets: this.playerVisual, alpha: 0.25, duration: 90, yoyo: true, repeat: 4, onComplete: () => this.playerVisual.setAlpha(1) });
    }

    handlePlayerDeath ()
    {
        if (this.phaseCompleted || this.isPlayerDead) return;
        this.isPlayerDead = true;
        this.player.body.setVelocity(0, 0);
        this.time.delayedCall(650, () => {
            this.player.setPosition(this.spawnPoint.x, this.spawnPoint.y);
            this.player.body.setVelocity(0, 0);
            this.health = 100;
            this.hunger = 100;
            this.nextHungerDrainAt = this.time.now + 2000;
            this.nextStarvationDamageAt = this.time.now + 2000;
            this.invulnerableUntil = this.time.now + 1000;
            this.isPlayerDead = false;
            this.updateHealthHud();
            this.updateHungerHud();
            this.playerVisual.setAlpha(1);
        });
    }

    createFruits ()
    {
        this.fruits = [];
        [
            [380, 620, 0xc94432], [880, 495, 0xe0b843], [1450, 620, 0xd77a2f], [2030, 545, 0xc94432], [2390, 620, 0xe0b843]
        ].forEach(([x,y,color]) => {
            const sensor = this.add.rectangle(x, y, 26, 30, 0x000000, 0);
            this.physics.add.existing(sensor);
            sensor.body.setAllowGravity(false);
            sensor.body.setImmovable(true);
            const visual = this.add.circle(x, y, 9, color).setDepth(18);
            const fruit = { sensor, visual, baseY: y, collected: false };
            this.physics.add.overlap(this.player, sensor, () => this.collectFruit(fruit));
            this.fruits.push(fruit);
        });
    }

    collectFruit (fruit)
    {
        if (fruit.collected) return;
        fruit.collected = true;
        fruit.sensor.body.enable = false;
        this.hunger = Math.min(100, this.hunger + 25);
        this.health = Math.min(100, this.health + 10);
        this.updateHealthHud();
        this.updateHungerHud();
        this.tweens.add({ targets: fruit.visual, y: fruit.visual.y - 30, alpha: 0, scale: 1.5, duration: 280, onComplete: () => fruit.visual.setVisible(false) });
        const feedback = this.add.text(this.player.x, this.player.y - 65, '+25 FOME\n+10 VIDA', { fontFamily: 'Arial Black', fontSize: '15px', color: '#f1e1ae', align: 'center' }).setOrigin(0.5).setDepth(50);
        this.tweens.add({ targets: feedback, y: feedback.y - 24, alpha: 0, duration: 700, onComplete: () => feedback.destroy() });
    }

    updateFruits (time)
    {
        this.fruits.forEach((fruit, i) => {
            if (!fruit.collected) fruit.visual.y = fruit.baseY + Math.sin(time * 0.003 + i) * 3;
        });
    }

    createArena ()
    {
        this.arenaStarted = false;
        this.arenaCleared = false;
        this.arenaMinX = 2450;
        this.arenaMaxX = 2860;

        this.arenaTrigger = this.add.rectangle(2520, 570, 120, 150, 0x000000, 0);
        this.physics.add.existing(this.arenaTrigger);
        this.arenaTrigger.body.setAllowGravity(false);
        this.arenaTrigger.body.setImmovable(true);
        this.physics.add.overlap(this.player, this.arenaTrigger, () => this.startCurupiraEncounter());

        this.arenaBarrier = this.add.rectangle(2420, 560, 26, 190, 0x203c28, 0.9).setDepth(16).setVisible(false);
        this.physics.add.existing(this.arenaBarrier, true);
        this.arenaBarrier.body.enable = false;
    }

    createCurupira ()
    {
        this.curupira = this.add.rectangle(2730, 590, 44, 74, 0x000000, 0);
        this.physics.add.existing(this.curupira);
        this.curupira.body.setSize(44, 74);
        this.curupira.body.setCollideWorldBounds(true);
        this.physics.add.collider(this.curupira, this.platforms);
        this.physics.add.overlap(this.player, this.curupira, () => this.handleCurupiraContact());

        this.curupiraHealth = 100;
        this.curupiraState = 'INTRO';
        this.curupiraNextActionAt = 0;
        this.curupiraAttackPattern = 0;
        this.curupiraLandingDangerUntil = 0;
        this.curupiraVisual = this.add.container(this.curupira.x, this.curupira.y).setDepth(21).setVisible(false);
        const leftFoot = this.add.rectangle(-9, 26, 12, 22, 0x5c3b28).setAngle(18);
        const rightFoot = this.add.rectangle(9, 26, 12, 22, 0x5c3b28).setAngle(-18);
        const body = this.add.rectangle(0, 0, 30, 42, 0x355a35);
        const head = this.add.circle(0, -31, 13, 0x996247);
        const hair = this.add.ellipse(0, -43, 35, 20, 0xb74427);
        this.curupiraVisual.add([leftFoot, rightFoot, body, head, hair]);

        this.curupiraBossHud = this.add.container(512, 28).setScrollFactor(0).setDepth(160).setVisible(false);
        const bg = this.add.rectangle(0, 0, 430, 54, 0x06100d, 0.88).setOrigin(0.5, 0);
        this.curupiraBossBarBack = this.add.rectangle(-170, 28, 340, 14, 0x301a17, 1).setOrigin(0, 0.5);
        this.curupiraBossBar = this.add.rectangle(-170, 28, 340, 14, 0xb64a32, 1).setOrigin(0, 0.5);
        this.curupiraBossText = this.add.text(0, 8, 'CURUPIRA 100/100', { fontFamily: 'Arial Black', fontSize: '16px', color: '#f1e1ae' }).setOrigin(0.5, 0);
        this.curupiraBossHud.add([bg, this.curupiraBossBarBack, this.curupiraBossBar, this.curupiraBossText]);
    }

    startCurupiraEncounter ()
    {
        if (this.arenaStarted || this.arenaCleared) return;
        this.arenaStarted = true;
        this.arenaBarrier.setVisible(true);
        this.arenaBarrier.body.enable = true;
        this.curupiraVisual.setVisible(true);
        this.curupiraBossHud.setVisible(true);
        this.curupira.body.setVelocity(0, 0);
        this.curupiraState = 'INTRO';

        const panel = this.add.rectangle(512, 360, 580, 100, 0x06100d, 0.9).setScrollFactor(0).setDepth(180);
        const text = this.add.text(512, 360, '“A mata não permite sua passagem.”', { fontFamily: 'Arial', fontSize: '25px', color: '#f1e1ae' }).setOrigin(0.5).setScrollFactor(0).setDepth(181);
        this.time.delayedCall(1500, () => {
            panel.destroy(); text.destroy();
            this.curupiraState = 'ATTACK';
            this.curupiraNextActionAt = this.time.now + 500;
        });
    }

    updateCurupira (time)
    {
        this.curupiraVisual.setPosition(this.curupira.x, this.curupira.y);
        if (!this.arenaStarted || this.arenaCleared || this.curupiraState === 'INTRO' || this.curupiraState === 'DEFEATED') return;

        if (this.curupiraState === 'VULNERABLE') {
            this.curupira.body.setVelocityX(0);
            if (time >= this.curupiraNextActionAt) {
                this.curupiraState = 'ATTACK';
                this.curupiraNextActionAt = time + 400;
            }
            return;
        }

        if (this.curupiraAttackPattern === 1 && this.curupira.body.blocked.down && this.curupiraLandingDangerUntil > 0) {
            if (time <= this.curupiraLandingDangerUntil) {
                if (Math.abs(this.player.x - this.curupira.x) < 90 && Math.abs(this.player.y - this.curupira.y) < 80) this.damagePlayer(20, this.player.x < this.curupira.x ? -150 : 150, -120);
            } else {
                this.curupiraLandingDangerUntil = 0;
                this.enterCurupiraVulnerable(time);
            }
        }

        if (time < this.curupiraNextActionAt) return;

        this.curupiraAttackPattern = (this.curupiraAttackPattern + 1) % 3;
        if (this.curupiraAttackPattern === 0) this.curupiraDash(time);
        else if (this.curupiraAttackPattern === 1) this.curupiraJump(time);
        else this.curupiraFeint(time);
    }

    curupiraDash (time)
    {
        const fromLeft = this.curupira.x < (this.arenaMinX + this.arenaMaxX) / 2;
        this.curupira.setPosition(fromLeft ? this.arenaMinX + 40 : this.arenaMaxX - 40, 590);
        this.curupira.body.setVelocityX(fromLeft ? 330 : -330);
        this.curupiraNextActionAt = time + 800;
        this.time.delayedCall(760, () => {
            if (!this.arenaCleared && this.curupiraState === 'ATTACK') this.enterCurupiraVulnerable(this.time.now);
        });
    }

    curupiraJump (time)
    {
        const direction = this.player.x < this.curupira.x ? -1 : 1;
        this.curupira.body.setVelocity(direction * 150, -520);
        this.curupiraLandingDangerUntil = time + 1250;
        this.curupiraNextActionAt = time + 1300;
    }

    curupiraFeint (time)
    {
        const direction = this.player.x < this.curupira.x ? -1 : 1;
        this.curupira.body.setVelocityX(-direction * 210);
        this.time.delayedCall(260, () => {
            if (!this.arenaCleared && this.curupiraState === 'ATTACK') this.curupira.body.setVelocityX(direction * 280);
        });
        this.time.delayedCall(720, () => {
            if (!this.arenaCleared && this.curupiraState === 'ATTACK') this.enterCurupiraVulnerable(this.time.now);
        });
        this.curupiraNextActionAt = time + 760;
    }

    enterCurupiraVulnerable (time)
    {
        this.curupira.body.setVelocity(0, 0);
        this.curupiraState = 'VULNERABLE';
        this.curupiraNextActionAt = time + 850;
        this.curupiraVisual.setAlpha(0.72);
    }

    handleCurupiraContact ()
    {
        if (!this.arenaStarted || this.arenaCleared || this.curupiraState !== 'ATTACK') return;
        this.damagePlayer(15, this.player.x < this.curupira.x ? -180 : 180, -80);
    }

    tryHitCurupira ()
    {
        if (!this.isAttacking || !this.attackHitbox.body.enable || this.attackHitCurupiraRegistered || this.arenaCleared) return;
        this.attackHitCurupiraRegistered = true;
        if (this.curupiraState !== 'VULNERABLE') {
            this.curupiraVisual.setAlpha(0.45);
            this.time.delayedCall(110, () => { if (!this.arenaCleared) this.curupiraVisual.setAlpha(1); });
            return;
        }
        this.curupiraHealth = Math.max(0, this.curupiraHealth - 25);
        this.curupiraBossBar.width = 340 * (this.curupiraHealth / 100);
        this.curupiraBossText.setText(`CURUPIRA ${this.curupiraHealth}/100`);
        this.curupiraVisual.setAlpha(1);
        if (this.curupiraHealth <= 0) this.defeatCurupira();
        else {
            this.curupiraState = 'ATTACK';
            this.curupiraNextActionAt = this.time.now + 650;
        }
    }

    defeatCurupira ()
    {
        this.arenaCleared = true;
        this.curupiraState = 'DEFEATED';
        this.curupira.body.setVelocity(0, 0);
        this.curupiraBossHud.setVisible(false);
        this.curupiraVisual.setAlpha(1);
        this.arenaBarrier.setVisible(false);
        this.arenaBarrier.body.enable = false;

        const panel = this.add.rectangle(512, 350, 620, 190, 0x06100d, 0.92).setScrollFactor(0).setDepth(190);
        const text = this.add.text(512, 320, 'A floresta testou seus passos.', { fontFamily: 'Arial', fontSize: '23px', color: '#c8d8cc' }).setOrigin(0.5).setScrollFactor(0).setDepth(191);
        const skill = this.add.text(512, 380, 'HABILIDADE DESBLOQUEADA\nSALTO DUPLO', { fontFamily: 'Arial Black', fontSize: '29px', color: '#f1e1ae', align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(191);

        this.time.delayedCall(1600, () => {
            this.doubleJumpUnlocked = true;
            this.registry.set('doubleJumpUnlocked', true);
            panel.destroy(); text.destroy(); skill.destroy();
            this.showDoubleJumpTutorial();
        });
    }

    showDoubleJumpTutorial ()
    {
        const tutorial = this.add.text(512, 220, 'SALTO DUPLO\nNo ar, pressione novamente W / ↑ / Espaço.', { fontFamily: 'Arial Black', fontSize: '21px', color: '#f1e1ae', align: 'center', backgroundColor: '#06100dcc', padding: { x: 18, y: 12 } }).setOrigin(0.5).setScrollFactor(0).setDepth(180);
        this.time.delayedCall(3000, () => tutorial.destroy());
    }

    performJump (isGrounded)
    {
        if (isGrounded) {
            this.jumpsUsed = 0;
        }

        if (this.jumpsUsed === 0 && isGrounded) {
            this.player.body.setVelocityY(-520);
            this.jumpsUsed = 1;
            return;
        }

        if (this.doubleJumpUnlocked && this.jumpsUsed === 1 && !isGrounded) {
            this.player.body.setVelocityY(-500);
            this.jumpsUsed = 2;
            this.showDoubleJumpBurst();
        }
    }

    showDoubleJumpBurst ()
    {
        const burst = this.add.circle(this.player.x, this.player.y + 24, 12, 0xc8d59b, 0.35).setDepth(18);
        this.tweens.add({ targets: burst, scale: 2.5, alpha: 0, duration: 260, onComplete: () => burst.destroy() });
    }

    createFinalZone ()
    {
        this.finalZone = this.add.rectangle(3200, 320, 150, 190, 0x000000, 0);
        this.physics.add.existing(this.finalZone);
        this.finalZone.body.setAllowGravity(false);
        this.finalZone.body.setImmovable(true);
        this.physics.add.overlap(this.player, this.finalZone, () => this.completeLevel2());
    }

    completeLevel2 ()
    {
        if (this.phaseCompleted || !this.doubleJumpUnlocked) return;
        this.phaseCompleted = true;
        this.player.body.setVelocity(0, 0);
        this.isAttacking = false;
        this.attackHitbox.body.enable = false;

        const overlay = this.add.rectangle(512, 384, 1024, 768, 0x020705, 0.94).setScrollFactor(0).setDepth(300);
        this.add.text(512, 220, 'FASE 2 CONCLUÍDA', { fontFamily: 'Arial Black', fontSize: '44px', color: '#f1e1ae' }).setOrigin(0.5).setScrollFactor(0).setDepth(301);
        this.add.text(512, 315, 'SALTO DUPLO ADQUIRIDO', { fontFamily: 'Arial Black', fontSize: '25px', color: '#d6b56c' }).setOrigin(0.5).setScrollFactor(0).setDepth(301);
        this.add.text(512, 390, 'Os rastros seguem para onde antes\nele não poderia alcançar.', { fontFamily: 'Arial', fontSize: '22px', color: '#c8d8cc', align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(301);
        const button = this.add.rectangle(512, 530, 280, 64, 0x8b5a2b).setStrokeStyle(3, 0xd6b56c).setScrollFactor(0).setDepth(301).setInteractive({ useHandCursor: true });
        this.add.text(512, 530, 'CONTINUAR', { fontFamily: 'Arial Black', fontSize: '23px', color: '#ffffff' }).setOrigin(0.5).setScrollFactor(0).setDepth(302);
        button.on('pointerdown', () => this.scene.start('MainMenu'));
    }

    createHud ()
    {
        const panel = this.add.rectangle(15, 15, 365, 124, 0x06100d, 0.72).setOrigin(0).setScrollFactor(0).setDepth(100);
        panel.setStrokeStyle(1, 0x78917c, 0.35);
        this.add.text(30, 27, 'SOLDADOS DA BORRACHA - FASE 2', { fontFamily: 'Arial', fontSize: '18px', color: '#f1e1ae' }).setScrollFactor(0).setDepth(101);
        this.add.text(30, 56, 'Controles:\nA/D ou ←/→ = mover\nW / ↑ / Espaço = pular\nJ / X = atacar', { fontFamily: 'Arial', fontSize: '15px', color: '#c7d6ca', lineSpacing: 3 }).setScrollFactor(0).setDepth(101);
    }

    createHealthHud ()
    {
        this.healthHud = this.add.container(395, 18).setScrollFactor(0).setDepth(102);
        const bg = this.add.rectangle(0, 0, 235, 58, 0x06100d, 0.78).setOrigin(0);
        this.add.text(12, 7, 'VIDA', { fontFamily: 'Arial', fontSize: '14px', color: '#f1e1ae' });
        this.add.rectangle(12, 29, 150, 16, 0x351b18, 0.95).setOrigin(0);
        this.healthBar = this.add.rectangle(12, 29, 150, 16, 0x8fb35b, 1).setOrigin(0);
        this.healthText = this.add.text(172, 27, '100/100', { fontFamily: 'Arial', fontSize: '14px', color: '#ffffff' });
        this.healthHud.add([bg, this.healthBar, this.healthText]);
        this.updateHealthHud();
    }

    createHungerHud ()
    {
        this.hungerHud = this.add.container(395, 78).setScrollFactor(0).setDepth(102);
        const bg = this.add.rectangle(0, 0, 235, 58, 0x06100d, 0.78).setOrigin(0);
        this.hungerLabel = this.add.text(12, 7, 'FOME', { fontFamily: 'Arial', fontSize: '14px', color: '#f1e1ae' });
        this.add.rectangle(12, 29, 150, 16, 0x3d2b16, 0.95).setOrigin(0);
        this.hungerBar = this.add.rectangle(12, 29, 150, 16, 0xd49a3a, 1).setOrigin(0);
        this.hungerText = this.add.text(172, 27, '100/100', { fontFamily: 'Arial', fontSize: '14px', color: '#ffffff' });
        this.hungerHud.add([bg, this.hungerLabel, this.hungerBar, this.hungerText]);
        this.updateHungerHud();
    }

    updateHealthHud ()
    {
        this.healthBar.width = 150 * Math.max(0, this.health / 100);
        this.healthText.setText(`${this.health}/100`);
    }

    updateHungerHud ()
    {
        this.hungerBar.width = 150 * Math.max(0, this.hunger / 100);
        this.hungerText.setText(`${this.hunger}/100`);
        this.hungerBar.setFillStyle(this.hunger < 30 ? 0xe8782f : 0xd49a3a, 1);
    }

    updateHunger (time)
    {
        if (this.phaseCompleted || this.isPlayerDead) return;
        if (time >= this.nextHungerDrainAt) {
            const steps = Math.floor((time - this.nextHungerDrainAt) / 2000) + 1;
            this.hunger = Math.max(0, this.hunger - steps);
            this.nextHungerDrainAt += steps * 2000;
            this.updateHungerHud();
        }
        if (this.hunger <= 0 && time >= this.nextStarvationDamageAt) {
            this.nextStarvationDamageAt = time + 2000;
            this.health = Math.max(0, this.health - 5);
            this.updateHealthHud();
            if (this.health <= 0) this.handlePlayerDeath();
        }
    }

    showLevelTitle ()
    {
        const title = this.add.text(512, 280, 'FASE 2\nRASTROS DO GUARDIÃO', { fontFamily: 'Arial Black', fontSize: '34px', color: '#f1e1ae', align: 'center', backgroundColor: '#06100dcc', padding: { x: 24, y: 16 } }).setOrigin(0.5).setScrollFactor(0).setDepth(170);
        this.tweens.add({ targets: title, alpha: 0, delay: 1800, duration: 800, onComplete: () => title.destroy() });
    }

    update ()
    {
        const moveSpeed = 260;
        const grounded = this.player.body.blocked.down || this.player.body.touching.down;
        if (grounded) this.jumpsUsed = 0;

        if (!this.isPlayerDead && !this.phaseCompleted) {
            if (this.time.now >= this.knockbackUntil) {
                const left = this.cursors.left.isDown || this.keyA.isDown;
                const right = this.cursors.right.isDown || this.keyD.isDown;
                this.player.body.setVelocityX(left ? -moveSpeed : right ? moveSpeed : 0);
            }

            const jumpDown = this.keyW.isDown || this.cursors.up.isDown || this.spaceKey.isDown;
            if (jumpDown && !this.jumpWasDown) this.performJump(grounded);
            this.jumpWasDown = jumpDown;
        }

        if (this.arenaStarted && !this.arenaCleared) {
            if (this.player.x < this.arenaMinX) this.player.x = this.arenaMinX;
            if (this.player.x > this.arenaMaxX) this.player.x = this.arenaMaxX;
        }

        if (this.player.y > 760) {
            this.player.setPosition(this.spawnPoint.x, this.spawnPoint.y);
            this.player.body.setVelocity(0, 0);
        }

        this.syncPlayerVisual();
        this.animatePlayerVisual(this.time.now);
        this.updateAttack(this.time.now);
        this.updateSnake();
        this.updateCarapana(this.time.now);
        this.updateFruits(this.time.now);
        this.updateCurupira(this.time.now);
        this.updateHunger(this.time.now);
    }
}