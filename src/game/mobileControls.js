export function createBasicMobileControls (scene)
{
    const touchSupported =
        scene.sys.game.device.input.touch ||
        (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
        (typeof window !== 'undefined' && 'ontouchstart' in window);

    scene.isTouchDevice = touchSupported;
    scene.mobileInput = {
        left: false,
        right: false,
        jump: false,
        attack: false,
        dash: false
    };

    if (!touchSupported) return;

    if (scene.input.manager.pointersTotal < 5) {
        scene.input.addPointer(5 - scene.input.manager.pointersTotal);
    }

    const depth = 10000;
    const heldPointers = {
        left: new Set(),
        right: new Set(),
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
        const circle = scene.add.circle(x, y, radius, 0x07100f, 0.52)
            .setStrokeStyle(3, 0xe7efe9, 0.48)
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
            .setAlpha(0.88)
            .setScrollFactor(0)
            .setDepth(depth + 1);

        const setPressed = (pressed) => {
            circle.setFillStyle(pressed ? 0x254136 : 0x07100f, pressed ? 0.72 : 0.52);
            circle.setStrokeStyle(3, pressed ? 0xf1e1ae : 0xe7efe9, pressed ? 0.72 : 0.48);
        };

        circle.on('pointerdown', () => setPressed(true));
        circle.on('pointerup', () => setPressed(false));
        circle.on('pointerout', () => setPressed(false));
        circle.on('pointerupoutside', () => setPressed(false));

        bindButton(circle, key, onPress);
        return { hit: circle, label: text };
    };

    const makeRectButton = (x, y, width, height, label, onPress) => {
        const rect = scene.add.rectangle(x, y, width, height, 0x07100f, 0.56)
            .setStrokeStyle(2, 0xe7efe9, 0.44)
            .setScrollFactor(0)
            .setDepth(depth);

        const text = scene.add.text(x, y, label, {
            fontFamily: 'Arial',
            fontSize: '13px',
            color: '#ffffff',
            fontStyle: 'bold',
            align: 'center'
        })
            .setOrigin(0.5)
            .setAlpha(0.9)
            .setScrollFactor(0)
            .setDepth(depth + 1);

        rect.setInteractive({ useHandCursor: false });
        rect.on('pointerdown', onPress);
        return { hit: rect, label: text };
    };

    // Esquerda: somente direção, sem botão extra acima.
    makeRoundButton(82, 688, 50, '◀', 'left');
    makeRoundButton(196, 688, 50, '▶', 'right');

    // Direita: ataque em cima, pulo e dash embaixo para uso confortável com o polegar.
    makeRoundButton(846, 592, 48, 'ATAQUE', 'attack', () => {
        if (typeof scene.queueAttackInput === 'function') scene.queueAttackInput();
    });

    makeRoundButton(862, 688, 52, 'PULO', 'jump');

    const dashButton = makeRoundButton(966, 688, 46, 'DASH', 'dash', () => {
        if (typeof scene.tryDash === 'function') scene.tryDash();
    });

    let dashAvailable = null;
    const setDashAvailable = () => {
        const available = scene.dashUnlocked === true && typeof scene.tryDash === 'function';
        if (dashAvailable === available) return;
        dashAvailable = available;

        dashButton.hit.setVisible(available);
        dashButton.label.setVisible(available);

        if (available) {
            dashButton.hit.setInteractive({ useHandCursor: false });
        } else {
            dashButton.hit.disableInteractive();
            heldPointers.dash.clear();
            scene.mobileInput.dash = false;
        }
    };

    setDashAvailable();
    scene.events.on('update', setDashAvailable);

    const getFullscreenElement = () => {
        if (typeof document === 'undefined') return null;
        return document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement || null;
    };

    let fullscreenButton;

    const updateFullscreenLabel = () => {
        if (!fullscreenButton) return;
        fullscreenButton.label.setText(getFullscreenElement() ? 'SAIR TELA CHEIA' : 'TELA CHEIA');
    };

    const toggleGameFullscreen = async () => {
        if (typeof document === 'undefined') return;

        try {
            if (getFullscreenElement()) {
                const exitFullscreen =
                    document.exitFullscreen ||
                    document.webkitExitFullscreen ||
                    document.msExitFullscreen;

                if (exitFullscreen) {
                    const result = exitFullscreen.call(document);
                    if (result && typeof result.then === 'function') await result;
                }
            } else {
                const element = document.getElementById('game-container') || document.documentElement;
                const requestFullscreen =
                    element.requestFullscreen ||
                    element.webkitRequestFullscreen ||
                    element.msRequestFullscreen;

                if (!requestFullscreen) return;

                const result = requestFullscreen.call(element);
                if (result && typeof result.then === 'function') await result;

                try {
                    if (screen.orientation && typeof screen.orientation.lock === 'function') {
                        await screen.orientation.lock('landscape');
                    }
                } catch (_) {
                    // Orientation lock is progressive enhancement only.
                }
            }
        } catch (_) {
            // Fullscreen is optional; keep the game usable inside the viewport.
        } finally {
            updateFullscreenLabel();
            scene.scale.refresh();
        }
    };

    // Mantém distância do MENU (y=27) e evita qualquer sobreposição.
    fullscreenButton = makeRectButton(925, 78, 150, 36, 'TELA CHEIA', toggleGameFullscreen);
    fullscreenButton.hit.setDepth(depth + 3);
    fullscreenButton.label.setDepth(depth + 4);

    const rotateText = scene.add.text(512, 32, 'Dica: gire o celular para jogar em tela ampla', {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: '#eef4ef',
        backgroundColor: 'rgba(0,0,0,0.42)',
        padding: { x: 12, y: 6 },
        align: 'center'
    })
        .setOrigin(0.5)
        .setAlpha(0.82)
        .setScrollFactor(0)
        .setDepth(depth + 2);

    const applyMobileHudLayout = () => {
        if (scene.healthHud) scene.healthHud.setPosition(18, 18).setScale(0.94);
        if (scene.hungerHud) scene.hungerHud.setPosition(18, 52).setScale(0.94);
        if (scene.staminaHud) scene.staminaHud.setPosition(18, 86).setScale(0.94);
    };

    const refreshMobileLayout = () => {
        if (typeof window === 'undefined') return;

        const viewport = window.visualViewport;
        const width = viewport?.width || window.innerWidth;
        const height = viewport?.height || window.innerHeight;
        const portrait = height > width;

        rotateText.setVisible(portrait);
        applyMobileHudLayout();
        scene.scale.refresh();
    };

    const onFullscreenChange = () => {
        updateFullscreenLabel();
        refreshMobileLayout();
    };

    const canvas = scene.sys.game.canvas;

    scene.input.on('pointerup', releasePointer);
    scene.input.on('gameout', releaseAll);
    canvas?.addEventListener('pointercancel', releaseAll, { passive: true });

    window.addEventListener('resize', refreshMobileLayout, { passive: true });
    window.addEventListener('orientationchange', refreshMobileLayout, { passive: true });
    window.visualViewport?.addEventListener('resize', refreshMobileLayout, { passive: true });
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);

    scene.time.delayedCall(0, () => {
        applyMobileHudLayout();
        refreshMobileLayout();
    });

    updateFullscreenLabel();
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
        document.removeEventListener('fullscreenchange', onFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    });
}
