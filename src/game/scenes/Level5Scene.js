import { Scene } from 'phaser';
import { createBasicMobileControls } from '../mobileControls';
import { createForestMonkeySystem } from '../forestMonkeySystem.js';
import { OncaEncounter } from '../oncaEncounter.js';
import { createHorizontalExpansion } from '../phaseHorizontalExtension.js';
import { addMuddySwampWaterFromGroundSegments } from '../muddySwampWater.js';
import { createTropicalStormSystem, applyWetGroundMovement } from '../weatherSystem.js';
import { getAudioManager } from '../audio/AudioManager.js';
import { createAudioSettingsControl } from '../ui/AudioSettingsPanel.js';
import { createBossHintSign } from '../bossHintSign.js';

export class Level5Scene extends Scene
{
    constructor () { super('Level5Scene'); }

    create ()
    {
        this.worldWidth = 12000;
        this.physics.world.setBounds(0, 0, this.worldWidth, 768);
        this.cameras.main.setBounds(0, 0, this.worldWidth, 768);
        this.cameras.main.setBackgroundColor('#07100f');

        this.createTerritory();
        this.createRubberTreeAccents();
        this.createPlatforms();

        this.player = this.add.rectangle(150, 530, 45, 70, 0x000000, 0);
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
        this.maxStamina = 100;
        this.stamina = 100;
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
        this.attackSoundVariant = -1;
        this.attackArcShown = false;
        this.attackHitBossRegistered = false;

        this.companionFound = false;
        this.bossStarted = false;
        this.bossDefeated = false;
        this.bossStage = 1;
        this.bossProgress = 0;
        this.bossStageProgress = 0;
        this.bossVulnerable = false;
        this.bossState = 'DORMANT';
        this.bossNextActionAt = 0;
        this.bossAttackSerial = 0;
        this.bossAttackHitRegistered = false;
        this.bossFacing = -1;
        this.bossLastChaseAt = 0;
        this.bossCheckpoint = { x: 8960, y: 535 };

        this.createRecentClues();
        this.createFruits();
        this.createTraversalHazards();
        this.createCompanionEncounter();
        this.createBossArena();
        this.createMapinguari();
        this.createAttackHitbox();

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
        this.createBossHud();
        this.showLevelTitle();
        this.createLivingAtmosphere();
        this.createPorongaLightSystem();

        this.spawnPoint = { x: 150, y: 530 };
        this.forestMonkeySystem = createForestMonkeySystem(this, {
            phase: 5,
            perches: [
                { x: 530, y: 258 },
                { x: 1280, y: 282 },
                { x: 2030, y: 258 },
                { x: 2780, y: 286 },
                { x: 3530, y: 255 }
            ],
            damage: 20,
            maxMonkeys: 2,
            throwMin: 1800,
            throwMax: 2600,
            maxProjectiles: 4,
            aimLead: 0.28,
            aimError: 20,
            spawnChance: 0.78,
            isPaused: () =>
                this.phaseCompleted ||
                (this.bossStarted && !this.bossDefeated)
        });
        this.oncaEncounter = new OncaEncounter(this, {
            phase: 5,
            canSpawn: () => {
                const bossActive = this.bossStarted && !this.bossDefeated && this.bossState !== 'DORMANT';
                const bossIntro = this.bossStarted && !this.bossDefeated && this.bossState === 'DORMANT';
                return {
                    allowed: !this.phaseCompleted && !this.isPlayerDead && !bossIntro && !this.bossDefeated,
                    bossActive
                };
            }
        });

        this.weatherSystem = createTropicalStormSystem(this, { phase: 5 });
        this.audioManager = getAudioManager(this);
        this.audioManager?.startScene(this, { music: 'music_forest', ambient: 'forest_ambient' });
        this.audioSettingsUi = createAudioSettingsControl(this, {
            x: 900,
            y: 27,
            buttonSize: 40
        });

        this.horizontalExpansion = createHorizontalExpansion(this, {
            phase: 5,
            startX: 4000,
            endX: 9000,
            traversalEndX: 8700,
            resourceEndX: 8700,
            groundY: 710,
            checkpointXs: [4250, 7350],
            checkpointY: 530,
            enemyXs: [4580, 5480, 6420, 7480, 8250],
            monkeyPerches: [
                { x: 4300, y: 270 }, { x: 5150, y: 250 }, { x: 6020, y: 290 },
                { x: 6920, y: 260 }, { x: 7780, y: 285 }, { x: 8500, y: 255 }
            ]
        });

        this.bossHintSign=createBossHintSign(this,{
            x:5750,
            y:650,
            title:'DICA: MAPINGUARI',
            text:'Mantenha distância e evite os ataques em área. Espere uma abertura, ataque a barriga e recue. Só se aproxime novamente quando ele estiver vulnerável.'
        });
}

    createTerritory ()
    {
        const sky = this.add.graphics().setDepth(-60).setScrollFactor(0);
        sky.fillStyle(0x07100f,1);
        sky.fillRect(0,0,1024,768);
        sky.fillStyle(0x0a1a18,.9);
        sky.fillRect(0,175,1024,415);
        sky.fillStyle(0x101b18,.32);
        sky.fillRect(0,520,1024,248);

        // Lua discreta: agora é o único elemento celeste claramente noturno.
        this.add.circle(850,112,68,0xb8c9c7,.035).setDepth(-59).setScrollFactor(.025);
        this.add.circle(850,112,32,0xc8d6d2,.18).setDepth(-58).setScrollFactor(.025);

        const distant = this.add.graphics().setDepth(-48).setScrollFactor(0.12);
        distant.fillStyle(0x05120d, 1);
        distant.fillRect(-300, 470, this.worldWidth + 700, 320);
        for (let x = 0, i = 0; x < this.worldWidth; x += 250, i += 1) {
            const w=58+(i%4)*13;
            const h=360+(i%3)*70;
            const y=655-h;
            const cx=x+w*.5;
            distant.fillStyle(i%2?0x0a1c14:0x0d2118,.96);
            distant.fillRoundedRect(x,y,w,h,Math.max(8,w*.22));
            distant.fillStyle(0x163024,.24);
            distant.fillRoundedRect(x+w*.16,y+15,w*.18,h-25,5);
            distant.lineStyle(8,0x071710,.72);
            distant.beginPath();distant.moveTo(cx,y+105);distant.lineTo(cx+(i%2?90:-86),y+28);distant.strokePath();
            distant.lineStyle(7,0x071710,.62);
            distant.beginPath();distant.moveTo(cx,650);distant.lineTo(x-32,655);distant.strokePath();
            distant.beginPath();distant.moveTo(cx+5,650);distant.lineTo(x+w+38,655);distant.strokePath();
            const crown=95+(i%3)*14;
            distant.fillStyle(0x0a2519,.94);
            distant.fillEllipse(cx,y+10,crown*1.9,crown*1.22);
            distant.fillEllipse(x-50,y+36,120+(i%2)*14,78);
            distant.fillEllipse(x+w+52,y+40,132+(i%3)*10,84);
            distant.fillStyle(0x123523,.28);
            distant.fillEllipse(cx+28,y-18,crown*.92,crown*.52);
        }

        const roots = this.add.graphics().setDepth(-12).setScrollFactor(0.76);
        roots.lineStyle(28, 0x2d2119, 0.92);
        const rootData = [
            [180,655,380,510],[620,655,830,480],[1050,655,1250,500],[1510,655,1720,450],
            [2060,655,2270,470],[2520,655,2720,430],[3140,655,3350,455],[3630,655,3860,430]
        ];
        rootData.forEach(([x1,y1,x2,y2],i)=>{
            roots.lineStyle(24+(i%3)*4,0x2d2119,.92);
            roots.beginPath();roots.moveTo(x1,y1);roots.lineTo(x1+(x2-x1)*.34,y1-28-(i%2)*16);roots.lineTo(x1+(x2-x1)*.68,y2+36);roots.lineTo(x2,y2);roots.strokePath();
            roots.lineStyle(6,0x513a29,.46);roots.beginPath();roots.moveTo(x1+(x2-x1)*.38,y1-30);roots.lineTo(x1+(x2-x1)*.48,y1-78-(i%3)*10);roots.strokePath();
            roots.fillStyle(0x294c2f,.42);roots.fillEllipse(x1+(x2-x1)*.56,y1-44,76+(i%2)*24,9);
        });

        const marks = this.add.graphics().setDepth(-8).setScrollFactor(0.92);
        [[640,360,720,240],[1450,400,1530,255],[2460,385,2550,235],[3330,410,3420,250]].forEach(([x1,y1,x2,y2],i)=>{
            marks.lineStyle(12,0x4b3425,.72);marks.beginPath();marks.moveTo(x1,y1);marks.lineTo(x2,y2);marks.strokePath();
            marks.lineStyle(8,0x6a4932,.48);marks.beginPath();marks.moveTo(x1+28,y1);marks.lineTo(x2+35,y2+12);marks.strokePath();
            marks.lineStyle(3,0x9a704b,.32);marks.beginPath();marks.moveTo(x1+9,y1-4);marks.lineTo(x2+6,y2+3);marks.strokePath();
            marks.fillStyle(0x6a4932,.55);
            marks.fillTriangle(x2-10,y2+12,x2+7,y2+18,x2+(i%2?15:-2),y2-4);
            marks.fillTriangle(x1+20,y1-8,x1+35,y1+2,x1+26,y1+12);
        });

        this.createOrganicFogMass(880,570,1500,155,0xb7c7bd,.035,-18,.25,7);
        this.createOrganicFogMass(2500,545,2200,175,0xb7c7bd,.045,-17,.42,10);

        const fg = this.add.graphics().setDepth(32).setScrollFactor(1.08).setAlpha(.72);
        [40,260,540,790,1060,1310,1600,1880,2180,2440,2720,3010,3290,3570,3860].forEach((x,i)=>{
            const r=32+(i%4)*6;
            fg.fillStyle(i%2?0x0a2518:0x102c1d,.94);
            fg.fillCircle(x,652,r);
            fg.fillCircle(x+r*.8,656,r*.72);
        });
    }

