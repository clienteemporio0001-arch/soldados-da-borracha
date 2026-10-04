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

        this.createMenuButton(512, 472, 310, 60, 'INICIAR JORNADA', () => {
            this.startJourney();
        });

        this.createMenuButton(512, 542, 310, 54, 'SELECIONAR FASE', () => {
            this.scene.start('LevelSelectScene');
        }, 20);

        this.createMenuButton(512, 607, 310, 50, 'COMO JOGAR', () => {
            this.showControlsModal();
        }, 19);

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

        if (this.registry.get('controlsIntroShown') !== true)
        {
            this.registry.set('controlsIntroShown', true);
            this.time.delayedCall(180, () => this.showControlsModal());
        }

    }

    showControlsModal ()
    {
        if (this.controlsModal?.active)
        {
            return;
        }

        const modal = this.add.container(0, 0).setDepth(1000);
        this.controlsModal = modal;

        const blocker = this.add.rectangle(512, 384, 1024, 768, 0x000000, 0.78)
            .setInteractive();

        const panel = this.add.rectangle(512, 384, 790, 550, 0x07100f, 0.98)
            .setStrokeStyle(3, 0xd6b56c, 0.95);

        const title = this.add.text(512, 145, 'COMO JOGAR', {
            fontFamily: 'Arial Black',
            fontSize: '34px',
            color: '#f1e1ae'
        }).setOrigin(0.5);

        const subtitle = this.add.text(512, 187, 'CONTROLES', {
            fontFamily: 'Arial Black',
            fontSize: '17px',
            color: '#9fba9f'
        }).setOrigin(0.5);

        const pcTitle = this.add.text(320, 242, 'PC / TECLADO', {
            fontFamily: 'Arial Black',
            fontSize: '19px',
            color: '#d6b56c'
        }).setOrigin(0.5);

        const pcText = this.add.text(
            320,
            280,
            [
                'A / D  ou  ← / →',
                'Mover',
                '',
                'W / ↑ / ESPAÇO',
                'Pular',
                '',
                'J',
                'Atacar com o terçado',
                '',
                'SHIFT',
                'Dash após desbloquear'
            ],
            {
                fontFamily: 'Arial',
                fontSize: '16px',
                color: '#e5e8de',
                align: 'center',
                lineSpacing: 3
            }
        ).setOrigin(0.5, 0);

        const divider = this.add.rectangle(512, 385, 2, 285, 0xd6b56c, 0.18);

        const mobileTitle = this.add.text(704, 242, 'CELULAR / TOUCH', {
            fontFamily: 'Arial Black',
            fontSize: '19px',
            color: '#d6b56c'
        }).setOrigin(0.5);

        const mobileText = this.add.text(
            704,
            280,
            [
                'JOYSTICK',
                'Mover esquerda / direita',
                '',
                'PULO',
                'Saltar',
                '',
                'ATAQUE',
                'Usar o terçado',
                '',
                'DASH',
                'Disponível após desbloquear'
            ],
            {
                fontFamily: 'Arial',
                fontSize: '16px',
                color: '#e5e8de',
                align: 'center',
                lineSpacing: 3
            }
        ).setOrigin(0.5, 0);

        const tip = this.add.text(
            512,
            552,
            'Dica: cuide de VIDA, FOME e FÔLEGO durante a jornada.',
            {
                fontFamily: 'Arial',
                fontSize: '15px',
                color: '#9fba9f'
            }
        ).setOrigin(0.5);

        const closeButton = this.add.rectangle(512, 620, 220, 52, 0x8b5a2b)
            .setStrokeStyle(2, 0xd6b56c)
            .setInteractive({ useHandCursor: true });

        const closeLabel = this.add.text(512, 615, 'ENTENDI', {
            fontFamily: 'Arial Black',
            fontSize: '19px',
            color: '#ffffff'
        }).setOrigin(0.5);

        const close = () => {
            if (!modal.active) return;
            this.input.keyboard?.off('keydown-ESC', close);
            this.input.keyboard?.off('keydown-ENTER', close);
            modal.destroy(true);
            if (this.controlsModal === modal) this.controlsModal = null;
        };

        closeButton.on('pointerover', () => closeButton.setFillStyle(0xb37638));
        closeButton.on('pointerout', () => closeButton.setFillStyle(0x8b5a2b));
        closeButton.on('pointerdown', close);
        this.input.keyboard?.on('keydown-ESC', close);
        this.input.keyboard?.on('keydown-ENTER', close);

        modal.add([
            blocker,
            panel,
            title,
            subtitle,
            pcTitle,
            pcText,
            mobileTitle,
            mobileText,
            divider,
            tip,
            closeButton,
            closeLabel
        ]);
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
