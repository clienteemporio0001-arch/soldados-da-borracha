import { Scene } from 'phaser';
import { createBasicMobileControls } from '../mobileControls';
import { createForestMonkeySystem } from '../forestMonkeySystem.js';
import { OncaEncounter } from '../oncaEncounter.js';
import { createHorizontalExpansion } from '../phaseHorizontalExtension.js';
import { createTropicalStormSystem, applyWetGroundMovement } from '../weatherSystem.js';
import { getAudioManager } from '../audio/AudioManager.js';
import { createAudioSettingsControl } from '../ui/AudioSettingsPanel.js';

export class Level4Scene extends Scene
{

    constructor () { super('Level4Scene'); }

    create ()
    {
        this.worldWidth = 12300;
        this.physics.world.setBounds(0, 0, this.worldWidth, 768);
        this.cameras.main.setBounds(0, 0, this.worldWidth, 768);
        this.cameras.main.setBackgroundColor('#394b42');

        this.createWoundedForest();
        this.createRubberTreeAccents();
        this.createPlatforms();
        this.createHumanSigns();
        this.createMapinguariSigns();

        this.player = this.add.rectangle(150, 515, 45, 70, 0x000000, 0);
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);
        this.player.body.setMaxVelocity(260, 900);
        this.player.body.setSize(45, 70);
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

        this.doubleJumpUnlocked = this.registry.get('doubleJumpUnlocked') === true;
        this.dashUnlocked = this.registry.get('dashUnlocked') === true;
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
        this.dashStaminaCost = 25;
        this.staminaRegenDelay = 350;
        this.staminaGroundRegen = 40;
        this.staminaAirRegen = 12;
        this.staminaRegenBlockedUntil = 0;
        this.lastStaminaUpdateAt = this.time.now;
        this.nextStaminaFeedbackAt = 0;
        this.isDashing = false;
        this.dashLandingVisual = false;
        this.dashEndsAt = 0;
        this.nextDashAt = 0;
        this.airDashUsed = false;
        this.nextDashDeniedFeedbackAt = 0;
        this.dashDirection = 1;
        this.dashSpeed = 520;
        this.dashDuration = 380;
        this.dashCooldown = 380;

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

        this.companionClueFound = false;
        this.escapeStarted = false;
        this.escapeCompleted = false;
        this.escapeCheckpoint = { x: 10360, y: 540 };

        this.createSnake();
        this.createCarapana();
        this.createAttackHitbox();
        this.createFruits();
        this.createUnstablePlatforms();
        this.createCompanionClue();
        this.createMapinguariEscape();
        this.createFinalZone();

        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey('A');
        this.keyD = this.input.keyboard.addKey('D');
        this.keyW = this.input.keyboard.addKey('W');
        this.keyS = this.input.keyboard.addKey('S');
        this.spaceKey = this.input.keyboard.addKey('SPACE');
        this.keyJ = this.input.keyboard.addKey('J');
        this.keyX = this.input.keyboard.addKey('X');
        this.keyShift = this.input.keyboard.addKey('SHIFT');

        this.keyJ.on('down', () => this.queueAttackInput());
        this.keyX.on('down', () => this.queueAttackInput());
        this.keyShift.on('down', () => this.tryDash());
        createBasicMobileControls(this);

        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setDeadzone(220, 160);

        this.createHud();
        this.createHealthHud();
        this.createHungerHud();
        this.createStaminaHud();
        this.showLevelTitle();
        this.createLivingAtmosphere();
        this.createPorongaLightSystem();

        this.spawnPoint = { x: 150, y: 515 };
        this.forestMonkeySystem = createForestMonkeySystem(this, {
            phase: 4,
            perches: [
                { x: 280, y: 326 },
                { x: 808, y: 310 },
                { x: 1325, y: 346 },
                { x: 2395, y: 385 },
                { x: 2888, y: 370 },
                { x: 3470, y: 355 }
            ],
            damage: 18,
            maxMonkeys: 2,
            throwMin: 2000,
            throwMax: 2800,
            maxProjectiles: 4,
            aimLead: 0.26,
            aimError: 23,
            spawnChance: 0.74,
            isPaused: () =>
                this.phaseCompleted ||
                (this.escapeStarted && !this.escapeCompleted)
        });
        this.oncaEncounter = new OncaEncounter(this, {
            phase: 4,
            canSpawn: () => ({
                allowed: !this.phaseCompleted && !this.isPlayerDead && !this.escapeStarted,
                bossActive: false
            })
        });

        this.weatherSystem = createTropicalStormSystem(this, { phase: 4 });
        this.audioManager = getAudioManager(this);
        this.audioManager?.startScene(this, { music: 'music_forest', ambient: 'forest_ambient' });

        this.horizontalExpansion = createHorizontalExpansion(this, {
            phase: 4,
            startX: 4100,
            endX: 12100,
            traversalEndX: 10350,
            resourceEndX: 10350,
            groundY: 710,
            checkpointXs: [4350, 7600, 9650],
            checkpointY: 540,
            enemyXs: [4650, 5580, 6540, 7550, 8650, 9480],
            monkeyPerches: [
                { x: 4400, y: 330 }, { x: 5280, y: 300 }, { x: 6150, y: 340 },
                { x: 7040, y: 305 }, { x: 7900, y: 350 }, { x: 8750, y: 315 },
                { x: 9550, y: 335 }
            ]
        });

