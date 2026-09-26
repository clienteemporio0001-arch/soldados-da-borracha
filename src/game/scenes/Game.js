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

        // Corpo físico do personagem preservado com o mesmo tamanho da versão validada.
        this.player = this.add.rectangle(150, 560, 45, 70, 0x000000, 0);
        this.physics.add.existing(this.player);

        this.player.body.setCollideWorldBounds(true);
        this.player.body.setMaxVelocity(260, 900);
        this.player.body.setSize(45, 70);

        this.physics.add.collider(this.player, this.platforms);

        this.playerVisual = this.createPlayerPlaceholder();
        this.syncPlayerVisual();

        // Controles preservados.
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey('A');
        this.keyD = this.input.keyboard.addKey('D');
        this.keyW = this.input.keyboard.addKey('W');
        this.spaceKey = this.input.keyboard.addKey('SPACE');

        // Câmera lateral preservada.
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setDeadzone(220, 160);

        this.createHud();

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
        const foreground = this.add.graphics().setDepth(30).setScrollFactor(1.08);
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

    createPlayerPlaceholder ()
    {
        const container = this.add.container(this.player.x, this.player.y).setDepth(20);

        // Pernas
        container.add(this.add.rectangle(-9, 22, 12, 28, 0x272820).setOrigin(0.5));
        container.add(this.add.rectangle(9, 22, 12, 28, 0x272820).setOrigin(0.5));

        // Tronco / camisa de seringueiro provisória
        container.add(this.add.rectangle(0, -5, 30, 34, 0xc7aa73).setOrigin(0.5));

        // Braços
        container.add(this.add.rectangle(-19, -3, 9, 30, 0xb89562).setOrigin(0.5).setAngle(6));
        container.add(this.add.rectangle(19, -3, 9, 30, 0xb89562).setOrigin(0.5).setAngle(-6));

        // Cabeça
        container.add(this.add.circle(0, -31, 11, 0xb98155));

        // Chapéu simples
        container.add(this.add.rectangle(0, -44, 34, 5, 0x5a432b).setOrigin(0.5));
        container.add(this.add.rectangle(0, -49, 21, 10, 0x6a5033).setOrigin(0.5));

        return container;
    }

    syncPlayerVisual ()
    {
        this.playerVisual.setPosition(this.player.x, this.player.y);
    }

    createHud ()
    {
        const panel = this.add.rectangle(15, 15, 365, 104, 0x06100d, 0.72)
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
            'Controles:\nA/D ou ←/→ = mover\nW / ↑ / Espaço = pular',
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

        if (this.player.y > 760)
        {
            this.player.setPosition(this.spawnPoint.x, this.spawnPoint.y);
            this.player.body.setVelocity(0, 0);
        }

        this.syncPlayerVisual();
    }
}
