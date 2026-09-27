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
        this.createCurupira();
        this.createAttackHitbox();
        this.createFruits();
        this.createArena();
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
        const container = this.add.container(this.player.x, this.player.y).setDepth(20);

        const leftLeg = this.add.rectangle(-8, 16, 11, 28, 0x272820)
            .setOrigin(0.5, 0.08);
        const rightLeg = this.add.rectangle(8, 16, 11, 28, 0x272820)
            .setOrigin(0.5, 0.08);

        const torso = this.add.rectangle(0, -7, 30, 34, 0xc7aa73)
            .setOrigin(0.5);

        const leftArm = this.add.rectangle(-17, -14, 9, 30, 0xb89562)
            .setOrigin(0.5, 0.12);
        const rightArmRig = this.add.container(17, -14);
        const rightArm = this.add.rectangle(0, 0, 9, 30, 0xb89562)
            .setOrigin(0.5, 0.12);

        const machete = this.add.container(7, 21);
        const macheteHandle = this.add.rectangle(0, 0, 6, 16, 0x3a2a1d)
            .setOrigin(0.5, 0.9);
        const macheteBlade = this.add.rectangle(0, -20, 7, 30, 0xb8c0ba)
            .setOrigin(0.5, 0.9);
        const macheteTip = this.add.triangle(0, -38, -3.5, 0, 3.5, 0, 0, -8, 0xcbd1cc)
            .setOrigin(0.5, 1);
        machete.add([macheteHandle, macheteBlade, macheteTip]);
        machete.setAngle(18);

        rightArmRig.add([rightArm, machete]);

        const head = this.add.circle(0, -34, 11, 0xb98155);

        const hat = this.add.container(0, -47);
        const hatBrim = this.add.rectangle(0, 0, 34, 5, 0x5a432b).setOrigin(0.5);
        const hatCrown = this.add.rectangle(0, -5, 21, 10, 0x6a5033).setOrigin(0.5);
        hat.add([hatBrim, hatCrown]);

        container.add([
            leftLeg,
            rightLeg,
            torso,
            leftArm,
            rightArmRig,
            head,
            hat
        ]);

        container.parts = {
            head,
            hat,
            torso,
            leftArm,
            rightArmRig,
            rightArm,
            machete,
            leftLeg,
            rightLeg
        };
        container.animationState = 'IDLE';
        container.facing = 1;

        return container;
    }

    syncPlayerVisual ()
    {
        this.playerVisual.setPosition(this.player.x, this.player.y);
    }

    animatePlayerVisual (time)
    {
        const visual = this.playerVisual;
        const parts = visual.parts;
        const body = this.player.body;
        const velocityX = body.velocity.x;
        const velocityY = body.velocity.y;
        const grounded = body.blocked.down || body.touching.down;
        const moving = Math.abs(velocityX) > 1;

        let state = 'IDLE';

        if (!grounded)
        {
            state = velocityY < 0 ? 'JUMP' : 'FALL';
        }
        else if (moving)
        {
            state = 'WALK';
        }

        visual.animationState = state;

        if (velocityX > 1)
        {
            visual.facing = 1;
        }
        else if (velocityX < -1)
        {
            visual.facing = -1;
        }

        visual.setScale(visual.facing, 1);

        const seconds = time * 0.001;
        const lerp = (current, target, amount = 0.2) =>
            current + (target - current) * amount;

        let bodyOffsetY = 0;
        let torsoAngle = 0;
        let torsoY = -7;
        let headY = -34;
        let hatY = -47;
        let hatAngle = 0;
        let leftArmAngle = 5;
        let rightArmAngle = -5;
        let leftLegAngle = 0;
        let rightLegAngle = 0;
        let leftLegY = 16;
        let rightLegY = 16;

        if (state === 'IDLE')
        {
            const breath = Math.sin(seconds * 2.2);
            const armSway = Math.sin(seconds * 1.7) * 2;

            bodyOffsetY = breath * 0.7;
            torsoY = -7 + breath * 0.7;
            headY = -34 + breath * 0.45;
            hatY = -47 + breath * 0.45;
            hatAngle = Math.sin(seconds * 1.4) * 0.7;
            leftArmAngle = 5 + armSway;
            rightArmAngle = -5 - armSway;
        }
        else if (state === 'WALK')
        {
            const speedRatio = Math.min(Math.abs(velocityX) / 260, 1);
            const phase = seconds * (7 + speedRatio * 4);
            const swing = Math.sin(phase);
            const bounce = Math.abs(Math.sin(phase * 2)) * 1.5;

            bodyOffsetY = -bounce;
            torsoY = -7 - bounce * 0.45;
            headY = -34 - bounce * 0.35;
            hatY = -47 - bounce * 0.3;
            hatAngle = Math.sin(phase) * 1.5;

            leftLegAngle = swing * 24;
            rightLegAngle = -swing * 24;
            leftArmAngle = -swing * 20;
            rightArmAngle = swing * 20;
        }
        else if (state === 'JUMP')
        {
            bodyOffsetY = -1;
            torsoY = -8;
            torsoAngle = -3;
            headY = -35;
            hatY = -48;
            hatAngle = -2;
            leftArmAngle = -24;
            rightArmAngle = 24;
            leftLegAngle = 12;
            rightLegAngle = -12;
            leftLegY = 13;
            rightLegY = 13;
        }
        else if (state === 'FALL')
        {
            bodyOffsetY = 1;
            torsoY = -6;
            torsoAngle = 2;
            headY = -33;
            hatY = -46;
            hatAngle = 2;
            leftArmAngle = -34;
            rightArmAngle = 34;
            leftLegAngle = -15;
            rightLegAngle = 15;
            leftLegY = 17;
            rightLegY = 17;
        }

        visual.y = this.player.y + bodyOffsetY;

        parts.torso.y = lerp(parts.torso.y, torsoY);
        parts.torso.angle = lerp(parts.torso.angle, torsoAngle);

        parts.head.y = lerp(parts.head.y, headY);
        parts.hat.y = lerp(parts.hat.y, hatY);
        parts.hat.angle = lerp(parts.hat.angle, hatAngle);

        parts.leftArm.angle = lerp(parts.leftArm.angle, leftArmAngle);
        parts.rightArmRig.angle = lerp(parts.rightArmRig.angle, rightArmAngle);

        this.playerBaseRightArmAngle = rightArmAngle;
        this.playerBaseTorsoAngle = torsoAngle;

        parts.leftLeg.angle = lerp(parts.leftLeg.angle, leftLegAngle);
        parts.rightLeg.angle = lerp(parts.rightLeg.angle, rightLegAngle);
        parts.leftLeg.y = lerp(parts.leftLeg.y, leftLegY);
        parts.rightLeg.y = lerp(parts.rightLeg.y, rightLegY);
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
        this.snakePatrol = {
            minX: 1060,
            maxX: 1280,
            speed: 70
        };

        this.snake = this.add.rectangle(1180, 620, 72, 24, 0x000000, 0);
        this.physics.add.existing(this.snake);

        this.snake.body.setSize(72, 24);
        this.snake.body.setCollideWorldBounds(true);
        this.snake.body.setVelocityX(this.snakePatrol.speed);

        this.physics.add.collider(this.snake, this.platforms);
        this.physics.add.overlap(this.player, this.snake, () => {
            this.handleSnakeContact();
        });

        this.snakeVisual = this.add.container(this.snake.x, this.snake.y).setDepth(19);
        this.snakeVisual.facing = 1;
        this.snakeMaxHealth = 50;
        this.snakeHealth = 50;
        this.snakeAlive = true;

        const tail = this.add.ellipse(-30, 2, 22, 8, 0x49652f).setOrigin(0.5);
        const bodyBack = this.add.ellipse(-15, 0, 28, 13, 0x58773a).setOrigin(0.5);
        const bodyFront = this.add.ellipse(7, 0, 34, 15, 0x638342).setOrigin(0.5);
        const head = this.add.ellipse(29, -2, 23, 18, 0x72924c).setOrigin(0.5);
        const eyeTop = this.add.circle(34, -6, 2.2, 0xe3d7a5);
        const eyeBottom = this.add.circle(34, 2, 2.2, 0xe3d7a5);
        const pupilTop = this.add.circle(35, -6, 1, 0x11170d);
        const pupilBottom = this.add.circle(35, 2, 1, 0x11170d);

        this.snakeVisual.add([
            tail,
            bodyBack,
            bodyFront,
            head,
            eyeTop,
            eyeBottom,
            pupilTop,
            pupilBottom
        ]);

        this.snakeVisual.parts = {
            tail,
            bodyBack,
            bodyFront,
            head
        };
    }

    updateSnake (time)
    {
        if (this.phaseCompleted || !this.snake || !this.snake.body || !this.snakeAlive)
        {
            return;
        }

        const patrol = this.snakePatrol;

        if (this.snake.x >= patrol.maxX)
        {
            this.snake.body.setVelocityX(-patrol.speed);
            this.snakeVisual.facing = -1;
        }
        else if (this.snake.x <= patrol.minX)
        {
            this.snake.body.setVelocityX(patrol.speed);
            this.snakeVisual.facing = 1;
        }

        const seconds = time * 0.001;
        const wave = Math.sin(seconds * 8);
        const waveBack = Math.sin(seconds * 8 - 0.8);
        const waveTail = Math.sin(seconds * 8 - 1.5);

        this.snakeVisual.setPosition(this.snake.x, this.snake.y - 2 + wave * 1.2);
        this.snakeVisual.setScale(this.snakeVisual.facing, 1);

        this.snakeVisual.parts.bodyFront.y = wave * 1.4;
        this.snakeVisual.parts.bodyBack.y = waveBack * 1.8;
        this.snakeVisual.parts.tail.y = waveTail * 2.2;
        this.snakeVisual.parts.head.y = wave * 1.1;
        this.snakeVisual.parts.head.angle = wave * 2.5;
    }

    handleSnakeContact ()
    {
        if (this.phaseCompleted || !this.snakeAlive || this.isPlayerDead || this.time.now < this.invulnerableUntil)
        {
            return;
        }

        this.health = Math.max(0, this.health - 25);
        this.invulnerableUntil = this.time.now + 1000;
        this.knockbackUntil = this.time.now + 180;

        const direction = this.player.x < this.snake.x ? -1 : 1;
        this.player.body.setVelocityX(220 * direction);
        this.player.body.setVelocityY(-260);

        this.updateHealthHud();
        this.flashPlayerDamage();

        if (this.health <= 0)
        {
            this.handlePlayerDeath();
        }
    }

    tryHitSnake ()
    {
        if (
            !this.isAttacking ||
            !this.attackHitbox.body.enable ||
            this.attackHitSnakeRegistered ||
            !this.snakeAlive
        )
        {
            return;
        }

        this.attackHitSnakeRegistered = true;
        this.damageSnake(25);
    }

    damageSnake (amount)
    {
        if (!this.snakeAlive)
        {
            return;
        }

        this.snakeHealth = Math.max(0, this.snakeHealth - amount);

        this.tweens.killTweensOf(this.snakeVisual);
        this.snakeVisual.setAlpha(1);

        this.tweens.add({
            targets: this.snakeVisual,
            alpha: 0.35,
            scaleY: 1.12,
            duration: 70,
            yoyo: true,
            repeat: 1,
            onComplete: () => {
                if (this.snakeAlive)
                {
                    this.snakeVisual.setAlpha(1);
                    this.snakeVisual.scaleY = 1;
                }
            }
        });

        if (this.snakeHealth <= 0)
        {
            this.defeatSnake();
        }
    }

    defeatSnake ()
    {
        if (!this.snakeAlive)
        {
            return;
        }

        this.snakeAlive = false;
        this.snake.body.setVelocity(0, 0);
        this.snake.body.enable = false;

        this.tweens.killTweensOf(this.snakeVisual);

        this.tweens.add({
            targets: this.snakeVisual,
            angle: 18,
            scaleY: 0.55,
            alpha: 0,
            duration: 450,
            delay: 180,
            onComplete: () => {
                this.snakeVisual.setVisible(false);
            }
        });
    }

    createCarapana ()
    {
        this.carapanaPatrol = {
            minX: 1630,
            maxX: 1850,
            baseX: 1740,
            baseY: 430,
            patrolSpeed: 55,
            chaseSpeed: 105,
            returnSpeed: 80,
            detectionRadius: 300
        };

        this.carapana = this.add.rectangle(
            this.carapanaPatrol.baseX,
            this.carapanaPatrol.baseY,
            38,
            24,
            0x000000,
            0
        );
        this.physics.add.existing(this.carapana);

        this.carapana.body.setSize(38, 24);
        this.carapana.body.setAllowGravity(false);
        this.carapana.body.setCollideWorldBounds(true);
        this.carapana.body.setVelocityX(this.carapanaPatrol.patrolSpeed);

        this.carapanaMaxHealth = 25;
        this.carapanaHealth = 25;
        this.carapanaAlive = true;
        this.carapanaFacing = 1;
        this.carapanaReturning = false;

        this.physics.add.overlap(this.player, this.carapana, () => {
            this.handleCarapanaContact();
        });

        this.carapanaVisual = this.add.container(
            this.carapana.x,
            this.carapana.y
        ).setDepth(19);

        const abdomen = this.add.ellipse(-8, 0, 22, 8, 0x4b3d2d);
        const thorax = this.add.ellipse(5, 0, 13, 11, 0x5d4b35);
        const head = this.add.circle(13, -1, 5, 0x6b5940);

        const wingTop = this.add.ellipse(-1, -8, 22, 8, 0xcbd8cf, 0.42)
            .setAngle(-18);
        const wingBottom = this.add.ellipse(-1, 8, 22, 8, 0xcbd8cf, 0.42)
            .setAngle(18);

        const proboscis = this.add.rectangle(21, -1, 12, 2, 0x3a3026)
            .setOrigin(0, 0.5);

        const leg1 = this.add.rectangle(1, 7, 2, 17, 0x3b3228)
            .setOrigin(0.5, 0)
            .setAngle(28);
        const leg2 = this.add.rectangle(-5, 7, 2, 18, 0x3b3228)
            .setOrigin(0.5, 0)
            .setAngle(-24);
        const leg3 = this.add.rectangle(7, 6, 2, 16, 0x3b3228)
            .setOrigin(0.5, 0)
            .setAngle(48);

        this.carapanaVisual.add([
            wingTop,
            wingBottom,
            leg1,
            leg2,
            leg3,
            abdomen,
            thorax,
            head,
            proboscis
        ]);

        this.carapanaVisual.parts = {
            abdomen,
            thorax,
            head,
            wingTop,
            wingBottom,
            proboscis
        };
    }

    updateCarapana (time)
    {
        if (this.phaseCompleted || !this.carapana || !this.carapana.body || !this.carapanaAlive)
        {
            return;
        }

        const patrol = this.carapanaPatrol;
        const dx = this.player.x - this.carapana.x;
        const dy = this.player.y - this.carapana.y;
        const distance = Math.hypot(dx, dy);

        if (distance <= patrol.detectionRadius)
        {
            this.carapanaReturning = true;

            if (distance > 1)
            {
                this.carapana.body.setVelocity(
                    (dx / distance) * patrol.chaseSpeed,
                    (dy / distance) * patrol.chaseSpeed
                );
            }
        }
        else
        {
            const outsidePatrol =
                this.carapana.x < patrol.minX ||
                this.carapana.x > patrol.maxX ||
                Math.abs(this.carapana.y - patrol.baseY) > 24;

            if (this.carapanaReturning || outsidePatrol)
            {
                const returnDx = patrol.baseX - this.carapana.x;
                const returnDy = patrol.baseY - this.carapana.y;
                const returnDistance = Math.hypot(returnDx, returnDy);

                if (returnDistance > 18)
                {
                    this.carapana.body.setVelocity(
                        (returnDx / returnDistance) * patrol.returnSpeed,
                        (returnDy / returnDistance) * patrol.returnSpeed
                    );
                }
                else
                {
                    this.carapanaReturning = false;
                    this.carapana.setPosition(
                        Math.min(patrol.maxX, Math.max(patrol.minX, this.carapana.x)),
                        patrol.baseY
                    );
                    this.carapana.body.setVelocity(patrol.patrolSpeed, 0);
                    this.carapanaFacing = 1;
                }
            }
            else
            {
                this.carapana.body.setVelocityY(0);

                if (this.carapana.x >= patrol.maxX)
                {
                    this.carapana.body.setVelocityX(-patrol.patrolSpeed);
                    this.carapanaFacing = -1;
                }
                else if (this.carapana.x <= patrol.minX)
                {
                    this.carapana.body.setVelocityX(patrol.patrolSpeed);
                    this.carapanaFacing = 1;
                }
            }
        }

        if (this.carapana.body.velocity.x > 1)
        {
            this.carapanaFacing = 1;
        }
        else if (this.carapana.body.velocity.x < -1)
        {
            this.carapanaFacing = -1;
        }

        const seconds = time * 0.001;
        const hover = Math.sin(seconds * 5.5) * 4;
        const wingBeat = Math.sin(seconds * 34) * 18;
        const tilt = Math.max(-8, Math.min(8, this.carapana.body.velocity.y * 0.05));

        this.carapanaVisual.setPosition(
            this.carapana.x,
            this.carapana.y + hover
        );
        this.carapanaVisual.setScale(this.carapanaFacing, 1);
        this.carapanaVisual.setAngle(tilt);

        this.carapanaVisual.parts.wingTop.angle = -18 + wingBeat;
        this.carapanaVisual.parts.wingBottom.angle = 18 - wingBeat;
        this.carapanaVisual.parts.abdomen.y = Math.sin(seconds * 7) * 1.2;
        this.carapanaVisual.parts.head.y = -1 + Math.sin(seconds * 7 + 0.7) * 0.8;
    }

    handleCarapanaContact ()
    {
        if (
            this.phaseCompleted ||
            !this.carapanaAlive ||
            this.isPlayerDead ||
            this.time.now < this.invulnerableUntil
        )
        {
            return;
        }

        this.health = Math.max(0, this.health - 10);
        this.invulnerableUntil = this.time.now + 1000;
        this.knockbackUntil = this.time.now + 120;

        const direction = this.player.x < this.carapana.x ? -1 : 1;
        this.player.body.setVelocityX(120 * direction);

        this.updateHealthHud();
        this.flashPlayerDamage();

        if (this.health <= 0)
        {
            this.handlePlayerDeath();
        }
    }

    tryHitCarapana ()
    {
        if (
            !this.isAttacking ||
            !this.attackHitbox.body.enable ||
            this.attackHitCarapanaRegistered ||
            !this.carapanaAlive
        )
        {
            return;
        }

        this.attackHitCarapanaRegistered = true;
        this.damageCarapana(25);
    }

    damageCarapana (amount)
    {
        if (!this.carapanaAlive)
        {
            return;
        }

        this.carapanaHealth = Math.max(0, this.carapanaHealth - amount);

        if (this.carapanaHealth <= 0)
        {
            this.defeatCarapana();
        }
    }

    defeatCarapana ()
    {
        if (!this.carapanaAlive)
        {
            return;
        }

        this.carapanaAlive = false;
        this.carapana.body.setVelocity(0, 0);
        this.carapana.body.enable = false;

        this.tweens.add({
            targets: this.carapanaVisual,
            y: this.carapanaVisual.y + 70,
            angle: 75,
            alpha: 0,
            duration: 520,
            ease: 'Quad.In',
            onComplete: () => {
                this.carapanaVisual.setVisible(false);
            }
        });
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

        const fruitData = [
            { x: 380, y: 620, color: 0xc94432 },
            { x: 880, y: 495, color: 0xe0b843 },
            { x: 1450, y: 620, color: 0xd77a2f },
            { x: 2030, y: 545, color: 0xc94432 },
            { x: 2390, y: 620, color: 0xe0b843 }
        ];

        fruitData.forEach((data, index) => {
            const visual = this.add.container(data.x, data.y).setDepth(18);

            const body = this.add.circle(0, 0, 9, data.color);
            const shine = this.add.circle(-3, -3, 2.5, 0xffffff, 0.42);