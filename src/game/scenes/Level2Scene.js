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
        this.createEnvironmentalChallenges();
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
        this.firstDoubleJumpPending = false;
        this.jumpsUsed = 0;
        this.jumpWasDown = false;
        this.wasGrounded = false;
        this.jumpBufferUntil = 0;
        this.jumpBufferMs = 130;
        this.coyoteTimeMs = 100;
        this.coyoteUntil = 0;
        this.lastAirVelocityY = 0;
        this.fastFallActive = false;
        this.motionFx = { scaleX: 1, scaleY: 1 };
        this.directionFx = { lean: 0 };
        this.lastMoveDirection = 0;

        this.maxStamina = 100;
        this.stamina = 100;
        this.doubleJumpStaminaCost = 30;
        this.staminaRegenDelay = 350;
        this.staminaGroundRegen = 40;
        this.staminaAirRegen = 12;
        this.staminaRegenBlockedUntil = 0;
        this.lastStaminaUpdateAt = this.time.now;
        this.nextStaminaFeedbackAt = 0;

        this.isAttacking = false;
        this.attackStartedAt = 0;
        this.nextAttackAt = 0;
        this.attackDirection = 1;
        this.attackBufferUntil = 0;
        this.attackBufferMs = 100;
        this.attackVisualVariant = -1;
        this.attackArcShown = false;
        this.attackHitSnakeRegistered = false;
        this.attackHitCarapanaRegistered = false;
        this.attackHitCurupiraRegistered = false;
        this.attackBlockCurupiraRegistered = false;

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
        this.keyS = this.input.keyboard.addKey('S');
        this.spaceKey = this.input.keyboard.addKey('SPACE');
        this.keyJ = this.input.keyboard.addKey('J');
        this.keyX = this.input.keyboard.addKey('X');

        this.keyJ.on('down', () => this.queueAttackInput());
        this.keyX.on('down', () => this.queueAttackInput());

        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setDeadzone(220, 160);

        this.createHud();
        this.createHealthHud();
        this.createHungerHud();
        this.createStaminaHud();
        this.staminaHud.setVisible(false);
        this.showLevelTitle();

        this.spawnPoint = { x: 150, y: 560 };
    }

    createDeepForest ()
    {
        // Mesmo vocabulário visual da Fase 1, porém mais fechado e úmido.
        const sky = this.add.graphics().setDepth(-50).setScrollFactor(0);
        sky.fillStyle(0x04110e, 1);
        sky.fillRect(0, 0, 1024, 768);
        sky.fillStyle(0x08201b, 0.62);
        sky.fillRect(0, 185, 1024, 300);
        sky.fillStyle(0x0d2a23, 0.25);
        sky.fillRect(0, 455, 1024, 313);

        // Lua parcialmente encoberta para comunicar mata mais profunda.
        this.add.circle(810, 126, 86, 0xc9d7c9, 0.055)
            .setDepth(-49)
            .setScrollFactor(0.035);
        this.add.circle(810, 126, 50, 0xdce4d5, 0.52)
            .setDepth(-48)
            .setScrollFactor(0.035);
        this.add.ellipse(790, 124, 125, 48, 0x0b261d, 0.42)
            .setDepth(-47)
            .setScrollFactor(0.04);

        // FUNDO: silhuetas irregulares, sem formar uma parede contínua.
        const distant = this.add.graphics().setDepth(-40).setScrollFactor(0.12);
        distant.fillStyle(0x071a14, 0.96);
        distant.fillRect(-350, 510, this.worldWidth + 900, 280);

        const distantTrees = [
            [20, 420, 22, 205, 72], [145, 462, 17, 165, 58],
            [305, 390, 27, 235, 88], [515, 438, 20, 188, 65],
            [735, 365, 31, 260, 102], [990, 445, 19, 180, 62],
            [1190, 405, 25, 220, 84], [1400, 455, 18, 170, 58],
            [1575, 372, 33, 255, 104], [1840, 430, 23, 195, 75],
            [2060, 395, 29, 230, 90], [2305, 448, 18, 178, 60],
            [2490, 360, 34, 265, 108], [2760, 425, 23, 200, 78],
            [3000, 382, 30, 245, 94], [3240, 450, 18, 175, 58]
        ];

        distantTrees.forEach(([x, y, trunkW, trunkH, crown], index) => {
            distant.fillStyle(index % 3 === 0 ? 0x0d2a20 : 0x10271f, 0.88);
            distant.fillRect(x, y, trunkW, trunkH);
            distant.fillStyle(index % 2 === 0 ? 0x0a241b : 0x0d2b20, 0.92);
            distant.fillCircle(x + trunkW / 2, y - 4, crown);
            distant.fillCircle(x - crown * 0.45, y + 18, crown * 0.58);
            distant.fillCircle(x + crown * 0.52, y + 26, crown * 0.64);
        });

        // MEIO: árvores maiores, troncos bem visíveis, copas com alturas variadas.
        const middle = this.add.graphics().setDepth(-24).setScrollFactor(0.45);
        const middleTrees = [
            [85, 320, 40, 335, 0.92, true], [360, 260, 52, 395, 1.08, false],
            [690, 350, 34, 305, 0.84, true], [1010, 285, 48, 370, 1.02, false],
            [1320, 335, 38, 320, 0.9, true], [1600, 245, 56, 410, 1.12, false],
            [1940, 325, 40, 330, 0.94, true], [2240, 275, 50, 380, 1.05, false],
            [2550, 342, 36, 313, 0.86, true], [2845, 252, 54, 403, 1.1, false],
            [3160, 330, 38, 325, 0.9, true]
        ];
        middleTrees.forEach(([x, y, w, h, scale, left]) => this.drawDeepTree(middle, x, y, w, h, scale, left));

        // Cipós em uma camada intermediária separada.
        const vines = this.add.graphics().setDepth(-13).setScrollFactor(0.58);
        vines.lineStyle(5, 0x173f29, 0.72);
        [[280,30,365],[760,55,430],[1210,25,390],[1710,40,455],[2150,25,390],[2670,55,440],[3090,35,400]].forEach(([x, top, bottom], i) => {
            vines.beginPath();
            vines.moveTo(x, top);
            vines.lineTo(x + (i % 2 === 0 ? -12 : 10), bottom * 0.58);
            vines.lineTo(x + (i % 2 === 0 ? 7 : -9), bottom);
            vines.strokePath();
        });

        // Seringueiras pontuais preservam a identidade do projeto.
        const rubber = this.add.graphics().setDepth(7).setScrollFactor(0.96);
        [
            [520, 390, 42, 265], [1465, 375, 44, 280],
            [2160, 392, 40, 263], [3020, 365, 46, 290]
        ].forEach(([x, y, trunkW, trunkH], index) => {
            rubber.fillStyle(0x4b3424, 0.96);
            rubber.fillRect(x, y, trunkW, trunkH);
            rubber.fillStyle(0x61452e, 0.5);
            rubber.fillRect(x + 7, y, 8, trunkH);

            rubber.lineStyle(4, 0xc3a477, 0.9);
            rubber.beginPath();
            rubber.moveTo(x + 7, y + 144);
            rubber.lineTo(x + trunkW - 7, y + 127);
            rubber.strokePath();

            rubber.lineStyle(2, 0xd8d3c3, 0.66);
            rubber.beginPath();
            rubber.moveTo(x + trunkW - 8, y + 130);
            rubber.lineTo(x + trunkW * 0.56, y + 170);
            rubber.strokePath();

            rubber.fillStyle(0x8c7558, 0.95);
            rubber.fillEllipse(x + trunkW * 0.55, y + 184, 28, 12);
            rubber.fillStyle(0xe7e1cf, 0.66);
            rubber.fillEllipse(x + trunkW * 0.55, y + 181, 20, 5);

            const crownY = y - 14;
            rubber.fillStyle(index % 2 === 0 ? 0x15432b : 0x123b27, 0.95);
            rubber.fillCircle(x + trunkW / 2, crownY, 68);
            rubber.fillCircle(x - 40, crownY + 18, 46);
            rubber.fillCircle(x + 68, crownY + 22, 51);
        });

        // Raízes visuais no plano de gameplay, sem física adicional.
        const roots = this.add.graphics().setDepth(4);
        roots.lineStyle(13, 0x3b2a1d, 0.88);
        [[410,650,525,610],[865,650,990,603],[1480,650,1605,592],[2160,650,2290,602],[2570,650,2690,606],[2890,650,3000,588]].forEach(([x1,y1,x2,y2]) => {
            roots.beginPath();
            roots.moveTo(x1, y1);
            roots.lineTo(x2, y2);
            roots.strokePath();
        });

        // Névoa: mais presente que na Fase 1, porém atrás do gameplay.
        this.add.rectangle(640, 490, 1650, 126, 0xa7c2b3, 0.065)
            .setDepth(-18)
            .setScrollFactor(0.18);
        this.add.rectangle(1930, 548, 2450, 100, 0xd5e0d7, 0.045)
            .setDepth(-16)
            .setScrollFactor(0.38);
        this.add.rectangle(2520, 520, 820, 150, 0xc8d8ce, 0.07)
            .setDepth(-11)
            .setScrollFactor(0.68);

        // Pequenas manchas de luar ajudam a quebrar o escuro contínuo.
        this.add.ellipse(790, 572, 330, 78, 0xb9cab7, 0.025)
            .setDepth(-9)
            .setScrollFactor(0.72);
        this.add.ellipse(2140, 548, 410, 92, 0xb9cab7, 0.024)
            .setDepth(-9)
            .setScrollFactor(0.72);

        // FRENTE: arbustos, capim e folhas com transparência para manter leitura do jogador.
        const foreground = this.add.graphics().setDepth(30).setScrollFactor(1.08).setAlpha(0.74);
        const shrubs = [
            [30,646,42],[160,648,31],[370,646,38],[650,647,34],[830,646,42],
            [1110,647,30],[1300,646,40],[1530,647,33],[1760,646,44],[2010,648,31],
            [2260,646,39],[2475,647,35],[2710,646,42],[2960,647,32],[3210,646,40]
        ];
        shrubs.forEach(([x, y, size], index) => {
            foreground.fillStyle(index % 2 === 0 ? 0x0b2518 : 0x12351f, 0.94);
            foreground.fillCircle(x, y, size);
            foreground.fillCircle(x + size * 0.72, y + 5, size * 0.7);
        });

        foreground.lineStyle(4, 0x183e24, 0.9);
        [90, 470, 910, 1370, 1870, 2320, 2780, 3170].forEach((x, index) => {
            for (let i = 0; i < 4; i += 1) {
                foreground.beginPath();
                foreground.moveTo(x + i * 10, 658);
                foreground.lineTo(x - 10 + i * 8, 625 - (i % 2) * 14 - (index % 3) * 3);
                foreground.strokePath();
            }
        });
    }

    drawDeepTree (graphics, x, y, trunkWidth, trunkHeight, crownScale, branchLeft)
    {
        graphics.fillStyle(0x3b2b1f, 0.94);
        graphics.fillRect(x, y, trunkWidth, trunkHeight);
        graphics.fillStyle(0x4c3726, 0.5);
        graphics.fillRect(x + trunkWidth * 0.18, y, trunkWidth * 0.18, trunkHeight);

        graphics.lineStyle(9, 0x38291d, 0.82);
        graphics.beginPath();
        graphics.moveTo(x + trunkWidth * 0.5, y + 76);
        graphics.lineTo(x + (branchLeft ? -58 : 88), y + 8);
        graphics.strokePath();

        const cx = x + trunkWidth / 2;
        const cy = y - 6;
        graphics.fillStyle(0x0f3423, 0.96);
        graphics.fillCircle(cx, cy, 72 * crownScale);
        graphics.fillCircle(cx - 62 * crownScale, cy + 24, 50 * crownScale);
        graphics.fillCircle(cx + 64 * crownScale, cy + 18, 54 * crownScale);
        graphics.fillStyle(0x17472d, 0.62);
        graphics.fillCircle(cx - 12, cy - 24, 43 * crownScale);
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

        // Colisões preservadas exatamente.
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

        add(2860, 505, 180, 28);
        add(3110, 390, 190, 28);

        const terrain = this.add.graphics().setDepth(5);
        const ground = [
            [0, 652, 800, 116], [860, 652, 600, 116], [1520, 652, 760, 116], [2340, 652, 960, 116]
        ];

        ground.forEach(([x, y, w, h], i) => {
            terrain.fillStyle(i % 2 === 0 ? 0x4b3423 : 0x513824, 1);
            terrain.fillRect(x, y, w, h);
            terrain.fillStyle(0x284f2d, 1);
            terrain.fillRect(x, y, w, 12);
            terrain.fillStyle(0x173823, 0.92);
            terrain.fillRect(x, y + 12, w, 9);
        });

        // Barro, manchas, pedras e raízes: detalhe puramente visual.
        terrain.fillStyle(0x6a4a2d, 0.52);
        [[125,692,88],[390,726,116],[905,694,96],[1190,728,110],[1580,700,104],[1910,726,132],[2410,700,95],[2760,728,118],[3130,692,90]].forEach(([x,y,w]) => {
            terrain.fillEllipse(x, y, w, 18);
        });

        terrain.fillStyle(0x3d3024, 0.62);
        [[250,682,20,8],[705,706,28,10],[1090,684,24,9],[1735,708,30,11],[2220,686,22,9],[2630,711,30,10],[3040,687,24,9]].forEach(([x,y,w,h]) => {
            terrain.fillEllipse(x, y, w, h);
        });

        terrain.lineStyle(6, 0x2c2118, 0.76);
        [[180,656,265,710],[510,658,600,716],[960,657,1045,712],[1505,658,1590,716],[1840,658,1925,720],[2410,657,2505,714],[2940,657,3030,715]].forEach(([x1,y1,x2,y2]) => {
            terrain.beginPath();
            terrain.moveTo(x1, y1);
            terrain.lineTo(x2, y2);
            terrain.strokePath();
        });

        // Aparência natural sobre os corpos físicos já existentes.
        this.drawLevel2NaturalPlatform(terrain, 485, 576, 150, 28, 'log');
        this.drawLevel2NaturalPlatform(terrain, 815, 521, 170, 28, 'bank');
        this.drawLevel2NaturalPlatform(terrain, 1285, 585, 130, 30, 'root');
        this.drawLevel2NaturalPlatform(terrain, 1525, 526, 190, 28, 'log');
        this.drawLevel2NaturalPlatform(terrain, 1975, 570, 150, 30, 'bank');
        this.drawLevel2NaturalPlatform(terrain, 2210, 521, 160, 28, 'root');
        this.drawLevel2NaturalPlatform(terrain, 2770, 491, 180, 28, 'log');
        this.drawLevel2NaturalPlatform(terrain, 3015, 376, 190, 28, 'bank');
    }

    drawLevel2NaturalPlatform (graphics, x, y, width, height, type)
    {
        if (type === 'log') {
            graphics.fillStyle(0x49311f, 1);
            graphics.fillRoundedRect(x, y, width, height, 12);
            graphics.fillStyle(0x6b4a2b, 0.72);
            graphics.fillRect(x + 10, y + 5, width - 20, 5);
            graphics.fillStyle(0x2d5932, 0.92);
            graphics.fillRect(x + 8, y - 4, width - 16, 6);
            graphics.fillStyle(0x7b5a3d, 0.45);
            graphics.fillCircle(x + width - 12, y + height / 2, Math.min(10, height * 0.32));
        } else if (type === 'root') {
            graphics.fillStyle(0x4b3422, 1);
            graphics.fillRoundedRect(x, y + 7, width, Math.max(18, height - 7), 10);
            graphics.lineStyle(7, 0x5e4229, 0.95);
            graphics.beginPath();
            graphics.moveTo(x + 5, y + height - 3);
            graphics.lineTo(x + width * 0.42, y + 3);
            graphics.lineTo(x + width - 4, y + height - 5);
            graphics.strokePath();
            graphics.fillStyle(0x2b5530, 0.88);
            graphics.fillRect(x + 10, y, width - 20, 6);
        } else {
            graphics.fillStyle(0x5a3c25, 1);
            graphics.fillRoundedRect(x, y, width, height, 8);
            graphics.fillStyle(0x315d34, 0.96);
            graphics.fillRect(x, y, width, 7);
            graphics.fillStyle(0x714d2e, 0.48);
            graphics.fillEllipse(x + width * 0.56, y + height * 0.68, width * 0.46, height * 0.32);
        }
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

        visual.setScale(
            visual.facing * this.motionFx.scaleX,
            this.motionFx.scaleY
        );

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
            bodyOffsetY = 1.5;
            torsoY = -5;
            torsoAngle = 6;
            headY = -32;
            hatY = -45;
            hatAngle = 4;
            leftArmAngle = -46;
            rightArmAngle = 42;
            leftLegAngle = -24;
            rightLegAngle = 20;
            leftLegY = 18;
            rightLegY = 17;
        }

        torsoAngle += this.directionFx.lean;
        parts.machete.angle = state === 'FALL' ? 28 : 18;
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

    queueAttackInput ()
    {
        const now=this.time.now;
        if(this.phaseCompleted||this.isPlayerDead)return;

        if(!this.isAttacking&&now>=this.nextAttackAt){
            this.startAttack();
            return;
        }

        const remaining=this.nextAttackAt-now;
        if(remaining>0&&remaining<=this.attackBufferMs){
            this.attackBufferUntil=this.nextAttackAt+60;
        }
    }

    showMacheteArc (direction,variant)
    {
        const angles=variant===0?[-36,-18,2]:[-15,0,14];
        for(let i=0;i<3;i++){
            const x=this.player.x+direction*(28+i*9);
            const y=this.player.y+(variant===0?-24+i*10:-12+i*5);
            const segment=this.add.rectangle(
                x,y,26-i*3,3,
                i===1?0xdce2df:0xbfc9c5,
                .3-i*.045
            ).setDepth(24).setAngle(direction*angles[i]);

            this.tweens.add({
                targets:segment,
                x:segment.x+direction*(8+i*2),
                alpha:0,
                scaleX:1.15,
                duration:115+i*12,
                ease:'Quad.Out',
                onComplete:()=>segment.destroy()
            });
        }
    }

    showCombatImpact (x,y,visual,options={})
    {
        const small=options.small===true;
        const boss=options.boss===true;
        const heavy=options.heavy===true;
        const final=options.final===true;
        const count=final?6:boss?5:small?3:heavy?5:4;
        const flash=this.add.circle(
            x,y,
            final?22:boss?18:small?10:14,
            0xf2ead4,
            final?.48:boss?.38:small?.28:.34
        ).setDepth(30);

        this.tweens.add({
            targets:flash,
            scale:final?2.3:1.8,
            alpha:0,
            duration:final?150:120,
            onComplete:()=>flash.destroy()
        });

        for(let i=0;i<count;i++){
            const angle=(-.8+(1.6*i/Math.max(1,count-1)))+(this.attackDirection<0?Math.PI:0);
            const particle=this.add.rectangle(
                x,y,
                small?5:6+(i%2)*2,
                2,
                i%2?0xd8d0b7:0x8ea06b,
                .72
            ).setDepth(30).setAngle(angle*57.2958);

            const distance=(small?16:24)+(i%3)*6+(final?8:0);
            this.tweens.add({
                targets:particle,
                x:x+Math.cos(angle)*distance,
                y:y+Math.sin(angle)*distance,
                alpha:0,
                angle:particle.angle+(i%2?55:-55),
                duration:(small?145:185)+i*10,
                onComplete:()=>particle.destroy()
            });
        }

        if(visual&&visual.parts&&visual.parts.head){
            const head=visual.parts.head;
            const baseX=head.x;
            const recoil=(boss?3:small?2.5:heavy?6:4.5)*this.attackDirection;
            this.tweens.killTweensOf(head);
            this.tweens.add({
                targets:head,
                x:baseX+recoil,
                duration:42,
                yoyo:true,
                ease:'Quad.Out',
                onComplete:()=>{head.x=baseX;}
            });
        }

        const shakeDuration=final?68:boss?56:small?36:heavy?52:46;
        const shakeIntensity=final?.0021:boss?.00155:small?.0007:heavy?.00125:.001;
        this.cameras.main.shake(shakeDuration,shakeIntensity);
    }

    showBlockDeflect (x,y,heavy=false)
    {
        const ring=this.add.circle(x,y,heavy?12:9,0xe7e1cf,.06).setDepth(30);
        ring.setStrokeStyle(2,heavy?0xd6b56c:0xcbd8cf,.58);
        this.tweens.add({
            targets:ring,
            scale:heavy?1.7:1.45,
            alpha:0,
            duration:150,
            onComplete:()=>ring.destroy()
        });

        for(let i=0;i<3;i++){
            const spark=this.add.rectangle(
                x+this.attackDirection*(i*3),
                y+(i-1)*5,
                heavy?10:7,
                2,
                0xe5d4a8,
                .62
            ).setDepth(31).setAngle(this.attackDirection*(-35+i*35));

            this.tweens.add({
                targets:spark,
                x:spark.x-this.attackDirection*(8+i*3),
                y:spark.y+(i-1)*6,
                alpha:0,
                duration:110+i*18,
                onComplete:()=>spark.destroy()
            });
        }
    }

    resetCombatPolishState ()
    {
        this.isAttacking=false;
        this.attackBufferUntil=0;
        this.attackArcShown=false;

        if(this.attackHitbox&&this.attackHitbox.body){
            this.attackHitbox.body.enable=false;
        }

        if(this.playerVisual&&this.playerVisual.parts){
            this.playerVisual.parts.machete.angle=18;
        }

        if('attackHitRegistered' in this)this.attackHitRegistered=false;
        if('attackHitSnakeRegistered' in this)this.attackHitSnakeRegistered=false;
        if('attackHitCarapanaRegistered' in this)this.attackHitCarapanaRegistered=false;
        if('attackHitCurupiraRegistered' in this)this.attackHitCurupiraRegistered=false;
        if('attackBlockCurupiraRegistered' in this)this.attackBlockCurupiraRegistered=false;
        if('attackHitBossRegistered' in this)this.attackHitBossRegistered=false;
    }

    startAttack ()
    {
        const now=this.time.now;
        if(this.phaseCompleted||this.isPlayerDead||this.isAttacking||now<this.nextAttackAt)return false;

        this.isAttacking=true;
        this.attackStartedAt=now;
        this.nextAttackAt=now+400;
        this.attackDirection=this.playerVisual.facing||1;
        this.attackBufferUntil=0;
        this.attackArcShown=false;
        this.attackVisualVariant=(this.attackVisualVariant+1)%2;

        if('attackHitRegistered' in this)this.attackHitRegistered=false;
        if('attackHitSnakeRegistered' in this)this.attackHitSnakeRegistered=false;
        if('attackHitCarapanaRegistered' in this)this.attackHitCarapanaRegistered=false;
        if('attackHitCurupiraRegistered' in this)this.attackHitCurupiraRegistered=false;
        if('attackBlockCurupiraRegistered' in this)this.attackBlockCurupiraRegistered=false;
        if('attackHitBossRegistered' in this)this.attackHitBossRegistered=false;

        return true;
    }

    updateAttack (time)
    {
        if(!this.isAttacking){
            this.attackHitbox.body.enable=false;

            if(this.attackBufferUntil>=time&&time>=this.nextAttackAt){
                this.startAttack();
            } else if(this.attackBufferUntil<time){
                this.attackBufferUntil=0;
            }
            return;
        }

        const elapsed=time-this.attackStartedAt;
        const parts=this.playerVisual.parts;
        const baseArm=this.playerBaseRightArmAngle??parts.rightArmRig.angle;
        const baseTorso=this.playerBaseTorsoAngle??parts.torso.angle;
        const variant=this.attackVisualVariant;

        if(elapsed<70){
            const prep=Math.max(0,elapsed/70);
            parts.rightArmRig.angle=baseArm-(variant===0?28:22)*prep;
            parts.machete.angle=18-(variant===0?32:22)*prep;
            parts.torso.angle=baseTorso-(variant===0?5:3)*prep;
        } else if(elapsed<90){
            const release=(elapsed-70)/20;
            const armStart=variant===0?12:8;
            const bladeStart=variant===0?28:23;
            parts.rightArmRig.angle=baseArm-(variant===0?28:22)+(armStart+(variant===0?28:22))*release;
            parts.machete.angle=(variant===0?-14:-4)+(bladeStart-(variant===0?-14:-4))*release;
            parts.torso.angle=baseTorso-(variant===0?5:3)+(variant===0?7:4)*release;
        } else if(elapsed<=210){
            const active=(elapsed-90)/120;
            const swing=Math.sin(active*Math.PI);
            const armStart=variant===0?12:8;
            const bladeStart=variant===0?28:23;
            parts.rightArmRig.angle=baseArm+armStart+(variant===0?48:40)*swing;
            parts.machete.angle=bladeStart+(variant===0?40:30)*swing;
            parts.torso.angle=baseTorso+(variant===0?2:1)+(variant===0?6:4)*swing;

            this.attackHitbox.body.enable=true;
            this.attackHitbox.setPosition(
                this.player.x+(46*this.attackDirection),
                this.player.y+(-2)
            );

            if(!this.attackArcShown){
                this.attackArcShown=true;
                this.showMacheteArc(this.attackDirection,variant);
            }
        } else {
            this.attackHitbox.body.enable=false;
            const recovery=Math.min(1,(elapsed-210)/90);
            const armStart=variant===0?12:8;
            const bladeStart=variant===0?28:23;
            parts.rightArmRig.angle=baseArm+armStart*(1-recovery);
            parts.machete.angle=bladeStart+(18-bladeStart)*recovery;
            parts.torso.angle=baseTorso+(variant===0?2:1)*(1-recovery);
        }

        if(elapsed>=300){
            this.isAttacking=false;
            this.attackHitbox.body.enable=false;
            parts.machete.angle=18;
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
        this.showCombatImpact(
            this.snake.x,
            this.snake.y - 4,
            this.snakeVisual,
            { heavy: this.snakeHealth <= 0 }
        );

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
                const returnDx = patrol.baseX - this.carapana.x;                const returnDy = patrol.baseY - this.carapana.y;
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
        this.showCombatImpact(
            this.carapana.x,
            this.carapana.y,
            this.carapanaVisual,
            { small: true }
        );

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
        this.resetCombatPolishState();
        this.player.body.setVelocity(0, 0);
        this.time.delayedCall(650, () => {
            this.player.setPosition(this.spawnPoint.x, this.spawnPoint.y);
            this.player.body.setVelocity(0, 0);
            this.health = 100;
            this.hunger = 100;
            this.stamina = this.maxStamina;
            this.staminaRegenBlockedUntil = 0;
            this.resetMovementPolishState(); this.resetCombatPolishState();
            this.resetEnvironmentalChallenges();
            this.nextHungerDrainAt = this.time.now + 2000;
            this.nextStarvationDamageAt = this.time.now + 2000;
            this.invulnerableUntil = this.time.now + 1000;
            this.isPlayerDead = false;
            this.updateHealthHud();
            this.updateHungerHud();
            this.updateStaminaHud();
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
            const stem = this.add.rectangle(0, -11, 3, 7, 0x5b4324).setOrigin(0.5, 1);
            const leaf = this.add.ellipse(6, -13, 10, 5, 0x4f7a38)
                .setAngle(-24);

            visual.add([body, shine, stem, leaf]);

            const sensor = this.add.rectangle(data.x, data.y, 26, 30, 0x000000, 0);
            this.physics.add.existing(sensor);

            sensor.body.setAllowGravity(false);
            sensor.body.setImmovable(true);

            const fruit = {
                visual,
                sensor,
                baseY: data.y,
                phase: index * 0.85,
                collected: false
            };

            this.fruits.push(fruit);

            this.physics.add.overlap(this.player, sensor, () => {
                this.collectFruit(fruit);
            });
        });
    }

    collectFruit (fruit)
    {
        if (fruit.collected)
        {
            return;
        }

        fruit.collected = true;
        fruit.sensor.body.enable = false;

        this.hunger = Math.min(this.maxHunger, this.hunger + 25);
        this.health = Math.min(this.maxHealth, this.health + 10);
        this.updateHungerHud();
        this.updateHealthHud();

        const feedback = this.add.text(
            fruit.visual.x,
            fruit.visual.y - 18,
            '+25 FOME\n+10 VIDA',
            {
                fontFamily: 'Arial',
                fontSize: '18px',
                fontStyle: 'bold',
                color: '#dff2a2',
                stroke: '#17301d',
                strokeThickness: 3
            }
        )
            .setOrigin(0.5)
            .setDepth(40);

        this.tweens.add({
            targets: fruit.visual,
            y: fruit.visual.y - 12,
            scaleX: 1.25,
            scaleY: 1.25,
            alpha: 0,
            duration: 220,
            ease: 'Quad.Out',
            onComplete: () => {
                fruit.visual.setVisible(false);
            }
        });

        this.tweens.add({
            targets: feedback,
            y: feedback.y - 24,
            alpha: 0,
            duration: 500,
            ease: 'Quad.Out',
            onComplete: () => {
                feedback.destroy();
            }
        });
    }

    updateFruits (time)
    {
        const seconds = time * 0.001;

        this.fruits.forEach((fruit) => {
            if (fruit.collected)
            {
                return;
            }

            const wave = Math.sin(seconds * 2.4 + fruit.phase);
            const pulse = 1 + Math.sin(seconds * 2.8 + fruit.phase) * 0.035;

            fruit.visual.y = fruit.baseY + wave * 3;
            fruit.visual.setScale(pulse);
        });
    }

    createArena ()
    {
        this.arenaStarted = false;
        this.arenaCleared = false;
        this.arenaMinX = 2450;
        this.arenaMaxX = 2860;

        // Clareira do guardião: decoração estática, sem alterar física ou limites.
        const arenaVisual = this.add.graphics().setDepth(6);
        arenaVisual.fillStyle(0x13291d, 0.34);
        arenaVisual.fillEllipse(2655, 635, 450, 62);
        arenaVisual.lineStyle(15, 0x3a281c, 0.82);
        [[2460,650,2515,600],[2825,650,2770,596]].forEach(([x1,y1,x2,y2]) => {
            arenaVisual.beginPath();
            arenaVisual.moveTo(x1, y1);
            arenaVisual.lineTo(x2, y2);
            arenaVisual.strokePath();
        });
        arenaVisual.fillStyle(0x315a37, 0.64);
        [[2495,626,26],[2530,634,18],[2795,628,24],[2762,636,17]].forEach(([x,y,r]) => arenaVisual.fillCircle(x, y, r));

        this.add.rectangle(2650, 520, 520, 138, 0xc8d8ce, 0.045)
            .setDepth(-8)
            .setScrollFactor(0.72);

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
        this.curupiraLandingImpactShown = false;
        this.curupiraLandingMarker = null;

        this.curupiraVisual = this.add.container(this.curupira.x, this.curupira.y).setDepth(21).setVisible(false);
        const leftFoot = this.add.rectangle(-9, 26, 12, 22, 0x5c3b28).setAngle(18);
        const rightFoot = this.add.rectangle(9, 26, 12, 22, 0x5c3b28).setAngle(-18);
        const body = this.add.rectangle(0, 0, 30, 42, 0x355a35);
        const head = this.add.circle(0, -31, 13, 0x996247);
        const hair = this.add.ellipse(0, -43, 35, 20, 0xb74427);
        this.curupiraVisual.add([leftFoot, rightFoot, body, head, hair]);
        this.curupiraVisual.parts = { leftFoot, rightFoot, body, head, hair };

        this.curupiraBossHud = this.add.container(512, 155).setScrollFactor(0).setDepth(160).setVisible(false);
        const bg = this.add.rectangle(0, 0, 430, 58, 0x06100d, 0.9).setOrigin(0.5, 0);
        bg.setStrokeStyle(1, 0x8c7558, 0.55);
        this.curupiraBossName = this.add.text(-170, 7, 'CURUPIRA', {
            fontFamily: 'Arial Black',
            fontSize: '15px',
            color: '#f1e1ae'
        }).setOrigin(0, 0);
        this.curupiraBossText = this.add.text(170, 7, '100/100', {
            fontFamily: 'Arial Black',
            fontSize: '15px',
            color: '#ffffff'
        }).setOrigin(1, 0);
        this.curupiraBossBarBack = this.add.rectangle(-170, 36, 340, 14, 0x301a17, 1).setOrigin(0, 0.5);
        this.curupiraBossBar = this.add.rectangle(-170, 36, 340, 14, 0xb64a32, 1).setOrigin(0, 0.5);
        this.curupiraBossHud.add([
            bg,
            this.curupiraBossName,
            this.curupiraBossText,
            this.curupiraBossBarBack,
            this.curupiraBossBar
        ]);
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
            panel.destroy();
            text.destroy();
            this.beginCurupiraPreparation(this.time.now + 180);
        });
    }

    beginCurupiraPreparation (startAt = this.time.now)
    {
        if (this.arenaCleared) return;

        this.curupiraState = 'PREPARE';
        this.curupira.body.setVelocity(0, 0);
        this.curupiraAttackPattern = (this.curupiraAttackPattern + 1) % 3;
        this.curupiraNextActionAt = startAt + 300;

        this.curupiraVisual.setAlpha(1);
        this.curupiraVisual.setScale(1, 1);

        if (this.curupiraAttackPattern === 1) {
            this.curupiraVisual.setAngle(0);
            this.curupiraVisual.setScale(1.08, 0.84);
        } else {
            const lean = this.player.x < this.curupira.x ? -9 : 9;
            this.curupiraVisual.setAngle(this.curupiraAttackPattern === 2 ? -lean : lean);
            this.curupiraVisual.setScale(1.04, 0.97);
        }
    }

    updateCurupira (time)
    {
        this.curupiraVisual.setPosition(this.curupira.x, this.curupira.y);
        if (!this.arenaStarted || this.arenaCleared || this.curupiraState === 'INTRO' || this.curupiraState === 'DEFEATED') return;

        if (this.curupiraState === 'PREPARE') {
            this.curupira.body.setVelocity(0, 0);
            if (time >= this.curupiraNextActionAt) {
                this.curupiraVisual.setAngle(0);
                this.curupiraVisual.setScale(1, 1);
                this.curupiraState = 'ATTACK';

                if (this.curupiraAttackPattern === 0) this.curupiraDash(time);
                else if (this.curupiraAttackPattern === 1) this.curupiraJump(time);
                else this.curupiraFeint(time);
            }
            return;
        }

        if (this.curupiraState === 'RECOVERY') {
            this.curupira.body.setVelocityX(0);
            if (time >= this.curupiraNextActionAt) {
                this.enterCurupiraVulnerable(time);
            }
            return;
        }

        if (this.curupiraState === 'VULNERABLE') {
            this.curupira.body.setVelocity(0, 0);
            if (time >= this.curupiraNextActionAt) {
                this.resetCurupiraPose();
                this.beginCurupiraPreparation(time + 120);
            }
            return;
        }

        if (this.curupiraState === 'HIT') {
            this.curupira.body.setVelocity(0, 0);
            if (time >= this.curupiraNextActionAt) {
                this.resetCurupiraPose();
                this.beginCurupiraPreparation(time + 120);
            }
            return;
        }

        if (this.curupiraAttackPattern === 1 && this.curupiraLandingMarker && this.curupiraLandingDangerUntil > 0) {
            this.curupiraLandingMarker.setPosition(this.curupira.x, 640);
        }

        if (this.curupiraAttackPattern === 1 && this.curupira.body.blocked.down && this.curupiraLandingDangerUntil > 0) {
            if (!this.curupiraLandingImpactShown) {
                this.curupiraLandingImpactShown = true;
                this.showCurupiraLandingImpact();
            }

            if (time <= this.curupiraLandingDangerUntil) {
                if (Math.abs(this.player.x - this.curupira.x) < 90 && Math.abs(this.player.y - this.curupira.y) < 80) {
                    this.damagePlayer(20, this.player.x < this.curupira.x ? -150 : 150, -120);
                }
            } else {
                this.clearCurupiraLandingMarker();
                this.curupiraLandingDangerUntil = 0;
                this.enterCurupiraRecovery(time, 240);
            }
        }
    }

    curupiraDash (time)
    {
        const fromLeft = this.curupira.x < (this.arenaMinX + this.arenaMaxX) / 2;
        this.curupira.setPosition(fromLeft ? this.arenaMinX + 40 : this.arenaMaxX - 40, 590);
        this.curupira.body.setVelocityX(fromLeft ? 330 : -330);
        this.showCurupiraDashLeaves(fromLeft ? 1 : -1);

        this.time.delayedCall(760, () => {
            if (!this.arenaCleared && this.curupiraState === 'ATTACK') {
                this.curupira.body.setVelocityX(0);
                this.enterCurupiraRecovery(this.time.now, 240);
            }
        });
    }

    curupiraJump (time)
    {
        const direction = this.player.x < this.curupira.x ? -1 : 1;
        this.curupiraLandingImpactShown = false;
        this.createCurupiraLandingMarker();
        this.curupira.body.setVelocity(direction * 150, -520);
        this.curupiraLandingDangerUntil = time + 1250;
    }

    curupiraFeint (time)
    {
        const direction = this.player.x < this.curupira.x ? -1 : 1;
        this.curupira.body.setVelocityX(-direction * 210);
        this.curupiraVisual.setAngle(-direction * 7);

        this.time.delayedCall(260, () => {
            if (!this.arenaCleared && this.curupiraState === 'ATTACK') {
                this.curupiraVisual.setAngle(direction * 9);
                this.curupira.body.setVelocityX(direction * 280);
            }
        });

        this.time.delayedCall(720, () => {
            if (!this.arenaCleared && this.curupiraState === 'ATTACK') {
                this.curupira.body.setVelocityX(0);
                this.curupiraVisual.setAngle(0);
                this.enterCurupiraRecovery(this.time.now, 240);
            }
        });
    }

    enterCurupiraRecovery (time, duration = 240)
    {
        this.curupira.body.setVelocity(0, 0);
        this.curupiraState = 'RECOVERY';
        this.curupiraNextActionAt = time + duration;
        this.curupiraVisual.setAlpha(0.9);
        this.curupiraVisual.setAngle(this.player.x < this.curupira.x ? 4 : -4);
        this.curupiraVisual.setScale(1, 0.96);
    }

    enterCurupiraVulnerable (time)
    {
        this.curupira.body.setVelocity(0, 0);
        this.curupiraState = 'VULNERABLE';
        this.curupiraNextActionAt = time + 1200;
        this.curupiraVisual.setAlpha(0.52);
        this.curupiraVisual.setAngle(this.player.x < this.curupira.x ? 10 : -10);
        this.curupiraVisual.setScale(1, 0.86);

        const tiredLeaf = this.add.ellipse(
            this.curupira.x,
            this.curupira.y - 74,
            13,
            6,
            0x8aa85e,
            0.7
        ).setDepth(24);
        this.tweens.add({
            targets: tiredLeaf,
            y: tiredLeaf.y - 18,
            x: tiredLeaf.x + 8,
            angle: 35,
            alpha: 0,
            duration: 720,
            onComplete: () => tiredLeaf.destroy()
        });
    }

    resetCurupiraPose ()
    {
        this.curupiraVisual.setAlpha(1);
        this.curupiraVisual.setAngle(0);
        this.curupiraVisual.setScale(1, 1);
    }

    handleCurupiraContact ()
    {
        if (!this.arenaStarted || this.arenaCleared || this.curupiraState !== 'ATTACK') return;
        this.damagePlayer(15, this.player.x < this.curupira.x ? -180 : 180, -80);
    }

    tryHitCurupira ()
    {
        if (!this.isAttacking || !this.attackHitbox.body.enable || this.arenaCleared) return;

        if (this.curupiraState !== 'VULNERABLE') {
            if (!this.attackBlockCurupiraRegistered) {
                this.attackBlockCurupiraRegistered = true;
                this.showCurupiraBlockFeedback();
            }
            return;
        }

        if (this.attackHitCurupiraRegistered) return;
        this.attackHitCurupiraRegistered = true;

        this.curupiraHealth = Math.max(0, this.curupiraHealth - 25);
        const targetWidth = 340 * (this.curupiraHealth / 100);
        this.tweens.killTweensOf(this.curupiraBossBar);
        this.tweens.add({
            targets: this.curupiraBossBar,
            width: targetWidth,
            duration: 180,
            ease: 'Quad.Out'
        });
        this.curupiraBossText.setText(`${this.curupiraHealth}/100`);

        this.showCurupiraValidHitFeedback();

        if (this.curupiraHealth <= 0) {
            this.defeatCurupira();
        } else {
            this.curupiraState = 'HIT';
            this.curupiraNextActionAt = this.time.now + 420;
        }
    }

    showCurupiraBlockFeedback ()
    {
        const originalAngle = this.curupiraVisual.angle;
        this.showBlockDeflect(
            this.curupira.x - this.attackDirection * 18,
            this.curupira.y - 6,
            false
        );
        this.curupiraVisual.setAlpha(0.35);
        this.curupiraVisual.setAngle(originalAngle + (this.attackDirection * 7));

        const block = this.add.circle(
            this.curupira.x - this.attackDirection * 20,
            this.curupira.y - 5,
            8,
            0xd6b56c,
            0.22
        ).setDepth(25);
        block.setStrokeStyle(2, 0xe7e1cf, 0.55);

        this.tweens.add({
            targets: block,
            scale: 1.8,
            alpha: 0,
            duration: 180,
            onComplete: () => block.destroy()
        });

        this.time.delayedCall(110, () => {
            if (!this.arenaCleared && this.curupiraState !== 'VULNERABLE') {
                this.curupiraVisual.setAlpha(1);
                this.curupiraVisual.setAngle(originalAngle);
            }
        });
    }

    showCurupiraValidHitFeedback ()
    {
        const hitDirection = this.player.x < this.curupira.x ? 1 : -1;
        this.showCombatImpact(
            this.curupira.x,
            this.curupira.y - 7,
            this.curupiraVisual,
            { boss: true }
        );
        this.curupiraVisual.setAlpha(0.25);
        this.curupiraVisual.setAngle(hitDirection * 11);
        this.curupiraVisual.setScale(1.04, 0.92);

        const hitFlash = this.add.circle(this.curupira.x, this.curupira.y - 5, 16, 0xf1e1ae, 0.42).setDepth(25);
        this.tweens.add({
            targets: hitFlash,
            scale: 2.1,
            alpha: 0,
            duration: 150,
            onComplete: () => hitFlash.destroy()
        });

        this.time.delayedCall(110, () => {
            if (!this.arenaCleared && this.curupiraState === 'HIT') {
                this.curupiraVisual.setAlpha(0.82);
                this.curupiraVisual.setAngle(hitDirection * 7);
                this.curupiraVisual.setScale(1, 0.94);
            }
        });
    }

    showCurupiraDashLeaves (direction)
    {
        for (let i = 0; i < 5; i += 1) {
            const leaf = this.add.ellipse(
                this.curupira.x - direction * (12 + i * 6),
                this.curupira.y + 28 - (i % 2) * 8,
                10,
                5,
                i % 2 === 0 ? 0x6d874b : 0x8b6d43,
                0.6
            ).setDepth(18);

            this.tweens.add({
                targets: leaf,
                x: leaf.x - direction * (24 + i * 5),
                y: leaf.y - 10 - (i % 3) * 5,
                angle: direction * (35 + i * 18),
                alpha: 0,
                duration: 320 + i * 35,
                onComplete: () => leaf.destroy()
            });
        }
    }

    createCurupiraLandingMarker ()
    {
        this.clearCurupiraLandingMarker();
        this.curupiraLandingMarker = this.add.ellipse(
            this.curupira.x,
            640,
            170,
            30,
            0xb15f3a,
            0.18
        ).setDepth(15);
        this.curupiraLandingMarker.setStrokeStyle(2, 0xd6b56c, 0.38);

        this.tweens.add({
            targets: this.curupiraLandingMarker,
            alpha: { from: 0.12, to: 0.3 },
            scaleX: 1.08,
            duration: 240,
            yoyo: true,
            repeat: -1
        });
    }

    showCurupiraLandingImpact ()
    {
        if (this.curupiraLandingMarker) {
            this.curupiraLandingMarker.setPosition(this.curupira.x, 640);
        }

        const ring = this.add.ellipse(this.curupira.x, 640, 80, 18, 0xd6b56c, 0.25).setDepth(18);
        this.tweens.add({
            targets: ring,
            scaleX: 2.1,
            scaleY: 1.45,
            alpha: 0,
            duration: 300,
            onComplete: () => ring.destroy()
        });

        for (let i = 0; i < 6; i += 1) {
            const direction = i < 3 ? -1 : 1;
            const leaf = this.add.ellipse(
                this.curupira.x,
                630,
                9,
                4,
                i % 2 === 0 ? 0x6d874b : 0x755137,
                0.7
            ).setDepth(19);
            this.tweens.add({
                targets: leaf,
                x: this.curupira.x + direction * (30 + (i % 3) * 18),
                y: 612 - (i % 3) * 9,
                angle: direction * (35 + i * 16),
                alpha: 0,
                duration: 360,
                onComplete: () => leaf.destroy()
            });
        }
    }

    clearCurupiraLandingMarker ()
    {
        if (this.curupiraLandingMarker) {
            this.tweens.killTweensOf(this.curupiraLandingMarker);
            this.curupiraLandingMarker.destroy();
            this.curupiraLandingMarker = null;
        }
    }

    defeatCurupira ()
    {
        this.arenaCleared = true;
        this.curupiraState = 'DEFEATED';
        this.curupira.body.setVelocity(0, 0);
        this.clearCurupiraLandingMarker();

        this.curupiraBossText.setText('0/100');
        this.tweens.killTweensOf(this.curupiraBossBar);
        this.tweens.add({
            targets: this.curupiraBossBar,
            width: 0,
            duration: 180,
            ease: 'Quad.Out'
        });

        const recoil = this.player.x < this.curupira.x ? 28 : -28;
        this.curupira.setPosition(
            Math.max(this.arenaMinX + 30, Math.min(this.arenaMaxX - 30, this.curupira.x + recoil)),
            this.curupira.y
        );
        this.curupiraVisual.setPosition(this.curupira.x, this.curupira.y + 7);
        this.curupiraVisual.setAlpha(0.88);
        this.curupiraVisual.setAngle(recoil > 0 ? 12 : -12);
        this.curupiraVisual.setScale(1, 0.76);

        this.time.delayedCall(420, () => {
            this.curupiraBossHud.setVisible(false);
            this.arenaBarrier.setVisible(false);
            this.arenaBarrier.body.enable = false;

            const panel = this.add.rectangle(512, 350, 620, 190, 0x06100d, 0.92).setScrollFactor(0).setDepth(190);
            const text = this.add.text(
                512,
                325,
                'A floresta testou seus passos.',
                { fontFamily: 'Arial', fontSize: '23px', color: '#c8d8cc' }
            ).setOrigin(0.5).setScrollFactor(0).setDepth(191);

            this.time.delayedCall(650, () => {
                const skill = this.add.text(
                    512,
                    390,
                    'HABILIDADE DESBLOQUEADA\nSALTO DUPLO',
                    { fontFamily: 'Arial Black', fontSize: '29px', color: '#f1e1ae', align: 'center' }
                ).setOrigin(0.5).setScrollFactor(0).setDepth(191);

                this.showDoubleJumpUnlockEffect();

                this.time.delayedCall(1050, () => {
                    this.doubleJumpUnlocked = true;
                    this.firstDoubleJumpPending = true;
                    this.stamina = this.maxStamina;
                    this.staminaRegenBlockedUntil = 0;
                    this.staminaHud.setVisible(true);
                    this.updateStaminaHud();
                    this.registry.set('doubleJumpUnlocked', true);
                    panel.destroy();
                    text.destroy();
                    skill.destroy();
                    this.showDoubleJumpTutorial();
                });
            });
        });
    }

    showDoubleJumpUnlockEffect ()
    {
        const ring = this.add.circle(this.player.x, this.player.y, 18, 0xd6b56c, 0.2).setDepth(40);
        ring.setStrokeStyle(2, 0xf1e1ae, 0.5);

        this.tweens.add({
            targets: ring,
            scale: 4,
            alpha: 0,
            duration: 700,
            onComplete: () => ring.destroy()
        });

        for (let i = 0; i < 8; i += 1) {
            const angle = (Math.PI * 2 * i) / 8;
            const leaf = this.add.ellipse(
                this.player.x,
                this.player.y,
                10,
                5,
                i % 2 === 0 ? 0x6f8f4e : 0x8aa85e,
                0.82
            ).setDepth(41);

            this.tweens.add({
                targets: leaf,
                x: this.player.x + Math.cos(angle) * 58,
                y: this.player.y + Math.sin(angle) * 48,
                angle: i * 45,
                alpha: 0,
                duration: 650,
                onComplete: () => leaf.destroy()
            });
        }

        this.tweens.add({
            targets: this.playerVisual,
            alpha: { from: 0.45, to: 1 },
            duration: 140,
            yoyo: true,
            repeat: 3,
            onComplete: () => this.playerVisual.setAlpha(1)
        });
    }

    showDoubleJumpTutorial ()
    {
        const tutorial = this.add.text(512, 220, 'SALTO DUPLO\nNo ar, pressione novamente W / ↑ / Espaço.', { fontFamily: 'Arial Black', fontSize: '21px', color: '#f1e1ae', align: 'center', backgroundColor: '#06100dcc', padding: { x: 18, y: 12 } }).setOrigin(0.5).setScrollFactor(0).setDepth(180);
        this.time.delayedCall(3000, () => tutorial.destroy());
    }

    updateGroundedState (grounded)
    {
        const time = this.time.now;
        if (!grounded) this.lastAirVelocityY = this.player.body.velocity.y;
        if (grounded) this.coyoteUntil = time + this.coyoteTimeMs;

        if (grounded && !this.wasGrounded) {
            this.jumpsUsed = 0;
            this.fastFallActive = false;
            this.showLandingFeedback(this.lastAirVelocityY);
            this.lastAirVelocityY = 0;
        }
        this.wasGrounded = grounded;
    }

    queueJumpInput (time)
    {
        this.jumpBufferUntil = time + this.jumpBufferMs;
    }

    consumeJumpBuffer (grounded)
    {
        if (this.jumpBufferUntil < this.time.now) return false;

        if (
            this.jumpsUsed === 0 &&
            (grounded || this.time.now <= this.coyoteUntil)
        ) {
            this.player.body.setVelocityY(-520);
            this.jumpsUsed = 1;
            this.coyoteUntil = 0;
            this.jumpBufferUntil = 0;
            this.showJumpTakeoffEffect();
            this.setMotionSquash(1.07, 0.93, 115);
            return true;
        }

        if (this.doubleJumpUnlocked && this.jumpsUsed === 1 && !grounded) {
            if (this.stamina < this.doubleJumpStaminaCost) {
                this.showStaminaBlockedFeedback();
                this.jumpBufferUntil = 0;
                return false;
            }

            this.spendStamina(this.doubleJumpStaminaCost);
            this.player.body.setVelocityY(-500);
            this.jumpsUsed = 2;
            this.jumpBufferUntil = 0;
            const isFirstDoubleJump = this.firstDoubleJumpPending;
            this.firstDoubleJumpPending = false;
            this.showDoubleJumpBurst(isFirstDoubleJump);
            this.setMotionSquash(1.045, 0.955, 95);
            return true;
        }

        return false;
    }


    applyJumpCut ()
    {
        if (this.player.body.velocity.y < -90)
        {
            this.player.body.setVelocityY(this.player.body.velocity.y * 0.58);
        }
    }

    applyFastFall (grounded)
    {
        const wantsFastFall = this.keyS.isDown || this.cursors.down.isDown;
        const body = this.player.body;

        if (!grounded && wantsFastFall && body.velocity.y > 35)
        {
            body.setVelocityY(Math.min(780, body.velocity.y + 70));
            this.fastFallActive = true;
            return;
        }

        this.fastFallActive = false;
    }

    setMotionSquash (scaleX, scaleY, duration = 110)
    {
        this.tweens.killTweensOf(this.motionFx);
        this.motionFx.scaleX = scaleX;
        this.motionFx.scaleY = scaleY;
        this.tweens.add({
            targets: this.motionFx,
            scaleX: 1,
            scaleY: 1,
            duration,
            ease: 'Quad.Out'
        });
    }

    showJumpTakeoffEffect ()
    {
        for (let i = 0; i < 3; i += 1)
        {
            const leaf = this.add.ellipse(
                this.player.x + (i - 1) * 8,
                this.player.y + 31,
                7 + i,
                3,
                i === 1 ? 0x8b7650 : 0x668d4d,
                0.55
            ).setDepth(18);

            this.tweens.add({
                targets: leaf,
                x: leaf.x + (i - 1) * 12,
                y: leaf.y + 7 + i * 2,
                alpha: 0,
                angle: (i - 1) * 35,
                duration: 180 + i * 25,
                onComplete: () => leaf.destroy()
            });
        }
    }

    showLandingFeedback (impactVelocity)
    {
        if (impactVelocity < 260)
        {
            return;
        }

        const strong = impactVelocity >= 650;
        const medium = impactVelocity >= 420;
        this.setMotionSquash(
            strong ? 1.1 : medium ? 1.07 : 1.035,
            strong ? 0.86 : medium ? 0.9 : 0.95,
            strong ? 120 : 95
        );

        const particles = strong ? 4 : medium ? 3 : 2;
        for (let i = 0; i < particles; i += 1)
        {
            const direction = i % 2 === 0 ? -1 : 1;
            const dust = this.add.ellipse(
                this.player.x + direction * (7 + i * 2),
                this.player.y + 31,
                9,
                4,
                i % 2 ? 0x756346 : 0x5d7b49,
                medium ? 0.62 : 0.42
            ).setDepth(18);

            this.tweens.add({
                targets: dust,
                x: dust.x + direction * (16 + i * 5),
                y: dust.y - (5 + i * 2),
                alpha: 0,
                scaleX: 1.35,
                duration: strong ? 260 : 210,
                onComplete: () => dust.destroy()
            });
        }

        if (strong)
        {
            this.cameras.main.shake(70, 0.0012);
        }
    }

    showDirectionChangeFeedback (direction)
    {
        this.tweens.killTweensOf(this.directionFx);
        this.directionFx.lean = direction * -5;
        this.tweens.add({
            targets: this.directionFx,
            lean: 0,
            duration: 120,
            ease: 'Quad.Out'
        });
    }


    resetMovementPolishState ()
    {
        this.jumpsUsed = 0;
        this.jumpWasDown = false;
        this.jumpBufferUntil = 0;
        this.coyoteUntil = 0;
        this.wasGrounded = false;
        this.lastAirVelocityY = 0;
        this.fastFallActive = false;
        this.lastMoveDirection = 0;
        this.tweens.killTweensOf(this.motionFx);
        this.tweens.killTweensOf(this.directionFx);
        this.motionFx.scaleX = 1;
        this.motionFx.scaleY = 1;
        this.directionFx.lean = 0;
        this.playerVisual.setScale(this.playerVisual.facing || 1, 1);
    }

    spendStamina (amount)
    {
        this.stamina = Math.max(0, this.stamina - amount);
        this.staminaRegenBlockedUntil = this.time.now + this.staminaRegenDelay;
        this.updateStaminaHud();
    }

    updateStamina (time, grounded)
    {
        const delta = Math.min(0.05, Math.max(0, (time - this.lastStaminaUpdateAt) / 1000));
        this.lastStaminaUpdateAt = time;

        if (
            !this.doubleJumpUnlocked ||
            this.phaseCompleted ||
            this.isPlayerDead ||
            time < this.staminaRegenBlockedUntil ||
            this.stamina >= this.maxStamina
        ) {
            return;
        }

        const rate = grounded ? this.staminaGroundRegen : this.staminaAirRegen;
        this.stamina = Math.min(this.maxStamina, this.stamina + rate * delta);
        this.updateStaminaHud();
    }

    showStaminaBlockedFeedback ()
    {
        if (!this.staminaHud || !this.staminaHud.visible || this.time.now < this.nextStaminaFeedbackAt) return;

        this.nextStaminaFeedbackAt = this.time.now + 220;
        this.tweens.killTweensOf(this.staminaBar);
        this.tweens.add({
            targets: this.staminaBar,
            alpha: 0.25,
            duration: 70,
            yoyo: true,
            repeat: 2,
            onComplete: () => this.staminaBar.setAlpha(1)
        });
    }

    showDoubleJumpBurst (isFirst = false)
    {
        const burst = this.add.circle(
            this.player.x,
            this.player.y + 24,
            isFirst ? 18 : 12,
            0xc8d59b,            isFirst ? 0.5 : 0.35
        ).setDepth(18);

        this.tweens.add({
            targets: burst,
            scale: isFirst ? 3.2 : 2.5,
            alpha: 0,
            duration: isFirst ? 420 : 260,
            onComplete: () => burst.destroy()
        });

        if (isFirst) {
            for (let i = 0; i < 6; i += 1) {
                const angle = (Math.PI * 2 * i) / 6;
                const leaf = this.add.ellipse(
                    this.player.x,
                    this.player.y + 16,
                    9,
                    4,
                    0x7c9954,
                    0.8
                ).setDepth(19);
                this.tweens.add({
                    targets: leaf,
                    x: this.player.x + Math.cos(angle) * 42,
                    y: this.player.y + 16 + Math.sin(angle) * 34,
                    alpha: 0,
                    angle: i * 55,
                    duration: 420,
                    onComplete: () => leaf.destroy()
                });
            }
        }
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
        button.on('pointerdown', () => this.scene.start('Level3Scene'));
    }

    createEnvironmentalChallenges ()
    {
        this.environmentTimers = [];
        this.environmentTransient = [];
        this.environmentPlatforms = [];
        this.environmentReactionSensors = [];

        this.addEnvironmentalPlatform(1160, 575, 120, 20, 600, 'log');
        this.addEnvironmentalPlatform(1880, 605, 120, 18, 620, 'root');

        [
            { x: 1040, type: 0 },
            { x: 1830, type: 1 },
            { x: 2300, type: 0 }
        ].forEach((data) => this.addEnvironmentalReactionSensor(data.x, data.type));
    }

    scheduleEnvironment (delay, callback)
    {
        const timer = this.time.delayedCall(delay, callback);
        this.environmentTimers.push(timer);
        return timer;
    }

    trackEnvironmentObject (object)
    {
        this.environmentTransient.push(object);
        return object;
    }

    addEnvironmentalPlatform (x, y, w, h, delay, kind)
    {
        const body = this.add.rectangle(x, y, w, h, 0x000000, 0);
        this.physics.add.existing(body, true);
        this.platforms.add(body);

        const visual = this.add.container(x, y).setDepth(8);
        if (kind === 'root')
        {
            const root = this.add.rectangle(0, 2, w, h, 0x4b3422).setStrokeStyle(2, 0x68472d, 0.75);
            const ridge = this.add.rectangle(0, -h / 2 + 2, w - 14, 4, 0x315d34, 0.75);
            visual.add([root, ridge]);
        }
        else
        {
            const log = this.add.rectangle(0, 0, w, h, 0x49311f).setStrokeStyle(2, 0x735038, 0.75);
            const moss = this.add.rectangle(0, -h / 2 + 2, w - 12, 5, 0x2d5932, 0.82);
            visual.add([log, moss]);
        }

        const sensor = this.add.rectangle(x, y - 18, w - 8, 44, 0x000000, 0);
        this.physics.add.existing(sensor);
        sensor.body.setAllowGravity(false);
        sensor.body.setImmovable(true);

        const item = { x, y, w, h, delay, kind, body, visual, sensor, triggered: false };
        this.environmentPlatforms.push(item);
        this.physics.add.overlap(this.player, sensor, () => this.triggerEnvironmentalPlatform(item));
    }

    triggerEnvironmentalPlatform (item)
    {
        if (item.triggered || this.phaseCompleted || this.arenaStarted) return;
        item.triggered = true;
        item.sensor.body.enable = false;

        for (let i = 0; i < 5; i += 1)
        {
            const particle = this.trackEnvironmentObject(
                this.add.ellipse(item.x - 38 + i * 19, item.y + 4, 7, 3, item.kind === 'root' ? 0x71563b : (i % 2 ? 0x5b7042 : 0x6d5639), 0.62).setDepth(9)
            );
            this.tweens.add({ targets: particle, x: particle.x + (i % 2 ? 9 : -8), y: particle.y + 18, angle: i * 32, alpha: 0, duration: 340 + i * 22, onComplete: () => particle.destroy() });
        }

        this.tweens.add({ targets: item.visual, x: item.x + 3, y: item.y + 2, angle: item.kind === 'root' ? -1.5 : 1.5, duration: 55, yoyo: true, repeat: 4 });

        this.scheduleEnvironment(item.delay, () => {
            if (!item.triggered) return;
            item.body.body.enable = false;
            this.tweens.add({ targets: item.visual, y: item.y + 105, angle: item.kind === 'root' ? -6 : 8, alpha: 0.16, duration: 560, ease: 'Quad.In' });
        });
    }

    addEnvironmentalReactionSensor (x, type)
    {
        const sensor = this.add.rectangle(x, 515, 145, 250, 0x000000, 0);
        this.physics.add.existing(sensor);
        sensor.body.setAllowGravity(false);
        sensor.body.setImmovable(true);
        const item = { sensor, x, type, triggered: false };
        this.environmentReactionSensors.push(item);
        this.physics.add.overlap(this.player, sensor, () => this.triggerEnvironmentalReaction(item));
    }

    triggerEnvironmentalReaction (item)
    {
        if (item.triggered || this.phaseCompleted || this.arenaStarted) return;
        item.triggered = true;
        item.sensor.body.enable = false;

        const count = item.type === 1 ? 6 : 4;
        for (let i = 0; i < count; i += 1)
        {
            const leaf = this.trackEnvironmentObject(
                this.add.ellipse(item.x - 35 + i * 14, 590 - (i % 3) * 7, 9, 4, i % 2 ? 0x456b3e : 0x66824d, 0.64).setDepth(18)
            );
            this.tweens.add({
                targets: leaf,
                x: leaf.x + (item.type === 1 ? 42 : 28) + i * 3,
                y: leaf.y - 28 - (i % 3) * 9,
                angle: 55 + i * 24,
                alpha: 0,
                duration: 430 + i * 34,
                onComplete: () => leaf.destroy()
            });
        }

        if (item.type === 1)
        {
            const fog = this.trackEnvironmentObject(this.add.ellipse(item.x, 605, 160, 35, 0xc9d7ce, 0.045).setDepth(3));
            this.tweens.add({ targets: fog, x: fog.x + 75, scaleX: 1.3, alpha: 0, duration: 760, onComplete: () => fog.destroy() });
        }
    }

    resetEnvironmentalChallenges ()
    {
        this.environmentTimers.forEach((timer) => timer.remove(false));
        this.environmentTimers.length = 0;

        this.environmentTransient.forEach((object) => {
            if (object && object.active)
            {
                this.tweens.killTweensOf(object);
                object.destroy();
            }
        });
        this.environmentTransient.length = 0;

        this.environmentPlatforms.forEach((item) => {
            this.tweens.killTweensOf(item.visual);
            item.triggered = false;
            item.body.body.enable = true;
            item.sensor.body.enable = true;
            item.visual.setPosition(item.x, item.y).setAngle(0).setAlpha(1);
        });

        this.environmentReactionSensors.forEach((item) => {
            item.triggered = false;
            item.sensor.body.enable = true;
        });
    }

    createHud ()
    {
        const panel = this.add.rectangle(15, 15, 286, 112, 0x06100d, 0.58)
            .setOrigin(0)
            .setScrollFactor(0)
            .setDepth(100);
        panel.setStrokeStyle(1, 0x78917c, 0.3);

        this.add.text(26, 24, 'CONTROLES', {
            fontFamily: 'Arial Black',
            fontSize: '12px',
            color: '#f1e1ae'
        }).setScrollFactor(0).setDepth(101);

        this.controlsText = this.add.text(26, 45, 'A/D ou ←/→  mover\nW / ↑ / Espaço  pular\nS / ↓  queda rápida\nJ / X  atacar', {
            fontFamily: 'Arial',
            fontSize: '11px',
            color: '#c7d6ca',
            lineSpacing: 1
        }).setScrollFactor(0).setDepth(101);

        this.createQuickMenuButton();
    }

    createQuickMenuButton ()
    {
        const button = this.add.rectangle(965, 27, 82, 34, 0x06100d, 0.68)
            .setStrokeStyle(1, 0x78917c, 0.55)
            .setScrollFactor(0)
            .setDepth(104)
            .setInteractive({ useHandCursor: true });

        const label = this.add.text(965, 27, 'MENU', {
            fontFamily: 'Arial Black',
            fontSize: '12px',
            color: '#e5e8de'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(105);

        button.on('pointerover', () => {
            button.setFillStyle(0x1a2c23, 0.82);
            label.setColor('#f1e1ae');
        });
        button.on('pointerout', () => {
            button.setFillStyle(0x06100d, 0.68);
            label.setColor('#e5e8de');
        });
        button.on('pointerdown', () => this.scene.start('MainMenu'));
    }

    createStaminaHud ()
    {
        this.staminaHud = this.add.container(320, 90)
            .setScrollFactor(0)
            .setDepth(102);

        const background = this.add.rectangle(0, 0, 220, 30, 0x06100d, 0.64).setOrigin(0);
        background.setStrokeStyle(1, 0x78917c, 0.28);

        const label = this.add.text(10, 7, 'FÔLEGO', {
            fontFamily: 'Arial Black',
            fontSize: '11px',
            color: '#cfe5d2'
        });

        const barBack = this.add.rectangle(62, 9, 90, 12, 0x1d3025, 0.95).setOrigin(0);
        barBack.setStrokeStyle(1, 0x668574, 0.55);

        this.staminaBar = this.add.rectangle(62, 9, 90, 12, 0x72b58a, 1).setOrigin(0);

        this.staminaText = this.add.text(162, 7, '100/100', {
            fontFamily: 'Arial',
            fontSize: '11px',
            color: '#ffffff'
        });

        this.staminaHud.add([background, label, barBack, this.staminaBar, this.staminaText]);
        this.updateStaminaHud();
    }

    updateStaminaHud ()
    {
        if (!this.staminaBar || !this.staminaText) return;
        const ratio = Math.max(0, Math.min(1, this.stamina / this.maxStamina));
        this.staminaBar.width = 90 * ratio;
        this.staminaText.setText(Math.round(this.stamina) + '/' + this.maxStamina);
    }

    createHealthHud ()
    {
        this.healthHud = this.add.container(320, 18)
            .setScrollFactor(0)
            .setDepth(102);

        const background = this.add.rectangle(0, 0, 220, 30, 0x06100d, 0.64).setOrigin(0);
        background.setStrokeStyle(1, 0x78917c, 0.28);

        const label = this.add.text(10, 7, 'VIDA', {
            fontFamily: 'Arial Black',
            fontSize: '11px',
            color: '#f1e1ae'
        });

        const barBack = this.add.rectangle(62, 9, 90, 12, 0x351b18, 0.95).setOrigin(0);
        barBack.setStrokeStyle(1, 0x8e6f62, 0.55);

        this.healthBar = this.add.rectangle(62, 9, 90, 12, 0x8fb35b, 1).setOrigin(0);

        this.healthText = this.add.text(162, 7, '100/100', {
            fontFamily: 'Arial',
            fontSize: '11px',
            color: '#ffffff'
        });

        this.healthHud.add([background, label, barBack, this.healthBar, this.healthText]);
        this.updateHealthHud();
    }

    createHungerHud ()
    {
        this.hungerHud = this.add.container(320, 54)
            .setScrollFactor(0)
            .setDepth(102);

        const background = this.add.rectangle(0, 0, 220, 30, 0x06100d, 0.64).setOrigin(0);
        background.setStrokeStyle(1, 0x78917c, 0.28);

        this.hungerLabel = this.add.text(10, 7, 'FOME', {
            fontFamily: 'Arial Black',
            fontSize: '11px',
            color: '#f1e1ae'
        });

        const barBack = this.add.rectangle(62, 9, 90, 12, 0x3d2b16, 0.95).setOrigin(0);
        barBack.setStrokeStyle(1, 0x9b7b45, 0.55);

        this.hungerBar = this.add.rectangle(62, 9, 90, 12, 0xd49a3a, 1).setOrigin(0);

        this.hungerText = this.add.text(162, 7, '100/100', {
            fontFamily: 'Arial',
            fontSize: '11px',
            color: '#ffffff'
        });

        this.hungerHud.add([background, this.hungerLabel, barBack, this.hungerBar, this.hungerText]);
        this.updateHungerHud();
    }

    updateHealthHud ()
    {
        const ratio = Math.max(0, this.health / this.maxHealth);

        this.healthBar.width = 90 * ratio;
        this.healthText.setText(`${this.health}/${this.maxHealth}`);
    }

    updateHungerHud ()
    {
        const ratio = Math.max(0, this.hunger / this.maxHunger);

        this.hungerBar.width = 90 * ratio;
        this.hungerText.setText(`${this.hunger}/${this.maxHunger}`);

        if (this.hunger <= 0)
        {
            this.hungerBar.setFillStyle(0xd85c32, 1);
            this.hungerLabel.setColor('#ffb08a');
        }
        else if (this.hunger < 30)
        {
            this.hungerBar.setFillStyle(0xe8782f, 1);
            this.hungerLabel.setColor('#ffd08a');
        }
        else
        {
            this.hungerBar.setFillStyle(0xd49a3a, 1);
            this.hungerLabel.setColor('#f1e1ae');
        }
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
        const playerName = String(this.registry.get('playerName') || 'SERINGUEIRO').slice(0, 16);
        const intro = this.add.container(512, 286).setScrollFactor(0).setDepth(170);
        const panel = this.add.rectangle(0, 0, 430, 132, 0x06100d, 0.76)
            .setStrokeStyle(1, 0x78917c, 0.32);
        const phaseText = this.add.text(0, -38, 'FASE 2', {
            fontFamily: 'Arial Black',
            fontSize: '15px',
            color: '#d6b56c'
        }).setOrigin(0.5);
        const titleText = this.add.text(0, -8, 'RASTROS DO GUARDIÃO', {
            fontFamily: 'Arial Black',
            fontSize: '25px',
            color: '#f1e1ae',
            align: 'center'
        }).setOrigin(0.5);
        const nameText = this.add.text(0, 35, `SERINGUEIRO: ${playerName}`, {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#9fba9f'
        }).setOrigin(0.5);

        intro.add([panel, phaseText, titleText, nameText]);

        this.tweens.add({
            targets: intro,
            alpha: 0,
            delay: 1900,
            duration: 800,
            ease: 'Sine.Out',
            onComplete: () => intro.destroy()
        });
    }

    update ()
    {
        const time = this.time.now;
        const moveSpeed = 260;
        const grounded = this.player.body.blocked.down || this.player.body.touching.down;

        this.updateStamina(time, grounded);

        const jumpDown = this.keyW.isDown || this.cursors.up.isDown || this.spaceKey.isDown;
        if (jumpDown && !this.jumpWasDown) {
            this.queueJumpInput(time);
        } else if (!jumpDown && this.jumpWasDown) {
            this.applyJumpCut();
        }
        this.jumpWasDown = jumpDown;

        if (!this.isPlayerDead && !this.phaseCompleted) {
            if (time >= this.knockbackUntil) {
                const left = this.cursors.left.isDown || this.keyA.isDown;
                const right = this.cursors.right.isDown || this.keyD.isDown;
                const direction = left && !right ? -1 : right && !left ? 1 : 0;
                if (direction !== 0 && this.lastMoveDirection !== 0 && direction !== this.lastMoveDirection) this.showDirectionChangeFeedback(direction);
                if (direction !== 0) this.lastMoveDirection = direction;
                this.player.body.setVelocityX(direction * moveSpeed);
            }

            this.updateGroundedState(grounded);
            this.consumeJumpBuffer(grounded);
            this.applyFastFall(grounded);
        } else {
            this.updateGroundedState(grounded);
            this.fastFallActive = false;
        }

        if (this.arenaStarted && !this.arenaCleared) {
            if (this.player.x < this.arenaMinX) this.player.x = this.arenaMinX;
            if (this.player.x > this.arenaMaxX) this.player.x = this.arenaMaxX;
        }

        if (this.player.y > 760) {
            this.player.setPosition(this.spawnPoint.x, this.spawnPoint.y);
            this.player.body.setVelocity(0, 0);
            this.stamina = this.maxStamina;
            this.staminaRegenBlockedUntil = 0;
            this.resetMovementPolishState(); this.resetCombatPolishState();
            this.resetEnvironmentalChallenges();
            this.updateStaminaHud();
        }

        this.syncPlayerVisual();
        this.animatePlayerVisual(time);
        this.updateAttack(time);
        this.updateSnake(time);
        this.updateCarapana(time);
        this.updateFruits(time);
        this.updateCurupira(time);
        this.updateHunger(time);
    }

}