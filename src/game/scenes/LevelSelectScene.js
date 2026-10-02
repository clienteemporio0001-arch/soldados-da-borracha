import { Scene } from 'phaser';

export class LevelSelectScene extends Scene
{
    constructor ()
    {
        super('LevelSelectScene');
    }

    create ()
    {
        this.registry.set('playerName', 'SERINGUEIRO');

        this.add.rectangle(512, 384, 1024, 768, 0x04100c);

        const background = this.add.graphics().setDepth(-10);
        background.fillStyle(0x071a12, 1);
        background.fillRect(0, 0, 1024, 768);
        background.fillStyle(0x0b241b, 0.65);
        background.fillRect(0, 470, 1024, 298);

        for (let i = 0; i < 11; i += 1)
        {
            const x = 25 + i * 102;
            const h = 120 + (i % 4) * 32;
            background.fillStyle(i % 2 ? 0x0b2119 : 0x0e291f, 0.9);
            background.fillRect(x, 470 - h, 18 + (i % 3) * 5, h + 170);
            background.fillCircle(x + 10, 455 - h, 46 + (i % 3) * 11);
        }

        this.add.circle(850, 108, 54, 0xd8e0d5, 0.16);
        this.add.rectangle(512, 620, 1024, 155, 0xc7d5cd, 0.035);

        const roots = this.add.graphics().setDepth(0);
        roots.lineStyle(3, 0x34281c, 0.42);
        [
            [30, 650, 220, 570],
            [150, 700, 360, 600],
            [330, 705, 505, 590],
            [540, 700, 690, 590],
            [760, 705, 975, 610]
        ].forEach(([x1, y1, x2, y2], index) => {
            roots.lineBetween(x1, y1, x2, y2);
            roots.lineStyle(1 + (index % 2), 0x4a3926, 0.28);
            roots.lineBetween(x1 + 35, y1 - 8, x2 - 25, y2 + 18);
        });

        this.add.text(512, 66, 'MAPA DA JORNADA', {
            fontFamily: 'Arial Black',
            fontSize: '38px',
            color: '#f1e1ae',
            stroke: '#1c140b',
            strokeThickness: 5
        }).setOrigin(0.5);

        this.add.text(512, 112, 'SELECIONE UMA FASE', {
            fontFamily: 'Arial',
            fontSize: '15px',
            color: '#9fba9f',
            letterSpacing: 1
        }).setOrigin(0.5);

        const phases = [
            { number: 1, x: 125, y: 420, title: 'INÍCIO DA JORNADA', scene: 'Game', doubleJump: false, dash: false },
            { number: 2, x: 305, y: 320, title: 'RASTROS DO GUARDIÃO', scene: 'Level2Scene', doubleJump: false, dash: false },
            { number: 3, x: 500, y: 430, title: 'AS RAÍZES DO ALTO', scene: 'Level3Scene', doubleJump: true, dash: false },
            { number: 4, x: 700, y: 315, title: 'RASTROS NA MATA FERIDA', scene: 'Level4Scene', doubleJump: true, dash: true },
            { number: 5, x: 890, y: 415, title: 'TERRITÓRIO DO MAPINGUARI', scene: 'Level5Scene', doubleJump: true, dash: true }
        ];

        const trail = this.add.graphics().setDepth(2);
        trail.lineStyle(8, 0x2b2117, 0.85);
        for (let i = 0; i < phases.length - 1; i += 1)
        {
            const current = phases[i];
            const next = phases[i + 1];
            trail.lineBetween(current.x, current.y, next.x, next.y);
        }

        trail.lineStyle(2, 0xd6b56c, 0.38);
        for (let i = 0; i < phases.length - 1; i += 1)
        {
            const current = phases[i];
            const next = phases[i + 1];
            trail.lineBetween(current.x, current.y, next.x, next.y);
        }

        phases.forEach((phase, index) => {
            this.createPhaseNode(phase, index);
        });

        for (let i = 0; i < 13; i += 1)
        {
            const leaf = this.add.ellipse(
                80 + ((i * 79) % 880),
                175 + ((i * 53) % 390),
                12 + (i % 3) * 3,
                6,
                i % 2 ? 0x37573d : 0x4d6748,
                0.22
            ).setAngle((i * 31) % 150).setDepth(1);
            leaf.setScale(i % 2 ? 1 : -1, 1);
        }

        this.createBackButton();

        this.add.text(
            512,
            652,
            'SERINGUEIRO',
            {
                fontFamily: 'Arial',
                fontSize: '14px',
                color: '#799487'
            }
        ).setOrigin(0.5);

        this.input.keyboard.addKey('ESC').once('down', () => {
            this.scene.start('MainMenu');
        });
    }

