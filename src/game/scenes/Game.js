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

        this.isAttacking = false;
        this.attackStartedAt = 0;
        this.nextAttackAt = 0;
        this.attackDirection = 1;
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
        this.spaceKey = this.input.keyboard.addKey('SPACE');
        this.keyJ = this.input.keyboard.addKey('J');
        this.keyX = this.input.keyboard.addKey('X');

        this.keyJ.on('down', () => this.startAttack());
        this.keyX.on('down', () => this.startAttack());

        // Câmera lateral preservada.
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setDeadzone(220, 160);

        this.createHud();
        this.createHealthHud();
        this.createHungerHud();

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

    startAttack ()
    {
        const now = this.time.now;

        if (this.phaseCompleted || this.isPlayerDead || this.isAttacking || now < this.nextAttackAt)
        {
            return;
        }

        this.isAttacking = true;
        this.attackStartedAt = now;
        this.nextAttackAt = now + 400;
        this.attackDirection = this.playerVisual.facing || 1;
        this.attackHitRegistered = false;
        this.attackHitCarapanaRegistered = false;
    }

    updateAttack (time)
    {
        if (!this.isAttacking)
        {
            this.attackHitbox.body.enable = false;
            return;
        }

        const elapsed = time - this.attackStartedAt;
        const progress = Math.min(elapsed / 300, 1);
        const swing = Math.sin(progress * Math.PI);

        const parts = this.playerVisual.parts;
        const direction = this.attackDirection;

        const baseRightArmAngle = this.playerBaseRightArmAngle ?? parts.rightArmRig.angle;
        const baseTorsoAngle = this.playerBaseTorsoAngle ?? parts.torso.angle;

        parts.rightArmRig.angle = baseRightArmAngle + (55 * swing);
        parts.machete.angle = 18 + (40 * swing);
        parts.torso.angle = baseTorsoAngle + (5 * swing);

        const activeWindow = elapsed >= 90 && elapsed <= 210;

        if (activeWindow)
        {
            this.attackHitbox.body.enable = true;
            this.attackHitbox.setPosition(
                this.player.x + (46 * direction),
                this.player.y - 2
            );
        }
        else
        {
            this.attackHitbox.body.enable = false;
        }

        if (elapsed >= 300)
        {
            this.isAttacking = false;
            this.attackHitbox.body.enable = false;
            parts.machete.angle = 18;
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
        this.player.body.setVelocity(0, 0);

        this.time.delayedCall(650, () => {
            this.player.setPosition(this.spawnPoint.x, this.spawnPoint.y);
            this.player.body.setVelocity(0, 0);

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
        this.hungerHud = this.add.container(395, 78)
            .setScrollFactor(0)
            .setDepth(102);

        const background = this.add.rectangle(0, 0, 235, 58, 0x06100d, 0.78)
            .setOrigin(0);
        background.setStrokeStyle(1, 0x78917c, 0.35);

        this.hungerLabel = this.add.text(12, 7, 'FOME', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#f1e1ae'
        });

        const barBack = this.add.rectangle(12, 29, 150, 16, 0x3d2b16, 0.95)
            .setOrigin(0);
        barBack.setStrokeStyle(1, 0x9b7b45, 0.65);

        this.hungerBar = this.add.rectangle(12, 29, 150, 16, 0xd49a3a, 1)
            .setOrigin(0);

        this.hungerText = this.add.text(172, 27, '100/100', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#ffffff'
        });

        this.hungerHud.add([
            background,
            this.hungerLabel,
            barBack,
            this.hungerBar,
            this.hungerText
        ]);

        this.updateHungerHud();
    }

    updateHungerHud ()
    {
        const ratio = Math.max(0, this.hunger / this.maxHunger);

        this.hungerBar.width = 150 * ratio;
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
        this.healthHud = this.add.container(395, 18)
            .setScrollFactor(0)
            .setDepth(102);

        const background = this.add.rectangle(0, 0, 235, 58, 0x06100d, 0.78)
            .setOrigin(0);
        background.setStrokeStyle(1, 0x78917c, 0.35);

        const label = this.add.text(12, 7, 'VIDA', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#f1e1ae'
        });

        const barBack = this.add.rectangle(12, 29, 150, 16, 0x351b18, 0.95)
            .setOrigin(0);
        barBack.setStrokeStyle(1, 0x8e6f62, 0.65);

        this.healthBar = this.add.rectangle(12, 29, 150, 16, 0x8fb35b, 1)
            .setOrigin(0);

        this.healthText = this.add.text(172, 27, '100/100', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#ffffff'
        });

        this.healthHud.add([
            background,
            label,
            barBack,
            this.healthBar,
            this.healthText
        ]);

        this.updateHealthHud();
    }

    updateHealthHud ()
    {
        const ratio = Math.max(0, this.health / this.maxHealth);

        this.healthBar.width = 150 * ratio;
        this.healthText.setText(`${this.health}/${this.maxHealth}`);
    }

    createHud ()
    {
        const panel = this.add.rectangle(15, 15, 365, 124, 0x06100d, 0.72)
            .setOrigin(0)
            .setScrollFactor(0)
            .setDepth(100);
        panel.setStrokeStyle(1, 0x78917c, 0.35);

        this.add.text(
            30,
            27,
            'SOLDADOS DA BORRACHA - PROTÓTIPO',
            {
                fontFamily: 'Arial',
                fontSize: '18px',
                color: '#f1e1ae'
            }
        ).setScrollFactor(0).setDepth(101);

        this.add.text(
            30,
            56,
            'Controles:\nA/D ou ←/→ = mover\nW / ↑ / Espaço = pular\nJ / X = atacar',
            {
                fontFamily: 'Arial',
                fontSize: '15px',
                color: '#c7d6ca',
                lineSpacing: 3
            }
        ).setScrollFactor(0).setDepth(101);
    }

    update ()
    {
        const moveSpeed = 260;
        const jumpSpeed = 520;

        if (!this.isPlayerDead && !this.phaseCompleted)
        {
            if (this.time.now >= this.knockbackUntil)
            {
                const moveLeft = this.cursors.left.isDown || this.keyA.isDown;
                const moveRight = this.cursors.right.isDown || this.keyD.isDown;

                if (moveLeft)
                {
                    this.player.body.setVelocityX(-moveSpeed);
                }
                else if (moveRight)
                {
                    this.player.body.setVelocityX(moveSpeed);
                }
                else
                {
                    this.player.body.setVelocityX(0);
                }
            }

            const wantsToJump =
                this.keyW.isDown ||
                this.cursors.up.isDown ||
                this.spaceKey.isDown;

            const isGrounded =
                this.player.body.blocked.down ||
                this.player.body.touching.down;

            if (wantsToJump && isGrounded)
            {
                this.player.body.setVelocityY(-jumpSpeed);
            }
        }

        if (this.player.y > 760)
        {
            this.player.setPosition(this.spawnPoint.x, this.spawnPoint.y);
            this.player.body.setVelocity(0, 0);
        }

        this.syncPlayerVisual();
        this.animatePlayerVisual(this.time.now);
        this.updateAttack(this.time.now);
        this.updateSnake(this.time.now);
        this.updateCarapana(this.time.now);
        this.updateFruits(this.time.now);
        this.updateHunger(this.time.now);
    }
}
