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
        jump: new Set(),
        attack: new Set(),
        dash: new Set()
    };

    const syncButtonState = () => {
        scene.mobileInput.jump = heldPointers.jump.size > 0;
        scene.mobileInput.attack = heldPointers.attack.size > 0;
        scene.mobileInput.dash = heldPointers.dash.size > 0;
    };

    const releaseButtonPointer = (pointer) => {
        Object.values(heldPointers).forEach((set) => set.delete(pointer.id));
        syncButtonState();
    };

    const bindButton = (button, key, onPress) => {
        button.setInteractive({ useHandCursor: false });

        button.on('pointerdown', (pointer) => {
            heldPointers[key].add(pointer.id);
            syncButtonState();
            if (onPress) onPress();
        });

        button.on('pointerup', releaseButtonPointer);
        button.on('pointerout', releaseButtonPointer);
        button.on('pointerupoutside', releaseButtonPointer);
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

    // Analógico virtual: substitui apenas os direcionais digitais de esquerda/direita.
    const joystickX = 136;
    const joystickY = 688;
    const joystickBaseRadius = 66;
    const joystickKnobRadius = 30;
    const joystickMaxTravel = joystickBaseRadius - joystickKnobRadius + 2;
    const joystickDeadZone = joystickBaseRadius * 0.18;
    let joystickPointerId = null;

    const joystickBase = scene.add.circle(joystickX, joystickY, joystickBaseRadius, 0x07100f, 0.34)
        .setStrokeStyle(3, 0xe7efe9, 0.34)
        .setScrollFactor(0)
        .setDepth(depth);

    scene.add.circle(joystickX, joystickY, joystickBaseRadius * 0.56, 0x254136, 0.12)
        .setStrokeStyle(1, 0xe7efe9, 0.16)
        .setScrollFactor(0)
        .setDepth(depth + 0.1);

    const joystickKnob = scene.add.circle(joystickX, joystickY, joystickKnobRadius, 0x254136, 0.72)
        .setStrokeStyle(3, 0xf1e1ae, 0.52)
        .setScrollFactor(0)
        .setDepth(depth + 1);

    // Área de toque ligeiramente maior que a representação visual.
    const joystickHit = scene.add.circle(joystickX, joystickY, joystickBaseRadius * 1.4, 0x000000, 0)
        .setScrollFactor(0)
        .setDepth(depth + 2)
        .setInteractive({ useHandCursor: false });

    const resetJoystick = () => {
        joystickPointerId = null;
        scene.mobileInput.left = false;
        scene.mobileInput.right = false;
        joystickKnob.setPosition(joystickX, joystickY);
        joystickBase.setFillStyle(0x07100f, 0.34);
        joystickBase.setStrokeStyle(3, 0xe7efe9, 0.34);
    };

    const updateJoystickFromPointer = (pointer) => {
        if (joystickPointerId !== pointer.id) return;

        const dx = pointer.x - joystickX;
        const dy = pointer.y - joystickY;
        const distance = Math.hypot(dx, dy);
        const scale = distance > joystickMaxTravel && distance > 0 ? joystickMaxTravel / distance : 1;

        joystickKnob.setPosition(
            joystickX + dx * scale,
            joystickY + dy * scale
        );

        if (dx > joystickDeadZone) {
            scene.mobileInput.left = false;
            scene.mobileInput.right = true;
        } else if (dx < -joystickDeadZone) {
            scene.mobileInput.left = true;
            scene.mobileInput.right = false;
        } else {
            scene.mobileInput.left = false;
            scene.mobileInput.right = false;
        }
    };

    joystickHit.on('pointerdown', (pointer) => {
        if (joystickPointerId !== null) return;
        joystickPointerId = pointer.id;
        joystickBase.setFillStyle(0x10241c, 0.48);
        joystickBase.setStrokeStyle(3, 0xf1e1ae, 0.46);
        updateJoystickFromPointer(pointer);
    });

    joystickHit.on('pointerup', (pointer) => {
        if (joystickPointerId === pointer.id) resetJoystick();
    });

    joystickHit.on('pointerupoutside', (pointer) => {
        if (joystickPointerId === pointer.id) resetJoystick();
    });

    const handleJoystickMove = (pointer) => {
        if (joystickPointerId !== null && pointer.id === joystickPointerId) {
            updateJoystickFromPointer(pointer);
        }
    };

    const handleJoystickPointerUp = (pointer) => {
        if (joystickPointerId === pointer.id) resetJoystick();
    };

    scene.input.on('pointermove', handleJoystickMove);
    scene.input.on('pointerup', handleJoystickPointerUp);
    scene.input.on('pointerupoutside', handleJoystickPointerUp);

    // Direita: ataque em cima, pulo e dash embaixo. Mantidos sem alteração funcional.
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

    const rotateText = scene.add.text(512, 68, 'Dica: gire o celular para jogar em tela ampla', {
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
        if (scene.hungerHud) scene.hungerHud.setPosition(204, 18).setScale(0.94);
        if (scene.staminaHud) scene.staminaHud.setPosition(390, 18).setScale(0.94);
    };

    const refreshJoystickGeometry = () => {
        // Phaser pointer.x/y já chegam no mesmo espaço lógico 1024×768 usado pelos GameObjects,
        // inclusive com Scale.FIT, rotação e fullscreen. Reaplicamos a geometria para evitar
        // qualquer área interativa stale após refresh do canvas.
        joystickBase.setPosition(joystickX, joystickY);
        joystickHit.setPosition(joystickX, joystickY);
        if (joystickPointerId === null) joystickKnob.setPosition(joystickX, joystickY);
        if (joystickHit.input?.hitArea && 'radius' in joystickHit.input.hitArea) {
            joystickHit.input.hitArea.radius = joystickBaseRadius * 1.4;
        }
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
        refreshJoystickGeometry();
    };

    const onFullscreenChange = () => {
        updateFullscreenLabel();
        refreshMobileLayout();
    };

    const releaseAll = () => {
        Object.values(heldPointers).forEach((set) => set.clear());
        syncButtonState();
        resetJoystick();
    };

    const canvas = scene.sys.game.canvas;
    const handlePointerCancel = (event) => {
        if (joystickPointerId === event.pointerId) resetJoystick();
        releaseAll();
    };

    scene.input.on('pointerup', releaseButtonPointer);
    scene.input.on('pointerupoutside', releaseButtonPointer);
    canvas?.addEventListener('pointercancel', handlePointerCancel, { passive: true });

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
        scene.input.off('pointermove', handleJoystickMove);
        scene.input.off('pointerup', handleJoystickPointerUp);
        scene.input.off('pointerupoutside', handleJoystickPointerUp);
        scene.input.off('pointerup', releaseButtonPointer);
        scene.input.off('pointerupoutside', releaseButtonPointer);
        canvas?.removeEventListener('pointercancel', handlePointerCancel);
        window.removeEventListener('resize', refreshMobileLayout);
        window.removeEventListener('orientationchange', refreshMobileLayout);
        window.visualViewport?.removeEventListener('resize', refreshMobileLayout);
        document.removeEventListener('fullscreenchange', onFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    });
}
