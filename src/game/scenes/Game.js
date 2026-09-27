import { Scene } from 'phaser';

export class Game extends Scene
{
    constructor ()
    {
        super('Game');
    }

    create ()
    {
        const worldWidth = 3000;
        const worldHeight = 768;

        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
        this.cameras.main.setBackgroundColor('#071714');

        this.createAmazonAtmosphere(worldWidth, worldHeight);

        this.platforms = this.physics.add.staticGroup();

        const addCollisionPlatform = (x, y, width, height) => {
            const platform = this.add.rectangle(x, y, width, height, 0x000000, 0);
            this.physics.add.existing(platform, true);
            this.platforms.add(platform);
            return platform;
        };

        // Mesmas colisões já validadas na versão anterior.
        addCollisionPlatform(350, 710, 700, 116);
        addCollisionPlatform(1050, 710, 580, 116);
        addCollisionPlatform(1800, 710, 760, 116);
        addCollisionPlatform(2650, 710, 700, 116);

        addCollisionPlatform(560, 600, 120, 30);
        addCollisionPlatform(930, 560, 180, 28);
        addCollisionPlatform(1420, 620, 80, 60);
        addCollisionPlatform(1650, 540, 200, 28);
        addCollisionPlatform(2240, 590, 150, 30);
        addCollisionPlatform(2490, 520, 190, 28);

        this.createTerrainVisuals();
        this.createRubberTrees();
        this.createForegroundVegetation();
        this.createLevelStartDetails();
        this.createLevelEnd();

        // Corpo físico do personagem preservado com o mesmo tamanho da versão validada.
        this.player = this.add.rectangle(150, 560, 45, 70, 0x000000, 0);
        this.physics.add.existing(this.player);

        this.player.body.setCollideWorldBounds(true);
        this.player.body.setMaxVelocity(260, 900);
        this.player.body.setSize(45, 70);

        this.createEnvironmentalChallenges();
        this.physics.add.collider(this.player, this.platforms);

        this.playerVisual = this.createPlayerPlaceholder();
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
        this.phaseCompleteScreenShown = false;

        this.jumpWasDown = false;
        this.jumpBufferUntil = 0;
        this.jumpBufferMs = 130;
        this.coyoteTimeMs = 100;
        this.coyoteUntil = 0;
        this.firstJumpConsumed = false;
        this.wasGrounded = false;
        this.lastAirVelocityY = 0;
        this.fastFallActive = false;
        this.motionFx = { scaleX: 1, scaleY: 1 };
        this.directionFx = { lean: 0 };
        this.lastMoveDirection = 0;

        this.isAttacking = false;
        this.attackStartedAt = 0;
        this.nextAttackAt = 0;
        this.attackDirection = 1;
        this.attackBufferUntil = 0;
        this.attackBufferMs = 100;
        this.attackVisualVariant = -1;
        this.attackArcShown = false;
        this.attackHitRegistered = false;
        this.attackHitCarapanaRegistered = false;

        this.createSnake();
        this.createCarapana();
        this.createAttackHitbox();
        this.createFruits();
        this.createCompletionZone();

        // Controles preservados.
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

        // Câmera lateral preservada.
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setDeadzone(220, 160);

        this.createHud();
        this.createHealthHud();
        this.createHungerHud();
        this.showPlayerNameIntro();
        this.createLivingAtmosphere();

        this.spawnPoint = { x: 150, y: 560 };
    }

    createAmazonAtmosphere (worldWidth, worldHeight)
    {
        // Céu verde-azulado escuro com faixas discretas de luminosidade.
        const sky = this.add.graphics().setDepth(-50).setScrollFactor(0);
        sky.fillStyle(0x071714, 1);
        sky.fillRect(0, 0, 1024, 768);
        sky.fillStyle(0x0b2420, 0.55);
        sky.fillRect(0, 220, 1024, 260);
        sky.fillStyle(0x102e27, 0.28);
        sky.fillRect(0, 470, 1024, 298);

        // Lua e halo fixados ao fundo para criar atmosfera cinematográfica.
        this.add.circle(825, 125, 78, 0xc9d7c9, 0.08)
            .setDepth(-48)
            .setScrollFactor(0.04);
        this.add.circle(825, 125, 52, 0xdce4d5, 0.78)
            .setDepth(-47)
            .setScrollFactor(0.04);

        // Camada 1: silhuetas distantes.
        const distant = this.add.graphics().setDepth(-40).setScrollFactor(0.12);
        distant.fillStyle(0x0b211b, 0.96);
        distant.fillRect(-300, 500, worldWidth + 900, 300);

        const distantTrees = [
            [40, 410, 26, 210, 88], [190, 445, 20, 170, 70],
            [355, 390, 30, 230, 98], [560, 430, 22, 190, 80],
            [760, 370, 32, 250, 108], [980, 420, 24, 200, 84],
            [1210, 390, 30, 230, 102], [1460, 435, 20, 185, 76],
            [1690, 365, 34, 255, 112], [1940, 420, 24, 200, 86],
            [2180, 385, 30, 235, 100], [2430, 430, 22, 190, 78],
            [2670, 375, 34, 245, 110], [2910, 415, 25, 205, 88]
        ];

        distantTrees.forEach(([x, y, trunkW, trunkH, crown]) => {
            distant.fillStyle(0x102a21, 0.9);
            distant.fillRect(x, y, trunkW, trunkH);
            distant.fillStyle(0x0b261d, 0.96);
            distant.fillCircle(x + trunkW / 2, y - 5, crown);
            distant.fillCircle(x - crown * 0.35, y + 20, crown * 0.72);
            distant.fillCircle(x + crown * 0.5, y + 24, crown * 0.78);
        });

        // Camada 2: floresta intermediária com troncos, copas e cipós.
        const middle = this.add.graphics().setDepth(-25).setScrollFactor(0.45);
        const middleTrees = [
            [80, 330, 38, 320, 0.92], [330, 285, 44, 365, 1.08],
            [650, 350, 34, 300, 0.86], [950, 300, 46, 350, 1.12],
            [1280, 335, 36, 315, 0.9], [1570, 270, 48, 380, 1.14],
            [1880, 325, 38, 325, 0.96], [2180, 290, 44, 360, 1.08],
            [2510, 340, 34, 310, 0.88], [2820, 280, 46, 370, 1.12]
        ];

        middleTrees.forEach(([x, y, trunkW, trunkH, scale], index) => {
            this.drawTree(middle, x, y, trunkW, trunkH, scale, index % 2 === 0);
        });

        middle.lineStyle(5, 0x173c2a, 0.72);
        [[470, 70, 520], [1160, 120, 610], [2050, 90, 580], [2730, 130, 620]].forEach(([x, top, bottom]) => {
            middle.beginPath();
            middle.moveTo(x, top);
            middle.lineTo(x - 12, bottom * 0.52);
            middle.lineTo(x + 8, bottom);
            middle.strokePath();
        });

        // Névoa em faixas leves, com fatores diferentes para reforçar profundidade.
        this.add.rectangle(512, 485, 1500, 120, 0xa7c2b3, 0.055)
            .setDepth(-18)
            .setScrollFactor(0.18);
        this.add.rectangle(1400, 560, 2600, 90, 0xd5e0d7, 0.035)
            .setDepth(-17)
            .setScrollFactor(0.38);

        // Partículas discretas de umidade/insetos.
        const motes = [
            [130, 260, 2], [260, 180, 1.5], [410, 340, 2], [610, 250, 1.5],
            [760, 310, 2], [940, 205, 1.5], [1110, 290, 2], [1320, 190, 1.5],
            [1510, 320, 2], [1710, 230, 1.5], [1940, 300, 2], [2160, 185, 1.5],
            [2380, 270, 2], [2570, 215, 1.5], [2780, 315, 2]
        ];

        motes.forEach(([x, y, radius], index) => {
            const mote = this.add.circle(x, y, radius, 0xe3eadc, 0.28)
                .setDepth(-12)
                .setScrollFactor(0.62);

            this.tweens.add({
                targets: mote,
                y: y - 10 - (index % 3) * 4,
                x: x + 5 + (index % 2) * 5,
                alpha: { from: 0.12, to: 0.34 },
                duration: 2400 + (index % 4) * 450,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut'
            });
        });

        // Manchas suaves de luar.
        this.add.ellipse(760, 570, 360, 90, 0xb9cab7, 0.035)
            .setDepth(-10)
            .setScrollFactor(0.7);
        this.add.ellipse(2050, 545, 420, 100, 0xb9cab7, 0.03)
            .setDepth(-10)
            .setScrollFactor(0.7);

        this.add.rectangle(worldWidth / 2, worldHeight - 22, worldWidth, 44, 0x020605, 0.18)
            .setDepth(35);
    }

