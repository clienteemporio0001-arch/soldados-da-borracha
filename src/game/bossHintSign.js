export function createBossHintSign(scene, options = {})
{
    const {
        x,
        y = 650,
        title = 'DICA DE COMBATE',
        text = '',
        touchDistance = 72,
        leaveDistance = 120
    } = options;

    const sign = scene.add.container(x, y).setDepth(14);

    const postShadow = scene.add.ellipse(0, 3, 76, 12, 0x0b0b08, 0.28);
    const leftPost = scene.add.rectangle(-32, -36, 10, 78, 0x4a321f, 1).setAngle(-2);
    const rightPost = scene.add.rectangle(32, -36, 10, 78, 0x4a321f, 1).setAngle(2);
    const board = scene.add.rectangle(0, -82, 128, 54, 0x65452a, 1)
        .setStrokeStyle(3, 0x3b281c, 0.95);
    const boardInset = scene.add.rectangle(0, -82, 112, 40, 0x765235, 0.7)
        .setStrokeStyle(1, 0x9a7650, 0.35);
    const nailL = scene.add.circle(-48, -82, 2.5, 0x2a211b, 0.9);
    const nailR = scene.add.circle(48, -82, 2.5, 0x2a211b, 0.9);
    const label = scene.add.text(0, -82, 'DICA', {
        fontFamily: 'Arial Black',
        fontSize: '18px',
        color: '#ead8aa',
        stroke: '#342319',
        strokeThickness: 2
    }).setOrigin(0.5);

    sign.add([postShadow, leftPost, rightPost, board, boardInset, nailL, nailR, label]);

    let triggered = false;
    let panel = null;

    const hideHint = (immediate = false) => {
        if (!panel || !panel.active) {
            panel = null;
            return;
        }

        const target = panel;
        panel = null;

        if (immediate) {
            target.destroy(true);
            return;
        }

        scene.tweens.add({
            targets: target,
            alpha: 0,
            y: target.y - 8,
            duration: 260,
            ease: 'Sine.Out',
            onComplete: () => target.destroy(true)
        });
    };

    const showHint = () => {
        hideHint(true);

        panel = scene.add.container(512, 128)
            .setScrollFactor(0)
            .setDepth(185)
            .setAlpha(0);

        const background = scene.add.rectangle(0, 0, 650, 150, 0x040907, 0.92)
            .setStrokeStyle(2, 0x8d7047, 0.9);
        const header = scene.add.rectangle(0, -53, 650, 44, 0x4b3423, 0.96);
        const marker = scene.add.rectangle(-302, -53, 7, 28, 0xd6b56c, 0.95);
        const titleText = scene.add.text(-282, -53, title, {
            fontFamily: 'Arial Black',
            fontSize: '18px',
            color: '#f1e1ae'
        }).setOrigin(0, 0.5);
        const bodyText = scene.add.text(0, 20, text, {
            fontFamily: 'Arial',
            fontSize: '17px',
            color: '#e6ece5',
            align: 'center',
            wordWrap: { width: 590, useAdvancedWrap: true },
            lineSpacing: 4
        }).setOrigin(0.5);

        panel.add([background, header, marker, titleText, bodyText]);

        scene.tweens.add({
            targets: panel,
            alpha: 1,
            y: 138,
            duration: 220,
            ease: 'Sine.Out'
        });

    };

    const update = (player) => {
        if (!player || !player.active) return;

        const dx = Math.abs(player.x - x);
        const dy = Math.abs(player.y - y);
        const touching = dx <= touchDistance && dy <= 150;
        const movedAway = dx >= leaveDistance || dy > 190;

        if (!triggered && touching) {
            triggered = true;
            showHint();
            return;
        }

        if (triggered && movedAway) {
            triggered = false;
            hideHint(false);
        }
    };

    const reset = () => {
        triggered = false;
        hideHint(true);
    };

    const destroy = () => {
        hideHint(true);
        if (sign?.active) sign.destroy(true);
    };

    scene.events.once('shutdown', destroy);

    return {
        sign,
        update,
        reset,
        destroy,
        get triggered () { return triggered; }
    };
}