    createRubberTreeAccents ()
    {
        this.rubberLatexInterval=3600;
        this.createRubberTreeVisual(450,334,38,258,0,7,1);
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

        add(320,650,640,116);
        add(760,560,170,28);
        add(1040,475,175,28);
        add(1320,585,190,30);
        add(1600,650,330,116);
        add(1870,535,175,28);
        add(2140,445,180,28);
        add(2400,555,180,28);
        add(2660,465,175,28);
        add(2870,650,260,116);

        add(3180,650,420,116);
        add(3390,535,180,28);
        add(3630,650,330,116);
        add(3890,535,170,28);

        const g=this.add.graphics().setDepth(5);
        const ground=[[0,592,640,116],[1435,592,330,116],[2740,592,260,116],[2970,592,420,116],[3465,592,330,116]];
        this.muddySwampWater = addMuddySwampWaterFromGroundSegments(this, ground, {
            phase: 5,
            surfaceY: 700,
            endX: 4000
        });
        ground.forEach(([x,y,w,h])=>{g.fillStyle(0x3c2b20,1);g.fillRect(x,y,w,h);});
        this.decorateGroundVisual(g,ground,5);

        const natural=[
            [675,546,170,28,'root'],[955,461,175,28,'root'],[1225,570,190,30,'bank'],
            [1785,521,175,28,'log'],[2050,431,180,28,'root'],[2310,541,180,28,'bank'],[2575,451,175,28,'log'],
            [3300,521,180,28,'root'],[3805,521,170,28,'log']
        ];
        natural.forEach(([x,y,w,h,t])=>this.drawNaturalPlatform(g,x,y,w,h,t));

        // Grandes pegadas e vegetação esmagada reforçam escala.
        [520,1180,1720,2350,2790,3260].forEach((x,i)=>this.drawGiantFootprint(g,x,625,.85+(i%3)*.12));
        g.fillStyle(0x1b2c1e,.5);
        [[900,625,130,20],[1990,620,150,22],[2510,618,130,18]].forEach(([x,y,w,h])=>g.fillEllipse(x,y,w,h));
    }

    drawNaturalPlatform (g,x,y,w,h,type)
    {
        if(type==='log'){
            g.fillStyle(0x3f2c20,1);g.fillRoundedRect(x+4,y+2,w-8,h-3,11);
            g.fillStyle(0x60452f,.6);g.fillEllipse(x+w*.48,y+h*.42,w-18,8);
            g.lineStyle(2,0x211914,.68);[.23,.47,.71].forEach((r,i)=>{g.beginPath();g.moveTo(x+w*r,y+4);g.lineTo(x+w*r+11+(i%2)*6,y+h-4);g.strokePath();});
            g.fillStyle(0x294d2f,.85);g.fillEllipse(x+w*.34,y+1,w*.44,7);g.fillEllipse(x+w*.72,y+2,w*.3,6);
            g.lineStyle(4,0x2f211a,.82);g.beginPath();g.moveTo(x+w*.16,y+h-2);g.lineTo(x+w*.07,y+h+12);g.strokePath();
        }else if(type==='root'){
            g.lineStyle(Math.max(13,h*.66),0x38291f,.98);g.beginPath();
            g.moveTo(x+4,y+h-5);g.lineTo(x+w*.28,y+7);g.lineTo(x+w*.5,y+h*.5);g.lineTo(x+w*.72,y+5);g.lineTo(x+w-4,y+h-5);g.strokePath();
            g.lineStyle(5,0x5a402c,.82);g.beginPath();g.moveTo(x+w*.28,y+8);g.lineTo(x+w*.18,y-6);g.strokePath();g.beginPath();g.moveTo(x+w*.72,y+6);g.lineTo(x+w*.84,y-4);g.strokePath();
            g.fillStyle(0x294d2f,.72);g.fillEllipse(x+w*.48,y+3,w*.5,7);
        }else{
            g.fillStyle(0x493225,1);g.fillRoundedRect(x+2,y+5,w-4,h-5,8);
            g.fillStyle(0x294d2f,.9);g.fillEllipse(x+w*.25,y+2,w*.45,8);g.fillEllipse(x+w*.7,y+3,w*.38,7);
            g.fillStyle(0x424640,.7);g.fillTriangle(x+w*.17,y+h-2,x+w*.31,y+h*.24,x+w*.44,y+h-2);
            g.fillStyle(0x604434,.28);g.fillEllipse(x+w*.7,y+h*.68,w*.34,h*.28);
        }
    }

    drawGiantFootprint (g,x,y,scale=1)
    {
        // Halo de solo comprimido e borda irregular dão sensação de profundidade/peso.
        g.fillStyle(0x0f0d0b,.28);g.fillEllipse(x+2*scale,y+5*scale,68*scale,86*scale);
        g.fillStyle(0x211a15,.74);g.fillEllipse(x,y,47*scale,67*scale);
        g.fillEllipse(x-22*scale,y-34*scale,18*scale,25*scale);
        g.fillEllipse(x,y-41*scale,18*scale,28*scale);
        g.fillEllipse(x+22*scale,y-33*scale,18*scale,25*scale);
        g.fillStyle(0x66513b,.22);
        g.fillEllipse(x-35*scale,y+9*scale,17*scale,6*scale);
        g.fillEllipse(x+34*scale,y-4*scale,20*scale,7*scale);
        g.fillEllipse(x-26*scale,y-48*scale,14*scale,5*scale);
        g.fillStyle(0x4e5a39,.32);
        g.fillEllipse(x-39*scale,y-13*scale,14*scale,5*scale);
        g.fillEllipse(x+38*scale,y+16*scale,12*scale,5*scale);
    }

    createRecentClues ()
    {
        const g=this.add.graphics().setDepth(12);
        // 1. tecido recente
        this.clueCloth=this.add.rectangle(1140,425,32,14,0x9e3f52,.95).setAngle(-16).setDepth(14);
        this.tweens.add({targets:this.clueCloth,angle:{from:-20,to:-11},y:this.clueCloth.y-3,duration:650,yoyo:true,repeat:-1,ease:'Sine.InOut'});

        // 2. mesma marca da Fase 4
        g.lineStyle(5,0xc3a477,.92);
        g.beginPath();g.moveTo(1700,500);g.lineTo(1720,480);g.lineTo(1740,500);g.lineTo(1720,520);g.closePath();g.strokePath();

        // 3. pegadas humanas muito recentes
        g.fillStyle(0x665241,.8);
        for(let i=0;i<6;i++) g.fillEllipse(2210+i*55,625-(i%2)*7,12,23);

        this.clueSensor=this.add.rectangle(2240,520,1200,300,0x000000,0);
        this.physics.add.existing(this.clueSensor);
        this.clueSensor.body.setAllowGravity(false);
        this.clueSensor.body.setImmovable(true);
        this.physics.add.overlap(this.player,this.clueSensor,()=>this.revealClueProgress());
        this.clueStage=0;
    }

    revealClueProgress ()
    {
        if(this.companionFound || !this.clueSensor.body.enable) return;
        const x=this.player.x;
        if(this.clueStage===0 && x>980){
            this.clueStage=1;
            this.showBriefText('O tecido é recente.',1050);
        } else if(this.clueStage===1 && x>1550){
            this.clueStage=2;
            this.showBriefText('A mesma marca.',950);
        } else if(this.clueStage===2 && x>2050){
            this.clueStage=3;
            this.showBriefText('Ela está perto.',1200);
            this.clueSensor.body.enable=false;
        }
    }

    createFruits ()
    {
        this.fruits=[];
        const data=[
            // Solo principal: superfície em y=592; frutas ficam inteiras acima dela.
            {x:620,y:570,color:0xc94432},
            {x:1510,y:570,color:0xe0b843},
            // Plataforma de x=2310..2490, topo em y=541: deslocada levemente para dentro da plataforma.
            {x:2340,y:515,color:0xd77a2f},
            {x:3060,y:570,color:0xc94432}
        ];
        data.forEach((d,index)=>{
            const visual=this.add.container(d.x,d.y).setDepth(18);
            visual.add([
                this.add.circle(0,0,9,d.color),
                this.add.circle(-3,-3,2.5,0xffffff,.42),
                this.add.rectangle(0,-11,3,7,0x5b4324).setOrigin(.5,1),
                this.add.ellipse(6,-13,10,5,0x4f7a38).setAngle(-24)
            ]);
            const sensor=this.add.rectangle(d.x,d.y,26,30,0x000000,0);this.physics.add.existing(sensor);sensor.body.setAllowGravity(false);sensor.body.setImmovable(true);
            const fruit={visual,sensor,baseY:d.y,phase:index*.8,collected:false};this.fruits.push(fruit);
            this.physics.add.overlap(this.player,sensor,()=>this.collectFruit(fruit));
        });
    }

    collectFruit (fruit)
    {
        if(fruit.collected)return;
        fruit.collected=true;
        this.audioManager?.playSfx?.('fruit_bite', { cooldown: 100, volume: 0.8 });
        fruit.sensor.body.enable=false;
        this.hunger=Math.min(this.maxHunger,this.hunger+25);this.health=Math.min(this.maxHealth,this.health+10);this.updateHungerHud();this.updateHealthHud();
        this.tweens.add({targets:fruit.visual,scale:1.4,alpha:0,y:fruit.visual.y-24,duration:260,onComplete:()=>fruit.visual.setVisible(false)});
    }

    updateFruits (time)
    {
        if(!this.fruits)return;
        this.fruits.forEach(f=>{if(!f.collected){f.visual.y=f.baseY+Math.sin(time*.003+f.phase)*4;f.visual.angle=Math.sin(time*.002+f.phase)*2;}});
    }

    createTraversalHazards ()
    {
        this.traversalTimers=[];
        this.traversalTransient=[];
        this.traversalReactionSensors=[];
        this.unstablePlatforms=[];
        this.addUnstablePlatform(1570,560,125,18,'root',610);
        this.addUnstablePlatform(2440,545,118,18,'log',520);
        this.fallingTreeTriggered=false;

        this.fallingTreeSensor=this.add.rectangle(2570,470,150,240,0x000000,0);
        this.physics.add.existing(this.fallingTreeSensor);
        this.fallingTreeSensor.body.setAllowGravity(false);
        this.fallingTreeSensor.body.setImmovable(true);
        this.physics.add.overlap(this.player,this.fallingTreeSensor,()=>this.triggerTraversalTree());

        [
            {x:1840,type:0},
            {x:2280,type:1},
            {x:2760,type:2}
        ].forEach(data=>this.addTraversalReactionSensor(data.x,data.type));
    }

