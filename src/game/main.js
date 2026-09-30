import { Boot } from './scenes/Boot';
import { Game as MainGame } from './scenes/Game';
import { GameOver } from './scenes/GameOver';
import { IntroScene } from './scenes/IntroScene';
import { Level2Scene } from './scenes/Level2Scene';
import { Level3Scene } from './scenes/Level3Scene';
import { Level4Scene } from './scenes/Level4Scene';
import { Level5Scene } from './scenes/Level5Scene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { MainMenu } from './scenes/MainMenu';
import { Preloader } from './scenes/Preloader';
import { AUTO, Game, Scale } from 'phaser';

const config = {
    type: AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    backgroundColor: '#028af8',
    input: {
        activePointers: 6
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1100 },
            debug: false
        }
    },
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH
    },
    scene: [
        Boot,
        Preloader,
        MainMenu,
        LevelSelectScene,
        IntroScene,
        MainGame,
        Level2Scene,
        Level3Scene,
        Level4Scene,
        Level5Scene,
        GameOver
    ]
};

const StartGame = (parent) => {
    const game = new Game({ ...config, parent });

    if (typeof window !== 'undefined') {
        let resizeFrame = 0;

        const refreshScale = () => {
            cancelAnimationFrame(resizeFrame);
            resizeFrame = requestAnimationFrame(() => game.scale.refresh());
        };

        window.addEventListener('resize', refreshScale, { passive: true });
        window.addEventListener('orientationchange', refreshScale, { passive: true });
        window.visualViewport?.addEventListener('resize', refreshScale, { passive: true });

        game.events.once('destroy', () => {
            cancelAnimationFrame(resizeFrame);
            window.removeEventListener('resize', refreshScale);
            window.removeEventListener('orientationchange', refreshScale);
            window.visualViewport?.removeEventListener('resize', refreshScale);
        });
    }

    return game;
}

export default StartGame;
