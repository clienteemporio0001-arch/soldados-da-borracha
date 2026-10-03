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
        this.autoplayFallbackTimer = null;

        this.add.rectangle(512, 384, 1024, 768, 0x000000).setDepth(0);

        this.handleSkip = () => this.startGame();
        this.handleVideoComplete = () => this.startGame();
        this.handleVideoError = (_video, error) => {
            console.warn('[IntroScene] Falha ao reproduzir intro.mp4; iniciando a Fase 1.', error ?? '');
            this.startGame();
        };
        this.handleVideoStop = () => {
            if (!this.transitioning) {
                console.warn('[IntroScene] O vídeo da introdução foi interrompido; iniciando a Fase 1.');
                this.startGame();
            }
        };
        this.handleVideoLocked = () => this.showStartPrompt();
        this.handleVideoPlaying = () => this.hideStartPrompt();

        this.createSkipControl();
        this.bindSkipKeys();

        this.events.once('shutdown', this.cleanup, this);
        this.events.once('destroy', this.cleanup, this);

        if (!this.cache.video.exists('introVideo')) {
            console.warn('[IntroScene] introVideo não está disponível no cache; iniciando a Fase 1.');
            this.startGame();
            return;
        }

        try {
            this.video = this.add.video(512, 384, 'introVideo')
                .setDepth(1)
                .setScrollFactor(0);

            this.video.setDisplaySize(1024, 576);

            this.video.on('created', (_video, width, height) => {
                this.fitVideo(width, height);
                this.configureNativeVideo();
            });
            this.video.on('metadata', () => {
                const element = this.video?.video;
                this.fitVideo(element?.videoWidth, element?.videoHeight);
                this.configureNativeVideo();
            });
            this.video.once('complete', this.handleVideoComplete);
            this.video.once('error', this.handleVideoError);
            this.video.once('unsupported', this.handleVideoError);
            this.video.on('locked', this.handleVideoLocked);
            this.video.on('unlocked', () => this.hideStartPrompt());
            this.video.on('play', this.handleVideoPlaying);
            this.video.on('playing', this.handleVideoPlaying);
            this.video.once('stop', this.handleVideoStop);

            this.configureNativeVideo();
            this.video.play(false);

            this.autoplayFallbackTimer = this.time.delayedCall(1400, () => {
                if (!this.transitioning && this.video && !this.video.isPlaying()) {
                    this.showStartPrompt();
                }
            });
        }
        catch (error) {
            console.warn('[IntroScene] Não foi possível criar o vídeo da introdução; iniciando a Fase 1.', error);
            this.startGame();
        }
    }

    createSkipControl ()
    {
        const background = this.add.rectangle(970, 34, 178, 42, 0x000000, 0.58)
            .setOrigin(1, 0)
            .setScrollFactor(0)
            .setDepth(20)
            .setStrokeStyle(1, 0xffffff, 0.18)
            .setInteractive({ useHandCursor: true });

        const label = this.add.text(958, 55, 'PULAR INTRODUÇÃO', {
            fontFamily: 'Arial Black',
            fontSize: '14px',
            color: '#ffffff'
        })
            .setOrigin(1, 0.5)
            .setScrollFactor(0)
            .setDepth(21);

        background.on('pointerdown', this.handleSkip);

        this.skipObjects = [background, label];
        this.skipButton = background;
    }

    bindSkipKeys ()
    {
        if (!this.input.keyboard) return;

        this.input.keyboard.on('keydown-ESC', this.handleSkip);
        this.input.keyboard.on('keydown-ENTER', this.handleSkip);
        this.input.keyboard.on('keydown-SPACE', this.handleSkip);
    }

    fitVideo (sourceWidth, sourceHeight)
    {
        if (!this.video) return;

        const width = Number(sourceWidth) || 16;
        const height = Number(sourceHeight) || 9;
        const scale = Math.min(1024 / width, 768 / height);

        this.video.setDisplaySize(width * scale, height * scale);
        this.video.setPosition(512, 384);
    }

    configureNativeVideo ()
    {
        const element = this.video?.video;
        if (!element) return;

        element.playsInline = true;
        element.setAttribute?.('playsinline', '');
        element.setAttribute?.('webkit-playsinline', '');
        element.disablePictureInPicture = true;
    }

    showStartPrompt ()
    {
        if (this.transitioning || this.startPrompt) return;

        const panel = this.add.rectangle(512, 384, 360, 82, 0x000000, 0.76)
            .setScrollFactor(0)
            .setDepth(30)
            .setStrokeStyle(2, 0xf1e1ae, 0.65)
            .setInteractive({ useHandCursor: true });

        const label = this.add.text(512, 384, 'CLIQUE OU TOQUE PARA INICIAR', {
            fontFamily: 'Arial Black',
            fontSize: '18px',
            color: '#f1e1ae',
            align: 'center'
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(31);

        const startPlayback = () => {
            if (this.transitioning || !this.video) return;
            this.hideStartPrompt();
            try {
                this.configureNativeVideo();
                this.video.play(false);
            }
            catch (error) {
                console.warn('[IntroScene] O navegador bloqueou a reprodução do vídeo; iniciando a Fase 1.', error);
                this.startGame();
            }
        };

        panel.on('pointerdown', startPlayback);
        this.startPrompt = { panel, label, startPlayback };
    }

    hideStartPrompt ()
    {
        if (!this.startPrompt) return;

        this.startPrompt.panel?.off('pointerdown', this.startPrompt.startPlayback);
        this.startPrompt.panel?.destroy();
        this.startPrompt.label?.destroy();
        this.startPrompt = null;
    }

    startGame ()
    {
        if (this.transitioning) return;

        this.transitioning = true;
        this.cleanup();
        this.scene.start('Game');
    }

    cleanup ()
    {
        if (this.cleanedUp) return;
        this.cleanedUp = true;

        this.autoplayFallbackTimer?.remove?.(false);
        this.autoplayFallbackTimer = null;

        if (this.input?.keyboard) {
            this.input.keyboard.off('keydown-ESC', this.handleSkip);
            this.input.keyboard.off('keydown-ENTER', this.handleSkip);
            this.input.keyboard.off('keydown-SPACE', this.handleSkip);
        }

        this.skipButton?.off('pointerdown', this.handleSkip);
        this.hideStartPrompt();

        if (this.video) {
            this.video.off('complete', this.handleVideoComplete);
            this.video.off('error', this.handleVideoError);
            this.video.off('unsupported', this.handleVideoError);
            this.video.off('locked', this.handleVideoLocked);
            this.video.off('play', this.handleVideoPlaying);
            this.video.off('playing', this.handleVideoPlaying);
            this.video.off('stop', this.handleVideoStop);

            try {
                this.video.stop(false);
            }
            catch (_) {}

            this.video.destroy();
            this.video = null;
        }
    }
}