    scheduleTraversal (delay,callback)
    {
        const timer=this.time.delayedCall(delay,callback);
        this.traversalTimers.push(timer);
        return timer;
    }

    trackTraversalObject (object)
    {
        this.traversalTransient.push(object);
        return object;
    }

    addUnstablePlatform (x,y,w,h,kind='log',delay=520)
    {
        const body=this.add.rectangle(x,y,w,h,0x000000,0);
        this.physics.add.existing(body,true);
        this.platforms.add(body);
        const visual=this.add.rectangle(x,y,w,h,kind==='root'?0x3f3025:0x4a3323,.98).setDepth(10);
        visual.setStrokeStyle(2,kind==='root'?0x6b5139:0x77563b,.8);
        const sensor=this.add.rectangle(x,y-20,w,55,0x000000,0);
        this.physics.add.existing(sensor);
        sensor.body.setAllowGravity(false);sensor.body.setImmovable(true);
        const item={x,y,w,h,kind,delay,body,visual,sensor,triggered:false};
        this.unstablePlatforms.push(item);
        this.physics.add.overlap(this.player,sensor,()=>this.triggerUnstablePlatform(item));
    }

    triggerUnstablePlatform (item)
    {
        if(item.triggered||this.phaseCompleted)return;
        item.triggered=true;
        item.sensor.body.enable=false;
        this.tweens.add({targets:item.visual,x:item.x+5,duration:55,yoyo:true,repeat:5});
        for(let i=0;i<4;i++){
            const dirt=this.add.circle(item.x-30+i*20,item.y+6,4,0x6b553e,.62).setDepth(20);
            this.tweens.add({targets:dirt,y:dirt.y+24,x:dirt.x+(i%2?8:-8),alpha:0,duration:340,onComplete:()=>dirt.destroy()});
        }
        this.scheduleTraversal(item.delay,()=>{
            if(!item.triggered)return;
            item.body.body.enable=false;
            this.tweens.add({targets:item.visual,y:item.y+(item.kind==='root'?115:150),angle:item.kind==='root'?-7:8,alpha:.15,duration:620,ease:'Quad.In'});
        });
    }

    resetTraversalHazards ()
    {
        this.traversalTimers.forEach(timer=>timer.remove(false));
        this.traversalTimers.length=0;

        this.traversalTransient.forEach(object=>{
            if(object&&object.active){
                this.tweens.killTweensOf(object);
                object.destroy();
            }
        });
        this.traversalTransient.length=0;

        this.unstablePlatforms.forEach(item=>{
            this.tweens.killTweensOf(item.visual);
            item.triggered=false;
            item.body.body.enable=true;
            item.sensor.body.enable=true;
            item.visual.setPosition(item.x,item.y).setAngle(0).setAlpha(1);
        });
        if(this.traversalFallenTree){this.traversalFallenTree.destroy();this.traversalFallenTree=null;}
        this.fallingTreeTriggered=false;
        if(this.fallingTreeSensor)this.fallingTreeSensor.body.enable=true;
        this.traversalReactionSensors.forEach(item=>{
            item.triggered=false;
            item.sensor.body.enable=true;
        });
    }

    addTraversalReactionSensor (x,type)
    {
        const sensor=this.add.rectangle(x,500,150,260,0x000000,0);
        this.physics.add.existing(sensor);
        sensor.body.setAllowGravity(false);
        sensor.body.setImmovable(true);
        const item={x,type,sensor,triggered:false};
        this.traversalReactionSensors.push(item);
        this.physics.add.overlap(this.player,sensor,()=>this.triggerTraversalReaction(item));
    }

    triggerTraversalReaction (item)
    {
        if(item.triggered||this.bossStarted||this.phaseCompleted)return;
        item.triggered=true;
        item.sensor.body.enable=false;

        const count=item.type===2?7:5;
        for(let i=0;i<count;i++){
            const leaf=this.trackTraversalObject(
                this.add.ellipse(item.x-40+i*14,585-(i%3)*9,10,4,i%2?0x365f3c:0x557548,.7).setDepth(18)
            );
            this.tweens.add({targets:leaf,x:leaf.x+38+i*4,y:leaf.y-35-(i%3)*11,angle:65+i*28,alpha:0,duration:460+i*38,onComplete:()=>leaf.destroy()});
        }

        const dust=this.trackTraversalObject(this.add.ellipse(item.x,610,150+(item.type*25),30,0x887760,.09).setDepth(17));
        this.tweens.add({targets:dust,scaleX:1.45,alpha:0,duration:620,onComplete:()=>dust.destroy()});

        if(item.type===1){
            for(let i=0;i<2;i++){
                const bird=this.trackTraversalObject(
                    this.add.triangle(item.x+i*22,390-i*14,-8,3,0,-4,8,3,0x101a15,.85).setDepth(19)
                );
                this.tweens.add({targets:bird,x:bird.x+115+i*18,y:bird.y-80-i*20,alpha:0,duration:680+i*80,onComplete:()=>bird.destroy()});
            }
        }
        else if(item.type===2){
            const fog=this.trackTraversalObject(this.add.ellipse(item.x,595,220,48,0xc5d0c8,.045).setDepth(4));
            this.tweens.add({targets:fog,x:fog.x+105,scaleX:1.45,alpha:0,duration:850,onComplete:()=>fog.destroy()});
        }
    }

    triggerTraversalTree ()
    {
        if(this.fallingTreeTriggered||this.bossStarted)return;
        this.fallingTreeTriggered=true;
        this.fallingTreeSensor.body.enable=false;
        const leaves=[];
        for(let i=0;i<5;i++){
            const leaf=this.add.ellipse(2670+i*10,360+i*9,12,5,0x3e663f,.78).setDepth(18);
            leaves.push(leaf);
            this.trackTraversalObject(leaf);
            this.tweens.add({targets:leaf,x:leaf.x+(i%2?16:-16),angle:i*30,duration:170,yoyo:true,repeat:1});
        }
        this.scheduleTraversal(420,()=>{
            leaves.forEach(l=>this.tweens.add({targets:l,y:l.y+50,alpha:0,duration:350,onComplete:()=>l.destroy()}));
            const tree=this.add.rectangle(2720,400,300,34,0x3e2a1e,.97).setOrigin(.5).setAngle(-76).setDepth(13);
            this.traversalFallenTree=tree;
            this.tweens.add({targets:tree,angle:-8,y:575,duration:560,ease:'Quad.In',onComplete:()=>this.cameras.main.shake(120,.002)});
        });
    }

    createCompanionEncounter ()
    {
        this.companionArea=this.add.container(8870,520).setDepth(18);
        const shelter=this.add.graphics();
        shelter.lineStyle(18,0x3d2b20,.96);shelter.beginPath();shelter.moveTo(-75,95);shelter.lineTo(-25,-70);shelter.lineTo(40,95);shelter.strokePath();
        shelter.fillStyle(0x102419,.85);shelter.fillEllipse(0,70,160,60);
        const body=this.add.rectangle(0,20,24,44,0x8f7350);
        const head=this.add.circle(0,-10,9,0xb98560);
        const cloth=this.add.rectangle(-12,7,18,30,0x7e3a48,.9).setAngle(5);
        this.companionArea.add([shelter,body,head,cloth]);

        this.companionSensor=this.add.rectangle(8860,510,150,220,0x000000,0);
        this.physics.add.existing(this.companionSensor);
        this.companionSensor.body.setAllowGravity(false);this.companionSensor.body.setImmovable(true);
        this.physics.add.overlap(this.player,this.companionSensor,()=>this.meetCompanion());
    }

    meetCompanion ()
    {
        if(this.companionFound)return;
        this.companionFound=true;
        this.companionSensor.body.enable=false;
        this.player.body.setVelocity(0,0);
        this.knockbackUntil=this.time.now+2350;
        this.cameras.main.zoomTo(1.035,420);
        this.showDialogue('Você me encontrou.',950);
        this.time.delayedCall(1100,()=>this.showDialogue('Ele está perto.',1050));
        this.time.delayedCall(2200,()=>{
            this.cameras.main.zoomTo(1,420);
            this.moveCompanionToSafety();
            this.beginMapinguariReveal();
        });
    }

    showDialogue (message,duration)
    {
        const panel=this.add.rectangle(512,330,500,88,0x040907,.92).setScrollFactor(0).setDepth(190);
        const t=this.add.text(512,330,message,{fontFamily:'Arial Black',fontSize:'25px',color:'#f1e1ae'}).setOrigin(.5).setScrollFactor(0).setDepth(191);
        this.time.delayedCall(duration,()=>{panel.destroy();t.destroy();});
    }

    moveCompanionToSafety ()
    {
        this.tweens.add({targets:this.companionArea,x:9050,y:410,duration:680,ease:'Sine.InOut'});
    }

    createBossArena ()
    {
        this.arenaMinX=9000;
        this.arenaMaxX=11820;
        const g=this.add.graphics().setDepth(8);
        g.fillStyle(0x3d2b20,1);g.fillRect(8980,592,2840,116);g.fillStyle(0x1f432b,1);g.fillRect(8980,592,2840,11);
        const arenaFloor=this.add.rectangle(10400,650,2840,116,0x000000,0);
        this.physics.add.existing(arenaFloor,true);this.platforms.add(arenaFloor);
        this.arenaLeftPlatform=this.add.rectangle(9660,500,170,25,0x4a3425,1).setDepth(9);
        this.arenaRightPlatform=this.add.rectangle(11160,465,180,25,0x4a3425,1).setDepth(9);
        this.physics.add.existing(this.arenaLeftPlatform,true);this.physics.add.existing(this.arenaRightPlatform,true);
        this.platforms.add(this.arenaLeftPlatform);this.platforms.add(this.arenaRightPlatform);
        this.addArenaUnstablePlatform(10750,555,140,18);

        this.bossTree=this.add.rectangle(11680,365,44,360,0x3a291e,.96).setDepth(7);
        this.bossTreeLeaves=this.add.container(11680,185).setDepth(6);
        for(let i=0;i<7;i++)this.bossTreeLeaves.add(this.add.circle((i-3)*24,(i%2)*16,38,0x113220,.92));
    }