    drawTree (graphics, x, y, trunkWidth, trunkHeight, crownScale, branchLeft)
    {
        graphics.fillStyle(0x3b2b1f, 0.95);
        graphics.fillRect(x, y, trunkWidth, trunkHeight);
        graphics.fillStyle(0x4a3525, 0.55);
        graphics.fillRect(x + trunkWidth * 0.18, y, trunkWidth * 0.18, trunkHeight);

        graphics.lineStyle(9, 0x3a2a1e, 0.88);
        graphics.beginPath();
        graphics.moveTo(x + trunkWidth * 0.5, y + 70);
        graphics.lineTo(x + (branchLeft ? -55 : 85), y + 5);
        graphics.strokePath();

        const cx = x + trunkWidth / 2;
        const cy = y - 8;
        graphics.fillStyle(0x103423, 0.98);
        graphics.fillCircle(cx, cy, 75 * crownScale);
        graphics.fillCircle(cx - 62 * crownScale, cy + 18, 55 * crownScale);
        graphics.fillCircle(cx + 65 * crownScale, cy + 22, 58 * crownScale);
        graphics.fillStyle(0x17472d, 0.76);
        graphics.fillCircle(cx - 15, cy - 24, 48 * crownScale);
    }

    createTerrainVisuals ()
    {
        const terrain = this.add.graphics().setDepth(5);

        const groundSegments = [
            [0, 652, 700, 116],
            [760, 652, 580, 116],
            [1420, 652, 760, 116],
            [2300, 652, 700, 116]
        ];

        groundSegments.forEach(([x, y, width, height], index) => {
            terrain.fillStyle(index % 2 === 0 ? 0x4b3423 : 0x513824, 1);
            terrain.fillRect(x, y, width, height);
            terrain.fillStyle(0x284f2d, 1);
            terrain.fillRect(x, y, width, 12);
            terrain.fillStyle(0x173823, 0.95);
            terrain.fillRect(x, y + 12, width, 10);
        });

        // Detalhes de barro, pedras e raízes sem física adicional.
        terrain.fillStyle(0x6a4a2d, 0.6);
        [[120, 690, 80], [410, 725, 120], [880, 690, 90], [1160, 730, 110],
         [1510, 700, 100], [1920, 725, 130], [2380, 700, 90], [2720, 730, 120]].forEach(([x, y, width]) => {
            terrain.fillEllipse(x, y, width, 18);
        });

        terrain.lineStyle(6, 0x2c2118, 0.78);
        [[190, 656, 270, 710], [520, 658, 600, 715], [970, 657, 1045, 712],
         [1680, 658, 1760, 720], [2440, 657, 2525, 710]].forEach(([x1, y1, x2, y2]) => {
            terrain.beginPath();
            terrain.moveTo(x1, y1);
            terrain.lineTo(x2, y2);
            terrain.strokePath();
        });

        // Plataformas naturais exatamente sobre as colisões existentes.
        this.drawNaturalPlatform(terrain, 500, 585, 120, 30, 'log');
        this.drawNaturalPlatform(terrain, 840, 546, 180, 28, 'bank');
        this.drawNaturalPlatform(terrain, 1380, 590, 80, 60, 'rock');
        this.drawNaturalPlatform(terrain, 1550, 526, 200, 28, 'log');
        this.drawNaturalPlatform(terrain, 2165, 575, 150, 30, 'bank');
        this.drawNaturalPlatform(terrain, 2395, 506, 190, 28, 'log');
    }

    drawNaturalPlatform (graphics, x, y, width, height, type)
    {
        if (type === 'log')
        {
            graphics.fillStyle(0x4a321f, 1);
            graphics.fillRoundedRect(x, y, width, height, 12);
            graphics.fillStyle(0x6b4a2b, 0.75);
            graphics.fillRect(x + 10, y + 5, width - 20, 5);
            graphics.fillStyle(0x2c5a31, 0.9);
            graphics.fillRect(x + 8, y - 4, width - 16, 6);
        }
        else if (type === 'rock')
        {
            graphics.fillStyle(0x4b5148, 1);
            graphics.fillTriangle(x, y + height, x + width * 0.45, y, x + width, y + height);
            graphics.fillStyle(0x647065, 0.5);
            graphics.fillTriangle(x + 18, y + height - 6, x + width * 0.46, y + 8, x + width - 12, y + height - 8);
            graphics.fillStyle(0x2a5430, 0.85);
            graphics.fillRect(x + 8, y + 2, width - 16, 6);
        }
        else
        {
            graphics.fillStyle(0x5b3d25, 1);
            graphics.fillRect(x, y, width, height);
            graphics.fillStyle(0x315d34, 1);
            graphics.fillRect(x, y, width, 7);
            graphics.fillStyle(0x714d2e, 0.5);
            graphics.fillEllipse(x + width * 0.55, y + height * 0.65, width * 0.45, height * 0.35);
        }
    }

