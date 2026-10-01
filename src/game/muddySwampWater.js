const SWAMP_SYSTEM_KEY = '__muddySwampWaterSystem';

const PALETTES = {
    1: { deep: 0x463023, main: 0x765238, shadow: 0x5b3a25, highlight: 0x917052, olive: 0x56603d, mud: 0x68452d },
    2: { deep: 0x3a291f, main: 0x68452d, shadow: 0x523521, highlight: 0x8b6747, olive: 0x4d5538, mud: 0x5b3a25 },
    3: { deep: 0x463023, main: 0x765238, shadow: 0x5b3a25, highlight: 0x9a724d, olive: 0x5a5d39, mud: 0x68452d },
    4: { deep: 0x30231b, main: 0x5b3a25, shadow: 0x463023, highlight: 0x765238, olive: 0x484c32, mud: 0x513421 },
    5: { deep: 0x211915, main: 0x463023, shadow: 0x35241c, highlight: 0x68452d, olive: 0x39412d, mud: 0x3a291f }
};

function seededUnit (seed)
{
    const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
}

function ensureSystem (scene, options = {})
{
    const current = scene[SWAMP_SYSTEM_KEY];
    if (current && !current.destroyed) return current;

    const phase = options.phase ?? 1;
    const palette = PALETTES[phase] ?? PALETTES[1];
    const water = scene.add.graphics().setDepth(options.depth ?? 4).setAlpha(0.94);
    const edges = scene.add.graphics().setDepth(options.edgeDepth ?? 6).setAlpha(0.94);

    const system = {
        scene,
        phase,
        palette,
        water,
        edges,
        regions: new Set(),
        tween: null,
        destroyed: false,
        cleanup: null
    };

    system.tween = scene.tweens.add({
        targets: [water, edges],
        alpha: { from: 0.90, to: 1.0 },
        duration: 2600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
    });

    system.cleanup = () => {
        if (system.destroyed) return;
        system.destroyed = true;
        system.tween?.stop?.();
        system.tween?.remove?.();
        system.water?.destroy?.();
        system.edges?.destroy?.();
        if (scene[SWAMP_SYSTEM_KEY] === system) scene[SWAMP_SYSTEM_KEY] = null;
    };

    scene.events.once('shutdown', system.cleanup);
    scene.events.once('destroy', system.cleanup);
    scene[SWAMP_SYSTEM_KEY] = system;
    return system;
}

