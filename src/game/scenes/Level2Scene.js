import { Scene } from 'phaser';
import { createBasicMobileControls } from '../mobileControls';
import { createForestMonkeySystem } from '../forestMonkeySystem.js';
import { OncaEncounter } from '../oncaEncounter.js';
import { createHorizontalExpansion } from '../phaseHorizontalExtension.js';
import { createTropicalStormSystem, applyWetGroundMovement } from '../weatherSystem.js';
import { getAudioManager } from '../audio/AudioManager.js';
import { createAudioSettingsControl } from '../ui/AudioSettingsPanel.js';

export class Level2Scene extends Scene
{
    constructor ()
    {
        super('Level2Scene');
    }

    create ()
    {
        this.worldWidth = 9900;
        const worldHeight = 768;

        this.physics.world.setBounds(0, 0, this.worldWidth, worldHeight);
        this.cameras.main.setBounds(0, 0, this.worldWidth, worldHeight);
        this.cameras.main.setBackgroundColor('#355f50');

        this.createDeepForest();
        this.createPlatforms();
        this.createCurupiraSigns();

        this.player = this.add.rectangle(150, 560, 45, 70, 0x000000, 0);
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);
        this.player.body.setMaxVelocity(260, 900);
        this.player.body.setSize(45, 70);
        this.createEnvironmentalChallenges();
        this.physics.add.collider(this.player, this.platforms);

        this.playerVisual = this.createPlayerVisual();
        this.playerVisual.setVisible(false);
        this.attackSprite=this.add.sprite(this.player.x,this.player.y+45,'seringueiroAttack',0)
            .setOrigin(.5,480/512).setScale(.23).setDepth(20).setVisible(true)
            .setFlipX(this.playerVisual.facing<0);
        this.idleVisualStartedAt=null;
        this.wasAirborneVisual=false;
        this.landingVisualStartedAt=null;
        this.syncPlayerVisual();

        this.maxHealth = 100;
        this.health = 100;
        this.maxHunger = 100;
        this.hunger = 100;
        this.nextHungerDrainAt = this.time.now + 2000;
        this.nextStarvationDamageAt = this.time.now + 2000;
        this.invulnerableUntil = 0;
        this.knockbackUntil = 0;
        this.isPlayerDead = false;
        this.phaseCompleted = false;

        this.doubleJumpUnlocked = false;
        this.firstDoubleJumpPending = false;
        this.jumpsUsed = 0;
        this.jumpWasDown = false;
        this.wasGrounded = false;
        this.jumpBufferUntil = 0;
        this.jumpBufferMs = 130;
        this.coyoteTimeMs = 100;
        this.coyoteUntil = 0;
        this.lastAirVelocityY = 0;
        this.fastFallActive = false;
        this.motionFx = { scaleX: 1, scaleY: 1 };
        this.directionFx = { lean: 0 };
        this.lastMoveDirection = 0;

        this.maxStamina = 100;
        this.stamina = 100;
        this.doubleJumpStaminaCost = 30;
        this.staminaRegenDelay = 350;
        this.staminaGroundRegen = 40;
        this.staminaAirRegen = 12;
        this.staminaRegenBlockedUntil = 0;
        this.lastStaminaUpdateAt = this.time.now;
        this.nextStaminaFeedbackAt = 0;

        this.isAttacking = false;
        this.attackStartedAt = 0;
        this.nextAttackAt = 0;
        this.attackDirection = 1;
        this.attackBufferUntil = 0;
        this.attackBufferMs = 100;
        this.attackVisualVariant = -1;
        this.attackArcShown = false;
        this.attackHitSnakeRegistered = false;
        this.attackHitCarapanaRegistered = false;
        this.attackHitCurupiraRegistered = false;
        this.attackBlockCurupiraRegistered = false;

        this.createSnake();
        this.createCarapana();
        this.createCurupira();
        this.createAttackHitbox();
        this.createFruits();
        this.createArena();
        this.createFinalZone();

        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey('A');
        this.keyD = this.input.keyboard.addKey('D');
        this.keyW = this.input.keyboard.addKey('W');
        this.keyS = this.input.keyboard.addKey('S');
        this.spaceKey = this.input.keyboard.addKey('SPACE');
        this.keyJ = this.input.keyboard.addKey('J');
        this.keyX = this.input.keyboard.addKey('X');

        this.keyJ.on('down', () => this.queueAttackInput());
        this.keyX.on('down', () => this.queueAttackInput());
        createBasicMobileControls(this);

        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setDeadzone(220, 160);

        this.createHud();
        this.createHealthHud();
        this.createHungerHud();
        this.createStaminaHud();
        this.staminaHud.setVisible(false);
        this.showLevelTitle();
        this.createLivingAtmosphere();
        this.createPorongaLightSystem();

        this.spawnPoint = { x: 150, y: 560 };
        this.forestMonkeySystem = createForestMonkeySystem(this, {
            phase: 2,
            perches: [
                { x: 392, y: 292 },
                { x: 1042, y: 315 },
                { x: 1630, y: 278 },
                { x: 2268, y: 305 },
                { x: 2874, y: 286 }
            ],
            damage: 12,
            maxMonkeys: 2,
            throwMin: 2500,
            throwMax: 3200,
            maxProjectiles: 3,
            aimLead: 0.22,
            aimError: 31,
            spawnChance: 0.64,
            isPaused: () =>
                this.phaseCompleted ||
                (this.arenaStarted && !this.arenaCleared) ||
                this.firstDoubleJumpPending
        });
        this.oncaEncounter = new OncaEncounter(this, {
            phase: 2,
            canSpawn: () => {
                const bossActive = this.arenaStarted && !this.arenaCleared;
                const bossBlocked = bossActive && (this.curupiraState === 'INTRO' || this.curupiraState === 'DEFEATED');
                const unlockBlocked = this.arenaCleared && !this.doubleJumpUnlocked;
                return {
                    allowed: !this.phaseCompleted && !this.isPlayerDead && !bossBlocked && !unlockBlocked,
                    bossActive
                };
            }
        });

        this.weatherSystem = createTropicalStormSystem(this, { phase: 2 });
        this.audioManager = getAudioManager(this);
        this.audioManager?.startScene(this, { music: 'music_forest', ambient: 'forest_ambient' });

        this.horizontalExpansion = createHorizontalExpansion(this, {
            phase: 2,
            startX: 3300,
            endX: 9500,
            traversalEndX: 7200,
            resourceEndX: 7200,
            groundY: 710,
            checkpointXs: [3600, 6750],
            checkpointY: 560,
            enemyXs: [3980, 4920, 5860, 6840],
            monkeyPerches: [
                { x: 3650, y: 300 }, { x: 4520, y: 280 }, { x: 5450, y: 315 },
                { x: 6320, y: 275 }, { x: 7060, y: 300 }, { x: 8920, y: 292 }
            ]
        });