    addArenaUnstablePlatform (x,y,w,h)
    {
        const body=this.add.rectangle(x,y,w,h,0x000000,0);this.physics.add.existing(body,true);this.platforms.add(body);
        const visual=this.add.rectangle(x,y,w,h,0x4c3524,.98).setDepth(10);
        const item={x,y,w,h,body,visual,triggered:false};
        this.arenaUnstable=item;
    }

    createMapinguari ()
    {
        this.mapinguari=this.add.rectangle(10700,470,120,220,0x000000,0);
        this.physics.add.existing(this.mapinguari);
        this.mapinguari.body.setAllowGravity(false);
        this.mapinguari.body.setImmovable(true);
        this.mapinguari.body.enable=false;

        const v=this.add.container(10700,470).setDepth(22).setVisible(false);
        const shadow=this.add.ellipse(0,118,166,30,0x020302,.38);

        // Silhueta alongada e orgânica. Os membros continuam sendo partes
        // independentes para preservar as animações existentes do boss.
        const torso=this.add.ellipse(0,-18,154,174,0x4a3b2c);
        const chest=this.add.ellipse(0,-54,124,72,0x514131,.92);

        const createArm=(x,angle,mirror=1)=>{
            const arm=this.add.container(x,-18).setAngle(angle);
            const upper=this.add.ellipse(0,31,38,76,0x46372a);
            const elbow=this.add.circle(mirror*2,67,18,0x413328);
            const forearm=this.add.ellipse(mirror*4,100,34,82,0x3f3227).setAngle(mirror*4);
            const hand=this.add.ellipse(mirror*5,143,42,34,0x372c23).setAngle(mirror*7);
            const palm=this.add.ellipse(mirror*5,140,28,22,0x4a3a2c,.72);
            const claws=[
                this.add.triangle(mirror*-9,157,-5,0,0,18,5,0,0xcbbd96,.92).setAngle(mirror*8),
                this.add.triangle(mirror*4,161,-5,0,0,19,5,0,0xcbbd96,.92).setAngle(mirror*2),
                this.add.triangle(mirror*16,157,-5,0,0,17,5,0,0xcbbd96,.92).setAngle(mirror*-8)
            ];
            const fur=[
                this.add.triangle(mirror*-13,35,-8,0,0,18,8,0,0x342a22,.9).setAngle(mirror*18),
                this.add.triangle(mirror*13,62,-7,0,0,17,7,0,0x3b3026,.86).setAngle(mirror*-15),
                this.add.triangle(mirror*-11,101,-7,0,0,17,7,0,0x342a22,.86).setAngle(mirror*14)
            ];
            arm.add([upper,elbow,forearm,hand,palm,...fur,...claws]);
            arm.hand=hand;arm.claws=claws;
            return arm;
        };

        const createLeg=(x,mirror=1)=>{
            // Mantém pés e garras acima da superfície da arena (y=592)
            // sem alterar a posição do corpo físico do boss.
            const leg=this.add.container(x,2);
            const thigh=this.add.ellipse(0,20,43,54,0x392f24);
            const knee=this.add.circle(mirror*2,45,17,0x342b22);
            const shin=this.add.ellipse(mirror*3,67,36,48,0x372d23).setAngle(mirror*3);
            const heel=this.add.ellipse(mirror*-8,91,24,18,0x3d3126,.9);
            const foot=this.add.ellipse(mirror*7,99,58,26,0x2e2720).setAngle(mirror*4);
            const claws=[
                this.add.triangle(mirror*2,106,-6,0,0,14,6,0,0xbfaf8a,.9).setAngle(mirror*2),
                this.add.triangle(mirror*16,104,-6,0,0,13,6,0,0xbfaf8a,.88).setAngle(mirror*-7),
                this.add.triangle(mirror*29,101,-5,0,0,12,5,0,0xbfaf8a,.84).setAngle(mirror*-13)
            ];
            const fur=[
                this.add.triangle(mirror*-15,20,-7,0,0,14,7,0,0x302820,.88).setAngle(mirror*13),
                this.add.triangle(mirror*14,47,-7,0,0,14,7,0,0x302820,.84).setAngle(mirror*-13),
                this.add.triangle(mirror*-12,70,-6,0,0,13,6,0,0x302820,.8).setAngle(mirror*11)
            ];
            leg.add([thigh,knee,shin,heel,foot,...fur,...claws]);
            leg.foot=foot;leg.claws=claws;
            return leg;
        };

        const leftLeg=createLeg(-38,-1);
        const rightLeg=createLeg(38,1);
        const leftArm=createArm(-82,8,-1);
        const rightArm=createArm(82,-8,1);

        // Cabeça com um único olho e sem nariz, agora com contorno mais irregular.
        const head=this.add.ellipse(0,-118,82,74,0x3c3127);
        const headFur=[
            this.add.triangle(-31,-143,-8,0,0,-19,8,0,0x332a22,.92).setAngle(-14),
            this.add.triangle(-10,-151,-8,0,0,-20,8,0,0x332a22,.94).setAngle(-4),
            this.add.triangle(12,-151,-8,0,0,-20,8,0,0x332a22,.94).setAngle(5),
            this.add.triangle(32,-142,-8,0,0,-18,8,0,0x332a22,.9).setAngle(14)
        ];
        const brow=this.add.ellipse(0,-131,61,15,0x241f1a,.86);
        const eyeSocket=this.add.ellipse(0,-116,28,23,0x171713,.94);
        const eye=this.add.circle(0,-116,9,0xd6b768,.98);
        const pupil=this.add.ellipse(1,-116,5,9,0x171713,1);
        const eyeGlint=this.add.circle(-2,-119,1.8,0xf4e7a8,.9);

        // Boca principal na barriga permanece como foco visual.
        const bellyLip=this.add.ellipse(0,15,102,74,0x2b211b,.98);
        const bellyMouth=this.add.ellipse(0,18,84,56,0x100d0c,1);
        const mouthGlow=this.add.ellipse(0,25,50,19,0x5c2a22,.72);
        const teeth=[
            this.add.triangle(-27,-2,-6,0,0,12,6,0,0xd7cfad,.9),
            this.add.triangle(-9,-5,-6,0,0,13,6,0,0xd7cfad,.9),
            this.add.triangle(9,-5,-6,0,0,13,6,0,0xd7cfad,.9),
            this.add.triangle(27,-2,-6,0,0,12,6,0,0xd7cfad,.9),
            this.add.triangle(-18,42,-6,0,0,-11,6,0,0xc8bea0,.82),
            this.add.triangle(0,45,-6,0,0,-12,6,0,0xc8bea0,.82),
            this.add.triangle(18,42,-6,0,0,-11,6,0,0xc8bea0,.82)
        ];

        // Tufos de pelo quebram o contorno oval do tronco e reforçam a criatura.
        const bodyFur=[];
        [
            [-66,-63,-20],[-72,-32,-25],[-73,2,-29],[-66,35,-33],
            [66,-63,20],[72,-32,25],[73,2,29],[66,35,33],
            [-45,62,-17],[-20,69,-8],[20,69,8],[45,62,17]
        ].forEach(([x,y,angle],i)=>{
            bodyFur.push(this.add.triangle(
                x,y,-8,0,0,18+(i%3)*3,8,0,
                i%2?0x382e25:0x403329,
                .88
            ).setAngle(angle));
        });

        for(let i=0;i<6;i++){
            const leaf=this.add.ellipse(-45+i*18,-63+(i%2)*12,22,10,i%2?0x36583a:0x2a4930,.78).setAngle(i*17);
            v.add(leaf);
        }

        v.add([
            shadow,leftLeg,rightLeg,
            torso,chest,...bodyFur,
            leftArm,rightArm,
            bellyLip,bellyMouth,mouthGlow,...teeth,
            head,...headFur,brow,eyeSocket,eye,pupil,eyeGlint
        ]);
        v.parts={
            leftLeg,rightLeg,torso,leftArm,rightArm,head,
            eye,bellyMouth,
            leftHand:leftArm.hand,rightHand:rightArm.hand,
            leftFoot:leftLeg.foot,rightFoot:rightLeg.foot
        };
        this.mapinguariVisual=v;

        // Zonas de dano acompanham as partes visuais, mas não substituem o corpo
        // físico central usado pelo comportamento do boss.
        this.mapinguariHitZones=[
            { name:'head',      x:0,   y:-118, w:86,  h:80 },
            { name:'torso',     x:0,   y:-18,  w:150, h:170 },
            { name:'leftArm',   x:-86, y:53,   w:52,  h:174 },
            { name:'rightArm',  x:86,  y:53,   w:52,  h:174 },
            { name:'leftLeg',   x:-39, y:60,   w:58,  h:126 },
            { name:'rightLeg',  x:39,  y:60,   w:58,  h:126 }
        ].map(({name,x,y,w,h})=>{
            const zone=this.add.rectangle(10700+x,470+y,w,h,0x000000,0);
            this.physics.add.existing(zone);
            zone.body.setAllowGravity(false);
            zone.body.setImmovable(true);
            zone.body.enable=false;
            zone.mapinguariPart=name;
            return { zone,x,y };
        });
    }

    beginMapinguariReveal ()
    {
        if(this.bossStarted)return;        this.bossStarted=true;
        this.spawnPoint={...this.bossCheckpoint};
        this.time.delayedCall(300,()=>{
            this.cameras.main.shake(130,.002);
            this.shakeArenaLeaves();
        });
        this.time.delayedCall(760,()=>this.cameras.main.shake(180,.003));
        this.time.delayedCall(1100,()=>{
            this.mapinguariVisual.setVisible(true).setAlpha(0).setPosition(11700,470);
            this.tweens.add({targets:this.mapinguariVisual,x:10700,alpha:1,duration:850,ease:'Quad.Out'});
        });
        this.time.delayedCall(1950,()=>{
            this.mapinguari.setPosition(10700,470);this.mapinguari.body.enable=true;
            this.syncMapinguariHitZones();
            this.bossState='RECOVERY';
            this.bossNextActionAt=this.time.now+700;
            this.bossHud.setVisible(true);
            this.updateBossHud();
        });
    }

    shakeArenaLeaves ()
    {
        this.bossTreeLeaves.list.forEach((leaf,i)=>this.tweens.add({targets:leaf,x:leaf.x+(i%2?10:-10),duration:90,yoyo:true,repeat:4}));
    }

