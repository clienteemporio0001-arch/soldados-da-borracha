export function createBasicMobileControls (scene)
{
    scene.mobileInput = {
        left: false,
        right: false,
        down: false,
        jump: false,
        attack: false,
        dash: false
    };

    const touchSupported =
        scene.sys.game.device.input.touch ||
        (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
        (typeof window !== 'undefined' && 'ontouchstart' in window);

    if (!touchSupported) return;

    if (scene.input.manager.pointersTotal < 6) {
        scene.input.addPointer(6 - scene.input.manager.pointersTotal);
    }

    const depth = 10000;
    const heldPointers = {
        left: new Set(),
        right: new Set(),
        down: new Set(),
        jump: new Set(),
        attack: new Set(),
        dash: new Set()
    };

    const syncState = () => {
        Object.keys(heldPointers).forEach((key) => {
            scene.mobileInput[key] = heldPointers[key].size > 0;
        });
    };

    const releasePointer = (pointer) => {
        Object.values(heldPointers).forEach((set) => set.delete(pointer.id));
        syncState();
    };

    const releaseAll = () => {
        Object.values(heldPointers).forEach((set) => set.clear());
        syncState();
    };

    const bindButton = (button, key, onPress) => {
        button.setInteractive({ useHandCursor: false });

        button.on('pointerdown', (pointer) => {
            heldPointers[key].add(pointer.id);
            syncState();
            if (onPress) onPress();
        });

        button.on('pointerup', releasePointer);
        button.on('pointerout', releasePointer);
        button.on('pointerupoutside', releasePointer);
    };

    const makeRoundButton = (x, y, radius, label, key, onPress) => {
        const circle = scene.add.circle(x, y, radius, 0x07100f, 0.46)
            .setStrokeStyle(3, 0xffffff, 0.38)
            .setScrollFactor(0)
            .setDepth(depth);

        const text = scene.add.text(x, y, label, {
            fontFamily: 'Arial',
            fontSize: label.length > 2 ? '16px' : '30px',
            color: '#ffffff',
            fontStyle: 'bold',
            align: 'center'
        })
            .setOrigin(0.5)
            .setAlpha(0.78)
            .setScrollFactor(0)
            .setDepth(depth + 1);

        bindButton(circle, key, onPress);
        return { hit: circle, label: text };
    };

    const makeRectButton = (x, y, width, height, label, onPress) => {
        const rect = scene.add.rectangle(x, y, width, height, 0x07100f, 0.46)
            .setStrokeStyle(2, 0xffffff, 0.38)
            .setScrollFactor(0)
            .setDepth(depth);

        const text = scene.add.text(x, y, label, {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#ffffff',
            fontStyle: 'bold',
            align: 'center'
        })
            .setOrigin(0.5)
            .setAlpha(0.8)
            .setScrollFactor(0)
            .setDepth(depth + 1);

        rect.setInteractive({ useHandCursor: false });
        rect.on('pointerdown', onPress);
        return { hit: rect, label: text };
    };

    makeRoundButton(82, 690, 48, '◀', 'left');
    makeRoundButton(190, 690, 48, '▶', 'right');
    makeRoundButton(136, 590, 44, '▼', 'down');

    makeRoundButton(924, 690, 52, 'PULO', 'jump');
    makeRoundButton(835, 590, 48, 'ATAQUE', 'attack', () => {
        if (typeof scene.queueAttackInput === 'function') scene.queueAttackInput();
    });

    const dashButton = makeRoundButton(814, 690, 48, 'DASH', 'dash', () => {
        if (typeof scene.tryDash === 'function') scene.tryDash();
    });

    const setDashAvailable = () => {
        const available = scene.dashUnlocked === true && typeof scene.tryDash === 'function';
        dashButton.hit.setVisible(available);
        dashButton.label.setVisible(available);

        if (available) {
            if (!dashButton.hit.input?.enabled) dashButton.hit.setInteractive({ useHandCursor: false });
        } else {
            dashButton.hit.disableInteractive();
            heldPointers.dash.clear();
            scene.mobileInput.dash = false;
        }
    };

    setDashAvailable();
    scene.events.on('update', setDashAvailable);

    const requestGameFullscreen = async () => {
        if (typeof document === 'undefined') return;

        const element = document.getElementById('game-container') || document.documentElement;
        const requestFullscreen =
            element.requestFullscreen ||
            element.webkitRequestFullscreen ||
            element.msRequestFullscreen;

        if (!requestFullscreen) return;

        try {
            const result = requestFullscreen.call(element);
            if (result && typeof result.then === 'function') await result;

            try {
                if (screen.orientation && typeof screen.orientation.lock === 'function') {
                    await screen.orientation.lock('landscape');
                }
            } catch (_) {
                // Orientation lock is progressive enhancement only.
            }

            scene.scale.refresh();
        } catch (_) {
            // Fullscreen is optional; keep the game usable inside the viewport.
        }
    };

    const fullscreenButton = makeRectButton(928, 52, 142, 38, 'TELA CHEIA', requestGameFullscreen);
    fullscreenButton.hit.setDepth(depth + 5);
    fullscreenButton.label.setDepth(depth + 6);

    const portraitShade = scene.add.rectangle(512, 384, 1024, 768, 0x000000, 0.58)
        .setScrollFactor(0)
        .setDepth(depth + 3);

    const rotateText = scene.add.text(512, 384, 'Gire o celular para jogar', {
        fontFamily: 'Arial',
        fontSize: '30px',
        color: '#ffffff',
        backgroundColor: '#000000bb',
        padding: { x: 22, y: 14 },
        align: 'center'
    })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(depth + 4);

    const refreshMobileLayout = () => {
        if (typeof window === 'undefined') return;

        const viewport = window.visualViewport;
        const width = viewport?.width || window.innerWidth;
        const height = viewport?.height || window.innerHeight;
        const portrait = height > width;

        portraitShade.setVisible(portrait);
        rotateText.setVisible(portrait);
        scene.scale.refresh();
    };

    const canvas = scene.sys.game.canvas;

    scene.input.on('pointerup', releasePointer);
    scene.input.on('gameout', releaseAll);
    canvas?.addEventListener('pointercancel', releaseAll, { passive: true });

    window.addEventListener('resize', refreshMobileLayout, { passive: true });
    window.addEventListener('orientationchange', refreshMobileLayout, { passive: true });
    window.visualViewport?.addEventListener('resize', refreshMobileLayout, { passive: true });

    refreshMobileLayout();

    scene.events.once('shutdown', () => {
        releaseAll();
        scene.events.off('update', setDashAvailable);
        scene.input.off('pointerup', releasePointer);
        scene.input.off('gameout', releaseAll);
        canvas?.removeEventListener('pointercancel', releaseAll);
        window.removeEventListener('resize', refreshMobileLayout);
        window.removeEventListener('orientationchange', refreshMobileLayout);
        window.visualViewport?.removeEventListener('resize', refreshMobileLayout);
    });
}
