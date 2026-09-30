export function createBasicMobileControls (scene)
{
    scene.mobileInput = { left: false, right: false, jump: false };

    const touchSupported =
        scene.sys.game.device.input.touch ||
        (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
        (typeof window !== 'undefined' && 'ontouchstart' in window);

    if (!touchSupported) return;

    if (scene.input.manager.pointersTotal < 3) scene.input.addPointer(3 - scene.input.manager.pointersTotal);

    const depth = 10000;
    const buttonY = 690;
    const heldPointers = {
        left: new Set(),
        right: new Set(),
        jump: new Set()
    };

    const syncState = () => {
        scene.mobileInput.left = heldPointers.left.size > 0;
        scene.mobileInput.right = heldPointers.right.size > 0;
        scene.mobileInput.jump = heldPointers.jump.size > 0;
    };

    const bindButton = (button, key) => {
        button.setInteractive();

        button.on('pointerdown', (pointer) => {
            heldPointers[key].add(pointer.id);
            syncState();
        });

        const release = (pointer) => {
            heldPointers[key].delete(pointer.id);
            syncState();
        };

        button.on('pointerup', release);
        button.on('pointerout', release);
        button.on('pointerupoutside', release);
    };

    const makeButton = (x, y, radius, label, key) => {
        const circle = scene.add.circle(x, y, radius, 0x07100f, 0.42)
            .setStrokeStyle(3, 0xffffff, 0.34)
            .setScrollFactor(0)
            .setDepth(depth);

        scene.add.text(x, y, label, {
            fontFamily: 'Arial',
            fontSize: label === 'PULO' ? '18px' : '30px',
            color: '#ffffff',
            fontStyle: 'bold',
            align: 'center'
        })
            .setOrigin(0.5)
            .setAlpha(0.72)
            .setScrollFactor(0)
            .setDepth(depth + 1);

        bindButton(circle, key);
    };

    makeButton(88, buttonY, 46, '◀', 'left');
    makeButton(198, buttonY, 46, '▶', 'right');
    makeButton(925, buttonY, 52, 'PULO', 'jump');

    const releasePointerEverywhere = (pointer) => {
        heldPointers.left.delete(pointer.id);
        heldPointers.right.delete(pointer.id);
        heldPointers.jump.delete(pointer.id);
        syncState();
    };

    scene.input.on('pointerup', releasePointerEverywhere);

    const rotateText = scene.add.text(512, 92, 'Gire o celular para jogar', {
        fontFamily: 'Arial',
        fontSize: '28px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 18, y: 10 },
        align: 'center'
    })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(depth + 2);

    const updateOrientationHint = () => {
        const portrait = typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
        rotateText.setVisible(portrait);
    };

    updateOrientationHint();

    if (typeof window !== 'undefined') window.addEventListener('resize', updateOrientationHint);

    scene.events.once('shutdown', () => {
        if (typeof window !== 'undefined') window.removeEventListener('resize', updateOrientationHint);
        scene.input.off('pointerup', releasePointerEverywhere);
    });
}