    createAttackHitbox ()
    {
        this.attackHitbox=this.add.rectangle(-100,-100,54,46,0x000000,0);
        this.physics.add.existing(this.attackHitbox);
        this.attackHitbox.body.setAllowGravity(false);this.attackHitbox.body.enable=false;

        // Cada parte visual do Mapinguari pode receber o golpe. Todas convergem
        // para tryHitMapinguari(), que já limita o dano a uma vez por swing.
        this.mapinguariHitZones.forEach(({zone})=>{
            this.physics.add.overlap(this.attackHitbox,zone,()=>this.tryHitMapinguari());
        });
    }

    syncMapinguariHitZones ()
    {
        if(!this.mapinguariVisual||!this.mapinguariHitZones)return;

        const angle=this.mapinguariVisual.rotation||0;
        const cos=Math.cos(angle);
        const sin=Math.sin(angle);
        const scaleX=this.mapinguariVisual.scaleX??1;
        const scaleY=this.mapinguariVisual.scaleY??1;
        const enabled=this.mapinguari?.body?.enable===true&&!this.bossDefeated;

        this.mapinguariHitZones.forEach(({zone,x,y})=>{
            const localX=x*scaleX;
            const localY=y*scaleY;
            zone.setPosition(
                this.mapinguariVisual.x+localX*cos-localY*sin,
                this.mapinguariVisual.y+localX*sin+localY*cos
            );
            zone.body.enable=enabled;
        });
    }

