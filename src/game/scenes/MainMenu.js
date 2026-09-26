import { Scene } from 'phaser';

export class MainMenu extends Scene
{
    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        // Fundo escuro inspirado na Floresta Amazônica
        this.add.rectangle(512, 384, 1024, 768, 0x071a12);

        // Lua ao fundo
        this.add.circle(830, 130, 70, 0xd9e2d0, 0.8);

        // Névoa simples
        this.add.rectangle(512, 610, 1024, 150, 0x9fb7aa, 0.08);
        this.add.rectangle(512, 670, 1024, 100, 0xffffff, 0.04);

        // Nome da equipe
        this.add.text(512, 100, 'TROPA DO SERINGAL', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#d6b56c',
            letterSpacing: 4
        }).setOrigin(0.5);

        // Título do game
        this.add.text(512, 230, 'SOLDADOS\nDA BORRACHA', {
            fontFamily: 'Arial Black',
            fontSize: '64px',
            color: '#f1e1ae',
            stroke: '#291b0d',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        // Frase
        this.add.text(
            512,
            390,
            'A floresta levou o que ele mais amava.\nAgora ele irá buscá-la.',
            {
                fontFamily: 'Arial',
                fontSize: '22px',
                color: '#c8d8cc',
                align: 'center',
                lineSpacing: 8
            }
        ).setOrigin(0.5);

        // Botão
        const button = this.add.rectangle(
            512,
            530,
            300,
            70,
            0x8b5a2b
        )
        .setStrokeStyle(3, 0xd6b56c)
        .setInteractive({ useHandCursor: true });

        const buttonText = this.add.text(
            512,
            530,
            'INICIAR JORNADA',
            {
                fontFamily: 'Arial Black',
                fontSize: '24px',
                color: '#ffffff'
            }
        ).setOrigin(0.5);

        button.on('pointerover', () => {
            button.setFillStyle(0xb37638);
        });

        button.on('pointerout', () => {
            button.setFillStyle(0x8b5a2b);
        });

        button.on('pointerdown', () => {
            this.scene.start('Game');
        });

        // Rodapé
        this.add.text(
            512,
            700,
            'Um jogo da Tropa do Seringal',
            {
                fontFamily: 'Arial',
                fontSize: '18px',
                color: '#799487'
            }
        ).setOrigin(0.5);
    }
}