import { Scene } from 'phaser';
import { getAudioManager } from '../audio/AudioManager.js';
import { createAudioSettingsControl } from '../ui/AudioSettingsPanel.js';

export class MainMenu extends Scene
{
    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        this.audioManager = getAudioManager(this);
        this.add.rectangle(512, 384, 1024, 768, 0x071a12);
        this.add.circle(830, 130, 70, 0xd9e2d0, 0.8);
        this.add.rectangle(512, 610, 1024, 150, 0x9fb7aa, 0.08);
        this.add.rectangle(512, 670, 1024, 100, 0xffffff, 0.04);

        this.add.text(512, 92, 'TROPA DO SERINGAL', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#d6b56c',
            letterSpacing: 4
        }).setOrigin(0.5);

        this.add.text(512, 215, 'SOLDADO\nDA BORRACHA', {
            fontFamily: 'Arial Black',
            fontSize: '62px',
            color: '#f1e1ae',
            stroke: '#291b0d',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(
            512,
            365,
            'A floresta levou o que ele mais amava.\nAgora ele irá buscá-la.',
            {
                fontFamily: 'Arial',
                fontSize: '21px',
                color: '#c8d8cc',
                align: 'center',
                lineSpacing: 8
            }
        ).setOrigin(0.5);

        this.createMenuButton(512, 500, 310, 64, 'INICIAR JORNADA', () => {
            this.startJourney();
        });

        this.createMenuButton(512, 580, 310, 58, 'SELECIONAR FASE', () => {
            this.scene.start('LevelSelectScene');
        }, 21);

        this.add.text(
            512,
            704,
            'Um jogo da Tropa do Seringal',
            {
                fontFamily: 'Arial',
                fontSize: '18px',
                color: '#799487'
            }
        ).setOrigin(0.5);

        this.audioSettingsUi = createAudioSettingsControl(this, {
            x: 970,
            y: 38,
            buttonSize: 48
        });

    }

    createMenuButton (x, y, width, height, label, onClick, fontSize = 24)
    {
        const button = this.add.rectangle(x, y, width, height, 0x8b5a2b)
            .setStrokeStyle(3, 0xd6b56c)
            .setInteractive({ useHandCursor: true });

        this.add.text(x, y, label, {
            fontFamily: 'Arial Black',
            fontSize: `${fontSize}px`,
            color: '#ffffff'
        }).setOrigin(0.5);

        button.on('pointerover', () => button.setFillStyle(0xb37638));
        button.on('pointerout', () => button.setFillStyle(0x8b5a2b));
        button.on('pointerdown', () => {
            this.audioManager?.unlock?.();
            onClick();
        });

        return button;
    }

    startJourney ()
    {
        this.registry.set('playerName', 'SERINGUEIRO');
        this.registry.set('doubleJumpUnlocked', false);
        this.registry.set('dashUnlocked', false);
        this.scene.start('IntroScene');
    }
}