    setMapinguariHitZonesEnabled (enabled)
    {
        this.mapinguariHitZones?.forEach(({zone})=>{
            if(zone?.body)zone.body.enable=enabled;
        });
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
        this.attackSoundVariant=(this.attackSoundVariant+1)%3;
        const macheteSwingSequence=[
            { key:'player_machete_swing', rate:0.92, detune:-35, volume:0.94 },
            { key:'player_machete_swing', rate:1.00, detune:0, volume:0.96 },
            { key:'player_machete_swing', rate:1.08, detune:35, volume:0.94 }
        ];
        const swingSound=macheteSwingSequence[this.attackSoundVariant];

        // startAttack is shared by keyboard and mobile input. Unlock/bind here so
        // the first attack gesture can resume WebAudio and always uses this scene.
        this.audioManager?.bindScene?.(this);
        this.audioManager?.unlock?.();
        this.audioManager?.playSfx?.(swingSound.key, {
            cooldown:0,
            rate:swingSound.rate,
            detune:swingSound.detune,
            volume:swingSound.volume
        });

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
                this.player.x+(47*this.attackDirection),
                this.player.y+(-5)
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

    tryHitMapinguari ()
    {
        if(!this.bossStarted||this.bossDefeated||!this.isAttacking||this.attackHitBossRegistered)return;
        this.attackHitBossRegistered=true;

        if(!this.bossVulnerable){
            this.showBossBlockFeedback();
            return;
        }

        this.bossVulnerable=false;
        this.bossProgress+=1;
        this.bossStageProgress+=1;

        const finalHit=this.bossProgress>=7;
        this.showBossHitFeedback(finalHit);
        this.updateBossHud();

        const required=this.bossStage===1?2:this.bossStage===2?2:3;
        if(this.bossStageProgress>=required){
            if(this.bossStage<3){
                this.bossStage+=1;
                this.bossStageProgress=0;
                if(this.bossStage===2)this.triggerArenaStage2();
                this.bossState='RECOVERY';
                this.bossNextActionAt=this.time.now+850;
            } else {
                this.defeatMapinguari();
            }
        } else {
            this.bossState='RECOVERY';
            this.bossNextActionAt=this.time.now+650;
        }
    }
    showBossBlockFeedback ()
    {
        const hitX=this.mapinguari.x-this.attackDirection*48;
        const hitY=this.mapinguari.y-15;
        this.showBlockDeflect(hitX,hitY,true);

        const ring=this.add.circle(hitX,hitY,30,0xc8d8ce,.065).setDepth(28);
        this.tweens.add({
            targets:ring,
            scale:1.45,
            alpha:0,
            duration:170,
            onComplete:()=>ring.destroy()
        });
    }
    showBossHitFeedback (finalHit=false)
    {
        this.showCombatImpact(
            this.mapinguari.x,
            this.mapinguari.y-20,
            this.mapinguariVisual,
            { boss:true, final:finalHit }
        );

        const flash=this.add.ellipse(
            this.mapinguari.x,
            this.mapinguari.y-18,
            finalHit?72:54,
            finalHit?96:72,
            0xe8d9a9,
            finalHit?.18:.12
        ).setDepth(29);

        this.tweens.add({
            targets:flash,
            alpha:0,
            scaleX:1.18,
            scaleY:1.08,
            duration:finalHit?170:130,
            onComplete:()=>flash.destroy()
        });
    }
    updateBoss (time)
    {
        if(!this.bossStarted||this.bossDefeated||this.isPlayerDead||this.phaseCompleted)return;

        if(this.player.x<this.arenaMinX)this.player.x=this.arenaMinX;
        if(this.player.x>this.arenaMaxX)this.player.x=this.arenaMaxX;

        // O boss persegue somente durante RECOVERY, preservando telegraphs,
        // ataques, vulnerabilidade e todos os tweens já existentes.
        if(this.bossState==='RECOVERY'){
            this.updateMapinguariChase(time);
        } else {
            this.bossLastChaseAt=time;
            this.updateMapinguariFacing();
        }

        this.mapinguari.setPosition(this.mapinguariVisual.x,this.mapinguariVisual.y);
        this.syncMapinguariHitZones();

        if(this.bossState==='VULNERABLE')return;
        if(time<this.bossNextActionAt)return;

        if(this.bossState==='RECOVERY'||this.bossState==='DORMANT'){
            this.chooseBossAttack();
        }
    }

    updateMapinguariFacing ()
    {
        if(!this.player||!this.mapinguariVisual)return;
        const dx=this.player.x-this.mapinguariVisual.x;
        if(Math.abs(dx)<8)return;

        this.bossFacing=dx<0?-1:1;
        const magnitude=Math.max(.001,Math.abs(this.mapinguariVisual.scaleX||1));
        this.mapinguariVisual.scaleX=magnitude*this.bossFacing;
    }

    updateMapinguariChase (time)
    {
        if(!this.player||!this.mapinguariVisual)return;

        const previous=this.bossLastChaseAt||time;
        const dt=Math.min(.05,Math.max(0,(time-previous)/1000));
        this.bossLastChaseAt=time;
        this.updateMapinguariFacing();

        const dx=this.player.x-this.mapinguariVisual.x;
        const distance=Math.abs(dx);
        const stopDistance=135;
        if(distance<=stopDistance)return;

        const speed=this.bossStage===3?105:this.bossStage===2?92:80;
        const maxStep=Math.max(0,distance-stopDistance);
        const step=Math.min(speed*dt,maxStep);
        const direction=dx<0?-1:1;
        const nextX=Math.max(
            this.arenaMinX+90,
            Math.min(this.arenaMaxX-90,this.mapinguariVisual.x+direction*step)
        );

        this.mapinguariVisual.x=nextX;
    }

    chooseBossAttack ()
    {
        this.bossAttackSerial+=1;
        let attack='CHARGE';
        if(this.bossStage===1) attack=this.bossAttackSerial%2===0?'IMPACT':'CHARGE';
        else if(this.bossStage===2) attack=['CHARGE','IMPACT','TREE'][this.bossAttackSerial%3];
        else attack=['IMPACT','CHARGE','TREE','CHARGE'][this.bossAttackSerial%4];

        if(attack==='CHARGE')this.telegraphCharge();
        else if(attack==='IMPACT')this.telegraphImpact();
        else this.telegraphTree();
    }

    telegraphCharge ()
    {
        this.bossState='TELEGRAPH';this.bossAttackHitRegistered=false;
        this.mapinguariVisual.parts.torso.setScale(1.04,.91);
        this.mapinguariVisual.setAngle(this.player.x<this.mapinguari.x?-5:5);
        const dust=this.add.ellipse(this.mapinguari.x,this.mapinguari.y+100,90,20,0x8d7a62,.12).setDepth(18);
        this.tweens.add({targets:dust,scaleX:1.4,alpha:0,duration:350,onComplete:()=>dust.destroy()});
        this.time.delayedCall(350,()=>this.executeCharge());
    }

    executeCharge ()
    {
        if(this.bossDefeated)return;
        this.bossState='ATTACK';
        const dir=this.player.x<this.mapinguari.x?-1:1;
        const target=Math.max(this.arenaMinX+90,Math.min(this.arenaMaxX-90,this.mapinguari.x+dir*(this.bossStage===3?430:360)));
        this.tweens.add({
            targets:this.mapinguariVisual,x:target,duration:this.bossStage===3?480:570,ease:'Quad.In',
            onUpdate:()=>this.checkBossContactDamage(20),
            onComplete:()=>{
                this.mapinguariVisual.setAngle(0);this.mapinguariVisual.parts.torso.setScale(1);
                if(this.bossStage===3){
                    const highY=410;
                    this.tweens.add({targets:this.mapinguariVisual,y:highY,duration:180,ease:'Quad.Out',onComplete:()=>this.openBossVulnerability(900)});
                } else {
                    this.openBossVulnerability(1050);
                }
            }
        });
    }

    telegraphImpact ()
    {
        this.bossState='TELEGRAPH';this.bossAttackHitRegistered=false;
        this.tweens.add({targets:[this.mapinguariVisual.parts.leftArm,this.mapinguariVisual.parts.rightArm],angle:{from:0,to:-115},duration:220});
        this.time.delayedCall(this.bossStage===3?400:440,()=>this.executeImpact());
    }

    executeImpact ()
    {
        if(this.bossDefeated)return;
        this.bossState='ATTACK';
        this.mapinguariVisual.parts.leftArm.angle=48;this.mapinguariVisual.parts.rightArm.angle=-48;
        this.cameras.main.shake(150,.004);
        const wave=this.add.rectangle(this.mapinguari.x,this.mapinguari.y+108,40,16,0xb5a17d,.22).setDepth(24);
        this.physics.add.existing(wave);wave.body.setAllowGravity(false);
        const width=this.bossStage===3?520:430;
        this.tweens.add({targets:wave,displayWidth:width,alpha:0,duration:430,onUpdate:()=>{
            if(!this.bossAttackHitRegistered&&Math.abs(this.player.x-this.mapinguari.x)<width*.48&&this.player.y>500){this.bossAttackHitRegistered=true;this.damagePlayer(20,this.player.x<this.mapinguari.x?-180:180,-220);}
        },onComplete:()=>wave.destroy()});
        this.time.delayedCall(460,()=>this.openBossVulnerability(this.bossStage===3?820:1000));
    }

    telegraphTree ()
    {
        this.bossState='TELEGRAPH';this.bossAttackHitRegistered=false;
        this.tweens.add({targets:this.mapinguariVisual,x:11450,duration:230});
        this.shakeArenaLeaves();
        this.tweens.add({targets:this.bossTree,angle:{from:0,to:-4},duration:120,yoyo:true,repeat:2});
        this.time.delayedCall(500,()=>this.executeBossTree());
    }

    executeBossTree ()
    {
        if(this.bossDefeated)return;
        this.bossState='ATTACK';
        this.resetBossTreeOnly();
        const tree=this.add.rectangle(11440,390,300,34,0x3b291e,.98).setOrigin(.5).setAngle(-78).setDepth(25);
        this.activeBossFallenTree=tree;
        this.tweens.add({targets:tree,angle:-8,y:575,duration:560,ease:'Quad.In',onUpdate:()=>{
            if(!this.bossAttackHitRegistered&&Math.abs(this.player.x-tree.x)<125&&this.player.y>490){this.bossAttackHitRegistered=true;this.damagePlayer(25,this.player.x<tree.x?-170:170,-250);}
        },onComplete:()=>{
            this.cameras.main.shake(140,.003);
            this.openBossVulnerability(this.bossStage===3?820:1000);
        }});
    }

    openBossVulnerability (duration)
    {
        if(this.bossDefeated)return;
        this.bossState='VULNERABLE';this.bossVulnerable=true;
        this.mapinguariVisual.setAngle(this.player.x<this.mapinguari.x?-8:8);
        this.mapinguariVisual.parts.torso.setScale(1,.92);
        this.tweens.add({targets:this.mapinguariVisual,alpha:{from:.55,to:.9},duration:160,yoyo:true,repeat:2});
        this.time.delayedCall(duration,()=>{
            if(this.bossDefeated||!this.bossVulnerable)return;
            this.bossVulnerable=false;this.mapinguariVisual.setAngle(0);this.mapinguariVisual.parts.torso.setScale(1);this.mapinguariVisual.setAlpha(1);
            this.bossState='RECOVERY';this.bossNextActionAt=this.time.now+(this.bossStage===3?340:520);
        });
    }

    triggerArenaStage2 ()
    {
        if(!this.arenaUnstable||this.arenaUnstable.triggered)return;
        const item=this.arenaUnstable;item.triggered=true;
        this.tweens.add({targets:item.visual,x:item.x+5,duration:55,yoyo:true,repeat:5});
        this.time.delayedCall(620,()=>{item.body.body.enable=false;this.tweens.add({targets:item.visual,y:item.y+145,angle:8,alpha:.18,duration:620});});
    }

    checkBossContactDamage (amount)
    {
        if(this.bossAttackHitRegistered)return;
        const dx=Math.abs(this.player.x-this.mapinguariVisual.x);
        const dy=Math.abs(this.player.y-this.mapinguariVisual.y);
        if(dx<92&&dy<125){this.bossAttackHitRegistered=true;this.damagePlayer(amount,this.player.x<this.mapinguariVisual.x?-220:220,-240);}
    }

    damagePlayer (amount,vx=0,vy=0)
    {
        if(this.phaseCompleted||this.isPlayerDead||this.time.now<this.invulnerableUntil)return;
        this.health=Math.max(0,this.health-amount);this.invulnerableUntil=this.time.now+950;this.knockbackUntil=this.time.now+170;
        this.player.body.setVelocity(vx,vy);this.updateHealthHud();this.flashPlayerDamage();
        if(this.health<=0)this.handlePlayerDeath();
    }

    flashPlayerDamage ()
    {
        this.tweens.killTweensOf(this.playerVisual);this.tweens.add({targets:this.playerVisual,alpha:.25,duration:90,yoyo:true,repeat:4,onComplete:()=>this.playerVisual.setAlpha(1)});
    }

    handlePlayerDeath ()
    {
        if(this.phaseCompleted||this.isPlayerDead)return;
        this.isPlayerDead=true;this.resetCombatPolishState();this.clearRubberLatexDrops();this.player.body.setVelocity(0,0);this.isDashing=false;
        this.time.delayedCall(650,()=>{
            if(this.bossStarted&&!this.bossDefeated)this.resetBossFight();
            this.player.setPosition(this.spawnPoint.x,this.spawnPoint.y);this.player.body.setVelocity(0,0);this.bossHintSign?.reset?.();
            this.health=100;this.hunger=100;this.stamina=100;this.resetMovementPolishState(); this.resetCombatPolishState();
            this.staminaRegenBlockedUntil=0;this.nextHungerDrainAt=this.time.now+2000;this.nextStarvationDamageAt=this.time.now+2000;
            this.invulnerableUntil=this.time.now+900;this.isPlayerDead=false;
            if(!this.bossStarted)this.resetTraversalHazards();
            this.clearLivingAtmosphereTransient();
            this.updateHealthHud();this.updateHungerHud();this.updateStaminaHud();this.playerVisual.setAlpha(1);
        });
    }

    resetBossFight ()
    {
        this.bossStage=1;this.bossProgress=0;this.bossStageProgress=0;this.bossVulnerable=false;this.bossState='RECOVERY';this.bossNextActionAt=this.time.now+900;this.bossAttackSerial=0;this.bossAttackHitRegistered=false;this.bossFacing=-1;this.bossLastChaseAt=this.time.now;
        this.mapinguariVisual.setPosition(10700,470).setAngle(0).setScale(1).setAlpha(1).setVisible(true);
        this.mapinguariVisual.parts.torso.setScale(1);this.mapinguariVisual.parts.leftArm.setAngle(8);this.mapinguariVisual.parts.rightArm.setAngle(-8);
        this.mapinguari.setPosition(10700,470);this.mapinguari.body.enable=true;this.syncMapinguariHitZones();
        if(this.arenaUnstable){this.tweens.killTweensOf(this.arenaUnstable.visual);this.arenaUnstable.triggered=false;this.arenaUnstable.body.body.enable=true;this.arenaUnstable.visual.setPosition(this.arenaUnstable.x,this.arenaUnstable.y).setAngle(0).setAlpha(1);}
        this.resetBossTreeOnly();this.bossTree.setAngle(0);this.updateBossHud();
    }

    resetBossTreeOnly ()
    {
        if(this.activeBossFallenTree){this.activeBossFallenTree.destroy();this.activeBossFallenTree=null;}
    }

    defeatMapinguari ()
    {
        if(this.bossDefeated)return;
        this.bossDefeated=true;this.bossVulnerable=false;this.bossState='DEFEATED';this.mapinguari.body.enable=false;this.setMapinguariHitZonesEnabled(false);this.bossHud.setVisible(false);
        this.phaseCompleted=true;this.isAttacking=false;this.isDashing=false;
        if(this.attackHitbox?.body)this.attackHitbox.body.enable=false;
        this.player.body.setVelocity(0,0);this.knockbackUntil=this.time.now+2500;
        this.cameras.main.shake(180,.004);
        this.tweens.add({targets:this.mapinguariVisual,y:500,scaleY:.82,angle:this.mapinguariVisual.x>this.player.x?8:-8,duration:520,ease:'Quad.Out'});
        this.time.delayedCall(650,()=>this.showBriefText('A floresta fica em silêncio.',900));
        this.time.delayedCall(1550,()=>this.startFinalVideoAfterVictory());
    }

    startFinalVideoAfterVictory ()
    {
        if(this.finalVideoTransitionStarted)return;
        this.finalVideoTransitionStarted=true;

        this.player.body.setVelocity(0,0);
        this.cameras.main.stopFollow();
        this.cameras.main.fadeOut(350,2,7,5);

        this.time.delayedCall(380,()=>{
            this.cleanupSceneHazardsBeforeTransition();
            this.scene.start('FinalVideoScene');
        });
    }

    retreatMapinguari ()
    {
        this.tweens.add({targets:this.mapinguariVisual,x:11950,alpha:.25,duration:1450,ease:'Sine.InOut',onComplete:()=>{
            this.mapinguariVisual.setVisible(false);this.beginFinalNarrative();
        }});
    }

    beginFinalNarrative ()
    {
        this.player.body.setVelocity(0,0);this.knockbackUntil=this.time.now+4200;
        this.time.delayedCall(250,()=>this.showDialogue('Eu achei que não voltaria a te ver.',1150));
        this.time.delayedCall(1550,()=>this.showDialogue('Vamos para casa.',950));
        this.time.delayedCall(2650,()=>this.showDialogue('Eles vão voltar.',950));
        this.time.delayedCall(3700,()=>this.showDialogue('Então a floresta também vai precisar de quem volte por ela.',1500));
        this.time.delayedCall(5350,()=>this.playFinalScene());
    }

    playFinalScene ()
    {
        this.phaseCompleted=true;this.isAttacking=false;this.isDashing=false;this.attackHitbox.body.enable=false;
        this.cameras.main.stopFollow();this.cameras.main.fadeOut(650,2,7,5);
        this.time.delayedCall(720,()=>{
            this.cameras.main.fadeIn(650,2,7,5);
            this.cameras.main.scrollX=0;
            const bg=this.add.rectangle(512,384,1024,768,0x06100d,1).setScrollFactor(0).setDepth(400);
            const ground=this.add.rectangle(512,650,1024,236,0x19271d,1).setScrollFactor(0).setDepth(401);
            const rubber=this.add.rectangle(650,390,52,300,0x4a3424,1).setScrollFactor(0).setDepth(402);
            this.add.ellipse(676,474,30,13,0x8c7558,.95).setScrollFactor(0).setDepth(403);
            this.add.circle(650,275,105,0x16452c,.92).setScrollFactor(0).setDepth(401);
            this.add.ellipse(820,290,340,220,0xe2e8c8,.08).setScrollFactor(0).setDepth(401);
            const p=this.createFinalWalker(300,560,0xc7aa73);const c=this.createFinalWalker(245,560,0x8f7350);
            this.tweens.add({targets:[p,c],x:'+=480',duration:4400,ease:'Sine.InOut'});
            this.time.delayedCall(4700,()=>this.showFinalScreen([bg,ground,rubber,p,c]));
        });
    }

    createFinalWalker (x,y,color)
    {
        const c=this.add.container(x,y).setScrollFactor(0).setDepth(410);
        c.add([this.add.rectangle(0,0,24,42,color),this.add.circle(0,-30,9,0xb98560),this.add.rectangle(-7,30,8,26,0x262820),this.add.rectangle(7,30,8,26,0x262820)]);
        return c;
    }

    showFinalScreen (objects=[])
    {
        objects.forEach(o=>{if(o&&o.destroy)o.destroy();});
        this.add.rectangle(512,384,1024,768,0x020705,.97).setScrollFactor(0).setDepth(500);
        this.add.text(512,165,'SOLDADO DA BORRACHA',{fontFamily:'Arial Black',fontSize:'42px',color:'#f1e1ae'}).setOrigin(.5).setScrollFactor(0).setDepth(501);
        this.add.text(512,265,'A FLORESTA GUARDA\nQUEM APRENDE A ESCUTÁ-LA.',{fontFamily:'Arial Black',fontSize:'26px',color:'#c8d8cc',align:'center'}).setOrigin(.5).setScrollFactor(0).setDepth(501);
        this.add.text(512,340,'SERINGUEIRO',{fontFamily:'Arial',fontSize:'17px',color:'#9fba9f'}).setOrigin(.5).setScrollFactor(0).setDepth(501);
        this.add.text(512,380,'JORNADA CONCLUÍDA',{fontFamily:'Arial Black',fontSize:'32px',color:'#d6b56c'}).setOrigin(.5).setScrollFactor(0).setDepth(501);
        this.add.text(512,445,'TROPA DO SERINGAL',{fontFamily:'Arial Black',fontSize:'21px',color:'#9fba9f'}).setOrigin(.5).setScrollFactor(0).setDepth(501);
        const b=this.add.rectangle(512,560,310,64,0x8b5a2b).setStrokeStyle(3,0xd6b56c).setScrollFactor(0).setDepth(501).setInteractive({useHandCursor:true});
        this.add.text(512,560,'VOLTAR AO MENU',{fontFamily:'Arial Black',fontSize:'22px',color:'#fff'}).setOrigin(.5).setScrollFactor(0).setDepth(502);
        b.on('pointerdown',()=>{this.cleanupSceneHazardsBeforeTransition();this.scene.start('MainMenu');});
    }

    createBossHud ()
    {
        this.bossHud=this.add.container(512,205).setScrollFactor(0).setDepth(150).setVisible(false);
        const bg=this.add.rectangle(0,0,440,62,0x040907,.88).setOrigin(.5);bg.setStrokeStyle(1,0x8b7653,.6);
        const label=this.add.text(0,-18,'MAPINGUARI',{fontFamily:'Arial Black',fontSize:'18px',color:'#f1e1ae'}).setOrigin(.5);
        this.bossSegments=[];
        for(let i=0;i<7;i++){
            const seg=this.add.rectangle(-150+i*50,13,38,13,0x25352a,1);seg.setStrokeStyle(1,0x6b7f6d,.55);this.bossSegments.push(seg);
        }
        this.bossStageText=this.add.text(175,8,'1/3',{fontFamily:'Arial',fontSize:'14px',color:'#c8d8cc'}).setOrigin(.5);
        this.bossHud.add([bg,label,...this.bossSegments,this.bossStageText]);
    }

    updateBossHud ()
    {
        if(!this.bossSegments)return;
        this.bossSegments.forEach((s,i)=>s.setFillStyle(i<this.bossProgress?0xb38a4a:0x25352a,1));
        this.bossStageText.setText(`${this.bossStage}/3`);
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

    syncPlayerVisual () { this.playerVisual.setPosition(this.player.x,this.player.y); }

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

    tryDash ()
    {
        if(!this.dashUnlocked||this.phaseCompleted||this.isPlayerDead||this.isDashing||this.time.now<this.nextDashAt)return;
        const grounded=this.player.body.blocked.down||this.player.body.touching.down;
        if(!grounded&&this.airDashUsed){this.showDashUnavailableFeedback();return;}
        if(this.stamina<this.dashStaminaCost){this.showStaminaBlockedFeedback();return;}
        const left=this.cursors.left.isDown||this.keyA.isDown||this.mobileInput?.left===true,right=this.cursors.right.isDown||this.keyD.isDown||this.mobileInput?.right===true;
        const direction=left&&!right?-1:right&&!left?1:(this.playerVisual.facing||1);
        this.spendStamina(this.dashStaminaCost);this.isDashing=true;this.dashLandingVisual=false;this.dashDirection=direction;this.dashEndsAt=this.time.now+this.dashDuration;this.nextDashAt=this.time.now+this.dashCooldown;if(!grounded)this.airDashUsed=true;
        this.player.body.setVelocityX(direction*this.dashSpeed);this.player.body.setVelocityY(this.player.body.velocity.y*.45);this.setMotionSquash(1.09,.92,125);this.showDashFeedback(direction);
    }

    showDashFeedback (direction)
    {
        const ghost=this.add.rectangle(this.player.x-direction*12,this.player.y-5,28,48,0xd4e0cf,.15).setDepth(17);
        this.tweens.add({targets:ghost,x:ghost.x-direction*45,alpha:0,duration:200,onComplete:()=>ghost.destroy()});
        for(let i=0;i<3;i++){const l=this.add.rectangle(this.player.x-direction*(18+i*14),this.player.y-18+i*11,25+i*5,3,0xd6e1cf,.4).setDepth(18);this.tweens.add({targets:l,x:l.x-direction*50,alpha:0,duration:210+i*20,onComplete:()=>l.destroy()});}
        for(let i=0;i<2;i++){const leaf=this.add.ellipse(this.player.x-direction*8,this.player.y+12+i*7,8,4,0x668d4d,.65).setDepth(19);this.tweens.add({targets:leaf,x:leaf.x-direction*(36+i*10),y:leaf.y-10-i*4,angle:direction*(55+i*20),alpha:0,duration:250+i*30,onComplete:()=>leaf.destroy()});}
    }

    showDashUnavailableFeedback ()
    {
        if(this.time.now<this.nextDashDeniedFeedbackAt)return;this.nextDashDeniedFeedbackAt=this.time.now+240;const p=this.add.circle(this.player.x,this.player.y,11,0xc8d8ce,.08).setDepth(18);this.tweens.add({targets:p,scale:1.7,alpha:0,duration:160,onComplete:()=>p.destroy()});
    }

    updateDash (time,grounded)
    {
        if(grounded&&!this.wasGrounded){
            this.airDashUsed=false;
            if(this.isDashing){this.dashLandingVisual=true;this.playerVisual.parts.macheteGripAngle=18;}
        }
        if(this.isDashing&&time>=this.dashEndsAt){this.isDashing=false;this.dashLandingVisual=false;this.playerVisual.parts.macheteGripAngle=18;}
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

    queueJumpInput (time) { this.jumpBufferUntil=time+this.jumpBufferMs; }

    consumeJumpBuffer (grounded)
    {
        if(this.jumpBufferUntil<this.time.now)return false;
        if(this.isDashing&&!grounded)return false;
        if(this.isDashing&&grounded){this.isDashing=false;this.dashLandingVisual=false;this.playerVisual.parts.macheteGripAngle=18;}
        if(this.jumpsUsed===0&&(grounded||this.time.now<=this.coyoteUntil)){this.player.body.setVelocityY(-520);this.jumpsUsed=1;this.coyoteUntil=0;this.jumpBufferUntil=0;this.showJumpTakeoffEffect();this.setMotionSquash(1.07,.93,115);return true;}
        if(this.doubleJumpUnlocked&&this.jumpsUsed===1&&!grounded){
            if(this.stamina<this.doubleJumpStaminaCost){this.showStaminaBlockedFeedback();this.jumpBufferUntil=0;return false;}
            this.spendStamina(this.doubleJumpStaminaCost);this.player.body.setVelocityY(-500);this.jumpsUsed=2;this.jumpBufferUntil=0;this.showDoubleJumpBurst();this.setMotionSquash(1.045,.955,95);return true;
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

    showDoubleJumpBurst ()
    {
        const b=this.add.circle(this.player.x,this.player.y+24,12,0xc8d59b,.35).setDepth(18);this.tweens.add({targets:b,scale:2.5,alpha:0,duration:260,onComplete:()=>b.destroy()});
    }

    spendStamina (amount) { this.stamina=Math.max(0,this.stamina-amount);this.staminaRegenBlockedUntil=this.time.now+this.staminaRegenDelay;this.updateStaminaHud(); }

    updateStamina (time,grounded)
    {
        const delta=Math.min(.05,Math.max(0,(time-this.lastStaminaUpdateAt)/1000));this.lastStaminaUpdateAt=time;
        if(this.phaseCompleted||this.isPlayerDead||time<this.staminaRegenBlockedUntil||this.stamina>=this.maxStamina)return;
        this.stamina=Math.min(this.maxStamina,this.stamina+(grounded?this.staminaGroundRegen:this.staminaAirRegen)*delta);this.updateStaminaHud();
    }

    showStaminaBlockedFeedback ()
    {
        if(!this.staminaHud||this.time.now<this.nextStaminaFeedbackAt)return;this.nextStaminaFeedbackAt=this.time.now+220;this.tweens.killTweensOf(this.staminaBar);this.tweens.add({targets:this.staminaBar,alpha:.25,duration:70,yoyo:true,repeat:2,onComplete:()=>this.staminaBar.setAlpha(1)});
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
        this.porongaLightPhase=5;

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
        this.livingAtmosphereProfile={"phase":5,"worldWidth":4000,"farScroll":0.05,"farAlpha":0.72,"farColor":466967,"farStep":220,"farHeight":260,"farHeightStep":46,"farTrunk":28,"farCrown":78,"lowCanopy":false,"lowCanopyColor":398093,"fogColor":10466739,"fogBackAlpha":0.072,"fogMidAlpha":0.062,"fogFrontAlpha":0.034,"rayColor":11451315,"rays":[{"x":820,"y":170,"w":100,"h":360,"alpha":0.008,"angle":-10,"scroll":0.5}],"swayColor":1320986,"sway":[{"x":920,"y":620,"w":110,"h":30,"alpha":0.24},{"x":1960,"y":618,"w":120,"h":31,"alpha":0.22},{"x":2710,"y":616,"w":125,"h":32,"alpha":0.2}],"vignetteAlpha":0.04,"toneColor":465701,"leafDelay":3300,"moteDelay":3900,"birdDelay":18000,"shadowDelay":10500,"maxLeaves":7,"maxMotes":5,"maxBirds":1,"initialMotes":2,"verticalLeaves":false,"largeLeaves":true,"leafColorA":4153917,"leafColorB":3099953,"leafAlpha":0.5,"leafDepth":15,"moteColor":12762534,"moteAlpha":0.12,"moteDepth":10,"dustMotes":false,"birdColor":593676,"birdAlpha":0.4,"shadows":true,"shadowW":180,"shadowH":48,"shadowColor":132356,"shadowAlpha":0.12,"region1":1900,"region2":2800};
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
            this.createOrganicFogMass(width*.28,500,width*.72,180,p.fogColor,p.fogBackAlpha,-20,.16,19)
        );
        this.livingFogMid=this.trackLivingPermanent(
            this.createOrganicFogMass(width*.58,555,width*.72,155,p.fogColor,p.fogMidAlpha,-15,.36,27)
        );
        this.livingFogFront=this.trackLivingPermanent(
            this.createOrganicFogMass(width*.42,610,780,92,p.fogColor,p.fogFrontAlpha,3,.72,37)
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
            if(region===1){back*=1.16;mid*=1.2;front*=1.07;tone=.045;rayScale=.16;}
            if(region===2){back*=1.3;mid*=1.3;front*=1.1;tone=.065;rayScale=.08;}
            if(region===3){back*=1.34;mid*=1.34;front*=.82;tone=.075;rayScale=.04;}
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
        this.createQuickMenuButton();
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

    createHealthHud ()
    {
        this.healthHud = this.add.container(18, 18)
            .setScrollFactor(0)
            .setDepth(102);

        const background = this.add.rectangle(0, 0, 178, 26, 0x040907, 0.64).setOrigin(0);
        background.setStrokeStyle(1, 0x78917c, 0.28);

        const label = this.add.text(8, 6, 'VIDA', {
            fontFamily: 'Arial Black',
            fontSize: '11px',
            color: '#f1e1ae'
        });

        const barBack = this.add.rectangle(52, 8, 72, 10, 0x351b18, 0.95).setOrigin(0);
        barBack.setStrokeStyle(1, 0x8e6f62, 0.55);

        this.healthBar = this.add.rectangle(52, 8, 72, 10, 0x8fb35b, 1).setOrigin(0);

        this.healthText = this.add.text(132, 6, '100/100', {
            fontFamily: 'Arial',
            fontSize: '11px',
            color: '#ffffff'
        });

        this.healthHud.add([background, label, barBack, this.healthBar, this.healthText]);
        this.updateHealthHud();
    }

    createHungerHud ()
    {
        this.hungerHud = this.add.container(204, 18)
            .setScrollFactor(0)
            .setDepth(102);

        const background = this.add.rectangle(0, 0, 178, 26, 0x040907, 0.64).setOrigin(0);
        background.setStrokeStyle(1, 0x78917c, 0.28);

        this.hungerLabel = this.add.text(8, 6, 'FOME', {
            fontFamily: 'Arial Black',
            fontSize: '11px',
            color: '#f1e1ae'
        });

        const barBack = this.add.rectangle(52, 8, 72, 10, 0x3d2b16, 0.95).setOrigin(0);
        barBack.setStrokeStyle(1, 0x9b7b45, 0.55);

        this.hungerBar = this.add.rectangle(52, 8, 72, 10, 0xd49a3a, 1).setOrigin(0);

        this.hungerText = this.add.text(132, 6, '100/100', {
            fontFamily: 'Arial',
            fontSize: '11px',
            color: '#ffffff'
        });

        this.hungerHud.add([background, this.hungerLabel, barBack, this.hungerBar, this.hungerText]);
        this.updateHungerHud();
    }

    createStaminaHud ()
    {
        this.staminaHud = this.add.container(390, 18)
            .setScrollFactor(0)
            .setDepth(102);

        const background = this.add.rectangle(0, 0, 178, 26, 0x040907, 0.64).setOrigin(0);
        background.setStrokeStyle(1, 0x78917c, 0.28);

        const label = this.add.text(8, 6, 'FÔLEGO', {
            fontFamily: 'Arial Black',
            fontSize: '11px',
            color: '#cfe5d2'
        });

        const barBack = this.add.rectangle(52, 8, 72, 10, 0x1d3025, 0.95).setOrigin(0);
        barBack.setStrokeStyle(1, 0x668574, 0.55);

        this.staminaBar = this.add.rectangle(52, 8, 72, 10, 0x72b58a, 1).setOrigin(0);

        this.staminaText = this.add.text(132, 6, '100/100', {
            fontFamily: 'Arial',
            fontSize: '11px',
            color: '#ffffff'
        });

        this.staminaHud.add([background, label, barBack, this.staminaBar, this.staminaText]);
        this.updateStaminaHud();
    }

    updateHealthHud () { const r=Math.max(0,this.health/this.maxHealth);this.healthBar.width=72*r;this.healthText.setText(`${this.health}/${this.maxHealth}`); }
    updateHungerHud () { const r=Math.max(0,this.hunger/this.maxHunger);this.hungerBar.width=72*r;this.hungerText.setText(`${this.hunger}/${this.maxHunger}`); }
    updateStaminaHud () { const r=Math.max(0,Math.min(1,this.stamina/this.maxStamina));this.staminaBar.width=72*r;this.staminaText.setText(`${Math.round(this.stamina)}/${this.maxStamina}`); }

    updateHunger (time)
    {
        if(this.phaseCompleted||this.isPlayerDead)return;
        if(time>=this.nextHungerDrainAt){const steps=Math.floor((time-this.nextHungerDrainAt)/2000)+1;this.hunger=Math.max(0,this.hunger-steps);this.nextHungerDrainAt+=steps*2000;this.updateHungerHud();}
        if(this.hunger<=0&&time>=this.nextStarvationDamageAt){this.nextStarvationDamageAt=time+2000;this.health=Math.max(0,this.health-5);this.updateHealthHud();if(this.health<=0)this.handlePlayerDeath();}
    }

    showLevelTitle ()
    {
        const intro = this.add.container(512, 286).setScrollFactor(0).setDepth(170);
        const panel = this.add.rectangle(0, 0, 430, 132, 0x040907, 0.76)
            .setStrokeStyle(1, 0x78917c, 0.32);
        const phaseText = this.add.text(0, -38, 'FASE 5', {
            fontFamily: 'Arial Black',
            fontSize: '15px',
            color: '#d6b56c'
        }).setOrigin(0.5);
        const titleText = this.add.text(0, -8, 'TERRITÓRIO DO MAPINGUARI', {
            fontFamily: 'Arial Black',
            fontSize: '25px',
            color: '#f1e1ae',
            align: 'center'
        }).setOrigin(0.5);
        const playerLabel = this.add.text(0, 35, 'SERINGUEIRO', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#9fba9f'
        }).setOrigin(0.5);

        intro.add([panel, phaseText, titleText, playerLabel]);

        this.tweens.add({
            targets: intro,
            alpha: 0,
            delay: 2200,
            duration: 850,
            ease: 'Sine.Out',
            onComplete: () => intro.destroy()
        });
    }

    showBriefText (message,duration=1100)
    {
        const t=this.add.text(512,220,message,{fontFamily:'Arial Black',fontSize:'20px',color:'#e4d7ad',backgroundColor:'#040907cc',padding:{x:14,y:8}}).setOrigin(.5).setScrollFactor(0).setDepth(180);this.time.delayedCall(duration,()=>t.destroy());
    }

    update ()
    {
        const time=this.time.now;const moveSpeed=260;const grounded=this.player.body.blocked.down||this.player.body.touching.down;
        this.updateDash(time,grounded);this.updateStamina(time,grounded);
        const jumpDown=this.keyW.isDown||this.cursors.up.isDown||this.spaceKey.isDown||this.mobileInput?.jump===true;
        if(jumpDown&&!this.jumpWasDown)this.queueJumpInput(time);else if(!jumpDown&&this.jumpWasDown)this.applyJumpCut();this.jumpWasDown=jumpDown;

        if(!this.isPlayerDead&&!this.phaseCompleted){
            if(!this.isDashing&&time>=this.knockbackUntil){
                const left=this.cursors.left.isDown||this.keyA.isDown||this.mobileInput?.left===true,right=this.cursors.right.isDown||this.keyD.isDown||this.mobileInput?.right===true;
                const direction=left&&!right?-1:right&&!left?1:0;
                if(direction!==0&&this.lastMoveDirection!==0&&direction!==this.lastMoveDirection)this.showDirectionChangeFeedback(direction);
                if(direction!==0)this.lastMoveDirection=direction;
                if (!applyWetGroundMovement(this, direction, moveSpeed, grounded, time)) this.player.body.setVelocityX(direction*moveSpeed);
            }
            this.updateGroundedState(grounded);this.consumeJumpBuffer(grounded);this.applyFastFall(grounded);
        } else {this.updateGroundedState(grounded);this.fastFallActive=false;}

        if(this.player.y>720&&!this.isPlayerDead){
            this.handlePlayerDeath();
        }

        this.bossHintSign?.update?.(this.player);
        this.syncPlayerVisual();this.animatePlayerVisual(time);this.updatePorongaLight();this.updateAttack(time);this.updateMacheteVisual(time);this.updateAttackSprite(time);this.updateBoss(time);this.updateFruits(time);this.updateHunger(time);this.updateLivingAtmosphere();this.weatherSystem?.update(time);this.oncaEncounter?.update(time);this.forestMonkeySystem?.update(time);

        this.audioManager?.updateScene(this, { grounded, time });
        this.horizontalExpansion?.update(this.time.now);
}
}