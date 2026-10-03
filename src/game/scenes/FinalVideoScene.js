import { Scene } from 'phaser';

export class FinalVideoScene extends Scene
{
    constructor ()
    {
        super('FinalVideoScene');
    }

    create ()
    {
        this.finalScreenShown = false;
        this.returningToMenu = false;
        this.cleanedUp = false;
        this.video = null;
        this.startPrompt = null;

        this.add.rectangle(512, 384, 1024, 768, 0x000000)
            .setScrollFactor(0)
            .setDepth(0);

        this.skipText = this.add.text(982, 28, 'PULAR CENA', {
            fontFamily: 'Arial Black',
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#00000099',
            padding: { left: 12, right: 12, top: 8, bottom: 8 }
        })
            .setOrigin(1, 0)
            .setScrollFactor(0)
            .setDepth(100)
            .setInteractive({ useHandCursor: true });

        this.onSkipPointer = (pointer, localX, localY, event) => {
            event?.stopPropagation?.();
            this.finishVideo();
        };

        this.onSkipKey = () => this.finishVideo();
        this.onFallbackPointer = () => this.retryPlayback();

        this.skipText.on('pointerdown', this.onSkipPointer);
        this.input.keyboard?.on('keydown-ESC', this.onSkipKey);
        this.input.keyboard?.on('keydown-ENTER', this.onSkipKey);
        this.input.keyboard?.on('keydown-SPACE', this.onSkipKey);

        this.events.once('shutdown', this.cleanup, this);
        this.events.once('destroy', this.cleanup, this);

        if (!this.cache.video.exists('finalVideo'))
        {
            console.warn('[FinalVideoScene] finalVideo não está no cache. Mostrando encerramento.');
            this.finishVideo();
            return;
        }

        try
        {
            this.video = this.add.video(512, 384, 'finalVideo')
                .setOrigin(0.5)
                .setScrollFactor(0)
                .setDepth(10);

            this.video.once('created', (video, width, height) => {
                this.fitVideo(width, height);
            });

            this.video.once('complete', () => {
                this.finishVideo();
            });

            this.video.once('error', (video, error) => {
                console.warn('[FinalVideoScene] Falha ao carregar/reproduzir final.mp4. Mostrando encerramento.', error);
                this.finishVideo();
            });

            this.video.once('unsupported', (video, error) => {
                console.warn('[FinalVideoScene] Formato do vídeo final não é suportado. Mostrando encerramento.', error);
                this.finishVideo();
            });

            this.video.on('locked', () => {
                if (!this.finalScreenShown)
                {
                    this.showStartPrompt();
                }
            });

            this.video.on('playing', () => {
                this.hideStartPrompt();
            });

            this.video.once('stop', () => {
                if (!this.finalScreenShown && !this.cleanedUp)
                {
                    console.warn('[FinalVideoScene] O vídeo final foi interrompido. Mostrando encerramento.');
                    this.finishVideo();
                }
            });

            this.video.play(false);
        }
        catch (error)
        {
            console.warn('[FinalVideoScene] Não foi possível criar o vídeo final. Mostrando encerramento.', error);
            this.finishVideo();
        }
    }

    fitVideo (sourceWidth, sourceHeight)
    {
        if (!this.video || !sourceWidth || !sourceHeight)
        {
            return;
        }

        const scale = Math.min(1024 / sourceWidth, 768 / sourceHeight);

        this.video.setDisplaySize(
            Math.round(sourceWidth * scale),
            Math.round(sourceHeight * scale)
        );
    }

    showStartPrompt ()
    {
        if (this.startPrompt || this.finalScreenShown)
        {
            return;
        }

        this.startPrompt = this.add.text(512, 650, 'CLIQUE / TOQUE PARA INICIAR', {
            fontFamily: 'Arial Black',
            fontSize: '20px',
            color: '#ffffff',
            backgroundColor: '#000000bb',
            padding: { left: 18, right: 18, top: 10, bottom: 10 }
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(101)
            .setInteractive({ useHandCursor: true });

        this.startPrompt.on('pointerdown', this.onFallbackPointer);
    }

    hideStartPrompt ()
    {
        if (!this.startPrompt)
        {
            return;
        }

        this.startPrompt.off('pointerdown', this.onFallbackPointer);
        this.startPrompt.destroy();
        this.startPrompt = null;
    }

    retryPlayback ()
    {
        if (this.finalScreenShown || !this.video)
        {
            return;
        }

        this.hideStartPrompt();

        try
        {
            if (this.video.touchLocked && typeof this.video.createPlayPromise === 'function')
            {
                this.video.createPlayPromise();
            }
            else if (!this.video.isPlaying())
            {
                this.video.play(false);
            }
        }
        catch (error)
        {
            console.warn('[FinalVideoScene] Falha ao iniciar o vídeo após interação. Mostrando encerramento.', error);
            this.finishVideo();
        }
    }

    cleanupVideo ()
    {
        this.hideStartPrompt();

        this.skipText?.off('pointerdown', this.onSkipPointer);
        this.skipText?.destroy();
        this.skipText = null;

        this.input.keyboard?.off('keydown-ESC', this.onSkipKey);
        this.input.keyboard?.off('keydown-ENTER', this.onSkipKey);
        this.input.keyboard?.off('keydown-SPACE', this.onSkipKey);

        if (this.video)
        {
            this.video.removeAllListeners();
            this.video.stop(false);
            this.video.destroy();
            this.video = null;
        }
    }

    finishVideo ()
    {
        if (this.finalScreenShown)
        {
            return;
        }

        this.finalScreenShown = true;
        this.cleanupVideo();
        this.showFinalScreen();
    }

    showFinalScreen ()
    {
        this.add.rectangle(512, 384, 1024, 768, 0x020705, 1)
            .setScrollFactor(0)
            .setDepth(200);

        this.add.text(512, 175, 'SOLDADO DA BORRACHA', {
            fontFamily: 'Arial Black',
            fontSize: '42px',
            color: '#f1e1ae'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

        this.add.text(512, 305, 'JORNADA CONCLUÍDA', {
            fontFamily: 'Arial Black',
            fontSize: '34px',
            color: '#d6b56c'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

        this.add.text(512, 385, 'TROPA DO SERINGAL', {
            fontFamily: 'Arial Black',
            fontSize: '22px',
            color: '#9fba9f'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

        const button = this.add.rectangle(512, 545, 310, 64, 0x8b5a2b)
            .setStrokeStyle(3, 0xd6b56c)
            .setScrollFactor(0)
            .setDepth(201)
            .setInteractive({ useHandCursor: true });

        this.add.text(512, 545, 'VOLTAR AO MENU', {
            fontFamily: 'Arial Black',
            fontSize: '22px',
            color: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(202);

        button.on('pointerdown', () => {
            if (this.returningToMenu)
            {
                return;
            }

            this.returningToMenu = true;
            this.scene.start('MainMenu');
        });
    }

    cleanup ()
    {
        if (this.cleanedUp)
        {
            return;
        }

        this.cleanedUp = true;
        this.cleanupVideo();
    }
}
