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
        this.cameras.main.setBackgroundColor('#071a12');

        // Elementos provisórios do cenário
        this.add.circle(820, 120, 60, 0xd9e2d0);
        this.add.circle(1820, 120, 60, 0xd9e2d0);

        this.platforms = this.physics.add.staticGroup();

        const addPlatform = (x, y, width, height, color = 0x3b2a18) => {
            const platform = this.add.rectangle(x, y, width, height, color);
            this.physics.add.existing(platform, true);
            this.platforms.add(platform);
            return platform;
        };

        // Terreno principal dividido para criar pequenos buracos
        addPlatform(350, 710, 700, 116);
        addPlatform(1050, 710, 580, 116);
        addPlatform(1800, 710, 760, 116);
        addPlatform(2650, 710, 700, 116);

        // Vegetação provisória acompanhando os trechos de chão
        this.add.rectangle(350, 647, 700, 10, 0x1f4d2e);
        this.add.rectangle(1050, 647, 580, 10, 0x1f4d2e);
        this.add.rectangle(1800, 647, 760, 10, 0x1f4d2e);
        this.add.rectangle(2650, 647, 700, 10, 0x1f4d2e);

        // Plataformas e obstáculos simples
        addPlatform(560, 600, 120, 30, 0x725132);
        addPlatform(930, 560, 180, 28, 0x725132);
        addPlatform(1420, 620, 80, 60, 0x5f4027);
        addPlatform(1650, 540, 200, 28, 0x725132);
        addPlatform(2240, 590, 150, 30, 0x725132);
        addPlatform(2490, 520, 190, 28, 0x725132);

        // Personagem provisório com corpo físico
        this.player = this.add.rectangle(150, 560, 45, 70, 0xd6b56c);
        this.physics.add.existing(this.player);

        this.player.body.setCollideWorldBounds(true);
        this.player.body.setMaxVelocity(260, 900);
        this.player.body.setSize(45, 70);

        this.physics.add.collider(this.player, this.platforms);

        // Controles
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey('A');
        this.keyD = this.input.keyboard.addKey('D');
        this.keyW = this.input.keyboard.addKey('W');
        this.spaceKey = this.input.keyboard.addKey('SPACE');

        // Câmera lateral
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setDeadzone(220, 160);

        // HUD fixo na câmera
        this.add.text(
            20,
            20,
            'SOLDADOS DA BORRACHA - PROTÓTIPO',
            {
                fontFamily: 'Arial',
                fontSize: '18px',
                color: '#ffffff'
            }
        ).setScrollFactor(0).setDepth(100);

        this.add.text(
            20,
            50,
            'Controles:\nA/D ou ←/→ = mover\nW / ↑ / Espaço = pular',
            {
                fontFamily: 'Arial',
                fontSize: '16px',
                color: '#b7c9bd',
                lineSpacing: 4
            }
        ).setScrollFactor(0).setDepth(100);

        this.spawnPoint = { x: 150, y: 560 };
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
    }
}
