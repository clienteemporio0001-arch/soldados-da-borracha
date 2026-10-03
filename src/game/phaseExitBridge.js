export function createPhaseExitBridge (scene, options = {})
{
    const {
        step = null,
        startX: explicitStartX = null,
        startY: explicitStartY = null,
        length = 330,
        rise = -10,
        depth = 12
    } = options;

    const startX = step
        ? step[0] + step[2] * 0.42
        : explicitStartX;
    const startY = step
        ? step[1] - 19
        : explicitStartY;

    if (!Number.isFinite(startX) || !Number.isFinite(startY)) {
        throw new Error('createPhaseExitBridge requires a valid step or startX/startY');
    }

    const endX = startX + length;
    const deckY = (x) => {
        const t = Math.max(0, Math.min(1, (x - startX) / length));
        return startY + Math.sin(t * Math.PI) * 16 + t * rise;
    };

    const g = scene.add.graphics().setDepth(depth);

    g.fillStyle(0x17120e, 0.30);
    g.fillRect(startX, deckY(startX) + 10, length, 16);

    const plankCount = Math.max(6, Math.round(length / 42));
    for (let i = 0; i < plankCount; i += 1) {
        const t = (i + 0.5) / plankCount;
        const x = startX + t * length;
        const y = deckY(x);
        const w = length / plankCount + 5;
        const h = 18;

        g.fillStyle(i % 2 ? 0x5a3b25 : 0x67462b, 0.98);
        g.fillRect(x - w / 2, y - h / 2, w, h);

        g.lineStyle(1.5, 0x9a7048, 0.62);
        g.lineBetween(x - w / 2 + 4, y - h / 2 + 3, x + w / 2 - 4, y - h / 2 + 1);
    }

    g.lineStyle(5, 0x2d2118, 0.96);
    for (const offset of [-34, 34]) {
        g.beginPath();
        for (let i = 0; i <= 16; i += 1) {
            const t = i / 16;
            const x = startX + t * length;
            const y = deckY(x) + offset - 5;
            if (i === 0) g.moveTo(x, y);
            else g.lineTo(x, y);
        }
        g.strokePath();
    }

    g.lineStyle(2, 0x806044, 0.82);
    for (let i = 0; i <= 16; i += 2) {
        const t = i / 16;
        const x = startX + t * length;
        const y = deckY(x);
        g.lineBetween(x, y - 3, x, y - 39);
        g.lineBetween(x, y + 3, x, y + 39);
    }

    g.fillStyle(0x3b281b, 0.98);
    g.fillRect(startX - 15, deckY(startX) - 74, 14, 82);
    g.fillRect(endX + 1, deckY(endX) - 74, 14, 82);

    g.lineStyle(4, 0x2d2118, 0.94);
    g.lineBetween(startX - 8, deckY(startX) - 64, startX + 42, deckY(startX) - 20);
    g.lineBetween(endX + 8, deckY(endX) - 64, endX - 42, deckY(endX) - 20);

    if (step) {
        g.lineStyle(6, 0x2d2118, 0.96);
        g.lineBetween(step[0] + step[2] * 0.38, step[1] - 8, startX + 12, deckY(startX) - 1);
    }

    // Piso físico contínuo: segmentos sobrepostos acompanham o arco visual,
    // evitando frestas entre tábuas sem introduzir física de cordas.
    const bodies = [];
    const collisionSegments = Math.max(8, Math.ceil(length / 28));
    const segmentLength = length / collisionSegments;

    for (let i = 0; i < collisionSegments; i += 1) {
        const t = (i + 0.5) / collisionSegments;
        const x = startX + t * length;
        const y = deckY(x);
        const body = scene.add.rectangle(x, y, segmentLength + 10, 18, 0x000000, 0);
        scene.physics.add.existing(body, true);
        scene.platforms.add(body);
        bodies.push(body);
    }

    return {
        visual: g,
        bodies,
        startX,
        endX,
        startY: deckY(startX),
        endY: deckY(endX),
        deckY
    };
}