        [
            [8740,575,150],[8970,520,150],[9200,455,140],[9430,375,130]
        ].forEach(([x,y,w])=>{
            const body=this.add.rectangle(x,y,w,22,0x000000,0);
            this.physics.add.existing(body,true);this.platforms.add(body);
            this.add.rectangle(x,y,w,22,0x4a3425,.96).setDepth(10);
            this.add.ellipse(x,y-12,w*.82,8,0x315a37,.62).setDepth(11);
        });
}

    createDeepForest ()
    {
        // Meio-dia sob copa fechada: luz natural forte, mas filtrada pela mata.
        const sky = this.add.graphics().setDepth(-50).setScrollFactor(0);
        sky.fillStyle(0x355f50,1);
        sky.fillRect(0,0,1024,768);
        sky.fillStyle(0x477462,.56);
        sky.fillRect(0,175,1024,315);
        sky.fillStyle(0x64816c,.22);
        sky.fillRect(0,465,1024,303);

        // Claridade alta filtrada por uma massa de copa.
        this.add.circle(810,104,74,0xf1eacb,.08)
            .setDepth(-49)
            .setScrollFactor(.035);
        this.add.circle(810,104,34,0xf3ebcb,.34)
            .setDepth(-48)
            .setScrollFactor(.035);
        this.add.ellipse(790,108,135,52,0x1a4735,.34)
            .setDepth(-47)
            .setScrollFactor(.04);

        // FUNDO: silhuetas irregulares, sem formar uma parede contínua.
        const distant = this.add.graphics().setDepth(-40).setScrollFactor(0.12);
        distant.fillStyle(0x071a14, 0.96);
        distant.fillRect(-350, 510, this.worldWidth + 900, 280);

        const distantTrees = [
            [20, 420, 22, 205, 72], [145, 462, 17, 165, 58],
            [305, 390, 27, 235, 88], [515, 438, 20, 188, 65],
            [735, 365, 31, 260, 102], [990, 445, 19, 180, 62],
            [1190, 405, 25, 220, 84], [1400, 455, 18, 170, 58],
            [1575, 372, 33, 255, 104], [1840, 430, 23, 195, 75],
            [2060, 395, 29, 230, 90], [2305, 448, 18, 178, 60],
            [2490, 360, 34, 265, 108], [2760, 425, 23, 200, 78],
            [3000, 382, 30, 245, 94], [3240, 450, 18, 175, 58]
        ];

        distantTrees.forEach(([x, y, trunkW, trunkH, crown], index) => {
            distant.fillStyle(index % 3 === 0 ? 0x0d2a20 : 0x10271f, 0.88);
            distant.fillRect(x, y, trunkW, trunkH);
            distant.fillStyle(index % 2 === 0 ? 0x0a241b : 0x0d2b20, 0.92);
            distant.fillCircle(x + trunkW / 2, y - 4, crown);
            distant.fillCircle(x - crown * 0.45, y + 18, crown * 0.58);
            distant.fillCircle(x + crown * 0.52, y + 26, crown * 0.64);
        });

        // MEIO: árvores maiores, troncos bem visíveis, copas com alturas variadas.
        const middle = this.add.graphics().setDepth(-24).setScrollFactor(0.45);
        const middleTrees = [
            [85, 320, 40, 335, 0.92, true], [360, 260, 52, 395, 1.08, false],
            [690, 350, 34, 305, 0.84, true], [1010, 285, 48, 370, 1.02, false],
            [1320, 335, 38, 320, 0.9, true], [1600, 245, 56, 410, 1.12, false],
            [1940, 325, 40, 330, 0.94, true], [2240, 275, 50, 380, 1.05, false],
            [2550, 342, 36, 313, 0.86, true], [2845, 252, 54, 403, 1.1, false],
            [3160, 330, 38, 325, 0.9, true]
        ];
        middleTrees.forEach(([x, y, w, h, scale, left]) => this.drawDeepTree(middle, x, y, w, h, scale, left));

        // Cipós em uma camada intermediária separada.
        const vines = this.add.graphics().setDepth(-13).setScrollFactor(0.58);
        vines.lineStyle(5, 0x173f29, 0.72);
        [[280,30,365],[760,55,430],[1210,25,390],[1710,40,455],[2150,25,390],[2670,55,440],[3090,35,400]].forEach(([x, top, bottom], i) => {
            vines.beginPath();
            vines.moveTo(x, top);
            vines.lineTo(x + (i % 2 === 0 ? -12 : 10), bottom * 0.58);
            vines.lineTo(x + (i % 2 === 0 ? 7 : -9), bottom);
            vines.strokePath();
        });

        // Seringueiras mais orgânicas, mantendo a identidade procedural.
        this.rubberLatexInterval=2500;
        [
            [520,390,42,265],[1465,375,44,280],
            [2160,392,40,263],[3020,365,46,290]
        ].forEach(([x,y,w,h],index)=>this.createRubberTreeVisual(x,y,w,h,index,7,.96));

        // Raízes visuais no plano de gameplay, sem física adicional.
        const roots = this.add.graphics().setDepth(4);
        roots.lineStyle(13, 0x3b2a1d, 0.88);
        [[410,650,525,610],[865,650,990,603],[1480,650,1605,592],[2160,650,2290,602],[2570,650,2690,606],[2890,650,3000,588]].forEach(([x1,y1,x2,y2]) => {
            roots.beginPath();
            roots.moveTo(x1, y1);
            roots.lineTo(x2, y2);
            roots.strokePath();
        });

        // Névoa orgânica mais densa, sempre atrás da leitura de gameplay.
        this.createOrganicFogMass(650,495,1540,155,0xa7c2b3,.065,-18,.18,3);
        this.createOrganicFogMass(1940,548,2200,135,0xd5e0d7,.045,-16,.38,5);
        this.createOrganicFogMass(2510,520,760,175,0xc8d8ce,.07,-11,.68,7);

        // Clareiras de luz natural atravessam a copa fechada.
        this.add.ellipse(790, 572, 330, 78, 0xd6dfbd, 0.042)
            .setDepth(-9)
            .setScrollFactor(0.72);
        this.add.ellipse(2140, 548, 410, 92, 0xd6dfbd, 0.038)
            .setDepth(-9)
            .setScrollFactor(0.72);

        // FRENTE: arbustos, capim e folhas com transparência para manter leitura do jogador.
        const foreground = this.add.graphics().setDepth(30).setScrollFactor(1.08).setAlpha(0.74);
        const shrubs = [
            [30,646,42],[160,648,31],[370,646,38],[650,647,34],[830,646,42],
            [1110,647,30],[1300,646,40],[1530,647,33],[1760,646,44],[2010,648,31],
            [2260,646,39],[2475,647,35],[2710,646,42],[2960,647,32],[3210,646,40]
        ];
        shrubs.forEach(([x, y, size], index) => {
            foreground.fillStyle(index % 2 === 0 ? 0x0b2518 : 0x12351f, 0.94);
            foreground.fillCircle(x, y, size);
            foreground.fillCircle(x + size * 0.72, y + 5, size * 0.7);
        });

        foreground.lineStyle(4, 0x183e24, 0.9);
        [90, 470, 910, 1370, 1870, 2320, 2780, 3170].forEach((x, index) => {
            for (let i = 0; i < 4; i += 1) {
                foreground.beginPath();
                foreground.moveTo(x + i * 10, 658);
                foreground.lineTo(x - 10 + i * 8, 625 - (i % 2) * 14 - (index % 3) * 3);
                foreground.strokePath();
            }
        });
    }

    drawDeepTree (graphics, x, y, trunkWidth, trunkHeight, crownScale, branchLeft)
    {
        const cx=x+trunkWidth*.5;
        const baseY=y+trunkHeight;

        graphics.fillStyle(0x3b2b1f,.94);
        graphics.fillRoundedRect(x,y,trunkWidth,trunkHeight,Math.max(6,trunkWidth*.24));
        graphics.fillStyle(0x4c3726,.42);
        graphics.fillRoundedRect(x+trunkWidth*.17,y+9,trunkWidth*.2,trunkHeight-17,5);
        graphics.fillStyle(0x2d231b,.28);
        graphics.fillRoundedRect(x+trunkWidth*.7,y+22,trunkWidth*.11,trunkHeight-30,4);

        graphics.lineStyle(6,0x38291d,.78);
        graphics.beginPath();graphics.moveTo(cx,baseY-7);graphics.lineTo(x-26,baseY+3);graphics.strokePath();
        graphics.beginPath();graphics.moveTo(cx+4,baseY-6);graphics.lineTo(x+trunkWidth+30,baseY+2);graphics.strokePath();

        graphics.lineStyle(8,0x38291d,.82);
        graphics.beginPath();graphics.moveTo(cx,y+82);graphics.lineTo(cx+(branchLeft?-70:76),y+12);graphics.strokePath();
        graphics.lineStyle(5,0x463123,.64);
        graphics.beginPath();graphics.moveTo(cx,y+122);graphics.lineTo(cx+(branchLeft?46:-52),y+72);graphics.strokePath();

        const cy=y-8;
        graphics.fillStyle(0x0f3423,.95);
        graphics.fillEllipse(cx,cy,145*crownScale,108*crownScale);
        graphics.fillEllipse(cx-61*crownScale,cy+24,101*crownScale,76*crownScale);
        graphics.fillEllipse(cx+65*crownScale,cy+18,112*crownScale,80*crownScale);
        graphics.fillStyle(0x17472d,.56);
        graphics.fillEllipse(cx-13,cy-25,88*crownScale,58*crownScale);
        graphics.fillStyle(0x1d4f32,.34);
        graphics.fillEllipse(cx+38,cy+8,72*crownScale,50*crownScale);
    }

    decorateGroundVisual (g,segments,phase=1)
    {
        const palettes={
            1:{top:0x315d34,top2:0x244c2d,dark:0x34251c,mid:0x5b3e27,light:0x765035,stone:0x50554d,moss:0x35613a,leaf:0x806b43,wet:0x22372d},
            2:{top:0x274f31,top2:0x1c4229,dark:0x30231b,mid:0x533924,light:0x68482e,stone:0x444a43,moss:0x2d5734,leaf:0x665b3d,wet:0x1d3028},
            3:{top:0x2d6138,top2:0x214f30,dark:0x34241b,mid:0x5b3d26,light:0x755137,stone:0x4b514a,moss:0x3c6d3f,leaf:0x73804d,wet:0x20372e},
            4:{top:0x394430,top2:0x333923,dark:0x34261e,mid:0x59402d,light:0x72513a,stone:0x56534a,moss:0x46553a,leaf:0x8a7045,wet:0x3d3429},
            5:{top:0x203d29,top2:0x173321,dark:0x281e18,mid:0x493327,light:0x604434,stone:0x424640,moss:0x294c2f,leaf:0x4e5a39,wet:0x172922}
        };
        const p=palettes[phase]||palettes[1];

        segments.forEach(([x,y,w,h],segmentIndex)=>{
            g.fillStyle(p.dark,.82);g.fillRect(x,y+20,w,Math.max(18,h-20));
            g.fillStyle(p.mid,.54);g.fillRect(x,y+22,w,20);
            g.fillStyle(p.light,.24);g.fillRect(x,y+45,w,16);

            for(let px=x+20,n=0;px<x+w-18;px+=62+(segmentIndex%3)*7,n++){
                const moundW=34+((n+segmentIndex)%3)*10;
                const moundH=7+((n*2+segmentIndex)%3)*3;
                g.fillStyle((n+segmentIndex)%2?p.top:p.top2,.98);
                g.fillEllipse(px,y+3-((n+segmentIndex)%2)*2,moundW,moundH);
            }

            for(let px=x+42,n=0;px<x+w-35;px+=145+(segmentIndex%2)*18,n++){
                g.fillStyle(n%2?p.wet:p.light,n%2?.18:.22);
                g.fillEllipse(px,y+34+(n%3)*24,55+(n%2)*22,10+(n%3)*3);
            }

            // Raízes superficiais menores integram troncos/solo sem criar física.
            g.lineStyle(3,p.dark,.62);
            for(let px=x+88,n=0;px<x+w-70;px+=230+(segmentIndex%2)*20,n++){
                g.beginPath();
                g.moveTo(px,y+5);
                g.lineTo(px+18,y+11+(n%2)*3);
                g.lineTo(px+37,y+7+(n%3)*4);
                g.strokePath();
                g.lineStyle(1.5,p.light,.34);
                g.beginPath();g.moveTo(px+19,y+11);g.lineTo(px+27,y+22);g.strokePath();
                g.lineStyle(3,p.dark,.62);
            }

            for(let px=x+70,n=0;px<x+w-45;px+=190+(segmentIndex%2)*15,n++){
                const sw=18+((n+segmentIndex)%3)*6;
                g.fillStyle(p.stone,.72);
                g.fillTriangle(px-sw*.5,y+9,px,y-2-(n%2)*2,px+sw*.55,y+9);
                g.fillStyle(p.moss,.48);
                g.fillEllipse(px-2,y+1,sw*.62,4);
            }

            // Matéria orgânica: folhas, gravetos e pequenas manchas de serrapilheira.
            for(let px=x+32,n=0;px<x+w-25;px+=102+(segmentIndex%2)*9,n++){
                g.fillStyle(p.leaf,.46);
                g.fillEllipse(px,y+7,12+(n%2)*4,5);
                g.fillEllipse(px+10,y+9,10,4);
                g.fillEllipse(px-8,y+10,8+(n%3)*2,3.5);
                g.lineStyle(1.5,p.dark,.45);
                g.beginPath();g.moveTo(px+4,y+9);g.lineTo(px+18,y+5-(n%2)*3);g.strokePath();
                if((n+segmentIndex)%3===0){
                    g.lineStyle(2,p.moss,.72);
                    g.beginPath();g.moveTo(px+18,y+7);g.lineTo(px+14,y-10);g.strokePath();
                    g.beginPath();g.moveTo(px+18,y+2);g.lineTo(px+27,y-7);g.strokePath();
                }
            }

            const left=x,right=x+w;
            g.fillStyle(p.mid,.95);
            g.fillTriangle(left,y+3,left+17,y+3,left+6,y+16);
            g.fillTriangle(right,y+3,right-18,y+3,right-7,y+18);
            g.fillStyle(p.stone,.72);
            g.fillEllipse(left+12,y+8,12,7);
            g.fillEllipse(right-13,y+9,13,7);
            g.lineStyle(3,p.dark,.78);
            g.beginPath();g.moveTo(left+8,y+9);g.lineTo(left-7,y+24);g.lineTo(left+2,y+34);g.strokePath();
            g.beginPath();g.moveTo(right-8,y+10);g.lineTo(right+8,y+25);g.lineTo(right-1,y+37);g.strokePath();
        });
    }

    createPlatforms ()
    {
        this.platforms = this.physics.add.staticGroup();
        const add = (x, y, width, height) => {
            const p = this.add.rectangle(x, y, width, height, 0x000000, 0);
            this.physics.add.existing(p, true);
            this.platforms.add(p);
            return p;
        };

        // Colisões preservadas exatamente.
        add(400, 710, 800, 116);
        add(1160, 710, 600, 116);
        add(1900, 710, 760, 116);
        add(2780, 710, 980, 116);

        add(560, 590, 150, 28);
        add(900, 535, 170, 28);
        add(1350, 600, 130, 30);
        add(1620, 540, 190, 28);
        add(2050, 585, 150, 30);
        add(2290, 535, 160, 28);

        add(2860, 505, 180, 28);
        add(3110, 390, 190, 28);

        const terrain = this.add.graphics().setDepth(5);
        const ground = [
            [0, 652, 800, 116], [860, 652, 600, 116], [1520, 652, 760, 116], [2340, 652, 960, 116]
        ];

        ground.forEach(([x, y, w, h], i) => {
            terrain.fillStyle(i % 2 === 0 ? 0x4b3423 : 0x513824, 1);
            terrain.fillRect(x, y, w, h);
        });
        this.decorateGroundVisual(terrain,ground,2);

        // Barro, manchas, pedras e raízes: detalhe puramente visual.
        terrain.fillStyle(0x6a4a2d, 0.52);
        [[125,692,88],[390,726,116],[905,694,96],[1190,728,110],[1580,700,104],[1910,726,132],[2410,700,95],[2760,728,118],[3130,692,90]].forEach(([x,y,w]) => {
            terrain.fillEllipse(x, y, w, 18);
        });

        terrain.fillStyle(0x3d3024, 0.62);
        [[250,682,20,8],[705,706,28,10],[1090,684,24,9],[1735,708,30,11],[2220,686,22,9],[2630,711,30,10],[3040,687,24,9]].forEach(([x,y,w,h]) => {
            terrain.fillEllipse(x, y, w, h);
        });

        terrain.lineStyle(6, 0x2c2118, 0.76);
        [[180,656,265,710],[510,658,600,716],[960,657,1045,712],[1505,658,1590,716],[1840,658,1925,720],[2410,657,2505,714],[2940,657,3030,715]].forEach(([x1,y1,x2,y2]) => {
            terrain.beginPath();
            terrain.moveTo(x1, y1);
            terrain.lineTo(x2, y2);
            terrain.strokePath();
        });

        // Aparência natural sobre os corpos físicos já existentes.
        this.drawLevel2NaturalPlatform(terrain, 485, 576, 150, 28, 'log');
        this.drawLevel2NaturalPlatform(terrain, 815, 521, 170, 28, 'bank');
        this.drawLevel2NaturalPlatform(terrain, 1285, 585, 130, 30, 'root');
        this.drawLevel2NaturalPlatform(terrain, 1525, 526, 190, 28, 'log');
        this.drawLevel2NaturalPlatform(terrain, 1975, 570, 150, 30, 'bank');
        this.drawLevel2NaturalPlatform(terrain, 2210, 521, 160, 28, 'root');
        this.drawLevel2NaturalPlatform(terrain, 2770, 491, 180, 28, 'log');
        this.drawLevel2NaturalPlatform(terrain, 3015, 376, 190, 28, 'bank');
    }

    drawLevel2NaturalPlatform (graphics, x, y, width, height, type)
    {
        if(type==='log'){
            graphics.fillStyle(0x49311f,1);graphics.fillRoundedRect(x+4,y+2,width-8,height-3,12);
            graphics.fillStyle(0x68492f,.68);graphics.fillEllipse(x+width*.48,y+height*.42,width-18,8);
            graphics.lineStyle(2,0x2c2119,.58);[.24,.48,.7].forEach((r,i)=>{graphics.beginPath();graphics.moveTo(x+width*r,y+4);graphics.lineTo(x+width*r+10+(i%2)*5,y+height-5);graphics.strokePath();});
            graphics.fillStyle(0x2d5932,.9);graphics.fillEllipse(x+width*.35,y+1,width*.45,7);graphics.fillEllipse(x+width*.7,y+2,width*.34,6);
            graphics.fillStyle(0x7b5a3d,.58);graphics.fillCircle(x+width-7,y+height*.52,Math.min(9,height*.31));
            graphics.lineStyle(2,0x4e3826,.65);graphics.strokeCircle(x+width-7,y+height*.52,Math.min(5,height*.18));
        }else if(type==='root'){
            graphics.lineStyle(Math.max(12,height*.62),0x4b3422,.98);
            graphics.beginPath();graphics.moveTo(x+4,y+height-5);graphics.lineTo(x+width*.34,y+8);graphics.lineTo(x+width*.62,y+height*.45);graphics.lineTo(x+width-4,y+height-6);graphics.strokePath();
            graphics.lineStyle(5,0x68472d,.8);graphics.beginPath();graphics.moveTo(x+width*.34,y+9);graphics.lineTo(x+width*.25,y-3);graphics.strokePath();
            graphics.beginPath();graphics.moveTo(x+width*.62,y+height*.44);graphics.lineTo(x+width*.76,y+3);graphics.strokePath();
            graphics.fillStyle(0x2b5530,.84);graphics.fillEllipse(x+width*.42,y+3,width*.48,7);graphics.fillEllipse(x+width*.72,y+5,width*.27,6);
        }else{
            graphics.fillStyle(0x553923,1);graphics.fillRoundedRect(x+2,y+5,width-4,height-5,8);
            graphics.fillStyle(0x315d34,.92);graphics.fillEllipse(x+width*.26,y+2,width*.48,8);graphics.fillEllipse(x+width*.7,y+3,width*.4,7);
            graphics.fillStyle(0x434a43,.65);graphics.fillTriangle(x+width*.18,y+height-2,x+width*.32,y+height*.26,x+width*.44,y+height-2);
            graphics.fillStyle(0x714d2e,.4);graphics.fillEllipse(x+width*.68,y+height*.68,width*.34,height*.28);
        }
    }

    createCurupiraSigns ()
    {
        const signs = this.add.graphics().setDepth(10);
        signs.fillStyle(0x7c684c, 0.8);
        [[2110,632,-1],[2160,620,1],[2210,635,-1],[2260,622,1]].forEach(([x,y,d]) => {
            signs.fillEllipse(x, y, 18, 9);
            signs.fillCircle(x - d * 7, y - 6, 4);
            signs.fillCircle(x - d * 1, y - 8, 3);
            signs.fillCircle(x + d * 5, y - 6, 3);
        });

        signs.lineStyle(4, 0xb47b4c, 0.72);
        [[2360,470,2400,430],[2410,455,2455,415]].forEach(([x1,y1,x2,y2]) => {
            signs.beginPath();
            signs.moveTo(x1,y1);
            signs.lineTo(x2,y2);
            signs.strokePath();
        });

        this.signLeaves = [
            this.add.ellipse(2320, 520, 16, 7, 0x39643c, 0.75).setDepth(9),
            this.add.ellipse(2350, 500, 14, 6, 0x447246, 0.72).setDepth(9),
            this.add.ellipse(2390, 530, 18, 7, 0x315a37, 0.72).setDepth(9)
        ];
        this.signLeaves.forEach((leaf, index) => {
            this.tweens.add({
                targets: leaf,
                x: leaf.x + 12 + index * 3,
                y: leaf.y - 5,
                angle: 18 + index * 12,
                duration: 700 + index * 120,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut'
            });
        });

        this.curupiraHint = this.add.ellipse(2480, 500, 34, 62, 0x190c08, 0.55).setDepth(7);
        this.tweens.add({
            targets: this.curupiraHint,
            alpha: { from: 0.1, to: 0.58 },
            x: 2515,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
    }

    createPlayerVisual ()
    {
        const container=this.add.container(this.player.x,this.player.y).setDepth(20);

        const silhouette=this.add.ellipse(0,-3,37,65,0x07100c,.11);

        // Jamanxim de palha atrás dos ombros; o container conserva o balanço já existente.
        const bag=this.add.container(-13,-8);
        const bagBody=this.add.ellipse(-3,3,29,39,0x8d6740,.98);
        const bagShade=this.add.ellipse(-9,5,13,32,0x493827,.44);
        const bagFold=this.add.ellipse(-3,-16,25,7,0xb08958,.95);
        const bagTie=this.add.rectangle(0,-19,12,3,0x58412b,.9).setAngle(-5);
        const bagWeave=this.add.graphics();
        bagWeave.lineStyle(1,0x4d3927,.56);
        for(let y=-12;y<=18;y+=5){bagWeave.beginPath();bagWeave.moveTo(-15,y);bagWeave.lineTo(9,y+2);bagWeave.strokePath();}
        bagWeave.lineStyle(1,0xd1a877,.45);
        for(let x=-12;x<=7;x+=6){bagWeave.beginPath();bagWeave.moveTo(x,-13);bagWeave.lineTo(x+2,19);bagWeave.strokePath();}
        const bagStrap=this.add.graphics();
        bagStrap.lineStyle(3,0x61432c,.95);
        bagStrap.beginPath();bagStrap.moveTo(-5,-18);bagStrap.lineTo(9,11);bagStrap.strokePath();
        bagStrap.lineStyle(1,0xc09b68,.68);
        bagStrap.beginPath();bagStrap.moveTo(-3,-16);bagStrap.lineTo(10,10);bagStrap.strokePath();
        bag.add([bagBody,bagShade,bagWeave,bagFold,bagTie,bagStrap]);

        const leftLeg=this.add.container(-7,9);
        const leftThigh=this.add.rectangle(0,0,10,17,0x2b2c24).setOrigin(.5,.08);
        const leftKnee=this.add.circle(0,15,4.5,0x24251f);
        const leftLowerLeg=this.add.container(0,15);
        const leftShin=this.add.rectangle(0,2,9,15,0x24251f).setOrigin(.5,.08);
        const leftBoot=this.add.rectangle(2,16,12,9,0x2b211b).setOrigin(.5,.5);
        const leftSole=this.add.rectangle(3,20,13,3,0x151311).setOrigin(.5,.5);
        leftLowerLeg.add([leftShin,leftBoot,leftSole]);
        leftLeg.add([leftThigh,leftKnee,leftLowerLeg]);

        const rightLeg=this.add.container(7,9);
        const rightThigh=this.add.rectangle(0,0,10,17,0x303127).setOrigin(.5,.08);
        const rightKnee=this.add.circle(0,15,4.5,0x282921);
        const rightLowerLeg=this.add.container(0,15);
        const rightShin=this.add.rectangle(0,2,9,15,0x282921).setOrigin(.5,.08);
        const rightBoot=this.add.rectangle(2,16,12,9,0x2d231c).setOrigin(.5,.5);
        const rightSole=this.add.rectangle(3,20,13,3,0x151311).setOrigin(.5,.5);
        rightLowerLeg.add([rightShin,rightBoot,rightSole]);
        rightLeg.add([rightThigh,rightKnee,rightLowerLeg]);

        const torso=this.add.container(0,-7);
        const shirtBody=this.add.rectangle(0,0,29,31,0xd8c397).setOrigin(.5);
        const shirtShade=this.add.rectangle(-8,1,7,27,0xb8a275,.3).setOrigin(.5);
        const shoulderLeft=this.add.ellipse(-13,-10,10,9,0xd8c397);
        const shoulderRight=this.add.ellipse(13,-10,10,9,0xd8c397);
        const collarLeft=this.add.triangle(-4,-12,-5,-3,1,-3,4,5,0xeee0ba,.72);
        const collarRight=this.add.triangle(4,-12,-4,-3,2,-3,5,5,0xb6a076,.64);
        const shirtFold=this.add.rectangle(5,4,2,20,0x8f754f,.28).setAngle(2);
        const waist=this.add.rectangle(0,15,28,4,0x514333,.6);
        torso.add([shirtBody,shirtShade,shoulderLeft,shoulderRight,collarLeft,collarRight,shirtFold,waist]);

        // Braço livre: pivô afastado do torso para evitar cruzamento no ar.
        const leftArm=this.add.container(-15,-15);
        const leftSleeve=this.add.rectangle(0,1,10,11,0xd4bb8e).setOrigin(.5,.12);
        const leftUpperArm=this.add.rectangle(0,9,8,13,0xd4bb8e).setOrigin(.5,.05);
        const leftElbow=this.add.circle(0,20,4,0xcab083);
        const leftForearm=this.add.container(0,20);
        const leftForearmShape=this.add.rectangle(0,2,8,13,0xd4bb8e).setOrigin(.5,.08);
        const leftHand=this.add.circle(0,15,4,0xb98155);
        leftForearm.add([leftForearmShape,leftHand]);
        leftArm.add([leftSleeve,leftUpperArm,leftElbow,leftForearm]);

        // Braço principal do facão: leitura limpa e facão à frente do corpo.
        const rightArmRig=this.add.container(15,-15);
        const rightSleeve=this.add.rectangle(0,1,10,11,0xd4bb8e).setOrigin(.5,.12);
        const rightArm=this.add.rectangle(0,9,8,13,0xd4bb8e).setOrigin(.5,.05);
        const rightElbow=this.add.circle(0,20,4,0xcab083);
        const rightForearm=this.add.container(0,20);
        const rightForearmShape=this.add.rectangle(0,2,8,13,0xd4bb8e).setOrigin(.5,.08);
        const rightHand=this.add.circle(0,15,4,0xb98155);

        const machete=this.add.container(3,17);
        const macheteHandle=this.add.rectangle(0,0,5,14,0x3a2a1d).setOrigin(.5);
        const macheteGuard=this.add.rectangle(0,-8,10,3,0x665846,.9);
        const macheteBlade=this.add.rectangle(1,-22,7,25,0xb8c0ba).setAngle(-3);
        const macheteHighlight=this.add.rectangle(-1,-22,1.5,19,0xe4e8e3,.55).setAngle(-3);
        const macheteTip=this.add.triangle(2,-36,-3,0,4,0,1,-7,0xcbd1cc).setOrigin(.5,1);
        machete.add([macheteHandle,macheteGuard,macheteBlade,macheteHighlight,macheteTip]);
        machete.setAngle(145);
        rightForearm.add([rightForearmShape,rightHand]);
        rightArmRig.add([rightSleeve,rightArm,rightElbow,rightForearm]);

        const head=this.add.container(0,-33);
        const hair=this.add.ellipse(-2,-8,17,7,0x2d241d,.88);
        const face=this.add.ellipse(0,0,19,23,0xb98155);
        const faceShade=this.add.ellipse(-5,2,7,17,0x8f6045,.26);
        const nose=this.add.triangle(9,1,-2,-3,4,0,0,4,0xc48d64,.82);
        const beard=this.add.ellipse(1,8,14,9,0x3c2b20,.9);
        const chin=this.add.ellipse(5,7,5,4,0xb98155);
        const eye=this.add.circle(6,-3,1.1,0x251c17);
        const neck=this.add.rectangle(0,12,8,6,0xa86f4c);
        head.add([neck,hair,face,faceShade,beard,chin,nose,eye]);

        // Chapéu e poronga formam um conjunto único: clamp preso à faixa, haste e lampião.
        const hat=this.add.container(0,-47);
        const hatShadow=this.add.ellipse(1,3,35,8,0x2d251c,.42);
        const hatBrim=this.add.ellipse(0,0,43,9,0x9b7746);
        const hatBrimEdge=this.add.ellipse(0,2,42,3,0x5e452c,.83);
        const hatCrown=this.add.ellipse(-1,-7,26,16,0xb08a51);
        const hatBand=this.add.rectangle(-1,-3,25,3,0x55402a,.85);
        const hatTop=this.add.ellipse(-2,-13,20,5,0xc39e61,.8);
        const straw=this.add.graphics();
        straw.lineStyle(1,0xe4bd7b,.63);
        for(let x=-10;x<=10;x+=5){straw.beginPath();straw.moveTo(x,-12);straw.lineTo(x+3,-5);straw.strokePath();}
        straw.beginPath();straw.moveTo(-19,-1);straw.lineTo(-13,-2);straw.moveTo(14,-2);straw.lineTo(20,-1);straw.strokePath();

        const poronga=this.add.container(12,-3);
        const porongaBracket=this.add.graphics();
        porongaBracket.lineStyle(3,0x3c3025,.95);
        porongaBracket.beginPath();porongaBracket.moveTo(-8,0);porongaBracket.lineTo(-2,0);porongaBracket.lineTo(1,4);porongaBracket.strokePath();
        porongaBracket.lineStyle(2,0x766047,.8);
        porongaBracket.beginPath();porongaBracket.moveTo(-7,-2);porongaBracket.lineTo(-1,-2);porongaBracket.strokePath();
        const porongaClamp=this.add.rectangle(-6,-1,5,5,0x4b3c2d,.95).setAngle(-5);
        const porongaFrame=this.add.rectangle(2,4,5,9,0x665440,.92).setAngle(3);
        const porongaGlow=this.add.circle(5,5,6,0xe7a84d,.09);
        const porongaLamp=this.add.ellipse(5,5,7,6,0xe0a249,.9);
        const porongaCore=this.add.circle(6,5,2,0xffd88a,.86);
        const flame=this.add.triangle(6,-2,-2,4,0,-3,2,4,0xffd485,.87);
        const flameCore=this.add.circle(6,0,1.2,0xfff1b0,.9);
        poronga.add([porongaGlow,porongaBracket,porongaClamp,porongaFrame,porongaLamp,porongaCore,flame,flameCore]);
        hat.add([hatShadow,hatBrim,hatBrimEdge,hatCrown,hatBand,hatTop,straw,poronga]);

        const sheathLoop=this.add.ellipse(25,17,9,6,0x453322,.95).setAngle(-35);
        const sheathSleeve=this.add.rectangle(31,26,11,27,0x493a29,.98).setAngle(-35);
        const sheathRim=this.add.rectangle(24,16,12,4,0x725339,.98).setAngle(-35);
        container.add([silhouette,bag,leftLeg,rightLeg,torso,sheathLoop,leftArm,rightArmRig,head,hat,machete,sheathSleeve,sheathRim]);
        machete.setPosition(25,17).setScale(.55);

        // Poses locais: repouso, busca, início do saque, guarda baixa,
        // preparação, corte, continuação, recuperação e retorno à bainha.
        container.attackPoseFrames=[
            {time:0,arm:-8,forearm:-4,shoulderX:15,shoulderY:-15,blade:145,torso:0,freeArm:8,freeForearm:3,bag:0},
            {time:30,arm:-20,forearm:-4,shoulderX:15,shoulderY:-15,blade:145,torso:-1,freeArm:14,freeForearm:2,bag:-1},
            {time:60,arm:-35,forearm:-8,shoulderX:16,shoulderY:-15,blade:135,torso:-2,freeArm:18,freeForearm:0,bag:-2},
            {time:90,arm:-45,forearm:-8,shoulderX:16,shoulderY:-15,blade:115,torso:-2,freeArm:19,freeForearm:-2,bag:-2},
            {time:125,arm:-50,forearm:-5,shoulderX:15,shoulderY:-16,blade:-30,torso:-6,freeArm:25,freeForearm:-5,bag:-4},
            {time:175,arm:-70,forearm:3,shoulderX:17,shoulderY:-14,blade:90,torso:7,freeArm:28,freeForearm:2,bag:2},
            {time:210,arm:-55,forearm:2,shoulderX:17,shoulderY:-14,blade:110,torso:6,freeArm:25,freeForearm:2,bag:2},
            {time:245,arm:-35,forearm:-4,shoulderX:16,shoulderY:-15,blade:125,torso:2,freeArm:16,freeForearm:1,bag:1},
            {time:265,arm:-32,forearm:-4,shoulderX:15,shoulderY:-15,blade:125,torso:0,freeArm:13,freeForearm:2,bag:0},
            {time:300,arm:-8,forearm:-4,shoulderX:15,shoulderY:-15,blade:145,torso:0,freeArm:8,freeForearm:3,bag:0}
        ];

        container.parts={
            silhouette,bag,bagBody,torso,shirtBody,head,hat,poronga,porongaGlow,
            leftArm,leftForearm,rightArmRig,rightArm,rightForearm,machete,sheathLoop,sheathSleeve,sheathRim,macheteGripAngle:18,
            leftLeg,leftLowerLeg,rightLeg,rightLowerLeg,leftBoot,rightBoot
        };
        container.animationState='IDLE';
        container.facing=1;
        return container;
    }

    updateMacheteVisual (time)
    {
        const visual=this.playerVisual;
        const parts=visual.parts;
        const machete=parts.machete;
        const walk=visual.animationState==='WALK'?Math.sin(time*.011)*.3:0;
        const hipX=25+walk,hipY=17+walk*.25;
        if(!this.isAttacking){
            if(visual.weaponDrawn){visual.bringToTop(parts.sheathSleeve);visual.bringToTop(parts.sheathRim);visual.weaponDrawn=false;}
            parts.rightArmRig.setPosition(15,-15);
            machete.setPosition(hipX,hipY).setAngle(145).setScale(.55);
            return;
        }

        const elapsed=Math.max(0,Math.min(300,time-this.attackStartedAt));
        const frames=visual.attackPoseFrames;
        let index=0;
        while(index<frames.length-2&&elapsed>frames[index+1].time)index++;
        const from=frames[index],to=frames[index+1];
        let t=(elapsed-from.time)/(to.time-from.time);
        t=Math.max(0,Math.min(1,t));
        t=t*t*(3-2*t);
        const mix=(a,b)=>a+(b-a)*t;
        const restingArm=this.playerBaseRightArmAngle??-8;
        const arm=mix(from.time===0?Math.min(-8,restingArm):from.arm,to.time===300?restingArm:to.arm);
        const forearm=mix(from.forearm,to.forearm);
        const shoulderX=mix(from.shoulderX,to.shoulderX);
        const shoulderY=mix(from.shoulderY,to.shoulderY);
        parts.rightArmRig.setPosition(shoulderX,shoulderY).setAngle(arm);
        parts.rightForearm.angle=forearm;
        parts.leftArm.angle=mix(from.freeArm,to.freeArm);
        parts.leftForearm.angle=mix(from.freeForearm,to.freeForearm);
        parts.torso.angle=(this.playerBaseTorsoAngle??0)+mix(from.torso,to.torso);
        parts.bag.angle=-3+mix(from.bag,to.bag);

        const upper=arm*Math.PI/180;
        const lower=(arm+forearm)*Math.PI/180;
        // A arma tem pivô no cabo: sua origem coincide com a mão do rig.
        const handX=shoulderX-20*Math.sin(upper)-15*Math.sin(lower);
        const handY=shoulderY+20*Math.cos(upper)+15*Math.cos(lower);
        const smooth=value=>{value=Math.max(0,Math.min(1,value));return value*value*(3-2*value);};
        // No saque e no retorno, a mão já está no cabo junto à bainha.
        // O próprio braço leva ambos pelo lado externo da silhueta.
        const held=smooth((elapsed-30)/15)*(1-smooth((elapsed-285)/15));
        // A bainha cobre a lâmina apenas em repouso; o mesmo terçado passa à frente no saque.
        const drawn=elapsed>=45&&elapsed<285;
        if(drawn!==visual.weaponDrawn){
            if(drawn)visual.bringToTop(machete);
            else{visual.bringToTop(parts.sheathSleeve);visual.bringToTop(parts.sheathRim);}
            visual.weaponDrawn=drawn;
        }
        machete.x=hipX+(handX-hipX)*held;
        machete.y=hipY+(handY-hipY)*held;
        machete.angle=mix(from.blade,to.blade);
        machete.setScale(.55+.45*smooth((elapsed-30)/60)*(1-smooth((elapsed-265)/35)));
    }

    updateAttackSprite (time)
    {
        const active=this.isAttacking;
        this.playerVisual.setVisible(false);
        this.attackSprite.setVisible(true);
        // A mesma âncora acompanha o corpo em todos os estados, sem compensação por frame.
        this.attackSprite.setPosition(this.playerVisual.x,this.playerVisual.y+45);
        const body=this.player.body;
        const grounded=body.blocked.down||body.touching.down;
        if(!grounded)
        {
            this.wasAirborneVisual=true;
            this.landingVisualStartedAt=null;
        }
        else if(this.wasAirborneVisual===true)
        {
            this.wasAirborneVisual=false;
            this.landingVisualStartedAt=time;
        }
        const landingElapsed=this.landingVisualStartedAt===null?Infinity:Math.max(0,time-this.landingVisualStartedAt);
        const landing=grounded&&landingElapsed<180;
        if(!active)
        {
            const blockedHorizontally=(body.velocity.x<0&&body.blocked.left)||(body.velocity.x>0&&body.blocked.right);
            const walking=grounded&&Math.abs(body.velocity.x)>1&&!blockedHorizontally&&!this.isPlayerDead&&!this.phaseCompleted&&this.isDashing!==true&&time>=this.knockbackUntil;
            const idle=grounded&&Math.abs(body.velocity.x)<1&&Math.abs(body.velocity.y)<1;
            if(this.isDashing===true)
            {
                this.idleVisualStartedAt=null;
                if(this.attackSprite.texture.key!=='seringueiroDash')this.attackSprite.setTexture('seringueiroDash',0);
                // Cinco poses distribuídas proporcionalmente na duração funcional já existente do dash.
                const dashDuration=this.dashDuration||190;
                const dashRemaining=Math.max(0,(this.dashEndsAt??time)-time);
                const dashElapsed=Math.max(0,dashDuration-dashRemaining);
                this.attackSprite.setFrame(Math.min(4,Math.floor((dashElapsed/dashDuration)*5)));
            }
            else if(landing)
            {
                this.idleVisualStartedAt=null;
                if(this.attackSprite.texture.key!=='seringueiroLanding')this.attackSprite.setTexture('seringueiroLanding',0);
                // Impacto e recuperação: uma única passagem visual, sem loop e sem alterar a física.
                this.attackSprite.setFrame(landingElapsed<90?0:1);
            }
            else if(walking)
            {
                this.idleVisualStartedAt=null;
                if(this.attackSprite.texture.key!=='seringueiroWalk')this.attackSprite.setTexture('seringueiroWalk',0);
                // Caminhada definitiva a 10 FPS: 0 → 1 → 2 → 3 → 4 → 5 → 0.
                this.attackSprite.setFrame(Math.floor(time/100)%6);
            }
            else if(idle)
            {
                if(this.idleVisualStartedAt===null)this.idleVisualStartedAt=time;
                if(this.attackSprite.texture.key!=='seringueiroIdle')this.attackSprite.setTexture('seringueiroIdle',0);
                // Idle definitiva a ~6,7 FPS, sem reiniciar enquanto permanece parado.
                this.attackSprite.setFrame(Math.floor(Math.max(0,time-this.idleVisualStartedAt)/150)%8);
            }
            else if(!grounded)
            {
                this.idleVisualStartedAt=null;
                if(this.attackSprite.texture.key!=='seringueiroJump')this.attackSprite.setTexture('seringueiroJump',0);
                // A física continua controlando a altura; a velocidade vertical escolhe apenas a pose visual.
                const velocityY=body.velocity.y;
                let jumpFrame=3;
                if(velocityY<0)
                {
                    if(velocityY<=-400)jumpFrame=0;
                    else if(velocityY<=-300)jumpFrame=1;
                    else if(velocityY<=-200)jumpFrame=2;
                    else if(velocityY<=-100)jumpFrame=3;
                }
                // Próximo do ápice e durante a descida, mantém temporariamente o frame 3.
                this.attackSprite.setFrame(jumpFrame);
            }
            else
            {
                this.idleVisualStartedAt=null;
                if(this.attackSprite.texture.key!=='seringueiroAttack')this.attackSprite.setTexture('seringueiroAttack',0);
                this.attackSprite.setFrame(0);
            }
            this.attackSprite.setFlipX(this.isDashing===true?(this.dashDirection??this.playerVisual.facing)<0:this.playerVisual.facing<0);
            return;
        }

        this.idleVisualStartedAt=null;
        if(this.attackSprite.texture.key!=='seringueiroAttack')this.attackSprite.setTexture('seringueiroAttack',0);
        // Os doze quadros seguem o mesmo relógio funcional do ataque (300 ms).
        const elapsed=Math.max(0,time-this.attackStartedAt);
        const starts=[0,25,50,75,100,125,150,175,200,225,250,275];
        let frame=starts.length-1;
        while(frame>0&&elapsed<starts[frame])frame--;
        this.attackSprite.setFrame(frame);
        this.attackSprite.setFlipX(this.attackDirection<0);
    }

    syncPlayerVisual ()
    {
        this.playerVisual.setPosition(this.player.x, this.player.y);
    }

    animatePlayerVisual (time)
    {
        const visual=this.playerVisual;
        const parts=visual.parts;
        const body=this.player.body;
        const velocityX=body.velocity.x;
        const velocityY=body.velocity.y;
        const grounded=body.blocked.down||body.touching.down;
        const moving=Math.abs(velocityX)>1;
        const dashActive=this.isDashing===true&&!this.dashLandingVisual;

        let state='IDLE';
        if(dashActive)state='DASH';
        else if(!grounded)state=velocityY<0?'JUMP':'FALL';
        else if(moving)state='WALK';
        visual.animationState=state;

        if(velocityX>1)visual.facing=1;
        else if(velocityX<-1)visual.facing=-1;

        visual.setScale(visual.facing*this.motionFx.scaleX,this.motionFx.scaleY);

        const seconds=time*.001;
        const lerp=(current,target,amount=.2)=>current+(target-current)*amount;

        let bodyOffsetY=0,torsoAngle=0,torsoY=-7,headY=-33,headAngle=0,hatY=-47,hatAngle=0,porongaAngle=0;
        let bagX=-13,bagY=-8,bagAngle=-3,bagScaleX=1,bagScaleY=1;
        let leftArmAngle=8,leftForearmAngle=3,rightArmAngle=-8,rightForearmAngle=-4;
        let leftLegAngle=0,rightLegAngle=0,leftLowerLegAngle=0,rightLowerLegAngle=0,leftLegY=9,rightLegY=9;
        let macheteAngle=18;

        if(state==='IDLE'){
            const breath=Math.sin(seconds*2.05);
            const slow=Math.sin(seconds*1.3);
            bodyOffsetY=breath*.42;
            torsoY=-7+breath*.5;
            headY=-33+breath*.28;
            hatY=-47+breath*.28;
            hatAngle=slow*.45;
            porongaAngle=-slow*.18;
            leftArmAngle=8+slow*1.2;
            rightArmAngle=-8-slow*1.1;
            leftForearmAngle=3-slow*.5;
            rightForearmAngle=-4+slow*.5;
            bagY=-8+Math.sin(seconds*1.48-.55)*.45;
            bagAngle=-3+Math.sin(seconds*1.2-.75)*.8;
        }
        else if(state==='WALK'){
            const speedRatio=Math.min(Math.abs(velocityX)/260,1);
            const phase=seconds*(7+speedRatio*4);
            const swing=Math.sin(phase);
            const delayed=Math.sin(phase-.72);
            const bounce=Math.abs(Math.sin(phase*2))*1.15;

            bodyOffsetY=-bounce;
            torsoY=-7-bounce*.35;
            torsoAngle=swing*.95;
            headY=-33-bounce*.24;
            headAngle=-swing*.5;
            hatY=-47-bounce*.2;
            hatAngle=swing*.85;
            porongaAngle=-swing*.38;

            leftLegAngle=swing*22;
            rightLegAngle=-swing*22;
            leftLowerLegAngle=Math.max(0,-swing)*17-Math.max(0,swing)*4;
            rightLowerLegAngle=Math.max(0,swing)*17-Math.max(0,-swing)*4;

            leftArmAngle=8-swing*15;
            rightArmAngle=-8+swing*15;
            leftForearmAngle=3+swing*4;
            rightForearmAngle=-4-swing*4;

            bagX=-13-Math.abs(delayed)*.6;
            bagY=-8+bounce*.18;
            bagAngle=-3-delayed*2.4;
            macheteAngle=18+swing*1.1;
        }
        else if(state==='JUMP'){
            const doubleJump=this.jumpsUsed>=2;
            bodyOffsetY=-1;
            torsoY=doubleJump?-9:-8;
            torsoAngle=doubleJump?-4:-2.5;
            headY=doubleJump?-35:-34;
            headAngle=-.6;
            hatY=doubleJump?-49:-48;
            hatAngle=doubleJump?-2.6:-1.5;
            porongaAngle=.45;

            // Braços abrem para fora do torso: não se cruzam no ar.
            leftArmAngle=doubleJump?27:22;
            rightArmAngle=doubleJump?-28:-23;
            leftForearmAngle=doubleJump?-7:-4;
            rightForearmAngle=doubleJump?7:4;

            leftLegAngle=doubleJump?17:12;
            rightLegAngle=doubleJump?-17:-12;
            leftLowerLegAngle=doubleJump?18:12;
            rightLowerLegAngle=doubleJump?-10:-7;
            leftLegY=7;rightLegY=7;

            bagX=-13.5;
            bagY=doubleJump?-5.2:-5.8;
            bagAngle=doubleJump?5.5:3.5;
            macheteAngle=doubleJump?15:17;
        }
        else if(state==='FALL'){
            const fast=this.fastFallActive===true;
            bodyOffsetY=fast?.9:1.3;
            torsoY=fast?-6:-5;
            torsoAngle=fast?1:4.5;
            headY=fast?-33:-32;
            headAngle=fast?0:-1;
            hatY=fast?-46:-45;
            hatAngle=fast?.8:2.8;
            porongaAngle=fast?-.2:-.7;

            leftArmAngle=fast?18:28;
            rightArmAngle=fast?-19:-27;
            leftForearmAngle=fast?-3:-8;
            rightForearmAngle=fast?3:8;

            leftLegAngle=fast?-7:-20;
            rightLegAngle=fast?7:18;
            leftLowerLegAngle=fast?2:9;
            rightLowerLegAngle=fast?-2:-7;
            leftLegY=fast?10:12;
            rightLegY=fast?10:11;

            bagX=-13.5;
            bagY=fast?-5:-5.7;
            bagAngle=fast?.5:-5.5;
            bagScaleX=fast?1.02:1;
            bagScaleY=fast?.97:1;
            macheteAngle=fast?21:26;
        }
        else if(state==='DASH'){
            bodyOffsetY=0;
            torsoY=-7;
            torsoAngle=-12;
            headY=-34;
            headAngle=-1.5;
            hatY=-47;
            hatAngle=-5;
            porongaAngle=.7;

            leftArmAngle=24;
            rightArmAngle=-38;
            leftForearmAngle=-5;
            rightForearmAngle=-10;

            leftLegAngle=22;
            rightLegAngle=-25;
            leftLowerLegAngle=8;
            rightLowerLegAngle=-12;
            leftLegY=8;rightLegY=7;

            bagX=-14;
            bagY=-6.2;
            bagAngle=7;
            bagScaleX=1.03;
            bagScaleY=.98;
            macheteAngle=8;
        }

        const landingCompression=grounded&&this.motionFx.scaleY<.975;
        if(landingCompression){
            const strength=Math.min(1,(1-this.motionFx.scaleY)/.14);
            torsoY+=2.1*strength;
            torsoAngle+=2.2*strength;
            leftLegAngle-=8*strength;
            rightLegAngle+=8*strength;
            leftLowerLegAngle+=18*strength;
            rightLowerLegAngle+=18*strength;
            leftArmAngle+=7*strength;
            rightArmAngle-=6*strength;
            bagY+=2*strength;
            bagAngle+=4.5*strength;
            hatY+=1*strength;
            porongaAngle-=.6*strength;
        }

        // Reação visual acompanha o ataque funcional sem mudar janela, hitbox ou dano.
        if(this.isAttacking){
            const elapsed=Math.max(0,time-this.attackStartedAt);
            if(elapsed<70){
                const t=elapsed/70;
                leftArmAngle=10+10*t;
                leftForearmAngle=2-5*t;
                rightForearmAngle=-4-21*t;
                bagX=-13.5;
                bagAngle=-3-2*t;
                headAngle=-.5*t;
                hatAngle-=.45*t;
                porongaAngle+=.15*t;
            }else if(elapsed<=210){
                const swing=Math.sin(((elapsed-70)/140)*Math.PI);
                rightForearmAngle=elapsed<90?-25+21*((elapsed-70)/20):-4;
                leftArmAngle=20+7*swing;
                leftForearmAngle=-3+3*swing;
                rightForearmAngle=-16+8*swing;
                bagX=-13.5-1.2*swing;
                bagAngle=-5+6*swing;
                headAngle=1.1*swing;
                hatAngle+=.8*swing;
                porongaAngle-=.25*swing;
            }else{
                const recovery=Math.min(1,(elapsed-210)/90);
                leftArmAngle=20-(12*recovery);
                leftForearmAngle=-3+(6*recovery);
                rightForearmAngle=-8+(4*recovery);
                bagAngle=1*(1-recovery)-3*recovery;
            }
        }

        torsoAngle+=this.directionFx.lean;
        visual.y=this.player.y+bodyOffsetY;

        parts.torso.y=lerp(parts.torso.y,torsoY,.22);
        parts.torso.angle=lerp(parts.torso.angle,torsoAngle,.22);
        parts.head.y=lerp(parts.head.y,headY,.22);
        parts.head.angle=lerp(parts.head.angle,headAngle,.2);
        parts.hat.y=lerp(parts.hat.y,hatY,.22);
        parts.hat.angle=lerp(parts.hat.angle,hatAngle,.2);
        parts.poronga.angle=lerp(parts.poronga.angle,porongaAngle,.16);

        parts.bag.x=lerp(parts.bag.x,bagX,.16);
        parts.bag.y=lerp(parts.bag.y,bagY,.16);
        parts.bag.angle=lerp(parts.bag.angle,bagAngle,.15);
        parts.bag.scaleX=lerp(parts.bag.scaleX,bagScaleX,.15);
        parts.bag.scaleY=lerp(parts.bag.scaleY,bagScaleY,.15);

        parts.leftArm.angle=lerp(parts.leftArm.angle,leftArmAngle,.24);
        parts.leftForearm.angle=lerp(parts.leftForearm.angle,leftForearmAngle,.24);
        parts.rightArmRig.angle=lerp(parts.rightArmRig.angle,rightArmAngle,.24);
        parts.rightForearm.angle=lerp(parts.rightForearm.angle,rightForearmAngle,.24);

        parts.leftLeg.angle=lerp(parts.leftLeg.angle,leftLegAngle,.26);
        parts.rightLeg.angle=lerp(parts.rightLeg.angle,rightLegAngle,.26);
        parts.leftLowerLeg.angle=lerp(parts.leftLowerLeg.angle,leftLowerLegAngle,.24);
        parts.rightLowerLeg.angle=lerp(parts.rightLowerLeg.angle,rightLowerLegAngle,.24);
        parts.leftLeg.y=lerp(parts.leftLeg.y,leftLegY,.24);
        parts.rightLeg.y=lerp(parts.rightLeg.y,rightLegY,.24);

        parts.macheteGripAngle=macheteAngle;
        this.playerBaseRightArmAngle=rightArmAngle;
        this.playerBaseTorsoAngle=torsoAngle;
    }

    createAttackHitbox ()
    {
        this.attackHitbox = this.add.rectangle(-100, -100, 54, 46, 0x000000, 0);
        this.physics.add.existing(this.attackHitbox);
        this.attackHitbox.body.setAllowGravity(false);
        this.attackHitbox.body.enable = false;

        this.physics.add.overlap(this.attackHitbox, this.snake, () => this.tryHitSnake());
        this.physics.add.overlap(this.attackHitbox, this.carapana, () => this.tryHitCarapana());
        this.physics.add.overlap(this.attackHitbox, this.curupira, () => this.tryHitCurupira());
    }

    queueAttackInput ()
    {
        const now=this.time.now;
        if(this.phaseCompleted||this.isPlayerDead)return;

        if(!this.isAttacking&&now>=this.nextAttackAt){
            this.startAttack();
            return;
        }

        const remaining=this.nextAttackAt-now;
        if(remaining>0&&remaining<=this.attackBufferMs){
            this.attackBufferUntil=this.nextAttackAt+60;
        }
    }

    showMacheteArc (direction,variant)
    {
        const angles=variant===0?[-36,-18,2]:[-15,0,14];
        for(let i=0;i<3;i++){
            const x=this.player.x+direction*(28+i*9);
            const y=this.player.y+(variant===0?-24+i*10:-12+i*5);
            const segment=this.add.rectangle(
                x,y,26-i*3,3,
                i===1?0xdce2df:0xbfc9c5,
                .3-i*.045
            ).setDepth(24).setAngle(direction*angles[i]);

            this.tweens.add({
                targets:segment,
                x:segment.x+direction*(8+i*2),
                alpha:0,
                scaleX:1.15,
                duration:115+i*12,
                ease:'Quad.Out',
                onComplete:()=>segment.destroy()
            });
        }
    }

    showCombatImpact (x,y,visual,options={})
    {
        const small=options.small===true;
        const boss=options.boss===true;
        const heavy=options.heavy===true;
        const final=options.final===true;
        const count=final?6:boss?5:small?3:heavy?5:4;
        const flash=this.add.circle(
            x,y,
            final?22:boss?18:small?10:14,
            0xf2ead4,
            final?.48:boss?.38:small?.28:.34
        ).setDepth(30);

        this.tweens.add({
            targets:flash,
            scale:final?2.3:1.8,
            alpha:0,
            duration:final?150:120,
            onComplete:()=>flash.destroy()
        });

        for(let i=0;i<count;i++){
            const angle=(-.8+(1.6*i/Math.max(1,count-1)))+(this.attackDirection<0?Math.PI:0);
            const particle=this.add.rectangle(
                x,y,
                small?5:6+(i%2)*2,
                2,
                i%2?0xd8d0b7:0x8ea06b,
                .72
            ).setDepth(30).setAngle(angle*57.2958);

            const distance=(small?16:24)+(i%3)*6+(final?8:0);
            this.tweens.add({
                targets:particle,
                x:x+Math.cos(angle)*distance,
                y:y+Math.sin(angle)*distance,
                alpha:0,
                angle:particle.angle+(i%2?55:-55),
                duration:(small?145:185)+i*10,
                onComplete:()=>particle.destroy()
            });
        }

        if(visual&&visual.parts&&visual.parts.head){
            const head=visual.parts.head;
            const baseX=head.x;
            const recoil=(boss?3:small?2.5:heavy?6:4.5)*this.attackDirection;
            this.tweens.killTweensOf(head);
            this.tweens.add({
                targets:head,
                x:baseX+recoil,
                duration:42,
                yoyo:true,
                ease:'Quad.Out',
                onComplete:()=>{head.x=baseX;}
            });
        }

        const shakeDuration=final?68:boss?56:small?36:heavy?52:46;
        const shakeIntensity=final?.0021:boss?.00155:small?.0007:heavy?.00125:.001;
        this.cameras.main.shake(shakeDuration,shakeIntensity);
    }

    showBlockDeflect (x,y,heavy=false)
    {
        const ring=this.add.circle(x,y,heavy?12:9,0xe7e1cf,.06).setDepth(30);
        ring.setStrokeStyle(2,heavy?0xd6b56c:0xcbd8cf,.58);
        this.tweens.add({
            targets:ring,
            scale:heavy?1.7:1.45,
            alpha:0,
            duration:150,
            onComplete:()=>ring.destroy()
        });

        for(let i=0;i<3;i++){
            const spark=this.add.rectangle(
                x+this.attackDirection*(i*3),
                y+(i-1)*5,
                heavy?10:7,
                2,
                0xe5d4a8,
                .62
            ).setDepth(31).setAngle(this.attackDirection*(-35+i*35));

            this.tweens.add({
                targets:spark,
                x:spark.x-this.attackDirection*(8+i*3),
                y:spark.y+(i-1)*6,
                alpha:0,
                duration:110+i*18,
                onComplete:()=>spark.destroy()
            });
        }
    }

    resetCombatPolishState ()
    {
        this.isAttacking=false;
        this.attackBufferUntil=0;
        this.attackArcShown=false;

        if(this.attackHitbox&&this.attackHitbox.body){
            this.attackHitbox.body.enable=false;
        }

        if(this.playerVisual&&this.playerVisual.parts){
            this.playerVisual.parts.macheteGripAngle=18;this.playerVisual.parts.machete.setPosition(25,17).setAngle(145).setScale(.55);
        }

        if('attackHitRegistered' in this)this.attackHitRegistered=false;
        if('attackHitSnakeRegistered' in this)this.attackHitSnakeRegistered=false;
        if('attackHitCarapanaRegistered' in this)this.attackHitCarapanaRegistered=false;
        if('attackHitCurupiraRegistered' in this)this.attackHitCurupiraRegistered=false;
        if('attackBlockCurupiraRegistered' in this)this.attackBlockCurupiraRegistered=false;
        if('attackHitBossRegistered' in this)this.attackHitBossRegistered=false;
    }

    startAttack ()
    {
        const now=this.time.now;
        if(this.phaseCompleted||this.isPlayerDead||this.isAttacking||now<this.nextAttackAt)return false;

        this.isAttacking=true;
        this.attackStartedAt=now;
        this.nextAttackAt=now+400;
        this.attackDirection=this.playerVisual.facing||1;
        this.attackBufferUntil=0;
        this.attackArcShown=false;
        this.attackVisualVariant=(this.attackVisualVariant+1)%2;

        if('attackHitRegistered' in this)this.attackHitRegistered=false;
        if('attackHitSnakeRegistered' in this)this.attackHitSnakeRegistered=false;
        if('attackHitCarapanaRegistered' in this)this.attackHitCarapanaRegistered=false;
        if('attackHitCurupiraRegistered' in this)this.attackHitCurupiraRegistered=false;
        if('attackBlockCurupiraRegistered' in this)this.attackBlockCurupiraRegistered=false;
        if('attackHitBossRegistered' in this)this.attackHitBossRegistered=false;

        return true;
    }

    updateAttack (time)
    {
        if(!this.isAttacking){
            this.attackHitbox.body.enable=false;

            if(this.attackBufferUntil>=time&&time>=this.nextAttackAt){
                this.startAttack();
            } else if(this.attackBufferUntil<time){
                this.attackBufferUntil=0;
            }
            return;
        }

        const elapsed=time-this.attackStartedAt;
        const parts=this.playerVisual.parts;
        const baseArm=this.playerBaseRightArmAngle??parts.rightArmRig.angle;
        const baseTorso=this.playerBaseTorsoAngle??parts.torso.angle;
        const variant=this.attackVisualVariant;

        if(elapsed<70){
            const prep=Math.max(0,elapsed/70);
            parts.rightArmRig.angle=baseArm+(variant===0?28:22)*prep;
            parts.macheteGripAngle=18-(variant===0?32:22)*prep;
            parts.torso.angle=baseTorso-(variant===0?5:3)*prep;
        } else if(elapsed<90){
            const release=(elapsed-70)/20;
            const armStart=variant===0?12:8;
            const bladeStart=variant===0?28:23;
            parts.rightArmRig.angle=baseArm+(variant===0?28:22)+(armStart-(variant===0?28:22))*release;
            parts.macheteGripAngle=(variant===0?-14:-4)+(bladeStart-(variant===0?-14:-4))*release;
            parts.torso.angle=baseTorso-(variant===0?5:3)+(variant===0?7:4)*release;
        } else if(elapsed<=210){
            const active=(elapsed-90)/120;
            const swing=Math.sin(active*Math.PI);
            const armStart=variant===0?12:8;
            const bladeStart=variant===0?28:23;
            parts.rightArmRig.angle=baseArm+armStart+(variant===0?48:40)*swing;
            parts.macheteGripAngle=bladeStart+(variant===0?40:30)*swing;
            parts.torso.angle=baseTorso+(variant===0?2:1)+(variant===0?6:4)*swing;

            this.attackHitbox.body.enable=true;
            this.attackHitbox.setPosition(
                this.player.x+(46*this.attackDirection),
                this.player.y+(-2)
            );

            if(!this.attackArcShown){
                this.attackArcShown=true;
                this.showMacheteArc(this.attackDirection,variant);
            }
        } else {
            this.attackHitbox.body.enable=false;
            const recovery=Math.min(1,(elapsed-210)/90);
            const armStart=variant===0?12:8;
            const bladeStart=variant===0?28:23;
            parts.rightArmRig.angle=baseArm+armStart*(1-recovery);
            parts.macheteGripAngle=bladeStart+(18-bladeStart)*recovery;
            parts.torso.angle=baseTorso+(variant===0?2:1)*(1-recovery);
        }

        if(elapsed>=300){
            this.isAttacking=false;
            this.attackHitbox.body.enable=false;
            parts.macheteGripAngle=18;
        }
    }

    createSnake ()
    {
        this.snakePatrol = {
            minX: 1060,
            maxX: 1280,
            speed: 70
        };

        this.snake = this.add.rectangle(1180, 620, 72, 24, 0x000000, 0);
        this.physics.add.existing(this.snake);

        this.snake.body.setSize(72, 24);
        this.snake.body.setCollideWorldBounds(true);
        this.snake.body.setVelocityX(this.snakePatrol.speed);

        this.physics.add.collider(this.snake, this.platforms);
        this.physics.add.overlap(this.player, this.snake, () => {
            this.handleSnakeContact();
        });

        this.snakeVisual = this.add.container(this.snake.x, this.snake.y).setDepth(19);
        this.snakeVisual.facing = 1;
        this.snakeMaxHealth = 50;
        this.snakeHealth = 50;
        this.snakeAlive = true;

        const tail = this.add.ellipse(-30, 2, 22, 8, 0x49652f).setOrigin(0.5);
        const bodyBack = this.add.ellipse(-15, 0, 28, 13, 0x58773a).setOrigin(0.5);
        const bodyFront = this.add.ellipse(7, 0, 34, 15, 0x638342).setOrigin(0.5);
        const head = this.add.ellipse(29, -2, 23, 18, 0x72924c).setOrigin(0.5);
        const eyeTop = this.add.circle(34, -6, 2.2, 0xe3d7a5);
        const eyeBottom = this.add.circle(34, 2, 2.2, 0xe3d7a5);
        const pupilTop = this.add.circle(35, -6, 1, 0x11170d);
        const pupilBottom = this.add.circle(35, 2, 1, 0x11170d);

        this.snakeVisual.add([
            tail,
            bodyBack,
            bodyFront,
            head,
            eyeTop,
            eyeBottom,
            pupilTop,
            pupilBottom
        ]);

        this.snakeVisual.parts = {
            tail,
            bodyBack,
            bodyFront,
            head
        };
    }

    updateSnake (time)
    {
        if (this.phaseCompleted || !this.snake || !this.snake.body || !this.snakeAlive)
        {
            return;
        }

        const patrol = this.snakePatrol;

        if (this.snake.x >= patrol.maxX)
        {
            this.snake.body.setVelocityX(-patrol.speed);
            this.snakeVisual.facing = -1;
        }
        else if (this.snake.x <= patrol.minX)
        {
            this.snake.body.setVelocityX(patrol.speed);
            this.snakeVisual.facing = 1;
        }

        const seconds = time * 0.001;
        const wave = Math.sin(seconds * 8);
        const waveBack = Math.sin(seconds * 8 - 0.8);
        const waveTail = Math.sin(seconds * 8 - 1.5);

        this.snakeVisual.setPosition(this.snake.x, this.snake.y - 2 + wave * 1.2);
        this.snakeVisual.setScale(this.snakeVisual.facing, 1);

        this.snakeVisual.parts.bodyFront.y = wave * 1.4;
        this.snakeVisual.parts.bodyBack.y = waveBack * 1.8;
        this.snakeVisual.parts.tail.y = waveTail * 2.2;
        this.snakeVisual.parts.head.y = wave * 1.1;
        this.snakeVisual.parts.head.angle = wave * 2.5;
    }

    handleSnakeContact ()
    {
        if (this.phaseCompleted || !this.snakeAlive || this.isPlayerDead || this.time.now < this.invulnerableUntil)
        {
            return;
        }

        this.health = Math.max(0, this.health - 25);
        this.invulnerableUntil = this.time.now + 1000;
        this.knockbackUntil = this.time.now + 180;

        const direction = this.player.x < this.snake.x ? -1 : 1;
        this.player.body.setVelocityX(220 * direction);
        this.player.body.setVelocityY(-260);

        this.updateHealthHud();
        this.flashPlayerDamage();

        if (this.health <= 0)
        {
            this.handlePlayerDeath();
        }
    }

    tryHitSnake ()
    {
        if (
            !this.isAttacking ||
            !this.attackHitbox.body.enable ||
            this.attackHitSnakeRegistered ||
            !this.snakeAlive
        )
        {
            return;
        }

        this.attackHitSnakeRegistered = true;
        this.damageSnake(25);
    }

    damageSnake (amount)
    {
        if (!this.snakeAlive)
        {
            return;
        }

        this.snakeHealth = Math.max(0, this.snakeHealth - amount);
        this.showCombatImpact(
            this.snake.x,
            this.snake.y - 4,
            this.snakeVisual,
            { heavy: this.snakeHealth <= 0 }
        );

        this.tweens.killTweensOf(this.snakeVisual);
        this.snakeVisual.setAlpha(1);

        this.tweens.add({
            targets: this.snakeVisual,
            alpha: 0.35,
            scaleY: 1.12,
            duration: 70,
            yoyo: true,
            repeat: 1,
            onComplete: () => {
                if (this.snakeAlive)
                {
                    this.snakeVisual.setAlpha(1);
                    this.snakeVisual.scaleY = 1;
                }
            }
        });

        if (this.snakeHealth <= 0)
        {
            this.defeatSnake();
        }
    }

    defeatSnake ()
    {
        if (!this.snakeAlive)
        {
            return;
        }

        this.snakeAlive = false;
        this.snake.body.setVelocity(0, 0);
        this.snake.body.enable = false;

        this.tweens.killTweensOf(this.snakeVisual);

        this.tweens.add({
            targets: this.snakeVisual,
            angle: 18,
            scaleY: 0.55,
            alpha: 0,
            duration: 450,
            delay: 180,
            onComplete: () => {
                this.snakeVisual.setVisible(false);
            }
        });
    }

    createCarapana ()
    {
        this.carapanaPatrol = {
            minX: 1630,
            maxX: 1850,
            baseX: 1740,
            baseY: 430,
            patrolSpeed: 55,
            chaseSpeed: 105,
            returnSpeed: 80,
            detectionRadius: 300
        };

        this.carapana = this.add.rectangle(
            this.carapanaPatrol.baseX,
            this.carapanaPatrol.baseY,
            38,
            24,
            0x000000,
            0
        );
        this.physics.add.existing(this.carapana);

        this.carapana.body.setSize(38, 24);
        this.carapana.body.setAllowGravity(false);
        this.carapana.body.setCollideWorldBounds(true);
        this.carapana.body.setVelocityX(this.carapanaPatrol.patrolSpeed);

        this.carapanaMaxHealth = 25;
        this.carapanaHealth = 25;
        this.carapanaAlive = true;
        this.carapanaFacing = 1;
        this.carapanaReturning = false;

        this.physics.add.overlap(this.player, this.carapana, () => {
            this.handleCarapanaContact();
        });

        this.carapanaVisual = this.add.container(
            this.carapana.x,
            this.carapana.y
        ).setDepth(19);

        const abdomen = this.add.ellipse(-8, 0, 22, 8, 0x4b3d2d);
        const thorax = this.add.ellipse(5, 0, 13, 11, 0x5d4b35);
        const head = this.add.circle(13, -1, 5, 0x6b5940);

        const wingTop = this.add.ellipse(-1, -8, 22, 8, 0xcbd8cf, 0.42)
            .setAngle(-18);
        const wingBottom = this.add.ellipse(-1, 8, 22, 8, 0xcbd8cf, 0.42)
            .setAngle(18);

        const proboscis = this.add.rectangle(21, -1, 12, 2, 0x3a3026)
            .setOrigin(0, 0.5);

        const leg1 = this.add.rectangle(1, 7, 2, 17, 0x3b3228)
            .setOrigin(0.5, 0)
            .setAngle(28);
        const leg2 = this.add.rectangle(-5, 7, 2, 18, 0x3b3228)
            .setOrigin(0.5, 0)
            .setAngle(-24);
        const leg3 = this.add.rectangle(7, 6, 2, 16, 0x3b3228)
            .setOrigin(0.5, 0)
            .setAngle(48);

        this.carapanaVisual.add([
            wingTop,
            wingBottom,
            leg1,
            leg2,
            leg3,
            abdomen,
            thorax,
            head,
            proboscis
        ]);

        this.carapanaVisual.parts = {
            abdomen,
            thorax,
            head,
            wingTop,
            wingBottom,
            proboscis
        };
    }

    updateCarapana (time)
    {
        if (this.phaseCompleted || !this.carapana || !this.carapana.body || !this.carapanaAlive)
        {
            return;
        }

        const patrol = this.carapanaPatrol;
        const dx = this.player.x - this.carapana.x;
        const dy = this.player.y - this.carapana.y;
        const distance = Math.hypot(dx, dy);

        if (distance <= patrol.detectionRadius)
        {
            this.carapanaReturning = true;

            if (distance > 1)
            {
                this.carapana.body.setVelocity(
                    (dx / distance) * patrol.chaseSpeed,
                    (dy / distance) * patrol.chaseSpeed
                );
            }
        }
        else
        {
            const outsidePatrol =
                this.carapana.x < patrol.minX ||
                this.carapana.x > patrol.maxX ||
                Math.abs(this.carapana.y - patrol.baseY) > 24;

            if (this.carapanaReturning || outsidePatrol)
            {
                const returnDx = patrol.baseX - this.carapana.x;                const returnDy = patrol.baseY - this.carapana.y;
                const returnDistance = Math.hypot(returnDx, returnDy);

                if (returnDistance > 18)
                {
                    this.carapana.body.setVelocity(
                        (returnDx / returnDistance) * patrol.returnSpeed,
                        (returnDy / returnDistance) * patrol.returnSpeed
                    );
                }
                else
                {
                    this.carapanaReturning = false;
                    this.carapana.setPosition(
                        Math.min(patrol.maxX, Math.max(patrol.minX, this.carapana.x)),
                        patrol.baseY
                    );
                    this.carapana.body.setVelocity(patrol.patrolSpeed, 0);
                    this.carapanaFacing = 1;
                }
            }
            else
            {
                this.carapana.body.setVelocityY(0);

                if (this.carapana.x >= patrol.maxX)
                {
                    this.carapana.body.setVelocityX(-patrol.patrolSpeed);
                    this.carapanaFacing = -1;
                }
                else if (this.carapana.x <= patrol.minX)
                {
                    this.carapana.body.setVelocityX(patrol.patrolSpeed);
                    this.carapanaFacing = 1;
                }
            }
        }

        if (this.carapana.body.velocity.x > 1)
        {
            this.carapanaFacing = 1;
        }
        else if (this.carapana.body.velocity.x < -1)
        {
            this.carapanaFacing = -1;
        }

        const seconds = time * 0.001;
        const hover = Math.sin(seconds * 5.5) * 4;
        const wingBeat = Math.sin(seconds * 34) * 18;
        const tilt = Math.max(-8, Math.min(8, this.carapana.body.velocity.y * 0.05));

        this.carapanaVisual.setPosition(
            this.carapana.x,
            this.carapana.y + hover
        );
        this.carapanaVisual.setScale(this.carapanaFacing, 1);
        this.carapanaVisual.setAngle(tilt);

        this.carapanaVisual.parts.wingTop.angle = -18 + wingBeat;
        this.carapanaVisual.parts.wingBottom.angle = 18 - wingBeat;
        this.carapanaVisual.parts.abdomen.y = Math.sin(seconds * 7) * 1.2;
        this.carapanaVisual.parts.head.y = -1 + Math.sin(seconds * 7 + 0.7) * 0.8;
    }

    handleCarapanaContact ()
    {
        if (
            this.phaseCompleted ||
            !this.carapanaAlive ||
            this.isPlayerDead ||
            this.time.now < this.invulnerableUntil
        )
        {
            return;
        }

        this.health = Math.max(0, this.health - 10);
        this.invulnerableUntil = this.time.now + 1000;
        this.knockbackUntil = this.time.now + 120;

        const direction = this.player.x < this.carapana.x ? -1 : 1;
        this.player.body.setVelocityX(120 * direction);

        this.updateHealthHud();
        this.flashPlayerDamage();

        if (this.health <= 0)
        {
            this.handlePlayerDeath();
        }
    }

    tryHitCarapana ()
    {
        if (
            !this.isAttacking ||
            !this.attackHitbox.body.enable ||
            this.attackHitCarapanaRegistered ||
            !this.carapanaAlive
        )
        {
            return;
        }

        this.attackHitCarapanaRegistered = true;
        this.damageCarapana(25);
    }

    damageCarapana (amount)
    {
        if (!this.carapanaAlive)
        {
            return;
        }

        this.carapanaHealth = Math.max(0, this.carapanaHealth - amount);
        this.showCombatImpact(
            this.carapana.x,
            this.carapana.y,
            this.carapanaVisual,
            { small: true }
        );

        if (this.carapanaHealth <= 0)
        {
            this.defeatCarapana();
        }
    }

    defeatCarapana ()
    {
        if (!this.carapanaAlive)
        {
            return;
        }

        this.carapanaAlive = false;
        this.carapana.body.setVelocity(0, 0);
        this.carapana.body.enable = false;

        this.tweens.add({
            targets: this.carapanaVisual,
            y: this.carapanaVisual.y + 70,
            angle: 75,
            alpha: 0,
            duration: 520,
            ease: 'Quad.In',
            onComplete: () => {
                this.carapanaVisual.setVisible(false);
            }
        });
    }

    damagePlayer (amount, vx = 0, vy = 0)
    {
        if (this.phaseCompleted || this.isPlayerDead || this.time.now < this.invulnerableUntil) return;
        this.health = Math.max(0, this.health - amount);
        this.invulnerableUntil = this.time.now + 1000;
        this.knockbackUntil = this.time.now + 150;
        this.player.body.setVelocity(vx, vy);
        this.updateHealthHud();
        this.flashPlayerDamage();
        if (this.health <= 0) this.handlePlayerDeath();
    }

    flashPlayerDamage ()
    {
        this.tweens.killTweensOf(this.playerVisual);
        this.tweens.add({ targets: this.playerVisual, alpha: 0.25, duration: 90, yoyo: true, repeat: 4, onComplete: () => this.playerVisual.setAlpha(1) });
    }

    handlePlayerDeath ()
    {
        if (this.phaseCompleted || this.isPlayerDead) return;
        this.isPlayerDead = true;
        this.resetCombatPolishState();
        this.clearRubberLatexDrops();
        this.player.body.setVelocity(0, 0);
        this.time.delayedCall(650, () => {
            this.player.setPosition(this.spawnPoint.x, this.spawnPoint.y);
            this.player.body.setVelocity(0, 0);
            this.health = 100;
            this.hunger = 100;
            this.stamina = this.maxStamina;
            this.staminaRegenBlockedUntil = 0;
            this.resetMovementPolishState(); this.resetCombatPolishState();
            this.resetEnvironmentalChallenges();
            this.clearLivingAtmosphereTransient();
            this.nextHungerDrainAt = this.time.now + 2000;
            this.nextStarvationDamageAt = this.time.now + 2000;
            this.invulnerableUntil = this.time.now + 1000;
            this.isPlayerDead = false;
            this.updateHealthHud();
            this.updateHungerHud();
            this.updateStaminaHud();
            this.playerVisual.setAlpha(1);
        });
    }

    createFruits ()
    {
        this.fruits = [];

        const fruitData = [
            { x: 380, y: 620, color: 0xc94432 },
            { x: 880, y: 495, color: 0xe0b843 },
            { x: 1450, y: 620, color: 0xd77a2f },
            { x: 2030, y: 545, color: 0xc94432 },
            { x: 2390, y: 620, color: 0xe0b843 }
        ];

        fruitData.forEach((data, index) => {
            const visual = this.add.container(data.x, data.y).setDepth(18);

            const body = this.add.circle(0, 0, 9, data.color);
            const shine = this.add.circle(-3, -3, 2.5, 0xffffff, 0.42);
            const stem = this.add.rectangle(0, -11, 3, 7, 0x5b4324).setOrigin(0.5, 1);
            const leaf = this.add.ellipse(6, -13, 10, 5, 0x4f7a38)
                .setAngle(-24);

            visual.add([body, shine, stem, leaf]);

            const sensor = this.add.rectangle(data.x, data.y, 26, 30, 0x000000, 0);
            this.physics.add.existing(sensor);

            sensor.body.setAllowGravity(false);
            sensor.body.setImmovable(true);

            const fruit = {
                visual,
                sensor,
                baseY: data.y,
                phase: index * 0.85,
                collected: false
            };

            this.fruits.push(fruit);

            this.physics.add.overlap(this.player, sensor, () => {
                this.collectFruit(fruit);
            });
        });
    }

    collectFruit (fruit)
    {
        if (fruit.collected)
        {
            return;
        }

        fruit.collected = true;
        this.audioManager?.playSfx?.('fruit_bite', { cooldown: 100, volume: 0.8 });
        fruit.sensor.body.enable = false;

        this.hunger = Math.min(this.maxHunger, this.hunger + 25);
        this.health = Math.min(this.maxHealth, this.health + 10);
        this.updateHungerHud();
        this.updateHealthHud();

        const feedback = this.add.text(
            fruit.visual.x,
            fruit.visual.y - 18,
            '+25 FOME\n+10 VIDA',
            {
                fontFamily: 'Arial',
                fontSize: '18px',
                fontStyle: 'bold',
                color: '#dff2a2',
                stroke: '#17301d',
                strokeThickness: 3
            }
        )
            .setOrigin(0.5)
            .setDepth(40);

        this.tweens.add({
            targets: fruit.visual,
            y: fruit.visual.y - 12,
            scaleX: 1.25,
            scaleY: 1.25,
            alpha: 0,
            duration: 220,
            ease: 'Quad.Out',
            onComplete: () => {
                fruit.visual.setVisible(false);
            }
        });

        this.tweens.add({
            targets: feedback,
            y: feedback.y - 24,
            alpha: 0,
            duration: 500,
            ease: 'Quad.Out',
            onComplete: () => {
                feedback.destroy();
            }
        });
    }

    updateFruits (time)
    {
        const seconds = time * 0.001;

        this.fruits.forEach((fruit) => {
            if (fruit.collected)
            {
                return;
            }

            const wave = Math.sin(seconds * 2.4 + fruit.phase);
            const pulse = 1 + Math.sin(seconds * 2.8 + fruit.phase) * 0.035;

            fruit.visual.y = fruit.baseY + wave * 3;
            fruit.visual.setScale(pulse);
        });
    }

    createArena ()
    {
        this.arenaStarted = false;
        this.arenaCleared = false;
        this.arenaMinX = 7350;
        this.arenaMaxX = 8580;

        // Clareira do guardião: decoração estática, sem alterar física ou limites.
        const arenaVisual = this.add.graphics().setDepth(6);
        arenaVisual.fillStyle(0x13291d, 0.34);
        arenaVisual.fillEllipse(7965, 635, 1280, 62);
        arenaVisual.lineStyle(15, 0x3a281c, 0.82);
        [[7360,650,7420,600],[8560,650,8500,596]].forEach(([x1,y1,x2,y2]) => {
            arenaVisual.beginPath();
            arenaVisual.moveTo(x1, y1);
            arenaVisual.lineTo(x2, y2);
            arenaVisual.strokePath();
        });
        arenaVisual.fillStyle(0x315a37, 0.64);
        [[7400,626,26],[7440,634,18],[8530,628,24],[8492,636,17]].forEach(([x,y,r]) => arenaVisual.fillCircle(x, y, r));

        this.add.rectangle(7965, 520, 1280, 138, 0xc8d8ce, 0.045)
            .setDepth(-8)
            .setScrollFactor(0.72);

        this.arenaTrigger = this.add.rectangle(7480, 570, 140, 150, 0x000000, 0);
        this.physics.add.existing(this.arenaTrigger);
        this.arenaTrigger.body.setAllowGravity(false);
        this.arenaTrigger.body.setImmovable(true);
        this.physics.add.overlap(this.player, this.arenaTrigger, () => this.startCurupiraEncounter());

        this.arenaBarrier = this.add.rectangle(7320, 560, 26, 190, 0x203c28, 0.9).setDepth(16).setVisible(false);
        this.physics.add.existing(this.arenaBarrier, true);
        this.arenaBarrier.body.enable = false;
    }

    createCurupira ()
    {
        this.curupira = this.add.rectangle(8170, 590, 50, 76, 0x000000, 0);
        this.physics.add.existing(this.curupira);
        this.curupira.body.setSize(50, 76);
        this.curupira.body.setCollideWorldBounds(true);
        this.physics.add.collider(this.curupira, this.platforms);
        this.physics.add.overlap(this.player, this.curupira, () => this.handleCurupiraContact());

        this.curupiraHealth = 100;
        this.curupiraState = 'INTRO';
        this.curupiraNextActionAt = 0;
        this.curupiraAttackPattern = 0;
        this.curupiraAttackSerial = 0;
        this.curupiraComboCount = 0;
        this.curupiraWillChain = false;
        this.curupiraLandingDangerUntil = 0;
        this.curupiraLandingImpactShown = false;
        this.curupiraLandingMarker = null;
        this.curupiraAttackTimers = [];
        this.curupiraSpecialEffects = [];
        this.curupiraAttackHistory = [];
        this.curupiraAirJumpUsed = false;
        this.curupiraWhistleIntroduced = false;
        this.curupiraFalseTrailIntroduced = false;
        this.curupiraWhistleDamageDone = false;
        this.curupiraForcedNextPattern = null;
        this.curupiraPhaseBDuoShown = false;
        this.curupiraBaseScale = 1.78;

        // Bottom-most point of the procedural feet at scale 1:
        // leg Y 18 + shin Y 25 + foot Y 21 + toe half-height 4.5 + toe local Y 2 = 70.5.
        // Keep that exact foot baseline when the whole visual is scaled to 1.78.
        this.curupiraRigFootBaselineY = 70.5;
        this.curupiraVisualOffsetY = this.curupiraRigFootBaselineY * (1 - this.curupiraBaseScale);

        this.curupiraVisual = this.add.container(
            this.curupira.x,
            this.curupira.y + this.curupiraVisualOffsetY
        )
            .setDepth(21)
            .setScale(this.curupiraBaseScale)
            .setVisible(false);

        // Rig procedural do Curupira: boss maior, robusto e com silhueta de guardião.
        const rig = this.add.container(0, 0);
        const shadow = this.add.ellipse(0, 38, 61, 13, 0x07100d, 0.34);

        const backLeaves = this.add.container(0, -7);
        [
            [-23,-11,-30,0x294f31],[-18,0,-18,0x365f39],[-12,11,-9,0x3f6f40],
            [23,-11,30,0x294f31],[18,0,18,0x365f39],[12,11,9,0x3f6f40]
        ].forEach(([x,y,angle,color])=>{
            backLeaves.add(this.add.ellipse(x,y,20,8,color,0.94).setAngle(angle));
        });

        const torsoRig = this.add.container(0, -2);
        const torso = this.add.polygon(0, 0, [
            -24,-22, 24,-22, 22,7, 16,23, 0,28, -16,23, -22,7
        ], 0x355d38, 1).setStrokeStyle(2, 0x172d1d, 0.95);
        const chest = this.add.ellipse(-5,-4,26,34,0x4c794a,0.48);
        const chestFiber = this.add.graphics();
        chestFiber.lineStyle(2,0x87a25a,0.5);
        chestFiber.beginPath(); chestFiber.moveTo(-12,-16); chestFiber.lineTo(7,19); chestFiber.strokePath();
        chestFiber.beginPath(); chestFiber.moveTo(10,-16); chestFiber.lineTo(-5,18); chestFiber.strokePath();
        const belt = this.add.rectangle(0,17,42,7,0x5a3b22,0.98).setStrokeStyle(1,0x2f2118,0.8);
        const frontLeafL = this.add.ellipse(-13,20,19,8,0x4e7b3e,1).setAngle(-18);
        const frontLeafR = this.add.ellipse(13,20,19,8,0x668f48,1).setAngle(18);
        torsoRig.add([torso,chest,chestFiber,belt,frontLeafL,frontLeafR]);

        const shoulderL = this.add.ellipse(-24,-17,23,11,0x527d3e,0.98).setAngle(-24);
        const shoulderR = this.add.ellipse(24,-17,23,11,0x527d3e,0.98).setAngle(24);

        const leftArmRig = this.add.container(-22,-15);
        const leftUpperArm = this.add.rectangle(0,13,12,28,0x9c5f40).setOrigin(0.5,0.06).setStrokeStyle(1,0x613a29,0.8);
        const leftForearmRig = this.add.container(0,26);
        const leftForearm = this.add.rectangle(0,10,11,23,0xa46645).setOrigin(0.5,0.06);
        const leftBracer = this.add.rectangle(0,17,13,7,0x3d6236).setStrokeStyle(1,0x203c27,0.8);
        const leftHand = this.add.circle(0,23,6.2,0xad704f).setStrokeStyle(1,0x673c2a,0.8);
        leftForearmRig.add([leftForearm,leftBracer,leftHand]);
        leftArmRig.add([leftUpperArm,leftForearmRig]);

        const rightArmRig = this.add.container(22,-15);
        const rightUpperArm = this.add.rectangle(0,13,12,28,0x9c5f40).setOrigin(0.5,0.06).setStrokeStyle(1,0x613a29,0.8);
        const rightForearmRig = this.add.container(0,26);
        const rightForearm = this.add.rectangle(0,10,11,23,0xa46645).setOrigin(0.5,0.06);
        const rightBracer = this.add.rectangle(0,17,13,7,0x3d6236).setStrokeStyle(1,0x203c27,0.8);
        const rightHand = this.add.circle(0,23,6.2,0xad704f).setStrokeStyle(1,0x673c2a,0.8);
        rightForearmRig.add([rightForearm,rightBracer,rightHand]);
        rightArmRig.add([rightUpperArm,rightForearmRig]);

        const leftLegRig = this.add.container(-11,18);
        const leftThigh = this.add.rectangle(0,12,13,27,0x754832).setOrigin(0.5,0.05).setStrokeStyle(1,0x4b3023,0.8);
        const leftShinRig = this.add.container(0,25);
        const leftShin = this.add.rectangle(0,9,12,21,0x845239).setOrigin(0.5,0.05);
        const leftFoot = this.add.container(0,21);
        const leftHeel = this.add.ellipse(6,1,14,9,0x66402d);
        const leftBackToe = this.add.ellipse(-12,2,27,9,0x74452f).setAngle(-8);
        const leftToeMark = this.add.rectangle(-17,2,7,2,0x9a6a45,0.75);
        leftFoot.add([leftHeel,leftBackToe,leftToeMark]);
        leftShinRig.add([leftShin,leftFoot]);
        leftLegRig.add([leftThigh,leftShinRig]);

        const rightLegRig = this.add.container(11,18);
        const rightThigh = this.add.rectangle(0,12,13,27,0x754832).setOrigin(0.5,0.05).setStrokeStyle(1,0x4b3023,0.8);
        const rightShinRig = this.add.container(0,25);
        const rightShin = this.add.rectangle(0,9,12,21,0x845239).setOrigin(0.5,0.05);
        const rightFoot = this.add.container(0,21);
        const rightHeel = this.add.ellipse(6,1,14,9,0x66402d);
        const rightBackToe = this.add.ellipse(-12,2,27,9,0x74452f).setAngle(8);
        const rightToeMark = this.add.rectangle(-17,2,7,2,0x9a6a45,0.75);
        rightFoot.add([rightHeel,rightBackToe,rightToeMark]);
        rightShinRig.add([rightShin,rightFoot]);
        rightLegRig.add([rightThigh,rightShinRig]);

        const headRig = this.add.container(0,-42);
        const neck = this.add.rectangle(0,15,13,11,0x8d5438);
        const earL = this.add.polygon(-18,0,[-5,-6,3,0,-5,6],0x985b3e,1);
        const earR = this.add.polygon(18,0,[5,-6,-3,0,5,6],0x985b3e,1);
        const head = this.add.ellipse(0,0,37,39,0xaa6847).setStrokeStyle(2,0x593024,0.9);
        const jaw = this.add.ellipse(0,10,25,15,0x8d523b,0.42);
        const faceShade = this.add.ellipse(6,4,16,24,0x7f4937,0.26);

        const browL = this.add.rectangle(-8,-7,11,3.5,0x321913).setAngle(24);
        const browR = this.add.rectangle(8,-7,11,3.5,0x321913).setAngle(-24);
        const eyeGlowL = this.add.circle(-8,-1,4.2,0xff6a1f,0.36);
        const eyeGlowR = this.add.circle(8,-1,4.2,0xff6a1f,0.36);
        const eyeL = this.add.ellipse(-8,-1,5.2,2.8,0xffbd35);
        const eyeR = this.add.ellipse(8,-1,5.2,2.8,0xffbd35);
        const pupilL = this.add.ellipse(-8,-1,1.5,2.2,0x120a08);
        const pupilR = this.add.ellipse(8,-1,1.5,2.2,0x120a08);
        const nose = this.add.triangle(0,5,-3,3,3,3,0,-4,0x7b4431);
        const mouthDark = this.add.ellipse(0,11,15,7,0x351a16,0.95);
        const fangL = this.add.triangle(-4.5,10,-2.1,0,2.1,0,0,4.7,0xf0e1bf);
        const fangR = this.add.triangle(4.5,10,-2.1,0,2.1,0,0,4.7,0xf0e1bf);

        // Cabelo-fogo sem triângulos soltos: todas as chamas nascem e se sobrepõem à massa do cabelo.
        const hairRig = this.add.container(0,-18);
        const hairMass = this.add.ellipse(0,0,52,27,0x9f2f1c).setStrokeStyle(1,0x6f2117,0.78);
        const hairMid = this.add.ellipse(-1,-3,43,22,0xd94420,0.98);
        const hairHot = this.add.ellipse(-2,-5,29,14,0xf36f25,0.88);
        const flameData = [
            [-20,-11,13,29,-16,0xb52f1c,0xef5a23],
            [-13,-16,14,34,-9,0xc93a1d,0xf47a27],
            [-5,-19,14,39,-3,0xe14b20,0xff9230],
            [4,-20,15,41,4,0xe85521,0xffa337],
            [13,-16,14,34,10,0xd7431f,0xf47a27],
            [20,-11,13,29,16,0xb9341d,0xef5a23]
        ];
        const hairFlames = [];
        const hairInnerFlames = [];
        flameData.forEach(([x,y,w,h,angle,outerColor,innerColor],index)=>{
            const flame=this.add.ellipse(x,y,w,h,outerColor,0.98).setAngle(angle).setOrigin(0.5,0.72);
            const inner=this.add.ellipse(x,y+3,w*0.45,h*0.52,innerColor,0.82).setAngle(angle).setOrigin(0.5,0.76);
            hairFlames.push(flame);
            hairInnerFlames.push(inner);
            hairRig.add([flame,inner]);
            if(index===2||index===3){
                const core=this.add.ellipse(x,y+7,w*0.22,h*0.27,0xffcf4a,0.82).setAngle(angle).setOrigin(0.5,0.8);
                hairInnerFlames.push(core);
                hairRig.add(core);
            }
        });
        hairRig.addAt(hairMass,0);
        hairRig.addAt(hairMid,1);
        hairRig.addAt(hairHot,2);
        const hairLeafL = this.add.ellipse(-21,-13,13,5,0x557b3b,0.96).setAngle(-30);
        const hairLeafR = this.add.ellipse(21,-12,12,5,0x608842,0.96).setAngle(30);

        headRig.add([
            neck,earL,earR,head,jaw,faceShade,browL,browR,
            eyeGlowL,eyeGlowR,eyeL,eyeR,pupilL,pupilR,nose,mouthDark,fangL,fangR,
            hairRig,hairLeafL,hairLeafR
        ]);

        rig.add([
            shadow,backLeaves,
            leftLegRig,rightLegRig,
            torsoRig,shoulderL,shoulderR,
            leftArmRig,rightArmRig,
            headRig
        ]);
        this.curupiraVisual.add(rig);
        this.curupiraVisual.parts = {
            rig,shadow,backLeaves,torsoRig,torso,headRig,head,hairRig,hairMass,hairMid,hairHot,
            hairFlames,hairInnerFlames,hairLeafL,hairLeafR,
            leftArmRig,rightArmRig,leftForearmRig,rightForearmRig,
            leftLegRig,rightLegRig,leftShinRig,rightShinRig,leftFoot,rightFoot,
            shoulderL,shoulderR,eyeGlowL,eyeGlowR
        };
        this.curupiraVisualFacing = 1;

        this.curupiraBossHud = this.add.container(512, 155).setScrollFactor(0).setDepth(160).setVisible(false);
        const bg = this.add.rectangle(0, 0, 430, 58, 0x06100d, 0.9).setOrigin(0.5, 0);
        bg.setStrokeStyle(1, 0x8c7558, 0.55);
        this.curupiraBossName = this.add.text(-170, 7, 'CURUPIRA', {
            fontFamily: 'Arial Black',
            fontSize: '15px',
            color: '#f1e1ae'
        }).setOrigin(0, 0);
        this.curupiraBossText = this.add.text(170, 7, '100/100', {
            fontFamily: 'Arial Black',
            fontSize: '15px',
            color: '#ffffff'
        }).setOrigin(1, 0);
        this.curupiraBossBarBack = this.add.rectangle(-170, 36, 340, 14, 0x301a17, 1).setOrigin(0, 0.5);
        this.curupiraBossBar = this.add.rectangle(-170, 36, 340, 14, 0xb64a32, 1).setOrigin(0, 0.5);
        this.curupiraBossHud.add([
            bg,
            this.curupiraBossName,
            this.curupiraBossText,
            this.curupiraBossBarBack,
            this.curupiraBossBar
        ]);
    }

    startCurupiraEncounter ()
    {
        if (this.arenaStarted || this.arenaCleared) return;
        if (!this.curupira || !this.curupira.body || !this.curupiraVisual ||
            !this.curupiraVisual.active || !this.curupiraVisual.parts) return;

        this.arenaStarted = true;
        this.arenaBarrier.setVisible(true);
        this.arenaBarrier.body.enable = true;

        this.curupira.body.setVelocity(0, 0);
        this.curupiraState = 'INTRO';

        this.resetCurupiraRigParts();
        this.curupiraVisual
            .setPosition(this.curupira.x, this.curupira.y + this.curupiraVisualOffsetY)
            .setScale(this.curupiraBaseScale)
            .setAngle(0)
            .setAlpha(1)
            .setVisible(true);

        this.curupiraBossHud.setVisible(true);

        const panel = this.add.rectangle(512, 360, 580, 100, 0x06100d, 0.9).setScrollFactor(0).setDepth(180);
        const text = this.add.text(512, 360, '“A mata não permite sua passagem.”', { fontFamily: 'Arial', fontSize: '25px', color: '#f1e1ae' }).setOrigin(0.5).setScrollFactor(0).setDepth(181);
        this.time.delayedCall(1500, () => {
            panel.destroy();
            text.destroy();
            if (this.arenaCleared || this.curupiraState === 'DEFEATED') return;
            this.beginCurupiraPreparation(this.time.now + 180);
        });
    }

    beginCurupiraPreparation (startAt = this.time.now)
    {
        if (this.arenaCleared || this.curupiraState === 'DEFEATED' || !this.curupira?.body?.enable) return;

        this.curupiraState = 'PREPARE';
        this.curupira.body.setVelocity(0, 0);
        this.curupiraAttackPattern = this.selectCurupiraAttackPattern();
        const prepareDuration = this.curupiraHealth <= 25 ? 140 : 180;
        this.curupiraNextActionAt = startAt + prepareDuration;

        if (!this.curupiraVisual) return;
        this.curupiraVisual.setAlpha(this.curupiraAttackPattern === 4 ? 0.62 : 1);
        this.curupiraVisual.setAngle(0);
        this.curupiraVisual.setScale(this.curupiraBaseScale);

        const p = this.curupiraVisual.parts;
        if (p) {
            if (p.eyeGlowL && p.eyeGlowL.active !== false) p.eyeGlowL.setAlpha(0.72);
            if (p.eyeGlowR && p.eyeGlowR.active !== false) p.eyeGlowR.setAlpha(0.72);
            if (p.hairRig && p.hairRig.active !== false) {
                if (this.curupiraAttackPattern === 0) p.hairRig.setAngle(-this.curupiraVisualFacing * 8);
                else if (this.curupiraAttackPattern === 1) p.hairRig.setScale(1.02, 1.18);
                else if (this.curupiraAttackPattern === 3) p.hairRig.setScale(1.16, 1.05);
                else if (this.curupiraAttackPattern === 4) p.hairRig.setScale(0.94, 0.82);
                else p.hairRig.setScale(1.04, 1.08);
            }
            if (p.backLeaves && p.backLeaves.active !== false) {
                p.backLeaves.setAngle(this.player.x < this.curupira.x ? 6 : -6);
            }
        }

        if (this.curupiraAttackPattern === 4) {
            this.createCurupiraFalseTrailFootprints();
        }
    }

    selectCurupiraAttackPattern ()
    {
        let allowed = [0, 1, 2];
        if (this.curupiraHealth <= 75) allowed.push(3);
        if (this.curupiraHealth <= 50) allowed.push(4);

        let selected = null;
        if (this.curupiraForcedNextPattern !== null) {
            selected = this.curupiraForcedNextPattern;
            this.curupiraForcedNextPattern = null;
            if (selected === 3) this.curupiraWhistleIntroduced = true;
        } else if (this.curupiraHealth === 75 && !this.curupiraPhaseBDuoShown) {
            selected = 1;
            this.curupiraPhaseBDuoShown = true;
            this.curupiraForcedNextPattern = 3;
        } else if (this.curupiraHealth <= 50 && !this.curupiraFalseTrailIntroduced) {
            selected = 4;
            this.curupiraFalseTrailIntroduced = true;
        } else if (this.curupiraHealth <= 75 && !this.curupiraWhistleIntroduced) {
            selected = 3;
            this.curupiraWhistleIntroduced = true;
        } else {
            const recent = this.curupiraAttackHistory.slice(-2);
            const weightedAllowed = this.curupiraHealth <= 25
                ? [0, 0, 1, 1, 3, 3, 2, 4]
                : allowed;
            const candidates = weightedAllowed.filter(pattern => !(
                recent.length === 2 &&
                recent[0] === pattern &&
                recent[1] === pattern
            ));
            const pool = candidates.length > 0 ? candidates : weightedAllowed;
            selected = pool[(this.curupiraAttackSerial + Math.floor(this.curupiraHealth / 25)) % pool.length];
        }

        this.curupiraAttackHistory.push(selected);
        if (this.curupiraAttackHistory.length > 2) this.curupiraAttackHistory.shift();
        return selected;
    }

    resetCurupiraRigParts ()
    {
        const visual = this.curupiraVisual;
        if (!visual || !visual.active || !visual.parts) return;

        const p = visual.parts;
        const setPose = (object, x, y, angle = 0) => {
            if (!object || object.active === false) return;
            object.setPosition(x, y);
            object.setAngle(angle);
            object.setScale(1);
            object.setAlpha(1);
        };

        setPose(p.torsoRig, 0, -2);
        setPose(p.headRig, 0, -42);
        setPose(p.backLeaves, 0, -7);
        setPose(p.hairRig, 0, -18);
        setPose(p.leftArmRig, -22, -15);
        setPose(p.rightArmRig, 22, -15);
        setPose(p.leftForearmRig, 0, 26);
        setPose(p.rightForearmRig, 0, 26);
        setPose(p.leftLegRig, -11, 18);
        setPose(p.rightLegRig, 11, 18);
        setPose(p.leftShinRig, 0, 25);
        setPose(p.rightShinRig, 0, 25);
        setPose(p.leftFoot, 0, 21);
        setPose(p.rightFoot, 0, 21);

        if (p.shadow && p.shadow.active !== false) {
            p.shadow.setScale(1);
            p.shadow.setAlpha(0.34);
        }
        if (p.eyeGlowL && p.eyeGlowL.active !== false) p.eyeGlowL.setAlpha(0.36);
        if (p.eyeGlowR && p.eyeGlowR.active !== false) p.eyeGlowR.setAlpha(0.36);
    }

    animateCurupiraVisual (time)
    {
        if (!this.curupiraVisual ||
            !this.curupiraVisual.active ||
            !this.curupiraVisual.parts ||
            !this.curupira ||
            !this.curupira.body ||
            !this.curupira.body.enable) {
            return;
        }

        const p = this.curupiraVisual.parts;
        const required = [
            p.rig,p.torsoRig,p.headRig,p.backLeaves,p.hairRig,
            p.leftArmRig,p.rightArmRig,p.leftForearmRig,p.rightForearmRig,
            p.leftLegRig,p.rightLegRig,p.leftShinRig,p.rightShinRig
        ];
        if (required.some(object => !object || object.active === false)) return;

        this.resetCurupiraRigParts();

        const vx = this.curupira.body.velocity?.x || 0;
        const vy = this.curupira.body.velocity?.y || 0;
        const speedX = Math.abs(vx);
        const moving = speedX > 24;
        const airborne = Math.abs(vy) > 35 && !this.curupira.body.blocked.down;
        const state = this.curupiraState;
        const attack = state === 'ATTACK';

        let facing = this.curupiraVisualFacing || 1;
        if (speedX > 8) facing = vx > 0 ? 1 : -1;
        else if (this.player && state !== 'DEFEATED') facing = this.player.x >= this.curupira.x ? 1 : -1;
        this.curupiraVisualFacing = facing;
        p.rig.setScale(facing, 1);

        const walkPhase = time * (moving ? 0.022 : 0.006);
        const step = Math.sin(walkPhase);
        const opposite = -step;
        const breath = Math.sin(time * 0.0045);
        const menace = Math.sin(time * 0.009);

        p.torsoRig.y = -2 + breath * 1.5;
        p.headRig.y = -42 + breath * 0.75;
        const playerDelta = this.player
            ? Math.max(-1, Math.min(1, (this.player.x - this.curupira.x) / 220))
            : 0;
        p.headRig.angle = breath + playerDelta * 2.2;
        p.backLeaves.angle = -breath * 1.8;

        if (p.shadow && p.shadow.active !== false) {
            p.shadow.scaleX = moving ? 1.12 : 1;
            p.shadow.scaleY = 1;
            p.shadow.alpha = airborne ? 0.12 : 0.34;
        }

        const rageBoost = this.curupiraHealth <= 25 ? 0.16 : 0;
        const prepareBoost = state === 'PREPARE' ? 0.32 : 0;
        const attackBoost = state === 'ATTACK' ? 0.5 : 0;
        const vulnerableDrop = (state === 'VULNERABLE' || state === 'HIT') ? -0.18 : 0;
        const glowAlpha = Math.max(
            0.12,
            Math.min(
                0.95,
                0.28 + (menace + 1) * 0.08 + prepareBoost + attackBoost + vulnerableDrop + rageBoost
            )
        );
        if (p.eyeGlowL && p.eyeGlowL.active !== false) p.eyeGlowL.alpha = glowAlpha;
        if (p.eyeGlowR && p.eyeGlowR.active !== false) p.eyeGlowR.alpha = glowAlpha;

        const fireStateBoost = (state === 'PREPARE' ? 1.08 : state === 'ATTACK' ? 1.14 : state === 'VULNERABLE' ? 0.9 : 1) +
            (this.curupiraHealth <= 25 ? 0.08 : 0);
        p.hairRig.y = -18 + Math.sin(time * 0.012) * 1.0;
        p.hairRig.angle = Math.sin(time * 0.009) * 2 - facing * (moving ? Math.min(4, speedX / 85) : 0);
        p.hairRig.scaleX = 1;
        p.hairRig.scaleY = fireStateBoost;

        const flameBaseY = [-11,-16,-19,-20,-16,-11];
        const flameBaseAngle = [-16,-9,-3,4,10,16];
        if (Array.isArray(p.hairFlames)) {
            p.hairFlames.forEach((flame,index)=>{
                if (!flame || flame.active === false) return;
                const wave = Math.sin(time * (0.0105 + index * 0.0013) + index * 0.9);
                flame.y = (flameBaseY[index] ?? flame.y) + wave * 1.4;
                flame.scaleX = 1 - wave * 0.025;
                flame.scaleY = 1 + wave * 0.055;
                flame.angle = (flameBaseAngle[index] ?? 0) + wave * 3.2;
                flame.alpha = 0.9 + (wave + 1) * 0.04;
            });
        }
        if (Array.isArray(p.hairInnerFlames)) {
            p.hairInnerFlames.forEach((flame,index)=>{
                if (!flame || flame.active === false) return;
                const pulse = Math.sin(time * (0.012 + (index % 4) * 0.001) + index);
                flame.scaleX = 1;
                flame.scaleY = 1 + pulse * 0.035;
                flame.alpha = Math.max(
                    0.52,
                    Math.min(
                        1,
                        0.72 + pulse * 0.1 + attackBoost * 0.18
                    )
                );
            });
        }

        if (state === 'INTRO') {
            p.leftLegRig.angle = -4 + breath * 2;
            p.rightLegRig.angle = 4 - breath * 2;
            p.leftArmRig.angle = 18 + breath * 3;
            p.rightArmRig.angle = -18 - breath * 3;
            p.leftForearmRig.angle = -22;
            p.rightForearmRig.angle = 22;
            return;
        }

        if (airborne) {
            const rising = vy < 0;
            p.leftLegRig.angle = rising ? -28 : 20;
            p.rightLegRig.angle = rising ? 26 : -20;
            p.leftShinRig.angle = rising ? 44 : 24;
            p.rightShinRig.angle = rising ? 36 : 30;
            p.leftArmRig.angle = rising ? 52 : 34;
            p.rightArmRig.angle = rising ? -52 : -34;
            p.leftForearmRig.angle = -32;
            p.rightForearmRig.angle = 32;
            p.torsoRig.angle = facing * (rising ? -7 : 8);
            p.headRig.angle = breath + playerDelta * 2.2 + facing * (rising ? -3 : 5);
            p.hairRig.angle = Math.sin(time * 0.009) * 2 - facing * 8;
            return;
        }

        if (attack) {
            if (this.curupiraAttackPattern === 0) {
                p.leftLegRig.angle = step * 38;
                p.rightLegRig.angle = opposite * 38;
                p.leftShinRig.angle = Math.max(0,-step) * 34;
                p.rightShinRig.angle = Math.max(0,step) * 34;
                p.leftArmRig.angle = opposite * 40 - 22;
                p.rightArmRig.angle = step * 40 + 25;
                p.leftForearmRig.angle = -30;
                p.rightForearmRig.angle = -42;
                p.torsoRig.angle = facing * -13;
                p.headRig.angle = breath + playerDelta * 2.2 + facing * 6;
                p.backLeaves.angle = -facing * 12;
            } else if (this.curupiraAttackPattern === 1) {
                p.leftLegRig.angle = -30;
                p.rightLegRig.angle = 30;
                p.leftShinRig.angle = 46;
                p.rightShinRig.angle = 46;
                p.leftArmRig.angle = 66;
                p.rightArmRig.angle = -66;
                p.leftForearmRig.angle = -38;
                p.rightForearmRig.angle = 38;
                p.torsoRig.angle = 0;
                p.headRig.angle = breath + playerDelta * 2.2 + facing * 3;
            } else if (this.curupiraAttackPattern === 2) {
                const feint = Math.sin(time * 0.026);
                p.leftLegRig.angle = feint * 24;
                p.rightLegRig.angle = -feint * 24;
                p.leftShinRig.angle = Math.max(0,-feint) * 20;
                p.rightShinRig.angle = Math.max(0,feint) * 20;
                p.leftArmRig.angle = 56 + feint * 11;
                p.rightArmRig.angle = -72 - feint * 9;
                p.leftForearmRig.angle = -58;
                p.rightForearmRig.angle = 50;
                p.torsoRig.angle = facing * 11;
                p.headRig.angle = breath + playerDelta * 2.2 - facing * 5;
            } else if (this.curupiraAttackPattern === 3) {
                p.leftArmRig.angle = 42;
                p.rightArmRig.angle = -42;
                p.leftForearmRig.angle = -20;
                p.rightForearmRig.angle = 20;
                p.torsoRig.scaleX = 1.06;
                p.headRig.angle = -8;
                p.hairRig.scaleX = 1.16;
                p.hairRig.scaleY = 1.06;
            } else {
                p.leftLegRig.angle = -10;
                p.rightLegRig.angle = 10;
                p.leftArmRig.angle = 30;
                p.rightArmRig.angle = -30;
                p.torsoRig.angle = facing * -4;
                p.hairRig.scaleX = 0.96;
                p.hairRig.scaleY = 0.86;
            }
            return;
        }

        if (moving) {
            p.leftLegRig.angle = step * 33;
            p.rightLegRig.angle = opposite * 33;
            p.leftShinRig.angle = Math.max(0,-step) * 31;
            p.rightShinRig.angle = Math.max(0,step) * 31;
            p.leftArmRig.angle = opposite * 34;
            p.rightArmRig.angle = step * 34;
            p.leftForearmRig.angle = -14 + Math.max(0,opposite) * 21;
            p.rightForearmRig.angle = 14 - Math.max(0,step) * 21;
            p.torsoRig.y = -2 + breath * 1.5 + Math.abs(step) * 2.3;
            p.headRig.y = -42 + breath * 0.75 + Math.abs(step) * 1.1;
            p.torsoRig.angle = facing * step * 3.4;
            p.headRig.angle = breath + playerDelta * 2.2 - facing * step * 1.8;
            p.backLeaves.angle = -facing * (5 + Math.abs(step) * 5);
        } else {
            p.leftLegRig.angle = -6 + breath * 3;
            p.rightLegRig.angle = 6 - breath * 3;
            p.leftShinRig.angle = 6 + Math.max(0,breath) * 3;
            p.rightShinRig.angle = -3 + Math.max(0,-breath) * 3;
            p.leftArmRig.angle = 22 + breath * 5;
            p.rightArmRig.angle = -22 - breath * 5;
            p.leftForearmRig.angle = -28 + breath * 4;
            p.rightForearmRig.angle = 28 - breath * 4;
            p.torsoRig.angle = breath * 1.7;
        }

        if (state === 'PREPARE') {
            p.leftLegRig.angle *= 0.45;
            p.rightLegRig.angle *= 0.45;
            p.leftShinRig.angle += 8;
            p.rightShinRig.angle += 8;
            p.leftArmRig.angle += 18;
            p.rightArmRig.angle -= 22;
            p.leftForearmRig.angle -= 14;
            p.rightForearmRig.angle += 14;
            p.torsoRig.y = -2 + breath * 1.5 + 3;
            p.torsoRig.angle += facing * 5;
            p.headRig.angle = breath + playerDelta * 2.2 - facing * 3;
            p.backLeaves.angle = -facing * 9;
            if (this.curupiraAttackPattern === 0) {
                p.hairRig.angle = -facing * 9;
            } else if (this.curupiraAttackPattern === 1) {
                p.hairRig.scaleY = 1.18;
            } else if (this.curupiraAttackPattern === 3) {
                p.hairRig.scaleX = 1.16;
                p.hairRig.scaleY = 1.04;
                p.headRig.angle = -7;
                p.torsoRig.scaleX = 1.04;
            } else if (this.curupiraAttackPattern === 4) {
                p.hairRig.scaleX = 0.95;
                p.hairRig.scaleY = 0.80;
            }
        }

        if (state === 'VULNERABLE' || state === 'RECOVERY' || state === 'HIT') {
            p.leftArmRig.angle += 24;
            p.rightArmRig.angle -= 24;
            p.leftForearmRig.angle += 11;
            p.rightForearmRig.angle -= 11;
            p.leftLegRig.angle *= 0.45;
            p.rightLegRig.angle *= 0.45;
            p.headRig.angle = breath + playerDelta * 2.2 + facing * 7;
            p.torsoRig.y = -2 + breath * 1.5 + 2;
        }
    }

    updateCurupira (time)
    {
        if (!this.arenaStarted) return;
        if (this.arenaCleared || this.curupiraState === 'DEFEATED' || !this.curupira?.body?.enable) return;

        if (this.curupiraVisual && this.curupiraVisual.active) {
            this.curupiraVisual.setPosition(
                this.curupira.x,
                this.curupira.y + this.curupiraVisualOffsetY
            );
            this.animateCurupiraVisual(time);
        }
        if (this.curupiraState === 'INTRO') return;

        if (this.curupiraState === 'PREPARE') {
            this.curupira.body.setVelocity(0, 0);
            if (time >= this.curupiraNextActionAt) {
                if (this.curupiraVisual) {
                    this.curupiraVisual.setAngle(0);
                    this.curupiraVisual.setScale(this.curupiraBaseScale);
                }
                this.curupiraState = 'ATTACK';
                this.curupiraAttackSerial += 1;

                if (this.curupiraAttackPattern === 0) this.curupiraDash(time);
                else if (this.curupiraAttackPattern === 1) this.curupiraJump(time);
                else if (this.curupiraAttackPattern === 2) this.curupiraFeint(time);
                else if (this.curupiraAttackPattern === 3) this.curupiraWhistle(time);
                else this.curupiraFalseTrail(time);
            }
            return;
        }

        if (this.curupiraState === 'RECOVERY') {
            this.curupira.body.setVelocityX(0);
            if (time >= this.curupiraNextActionAt) {
                if (this.curupiraWillChain && this.curupiraComboCount < 1) {
                    this.curupiraWillChain = false;
                    this.curupiraComboCount += 1;
                    this.beginCurupiraPreparation(time);
                } else {
                    this.enterCurupiraVulnerable(time);
                }
            }
            return;
        }

        if (this.curupiraState === 'VULNERABLE') {
            this.curupira.body.setVelocity(0, 0);
            if (time >= this.curupiraNextActionAt) {
                this.resetCurupiraPose();
                this.beginCurupiraPreparation(time + 90);
            }
            return;
        }

        if (this.curupiraState === 'HIT') {
            this.curupira.body.setVelocity(0, 0);
            if (time >= this.curupiraNextActionAt) {
                this.resetCurupiraPose();
                this.beginCurupiraPreparation(time + 90);
            }
            return;
        }

        if (this.curupiraAttackPattern === 1 && this.curupiraLandingMarker && this.curupiraLandingDangerUntil > 0) {
            this.curupiraLandingMarker.setPosition(this.curupira.x, 640);
        }

        if (this.curupiraAttackPattern === 1 && this.curupira.body.blocked.down && this.curupiraLandingDangerUntil > 0) {
            if (!this.curupiraLandingImpactShown) {
                this.curupiraLandingImpactShown = true;
                this.showCurupiraLandingImpact();
            }

            if (time <= this.curupiraLandingDangerUntil) {
                if (Math.abs(this.player.x - this.curupira.x) < 150 && Math.abs(this.player.y - this.curupira.y) < 115) {
                    this.damagePlayer(35, this.player.x < this.curupira.x ? -180 : 180, -135);
                }
            } else {
                this.clearCurupiraLandingMarker();
                this.curupiraLandingDangerUntil = 0;
                this.enterCurupiraRecovery(time, 135);
            }
        }
    }

    curupiraDash (time)
    {
        const fromLeft = this.curupira.x < (this.arenaMinX + this.arenaMaxX) / 2;
        const direction = fromLeft ? 1 : -1;
        this.curupira.setPosition(fromLeft ? this.arenaMinX + 40 : this.arenaMaxX - 40, 590);
        this.curupira.body.setVelocityX(direction * 420);
        this.showCurupiraDashLeaves(direction);
        this.showCurupiraDashTrail(direction);

        this.scheduleCurupiraAttackCall(620, () => {
            if (this.curupiraState === 'ATTACK') {
                this.curupira.body.setVelocityX(0);
                this.enterCurupiraRecovery(this.time.now, 135);
            }
        });
    }

    curupiraJump (time)
    {
        const direction = this.player.x < this.curupira.x ? -1 : 1;
        this.curupiraAirJumpUsed = false;
        this.curupiraLandingImpactShown = false;
        this.createCurupiraLandingMarker();
        if (this.curupiraVisual?.parts) {
            this.curupiraVisual.parts.torsoRig.y += 3;
            this.curupiraVisual.parts.hairRig.setScale(1.03, 1.16);
        }
        this.curupira.body.setVelocity(direction * 190, -560);
        this.curupiraLandingDangerUntil = time + 1220;

        if (this.curupiraHealth <= 75) {
            this.scheduleCurupiraAttackCall(330, () => {
                if (this.curupiraState !== 'ATTACK' ||
                    this.curupiraAttackPattern !== 1 ||
                    this.curupiraAirJumpUsed ||
                    this.curupira.body.blocked.down) return;

                this.curupiraAirJumpUsed = true;
                this.showCurupiraAirJumpTelegraph();

                this.scheduleCurupiraAttackCall(180, () => {
                    if (this.curupiraState !== 'ATTACK' ||
                        this.curupiraAttackPattern !== 1 ||
                        this.curupira.body.blocked.down) return;

                    const towardPlayer = this.player.x < this.curupira.x ? -1 : 1;
                    this.curupira.body.setVelocity(towardPlayer * 165, -460);
                    this.curupiraLandingDangerUntil = this.time.now + 1150;
                });
            });
        }
    }

    showCurupiraAirJumpTelegraph ()
    {
        if (!this.curupiraVisual?.parts) return;
        const p = this.curupiraVisual.parts;
        if (p.hairRig && p.hairRig.active !== false) p.hairRig.setScale(1.08, 1.28);
        if (p.eyeGlowL && p.eyeGlowL.active !== false) p.eyeGlowL.setAlpha(0.95);
        if (p.eyeGlowR && p.eyeGlowR.active !== false) p.eyeGlowR.setAlpha(0.95);
        this.curupiraVisual.setScale(this.curupiraBaseScale * 1.04, this.curupiraBaseScale * 0.92);

        for (let i = 0; i < 6; i += 1) {
            const ember = i % 2 === 0;
            const fx = ember
                ? this.add.circle(this.curupira.x, this.curupira.y - 24, 2.5, 0xf58a2d, 0.78).setDepth(25)
                : this.add.ellipse(this.curupira.x, this.curupira.y - 5, 8, 4, 0x78914f, 0.72).setDepth(24);
            this.trackCurupiraSpecialEffect(fx);
            const side = i % 2 === 0 ? -1 : 1;
            this.tweens.add({
                targets: fx,
                x: fx.x + side * (18 + i * 4),
                y: fx.y - 16 - (i % 3) * 7,
                angle: side * (30 + i * 12),
                alpha: 0,
                duration: 220,
                onComplete: () => this.destroyCurupiraSpecialEffect(fx)
            });
        }
    }

    curupiraFeint (time)
    {
        const direction = this.player.x < this.curupira.x ? -1 : 1;
        this.curupira.body.setVelocityX(-direction * 250);
        if (this.curupiraVisual) this.curupiraVisual.setAngle(-direction * 7);

        this.scheduleCurupiraAttackCall(220, () => {
            if (this.curupiraState === 'ATTACK') {
                if (this.curupiraVisual) this.curupiraVisual.setAngle(direction * 9);
                this.curupira.body.setVelocityX(direction * 360);
                this.showCurupiraDashTrail(direction, 3);
            }
        });

        this.scheduleCurupiraAttackCall(650, () => {
            if (this.curupiraState === 'ATTACK') {
                this.curupira.body.setVelocityX(0);
                if (this.curupiraVisual) this.curupiraVisual.setAngle(0);
                this.enterCurupiraRecovery(this.time.now, 130);
            }
        });
    }

    curupiraWhistle (time)
    {
        this.curupira.body.setVelocity(0, 0);
        this.curupiraWhistleDamageDone = false;

        if (this.curupiraVisual?.parts) {
            const p = this.curupiraVisual.parts;
            if (p.headRig && p.headRig.active !== false) p.headRig.setAngle(-10);
            if (p.torsoRig && p.torsoRig.active !== false) p.torsoRig.setScale(1.07, 1.02);
            if (p.hairRig && p.hairRig.active !== false) p.hairRig.setScale(1.18, 1.08);
            if (p.eyeGlowL && p.eyeGlowL.active !== false) p.eyeGlowL.setAlpha(0.94);
            if (p.eyeGlowR && p.eyeGlowR.active !== false) p.eyeGlowR.setAlpha(0.94);
        }

        for (let i = 0; i < 3; i += 1) {
            const cue = this.add.ellipse(
                this.curupira.x,
                this.curupira.y - 25,
                26 + i * 12,
                14 + i * 6,
                0xd6b56c,
                0.10
            ).setDepth(23);
            cue.setStrokeStyle(2, 0xf1e1ae, 0.30);
            this.trackCurupiraSpecialEffect(cue);
            this.tweens.add({
                targets: cue,
                scaleX: 1.35,
                scaleY: 1.28,
                alpha: 0,
                duration: 360 + i * 60,
                onComplete: () => this.destroyCurupiraSpecialEffect(cue)
            });
        }

        this.scheduleCurupiraAttackCall(420, () => {
            if (this.curupiraState !== 'ATTACK' || this.curupiraAttackPattern !== 3) return;
            this.releaseCurupiraWhistle();
        });

        this.scheduleCurupiraAttackCall(760, () => {
            if (this.curupiraState === 'ATTACK' && this.curupiraAttackPattern === 3) {
                this.enterCurupiraRecovery(this.time.now, 135);
            }
        });
    }

    releaseCurupiraWhistle ()
    {
        for (let i = 0; i < 4; i += 1) {
            const wave = this.add.ellipse(
                this.curupira.x,
                this.curupira.y - 18,
                50,
                30,
                0x9fc6a0,
                0.05
            ).setDepth(22);
            wave.setStrokeStyle(3, i % 2 === 0 ? 0xd6b56c : 0xa8c99a, 0.55);
            this.trackCurupiraSpecialEffect(wave);
            this.tweens.add({
                targets: wave,
                scaleX: 5.6 + i * 0.42,
                scaleY: 4.0 + i * 0.26,
                alpha: 0,
                duration: 430 + i * 80,
                delay: i * 45,
                ease: 'Quad.Out',
                onComplete: () => this.destroyCurupiraSpecialEffect(wave)
            });
        }

        if (!this.curupiraWhistleDamageDone) {
            this.curupiraWhistleDamageDone = true;
            const dx = this.player.x - this.curupira.x;
            const dy = this.player.y - this.curupira.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= 300) {
                const direction = dx < 0 ? -1 : 1;
                this.damagePlayer(20, direction * 170, -85);
            }
        }
    }

    createCurupiraFalseTrailFootprints ()
    {
        const baseY = 636;
        [-1, 1].forEach(side => {
            for (let i = 0; i < 4; i += 1) {
                const x = this.curupira.x + side * (34 + i * 30);
                const heel = this.add.ellipse(x, baseY - (i % 2) * 3, 12, 7, 0x6e4a31, 0.42)
                    .setDepth(17)
                    .setAngle(side * (i % 2 === 0 ? -12 : 12));
                const toe = this.add.ellipse(x - side * 8, baseY - 1 - (i % 2) * 3, 8, 4, 0x8a6240, 0.38)
                    .setDepth(17);
                this.trackCurupiraSpecialEffect(heel);
                this.trackCurupiraSpecialEffect(toe);
                this.tweens.add({
                    targets: [heel, toe],
                    alpha: 0,
                    duration: 760,
                    delay: i * 70,
                    onComplete: () => {
                        this.destroyCurupiraSpecialEffect(heel);
                        this.destroyCurupiraSpecialEffect(toe);
                    }
                });
            }
        });
    }

    curupiraFalseTrail (time)
    {
        this.curupira.body.setVelocity(0, 0);
        if (this.curupiraVisual) this.curupiraVisual.setAlpha(0.38);

        this.scheduleCurupiraAttackCall(260, () => {
            if (this.curupiraState !== 'ATTACK' || this.curupiraAttackPattern !== 4) return;

            const playerX = this.player.x;
            const leftCandidate = Math.max(this.arenaMinX + 55, playerX - 190);
            const rightCandidate = Math.min(this.arenaMaxX - 55, playerX + 190);
            const leftDistance = Math.abs(leftCandidate - playerX);
            const rightDistance = Math.abs(rightCandidate - playerX);
            let targetX = this.curupira.x < playerX ? rightCandidate : leftCandidate;

            if (Math.abs(targetX - playerX) < 140) {
                targetX = rightDistance >= leftDistance ? rightCandidate : leftCandidate;
            }
            if (Math.abs(targetX - playerX) < 140) {
                targetX = playerX < (this.arenaMinX + this.arenaMaxX) / 2
                    ? Math.min(this.arenaMaxX - 55, playerX + 140)
                    : Math.max(this.arenaMinX + 55, playerX - 140);
            }

            this.curupira.setPosition(targetX, 590);
            if (this.curupiraVisual) {
                this.curupiraVisual.setAlpha(1);
                this.curupiraVisual.setPosition(
                    this.curupira.x,
                    this.curupira.y + this.curupiraVisualOffsetY
                );
            }
            if (this.curupiraVisual?.parts?.hairRig &&
                this.curupiraVisual.parts.hairRig.active !== false) {
                this.curupiraVisual.parts.hairRig.setScale(1.10, 1.18);
            }

            const direction = this.player.x < this.curupira.x ? -1 : 1;
            this.curupira.body.setVelocityX(direction * 340);
            this.showCurupiraDashTrail(direction, 3);
            this.showCurupiraDashLeaves(direction);
        });

        this.scheduleCurupiraAttackCall(700, () => {
            if (this.curupiraState === 'ATTACK' && this.curupiraAttackPattern === 4) {
                this.curupira.body.setVelocityX(0);
                this.enterCurupiraRecovery(this.time.now, 130);
            }
        });
    }

    trackCurupiraSpecialEffect (effect)
    {
        if (effect) this.curupiraSpecialEffects.push(effect);
        return effect;
    }

    destroyCurupiraSpecialEffect (effect)
    {
        const index = this.curupiraSpecialEffects.indexOf(effect);
        if (index >= 0) this.curupiraSpecialEffects.splice(index, 1);
        if (effect?.active) effect.destroy();
    }

    clearCurupiraSpecialEffects ()
    {
        this.curupiraSpecialEffects.forEach(effect => {
            if (!effect?.active) return;
            this.tweens.killTweensOf(effect);
            effect.destroy();
        });
        this.curupiraSpecialEffects.length = 0;
    }

    scheduleCurupiraAttackCall (delay, callback)
    {
        const timer = this.time.delayedCall(delay, () => {
            const index = this.curupiraAttackTimers.indexOf(timer);
            if (index >= 0) this.curupiraAttackTimers.splice(index, 1);
            if (this.arenaCleared || this.curupiraState === 'DEFEATED' || !this.curupira?.body?.enable) return;
            callback();
        });
        this.curupiraAttackTimers.push(timer);
        return timer;
    }

    enterCurupiraRecovery (time, duration = 135)
    {
        if (this.arenaCleared || this.curupiraState === 'DEFEATED' || !this.curupira?.body?.enable) return;
        this.curupira.body.setVelocity(0, 0);
        this.curupiraState = 'RECOVERY';
        const recoveryDuration = this.curupiraHealth <= 25 ? Math.min(duration, 120) : Math.min(duration, 135);
        this.curupiraNextActionAt = time + recoveryDuration;
        this.curupiraWillChain = this.curupiraComboCount === 0 && (
            this.curupiraForcedNextPattern !== null ||
            (this.curupiraAttackSerial > 0 && this.curupiraAttackSerial % 2 === 0)
        );

        if (this.curupiraVisual) {
            this.curupiraVisual.setAlpha(0.92);
            this.curupiraVisual.setAngle(this.player.x < this.curupira.x ? 4 : -4);
            this.curupiraVisual.setScale(this.curupiraBaseScale, this.curupiraBaseScale * 0.97);
        }
    }

    enterCurupiraVulnerable (time)
    {
        if (this.arenaCleared || this.curupiraState === 'DEFEATED' || !this.curupira?.body?.enable) return;
        this.curupira.body.setVelocity(0, 0);
        this.curupiraState = 'VULNERABLE';
        this.curupiraComboCount = 0;
        this.curupiraWillChain = false;
        this.curupiraNextActionAt = time + (this.curupiraHealth <= 25 ? 620 : 700);

        if (this.curupiraVisual) {
            this.curupiraVisual.setAlpha(0.62);
            this.curupiraVisual.setAngle(this.player.x < this.curupira.x ? 9 : -9);
            this.curupiraVisual.setScale(this.curupiraBaseScale, this.curupiraBaseScale * 0.90);
        }

        const tiredLeaf = this.add.ellipse(
            this.curupira.x,
            this.curupira.y - 112,
            13,
            6,
            0x8aa85e,
            0.7
        ).setDepth(24);
        this.tweens.add({
            targets: tiredLeaf,
            y: tiredLeaf.y - 20,
            x: tiredLeaf.x + 8,
            angle: 35,
            alpha: 0,
            duration: 650,
            onComplete: () => tiredLeaf.destroy()
        });
    }

    resetCurupiraPose ()
    {
        if (!this.curupiraVisual || !this.curupiraVisual.active) return;
        this.resetCurupiraRigParts();
        this.curupiraVisual
            .setAlpha(1)
            .setAngle(0)
            .setScale(this.curupiraBaseScale)
            .setPosition(this.curupira.x, this.curupira.y + this.curupiraVisualOffsetY);
    }

    handleCurupiraContact ()
    {
        if (!this.arenaStarted || this.arenaCleared || this.curupiraState === 'DEFEATED' || !this.curupira?.body?.enable || this.curupiraState !== 'ATTACK') return;
        this.damagePlayer(25, this.player.x < this.curupira.x ? -180 : 180, -80);
    }

    tryHitCurupira ()
    {
        if (!this.isAttacking || !this.attackHitbox.body.enable || this.arenaCleared) return;

        if (this.curupiraState !== 'VULNERABLE') {
            if (!this.attackBlockCurupiraRegistered) {
                this.attackBlockCurupiraRegistered = true;
                this.showCurupiraBlockFeedback();
            }
            return;
        }

        if (this.attackHitCurupiraRegistered) return;
        this.attackHitCurupiraRegistered = true;

        this.curupiraHealth = Math.max(0, this.curupiraHealth - 25);
        const targetWidth = 340 * (this.curupiraHealth / 100);
        this.tweens.killTweensOf(this.curupiraBossBar);
        this.tweens.add({
            targets: this.curupiraBossBar,
            width: targetWidth,
            duration: 180,
            ease: 'Quad.Out'
        });
        this.curupiraBossText.setText(`${this.curupiraHealth}/100`);

        this.showCurupiraValidHitFeedback();

        if (this.curupiraHealth <= 0) {
            this.defeatCurupira();
        } else {
            this.curupiraState = 'HIT';
            this.curupiraNextActionAt = this.time.now + 420;
        }
    }

    showCurupiraBlockFeedback ()
    {
        if (!this.curupiraVisual || this.curupiraState === 'DEFEATED') return;
        const originalAngle = this.curupiraVisual.angle;
        this.showBlockDeflect(
            this.curupira.x - this.attackDirection * 18,
            this.curupira.y - 6,
            false
        );
        this.curupiraVisual.setAlpha(0.42);
        this.curupiraVisual.setAngle(originalAngle + (this.attackDirection * 6));

        const block = this.add.circle(
            this.curupira.x - this.attackDirection * 24,
            this.curupira.y - 8,
            10,
            0xd6b56c,
            0.26
        ).setDepth(25);
        block.setStrokeStyle(2, 0xffe0a3, 0.72);

        for (let i = 0; i < 4; i += 1) {
            const spark = this.add.circle(
                block.x,
                block.y,
                2.2,
                i % 2 === 0 ? 0xffd36a : 0xe9782d,
                0.8
            ).setDepth(26);
            this.tweens.add({
                targets: spark,
                x: spark.x + this.attackDirection * (10 + i * 5),
                y: spark.y - 12 + i * 7,
                alpha: 0,
                duration: 150 + i * 25,
                onComplete: () => spark.destroy()
            });
        }

        this.tweens.add({
            targets: block,
            scale: 1.9,
            alpha: 0,
            duration: 180,
            onComplete: () => block.destroy()
        });

        this.time.delayedCall(105, () => {
            if (!this.arenaCleared && this.curupiraState !== 'DEFEATED' && this.curupiraState !== 'VULNERABLE' && this.curupiraVisual) {
                this.curupiraVisual.setAlpha(1);
                this.curupiraVisual.setAngle(originalAngle);
            }
        });
    }

    showCurupiraValidHitFeedback ()
    {
        if (!this.curupiraVisual || this.curupiraState === 'DEFEATED') return;
        const hitDirection = this.player.x < this.curupira.x ? 1 : -1;
        this.showCombatImpact(
            this.curupira.x,
            this.curupira.y - 7,
            this.curupiraVisual,
            { boss: true }
        );
        this.curupiraVisual.setAlpha(0.24);
        this.curupiraVisual.setAngle(hitDirection * 12);
        this.curupiraVisual.setScale(this.curupiraBaseScale * 1.04, this.curupiraBaseScale * 0.92);

        if (this.curupiraVisual.parts) {
            this.curupiraVisual.parts.headRig.angle += hitDirection * 10;
            this.curupiraVisual.parts.torsoRig.angle += hitDirection * 7;
            this.curupiraVisual.parts.hairRig.setScale(1.12, 1.04);
        }

        const hitFlash = this.add.circle(this.curupira.x, this.curupira.y - 8, 18, 0xf1e1ae, 0.46).setDepth(25);
        this.tweens.add({
            targets: hitFlash,
            scale: 2.2,
            alpha: 0,
            duration: 150,
            onComplete: () => hitFlash.destroy()
        });

        for (let i = 0; i < 6; i += 1) {
            const particle = this.add.ellipse(
                this.curupira.x,
                this.curupira.y - 10,
                i % 2 === 0 ? 7 : 5,
                3,
                i % 2 === 0 ? 0x8aa85e : 0xe15a26,
                0.8
            ).setDepth(26);
            const side = i % 2 === 0 ? -1 : 1;
            this.tweens.add({
                targets: particle,
                x: particle.x + side * (22 + i * 5),
                y: particle.y - 18 - (i % 3) * 7,
                angle: side * (35 + i * 18),
                alpha: 0,
                duration: 230 + i * 25,
                onComplete: () => particle.destroy()
            });
        }

        this.time.delayedCall(110, () => {
            if (!this.arenaCleared && this.curupiraState === 'HIT' && this.curupiraVisual) {
                this.curupiraVisual.setAlpha(0.82);
                this.curupiraVisual.setAngle(hitDirection * 7);
                this.curupiraVisual.setScale(this.curupiraBaseScale, this.curupiraBaseScale * 0.94);
            }
        });
    }

    showCurupiraDashTrail (direction, count = 4)
    {
        for (let i = 0; i < count; i += 1) {
            const trail = this.add.ellipse(
                this.curupira.x - direction * (18 + i * 12),
                this.curupira.y - 6 + (i % 2) * 10,
                28 - i * 3,
                12 - i,
                i % 2 === 0 ? 0xe05a28 : 0x6f8f4e,
                0.16
            ).setDepth(19);
            this.tweens.add({
                targets: trail,
                x: trail.x - direction * (20 + i * 8),
                scaleX: 1.45,
                alpha: 0,
                duration: 170 + i * 35,
                onComplete: () => trail.destroy()
            });
        }
    }

    showCurupiraDashLeaves (direction)
    {
        for (let i = 0; i < 5; i += 1) {
            const leaf = this.add.ellipse(
                this.curupira.x - direction * (12 + i * 6),
                this.curupira.y + 28 - (i % 2) * 8,
                10,
                5,
                i % 2 === 0 ? 0x6d874b : 0x8b6d43,
                0.6
            ).setDepth(18);

            this.tweens.add({
                targets: leaf,
                x: leaf.x - direction * (24 + i * 5),
                y: leaf.y - 10 - (i % 3) * 5,
                angle: direction * (35 + i * 18),
                alpha: 0,
                duration: 320 + i * 35,
                onComplete: () => leaf.destroy()
            });
        }
    }

    createCurupiraLandingMarker ()
    {
        this.clearCurupiraLandingMarker();
        this.curupiraLandingMarker = this.add.ellipse(
            this.curupira.x,
            640,
            280,
            48,
            0xb15f3a,
            0.18
        ).setDepth(15);
        this.curupiraLandingMarker.setStrokeStyle(2, 0xd6b56c, 0.38);

        this.tweens.add({
            targets: this.curupiraLandingMarker,
            alpha: { from: 0.12, to: 0.3 },
            scaleX: 1.08,
            duration: 240,
            yoyo: true,
            repeat: -1
        });
    }

    showCurupiraLandingImpact ()
    {
        if (this.curupiraLandingMarker) {
            this.curupiraLandingMarker.setPosition(this.curupira.x, 640);
        }

        const ring = this.add.ellipse(this.curupira.x, 640, 120, 28, 0xd6b56c, 0.30).setDepth(18);
        this.tweens.add({
            targets: ring,
            scaleX: 2.55,
            scaleY: 1.75,
            alpha: 0,
            duration: 320,
            onComplete: () => ring.destroy()
        });

        for (let i = 0; i < 11; i += 1) {
            const direction = i < 4 ? -1 : 1;
            const isDust = i >= 6;
            const particle = isDust
                ? this.add.circle(this.curupira.x, 634, 4 + (i % 2), 0x8b6b4e, 0.32).setDepth(18)
                : this.add.ellipse(this.curupira.x, 630, 9, 4, i % 2 === 0 ? 0x6d874b : 0x755137, 0.7).setDepth(19);
            this.tweens.add({
                targets: particle,
                x: this.curupira.x + direction * (30 + (i % 4) * 18),
                y: 610 - (i % 4) * 8,
                angle: direction * (35 + i * 16),
                scale: isDust ? 1.7 : 1,
                alpha: 0,
                duration: 330 + i * 25,
                onComplete: () => particle.destroy()
            });
        }

        this.cameras.main.shake(110, 0.0030);
        if (this.curupiraVisual) {
            this.tweens.add({
                targets: this.curupiraVisual,
                scaleX: this.curupiraBaseScale * 1.05,
                scaleY: this.curupiraBaseScale * 0.90,
                duration: 70,
                yoyo: true,
                ease: 'Quad.Out'
            });
        }
    }

    clearCurupiraLandingMarker ()
    {
        if (this.curupiraLandingMarker) {
            this.tweens.killTweensOf(this.curupiraLandingMarker);
            this.curupiraLandingMarker.destroy();
            this.curupiraLandingMarker = null;
        }
    }

    defeatCurupira ()
    {
        if (this.curupiraState === 'DEFEATED') return;

        this.arenaCleared = true;
        this.curupiraState = 'DEFEATED';
        this.curupiraLandingDangerUntil = 0;
        this.curupiraWillChain = false;
        this.curupiraForcedNextPattern = null;

        this.curupiraAttackTimers.forEach(timer => timer?.remove(false));
        this.curupiraAttackTimers.length = 0;
        this.clearCurupiraSpecialEffects();
        this.clearCurupiraLandingMarker();

        if (this.curupira?.body) {
            this.curupira.body.setVelocity(0, 0);
            this.curupira.body.enable = false;
        }

        this.curupiraBossText.setText('0/100');
        this.tweens.killTweensOf(this.curupiraBossBar);
        this.tweens.add({
            targets: this.curupiraBossBar,
            width: 0,
            duration: 180,
            ease: 'Quad.Out'
        });

        const recoil = this.player.x < this.curupira.x ? 22 : -22;
        const visual = this.curupiraVisual;
        if (visual) {
            visual.setPosition(
                this.curupira.x + recoil,
                this.curupira.y + this.curupiraVisualOffsetY + 4
            );
            this.tweens.killTweensOf(visual);
            if (visual.parts) {
                Object.values(visual.parts).forEach(part => {
                    if (Array.isArray(part)) part.forEach(item => item && this.tweens.killTweensOf(item));
                    else if (part) this.tweens.killTweensOf(part);
                });
                visual.parts.eyeGlowL.setAlpha(0);
                visual.parts.eyeGlowR.setAlpha(0);
                visual.parts.hairRig.setScale(1, 0.72);
                visual.parts.headRig.angle += recoil > 0 ? 8 : -8;
                visual.parts.torsoRig.angle += recoil > 0 ? 10 : -10;
            }
            visual.setAngle(recoil > 0 ? 10 : -10);

            for (let i = 0; i < 10; i += 1) {
                const ember = i % 2 === 0;
                const particle = ember
                    ? this.add.circle(this.curupira.x, this.curupira.y - 42, 2.5, i % 4 === 0 ? 0xffb137 : 0xe45a27, 0.82).setDepth(25)
                    : this.add.ellipse(this.curupira.x, this.curupira.y - 10, 9, 4, 0x6f8f4e, 0.72).setDepth(24);
                const side = i % 2 === 0 ? -1 : 1;
                this.tweens.add({
                    targets: particle,
                    x: particle.x + side * (25 + i * 4),
                    y: particle.y - 22 - (i % 4) * 9,
                    angle: side * i * 28,
                    alpha: 0,
                    duration: 300 + i * 24,
                    onComplete: () => particle.destroy()
                });
            }

            this.tweens.add({
                targets: visual,
                y: visual.y + 18,
                angle: recoil > 0 ? 18 : -18,
                scaleX: this.curupiraBaseScale * 0.94,
                scaleY: this.curupiraBaseScale * 0.80,
                alpha: 0,
                duration: 430,
                ease: 'Quad.In',
                onComplete: () => {
                    if (visual.active) {
                        visual.setVisible(false);
                        visual.destroy(true);
                    }
                    if (this.curupiraVisual === visual) this.curupiraVisual = null;
                }
            });
        }

        this.time.delayedCall(440, () => {
            this.curupiraBossHud.setVisible(false);
            this.arenaBarrier.setVisible(false);
            this.arenaBarrier.body.enable = false;

            const panel = this.add.rectangle(512, 350, 620, 190, 0x06100d, 0.92).setScrollFactor(0).setDepth(190);
            const text = this.add.text(
                512,
                325,
                'A floresta testou seus passos.',
                { fontFamily: 'Arial', fontSize: '23px', color: '#c8d8cc' }
            ).setOrigin(0.5).setScrollFactor(0).setDepth(191);

            this.time.delayedCall(650, () => {
                const skill = this.add.text(
                    512,
                    390,
                    'HABILIDADE DESBLOQUEADA\nSALTO DUPLO',
                    { fontFamily: 'Arial Black', fontSize: '29px', color: '#f1e1ae', align: 'center' }
                ).setOrigin(0.5).setScrollFactor(0).setDepth(191);

                this.showDoubleJumpUnlockEffect();

                this.time.delayedCall(1050, () => {
                    this.doubleJumpUnlocked = true;
                    this.firstDoubleJumpPending = true;
                    this.stamina = this.maxStamina;
                    this.staminaRegenBlockedUntil = 0;
                    this.staminaHud.setVisible(true);
                    this.updateStaminaHud();
                    this.registry.set('doubleJumpUnlocked', true);
                    panel.destroy();
                    text.destroy();
                    skill.destroy();
                    this.showDoubleJumpTutorial();
                });
            });
        });
    }

    showDoubleJumpUnlockEffect ()
    {
        const ring = this.add.circle(this.player.x, this.player.y, 18, 0xd6b56c, 0.2).setDepth(40);
        ring.setStrokeStyle(2, 0xf1e1ae, 0.5);

        this.tweens.add({
            targets: ring,
            scale: 4,
            alpha: 0,
            duration: 700,
            onComplete: () => ring.destroy()
        });

        for (let i = 0; i < 8; i += 1) {
            const angle = (Math.PI * 2 * i) / 8;
            const leaf = this.add.ellipse(
                this.player.x,
                this.player.y,
                10,
                5,
                i % 2 === 0 ? 0x6f8f4e : 0x8aa85e,
                0.82
            ).setDepth(41);

            this.tweens.add({
                targets: leaf,
                x: this.player.x + Math.cos(angle) * 58,
                y: this.player.y + Math.sin(angle) * 48,
                angle: i * 45,
                alpha: 0,
                duration: 650,
                onComplete: () => leaf.destroy()
            });
        }

        this.tweens.add({
            targets: this.playerVisual,
            alpha: { from: 0.45, to: 1 },
            duration: 140,
            yoyo: true,
            repeat: 3,
            onComplete: () => this.playerVisual.setAlpha(1)
        });
    }

    showDoubleJumpTutorial ()
    {
        const tutorial = this.add.text(512, 220, 'SALTO DUPLO\nNo ar, pressione novamente W / ↑ / Espaço.', { fontFamily: 'Arial Black', fontSize: '21px', color: '#f1e1ae', align: 'center', backgroundColor: '#06100dcc', padding: { x: 18, y: 12 } }).setOrigin(0.5).setScrollFactor(0).setDepth(180);
        this.time.delayedCall(3000, () => tutorial.destroy());
    }

    updateGroundedState (grounded)
    {
        const time = this.time.now;
        if (!grounded) this.lastAirVelocityY = this.player.body.velocity.y;
        if (grounded) this.coyoteUntil = time + this.coyoteTimeMs;

        if (grounded && !this.wasGrounded) {
            this.jumpsUsed = 0;
            this.fastFallActive = false;
            this.showLandingFeedback(this.lastAirVelocityY);
            this.lastAirVelocityY = 0;
        }
        this.wasGrounded = grounded;
    }

    queueJumpInput (time)
    {
        this.jumpBufferUntil = time + this.jumpBufferMs;
    }

    consumeJumpBuffer (grounded)
    {
        if (this.jumpBufferUntil < this.time.now) return false;

        if (
            this.jumpsUsed === 0 &&
            (grounded || this.time.now <= this.coyoteUntil)
        ) {
            this.player.body.setVelocityY(-520);
            this.jumpsUsed = 1;
            this.coyoteUntil = 0;
            this.jumpBufferUntil = 0;
            this.showJumpTakeoffEffect();
            this.setMotionSquash(1.07, 0.93, 115);
            return true;
        }

        if (this.doubleJumpUnlocked && this.jumpsUsed === 1 && !grounded) {
            if (this.stamina < this.doubleJumpStaminaCost) {
                this.showStaminaBlockedFeedback();
                this.jumpBufferUntil = 0;
                return false;
            }

            this.spendStamina(this.doubleJumpStaminaCost);
            this.player.body.setVelocityY(-500);
            this.jumpsUsed = 2;
            this.jumpBufferUntil = 0;
            const isFirstDoubleJump = this.firstDoubleJumpPending;
            this.firstDoubleJumpPending = false;
            this.showDoubleJumpBurst(isFirstDoubleJump);
            this.setMotionSquash(1.045, 0.955, 95);
            return true;
        }

        return false;
    }


    applyJumpCut ()
    {
        if (this.player.body.velocity.y < -90)
        {
            this.player.body.setVelocityY(this.player.body.velocity.y * 0.58);
        }
    }

    applyFastFall (grounded)
    {
        const wantsFastFall = this.keyS.isDown || this.cursors.down.isDown;
        const body = this.player.body;

        if (!grounded && wantsFastFall && body.velocity.y > 35)
        {
            body.setVelocityY(Math.min(780, body.velocity.y + 70));
            this.fastFallActive = true;
            return;
        }

        this.fastFallActive = false;
    }

    setMotionSquash (scaleX, scaleY, duration = 110)
    {
        this.tweens.killTweensOf(this.motionFx);
        this.motionFx.scaleX = scaleX;
        this.motionFx.scaleY = scaleY;
        this.tweens.add({
            targets: this.motionFx,
            scaleX: 1,
            scaleY: 1,
            duration,
            ease: 'Quad.Out'
        });
    }

    showJumpTakeoffEffect ()
    {
        for (let i = 0; i < 3; i += 1)
        {
            const leaf = this.add.ellipse(
                this.player.x + (i - 1) * 8,
                this.player.y + 31,
                7 + i,
                3,
                i === 1 ? 0x8b7650 : 0x668d4d,
                0.55
            ).setDepth(18);

            this.tweens.add({
                targets: leaf,
                x: leaf.x + (i - 1) * 12,
                y: leaf.y + 7 + i * 2,
                alpha: 0,
                angle: (i - 1) * 35,
                duration: 180 + i * 25,
                onComplete: () => leaf.destroy()
            });
        }
    }

    showLandingFeedback (impactVelocity)
    {
        if (impactVelocity < 260)
        {
            return;
        }

        const strong = impactVelocity >= 650;
        const medium = impactVelocity >= 420;
        this.setMotionSquash(
            strong ? 1.1 : medium ? 1.07 : 1.035,
            strong ? 0.86 : medium ? 0.9 : 0.95,
            strong ? 120 : 95
        );

        const particles = strong ? 4 : medium ? 3 : 2;
        for (let i = 0; i < particles; i += 1)
        {
            const direction = i % 2 === 0 ? -1 : 1;
            const dust = this.add.ellipse(
                this.player.x + direction * (7 + i * 2),
                this.player.y + 31,
                9,
                4,
                i % 2 ? 0x756346 : 0x5d7b49,
                medium ? 0.62 : 0.42
            ).setDepth(18);

            this.tweens.add({
                targets: dust,
                x: dust.x + direction * (16 + i * 5),
                y: dust.y - (5 + i * 2),
                alpha: 0,
                scaleX: 1.35,
                duration: strong ? 260 : 210,
                onComplete: () => dust.destroy()
            });
        }

        if (strong)
        {
            this.cameras.main.shake(70, 0.0012);
        }
    }

    showDirectionChangeFeedback (direction)
    {
        this.tweens.killTweensOf(this.directionFx);
        this.directionFx.lean = direction * -5;
        this.tweens.add({
            targets: this.directionFx,
            lean: 0,
            duration: 120,
            ease: 'Quad.Out'
        });
    }


    resetMovementPolishState ()
    {
        this.jumpsUsed = 0;
        this.jumpWasDown = false;
        this.jumpBufferUntil = 0;
        this.coyoteUntil = 0;
        this.wasGrounded = false;
        this.lastAirVelocityY = 0;
        this.fastFallActive = false;
        this.lastMoveDirection = 0;
        this.tweens.killTweensOf(this.motionFx);
        this.tweens.killTweensOf(this.directionFx);
        this.motionFx.scaleX = 1;
        this.motionFx.scaleY = 1;
        this.directionFx.lean = 0;
        this.playerVisual.setScale(this.playerVisual.facing || 1, 1);
    }

    spendStamina (amount)
    {
        this.stamina = Math.max(0, this.stamina - amount);
        this.staminaRegenBlockedUntil = this.time.now + this.staminaRegenDelay;
        this.updateStaminaHud();
    }

    updateStamina (time, grounded)
    {
        const delta = Math.min(0.05, Math.max(0, (time - this.lastStaminaUpdateAt) / 1000));
        this.lastStaminaUpdateAt = time;

        if (
            !this.doubleJumpUnlocked ||
            this.phaseCompleted ||
            this.isPlayerDead ||
            time < this.staminaRegenBlockedUntil ||
            this.stamina >= this.maxStamina
        ) {
            return;
        }

        const rate = grounded ? this.staminaGroundRegen : this.staminaAirRegen;
        this.stamina = Math.min(this.maxStamina, this.stamina + rate * delta);
        this.updateStaminaHud();
    }

    showStaminaBlockedFeedback ()
    {
        if (!this.staminaHud || !this.staminaHud.visible || this.time.now < this.nextStaminaFeedbackAt) return;

        this.nextStaminaFeedbackAt = this.time.now + 220;
        this.tweens.killTweensOf(this.staminaBar);
        this.tweens.add({
            targets: this.staminaBar,
            alpha: 0.25,
            duration: 70,
            yoyo: true,
            repeat: 2,
            onComplete: () => this.staminaBar.setAlpha(1)
        });
    }

    showDoubleJumpBurst (isFirst = false)
    {
        const burst = this.add.circle(
            this.player.x,
            this.player.y + 24,
            isFirst ? 18 : 12,
            0xc8d59b,            isFirst ? 0.5 : 0.35
        ).setDepth(18);

        this.tweens.add({
            targets: burst,
            scale: isFirst ? 3.2 : 2.5,
            alpha: 0,
            duration: isFirst ? 420 : 260,
            onComplete: () => burst.destroy()
        });

        if (isFirst) {
            for (let i = 0; i < 6; i += 1) {
                const angle = (Math.PI * 2 * i) / 6;
                const leaf = this.add.ellipse(
                    this.player.x,
                    this.player.y + 16,
                    9,
                    4,
                    0x7c9954,
                    0.8
                ).setDepth(19);
                this.tweens.add({
                    targets: leaf,
                    x: this.player.x + Math.cos(angle) * 42,
                    y: this.player.y + 16 + Math.sin(angle) * 34,
                    alpha: 0,
                    angle: i * 55,
                    duration: 420,
                    onComplete: () => leaf.destroy()
                });
            }
        }
    }

    createFinalZone ()
    {
        this.finalZone = this.add.rectangle(9600, 320, 150, 190, 0x000000, 0);
        this.physics.add.existing(this.finalZone);
        this.finalZone.body.setAllowGravity(false);
        this.finalZone.body.setImmovable(true);
        this.physics.add.overlap(this.player, this.finalZone, () => this.completeLevel2());
    }

    completeLevel2 ()
    {
        if (this.phaseCompleted || !this.doubleJumpUnlocked) return;
        this.phaseCompleted = true;
        this.player.body.setVelocity(0, 0);
        this.isAttacking = false;
        this.attackHitbox.body.enable = false;

        const overlay = this.add.rectangle(512, 384, 1024, 768, 0x020705, 0.94).setScrollFactor(0).setDepth(300);
        this.add.text(512, 220, 'FASE 2 CONCLUÍDA', { fontFamily: 'Arial Black', fontSize: '44px', color: '#f1e1ae' }).setOrigin(0.5).setScrollFactor(0).setDepth(301);
        this.add.text(512, 315, 'SALTO DUPLO ADQUIRIDO', { fontFamily: 'Arial Black', fontSize: '25px', color: '#d6b56c' }).setOrigin(0.5).setScrollFactor(0).setDepth(301);
        this.add.text(512, 390, 'Os rastros seguem para onde antes\nele não poderia alcançar.', { fontFamily: 'Arial', fontSize: '22px', color: '#c8d8cc', align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(301);
        const button = this.add.rectangle(512, 530, 280, 64, 0x8b5a2b).setStrokeStyle(3, 0xd6b56c).setScrollFactor(0).setDepth(301).setInteractive({ useHandCursor: true });
        this.add.text(512, 530, 'CONTINUAR', { fontFamily: 'Arial Black', fontSize: '23px', color: '#ffffff' }).setOrigin(0.5).setScrollFactor(0).setDepth(302);
        button.on('pointerdown', () => {
            this.cleanupSceneHazardsBeforeTransition();
            this.scene.start('Level3Scene');
        });
    }

    createEnvironmentalChallenges ()
    {
        this.environmentTimers = [];
        this.environmentTransient = [];
        this.environmentPlatforms = [];
        this.environmentReactionSensors = [];

        this.addEnvironmentalPlatform(1160, 575, 120, 20, 600, 'log');
        this.addEnvironmentalPlatform(1880, 605, 120, 18, 620, 'root');

        [
            { x: 1040, type: 0 },
            { x: 1830, type: 1 },
            { x: 2300, type: 0 }
        ].forEach((data) => this.addEnvironmentalReactionSensor(data.x, data.type));
    }

    scheduleEnvironment (delay, callback)
    {
        const timer = this.time.delayedCall(delay, callback);
        this.environmentTimers.push(timer);
        return timer;
    }

    trackEnvironmentObject (object)
    {
        this.environmentTransient.push(object);
        return object;
    }

    addEnvironmentalPlatform (x, y, w, h, delay, kind)
    {
        const body = this.add.rectangle(x, y, w, h, 0x000000, 0);
        this.physics.add.existing(body, true);
        this.platforms.add(body);

        const visual = this.add.container(x, y).setDepth(8);
        if (kind === 'root')
        {
            const root = this.add.rectangle(0, 2, w, h, 0x4b3422).setStrokeStyle(2, 0x68472d, 0.75);
            const ridge = this.add.rectangle(0, -h / 2 + 2, w - 14, 4, 0x315d34, 0.75);
            visual.add([root, ridge]);
        }
        else
        {
            const log = this.add.rectangle(0, 0, w, h, 0x49311f).setStrokeStyle(2, 0x735038, 0.75);
            const moss = this.add.rectangle(0, -h / 2 + 2, w - 12, 5, 0x2d5932, 0.82);
            visual.add([log, moss]);
        }

        const sensor = this.add.rectangle(x, y - 18, w - 8, 44, 0x000000, 0);
        this.physics.add.existing(sensor);
        sensor.body.setAllowGravity(false);
        sensor.body.setImmovable(true);

        const item = { x, y, w, h, delay, kind, body, visual, sensor, triggered: false };
        this.environmentPlatforms.push(item);
        this.physics.add.overlap(this.player, sensor, () => this.triggerEnvironmentalPlatform(item));
    }

    triggerEnvironmentalPlatform (item)
    {
        if (item.triggered || this.phaseCompleted || this.arenaStarted) return;
        item.triggered = true;
        item.sensor.body.enable = false;

        for (let i = 0; i < 5; i += 1)
        {
            const particle = this.trackEnvironmentObject(
                this.add.ellipse(item.x - 38 + i * 19, item.y + 4, 7, 3, item.kind === 'root' ? 0x71563b : (i % 2 ? 0x5b7042 : 0x6d5639), 0.62).setDepth(9)
            );
            this.tweens.add({ targets: particle, x: particle.x + (i % 2 ? 9 : -8), y: particle.y + 18, angle: i * 32, alpha: 0, duration: 340 + i * 22, onComplete: () => particle.destroy() });
        }

        this.tweens.add({ targets: item.visual, x: item.x + 3, y: item.y + 2, angle: item.kind === 'root' ? -1.5 : 1.5, duration: 55, yoyo: true, repeat: 4 });

        this.scheduleEnvironment(item.delay, () => {
            if (!item.triggered) return;
            item.body.body.enable = false;
            this.tweens.add({ targets: item.visual, y: item.y + 105, angle: item.kind === 'root' ? -6 : 8, alpha: 0.16, duration: 560, ease: 'Quad.In' });
        });
    }

    addEnvironmentalReactionSensor (x, type)
    {
        const sensor = this.add.rectangle(x, 515, 145, 250, 0x000000, 0);
        this.physics.add.existing(sensor);
        sensor.body.setAllowGravity(false);
        sensor.body.setImmovable(true);
        const item = { sensor, x, type, triggered: false };
        this.environmentReactionSensors.push(item);
        this.physics.add.overlap(this.player, sensor, () => this.triggerEnvironmentalReaction(item));
    }

    triggerEnvironmentalReaction (item)
    {
        if (item.triggered || this.phaseCompleted || this.arenaStarted) return;
        item.triggered = true;
        item.sensor.body.enable = false;

        const count = item.type === 1 ? 6 : 4;
        for (let i = 0; i < count; i += 1)
        {
            const leaf = this.trackEnvironmentObject(
                this.add.ellipse(item.x - 35 + i * 14, 590 - (i % 3) * 7, 9, 4, i % 2 ? 0x456b3e : 0x66824d, 0.64).setDepth(18)
            );
            this.tweens.add({
                targets: leaf,
                x: leaf.x + (item.type === 1 ? 42 : 28) + i * 3,
                y: leaf.y - 28 - (i % 3) * 9,
                angle: 55 + i * 24,
                alpha: 0,
                duration: 430 + i * 34,
                onComplete: () => leaf.destroy()
            });
        }

        if (item.type === 1)
        {
            const fog = this.trackEnvironmentObject(this.add.ellipse(item.x, 605, 160, 35, 0xc9d7ce, 0.045).setDepth(3));
            this.tweens.add({ targets: fog, x: fog.x + 75, scaleX: 1.3, alpha: 0, duration: 760, onComplete: () => fog.destroy() });
        }
    }

    resetEnvironmentalChallenges ()
    {
        this.environmentTimers.forEach((timer) => timer.remove(false));
        this.environmentTimers.length = 0;

        this.environmentTransient.forEach((object) => {
            if (object && object.active)
            {
                this.tweens.killTweensOf(object);
                object.destroy();
            }
        });
        this.environmentTransient.length = 0;

        this.environmentPlatforms.forEach((item) => {
            this.tweens.killTweensOf(item.visual);
            item.triggered = false;
            item.body.body.enable = true;
            item.sensor.body.enable = true;
            item.visual.setPosition(item.x, item.y).setAngle(0).setAlpha(1);
        });

        this.environmentReactionSensors.forEach((item) => {
            item.triggered = false;
            item.sensor.body.enable = true;
        });
    }

    createOrganicFogMass (x,y,width,height,color,alpha,depth,scrollFactor,seed=0)
    {
        const fog=this.add.container(x,y)
            .setDepth(depth)
            .setScrollFactor(scrollFactor)
            .setAlpha(alpha);

        const parts=[
            [0,0,.58,.62,1],
            [-.31,.03,.42,.48,.78],
            [.3,-.04,.46,.52,.72],
            [-.12,-.22,.4,.42,.58],
            [.14,.2,.48,.36,.52],
            [-.44,.16,.28,.3,.38],
            [.46,.12,.3,.32,.34]
        ];

        parts.forEach(([ox,oy,ws,hs,a],index)=>{
            const wobble=((seed+index)%3-1)*.035;
            const blob=this.add.ellipse(
                ox*width,
                oy*height,
                width*(ws+wobble),
                height*(hs-wobble*.5),
                color,
                a
            ).setAngle(((seed*7+index*11)%17)-8);
            fog.add(blob);
        });

        return fog;
    }

    ensureRubberLatexSystem ()
    {
        if(this.rubberLatexPoints)return;

        this.rubberLatexPoints=[];
        this.rubberLatexDrops=[];
        this.rubberLatexSerial=0;
        this.rubberLatexTimer=this.time.addEvent({
            delay:this.rubberLatexInterval||2800,
            loop:true,
            callback:()=>this.spawnRubberLatexDrop()
        });

        this.events.once('shutdown',()=>this.cleanupRubberLatexSystem());
    }

    createRubberTreeVisual (x,y,trunkWidth,trunkHeight,index=0,depth=8,scrollFactor=1)
    {
        this.ensureRubberLatexSystem();

        const g=this.add.graphics().setDepth(depth).setScrollFactor(scrollFactor);
        const cx=x+trunkWidth*.5;
        const baseY=y+trunkHeight;
        const crownY=y-12-(index%2)*5;

        // Tronco com casca em camadas e leitura vertical mais orgânica.
        g.fillStyle(index%2?0x493222:0x4d3625,.98);
        g.fillRoundedRect(x,y,trunkWidth,trunkHeight,Math.max(7,trunkWidth*.28));
        g.fillStyle(0x674831,.3);
        g.fillRoundedRect(x+trunkWidth*.13,y+8,trunkWidth*.16,trunkHeight-16,5);
        g.fillStyle(0x35261d,.3);
        g.fillRoundedRect(x+trunkWidth*.7,y+18,trunkWidth*.11,trunkHeight-25,4);

        g.lineStyle(1.5,0x8a6849,.28);
        for(let bark=0;bark<5;bark++){
            const bx=x+6+(bark%3)*Math.max(7,trunkWidth*.22);
            const by=y+30+bark*38+(index%2)*6;
            g.beginPath();g.moveTo(bx,by);g.lineTo(bx+(bark%2?4:-3),by+24);g.strokePath();
        }
        g.lineStyle(2,0x2d221b,.34);
        for(let bark=0;bark<4;bark++){
            const bx=x+trunkWidth-7-(bark%2)*8;
            const by=y+48+bark*46;
            g.beginPath();g.moveTo(bx,by);g.lineTo(bx-3,by+29);g.strokePath();
        }

        // Raízes e base integradas ao solo.
        g.lineStyle(5,0x3b2a1f,.82);
        g.beginPath();g.moveTo(cx-2,baseY-8);g.lineTo(x-22-(index%2)*6,baseY+3);g.strokePath();
        g.beginPath();g.moveTo(cx+5,baseY-7);g.lineTo(x+trunkWidth+25+(index%3)*4,baseY+2);g.strokePath();
        g.lineStyle(3,0x513725,.62);
        g.beginPath();g.moveTo(cx,baseY-4);g.lineTo(cx+(index%2?-28:31),baseY+7);g.strokePath();

        // Galhos e copa procedurais preservam o estilo do jogo.
        g.lineStyle(6,0x3d2b20,.84);
        g.beginPath();g.moveTo(cx,y+72);g.lineTo(cx+(index%2?-58:62),y+28);g.strokePath();
        g.lineStyle(4,0x453023,.68);
        g.beginPath();g.moveTo(cx+2,y+105);g.lineTo(cx+(index%2?42:-46),y+68);g.strokePath();

        // Painel raspado: a sangria desce do lado alto (direita) para o ponto baixo (esquerda).
        const cutY=y+trunkHeight*.5;
        const cutLeft=x+6;
        const cutRight=x+trunkWidth-6;
        const cutHighX=cutRight;
        const cutHighY=cutY-13;
        const cutLowX=cutLeft;
        const cutLowY=cutY+5;

        g.fillStyle(0xb88d67,.24);
        g.beginPath();
        g.moveTo(cutLeft,cutY-20);
        g.lineTo(cutRight,cutY-31);
        g.lineTo(cutRight-2,cutY+18);
        g.lineTo(cutLeft+2,cutY+26);
        g.closePath();
        g.fillPath();

        // Corte principal: leitura inequívoca de descida para o ponto de coleta.
        g.lineStyle(4.5,0xd0aa7d,.94);
        g.beginPath();g.moveTo(cutHighX,cutHighY);g.lineTo(cutLowX,cutLowY);g.strokePath();

        // Cortes secundários acompanham a mesma inclinação da sangria principal.
        g.lineStyle(1.5,0x8f6548,.58);
        [-17,-9,13,22].forEach((offset,mark)=>{
            const highX=cutRight-3-(mark%2)*2;
            const highY=cutY+offset-11-(mark%2)*3;
            const lowX=cutLeft+3+(mark%2)*2;
            const lowY=cutY+offset;
            g.beginPath();g.moveTo(highX,highY);g.lineTo(lowX,lowY);g.strokePath();
        });

        // A bica nasce exatamente na extremidade inferior da sangria.
        const spoutX=cutLowX+2;
        const spoutY=cutLowY+1;
        const collectorX=x+trunkWidth*.3;
        const bowlY=cutY+63;

        // Pequena bica inclinada para fora do tronco, terminando acima do coletor.
        g.lineStyle(3,0x665b51,.94);
        g.beginPath();g.moveTo(cutLowX,cutLowY);g.lineTo(spoutX+5,spoutY+5);g.strokePath();
        g.lineStyle(1.5,0xd8d4ca,.72);
        g.beginPath();g.moveTo(cutLowX+1,cutLowY);g.lineTo(spoutX+5,spoutY+5);g.strokePath();

        // Fio de látex sai da ponta da bica e cai verticalmente.
        const latexX=spoutX+5;
        const latexStartY=spoutY+5;
        const latexDropY=latexStartY+14;
        g.lineStyle(1.5,0xf4f1e7,.76);
        g.beginPath();g.moveTo(latexX,latexStartY);g.lineTo(latexX,latexDropY);g.strokePath();
        g.fillStyle(0xf6f2e8,.86);
        g.fillCircle(latexX,latexDropY+1,2);

        // Coletor preso ao tronco e alinhado com o escoamento.
        g.lineStyle(2,0x4d392a,.88);
        g.beginPath();g.moveTo(x+4,bowlY-8);g.lineTo(x+trunkWidth-4,bowlY-8);g.strokePath();
        g.beginPath();g.moveTo(collectorX-15,bowlY-12);g.lineTo(collectorX-13,bowlY+3);g.strokePath();
        g.beginPath();g.moveTo(collectorX+15,bowlY-12);g.lineTo(collectorX+13,bowlY+3);g.strokePath();

        g.fillStyle(0x6b5948,.98);
        g.fillEllipse(collectorX,bowlY,36,17);
        g.fillStyle(0x3a3129,.94);
        g.fillEllipse(collectorX,bowlY+2,30,10);
        g.fillStyle(0x8c7964,.88);
        g.fillEllipse(collectorX,bowlY-4,35,8);
        g.fillStyle(0xf0ecdc,.92);
        g.fillEllipse(collectorX,bowlY-3,27,5);

        // Copa menos geométrica por sobreposição de massas.
        g.fillStyle(index%2?0x123e28:0x17482d,.95);
        g.fillEllipse(cx,crownY,150+(index%3)*8,112+(index%2)*10);
        g.fillEllipse(cx-58,crownY+22,98,76+(index%3)*5);
        g.fillEllipse(cx+65,crownY+17,108+(index%2)*8,82);
        g.fillStyle(0x215738,.56);
        g.fillEllipse(cx-14,crownY-28,92,58);
        g.fillEllipse(cx+42,crownY+8,76,54);
        g.fillStyle(0x2a6240,.24);
        g.fillEllipse(cx-52,crownY-5,65,36);
        g.fillEllipse(cx+68,crownY+2,61,34);

        this.rubberLatexPoints.push({
            x:latexX,
            startY:latexDropY+1,
            bowlY:bowlY-4,
            depth:depth+2,
            scrollFactor
        });

        return g;
    }

    spawnRubberLatexDrop ()
    {
        if(!this.rubberLatexPoints||!this.rubberLatexPoints.length||this.isPlayerDead||this.phaseCompleted)return;
        if(this.rubberLatexDrops.length>=2)return;

        const point=this.rubberLatexPoints[this.rubberLatexSerial%this.rubberLatexPoints.length];
        this.rubberLatexSerial+=1;

        const drop=this.add.circle(point.x,point.startY,2.5,0xf4f1e7,.92)
            .setDepth(point.depth)
            .setScrollFactor(point.scrollFactor);
        this.rubberLatexDrops.push(drop);

        this.tweens.add({
            targets:drop,
            y:point.bowlY,
            x:drop.x+((this.rubberLatexSerial%3)-1)*2,
            scaleY:1.35,
            alpha:{from:.92,to:.7},
            duration:620,
            ease:'Quad.In',
            onComplete:()=>{
                const index=this.rubberLatexDrops.indexOf(drop);
                if(index>=0)this.rubberLatexDrops.splice(index,1);
                drop.destroy();
            }
        });
    }

    clearRubberLatexDrops ()
    {
        if(!this.rubberLatexDrops)return;
        this.rubberLatexDrops.slice().forEach(drop=>{
            if(drop&&drop.active){
                this.tweens?.killTweensOf(drop);
                drop.destroy();
            }
        });
        this.rubberLatexDrops.length=0;
    }

    cleanupRubberLatexSystem ()
    {
        if(this.rubberLatexTimer){
            this.rubberLatexTimer.remove?.(false);
            this.rubberLatexTimer=null;
        }
        this.clearRubberLatexDrops();
        if(this.rubberLatexPoints)this.rubberLatexPoints.length=0;
    }

    createPorongaLightSystem ()
    {
        this.porongaLightPhase=2;

        this.porongaLightHalo=this.add.ellipse(0,0,76,58,0xf1bd62,0)
            .setDepth(18);
        this.porongaLightCone=this.add.triangle(0,0,0,-19,108,0,0,19,0xf1bd62,0)
            .setDepth(17);
        this.porongaLightFront=this.add.ellipse(0,0,98,30,0xe6a94f,0)
            .setDepth(16);

        this.porongaLightVisuals=[
            this.porongaLightHalo,
            this.porongaLightCone,
            this.porongaLightFront
        ];

        this.updatePorongaLight();

        this.events.once('shutdown',()=>{
            if(!this.porongaLightVisuals)return;
            this.porongaLightVisuals.forEach(light=>{
                if(light&&light.active)light.destroy();
            });
            this.porongaLightVisuals.length=0;
        });
    }

    updatePorongaLight ()
    {
        if(!this.playerVisual||!this.playerVisual.parts||!this.porongaLightHalo)return;

        const phase=this.porongaLightPhase;
        const facing=this.playerVisual.facing||1;
        const x=this.playerVisual.x;
        const y=this.playerVisual.y-39;
        const clamp=value=>Math.max(0,Math.min(1,value));

        let intensity=0;
        let decorativeGlow=.012;

        if(phase===3){
            const late=clamp((this.player.x-2950)/620);
            decorativeGlow=.012+late*.026;
        }
        else if(phase===4){
            const twilight=clamp((this.player.x-1700)/1500);
            intensity=clamp((twilight-.38)/.62);
            decorativeGlow=.015+intensity*.12;

            if(this.timeTwilightVeil)this.timeTwilightVeil.setAlpha(.02+twilight*.22);
            if(this.timeCelestialHalo)this.timeCelestialHalo.setAlpha(.075*(1-twilight));
            if(this.timeCelestialCore)this.timeCelestialCore.setAlpha(.3*(1-twilight));
        }
        else if(phase===5){
            intensity=1;
            decorativeGlow=.16;
        }

        if(this.playerVisual.parts.porongaGlow){
            this.playerVisual.parts.porongaGlow.setAlpha(decorativeGlow);
        }

        this.porongaLightHalo
            .setPosition(x,y)
            .setAlpha(.075*intensity);

        this.porongaLightCone
            .setPosition(x+facing*18,y+2)
            .setScale(facing,1)
            .setAlpha(.045*intensity);

        this.porongaLightFront
            .setPosition(x+facing*48,y+7)
            .setAlpha(.028*intensity);
    }

    createLivingAtmosphere ()
    {
        this.livingAtmosphereProfile={"phase":2,"worldWidth":3300,"farScroll":0.065,"farAlpha":0.55,"farColor":1064237,"farStep":235,"farHeight":215,"farHeightStep":38,"farTrunk":21,"farCrown":68,"lowCanopy":false,"lowCanopyColor":465940,"fogColor":13162701,"fogBackAlpha":0.055,"fogMidAlpha":0.045,"fogFrontAlpha":0.024,"rayColor":15656381,"rays":[{"x":820,"y":150,"w":90,"h":430,"alpha":0.043,"angle":-12,"scroll":0.5},{"x":1760,"y":170,"w":105,"h":410,"alpha":0.038,"angle":9,"scroll":0.56}],"swayColor":1194788,"sway":[{"x":650,"y":620,"w":100,"h":30,"alpha":0.3},{"x":1450,"y":617,"w":95,"h":28,"alpha":0.28},{"x":2180,"y":620,"w":88,"h":26,"alpha":0.26}],"vignetteAlpha":0,"toneColor":5142110,"leafDelay":3500,"moteDelay":3300,"birdDelay":14500,"shadowDelay":13000,"maxLeaves":6,"maxMotes":7,"maxBirds":2,"initialMotes":3,"verticalLeaves":false,"largeLeaves":false,"leafColorA":5403460,"leafColorB":4153658,"leafAlpha":0.5,"leafDepth":15,"moteColor":15131076,"moteAlpha":0.21,"moteDepth":10,"dustMotes":false,"birdColor":990743,"birdAlpha":0.58,"shadows":true,"shadowW":110,"shadowH":32,"shadowColor":594446,"shadowAlpha":0.08,"region1":1650,"region2":2300};
        this.livingAtmosphereTimers=[];
        this.livingAtmospherePermanent=[];
        this.livingAtmosphereLeaves=[];
        this.livingAtmosphereMotes=[];
        this.livingAtmosphereBirds=[];
        this.livingAtmosphereShadows=[];
        this.livingAtmosphereSerial=0;
        this.livingAtmosphereRegion=-1;

        const p=this.livingAtmosphereProfile;
        const width=this.physics.world.bounds.width||p.worldWidth;

        const far=this.add.graphics().setDepth(-44).setScrollFactor(p.farScroll).setAlpha(p.farAlpha);
        far.fillStyle(p.farColor,1);
        for(let x=-180,i=0;x<width+500;x+=p.farStep,i++){
            const h=p.farHeight+(i%3)*p.farHeightStep;
            far.fillRect(x,520-h*.52,p.farTrunk+(i%2)*5,h);
            far.fillCircle(x+20,505-h*.52,p.farCrown+(i%3)*9);
            far.fillCircle(x-28,525-h*.52,p.farCrown*.62);
            far.fillCircle(x+62,530-h*.52,p.farCrown*.68);
        }
        this.trackLivingPermanent(far);

        if(p.lowCanopy){
            const canopy=this.add.graphics().setDepth(-22).setScrollFactor(.16).setAlpha(.72);
            canopy.fillStyle(p.lowCanopyColor,1);
            for(let x=-120,i=0;x<width+400;x+=210,i++){
                canopy.fillEllipse(x,700-(i%3)*16,260+(i%2)*45,110+(i%3)*18);
            }
            this.trackLivingPermanent(canopy);
            this.tweens.add({targets:canopy,y:-8,duration:12000,yoyo:true,repeat:-1,ease:'Sine.InOut'});
        }

        this.livingFogBack=this.trackLivingPermanent(
            this.createOrganicFogMass(width*.28,500,width*.72,165,p.fogColor,p.fogBackAlpha,-20,.16,13)
        );
        this.livingFogMid=this.trackLivingPermanent(
            this.createOrganicFogMass(width*.58,555,width*.72,140,p.fogColor,p.fogMidAlpha,-15,.36,19)
        );
        this.livingFogFront=this.trackLivingPermanent(
            this.createOrganicFogMass(width*.42,610,760,86,p.fogColor,p.fogFrontAlpha,3,.72,29)
        );

        this.tweens.add({targets:this.livingFogBack,x:this.livingFogBack.x+70,duration:19000,yoyo:true,repeat:-1,ease:'Sine.InOut'});
        this.tweens.add({targets:this.livingFogMid,x:this.livingFogMid.x-95,duration:15000,yoyo:true,repeat:-1,ease:'Sine.InOut'});
        this.tweens.add({targets:this.livingFogFront,x:this.livingFogFront.x+55,duration:11500,yoyo:true,repeat:-1,ease:'Sine.InOut'});

        this.livingAtmosphereRays=[];
        p.rays.forEach((rayData,index)=>{
            const ray=this.add.rectangle(rayData.x,rayData.y,rayData.w,rayData.h,p.rayColor,rayData.alpha)
                .setOrigin(.5,0).setAngle(rayData.angle).setDepth(-8).setScrollFactor(rayData.scroll);
            this.livingAtmosphereRays.push(this.trackLivingPermanent(ray));
            this.tweens.add({
                targets:ray,
                scaleX:{from:.96,to:1.04},
                duration:3200+index*700,
                yoyo:true,
                repeat:-1,
                ease:'Sine.InOut'
            });
        });

        p.sway.forEach((s,index)=>{
            const plant=this.add.ellipse(s.x,s.y,s.w,s.h,p.swayColor,s.alpha)
                .setDepth(7).setScrollFactor(.94).setAngle(index%2?-2:2);
            this.trackLivingPermanent(plant);
            this.tweens.add({
                targets:plant,
                angle:index%2?3:-3,
                scaleX:{from:.96,to:1.04},
                duration:2600+index*520,
                yoyo:true,
                repeat:-1,
                ease:'Sine.InOut'
            });
        });

        if(p.vignetteAlpha>0){
            [
                this.add.rectangle(0,0,1024,78,0x000000,p.vignetteAlpha).setOrigin(0),
                this.add.rectangle(0,690,1024,78,0x000000,p.vignetteAlpha).setOrigin(0),
                this.add.rectangle(0,0,70,768,0x000000,p.vignetteAlpha).setOrigin(0),
                this.add.rectangle(954,0,70,768,0x000000,p.vignetteAlpha).setOrigin(0)
            ].forEach(edge=>this.trackLivingPermanent(edge.setScrollFactor(0).setDepth(80)));
        }

        this.livingAtmosphereTone=this.trackLivingPermanent(
            this.add.rectangle(0,0,1024,768,p.toneColor,0)
                .setOrigin(0).setScrollFactor(0).setDepth(-43)
        );

        this.addLivingAtmosphereTimer(p.leafDelay,()=>this.spawnLivingLeaf());
        this.addLivingAtmosphereTimer(p.moteDelay,()=>this.spawnLivingMote());
        this.addLivingAtmosphereTimer(p.birdDelay,()=>this.spawnLivingBird());
        this.addLivingAtmosphereTimer(p.shadowDelay,()=>this.spawnLivingShadow());

        for(let i=0;i<p.initialMotes;i++)this.spawnLivingMote(true);

        this.events.once('shutdown',()=>this.cleanupLivingAtmosphere());
    }

    trackLivingPermanent (object)
    {
        this.livingAtmospherePermanent.push(object);
        return object;
    }

    addLivingAtmosphereTimer (delay,callback)
    {
        const timer=this.time.addEvent({delay,loop:true,callback});
        this.livingAtmosphereTimers.push(timer);
        return timer;
    }

    removeLivingObject (list,object)
    {
        const index=list.indexOf(object);
        if(index>=0)list.splice(index,1);
        if(object&&object.active)object.destroy();
    }

    spawnLivingLeaf (initial=false)
    {
        const p=this.livingAtmosphereProfile;
        if(this.phaseCompleted||this.isPlayerDead)return;
        const bossQuiet=(p.phase===2&&this.arenaStarted)||(p.phase===5&&this.bossStarted);
        if(bossQuiet&&this.livingAtmosphereSerial%3!==0)return;
        if(this.livingAtmosphereLeaves.length>=p.maxLeaves)return;

        const serial=this.livingAtmosphereSerial++;
        const cam=this.cameras.main;
        const x=cam.scrollX+90+(serial*173)%840;
        const y=(p.verticalLeaves?70:130)+(serial%4)*52;
        const leaf=this.add.ellipse(x,y,p.largeLeaves?13:9,p.largeLeaves?6:4,serial%2?p.leafColorA:p.leafColorB,p.leafAlpha)
            .setDepth(p.leafDepth).setAngle((serial%5)*24-45);
        this.livingAtmosphereLeaves.push(leaf);

        const drift=p.verticalLeaves?(serial%2?26:-22):(90+(serial%3)*34);
        const fall=p.verticalLeaves?300+(serial%3)*70:170+(serial%3)*40;
        this.tweens.add({
            targets:leaf,
            x:leaf.x+drift,
            y:leaf.y+fall,
            angle:leaf.angle+(serial%2?190:-170),
            alpha:0,
            duration:initial?3600:4300+(serial%3)*550,
            ease:'Sine.In',
            onComplete:()=>this.removeLivingObject(this.livingAtmosphereLeaves,leaf)
        });
    }

    spawnLivingMote (initial=false)
    {
        const p=this.livingAtmosphereProfile;
        if(this.phaseCompleted||this.isPlayerDead)return;
        const quiet=(p.phase===2&&(this.arenaStarted||this.player.x>2350))||
            (p.phase===4&&this.player.x>1850)||
            (p.phase===5&&(this.bossStarted||this.player.x>2800));
        if(quiet&&!initial)return;
        if(this.livingAtmosphereMotes.length>=p.maxMotes)return;

        const serial=this.livingAtmosphereSerial++;
        const cam=this.cameras.main;
        const x=cam.scrollX+130+(serial*137)%760;
        const y=180+(serial%5)*68;
        const mote=this.add.circle(x,y,p.dustMotes?2.4:1.8,p.moteColor,p.moteAlpha)
            .setDepth(p.moteDepth);
        this.livingAtmosphereMotes.push(mote);

        this.tweens.add({
            targets:mote,
            x:mote.x+(serial%2?28:-24),
            y:mote.y+(p.dustMotes?48:-34-(serial%3)*8),
            alpha:0,
            duration:initial?4200:5000+(serial%4)*500,
            ease:'Sine.InOut',
            onComplete:()=>this.removeLivingObject(this.livingAtmosphereMotes,mote)
        });
    }

    spawnLivingBird ()
    {
        const p=this.livingAtmosphereProfile;
        if(this.phaseCompleted||this.isPlayerDead)return;
        const blocked=(p.phase===2&&(this.arenaStarted||this.player.x>2050))||
            (p.phase===4&&this.player.x>1650)||
            (p.phase===5&&(this.bossStarted||this.player.x>2200));
        if(blocked||this.livingAtmosphereBirds.length>=p.maxBirds)return;

        const serial=this.livingAtmosphereSerial++;
        const cam=this.cameras.main;
        const count=1+(serial%2);
        for(let i=0;i<count&&this.livingAtmosphereBirds.length<p.maxBirds;i++){
            const bird=this.add.triangle(cam.scrollX-40-i*35,160+i*28,-8,3,0,-3,8,3,p.birdColor,p.birdAlpha)
                .setDepth(-21).setScrollFactor(.48);
            this.livingAtmosphereBirds.push(bird);
            this.tweens.add({
                targets:bird,
                x:bird.x+1120+i*90,
                y:bird.y-70-i*22,
                alpha:0,
                duration:6500+i*900,
                ease:'Sine.InOut',
                onComplete:()=>this.removeLivingObject(this.livingAtmosphereBirds,bird)
            });
        }
    }

    spawnLivingShadow ()
    {
        const p=this.livingAtmosphereProfile;
        if(this.phaseCompleted||this.isPlayerDead||!p.shadows)return;
        const allowed=(p.phase===2&&this.player.x>1250&&!this.arenaStarted)||
            (p.phase===4&&this.player.x>2850)||
            (p.phase===5&&this.player.x>1750&&!this.bossStarted);
        if(!allowed||this.livingAtmosphereShadows.length>=1)return;

        const serial=this.livingAtmosphereSerial++;
        const cam=this.cameras.main;
        const shadow=this.add.ellipse(cam.scrollX+760,470+(serial%3)*35,p.shadowW,p.shadowH,p.shadowColor,p.shadowAlpha)
            .setDepth(-23).setScrollFactor(.4);
        this.livingAtmosphereShadows.push(shadow);
        this.tweens.add({
            targets:shadow,
            x:shadow.x+(serial%2?210:-180),
            alpha:0,
            duration:2600+(serial%3)*500,
            ease:'Sine.InOut',
            onComplete:()=>this.removeLivingObject(this.livingAtmosphereShadows,shadow)
        });

        if(p.phase===4||p.phase===5){
            const rumble=this.add.ellipse(
                shadow.x,
                600,
                p.phase===5?210:160,
                p.phase===5?30:24,
                p.moteColor,
                p.phase===5?.055:.045
            ).setDepth(-14).setScrollFactor(.46);
            this.livingAtmosphereShadows.push(rumble);
            this.tweens.add({
                targets:rumble,
                scaleX:1.45,
                x:rumble.x+(serial%2?34:-30),
                alpha:0,
                duration:900,
                ease:'Sine.Out',
                onComplete:()=>this.removeLivingObject(this.livingAtmosphereShadows,rumble)
            });
        }
    }

    updateLivingAtmosphere ()
    {
        const p=this.livingAtmosphereProfile;
        if(!p||!this.player)return;

        let region=0;
        if(this.player.x>=p.region2)region=2;
        else if(this.player.x>=p.region1)region=1;

        if(p.phase===2&&this.arenaStarted)region=3;
        if(p.phase===5&&this.bossStarted)region=3;

        if(region===this.livingAtmosphereRegion)return;
        this.livingAtmosphereRegion=region;

        let back=p.fogBackAlpha,mid=p.fogMidAlpha,front=p.fogFrontAlpha,tone=0,rayScale=1;

        if(p.phase===1){
            if(region===1){front*=1.08;rayScale=1.2;}
            if(region===2){mid*=1.12;tone=.018;rayScale=.9;}
        }
        else if(p.phase===2){
            if(region===1){back*=1.1;mid*=1.15;tone=.018;rayScale=.7;}
            if(region>=2){back*=1.22;mid*=1.28;front*=.8;tone=.032;rayScale=.35;}
            if(region===3){front*=.55;rayScale=.18;}
        }
        else if(p.phase===3){
            if(region===1){back*=.9;mid*=1.08;rayScale=1.25;tone=.012;}
            if(region===2){front*=.8;rayScale=1.45;tone=.018;}
        }
        else if(p.phase===4){
            if(region===1){back*=.9;mid*=1.15;front*=1.18;tone=.035;rayScale=.45;}
            if(region===2){back*=1.05;mid*=1.3;front*=1.1;tone=.055;rayScale=.2;}
        }
        else if(p.phase===5){
            if(region===1){back*=1.18;mid*=1.2;front*=1.08;tone=.035;rayScale=.45;}
            if(region===2){back*=1.35;mid*=1.32;front*=1.12;tone=.065;rayScale=.22;}
            if(region===3){back*=1.4;mid*=1.38;front*=.82;tone=.072;rayScale=.1;}
        }

        [
            [this.livingFogBack,back],
            [this.livingFogMid,mid],
            [this.livingFogFront,front],
            [this.livingAtmosphereTone,tone]
        ].forEach(([target,alpha])=>{
            this.tweens.add({targets:target,alpha,duration:1100,ease:'Sine.InOut'});
        });

        this.livingAtmosphereRays.forEach((ray,index)=>{
            const base=p.rays[index].alpha;
            this.tweens.add({targets:ray,alpha:base*rayScale,duration:1000,ease:'Sine.InOut'});
        });
    }

    clearLivingAtmosphereTransient ()
    {
        [
            this.livingAtmosphereLeaves,
            this.livingAtmosphereMotes,
            this.livingAtmosphereBirds,
            this.livingAtmosphereShadows
        ].forEach(list=>{
            if(!list)return;
            list.slice().forEach(object=>{
                if(object&&object.active){
                    this.tweens?.killTweensOf(object);
                    object.destroy();
                }
            });
            list.length=0;
        });
    }

    cleanupLivingAtmosphere ()
    {
        if(!this.livingAtmosphereTimers)return;
        this.livingAtmosphereTimers.forEach(timer=>timer?.remove?.(false));
        this.livingAtmosphereTimers.length=0;
        this.clearLivingAtmosphereTransient();

        this.livingAtmospherePermanent.forEach(object=>{
            if(object&&object.active){
                this.tweens?.killTweensOf(object);
                object.destroy();
            }
        });
        this.livingAtmospherePermanent.length=0;
    }

    createHud ()
    {
        const panel = this.add.rectangle(15, 15, 286, 112, 0x06100d, 0.58)
            .setOrigin(0)
            .setScrollFactor(0)
            .setDepth(100);
        panel.setStrokeStyle(1, 0x78917c, 0.3);
        const showDesktopControls = this.isTouchDevice !== true;
        panel.setVisible(showDesktopControls);

        this.controlsTitle = this.add.text(26, 24, 'CONTROLES', {
            fontFamily: 'Arial Black',
            fontSize: '12px',
            color: '#f1e1ae'
        }).setScrollFactor(0).setDepth(101).setVisible(showDesktopControls);

        this.controlsText = this.add.text(26, 45, 'A/D ou ←/→  mover\nW / ↑ / Espaço  pular\nS / ↓  queda rápida\nJ / X  atacar', {
            fontFamily: 'Arial',
            fontSize: '11px',
            color: '#c7d6ca',
            lineSpacing: 1
        }).setScrollFactor(0).setDepth(101).setVisible(showDesktopControls);

        this.createQuickMenuButton();
        this.audioSettingsUi = createAudioSettingsControl(this, {
            x: 900,
            y: 27,
            buttonSize: 40
        });
    }

    cleanupSceneHazardsBeforeTransition ()
    {
        this.forestMonkeySystem?.cleanup?.();
        this.oncaEncounter?.destroy?.();
        this.horizontalExpansion?.cleanup?.();
        this.weatherSystem?.cleanup?.();
        this.audioManager?.cleanupScene(this);
    }

    createQuickMenuButton ()
    {
        const button = this.add.rectangle(965, 27, 82, 34, 0x06100d, 0.68)
            .setStrokeStyle(1, 0x78917c, 0.55)
            .setScrollFactor(0)
            .setDepth(104)
            .setInteractive({ useHandCursor: true });

        const label = this.add.text(965, 27, 'MENU', {
            fontFamily: 'Arial Black',
            fontSize: '12px',
            color: '#e5e8de'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(105);

        button.on('pointerover', () => {
            button.setFillStyle(0x1a2c23, 0.82);
            label.setColor('#f1e1ae');
        });
        button.on('pointerout', () => {
            button.setFillStyle(0x06100d, 0.68);
            label.setColor('#e5e8de');
        });
        button.on('pointerdown', () => {
            this.cleanupSceneHazardsBeforeTransition();
            this.scene.start('MainMenu');
        });
    }

    createStaminaHud ()
    {
        this.staminaHud = this.add.container(320, 90)
            .setScrollFactor(0)
            .setDepth(102);

        const background = this.add.rectangle(0, 0, 220, 30, 0x06100d, 0.64).setOrigin(0);
        background.setStrokeStyle(1, 0x78917c, 0.28);

        const label = this.add.text(10, 7, 'FÔLEGO', {
            fontFamily: 'Arial Black',
            fontSize: '11px',
            color: '#cfe5d2'
        });

        const barBack = this.add.rectangle(62, 9, 90, 12, 0x1d3025, 0.95).setOrigin(0);
        barBack.setStrokeStyle(1, 0x668574, 0.55);

        this.staminaBar = this.add.rectangle(62, 9, 90, 12, 0x72b58a, 1).setOrigin(0);

        this.staminaText = this.add.text(162, 7, '100/100', {
            fontFamily: 'Arial',
            fontSize: '11px',
            color: '#ffffff'
        });

        this.staminaHud.add([background, label, barBack, this.staminaBar, this.staminaText]);
        this.updateStaminaHud();
    }

    updateStaminaHud ()
    {
        if (!this.staminaBar || !this.staminaText) return;
        const ratio = Math.max(0, Math.min(1, this.stamina / this.maxStamina));
        this.staminaBar.width = 90 * ratio;
        this.staminaText.setText(Math.round(this.stamina) + '/' + this.maxStamina);
    }

    createHealthHud ()
    {
        this.healthHud = this.add.container(320, 18)
            .setScrollFactor(0)
            .setDepth(102);

        const background = this.add.rectangle(0, 0, 220, 30, 0x06100d, 0.64).setOrigin(0);
        background.setStrokeStyle(1, 0x78917c, 0.28);

        const label = this.add.text(10, 7, 'VIDA', {
            fontFamily: 'Arial Black',
            fontSize: '11px',
            color: '#f1e1ae'
        });

        const barBack = this.add.rectangle(62, 9, 90, 12, 0x351b18, 0.95).setOrigin(0);
        barBack.setStrokeStyle(1, 0x8e6f62, 0.55);

        this.healthBar = this.add.rectangle(62, 9, 90, 12, 0x8fb35b, 1).setOrigin(0);

        this.healthText = this.add.text(162, 7, '100/100', {
            fontFamily: 'Arial',
            fontSize: '11px',
            color: '#ffffff'
        });

        this.healthHud.add([background, label, barBack, this.healthBar, this.healthText]);
        this.updateHealthHud();
    }

    createHungerHud ()
    {
        this.hungerHud = this.add.container(320, 54)
            .setScrollFactor(0)
            .setDepth(102);

        const background = this.add.rectangle(0, 0, 220, 30, 0x06100d, 0.64).setOrigin(0);
        background.setStrokeStyle(1, 0x78917c, 0.28);

        this.hungerLabel = this.add.text(10, 7, 'FOME', {
            fontFamily: 'Arial Black',
            fontSize: '11px',
            color: '#f1e1ae'
        });

        const barBack = this.add.rectangle(62, 9, 90, 12, 0x3d2b16, 0.95).setOrigin(0);
        barBack.setStrokeStyle(1, 0x9b7b45, 0.55);

        this.hungerBar = this.add.rectangle(62, 9, 90, 12, 0xd49a3a, 1).setOrigin(0);

        this.hungerText = this.add.text(162, 7, '100/100', {
            fontFamily: 'Arial',
            fontSize: '11px',
            color: '#ffffff'
        });

        this.hungerHud.add([background, this.hungerLabel, barBack, this.hungerBar, this.hungerText]);
        this.updateHungerHud();
    }

    updateHealthHud ()
    {
        const ratio = Math.max(0, this.health / this.maxHealth);

        this.healthBar.width = 90 * ratio;
        this.healthText.setText(`${this.health}/${this.maxHealth}`);
    }

    updateHungerHud ()
    {
        const ratio = Math.max(0, this.hunger / this.maxHunger);

        this.hungerBar.width = 90 * ratio;
        this.hungerText.setText(`${this.hunger}/${this.maxHunger}`);

        if (this.hunger <= 0)
        {
            this.hungerBar.setFillStyle(0xd85c32, 1);
            this.hungerLabel.setColor('#ffb08a');
        }
        else if (this.hunger < 30)
        {
            this.hungerBar.setFillStyle(0xe8782f, 1);
            this.hungerLabel.setColor('#ffd08a');
        }
        else
        {
            this.hungerBar.setFillStyle(0xd49a3a, 1);
            this.hungerLabel.setColor('#f1e1ae');
        }
    }

    updateHunger (time)
    {
        if (this.phaseCompleted || this.isPlayerDead) return;
        if (time >= this.nextHungerDrainAt) {
            const steps = Math.floor((time - this.nextHungerDrainAt) / 2000) + 1;
            this.hunger = Math.max(0, this.hunger - steps);
            this.nextHungerDrainAt += steps * 2000;
            this.updateHungerHud();
        }
        if (this.hunger <= 0 && time >= this.nextStarvationDamageAt) {
            this.nextStarvationDamageAt = time + 2000;
            this.health = Math.max(0, this.health - 5);
            this.updateHealthHud();
            if (this.health <= 0) this.handlePlayerDeath();
        }
    }

    showLevelTitle ()
    {
        const playerName = String(this.registry.get('playerName') || 'SERINGUEIRO').slice(0, 16);
        const intro = this.add.container(512, 286).setScrollFactor(0).setDepth(170);
        const panel = this.add.rectangle(0, 0, 430, 132, 0x06100d, 0.76)
            .setStrokeStyle(1, 0x78917c, 0.32);
        const phaseText = this.add.text(0, -38, 'FASE 2', {
            fontFamily: 'Arial Black',
            fontSize: '15px',
            color: '#d6b56c'
        }).setOrigin(0.5);
        const titleText = this.add.text(0, -8, 'RASTROS DO GUARDIÃO', {
            fontFamily: 'Arial Black',
            fontSize: '25px',
            color: '#f1e1ae',
            align: 'center'
        }).setOrigin(0.5);
        const nameText = this.add.text(0, 35, `SERINGUEIRO: ${playerName}`, {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#9fba9f'
        }).setOrigin(0.5);

        intro.add([panel, phaseText, titleText, nameText]);

        this.tweens.add({
            targets: intro,
            alpha: 0,
            delay: 1900,
            duration: 800,
            ease: 'Sine.Out',
            onComplete: () => intro.destroy()
        });
    }

    update ()
    {
        const time = this.time.now;
        const moveSpeed = 260;
        const grounded = this.player.body.blocked.down || this.player.body.touching.down;

        this.updateStamina(time, grounded);

        const jumpDown = this.keyW.isDown || this.cursors.up.isDown || this.spaceKey.isDown || this.mobileInput?.jump === true;
        if (jumpDown && !this.jumpWasDown) {
            this.queueJumpInput(time);
        } else if (!jumpDown && this.jumpWasDown) {
            this.applyJumpCut();
        }
        this.jumpWasDown = jumpDown;

        if (!this.isPlayerDead && !this.phaseCompleted) {
            if (time >= this.knockbackUntil) {
                const left = this.cursors.left.isDown || this.keyA.isDown || this.mobileInput?.left === true;
                const right = this.cursors.right.isDown || this.keyD.isDown || this.mobileInput?.right === true;
                const direction = left && !right ? -1 : right && !left ? 1 : 0;
                if (direction !== 0 && this.lastMoveDirection !== 0 && direction !== this.lastMoveDirection) this.showDirectionChangeFeedback(direction);
                if (direction !== 0) this.lastMoveDirection = direction;
                if (!applyWetGroundMovement(this, direction, moveSpeed, grounded, time)) this.player.body.setVelocityX(direction * moveSpeed);
            }

            this.updateGroundedState(grounded);
            this.consumeJumpBuffer(grounded);
            this.applyFastFall(grounded);
        } else {
            this.updateGroundedState(grounded);
            this.fastFallActive = false;
        }

        if (this.arenaStarted && !this.arenaCleared) {
            if (this.player.x < this.arenaMinX) this.player.x = this.arenaMinX;
            if (this.player.x > this.arenaMaxX) this.player.x = this.arenaMaxX;
        }

        if (this.player.y > 720 && !this.isPlayerDead) {
            this.handlePlayerDeath();
        }

        this.syncPlayerVisual();
        this.animatePlayerVisual(time);
        this.updatePorongaLight();
        this.updateAttack(time);this.updateMacheteVisual(time);this.updateAttackSprite(time);
        this.updateSnake(time);
        this.updateCarapana(time);
        this.updateFruits(time);
        this.updateCurupira(time);
        this.oncaEncounter?.update(time);
        this.forestMonkeySystem?.update(time);
        this.updateHunger(time);
        this.updateLivingAtmosphere();
        this.weatherSystem?.update(time);

        this.audioManager?.updateScene(this, { grounded, time });
        this.horizontalExpansion?.update(this.time.now);
}

}