    createPhaseNode (phase, index)
    {
        const ring = this.add.circle(phase.x, phase.y, 33, 0x07130f, 0.98)
            .setStrokeStyle(3, 0xd6b56c, 0.82)
            .setDepth(5);

        const core = this.add.circle(
            phase.x,
            phase.y,
            20,
            index === 4 ? 0x6f4828 : 0x36523b,
            1
        ).setDepth(6);

        this.createPhaseMarker(phase);

        this.add.text(phase.x, phase.y, String(phase.number), {
            fontFamily: 'Arial Black',
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0.5).setDepth(7);

        this.add.text(phase.x, phase.y + 51, `FASE ${phase.number}`, {
            fontFamily: 'Arial Black',
            fontSize: '16px',
            color: '#f1e1ae'
        }).setOrigin(0.5).setDepth(7);

        this.add.text(phase.x, phase.y + 73, phase.title, {
            fontFamily: 'Arial',
            fontSize: '12px',
            color: '#b8c9bd',
            align: 'center',
            wordWrap: { width: 165 }
        }).setOrigin(0.5, 0).setDepth(7);

        const hitArea = this.add.rectangle(phase.x, phase.y + 32, 170, 132, 0x000000, 0.001)
            .setDepth(8)
            .setInteractive({ useHandCursor: true });

        hitArea.on('pointerover', () => {
            ring.setStrokeStyle(4, 0xf1e1ae, 1);
            ring.setScale(1.08);
            core.setScale(1.08);
        });

        hitArea.on('pointerout', () => {
            ring.setStrokeStyle(3, 0xd6b56c, 0.82);
            ring.setScale(1);
            core.setScale(1);
        });

        hitArea.on('pointerdown', () => this.startSelectedLevel(phase));
    }

    createPhaseMarker (phase)
    {
        const marker = this.add.container(phase.x, phase.y - 58).setDepth(4);

        if (phase.number === 1)
        {
            const trunk = this.add.rectangle(0, 3, 7, 30, 0x5b432b).setOrigin(0.5, 1);
            const canopy = this.add.circle(0, -22, 17, 0x365b3b, 0.92);
            const hut = this.add.rectangle(23, 4, 20, 14, 0x6a4a2c).setOrigin(0.5, 1);
            const roof = this.add.triangle(23, -10, -14, 10, 14, 10, 0, -3, 0x8b6237);
            marker.add([trunk, canopy, hut, roof]);
        }
        else if (phase.number === 2)
        {
            const footA = this.add.ellipse(-8, -5, 13, 22, 0x8c7558, 0.7).setAngle(-18);
            const footB = this.add.ellipse(10, 7, 13, 22, 0x8c7558, 0.52).setAngle(18);
            marker.add([footA, footB]);
        }
        else if (phase.number === 3)
        {
            const trunk = this.add.rectangle(0, 4, 9, 36, 0x59462f).setOrigin(0.5, 1);
            const crown = this.add.circle(0, -25, 18, 0x2f5438, 0.9);
            const rootA = this.add.rectangle(-11, 5, 24, 3, 0x72583a).setAngle(-18);
            const rootB = this.add.rectangle(11, 5, 24, 3, 0x72583a).setAngle(18);
            marker.add([rootA, rootB, trunk, crown]);
        }
        else if (phase.number === 4)
        {
            const trunkA = this.add.rectangle(-8, 0, 10, 36, 0x60462f).setOrigin(0.5, 1).setAngle(-18);
            const trunkB = this.add.rectangle(11, -7, 9, 28, 0x60462f).setOrigin(0.5, 1).setAngle(24);
            const scar = this.add.rectangle(1, -6, 25, 3, 0xc6a36b, 0.7).setAngle(-12);
            marker.add([trunkA, trunkB, scar]);
        }
        else
        {
            const footprint = this.add.ellipse(0, 0, 28, 42, 0x4f3d2d, 0.82).setAngle(-8);
            const eyeL = this.add.circle(-13, -31, 3, 0xd6b768, 0.72);
            const eyeR = this.add.circle(13, -31, 3, 0xd6b768, 0.72);
            marker.add([footprint, eyeL, eyeR]);
        }
    }

    startSelectedLevel (phase)
    {
        this.registry.set('playerName', 'SERINGUEIRO');

        this.registry.set('doubleJumpUnlocked', phase.doubleJump);
        this.registry.set('dashUnlocked', phase.dash);
        this.scene.start(phase.scene);
    }

    createBackButton ()
    {
        const button = this.add.rectangle(512, 710, 250, 54, 0x18251d, 0.96)
            .setStrokeStyle(2, 0x78917c, 0.8)
            .setDepth(20)
            .setInteractive({ useHandCursor: true });

        this.add.text(512, 710, 'VOLTAR AO MENU', {
            fontFamily: 'Arial Black',
            fontSize: '19px',
            color: '#f1e1ae'
        }).setOrigin(0.5).setDepth(21);

        button.on('pointerover', () => button.setFillStyle(0x2a3b2f));
        button.on('pointerout', () => button.setFillStyle(0x18251d));
        button.on('pointerdown', () => this.scene.start('MainMenu'));
    }
}
