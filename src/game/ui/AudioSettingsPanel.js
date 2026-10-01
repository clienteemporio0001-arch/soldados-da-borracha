export function createAudioSettingsControl (scene, options = {})
{
    const audioManager = scene?.audioManager;
    if (!scene || !audioManager) return null;

    const depth = options.depth ?? 110;
    const buttonX = options.x ?? 900;
    const buttonY = options.y ?? 27;
    const buttonSize = options.buttonSize ?? 40;
    const modalDepth = 520;
    let dragging = null;
    let opened = false;

    const fixed = (object, objectDepth = depth) => {
        object.setScrollFactor?.(0);
        object.setDepth?.(objectDepth);
        return object;
    };

    const gearButton = fixed(
        scene.add.rectangle(buttonX, buttonY, buttonSize, buttonSize, 0x06100d, 0.78)
            .setStrokeStyle(1, 0xd6b56c, 0.78)
            .setInteractive({ useHandCursor: true }),
        depth
    );

    const gearLabel = fixed(
        scene.add.text(buttonX, buttonY, '⚙', {
            fontFamily: 'Arial',
            fontSize: String(Math.max(22, buttonSize - 14)) + 'px',
            color: '#f1e1ae'
        }).setOrigin(0.5),
        depth + 1
    );

    const modal = scene.add.container(0, 0).setScrollFactor(0).setDepth(modalDepth).setVisible(false);
    const overlay = scene.add.rectangle(0, 0, 1024, 768, 0x010403, 0.78).setInteractive();
    const panel = scene.add.rectangle(0, 0, 470, 350, 0x07130f, 0.98).setStrokeStyle(2, 0xd6b56c, 0.9);
    const title = scene.add.text(0, 0, 'ÁUDIO', {
        fontFamily: 'Arial Black',
        fontSize: '27px',
        color: '#f1e1ae'
    }).setOrigin(0.5);

    const musicLabel = scene.add.text(0, 0, 'MÚSICA', {
        fontFamily: 'Arial Black',
        fontSize: '16px',
        color: '#d6b56c'
    }).setOrigin(0, 0.5);

    const soundsLabel = scene.add.text(0, 0, 'SONS', {
        fontFamily: 'Arial Black',
        fontSize: '16px',
        color: '#d6b56c'
    }).setOrigin(0, 0.5);

    const createSlider = (getter, setter) => {
        const track = scene.add.rectangle(0, 0, 270, 8, 0x78917c, 0.55);
        const fill = scene.add.rectangle(0, 0, 1, 8, 0xd6b56c, 0.95).setOrigin(0, 0.5);
        const knob = scene.add.circle(0, 0, 11, 0xf1e1ae, 1).setStrokeStyle(2, 0x8b5a2b, 1);
        const percent = scene.add.text(0, 0, '100%', {
            fontFamily: 'Arial Black',
            fontSize: '14px',
            color: '#e5e8de'
        }).setOrigin(1, 0.5);
        const hit = scene.add.rectangle(0, 0, 310, 48, 0x000000, 0).setInteractive({ useHandCursor: true });

        const slider = { track, fill, knob, percent, hit, getter, setter };
        hit.on('pointerdown', (pointer) => {
            audioManager.unlock?.();
            dragging = slider;
            updateFromPointer(slider, pointer);
        });
        return slider;
    };

    const musicSlider = createSlider(
        () => audioManager.getMusicLevel?.() ?? 1,
        (value) => audioManager.setMusicLevel?.(value)
    );
    const soundsSlider = createSlider(
        () => audioManager.getSoundsLevel?.() ?? 1,
        (value) => audioManager.setSoundsLevel?.(value)
    );

    const closeButton = scene.add.rectangle(0, 0, 190, 50, 0x8b5a2b, 1)
        .setStrokeStyle(2, 0xd6b56c, 1)
        .setInteractive({ useHandCursor: true });
    const closeLabel = scene.add.text(0, 0, 'FECHAR', {
        fontFamily: 'Arial Black',
        fontSize: '17px',
        color: '#ffffff'
    }).setOrigin(0.5);

    modal.add([
        overlay, panel, title,
        musicLabel, soundsLabel,
        musicSlider.track, musicSlider.fill, musicSlider.knob, musicSlider.percent, musicSlider.hit,
        soundsSlider.track, soundsSlider.fill, soundsSlider.knob, soundsSlider.percent, soundsSlider.hit,
        closeButton, closeLabel
    ]);

    const syncSlider = (slider) => {
        const value = Math.max(0, Math.min(1, slider.getter()));
        const left = slider.track.x - 135;
        slider.fill.setPosition(left, slider.track.y);
        slider.fill.setDisplaySize(Math.max(1, 270 * value), 8);
        slider.knob.setPosition(left + 270 * value, slider.track.y);
        slider.percent.setText(String(Math.round(value * 100)) + '%');
    };

    function updateFromPointer (slider, pointer)
    {
        const left = slider.track.x - 135;
        const value = Math.max(0, Math.min(1, (pointer.x - left) / 270));
        slider.setter(value);
        syncSlider(slider);
    }

    const layout = () => {
        const width = scene.scale?.gameSize?.width ?? 1024;
        const height = scene.scale?.gameSize?.height ?? 768;
        const cx = width / 2;
        const cy = height / 2;

        overlay.setPosition(cx, cy).setSize(width, height);
        panel.setPosition(cx, cy).setSize(470, 350);
        title.setPosition(cx, cy - 130);

        musicLabel.setPosition(cx - 155, cy - 70);
        musicSlider.track.setPosition(cx, cy - 30);
        musicSlider.hit.setPosition(cx, cy - 30);
        musicSlider.percent.setPosition(cx + 168, cy - 30);

        soundsLabel.setPosition(cx - 155, cy + 25);
        soundsSlider.track.setPosition(cx, cy + 65);
        soundsSlider.hit.setPosition(cx, cy + 65);
        soundsSlider.percent.setPosition(cx + 168, cy + 65);

        closeButton.setPosition(cx, cy + 135);
        closeLabel.setPosition(cx, cy + 135);

        syncSlider(musicSlider);
        syncSlider(soundsSlider);
    };

    const open = () => {
        audioManager.unlock?.();
        opened = true;
        dragging = null;
        layout();
        modal.setVisible(true);
    };

    const close = () => {
        opened = false;
        dragging = null;
        modal.setVisible(false);
    };

    gearButton.on('pointerover', () => gearButton.setFillStyle(0x1a2c23, 0.92));
    gearButton.on('pointerout', () => gearButton.setFillStyle(0x06100d, 0.78));
    gearButton.on('pointerdown', open);
    gearLabel.setInteractive({ useHandCursor: true }).on('pointerdown', open);
    overlay.on('pointerdown', () => {});
    closeButton.on('pointerdown', close);
    closeLabel.setInteractive({ useHandCursor: true }).on('pointerdown', close);

    const onPointerMove = (pointer) => {
        if (opened && dragging && pointer.isDown) updateFromPointer(dragging, pointer);
    };
    const onPointerUp = () => { dragging = null; };
    const onResize = () => { if (opened) layout(); };
    const onEscape = () => { if (opened) close(); };

    scene.input.on('pointermove', onPointerMove);
    scene.input.on('pointerup', onPointerUp);
    scene.scale?.on?.('resize', onResize);
    scene.input.keyboard?.on?.('keydown-ESC', onEscape);

    scene.events.once('shutdown', () => {
        scene.input.off('pointermove', onPointerMove);
        scene.input.off('pointerup', onPointerUp);
        scene.scale?.off?.('resize', onResize);
        scene.input.keyboard?.off?.('keydown-ESC', onEscape);
    });

    layout();

    return { open, close, gearButton, gearLabel, modal };
}
