import { Scene } from 'phaser';

export class IntroScene extends Scene
{
    constructor ()
    {
        super('IntroScene');
    }

    create ()
    {
        this.transitioning = false;
        this.cleanedUp = false;
        this.video = null;
        this.startPrompt = null;

        this.add.rectangle(512, 384, 1024, 768, 0x000000)
            .setScrollFactor(0)
            .setDepth(0);

        this.skipText = this.add.text(982, 28, 'PULAR INTRODUÇÃO', {
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
            this.startGame();
        };

        this.onSkipKey = () => this.startGame();
        this.onFallbackPointer = () => this.retryPlayback();

        this.skipText.on('pointerdown', this.onSkipPointer);
        this.input.keyboard?.on('keydown-ESC', this.onSkipKey);
        this.input.keyboard?.on('keydown-ENTER', this.onSkipKey);
        this.input.keyboard?.on('keydown-SPACE', this.onSkipKey);

        this.events.once('shutdown', this.cleanup, this);
        this.events.once('destroy', this.cleanup, this);

        if (!this.cache.video.exists('introVideo'))
        {
            console.warn('[IntroScene] introVideo não está no cache. Iniciando a Fase 1.');
            this.startGame();
            return;
        }

        try
        {
            this.video = this.add.video(512, 384, 'introVideo')
                .setOrigin(0.5)
                .setScrollFactor(0)
                .setDepth(10);

            this.video.once('created', (video, width, height) => {
                this.fitVideo(width, height);
            });

            this.video.once('complete', () => this.startGame());

            this.video.once('error', (video, error) => {
                console.warn('[IntroScene] Falha ao carregar/reproduzir intro.mp4. Iniciando a Fase 1.', error);
                this.startGame();
            });

            this.video.once('unsupported', (video, error) => {
                console.warn('[IntroScene] Formato de vídeo não suportado. Iniciando a Fase 1.', error);
                this.startGame();
            });

            this.video.on('locked', () => {
                if (this.transitioning) return;
                this.showStartPrompt();
            });

            this.video.on('playing', () => {
                this.hideStartPrompt();
            });

            this.video.once('stop', () => {
                if (!this.transitioning && !this.cleanedUp)
                {
                    console.warn('[IntroScene] O vídeo foi interrompido antes do fim. Iniciando a Fase 1.');
                    this.startGame();
                }
            });

            this.video.play(false);
        }
        catch (error)
        {
            console.warn('[IntroScene] Não foi possível criar o vídeo de introdução. Iniciando a Fase 1.', error);
            this.startGame();
        }
    }

    fitVideo (sourceWidth, sourceHeight)
    {
        if (!this.video || !sourceWidth || !sourceHeight) return;

        const maxWidth = 1024;
        const maxHeight = 768;
        const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);

        this.video.setDisplaySize(
            Math.round(sourceWidth * scale),
            Math.round(sourceHeight * scale)
        );
    }

    showStartPrompt ()
    {
        if (this.startPrompt || this.transitioning) return;

        const label = this.sys.game.device.input.touch
            ? 'TOQUE PARA INICIAR'
            : 'CLIQUE PARA INICIAR';

        this.startPrompt = this.add.text(512, 650, label, {
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
        if (!this.startPrompt) return;

        this.startPrompt.off('pointerdown', this.onFallbackPointer);
        this.startPrompt.destroy();
        this.startPrompt = null;
    }

    retryPlayback ()
    {
        if (this.transitioning || !this.video) return;

        this.hideStartPrompt();

        try
        {
            // Se a primeira tentativa foi bloqueada pela política de autoplay,
            // reiniciamos a tentativa dentro deste novo gesto do usuário.
            this.video.stop(false);
            this.video.play(false);
        }
        catch (error)
        {
            console.warn('[IntroScene] Falha ao reiniciar o vídeo após interação.', error);
            this.startGame();
        }
    }

    cleanup ()
    {
        if (this.cleanedUp) return;
        this.cleanedUp = true;

        this.hideStartPrompt();

        this.skipText?.off('pointerdown', this.onSkipPointer);

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

    startGame ()
    {
        if (this.transitioning) return;

        this.transitioning = true;
        this.cleanup();

        this.scene.start('Game');
    }
}