    createRubberTrees ()
    {
        const graphics = this.add.graphics().setDepth(8);
        const trees = [
            [300, 388, 42, 265],
            [1220, 375, 45, 278],
            [2010, 390, 40, 263],
            [2740, 370, 46, 283]
        ];

        trees.forEach(([x, y, trunkWidth, trunkHeight], index) => {
            graphics.fillStyle(0x4b3424, 1);
            graphics.fillRect(x, y, trunkWidth, trunkHeight);
            graphics.fillStyle(0x61452e, 0.55);
            graphics.fillRect(x + 7, y, 8, trunkHeight);

            // Corte diagonal de sangria.
            graphics.lineStyle(4, 0xc3a477, 0.95);
            graphics.beginPath();
            graphics.moveTo(x + 7, y + 145);
            graphics.lineTo(x + trunkWidth - 7, y + 128);
            graphics.strokePath();

            // Pequeno canal visual conduzindo ao recipiente.
            graphics.lineStyle(2, 0xd8d3c3, 0.7);
            graphics.beginPath();
            graphics.moveTo(x + trunkWidth - 8, y + 130);
            graphics.lineTo(x + trunkWidth * 0.56, y + 172);
            graphics.strokePath();

            graphics.fillStyle(0x8c7558, 1);
            graphics.fillEllipse(x + trunkWidth * 0.55, y + 185, 28, 12);
            graphics.fillStyle(0xe7e1cf, 0.72);
            graphics.fillEllipse(x + trunkWidth * 0.55, y + 182, 20, 5);

            // Copa simplificada da seringueira.
            const crownY = y - 15;
            graphics.fillStyle(index % 2 === 0 ? 0x17482d : 0x123f28, 0.98);
            graphics.fillCircle(x + trunkWidth / 2, crownY, 72);
            graphics.fillCircle(x - 42, crownY + 18, 48);
            graphics.fillCircle(x + 72, crownY + 20, 54);
        });
    }

    createForegroundVegetation ()
    {
        const foreground = this.add.graphics().setDepth(30).setScrollFactor(1.08).setAlpha(0.78);
        foreground.fillStyle(0x0b2518, 0.98);

        const shrubs = [
            [40, 645, 44], [170, 647, 34], [420, 646, 42], [690, 646, 30],
            [820, 645, 38], [1120, 645, 34], [1330, 646, 42], [1510, 645, 36],
            [1770, 646, 45], [2110, 646, 32], [2330, 645, 40], [2580, 646, 36],
            [2860, 645, 44]
        ];

        shrubs.forEach(([x, y, size], index) => {
            foreground.fillCircle(x, y, size);
            foreground.fillCircle(x + size * 0.7, y + 5, size * 0.75);
            foreground.fillStyle(index % 2 === 0 ? 0x12351f : 0x102f1d, 0.98);
        });

        foreground.lineStyle(4, 0x183e24, 0.95);
        [90, 520, 890, 1460, 1960, 2470, 2920].forEach((x, index) => {
            for (let i = 0; i < 5; i += 1)
            {
                foreground.beginPath();
                foreground.moveTo(x + i * 10, 658);
                foreground.lineTo(x - 12 + i * 8, 625 - (i % 2) * 15 - index % 3 * 4);
                foreground.strokePath();
            }
        });
    }


    createLevelStartDetails ()
    {
        const start = this.add.container(185, 618).setDepth(12);

        const crate = this.add.rectangle(-48, 8, 34, 30, 0x6a482b);
        crate.setStrokeStyle(2, 0x3d2a1b, 0.9);
        const crateLineA = this.add.rectangle(-48, 1, 28, 3, 0x3d2a1b, 0.9);
        const crateLineB = this.add.rectangle(-48, 14, 28, 3, 0x3d2a1b, 0.9);

        const stump = this.add.rectangle(8, 12, 28, 25, 0x5b3d27);
        const stumpTop = this.add.ellipse(8, 0, 28, 9, 0x806044);
        const log = this.add.rectangle(48, 14, 56, 16, 0x4a3322)
            .setAngle(-7);
        const logEnd = this.add.circle(73, 11, 8, 0x76563a);

        const postLeft = this.add.rectangle(-84, -6, 7, 56, 0x4c3524)
            .setOrigin(0.5, 1);
        const postRight = this.add.rectangle(-16, -6, 7, 48, 0x4c3524)
            .setOrigin(0.5, 1);
        const crossBeam = this.add.rectangle(-50, -57, 78, 7, 0x5c4028)
            .setAngle(3);

        start.add([
            crate,
            crateLineA,
            crateLineB,
            stump,
            stumpTop,
            log,
            logEnd,
            postLeft,
            postRight,
            crossBeam
        ]);
    }

