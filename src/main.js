import StartGame from './game/main';

document.addEventListener('DOMContentLoaded', () => {

    const game = StartGame('game-container');

    // Diagnostic hook used only by the automated published-audio smoke test.
    // It is inert for normal players because the query parameter is absent.
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('audio-test')) {
        window.__soldadosAudioTestGame = game;
    }

});