export function addMuddySwampGap (scene, x, width, options = {})
{
    if (!scene || !Number.isFinite(x) || !Number.isFinite(width) || width <= 1) return null;

    const system = ensureSystem(scene, options);
    const surfaceY = options.surfaceY ?? 700;
    const key = Math.round(x * 10) + ':' + Math.round(width * 10) + ':' + Math.round(surfaceY * 10);
    if (system.regions.has(key)) return system;
    system.regions.add(key);

    const p = system.palette;
    const w = Math.max(2, width);
    const bottomY = options.bottomY ?? 790;
    const waterHeight = Math.max(40, bottomY - surfaceY);

    system.water.fillStyle(p.deep, 0.98);
    system.water.fillRect(x, surfaceY + 14, w, waterHeight);
    system.water.fillStyle(p.main, 0.96);
    system.water.fillRect(x, surfaceY, w, Math.min(46, waterHeight));
    system.water.fillStyle(p.shadow, 0.35);
    system.water.fillRect(x, surfaceY + 34, w, Math.max(16, waterHeight - 34));

    const steps = Math.max(2, Math.ceil(w / 24));
    system.water.lineStyle(2, p.highlight, system.phase === 5 ? 0.26 : 0.34);
    system.water.beginPath();
    for (let i = 0; i <= steps; i += 1) {
        const px = x + (w * i / steps);
        const wobble = (seededUnit(x * 0.013 + i * 3.7 + system.phase) - 0.5) * 4.4;
        const py = surfaceY + wobble;
        if (i === 0) system.water.moveTo(px, py);
        else system.water.lineTo(px, py);
    }
    system.water.strokePath();

    const rippleCount = Math.max(1, Math.min(5, Math.floor(w / 90) + 1));
    for (let i = 0; i < rippleCount; i += 1) {
        const rx = x + 10 + seededUnit(x * 0.021 + i * 9.1) * Math.max(8, w - 20);
        const ry = surfaceY + 7 + seededUnit(x * 0.017 + i * 5.3) * 20;
        const rw = Math.min(w * 0.45, 20 + seededUnit(i + w * 0.01) * 42);
        system.water.lineStyle(1.5, i % 2 ? p.highlight : p.olive, 0.16 + (i % 3) * 0.035);
        system.water.strokeEllipse(rx, ry, Math.max(10, rw), 4 + (i % 2) * 2);
    }

    if (w >= 36) {
        const detailCount = Math.max(1, Math.min(4, Math.floor(w / 150) + 1));
        for (let i = 0; i < detailCount; i += 1) {
            const dx = x + 9 + seededUnit(x * 0.031 + i * 7.7) * Math.max(10, w - 18);
            const dy = surfaceY + 11 + seededUnit(x * 0.023 + i * 4.9) * 18;
            if (i % 3 === 0) {
                system.water.fillStyle(p.olive, 0.34);
                system.water.fillEllipse(dx, dy, 10 + (i % 2) * 5, 4);
            } else if (i % 3 === 1) {
                system.water.lineStyle(2, p.mud, 0.42);
                system.water.beginPath();
                system.water.moveTo(dx - 8, dy + 1);
                system.water.lineTo(dx + 9, dy - 2);
                system.water.strokePath();
            } else {
                system.water.fillStyle(p.highlight, 0.22);
                system.water.fillCircle(dx, dy, 2.3);
                system.water.fillCircle(dx + 5, dy + 2, 1.6);
            }
        }
    }

    const edgeWidth = Math.min(18, Math.max(5, w * 0.16));
    system.edges.fillStyle(p.deep, 0.55);
    system.edges.fillEllipse(x + edgeWidth * 0.45, surfaceY + 1, edgeWidth, 9);
    system.edges.fillEllipse(x + w - edgeWidth * 0.45, surfaceY + 1, edgeWidth, 9);
    system.edges.lineStyle(3, p.mud, 0.40);
    system.edges.beginPath();
    system.edges.moveTo(x + 2, surfaceY - 2);
    system.edges.lineTo(x + Math.min(16, w * 0.25), surfaceY + 5);
    system.edges.moveTo(x + w - 2, surfaceY - 2);
    system.edges.lineTo(x + w - Math.min(16, w * 0.25), surfaceY + 5);
    system.edges.strokePath();

    return system;
}

export function addMuddySwampWaterFromGroundSegments (scene, groundSegments, options = {})
{
    if (!Array.isArray(groundSegments) || groundSegments.length === 0) return null;

    const sorted = groundSegments
        .map(segment => [segment[0], segment[2]])
        .filter(([x, width]) => Number.isFinite(x) && Number.isFinite(width) && width > 0)
        .sort((a, b) => a[0] - b[0]);

    let system = null;
    for (let i = 0; i < sorted.length - 1; i += 1) {
        const gapStart = sorted[i][0] + sorted[i][1];
        const gapEnd = sorted[i + 1][0];
        const gapWidth = gapEnd - gapStart;
        if (gapWidth > 1) system = addMuddySwampGap(scene, gapStart, gapWidth, options) ?? system;
    }

    const endX = options.endX;
    if (Number.isFinite(endX) && sorted.length > 0) {
        const last = sorted[sorted.length - 1];
        const gapStart = last[0] + last[1];
        const gapWidth = endX - gapStart;
        if (gapWidth > 1) system = addMuddySwampGap(scene, gapStart, gapWidth, options) ?? system;
    }

    return system;
}