    createLevelEnd ()
    {
        const tapiri = this.add.container(2845, 650).setDepth(11);

        const floor = this.add.rectangle(0, -14, 190, 16, 0x5a3d27);
        const leftPost = this.add.rectangle(-72, -82, 12, 140, 0x4a3221);
        const rightPost = this.add.rectangle(72, -82, 12, 140, 0x4a3221);

        const wallLeft = this.add.rectangle(-42, -77, 48, 112, 0x6a4a2e);
        const wallRight = this.add.rectangle(42, -77, 48, 112, 0x6a4a2e);
        const doorway = this.add.rectangle(0, -62, 38, 82, 0x141b16);

        const roof = this.add.triangle(
            0,
            -160,
            -112, 42,
            0, -25,
            112, 42,
            0x4b3422
        );
        const roofEdge = this.add.rectangle(0, -126, 220, 8, 0x2d2118)
            .setAngle(1);

        const doorGlow = this.add.ellipse(0, -42, 52, 28, 0xd7a85d, 0.09);

        tapiri.add([
            floor,
            leftPost,
            rightPost,
            wallLeft,
            wallRight,
            doorway,
            roof,
            roofEdge,
            doorGlow
        ]);

        const clearing = this.add.ellipse(2810, 635, 390, 54, 0xc2c79a, 0.055)
            .setDepth(6);

        this.tweens.add({
            targets: doorGlow,
            alpha: { from: 0.05, to: 0.14 },
            duration: 1600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
    }

    createCompletionZone ()
    {
        this.completionZone = this.add.rectangle(2830, 585, 180, 135, 0x000000, 0);
        this.physics.add.existing(this.completionZone);

        this.completionZone.body.setAllowGravity(false);
        this.completionZone.body.setImmovable(true);

        this.physics.add.overlap(this.player, this.completionZone, () => {
            this.completePhase();
        });
    }

    completePhase ()
    {
        if (this.phaseCompleted)
        {
            return;
        }

        this.phaseCompleted = true;
        this.isAttacking = false;
        this.attackHitbox.body.enable = false;
        this.player.body.setVelocity(0, 0);

        if (this.snake?.body && this.snakeAlive)
        {
            this.snake.body.setVelocity(0, 0);
        }

        if (this.carapana?.body && this.carapanaAlive)
        {
            this.carapana.body.setVelocity(0, 0);
        }

        this.phaseCompleteStats = {
            health: this.health,
            hunger: this.hunger,
            snakeDefeated: !this.snakeAlive,
            carapanaDefeated: !this.carapanaAlive
        };

        const messagePanel = this.add.rectangle(
            512,
            350,
            560,
            190,
            0x06100d,
            0.9
        )
            .setScrollFactor(0)
            .setDepth(210);
        messagePanel.setStrokeStyle(2, 0xd6b56c, 0.65);

        const title = this.add.text(
            512,
            305,
            'RASTROS NA FLORESTA',
            {
                fontFamily: 'Arial Black',
                fontSize: '30px',
                color: '#f1e1ae'
            }
        )
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(211);

        const clue = this.add.text(
            512,
            350,
            'Ele esteve aqui.',
            {
                fontFamily: 'Arial',
                fontSize: '22px',
                color: '#c8d8cc'
            }
        )
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(211);

        const complete = this.add.text(
            512,
            397,
            'FASE 1 CONCLUÍDA',
            {
                fontFamily: 'Arial Black',
                fontSize: '24px',
                color: '#d6b56c'
            }
        )
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(211);

        this.phaseCompleteMessage = [
            messagePanel,
            title,
            clue,
            complete
        ];

        this.time.delayedCall(2500, () => {
            this.showPhaseCompleteScreen();
        });
    }

    showPhaseCompleteScreen ()
    {
        if (this.phaseCompleteScreenShown)
        {
            return;
        }

        this.phaseCompleteScreenShown = true;

        this.phaseCompleteMessage?.forEach((item) => item.destroy());

        const stats = this.phaseCompleteStats;

        const overlay = this.add.rectangle(
            512,
            384,
            1024,
            768,
            0x020705,
            0.94
        )
            .setScrollFactor(0)
            .setDepth(300);

        const title = this.add.text(
            512,
            180,
            'FASE 1 CONCLUÍDA',
            {
                fontFamily: 'Arial Black',
                fontSize: '46px',
                color: '#f1e1ae',
                stroke: '#291b0d',
                strokeThickness: 6
            }
        )
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(301);

        const statsText = this.add.text(
            512,
            345,
            [
                `VIDA: ${stats.health}/100`,
                `FOME: ${stats.hunger}/100`,
                '',
                `COBRA: ${stats.snakeDefeated ? 'DERROTADA' : 'NÃO DERROTADA'}`,
                `CARAPANÃ: ${stats.carapanaDefeated ? 'DERROTADO' : 'NÃO DERROTADO'}`
            ].join('\n'),
            {
                fontFamily: 'Arial',
                fontSize: '23px',
                color: '#c8d8cc',
                align: 'center',
                lineSpacing: 8
            }
        )
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(301);

        const button = this.add.rectangle(
            512,
            545,
            280,
            64,
            0x8b5a2b
        )
            .setStrokeStyle(3, 0xd6b56c)
            .setScrollFactor(0)
            .setDepth(301)
            .setInteractive({ useHandCursor: true });

        const buttonText = this.add.text(
            512,
            545,
            'CONTINUAR',
            {
                fontFamily: 'Arial Black',
                fontSize: '23px',
                color: '#ffffff'
            }
        )
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(302);

        button.on('pointerover', () => {
            button.setFillStyle(0xb37638);
        });

        button.on('pointerout', () => {
            button.setFillStyle(0x8b5a2b);
        });

        button.on('pointerdown', () => {
            this.scene.start('Level2Scene');
        });
    }

    createPlayerPlaceholder ()
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




    createFruits ()
    {
        this.fruits = [];

        const fruitData = [
            { x: 300, y: 632, color: 0xc94a3b },
            { x: 560, y: 565, color: 0xe2c74f },
            { x: 900, y: 525, color: 0xe8873a },
            { x: 1510, y: 632, color: 0xc94a3b },
            { x: 1650, y: 505, color: 0xe2c74f },
            { x: 2470, y: 485, color: 0xe8873a },
            { x: 2720, y: 632, color: 0xc94a3b }
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

    createAttackHitbox ()
    {
        this.attackHitbox = this.add.rectangle(0, 0, 54, 46, 0x000000, 0);
        this.physics.add.existing(this.attackHitbox);

        this.attackHitbox.body.setAllowGravity(false);
        this.attackHitbox.body.enable = false;

        this.physics.add.overlap(this.attackHitbox, this.snake, () => {
            this.tryHitSnake();
        });

        this.physics.add.overlap(this.attackHitbox, this.carapana, () => {
            this.tryHitCarapana();
        });
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

    tryHitSnake ()
    {
        if (
            !this.isAttacking ||
            !this.attackHitbox.body.enable ||
            this.attackHitRegistered ||
            !this.snakeAlive
        )
        {
            return;
        }

        this.attackHitRegistered = true;
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
            minX: 1830,
            maxX: 2070,
            baseX: 1950,
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

    createSnake ()
    {
        this.snakePatrol = {
            minX: 1040,
            maxX: 1270,
            speed: 70
        };

        this.snake = this.add.rectangle(1120, 620, 72, 24, 0x000000, 0);
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

    flashPlayerDamage ()
    {
        this.tweens.killTweensOf(this.playerVisual);

        this.tweens.add({
            targets: this.playerVisual,
            alpha: 0.25,
            duration: 90,
            yoyo: true,
            repeat: 4,
            onComplete: () => {
                this.playerVisual.setAlpha(1);
            }
        });
    }

    handlePlayerDeath ()
    {
        if (this.phaseCompleted || this.isPlayerDead)
        {
            return;
        }

        this.isPlayerDead = true;
        this.resetCombatPolishState();
        this.player.body.setVelocity(0, 0);

        this.time.delayedCall(650, () => {
            this.player.setPosition(this.spawnPoint.x, this.spawnPoint.y);
            this.player.body.setVelocity(0, 0);
            this.resetMovementPolishState(); this.resetCombatPolishState();
            this.resetEnvironmentalChallenges();
            this.clearLivingAtmosphereTransient();

            this.health = this.maxHealth;
            this.hunger = this.maxHunger;
            this.nextHungerDrainAt = this.time.now + 2000;
            this.nextStarvationDamageAt = this.time.now + 2000;
            this.invulnerableUntil = this.time.now + 1000;
            this.isPlayerDead = false;

            this.playerVisual.setAlpha(1);
            this.updateHealthHud();
            this.updateHungerHud();
        });
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
        if (this.phaseCompleted || this.isPlayerDead)
        {
            return;
        }

        if (time >= this.nextHungerDrainAt)
        {
            const elapsedSteps = Math.floor((time - this.nextHungerDrainAt) / 2000) + 1;
            this.hunger = Math.max(0, this.hunger - elapsedSteps);
            this.nextHungerDrainAt += elapsedSteps * 2000;
            this.updateHungerHud();
        }

        if (this.hunger <= 0)
        {
            if (time >= this.nextStarvationDamageAt)
            {
                const elapsedHits = Math.floor((time - this.nextStarvationDamageAt) / 2000) + 1;
                this.nextStarvationDamageAt += elapsedHits * 2000;

                this.health = Math.max(0, this.health - (5 * elapsedHits));
                this.updateHealthHud();

                if (this.health <= 0)
                {
                    this.handlePlayerDeath();
                }
            }

            const pulse = 0.78 + Math.sin(time * 0.008) * 0.12;
            this.hungerHud.setAlpha(pulse);
        }
        else
        {
            this.nextStarvationDamageAt = time + 2000;
            this.hungerHud.setAlpha(1);
        }
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

    updateHealthHud ()
    {
        const ratio = Math.max(0, this.health / this.maxHealth);

        this.healthBar.width = 90 * ratio;
        this.healthText.setText(`${this.health}/${this.maxHealth}`);
    }

    createEnvironmentalChallenges ()
    {
        this.environmentTimers = [];
        this.environmentTransient = [];
        this.environmentUnstablePlatforms = [];
        this.environmentReactionSensors = [];
        this.environmentBranchVisual = null;
        this.environmentBranchTriggered = false;

        this.addEnvironmentalUnstablePlatform(1180, 610, 105, 20, 650);

        this.environmentBranchSensor = this.add.rectangle(1910, 505, 180, 250, 0x000000, 0);
        this.physics.add.existing(this.environmentBranchSensor);
        this.environmentBranchSensor.body.setAllowGravity(false);
        this.environmentBranchSensor.body.setImmovable(true);
        this.physics.add.overlap(this.player, this.environmentBranchSensor, () => this.triggerEnvironmentalBranch());

        [
            { x: 930, type: 0 },
            { x: 1640, type: 1 },
            { x: 2460, type: 2 }
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

    addEnvironmentalUnstablePlatform (x, y, w, h, delay)
    {
        const body = this.add.rectangle(x, y, w, h, 0x000000, 0);
        this.physics.add.existing(body, true);
        this.platforms.add(body);

        const visual = this.add.container(x, y).setDepth(8);
        const log = this.add.rectangle(0, 0, w, h, 0x503621).setStrokeStyle(2, 0x78563a, 0.75);
        const moss = this.add.rectangle(0, -h / 2 + 2, w - 14, 5, 0x315d34, 0.82);
        visual.add([log, moss]);

        const sensor = this.add.rectangle(x, y - 18, w - 8, 42, 0x000000, 0);
        this.physics.add.existing(sensor);
        sensor.body.setAllowGravity(false);
        sensor.body.setImmovable(true);

        const item = { x, y, w, h, delay, body, visual, sensor, triggered: false };
        this.environmentUnstablePlatforms.push(item);
        this.physics.add.overlap(this.player, sensor, () => this.triggerEnvironmentalUnstablePlatform(item));
    }

    triggerEnvironmentalUnstablePlatform (item)
    {
        if (item.triggered || this.phaseCompleted) return;
        item.triggered = true;
        item.sensor.body.enable = false;

        for (let i = 0; i < 4; i += 1)
        {
            const debris = this.trackEnvironmentObject(
                this.add.ellipse(item.x - 32 + i * 20, item.y + 4, 7, 3, i % 2 ? 0x6b5439 : 0x547044, 0.62).setDepth(9)
            );
            this.tweens.add({
                targets: debris,
                x: debris.x + (i % 2 ? 9 : -8),
                y: debris.y + 16,
                angle: i * 35,
                alpha: 0,
                duration: 320 + i * 24,
                onComplete: () => debris.destroy()
            });
        }

        this.tweens.add({
            targets: item.visual,
            x: item.x + 3,
            y: item.y + 2,
            angle: 1.5,
            duration: 55,
            yoyo: true,
            repeat: 4
        });

        this.scheduleEnvironment(item.delay, () => {
            if (!item.triggered) return;
            item.body.body.enable = false;
            this.tweens.add({
                targets: item.visual,
                y: item.y + 120,
                angle: -8,
                alpha: 0.18,
                duration: 560,
                ease: 'Quad.In'
            });
        });
    }

    triggerEnvironmentalBranch ()
    {
        if (this.environmentBranchTriggered || this.phaseCompleted) return;
        this.environmentBranchTriggered = true;
        this.environmentBranchSensor.body.enable = false;

        const warningLeaves = [];
        for (let i = 0; i < 5; i += 1)
        {
            const leaf = this.trackEnvironmentObject(
                this.add.ellipse(1970 + i * 12, 345 + (i % 2) * 10, 10, 5, i % 2 ? 0x4f7041 : 0x617b48, 0.72).setDepth(15)
            );
            warningLeaves.push(leaf);
            this.tweens.add({ targets: leaf, x: leaf.x + (i % 2 ? 10 : -9), angle: i * 28, duration: 95, yoyo: true, repeat: 3 });
        }

        this.scheduleEnvironment(500, () => {
            warningLeaves.forEach((leaf) => {
                if (!leaf.active) return;
                this.tweens.add({ targets: leaf, y: leaf.y + 35, alpha: 0, duration: 220, onComplete: () => leaf.destroy() });
            });
            const branch = this.add.rectangle(1990, 365, 185, 18, 0x4b3221, 0.96)
                .setOrigin(0.5)
                .setAngle(-58)
                .setDepth(14);
            this.environmentBranchVisual = branch;
            this.tweens.add({
                targets: branch,
                angle: 7,
                y: 605,
                duration: 470,
                ease: 'Quad.In',
                onComplete: () => {
                    this.cameras.main.shake(65, 0.0009);
                    this.scheduleEnvironment(850, () => {
                        if (this.environmentBranchVisual === branch) this.environmentBranchVisual = null;
                        branch.destroy();
                    });
                }
            });
        });
    }

    addEnvironmentalReactionSensor (x, type)
    {
        const sensor = this.add.rectangle(x, 515, 145, 260, 0x000000, 0);
        this.physics.add.existing(sensor);
        sensor.body.setAllowGravity(false);
        sensor.body.setImmovable(true);
        const item = { sensor, x, type, triggered: false };
        this.environmentReactionSensors.push(item);
        this.physics.add.overlap(this.player, sensor, () => this.triggerEnvironmentalReaction(item));
    }

    triggerEnvironmentalReaction (item)
    {
        if (item.triggered || this.phaseCompleted) return;
        item.triggered = true;
        item.sensor.body.enable = false;

        if (item.type === 0)
        {
            for (let i = 0; i < 4; i += 1)
            {
                const leaf = this.trackEnvironmentObject(
                    this.add.ellipse(item.x - 30 + i * 18, 600 - (i % 2) * 8, 9, 4, i % 2 ? 0x557744 : 0x6a8150, 0.62).setDepth(18)
                );
                this.tweens.add({ targets: leaf, x: leaf.x + 28 + i * 5, y: leaf.y - 35 - i * 5, angle: 65 + i * 20, alpha: 0, duration: 420 + i * 35, onComplete: () => leaf.destroy() });
            }
        }
        else if (item.type === 1)
        {
            for (let i = 0; i < 3; i += 1)
            {
                const bird = this.trackEnvironmentObject(
                    this.add.triangle(item.x + i * 18, 420 - i * 12, -7, 3, 0, -3, 7, 3, 0x17231c, 0.8).setDepth(17)
                );
                this.tweens.add({ targets: bird, x: bird.x + 90 + i * 18, y: bird.y - 65 - i * 18, alpha: 0, duration: 620 + i * 70, onComplete: () => bird.destroy() });
            }
        }
        else
        {
            const fog = this.trackEnvironmentObject(
                this.add.ellipse(item.x, 590, 190, 44, 0xcbd8cf, 0.055).setDepth(3)
            );
            this.tweens.add({ targets: fog, x: fog.x + 90, scaleX: 1.35, alpha: 0, duration: 820, onComplete: () => fog.destroy() });
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

        this.environmentUnstablePlatforms.forEach((item) => {
            this.tweens.killTweensOf(item.visual);
            item.triggered = false;
            item.body.body.enable = true;
            item.sensor.body.enable = true;
            item.visual.setPosition(item.x, item.y).setAngle(0).setAlpha(1);
        });

        if (this.environmentBranchVisual)
        {
            this.tweens.killTweensOf(this.environmentBranchVisual);
            this.environmentBranchVisual.destroy();
            this.environmentBranchVisual = null;
        }
        this.environmentBranchTriggered = false;
        if (this.environmentBranchSensor) this.environmentBranchSensor.body.enable = true;

        this.environmentReactionSensors.forEach((item) => {
            item.triggered = false;
            item.sensor.body.enable = true;
        });
    }

    createLivingAtmosphere ()
    {
        this.livingAtmosphereProfile={"phase":1,"worldWidth":3000,"farScroll":0.07,"farAlpha":0.55,"farColor":531479,"farStep":260,"farHeight":190,"farHeightStep":34,"farTrunk":18,"farCrown":62,"lowCanopy":false,"lowCanopyColor":730652,"fogColor":12110783,"fogBackAlpha":0.045,"fogMidAlpha":0.032,"fogFrontAlpha":0.022,"rayColor":14542543,"rays":[{"x":780,"y":155,"w":95,"h":420,"alpha":0.035,"angle":-13,"scroll":0.52},{"x":2050,"y":180,"w":120,"h":390,"alpha":0.028,"angle":11,"scroll":0.58}],"swayColor":1722155,"sway":[{"x":720,"y":620,"w":95,"h":28,"alpha":0.32},{"x":1510,"y":618,"w":88,"h":25,"alpha":0.28},{"x":2480,"y":616,"w":100,"h":30,"alpha":0.3}],"vignetteAlpha":0,"toneColor":733225,"leafDelay":3200,"moteDelay":3000,"birdDelay":11500,"shadowDelay":20000,"maxLeaves":6,"maxMotes":8,"maxBirds":2,"initialMotes":4,"verticalLeaves":false,"largeLeaves":false,"leafColorA":6653519,"leafColorB":5207365,"leafAlpha":0.55,"leafDepth":16,"moteColor":15067325,"moteAlpha":0.24,"moteDepth":11,"dustMotes":false,"birdColor":1320477,"birdAlpha":0.68,"shadows":false,"shadowW":90,"shadowH":28,"shadowColor":1253401,"shadowAlpha":0.08,"region1":1100,"region2":2200};
        this.livingAtmosphereTimers=[];
        this.livingAtmospherePermanent=[];
        this.livingAtmosphereLeaves=[];
        this.livingAtmosphereMotes=[];
        this.livingAtmosphereBirds=[];
        this.livingAtmosphereShadows=[];
        this.livingAtmosphereSerial=0;
        this.livingAtmosphereRegion=-1;

        const p=this.livingAtmosphereProfile;
        const width=this.physics.world.bounds.width||p.worldWidth;

        const far=this.add.graphics().setDepth(-44).setScrollFactor(p.farScroll).setAlpha(p.farAlpha);
        far.fillStyle(p.farColor,1);
        for(let x=-180,i=0;x<width+500;x+=p.farStep,i++){
            const h=p.farHeight+(i%3)*p.farHeightStep;
            far.fillRect(x,520-h*.52,p.farTrunk+(i%2)*5,h);
            far.fillCircle(x+20,505-h*.52,p.farCrown+(i%3)*9);
            far.fillCircle(x-28,525-h*.52,p.farCrown*.62);
            far.fillCircle(x+62,530-h*.52,p.farCrown*.68);
        }
        this.trackLivingPermanent(far);

        if(p.lowCanopy){
            const canopy=this.add.graphics().setDepth(-22).setScrollFactor(.16).setAlpha(.72);
            canopy.fillStyle(p.lowCanopyColor,1);
            for(let x=-120,i=0;x<width+400;x+=210,i++){
                canopy.fillEllipse(x,700-(i%3)*16,260+(i%2)*45,110+(i%3)*18);
            }
            this.trackLivingPermanent(canopy);
            this.tweens.add({targets:canopy,y:-8,duration:12000,yoyo:true,repeat:-1,ease:'Sine.InOut'});
        }

        this.livingFogBack=this.trackLivingPermanent(
            this.add.rectangle(width*.28,500,width*.72,120,p.fogColor,p.fogBackAlpha)
                .setDepth(-20).setScrollFactor(.16)
        );
        this.livingFogMid=this.trackLivingPermanent(
            this.add.rectangle(width*.58,555,width*.78,94,p.fogColor,p.fogMidAlpha)
                .setDepth(-15).setScrollFactor(.36)
        );
        this.livingFogFront=this.trackLivingPermanent(
            this.add.ellipse(width*.42,610,780,70,p.fogColor,p.fogFrontAlpha)
                .setDepth(3).setScrollFactor(.72)
        );

        this.tweens.add({targets:this.livingFogBack,x:this.livingFogBack.x+70,duration:19000,yoyo:true,repeat:-1,ease:'Sine.InOut'});
        this.tweens.add({targets:this.livingFogMid,x:this.livingFogMid.x-95,duration:15000,yoyo:true,repeat:-1,ease:'Sine.InOut'});
        this.tweens.add({targets:this.livingFogFront,x:this.livingFogFront.x+55,duration:11500,yoyo:true,repeat:-1,ease:'Sine.InOut'});

        this.livingAtmosphereRays=[];
        p.rays.forEach((rayData,index)=>{
            const ray=this.add.rectangle(rayData.x,rayData.y,rayData.w,rayData.h,p.rayColor,rayData.alpha)
                .setOrigin(.5,0).setAngle(rayData.angle).setDepth(-8).setScrollFactor(rayData.scroll);
            this.livingAtmosphereRays.push(this.trackLivingPermanent(ray));
            this.tweens.add({
                targets:ray,
                scaleX:{from:.96,to:1.04},
                duration:3200+index*700,
                yoyo:true,
                repeat:-1,
                ease:'Sine.InOut'
            });
        });

        p.sway.forEach((s,index)=>{
            const plant=this.add.ellipse(s.x,s.y,s.w,s.h,p.swayColor,s.alpha)
                .setDepth(7).setScrollFactor(.94).setAngle(index%2?-2:2);
            this.trackLivingPermanent(plant);
            this.tweens.add({
                targets:plant,
                angle:index%2?3:-3,
                scaleX:{from:.96,to:1.04},
                duration:2600+index*520,
                yoyo:true,
                repeat:-1,
                ease:'Sine.InOut'
            });
        });

        if(p.vignetteAlpha>0){
            [
                this.add.rectangle(0,0,1024,78,0x000000,p.vignetteAlpha).setOrigin(0),
                this.add.rectangle(0,690,1024,78,0x000000,p.vignetteAlpha).setOrigin(0),
                this.add.rectangle(0,0,70,768,0x000000,p.vignetteAlpha).setOrigin(0),
                this.add.rectangle(954,0,70,768,0x000000,p.vignetteAlpha).setOrigin(0)
            ].forEach(edge=>this.trackLivingPermanent(edge.setScrollFactor(0).setDepth(80)));
        }

        this.livingAtmosphereTone=this.trackLivingPermanent(
            this.add.rectangle(0,0,1024,768,p.toneColor,0)
                .setOrigin(0).setScrollFactor(0).setDepth(-43)
        );

        this.addLivingAtmosphereTimer(p.leafDelay,()=>this.spawnLivingLeaf());
        this.addLivingAtmosphereTimer(p.moteDelay,()=>this.spawnLivingMote());
        this.addLivingAtmosphereTimer(p.birdDelay,()=>this.spawnLivingBird());
        this.addLivingAtmosphereTimer(p.shadowDelay,()=>this.spawnLivingShadow());

        for(let i=0;i<p.initialMotes;i++)this.spawnLivingMote(true);

        this.events.once('shutdown',()=>this.cleanupLivingAtmosphere());
    }

    trackLivingPermanent (object)
    {
        this.livingAtmospherePermanent.push(object);
        return object;
    }

    addLivingAtmosphereTimer (delay,callback)
    {
        const timer=this.time.addEvent({delay,loop:true,callback});
        this.livingAtmosphereTimers.push(timer);
        return timer;
    }

    removeLivingObject (list,object)
    {
        const index=list.indexOf(object);
        if(index>=0)list.splice(index,1);
        if(object&&object.active)object.destroy();
    }

    spawnLivingLeaf (initial=false)
    {
        const p=this.livingAtmosphereProfile;
        if(this.phaseCompleted||this.isPlayerDead)return;
        const bossQuiet=(p.phase===2&&this.arenaStarted)||(p.phase===5&&this.bossStarted);
        if(bossQuiet&&this.livingAtmosphereSerial%3!==0)return;
        if(this.livingAtmosphereLeaves.length>=p.maxLeaves)return;

        const serial=this.livingAtmosphereSerial++;
        const cam=this.cameras.main;
        const x=cam.scrollX+90+(serial*173)%840;
        const y=(p.verticalLeaves?70:130)+(serial%4)*52;
        const leaf=this.add.ellipse(x,y,p.largeLeaves?13:9,p.largeLeaves?6:4,serial%2?p.leafColorA:p.leafColorB,p.leafAlpha)
            .setDepth(p.leafDepth).setAngle((serial%5)*24-45);
        this.livingAtmosphereLeaves.push(leaf);

        const drift=p.verticalLeaves?(serial%2?26:-22):(90+(serial%3)*34);
        const fall=p.verticalLeaves?300+(serial%3)*70:170+(serial%3)*40;
        this.tweens.add({
            targets:leaf,
            x:leaf.x+drift,
            y:leaf.y+fall,
            angle:leaf.angle+(serial%2?190:-170),
            alpha:0,
            duration:initial?3600:4300+(serial%3)*550,
            ease:'Sine.In',
            onComplete:()=>this.removeLivingObject(this.livingAtmosphereLeaves,leaf)
        });
    }

    spawnLivingMote (initial=false)
    {
        const p=this.livingAtmosphereProfile;
        if(this.phaseCompleted||this.isPlayerDead)return;
        const quiet=(p.phase===2&&(this.arenaStarted||this.player.x>2350))||
            (p.phase===4&&this.player.x>1850)||
            (p.phase===5&&(this.bossStarted||this.player.x>2800));
        if(quiet&&!initial)return;
        if(this.livingAtmosphereMotes.length>=p.maxMotes)return;

        const serial=this.livingAtmosphereSerial++;
        const cam=this.cameras.main;
        const x=cam.scrollX+130+(serial*137)%760;
        const y=180+(serial%5)*68;
        const mote=this.add.circle(x,y,p.dustMotes?2.4:1.8,p.moteColor,p.moteAlpha)
            .setDepth(p.moteDepth);
        this.livingAtmosphereMotes.push(mote);

        this.tweens.add({
            targets:mote,
            x:mote.x+(serial%2?28:-24),
            y:mote.y+(p.dustMotes?48:-34-(serial%3)*8),
            alpha:0,
            duration:initial?4200:5000+(serial%4)*500,
            ease:'Sine.InOut',
            onComplete:()=>this.removeLivingObject(this.livingAtmosphereMotes,mote)
        });
    }

    spawnLivingBird ()
    {
        const p=this.livingAtmosphereProfile;
        if(this.phaseCompleted||this.isPlayerDead)return;
        const blocked=(p.phase===2&&(this.arenaStarted||this.player.x>2050))||
            (p.phase===4&&this.player.x>1650)||
            (p.phase===5&&(this.bossStarted||this.player.x>2200));
        if(blocked||this.livingAtmosphereBirds.length>=p.maxBirds)return;

        const serial=this.livingAtmosphereSerial++;
        const cam=this.cameras.main;
        const count=1+(serial%2);
        for(let i=0;i<count&&this.livingAtmosphereBirds.length<p.maxBirds;i++){
            const bird=this.add.triangle(cam.scrollX-40-i*35,160+i*28,-8,3,0,-3,8,3,p.birdColor,p.birdAlpha)
                .setDepth(-21).setScrollFactor(.48);
            this.livingAtmosphereBirds.push(bird);
            this.tweens.add({
                targets:bird,
                x:bird.x+1120+i*90,
                y:bird.y-70-i*22,
                alpha:0,
                duration:6500+i*900,
                ease:'Sine.InOut',
                onComplete:()=>this.removeLivingObject(this.livingAtmosphereBirds,bird)
            });
        }
    }

    spawnLivingShadow ()
    {
        const p=this.livingAtmosphereProfile;
        if(this.phaseCompleted||this.isPlayerDead||!p.shadows)return;
        const allowed=(p.phase===2&&this.player.x>1250&&!this.arenaStarted)||
            (p.phase===4&&this.player.x>2850)||
            (p.phase===5&&this.player.x>1750&&!this.bossStarted);
        if(!allowed||this.livingAtmosphereShadows.length>=1)return;

        const serial=this.livingAtmosphereSerial++;
        const cam=this.cameras.main;
        const shadow=this.add.ellipse(cam.scrollX+760,470+(serial%3)*35,p.shadowW,p.shadowH,p.shadowColor,p.shadowAlpha)
            .setDepth(-23).setScrollFactor(.4);
        this.livingAtmosphereShadows.push(shadow);
        this.tweens.add({
            targets:shadow,
            x:shadow.x+(serial%2?210:-180),
            alpha:0,
            duration:2600+(serial%3)*500,
            ease:'Sine.InOut',
            onComplete:()=>this.removeLivingObject(this.livingAtmosphereShadows,shadow)
        });

        if(p.phase===4||p.phase===5){
            const rumble=this.add.ellipse(
                shadow.x,
                600,
                p.phase===5?210:160,
                p.phase===5?30:24,
                p.moteColor,
                p.phase===5?.055:.045
            ).setDepth(-14).setScrollFactor(.46);
            this.livingAtmosphereShadows.push(rumble);
            this.tweens.add({
                targets:rumble,
                scaleX:1.45,
                x:rumble.x+(serial%2?34:-30),
                alpha:0,
                duration:900,
                ease:'Sine.Out',
                onComplete:()=>this.removeLivingObject(this.livingAtmosphereShadows,rumble)
            });
        }
    }

    updateLivingAtmosphere ()
    {
        const p=this.livingAtmosphereProfile;
        if(!p||!this.player)return;

        let region=0;
        if(this.player.x>=p.region2)region=2;
        else if(this.player.x>=p.region1)region=1;

        if(p.phase===2&&this.arenaStarted)region=3;
        if(p.phase===5&&this.bossStarted)region=3;

        if(region===this.livingAtmosphereRegion)return;
        this.livingAtmosphereRegion=region;

        let back=p.fogBackAlpha,mid=p.fogMidAlpha,front=p.fogFrontAlpha,tone=0,rayScale=1;

        if(p.phase===1){
            if(region===1){front*=1.08;rayScale=1.2;}
            if(region===2){mid*=1.12;tone=.018;rayScale=.9;}
        }
        else if(p.phase===2){
            if(region===1){back*=1.1;mid*=1.15;tone=.018;rayScale=.7;}
            if(region>=2){back*=1.22;mid*=1.28;front*=.8;tone=.032;rayScale=.35;}
            if(region===3){front*=.55;rayScale=.18;}
        }
        else if(p.phase===3){
            if(region===1){back*=.9;mid*=1.08;rayScale=1.25;tone=.012;}
            if(region===2){front*=.8;rayScale=1.45;tone=.018;}
        }
        else if(p.phase===4){
            if(region===1){back*=.9;mid*=1.15;front*=1.18;tone=.035;rayScale=.45;}
            if(region===2){back*=1.05;mid*=1.3;front*=1.1;tone=.055;rayScale=.2;}
        }
        else if(p.phase===5){
            if(region===1){back*=1.18;mid*=1.2;front*=1.08;tone=.035;rayScale=.45;}
            if(region===2){back*=1.35;mid*=1.32;front*=1.12;tone=.065;rayScale=.22;}
            if(region===3){back*=1.4;mid*=1.38;front*=.82;tone=.072;rayScale=.1;}
        }

        [
            [this.livingFogBack,back],
            [this.livingFogMid,mid],
            [this.livingFogFront,front],
            [this.livingAtmosphereTone,tone]
        ].forEach(([target,alpha])=>{
            this.tweens.add({targets:target,alpha,duration:1100,ease:'Sine.InOut'});
        });

        this.livingAtmosphereRays.forEach((ray,index)=>{
            const base=p.rays[index].alpha;
            this.tweens.add({targets:ray,alpha:base*rayScale,duration:1000,ease:'Sine.InOut'});
        });
    }

    clearLivingAtmosphereTransient ()
    {
        [
            this.livingAtmosphereLeaves,
            this.livingAtmosphereMotes,
            this.livingAtmosphereBirds,
            this.livingAtmosphereShadows
        ].forEach(list=>{
            if(!list)return;
            list.slice().forEach(object=>{
                if(object&&object.active){
                    this.tweens.killTweensOf(object);
                    object.destroy();
                }
            });
            list.length=0;
        });
    }

    cleanupLivingAtmosphere ()
    {
        if(!this.livingAtmosphereTimers)return;
        this.livingAtmosphereTimers.forEach(timer=>timer.remove(false));
        this.livingAtmosphereTimers.length=0;
        this.clearLivingAtmosphereTransient();

        this.livingAtmospherePermanent.forEach(object=>{
            if(object&&object.active){
                this.tweens.killTweensOf(object);
                object.destroy();
            }
        });
        this.livingAtmospherePermanent.length=0;
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

    showPlayerNameIntro ()
    {
        const playerName = String(this.registry.get('playerName') || 'SERINGUEIRO').slice(0, 16);
        const intro = this.add.container(512, 286).setScrollFactor(0).setDepth(170);
        const panel = this.add.rectangle(0, 0, 430, 132, 0x06100d, 0.76)
            .setStrokeStyle(1, 0x78917c, 0.32);
        const phaseText = this.add.text(0, -38, 'FASE 1', {
            fontFamily: 'Arial Black',
            fontSize: '15px',
            color: '#d6b56c'
        }).setOrigin(0.5);
        const titleText = this.add.text(0, -8, 'INÍCIO DA JORNADA', {
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

    queueJumpInput (time)
    {
        this.jumpBufferUntil = time + this.jumpBufferMs;
    }

    updateGroundedState (grounded)
    {
        const time = this.time.now;
        if (!grounded) this.lastAirVelocityY = this.player.body.velocity.y;
        if (grounded) this.coyoteUntil = time + this.coyoteTimeMs;

        if (grounded && !this.wasGrounded)
        {
            this.firstJumpConsumed = false;
            this.fastFallActive = false;
            this.showLandingFeedback(this.lastAirVelocityY);
            this.lastAirVelocityY = 0;
        }

        this.wasGrounded = grounded;
    }

    consumeJumpBuffer (grounded)
    {
        if (this.jumpBufferUntil < this.time.now) return false;
        const canUseFirstJump = !this.firstJumpConsumed && (grounded || this.time.now <= this.coyoteUntil);
        if (!canUseFirstJump) return false;

        this.player.body.setVelocityY(-520);
        this.firstJumpConsumed = true;
        this.coyoteUntil = 0;
        this.jumpBufferUntil = 0;
        this.showJumpTakeoffEffect();
        this.setMotionSquash(1.07, 0.93, 115);
        return true;
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
        this.jumpWasDown = false;
        this.jumpBufferUntil = 0;
        this.coyoteUntil = 0;
        this.firstJumpConsumed = false;
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

    update ()
    {
        const time = this.time.now;
        const moveSpeed = 260;
        const grounded = this.player.body.blocked.down || this.player.body.touching.down;
        const jumpDown = this.keyW.isDown || this.cursors.up.isDown || this.spaceKey.isDown;

        if (jumpDown && !this.jumpWasDown) this.queueJumpInput(time);
        else if (!jumpDown && this.jumpWasDown) this.applyJumpCut();
        this.jumpWasDown = jumpDown;

        if (!this.isPlayerDead && !this.phaseCompleted)
        {
            if (time >= this.knockbackUntil)
            {
                const moveLeft = this.cursors.left.isDown || this.keyA.isDown;
                const moveRight = this.cursors.right.isDown || this.keyD.isDown;
                const direction = moveLeft && !moveRight ? -1 : moveRight && !moveLeft ? 1 : 0;
                if (direction !== 0 && this.lastMoveDirection !== 0 && direction !== this.lastMoveDirection) this.showDirectionChangeFeedback(direction);
                if (direction !== 0) this.lastMoveDirection = direction;
                this.player.body.setVelocityX(direction * moveSpeed);
            }

            this.updateGroundedState(grounded);
            this.consumeJumpBuffer(grounded);
            this.applyFastFall(grounded);
        }
        else
        {
            this.updateGroundedState(grounded);
            this.fastFallActive = false;
        }

        if (this.player.y > 760)
        {
            this.player.setPosition(this.spawnPoint.x, this.spawnPoint.y);
            this.player.body.setVelocity(0, 0);
            this.resetMovementPolishState(); this.resetCombatPolishState();
            this.resetEnvironmentalChallenges();
            this.clearLivingAtmosphereTransient();
        }

        this.syncPlayerVisual();
        this.animatePlayerVisual(time);
        this.updateAttack(time);
        this.updateSnake(time);
        this.updateCarapana(time);
        this.updateFruits(time);
        this.updateHunger(time);
        this.updateLivingAtmosphere();
    }
}