        [
            [11620,575,160],[11810,510,150],[11970,440,140],[12100,365,120]
        ].forEach(([x,y,w])=>{
            const body=this.add.rectangle(x,y,w,22,0x000000,0);
            this.physics.add.existing(body,true);this.platforms.add(body);
            this.add.rectangle(x,y,w,22,0x493527,.96).setDepth(10);
            this.add.ellipse(x,y-12,w*.8,8,0x46553a,.58).setDepth(11);
        });
}

    createWoundedForest ()
    {
        const sky = this.add.graphics().setDepth(-50).setScrollFactor(0);
        sky.fillStyle(0x394b42,1);
        sky.fillRect(0,0,1024,768);
        sky.fillStyle(0x665b42,.48);
        sky.fillRect(0,170,1024,360);
        sky.fillStyle(0x31413c,.28);
        sky.fillRect(0,500,1024,268);

        // Sol baixo que desaparece à medida que a fase entra no crepúsculo.
        this.timeCelestialHalo=this.add.circle(850,168,62,0xe7b36f,.075).setDepth(-49).setScrollFactor(.035);
        this.timeCelestialCore=this.add.circle(850,168,29,0xefbd78,.3).setDepth(-48).setScrollFactor(.035);
        this.timeTwilightVeil=this.add.rectangle(0,0,1024,768,0x173044,.02)
            .setOrigin(0).setScrollFactor(0).setDepth(-49);

        const distant = this.add.graphics().setDepth(-40).setScrollFactor(0.12);
        distant.fillStyle(0x0a2119, 0.95);
        distant.fillRect(-300, 520, this.worldWidth + 700, 250);

        const liveTrees = [
            [30,390,26,245,82],[250,345,34,290,100],[520,410,24,225,74],
            [780,330,38,305,110],[1050,400,27,235,82],[1300,365,32,270,96],
            [1550,420,22,215,70],[1800,385,28,250,86]
        ];
        liveTrees.forEach(([x,y,w,h,c],i)=>{
            const cx=x+w*.5,baseY=y+h;
            distant.fillStyle(i%2 ? 0x0f2d21 : 0x123427,.9);
            distant.fillRoundedRect(x,y,w,h,Math.max(5,w*.22));
            distant.fillStyle(0x1b3a2a,.3);
            distant.fillRoundedRect(x+w*.18,y+10,w*.18,h-18,4);
            distant.lineStyle(5,0x16281f,.65);
            distant.beginPath();distant.moveTo(cx,baseY-6);distant.lineTo(x-22,baseY+2);distant.strokePath();
            distant.beginPath();distant.moveTo(cx+3,baseY-5);distant.lineTo(x+w+26,baseY+2);distant.strokePath();
            distant.lineStyle(6,0x173023,.7);
            distant.beginPath();distant.moveTo(cx,y+72);distant.lineTo(cx+(i%2?58:-54),y+22);distant.strokePath();
            distant.fillStyle(0x103324,.88);
            distant.fillEllipse(cx,y-8,c*1.85,c*1.25);
            distant.fillEllipse(x-c*.42,y+20,c*1.08,c*.82);
            distant.fillEllipse(x+w+c*.46,y+22,c*1.16,c*.86);
            distant.fillStyle(0x1b4930,.34);
            distant.fillEllipse(cx+18,y-28,c*.95,c*.55);
        });

        // A partir do meio da fase, as silhuetas passam a ficar cortadas, tombadas e irregulares.
        const broken = this.add.graphics().setDepth(-26).setScrollFactor(0.42);
        broken.fillStyle(0x352a20, 0.92);
        [[1900,430,40,230],[2140,470,36,175],[2380,405,46,250],[2630,455,34,180],
         [2860,390,52,270],[3160,440,38,205],[3440,375,56,285],[3770,420,44,230]].forEach(([x,y,w,h],i)=>{
            broken.fillRect(x,y,w,h);
            broken.lineStyle(10,0x30231a,0.9);
            broken.beginPath();
            broken.moveTo(x+w*.5,y+35);
            broken.lineTo(x+(i%2?120:-90),y-35-(i%3)*22);
            broken.strokePath();
        });

        // Árvores tombadas e raízes arrancadas.
        broken.lineStyle(24, 0x483322, 0.95);
        [[1870,615,2130,535],[2240,625,2480,500],[2670,610,2920,470],[3180,615,3480,455]].forEach(([x1,y1,x2,y2])=>{
            broken.beginPath(); broken.moveTo(x1,y1); broken.lineTo(x2,y2); broken.strokePath();
        });

        // Névoa irregular e poeira úmida, sem faixas retangulares.
        this.createOrganicFogMass(660,545,1380,145,0xb8c9be,.05,-18,.2,5);
        this.createOrganicFogMass(2420,575,1950,125,0xb8b8a8,.045,-16,.38,8);
        this.createOrganicFogMass(3350,390,420,210,0x8a8b7a,.055,-14,.55,11);

        const fg=this.add.graphics().setDepth(30).setScrollFactor(1.08).setAlpha(.68);
        [70,310,610,900,1240,1530,1860,2210,2580,2970,3360,3820].forEach((x,i)=>{
            const s=27+(i%4)*5;
            fg.fillStyle(i<6 ? 0x12341f : 0x1d2c1f,.9);
            fg.fillCircle(x,650,s);
            fg.fillCircle(x+s*.75,655,s*.7);
        });
    }

    createRubberTreeAccents ()
    {
        this.rubberLatexInterval=3400;
        this.createRubberTreeVisual(1480,340,38,252,0,7,1);
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
        const add = (x,y,w,h) => {
            const p=this.add.rectangle(x,y,w,h,0x000000,0);
            this.physics.add.existing(p,true);
            this.platforms.add(p);
            return p;
        };

        // Trecho 1: saída elevada e descida.
        add(300,650,600,116);
        add(760,570,170,28);
        add(1010,500,170,28);
        add(1270,585,190,30);

        // Trechos 2 e 3: clareira e corredor de destruição.
        add(1540,650,360,116);
        add(1840,565,170,28);
        add(2110,475,180,28);
        add(2380,585,180,30);
        add(2660,480,180,28);

        // Acampamento / pista.
        add(2860,650,340,116);

        // Fuga e final.
        add(3210,555,180,28);
        add(3470,455,170,28);
        add(3740,555,190,28);
        add(3990,425,180,30);

        const g=this.add.graphics().setDepth(5);
        const ground=[[0,592,600,116],[1360,592,360,116],[2690,592,340,116]];
        ground.forEach(([x,y,w,h],i)=>{
            g.fillStyle(i===2?0x4a3728:0x4b3423,1);g.fillRect(x,y,w,h);
        });
        this.decorateGroundVisual(g,ground,4);

        const naturals=[
            [675,556,170,28,'root'],[925,486,170,28,'log'],[1175,570,190,30,'bank'],
            [1755,551,170,28,'log'],[2020,461,180,28,'root'],[2290,570,180,30,'bank'],
            [2570,466,180,28,'log'],[3120,541,180,28,'root'],[3385,441,170,28,'log'],
            [3645,541,190,28,'bank'],[3900,410,180,30,'root']
        ];
        naturals.forEach(([x,y,w,h,t])=>this.drawNaturalPlatform(g,x,y,w,h,t));

        // Chão quebrado e sulcos gigantes.
        g.lineStyle(8,0x2b2019,.78);
        [[1450,650,1510,700],[1600,650,1660,720],[2210,650,2290,720],[3020,650,3110,735]].forEach(([x1,y1,x2,y2])=>{
            g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.strokePath();
        });
        g.lineStyle(12,0x3a291f,.7);
        [[2320,620,2470,600],[3000,610,3160,585],[3520,600,3690,570]].forEach(([x1,y1,x2,y2])=>{
            g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.strokePath();
        });
    }

    drawNaturalPlatform (g,x,y,w,h,t)
    {
        if(t==='log'){
            g.fillStyle(0x49311f,1);g.fillRoundedRect(x+4,y+2,w-8,h-3,11);
            g.fillStyle(0x76523a,.62);g.fillEllipse(x+w*.48,y+h*.42,w-18,8);
            g.lineStyle(2,0x2e221b,.62);[.22,.46,.7].forEach((r,i)=>{g.beginPath();g.moveTo(x+w*r,y+4);g.lineTo(x+w*r+12+(i%2)*6,y+h-4);g.strokePath();});
            g.fillStyle(0x46553a,.72);g.fillEllipse(x+w*.34,y+1,w*.4,6);
            g.fillStyle(0xa57a51,.48);g.fillCircle(x+w-7,y+h*.52,Math.min(9,h*.3));
            g.lineStyle(3,0x3a281f,.8);g.beginPath();g.moveTo(x+w*.18,y+h-2);g.lineTo(x+w*.08,y+h+11);g.strokePath();
        }else if(t==='root'){
            g.lineStyle(Math.max(12,h*.6),0x4b3422,.98);g.beginPath();
            g.moveTo(x+4,y+h-5);g.lineTo(x+w*.3,y+7);g.lineTo(x+w*.52,y+h*.5);g.lineTo(x+w*.74,y+6);g.lineTo(x+w-4,y+h-5);g.strokePath();
            g.lineStyle(4,0x68472d,.78);g.beginPath();g.moveTo(x+w*.3,y+8);g.lineTo(x+w*.2,y-4);g.strokePath();
            g.fillStyle(0x46553a,.66);g.fillEllipse(x+w*.48,y+3,w*.45,7);
        }else{
            g.fillStyle(0x543a27,1);g.fillRoundedRect(x+2,y+5,w-4,h-5,8);
            g.fillStyle(0x394430,.86);g.fillEllipse(x+w*.28,y+2,w*.44,7);g.fillEllipse(x+w*.72,y+3,w*.36,6);
            g.fillStyle(0x5a5145,.62);g.fillTriangle(x+w*.18,y+h-2,x+w*.31,y+h*.25,x+w*.43,y+h-2);
            g.fillStyle(0x795239,.34);g.fillEllipse(x+w*.68,y+h*.7,w*.38,h*.3);
        }
    }

    createHumanSigns ()
    {
        const g=this.add.graphics().setDepth(9);

        // Tocos serrados com anéis, lascas e serragem.
        [[1470,535,42,120],[1560,558,34,92]].forEach(([x,y,w,h],i)=>{
            g.fillStyle(0x63462f,1);g.fillRoundedRect(x,y,w,h,5);
            g.fillStyle(0xa57a51,.92);g.fillEllipse(x+w/2,y,w+2,14);
            g.lineStyle(2,0x69472f,.8);g.strokeEllipse(x+w/2,y,w*.72,8);
            g.strokeEllipse(x+w/2,y,w*.38,4);
            g.fillStyle(0x9b744e,.42);
            g.fillTriangle(x+w*.18,y+4,x-7,y+15,x+w*.34,y+13);
            g.fillTriangle(x+w*.72,y+5,x+w+9,y+18,x+w*.58,y+15);
            for(let s=0;s<4;s++)g.fillEllipse(x-10+s*12,y+h-2-(s%2)*3,8+s,3);
        });

        // Madeira cortada: casca, rachaduras e extremidades visíveis.
        [[1650,612,78,12],[1670,596,76,11],[1692,580,72,10],[1735,613,58,11]].forEach(([x,y,w,h],i)=>{
            g.fillStyle(0x755337,.94);g.fillRoundedRect(x,y,w,h,5);
            g.fillStyle(0x9a704b,.42);g.fillEllipse(x+5,y+h*.5,10,h-1);
            g.lineStyle(1,0x4c3528,.7);g.beginPath();g.moveTo(x+w*.35,y+2);g.lineTo(x+w*.48,y+h-2);g.strokePath();
        });

        // Corda enrolada com voltas sobrepostas.
        g.lineStyle(4,0x9a7a4c,.82);
        [18,14,10].forEach((r,i)=>g.strokeCircle(1610+i*5,610,r));

        // Caixa com tábuas, tampa e sombra.
        g.fillStyle(0x33271e,.25);g.fillEllipse(1819,644,72,13);
        g.fillStyle(0x725437,.96);g.fillRoundedRect(1790,596,58,46,3);
        g.lineStyle(3,0x3d2c20,.9);g.strokeRect(1790,596,58,46);
        g.lineStyle(2,0x8d6742,.82);
        [607,620,633].forEach(y=>{g.beginPath();g.moveTo(1793,y);g.lineTo(1845,y);g.strokePath();});
        g.fillStyle(0x66472f,.95);g.fillRect(1786,591,66,9);
        g.lineStyle(2,0x3d2c20,.8);g.strokeRect(1786,591,66,9);

        // Ferramentas: cabo e parte metálica separáveis visualmente.
        g.lineStyle(5,0x6b4c31,.95);g.beginPath();g.moveTo(1870,615);g.lineTo(1910,578);g.strokePath();
        g.fillStyle(0xa3aaa5,.9);g.fillRoundedRect(1903,568,31,10,3);
        g.lineStyle(4,0x6b4c31,.85);g.beginPath();g.moveTo(1945,620);g.lineTo(1964,585);g.strokePath();
        g.fillStyle(0x8f9690,.84);g.fillTriangle(1957,581,1972,576,1968,590);

        // Fogueira apagada: pedras, carvão e cinza.
        g.fillStyle(0x5a5145,.78);
        for(let i=0;i<9;i++){const a=Math.PI*2*i/9;g.fillEllipse(2025+Math.cos(a)*30,625+Math.sin(a)*11,11,7);}
        g.fillStyle(0x888276,.24);g.fillEllipse(2025,627,58,15);
        g.lineStyle(6,0x453024,.95);g.beginPath();g.moveTo(2006,628);g.lineTo(2044,603);g.strokePath();g.beginPath();g.moveTo(2042,628);g.lineTo(2008,603);g.strokePath();
        g.fillStyle(0x1d1c18,.88);g.fillEllipse(2025,628,52,12);
        this.add.ellipse(2025,575,64,92,0xb9b7a5,.04).setDepth(8);

        // Marcas de arrasto e pegadas humanas.
        g.lineStyle(4,0x5c4635,.42);
        [[2070,642,2200,630],[2140,648,2260,638]].forEach(([a,b,c,d])=>{g.beginPath();g.moveTo(a,b);g.lineTo(c,d);g.strokePath();});
        g.fillStyle(0x594635,.68);
        for(let i=0;i<7;i++)g.fillEllipse(2090+i*58,630-(i%2)*7,12,23);
    }

    createMapinguariSigns ()
    {
        const g=this.add.graphics().setDepth(8);

        // A partir daqui a destruição deixa de ser organizada e passa a ser bruta.
        this.drawGiantFootprint(g,9760,625,.88);
        this.drawGiantFootprint(g,10240,620,1.08);
        this.drawGiantFootprint(g,10560,610,1.22);

        // Troncos partidos de modo irregular e em alturas impossíveis para ferramentas comuns.
        g.lineStyle(18,0x493124,.9);
        [[9800,535,9885,455],[9980,500,10065,382],[10320,455,10410,330],[10475,470,10570,345]].forEach(([x1,y1,x2,y2],i)=>{
            g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.strokePath();
            g.fillStyle(0x6a4932,.82);g.fillTriangle(x2-10,y2+8,x2+8,y2+18,x2+3,y2-10-(i%2)*7);
        });

        // Sulcos largos e vegetação esmagada atravessando o caminho.
        g.lineStyle(14,0x2d211a,.68);
        [[9860,635,10000,600],[10070,630,10220,590],[10360,625,10525,575]].forEach(([x1,y1,x2,y2])=>{g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.strokePath();});
        g.fillStyle(0x203523,.52);
        [[9950,620,90,16],[10170,612,110,18],[10440,600,125,20]].forEach(([x,y,w,h])=>g.fillEllipse(x,y,w,h));

        // Objetos humanos deslocados pela passagem de algo grande.
        g.fillStyle(0x725437,.75);g.fillRect(10080,560,48,34);g.fillRect(10460,535,38,28);
        g.lineStyle(4,0x9a7a4c,.55);g.beginPath();g.moveTo(10110,585);g.lineTo(10165,545);g.strokePath();

        // Marcas muito altas.
        g.lineStyle(11,0x4b3325,.78);
        g.beginPath();g.moveTo(10320,420);g.lineTo(10390,310);g.strokePath();
        g.beginPath();g.moveTo(10348,425);g.lineTo(10425,322);g.strokePath();

        this.mapinguariLeaves=[
            this.add.ellipse(10500,500,34,14,0x284b30,.78).setDepth(7),
            this.add.ellipse(10540,480,38,15,0x31593a,.74).setDepth(7),
            this.add.ellipse(10580,510,32,13,0x24452d,.76).setDepth(7),
            this.add.ellipse(10620,492,31,12,0x294c31,.7).setDepth(7)
        ];
        this.mapinguariLeaves.forEach((leaf,i)=>{
            this.tweens.add({targets:leaf,x:leaf.x+(i%2?8:-8),angle:(i%2?7:-7),duration:250+i*30,yoyo:true,repeat:-1,ease:'Sine.InOut'});
        });

        // Presença parcial: maior que antes, ainda escondida atrás da vegetação.
        this.mapinguariShadow=this.add.ellipse(10795,395,168,292,0x050605,.3).setDepth(-8);
        this.mapinguariEyes=[
            this.add.circle(10768,357,5,0xd4b35e,.28).setDepth(-7),
            this.add.circle(10800,357,5,0xd4b35e,.28).setDepth(-7)
        ];
        this.mapinguariShadow.setVisible(false);
        this.mapinguariEyes.forEach(e=>e.setVisible(false));
    }

    drawGiantFootprint (g,x,y,scale=1)
    {
        g.fillStyle(0x1f1915,.26);g.fillEllipse(x+2*scale,y+4*scale,60*scale,76*scale);
        g.fillStyle(0x2e241d,.7);g.fillEllipse(x,y,43*scale,62*scale);
        g.fillEllipse(x-20*scale,y-32*scale,16*scale,24*scale);
        g.fillEllipse(x,y-38*scale,16*scale,25*scale);
        g.fillEllipse(x+20*scale,y-31*scale,16*scale,23*scale);
        g.fillStyle(0x7a6247,.24);
        g.fillEllipse(x-31*scale,y+8*scale,15*scale,6*scale);
        g.fillEllipse(x+30*scale,y-2*scale,18*scale,6*scale);
        g.fillStyle(0x806b43,.35);
        g.fillEllipse(x-34*scale,y-13*scale,12*scale,5*scale);
        g.fillEllipse(x+34*scale,y+14*scale,10*scale,4*scale);
    }

    createAttackHitbox ()
    {
        this.attackHitbox=this.add.rectangle(-100,-100,54,46,0x000000,0);this.physics.add.existing(this.attackHitbox);this.attackHitbox.body.setAllowGravity(false);this.attackHitbox.body.enable=false;this.physics.add.overlap(this.attackHitbox,this.snake,()=>this.tryHitSnake());this.physics.add.overlap(this.attackHitbox,this.carapana,()=>this.tryHitCarapana());
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
                const dashDuration=this.dashDuration||380;
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

    createSnake ()
    {
        this.snakePatrol = {
            minX: 930,
            maxX: 1160,
            speed: 70
        };

        this.snake = this.add.rectangle(1040, 620, 72, 24, 0x000000, 0);
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
            minX: 1660,
            maxX: 1940,
            baseX: 1800,
            baseY: 350,
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
                const returnDx = patrol.baseX - this.carapana.x;
                const returnDy = patrol.baseY - this.carapana.y;
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
        this.invulnerableUntil = this.time.now + 1000;        this.knockbackUntil = this.time.now + 120;

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
            this.nextHungerDrainAt = this.time.now + 2000;
            this.nextStarvationDamageAt = this.time.now + 2000;
            this.invulnerableUntil = this.time.now + 1000;
            this.isPlayerDead = false;
            this.updateHealthHud();
            this.updateHungerHud();
            this.updateStaminaHud();
            this.playerVisual.setAlpha(1);
            this.resetUnstablePlatforms();
            this.clearLivingAtmosphereTransient();
        });
    }

    createFruits ()
    {
        this.fruits = [];

        const fruitData = [
            { x: 520, y: 555, color: 0xc94432 },
            { x: 1280, y: 420, color: 0xe0b843 },
            { x: 2050, y: 520, color: 0xd77a2f },
            { x: 2760, y: 390, color: 0xc94432 },
            { x: 3720, y: 330, color: 0xe0b843 }
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

    createUnstablePlatforms ()
    {
        this.unstablePlatforms=[];
        this.unstableChainTimer=null;
        this.unstableChainObjects=[];
        const data=[
            {x:1505,y:510,w:145,h:24},
            {x:2050,y:425,w:145,h:24},
            {x:2860,y:545,w:150,h:24},
            {x:3320,y:505,w:150,h:24}
        ];

        data.forEach((d,index)=>{
            const body=this.add.rectangle(d.x,d.y,d.w,d.h,0x000000,0);
            this.physics.add.existing(body,true);
            this.platforms.add(body);

            const visual=this.add.container(d.x,d.y).setDepth(6);
            const log=this.add.rectangle(0,0,d.w,d.h,0x503621).setStrokeStyle(2,0x78563a,.8);
            const moss=this.add.rectangle(0,-d.h/2+2,d.w-14,5,0x315d34,.85);
            visual.add([log,moss]);

            const sensor=this.add.rectangle(d.x,d.y-20,d.w-12,42,0x000000,0);
            this.physics.add.existing(sensor);
            sensor.body.setAllowGravity(false);
            sensor.body.setImmovable(true);

            const item={...d,body,visual,sensor,index,triggered:false};
            this.unstablePlatforms.push(item);
            this.physics.add.overlap(this.player,sensor,()=>this.triggerUnstablePlatform(item));
        });
    }

    triggerUnstablePlatform (item)
    {
        if(item.triggered||this.phaseCompleted)return;
        item.triggered=true;
        item.sensor.body.enable=false;

        // Aviso visual claro antes da queda: tremida + terra/folhas, sem reduzir a janela atual de reação.
        for(let i=0;i<5;i++){
            const debris=this.add.ellipse(item.x-item.w*.3+i*(item.w*.15),item.y+4,7,3,i%2?0x6b5439:0x547044,.62).setDepth(8);
            this.tweens.add({targets:debris,y:debris.y+14,x:debris.x+(i%2?10:-8),angle:i*38,alpha:0,duration:360+i*28,onComplete:()=>debris.destroy()});
        }

        this.tweens.add({
            targets:item.visual,
            x:item.x+3,
            y:item.y+2,
            angle:1.5,
            duration:55,
            yoyo:true,
            repeat:4,
            onComplete:()=>{
                item.body.body.enable=false;
                this.tweens.add({
                    targets:item.visual,
                    y:item.y+155,
                    angle:item.index%2?9:-9,
                    alpha:.15,
                    duration:650,
                    ease:'Quad.In'
                });
                if(item.index===1)this.triggerUnstableChainReaction(item);
            }
        });
    }

    triggerUnstableChainReaction (item)
    {
        if(this.unstableChainTimer)this.unstableChainTimer.remove(false);
        this.unstableChainTimer=this.time.delayedCall(180,()=>{
            this.unstableChainTimer=null;

            const chunk=this.add.rectangle(item.x+95,item.y-6,70,12,0x4a3221,.88).setDepth(8).setAngle(-10);
            this.unstableChainObjects.push(chunk);
            this.tweens.add({
                targets:chunk,
                y:chunk.y+75,
                angle:18,
                alpha:0,
                duration:420,
                ease:'Quad.In',
                onComplete:()=>{
                    const index=this.unstableChainObjects.indexOf(chunk);
                    if(index>=0)this.unstableChainObjects.splice(index,1);
                    chunk.destroy();
                }
            });

            for(let i=0;i<4;i++){
                const leaf=this.add.ellipse(item.x+60+i*15,item.y-12-(i%2)*8,9,4,i%2?0x526d42:0x647c4a,.62).setDepth(9);
                this.unstableChainObjects.push(leaf);
                this.tweens.add({
                    targets:leaf,
                    x:leaf.x+24+i*5,
                    y:leaf.y-18-i*5,
                    angle:50+i*25,
                    alpha:0,
                    duration:330+i*35,
                    onComplete:()=>{
                        const index=this.unstableChainObjects.indexOf(leaf);
                        if(index>=0)this.unstableChainObjects.splice(index,1);
                        leaf.destroy();
                    }
                });
            }

            this.cameras.main.shake(55,.0008);
        });
    }

    resetUnstablePlatforms ()
    {
        if(this.unstableChainTimer){
            this.unstableChainTimer.remove(false);
            this.unstableChainTimer=null;
        }
        this.unstableChainObjects.forEach(object=>{
            if(object&&object.active){
                this.tweens.killTweensOf(object);
                object.destroy();
            }
        });
        this.unstableChainObjects.length=0;

        this.unstablePlatforms.forEach(item=>{
            this.tweens.killTweensOf(item.visual);
            item.triggered=false;
            item.body.body.enable=true;
            item.sensor.body.enable=true;
            item.visual.setPosition(item.x,item.y).setAngle(0).setAlpha(1);
        });
    }

    createCompanionClue ()
    {
        const camp=this.add.graphics().setDepth(11);

        // Barraca rasgada e inclinada: o acampamento foi abandonado às pressas.
        camp.fillStyle(0x50503d,.85);camp.fillTriangle(9450,625,9520,525,9590,625);
        camp.fillStyle(0x383a30,.28);camp.fillTriangle(9460,621,9520,538,9578,621);
        camp.lineStyle(5,0x332b21,.95);camp.beginPath();camp.moveTo(9520,525);camp.lineTo(9520,625);camp.strokePath();
        camp.lineStyle(3,0x28241f,.9);camp.beginPath();camp.moveTo(9497,552);camp.lineTo(9546,596);camp.strokePath();
        camp.beginPath();camp.moveTo(9550,548);camp.lineTo(9510,600);camp.strokePath();
        camp.lineStyle(2,0x757561,.42);camp.beginPath();camp.moveTo(2472,610);camp.lineTo(2518,541);camp.lineTo(2570,611);camp.strokePath();

        // Caixa aberta, ferramenta caída e objetos espalhados.
        camp.fillStyle(0x755337,.95);camp.fillRect(9600,590,62,48);camp.lineStyle(3,0x3d2c20,.9);camp.strokeRect(9600,590,62,48);
        camp.fillStyle(0x6d4b31,.9);camp.fillRect(9596,572,68,12);camp.lineStyle(3,0x3d2c20,.85);camp.strokeRect(9596,572,68,12);
        camp.fillStyle(0x755337,.8);camp.fillRect(9680,610,44,30);camp.fillRect(9735,625,26,14);
        camp.lineStyle(5,0x6b4c31,.9);camp.beginPath();camp.moveTo(9695,596);camp.lineTo(9738,620);camp.strokePath();
        camp.fillStyle(0x8f9690,.82);camp.fillRect(9686,589,28,9);
        camp.lineStyle(3,0x9a7a4c,.72);camp.beginPath();camp.moveTo(9550,640);camp.lineTo(9630,620);camp.lineTo(9705,642);camp.strokePath();

        // Pegadas humanas se dispersam em direções diferentes.
        camp.fillStyle(0x594635,.62);
        [[9530,636],[9575,631],[9625,642],[9670,632],[9712,644]].forEach(([x,y],i)=>camp.fillEllipse(x,y-(i%2)*5,12,23));
        // Uma presença impossível no meio do acampamento.
        this.drawGiantFootprint(camp,9790,615,.78);

        // Lenço destacado discretamente por halo, sem asset externo.
        this.companionScarfGlow=this.add.ellipse(9815,495,62,38,0xd8b5ba,.08).setDepth(13);
        this.companionScarf=this.add.rectangle(9815,495,34,15,0x9e3f52,.96).setAngle(-18).setDepth(14);
        this.tweens.add({targets:[this.companionScarf,this.companionScarfGlow],alpha:{from:.7,to:1},duration:700,yoyo:true,repeat:-1,ease:'Sine.InOut'});
        this.tweens.add({targets:this.companionScarf,angle:{from:-21,to:-12},y:this.companionScarf.y-3,duration:700,yoyo:true,repeat:-1,ease:'Sine.InOut'});

        // Marca inequívoca feita por ela.
        camp.lineStyle(5,0xc3a477,.92);camp.beginPath();camp.moveTo(9860,520);camp.lineTo(9880,500);camp.lineTo(9900,520);camp.lineTo(9880,540);camp.closePath();camp.strokePath();

        // Trilha visual após a pista: pegadas/galhos/marcas orientam para a direita.
        this.companionTrail=this.add.graphics().setDepth(10);
        this.companionTrail.setAlpha(.28);
        this.companionTrail.fillStyle(0x675140,.75);
        [[9925,615],[9965,605],[10008,617]].forEach(([x,y],i)=>this.companionTrail.fillEllipse(x,y-(i%2)*6,11,22));
        this.companionTrail.lineStyle(3,0x6d5539,.75);
        [[9945,570,9975,552],[9990,560,10023,544]].forEach(([a,b,c,d])=>{this.companionTrail.beginPath();this.companionTrail.moveTo(a,b);this.companionTrail.lineTo(c,d);this.companionTrail.strokePath();});

        this.companionClueSensor=this.add.rectangle(9845,545,170,180,0x000000,0);
        this.physics.add.existing(this.companionClueSensor);
        this.companionClueSensor.body.setAllowGravity(false);
        this.companionClueSensor.body.setImmovable(true);
        this.physics.add.overlap(this.player,this.companionClueSensor,()=>this.revealCompanionClue());
    }

    revealCompanionClue ()
    {
        if(this.companionClueFound)return;
        this.companionClueFound=true;
        this.companionClueSensor.body.enable=false;
        this.player.body.setVelocityX(0);
        this.knockbackUntil=this.time.now+1900;

        // Pequena desaceleração narrativa: aproximação discreta e foco no lenço.
        this.cameras.main.zoomTo(1.045,260,'Sine.easeInOut');
        this.tweens.add({targets:this.companionScarfGlow,scale:1.35,alpha:.16,duration:320,yoyo:true,repeat:1});

        const panel=this.add.rectangle(512,330,470,100,0x06100d,.92).setScrollFactor(0).setDepth(190);
        const text=this.add.text(512,330,'É dela.',{fontFamily:'Arial Black',fontSize:'28px',color:'#f1e1ae'}).setOrigin(.5).setScrollFactor(0).setDepth(191);

        this.time.delayedCall(900,()=>{
            text.setText('Ela esteve aqui recentemente.').setFontSize(24);
            this.companionTrail.setAlpha(.72);
        });
        this.time.delayedCall(1900,()=>{
            panel.destroy();text.destroy();
            this.cameras.main.zoomTo(1,320,'Sine.easeInOut');
            this.tweens.add({targets:this.companionTrail,alpha:{from:.72,to:.42},duration:700});
        });
    }

    createMapinguariEscape ()
    {
        this.escapeTrigger=this.add.rectangle(10590,520,180,230,0x000000,0);
        this.physics.add.existing(this.escapeTrigger);
        this.escapeTrigger.body.setAllowGravity(false);
        this.escapeTrigger.body.setImmovable(true);
        this.physics.add.overlap(this.player,this.escapeTrigger,()=>this.startMapinguariEscape());

        this.escapeBlocker=null;
    }

    startMapinguariEscape ()
    {
        if(this.escapeStarted||!this.companionClueFound)return;
        this.escapeStarted=true;
        this.escapeTrigger.body.enable=false;
        this.spawnPoint={...this.escapeCheckpoint};

        // SILÊNCIO -> vegetação reage -> impacto -> árvore cai -> sombra cruza o fundo.
        this.mapinguariLeaves.forEach((leaf,i)=>{
            this.tweens.add({targets:leaf,scaleX:1.18,angle:(i%2?14:-14),duration:120,yoyo:true,repeat:3,delay:i*35});
        });

        this.time.delayedCall(260,()=>{
            this.showImpactBurst(10560,560);
            this.cameras.main.shake(210,.0038);
        });

        this.time.delayedCall(430,()=>{
            this.mapinguariShadow.setVisible(true).setAlpha(.1).setX(10745);
            this.mapinguariEyes.forEach(e=>e.setVisible(true).setAlpha(.16));
            this.tweens.add({targets:this.mapinguariShadow,x:10835,alpha:.42,duration:520,ease:'Sine.InOut',yoyo:true});
            this.tweens.add({targets:this.mapinguariEyes,alpha:.42,duration:240,yoyo:true,repeat:1});
        });

        this.time.delayedCall(520,()=>{
            // Árvore cai atrás e bloqueia retorno.
            const fallen=this.add.rectangle(10500,520,260,30,0x4a3020,.96).setOrigin(.5).setDepth(12).setAngle(-72);
            this.tweens.add({
                targets:fallen,angle:-8,y:610,duration:520,ease:'Quad.In',
                onComplete:()=>{
                    this.escapeBlocker=this.add.rectangle(10495,610,250,44,0x000000,0);
                    this.physics.add.existing(this.escapeBlocker,true);
                    this.physics.add.collider(this.player,this.escapeBlocker);
                    this.showImpactBurst(10510,600);
                }
            });
        });

        this.time.delayedCall(900,()=>{this.cameras.main.shake(150,.0028);this.showImpactBurst(10870,530);});
        this.time.delayedCall(980,()=>this.warnAndDropEscapeTree());
        this.time.delayedCall(1380,()=>{this.cameras.main.shake(130,.0022);this.showImpactBurst(11100,500);});
    }

    warnAndDropEscapeTree ()
    {
        if(this.escapeSecondTree)return;
        const warningLeaves=[];
        for(let i=0;i<4;i++){
            const leaf=this.add.ellipse(11020+i*18,330-i*10,11,5,0x526c43,.72).setDepth(20);
            warningLeaves.push(leaf);
            this.tweens.add({targets:leaf,x:leaf.x+(i%2?8:-8),angle:i%2?12:-12,duration:95,yoyo:true,repeat:3});
        }
        const tree=this.add.rectangle(11080,335,250,28,0x4a3020,.96).setOrigin(.5).setDepth(12).setAngle(-74);
        this.escapeSecondTree=tree;
        this.time.delayedCall(360,()=>{
            warningLeaves.forEach(leaf=>this.tweens.add({targets:leaf,alpha:0,duration:160,onComplete:()=>leaf.destroy()}));
            this.tweens.add({targets:tree,angle:-10,y:575,duration:470,ease:'Quad.In',onComplete:()=>{
                this.showImpactBurst(11080,570);
                this.cameras.main.shake(120,.0022);
                if(!this.escapeSecondTreeBlocker){
                    this.escapeSecondTreeBlocker=this.add.rectangle(11080,575,220,30,0x000000,0);
                    this.physics.add.existing(this.escapeSecondTreeBlocker,true);
                    this.physics.add.collider(this.player,this.escapeSecondTreeBlocker);
                }
            }});
        });
    }

    showImpactBurst (x,y)
    {
        const dust=this.add.circle(x,y,24,0x9e9278,.16).setDepth(24);
        this.tweens.add({targets:dust,scale:4,alpha:0,duration:420,onComplete:()=>dust.destroy()});
        for(let i=0;i<6;i++){
            const leaf=this.add.ellipse(x,y,10,5,i%2?0x5f7545:0x465d38,.7).setDepth(25);
            const a=(Math.PI*2*i)/6;
            this.tweens.add({targets:leaf,x:x+Math.cos(a)*55,y:y+Math.sin(a)*38,angle:i*55,alpha:0,duration:430,onComplete:()=>leaf.destroy()});
        }
    }

    completeEscape ()
    {
        if(this.escapeCompleted)return;
        this.escapeCompleted=true;

        // A tensão cai de novo: presença some e o olhar é conduzido aos rastros finais.
        if(this.mapinguariShadow)this.tweens.add({targets:this.mapinguariShadow,alpha:0,duration:500});
        if(this.mapinguariEyes)this.tweens.add({targets:this.mapinguariEyes,alpha:0,duration:350});
        this.cameras.main.shake(80,.0012);

        const trail=this.add.graphics().setDepth(15);
        this.drawGiantFootprint(trail,11490,420,.72);
        trail.fillStyle(0x66513f,.78);trail.fillEllipse(11550,420,12,24);trail.fillEllipse(11580,410,12,24);

        const line=this.add.text(512,214,'“Os rastros seguem juntos.”',{
            fontFamily:'Arial',fontSize:'22px',color:'#d9dfd6',backgroundColor:'#06100dcc',padding:{x:16,y:9}
        }).setOrigin(.5).setScrollFactor(0).setDepth(180).setAlpha(0);
        this.tweens.add({targets:line,alpha:1,duration:500});
        this.time.delayedCall(2100,()=>this.tweens.add({targets:line,alpha:0,duration:350,onComplete:()=>line.destroy()}));
    }

    tryDash ()
    {
        if(!this.dashUnlocked||this.phaseCompleted||this.isPlayerDead||this.isDashing||this.time.now<this.nextDashAt)return;
        const grounded=this.player.body.blocked.down||this.player.body.touching.down;
        if(!grounded&&this.airDashUsed){this.showDashUnavailableFeedback();return;}
        if(this.stamina<this.dashStaminaCost){this.showStaminaBlockedFeedback();return;}
        const left=this.cursors.left.isDown||this.keyA.isDown||this.mobileInput?.left===true;
        const right=this.cursors.right.isDown||this.keyD.isDown||this.mobileInput?.right===true;
        const direction=left&&!right?-1:right&&!left?1:(this.playerVisual.facing||1);

        this.spendStamina(this.dashStaminaCost);
        this.isDashing=true;
        this.dashLandingVisual=false;
        this.dashDirection=direction;
        this.dashEndsAt=this.time.now+this.dashDuration;
        this.nextDashAt=this.time.now+this.dashCooldown;
        if(!grounded)this.airDashUsed=true;

        this.player.body.setVelocityX(direction*this.dashSpeed);
        this.player.body.setVelocityY(this.player.body.velocity.y*.45);
        this.setMotionSquash(1.09,.92,125);
        this.showDashFeedback(direction);
    }

    showDashFeedback (direction)
    {
        const ghost=this.add.container(this.player.x-direction*8,this.player.y).setDepth(17).setAlpha(.22);
        ghost.add([
            this.add.rectangle(0,-4,25,38,0xc7aa73,.55),
            this.add.circle(0,-31,9,0xb98155,.55),
            this.add.rectangle(direction*11,4,7,34,0xb8c0ba,.45).setAngle(direction*-18)
        ]);
        this.tweens.add({targets:ghost,x:ghost.x-direction*34,alpha:0,duration:210,onComplete:()=>ghost.destroy()});

        for(let i=0;i<4;i++){
            const line=this.add.rectangle(this.player.x-direction*(18+i*12),this.player.y-18+i*10,22+i*4,3,0xd6e1cf,.4).setDepth(18);
            this.tweens.add({targets:line,x:line.x-direction*48,alpha:0,duration:210+i*22,onComplete:()=>line.destroy()});
        }
        for(let i=0;i<3;i++){
            const leaf=this.add.ellipse(this.player.x-direction*8,this.player.y+10+i*6,9,4,0x668d4d,.75).setDepth(19);
            this.tweens.add({targets:leaf,x:leaf.x-direction*(40+i*10),y:leaf.y-12-i*4,angle:direction*70,alpha:0,duration:290,onComplete:()=>leaf.destroy()});
        }
    }

    showDashUnavailableFeedback ()
    {
        if(this.time.now<this.nextDashDeniedFeedbackAt)return;
        this.nextDashDeniedFeedbackAt=this.time.now+240;
        const pulse=this.add.circle(this.player.x,this.player.y,11,0xc8d8ce,.08).setDepth(18);
        this.tweens.add({targets:pulse,scale:1.7,alpha:0,duration:160,onComplete:()=>pulse.destroy()});
    }

    showAirDashRechargeFeedback ()
    {
        const ring=this.add.circle(this.player.x,this.player.y+24,10,0x9fc98a,.22).setDepth(18);
        this.tweens.add({targets:ring,scale:2.1,alpha:0,duration:220,onComplete:()=>ring.destroy()});
    }

    updateDash (time,grounded)
    {
        if(grounded&&!this.wasGrounded){
            if(this.airDashUsed){
                this.airDashUsed=false;
                this.showAirDashRechargeFeedback();
            }
            if(this.isDashing){
                this.dashLandingVisual=true;
                this.playerVisual.parts.macheteGripAngle=18;
            }
        }
        if(this.isDashing&&time>=this.dashEndsAt){
            this.isDashing=false;
            this.dashLandingVisual=false;
            this.playerVisual.parts.macheteGripAngle=18;
        }
    }

    updateGroundedState (grounded)
    {
        const time=this.time.now;
        if(!grounded)this.lastAirVelocityY=this.player.body.velocity.y;
        if(grounded)this.coyoteUntil=time+this.coyoteTimeMs;
        if(grounded&&!this.wasGrounded){
            this.jumpsUsed=0;
            this.fastFallActive=false;
            this.showLandingFeedback(this.lastAirVelocityY);
            this.lastAirVelocityY=0;
        }
        this.wasGrounded=grounded;
    }

    queueJumpInput (time)
    {
        this.jumpBufferUntil=time+this.jumpBufferMs;
    }

    consumeJumpBuffer (grounded)
    {
        if(this.jumpBufferUntil<this.time.now)return false;
        if(this.isDashing&&!grounded)return false;
        if(this.isDashing&&grounded){this.isDashing=false;this.dashLandingVisual=false;this.playerVisual.parts.macheteGripAngle=18;}
        if(this.jumpsUsed===0&&(grounded||this.time.now<=this.coyoteUntil)){
            this.player.body.setVelocityY(-520);
            this.jumpsUsed=1;
            this.coyoteUntil=0;
            this.jumpBufferUntil=0;
            this.showJumpTakeoffEffect();
            this.setMotionSquash(1.07,.93,115);
            return true;
        }
        if(this.doubleJumpUnlocked&&this.jumpsUsed===1&&!grounded){
            if(this.stamina<this.doubleJumpStaminaCost){this.showStaminaBlockedFeedback();this.jumpBufferUntil=0;return false;}
            this.spendStamina(this.doubleJumpStaminaCost);
            this.player.body.setVelocityY(-500);
            this.jumpsUsed=2;
            this.jumpBufferUntil=0;
            this.showDoubleJumpBurst(false);
            this.setMotionSquash(1.045,.955,95);
            return true;
        }
        return false;
    }


    applyJumpCut ()
    {
        if(this.player.body.velocity.y<-90)this.player.body.setVelocityY(this.player.body.velocity.y*.58);
    }

    applyFastFall (grounded)
    {
        const wantsFastFall=this.keyS.isDown||this.cursors.down.isDown;
        const body=this.player.body;
        if(!grounded&&wantsFastFall&&body.velocity.y>35){
            body.setVelocityY(Math.min(780,body.velocity.y+70));
            this.fastFallActive=true;
            return;
        }
        this.fastFallActive=false;
    }

    setMotionSquash (scaleX,scaleY,duration=110)
    {
        this.tweens.killTweensOf(this.motionFx);
        this.motionFx.scaleX=scaleX;this.motionFx.scaleY=scaleY;
        this.tweens.add({targets:this.motionFx,scaleX:1,scaleY:1,duration,ease:'Quad.Out'});
    }

    showJumpTakeoffEffect ()
    {
        for(let i=0;i<3;i++){
            const leaf=this.add.ellipse(this.player.x+(i-1)*8,this.player.y+31,7+i,3,i===1?0x8b7650:0x668d4d,.55).setDepth(18);
            this.tweens.add({targets:leaf,x:leaf.x+(i-1)*12,y:leaf.y+7+i*2,alpha:0,angle:(i-1)*35,duration:180+i*25,onComplete:()=>leaf.destroy()});
        }
    }

    showLandingFeedback (impactVelocity)
    {
        if(impactVelocity<260)return;
        const strong=impactVelocity>=650,medium=impactVelocity>=420;
        this.setMotionSquash(strong?1.1:medium?1.07:1.035,strong?.86:medium?.9:.95,strong?120:95);
        const particles=strong?4:medium?3:2;
        for(let i=0;i<particles;i++){
            const direction=i%2===0?-1:1;
            const dust=this.add.ellipse(this.player.x+direction*(7+i*2),this.player.y+31,9,4,i%2?0x756346:0x5d7b49,medium?.62:.42).setDepth(18);
            this.tweens.add({targets:dust,x:dust.x+direction*(16+i*5),y:dust.y-(5+i*2),alpha:0,scaleX:1.35,duration:strong?260:210,onComplete:()=>dust.destroy()});
        }
        if(strong)this.cameras.main.shake(70,.0012);
    }

    showDirectionChangeFeedback (direction)
    {
        this.tweens.killTweensOf(this.directionFx);
        this.directionFx.lean=direction*-5;
        this.tweens.add({targets:this.directionFx,lean:0,duration:120,ease:'Quad.Out'});
    }

    resetMovementPolishState ()
    {
        this.jumpsUsed=0;this.jumpWasDown=false;this.jumpBufferUntil=0;this.coyoteUntil=0;this.wasGrounded=false;this.lastAirVelocityY=0;this.fastFallActive=false;this.lastMoveDirection=0;
        this.isDashing=false;this.dashLandingVisual=false;this.dashEndsAt=0;this.nextDashAt=0;this.airDashUsed=false;
        this.tweens.killTweensOf(this.motionFx);this.tweens.killTweensOf(this.directionFx);
        this.motionFx.scaleX=1;this.motionFx.scaleY=1;this.directionFx.lean=0;
        this.playerVisual.parts.macheteGripAngle=18;
        this.playerVisual.setScale(this.playerVisual.facing||1,1);
    }

    spendStamina (amount)
    {
        this.stamina=Math.max(0,this.stamina-amount);
        this.staminaRegenBlockedUntil=this.time.now+this.staminaRegenDelay;
        this.updateStaminaHud();
    }

    updateStamina (time,grounded)
    {
        const delta=Math.min(.05,Math.max(0,(time-this.lastStaminaUpdateAt)/1000));
        this.lastStaminaUpdateAt=time;
        if(this.phaseCompleted||this.isPlayerDead||time<this.staminaRegenBlockedUntil||this.stamina>=this.maxStamina)return;
        const rate=grounded?this.staminaGroundRegen:this.staminaAirRegen;
        this.stamina=Math.min(this.maxStamina,this.stamina+rate*delta);
        this.updateStaminaHud();
    }

    showStaminaBlockedFeedback ()
    {
        if(!this.staminaHud||this.time.now<this.nextStaminaFeedbackAt)return;
        this.nextStaminaFeedbackAt=this.time.now+220;
        this.tweens.killTweensOf(this.staminaBar);
        this.tweens.add({targets:this.staminaBar,alpha:.25,duration:70,yoyo:true,repeat:2,onComplete:()=>this.staminaBar.setAlpha(1)});
    }

    showDoubleJumpBurst (isFirst = false)
    {
        const burst = this.add.circle(
            this.player.x,
            this.player.y + 24,
            isFirst ? 18 : 12,
            0xc8d59b,
            isFirst ? 0.5 : 0.35
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
        this.escapeFinishZone=this.add.rectangle(11460,500,160,230,0x000000,0);
        this.physics.add.existing(this.escapeFinishZone);
        this.escapeFinishZone.body.setAllowGravity(false);
        this.escapeFinishZone.body.setImmovable(true);
        this.physics.add.overlap(this.player,this.escapeFinishZone,()=>{if(this.escapeStarted)this.completeEscape();});

        this.finalZone=this.add.rectangle(12120,345,110,190,0x000000,0);
        this.physics.add.existing(this.finalZone);
        this.finalZone.body.setAllowGravity(false);
        this.finalZone.body.setImmovable(true);
        this.physics.add.overlap(this.player,this.finalZone,()=>this.completeLevel4());

        const g=this.add.graphics().setDepth(9);
        this.drawGiantFootprint(g,11600,405,.72);
        g.fillStyle(0x63503e,.72);
        g.fillEllipse(11650,405,12,24);

        // Entrada escura entre raízes e pedras.
        g.fillStyle(0x050706,.9);g.fillEllipse(12150,330,145,230);
        g.lineStyle(22,0x3e2c1f,.95);
        g.beginPath();g.moveTo(12070,455);g.lineTo(12125,260);g.strokePath();
        g.beginPath();g.moveTo(12230,455);g.lineTo(12175,260);g.strokePath();
    }

    completeLevel4 ()
    {
        if(this.phaseCompleted||!this.escapeCompleted)return;
        this.phaseCompleted=true;
        this.player.body.setVelocity(0,0);
        this.isAttacking=false;
        this.isDashing=false;
        this.attackHitbox.body.enable=false;

        const overlay=this.add.rectangle(512,384,1024,768,0x020705,.94).setScrollFactor(0).setDepth(300).setAlpha(0);
        this.tweens.add({targets:overlay,alpha:1,duration:420});

        const phase=this.add.text(512,185,'FASE 4 CONCLUÍDA',{fontFamily:'Arial Black',fontSize:'42px',color:'#f1e1ae'}).setOrigin(.5).setScrollFactor(0).setDepth(301).setAlpha(0);
        const name=this.add.text(512,255,'RASTROS NA MATA FERIDA',{fontFamily:'Arial Black',fontSize:'27px',color:'#c9b477'}).setOrigin(.5).setScrollFactor(0).setDepth(301).setAlpha(0);
        const line=this.add.text(512,342,'“Os rastros seguem juntos.”',{fontFamily:'Arial',fontSize:'24px',color:'#c8d8cc'}).setOrigin(.5).setScrollFactor(0).setDepth(301).setAlpha(0);
        const territory=this.add.text(512,425,'TERRITÓRIO DO MAPINGUARI',{fontFamily:'Arial Black',fontSize:'30px',color:'#d6b56c'}).setOrigin(.5).setScrollFactor(0).setDepth(301).setAlpha(0);

        this.tweens.add({targets:phase,alpha:1,duration:360,delay:180});
        this.tweens.add({targets:name,alpha:1,duration:380,delay:520});
        this.tweens.add({targets:line,alpha:1,duration:400,delay:900});
        this.tweens.add({targets:territory,alpha:1,scale:{from:.96,to:1},duration:520,delay:1400});

        const b=this.add.rectangle(512,545,280,64,0x8b5a2b).setStrokeStyle(3,0xd6b56c).setScrollFactor(0).setDepth(301).setInteractive({useHandCursor:true}).setAlpha(0);
        const bt=this.add.text(512,545,'CONTINUAR',{fontFamily:'Arial Black',fontSize:'23px',color:'#fff'}).setOrigin(.5).setScrollFactor(0).setDepth(302).setAlpha(0);
        this.tweens.add({targets:[b,bt],alpha:1,duration:350,delay:1900});
        b.on('pointerdown',()=>{this.cleanupSceneHazardsBeforeTransition();this.scene.start('Level5Scene');});
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
        this.porongaLightPhase=4;

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
        this.livingAtmosphereProfile={"phase":4,"worldWidth":4100,"farScroll":0.07,"farAlpha":0.56,"farColor":1585961,"farStep":300,"farHeight":170,"farHeightStep":30,"farTrunk":19,"farCrown":54,"lowCanopy":false,"lowCanopyColor":1383188,"fogColor":12043716,"fogBackAlpha":0.04,"fogMidAlpha":0.045,"fogFrontAlpha":0.028,"rayColor":14925186,"rays":[{"x":760,"y":170,"w":90,"h":380,"alpha":0.035,"angle":-12,"scroll":0.52},{"x":1550,"y":175,"w":95,"h":360,"alpha":0.028,"angle":10,"scroll":0.56}],"swayColor":3883305,"sway":[{"x":720,"y":622,"w":90,"h":22,"alpha":0.2},{"x":1420,"y":620,"w":82,"h":21,"alpha":0.18}],"vignetteAlpha":0.028,"toneColor":1585995,"leafDelay":3100,"moteDelay":2600,"birdDelay":17000,"shadowDelay":10500,"maxLeaves":7,"maxMotes":9,"maxBirds":1,"initialMotes":3,"verticalLeaves":false,"largeLeaves":false,"leafColorA":9073735,"leafColorB":7363640,"leafAlpha":0.47,"leafDepth":16,"moteColor":12168591,"moteAlpha":0.2,"moteDepth":12,"dustMotes":true,"birdColor":1711127,"birdAlpha":0.45,"shadows":true,"shadowW":145,"shadowH":38,"shadowColor":856077,"shadowAlpha":0.1,"region1":1800,"region2":3000};
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
            this.createOrganicFogMass(width*.28,500,width*.72,170,p.fogColor,p.fogBackAlpha,-20,.16,17)
        );
        this.livingFogMid=this.trackLivingPermanent(
            this.createOrganicFogMass(width*.58,555,width*.72,145,p.fogColor,p.fogMidAlpha,-15,.36,25)
        );
        this.livingFogFront=this.trackLivingPermanent(
            this.createOrganicFogMass(width*.42,610,760,90,p.fogColor,p.fogFrontAlpha,3,.72,33)
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
            if(region===1){back*=.98;mid*=1.16;front*=1.14;tone=.06;rayScale=.52;}
            if(region===2){back*=1.12;mid*=1.32;front*=1.12;tone=.11;rayScale=.16;}
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

        this.controlsText = this.add.text(26, 45, 'A/D ou ←/→  mover\nW / ↑ / Espaço  pular\nS / ↓  queda rápida\nJ / X  atacar\nSHIFT  dash', {
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

    showLevelTitle ()
    {
        const playerName = String(this.registry.get('playerName') || 'SERINGUEIRO').slice(0, 16);
        const intro = this.add.container(512, 286).setScrollFactor(0).setDepth(170);
        const panel = this.add.rectangle(0, 0, 430, 132, 0x06100d, 0.76)
            .setStrokeStyle(1, 0x78917c, 0.32);
        const phaseText = this.add.text(0, -38, 'FASE 4', {
            fontFamily: 'Arial Black',
            fontSize: '15px',
            color: '#d6b56c'
        }).setOrigin(0.5);
        const titleText = this.add.text(0, -8, 'RASTROS NA MATA FERIDA', {
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
            delay: 2000,
            duration: 800,
            ease: 'Sine.Out',
            onComplete: () => intro.destroy()
        });
    }

    update ()
    {
        const time=this.time.now;
        const moveSpeed=260;
        const grounded=this.player.body.blocked.down||this.player.body.touching.down;

        this.updateDash(time,grounded);
        this.updateStamina(time,grounded);

        const jumpDown=this.keyW.isDown||this.cursors.up.isDown||this.spaceKey.isDown||this.mobileInput?.jump===true;
        if(jumpDown&&!this.jumpWasDown)this.queueJumpInput(time);
        else if(!jumpDown&&this.jumpWasDown)this.applyJumpCut();
        this.jumpWasDown=jumpDown;

        if(!this.isPlayerDead&&!this.phaseCompleted){
            if(!this.isDashing&&time>=this.knockbackUntil){
                const left=this.cursors.left.isDown||this.keyA.isDown||this.mobileInput?.left===true;
                const right=this.cursors.right.isDown||this.keyD.isDown||this.mobileInput?.right===true;
                const direction=left&&!right?-1:right&&!left?1:0;
                if(direction!==0&&this.lastMoveDirection!==0&&direction!==this.lastMoveDirection)this.showDirectionChangeFeedback(direction);
                if(direction!==0)this.lastMoveDirection=direction;
                if (!applyWetGroundMovement(this, direction, moveSpeed, grounded, time)) this.player.body.setVelocityX(direction*moveSpeed);
            }
            this.updateGroundedState(grounded);
            this.consumeJumpBuffer(grounded);
            this.applyFastFall(grounded);
        } else {
            this.updateGroundedState(grounded);
            this.fastFallActive=false;
        }

        if(this.player.y>720&&!this.isPlayerDead){
            this.handlePlayerDeath();
        }

        this.syncPlayerVisual();
        this.animatePlayerVisual(time);
        this.updatePorongaLight();
        this.updateAttack(time);this.updateMacheteVisual(time);this.updateAttackSprite(time);
        this.updateSnake(time);
        this.updateCarapana(time);
        this.updateFruits(time);
        this.updateHunger(time);
        this.updateLivingAtmosphere();
        this.weatherSystem?.update(time);
        this.oncaEncounter?.update(time);
        this.forestMonkeySystem?.update(time);

        this.audioManager?.updateScene(this, { grounded, time });
        this.horizontalExpansion?.update(this.time.now);
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

}