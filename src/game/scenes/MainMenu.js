import { Scene } from 'phaser';
import { getAudioManager } from '../audio/AudioManager.js';

export class MainMenu extends Scene
{
    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        this.audioManager = getAudioManager(this);
        this.nameEntryOpen = false;
        this.nameValue = '';

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
            this.openNameEntry();
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

        this.nameKeyHandler = (event) => this.handleNameKey(event);
        this.input.keyboard.on('keydown', this.nameKeyHandler);
        this.events.once('shutdown', () => {
            this.input.keyboard.off('keydown', this.nameKeyHandler);
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

    openNameEntry ()
    {
        if (this.nameEntryOpen)
        {
            return;
        }

        this.nameEntryOpen = true;
        this.nameValue = '';

        this.nameOverlay = this.add.rectangle(512, 384, 1024, 768, 0x010403, 0.82)
            .setDepth(200)
            .setInteractive();

        this.namePanel = this.add.rectangle(512, 375, 520, 300, 0x07130f, 0.98)
            .setStrokeStyle(2, 0xd6b56c, 0.82)
            .setDepth(201);

        this.add.text(512, 278, 'COMO SE CHAMA O SERINGUEIRO?', {
            fontFamily: 'Arial Black',
            fontSize: '25px',
            color: '#f1e1ae'
        }).setOrigin(0.5).setDepth(202);

        this.add.text(326, 330, 'NOME DO SERINGUEIRO', {
            fontFamily: 'Arial',
            fontSize: '13px',
            color: '#9fba9f'
        }).setDepth(202);

        this.add.rectangle(512, 375, 380, 54, 0x0d1e17, 1)
            .setStrokeStyle(2, 0x78917c, 0.65)
            .setDepth(202);

        this.nameText = this.add.text(338, 375, 'DIGITE O NOME', {
            fontFamily: 'Arial',
            fontSize: '21px',
            color: '#6f8679'
        }).setOrigin(0, 0.5).setDepth(203);

        this.add.text(512, 420, 'até 16 caracteres • ENTER também confirma', {
            fontFamily: 'Arial',
            fontSize: '13px',
            color: '#799487'
        }).setOrigin(0.5).setDepth(202);

        const confirmButton = this.add.rectangle(512, 470, 230, 56, 0x8b5a2b)
            .setStrokeStyle(2, 0xd6b56c)
            .setDepth(202)
            .setInteractive({ useHandCursor: true });

        this.add.text(512, 470, 'INICIAR JORNADA', {
            fontFamily: 'Arial Black',
            fontSize: '21px',
            color: '#ffffff'
        }).setOrigin(0.5).setDepth(203);

        confirmButton.on('pointerover', () => confirmButton.setFillStyle(0xb37638));
        confirmButton.on('pointerout', () => confirmButton.setFillStyle(0x8b5a2b));
        confirmButton.on('pointerdown', () => {
            this.audioManager?.unlock?.();
            this.confirmPlayerName();
        });
    }

    handleNameKey (event)
    {
        if (!this.nameEntryOpen)
        {
            return;
        }

        if (event.key === 'Enter')
        {
            this.confirmPlayerName();
            return;
        }

        if (event.key === 'Backspace')
        {
            this.nameValue = this.nameValue.slice(0, -1);
            this.updateNameText();
            event.preventDefault?.();
            return;
        }

        if (
            event.key.length === 1 &&
            /^[A-Za-zÀ-ÖØ-öø-ÿ0-9 ]$/.test(event.key) &&
            this.nameValue.length < 16
        )
        {
            this.nameValue += event.key;
            this.updateNameText();
        }
    }

    updateNameText ()
    {
        if (!this.nameText)
        {
            return;
        }

        const hasName = this.nameValue.length > 0;
        this.nameText.setText(hasName ? this.nameValue : 'DIGITE O NOME');
        this.nameText.setColor(hasName ? '#f1e1ae' : '#6f8679');
    }

    confirmPlayerName ()
    {
        if (!this.nameEntryOpen)
        {
            return;
        }

        const playerName = this.nameValue.trim().slice(0, 16) || 'SERINGUEIRO';

        this.registry.set('playerName', playerName);
        this.registry.set('doubleJumpUnlocked', false);
        this.registry.set('dashUnlocked', false);

        this.nameEntryOpen = false;
        this.scene.start('IntroScene');
    }
}
