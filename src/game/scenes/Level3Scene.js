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
import { createPhaseExitBridge } from '../phaseExitBridge.js';

export class Level3Scene extends Scene
{
    constructor () { super('Level3Scene'); }

    create ()
    {
        this.worldWidth=11700;
        this.physics.world.setBounds(0,0,this.worldWidth,768);
        this.cameras.main.setBounds(0,0,this.worldWidth,768);
        this.cameras.main.setBackgroundColor('#526750');
        this.createHighForest(); this.createRubberTreeAccents(); this.createPlatforms(); this.createCaboclinhoSigns();
        this.player=this.add.rectangle(150,560,45,70,0x000000,0); this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true); this.player.body.setMaxVelocity(260,900); this.player.body.setSize(45,70); this.createEnvironmentalChallenges(); this.physics.add.collider(this.player,this.platforms);
        this.playerVisual=this.createPlayerVisual();
        this.playerVisual.setVisible(false);
        this.attackSprite=this.add.sprite(this.player.x,this.player.y+45,'seringueiroAttack',0)
            .setOrigin(.5,480/512).setScale(.23).setDepth(20).setVisible(true)
            .setFlipX(this.playerVisual.facing<0);
        this.idleVisualStartedAt=null;
        this.wasAirborneVisual=false;
        this.landingVisualStartedAt=null;
        this.syncPlayerVisual();
        this.maxHealth=100; this.health=100; this.maxHunger=100; this.hunger=100; this.nextHungerDrainAt=this.time.now+2000; this.nextStarvationDamageAt=this.time.now+2000; this.invulnerableUntil=0; this.knockbackUntil=0; this.isPlayerDead=false; this.phaseCompleted=false;
        this.doubleJumpUnlocked=this.registry.get('doubleJumpUnlocked')===true;
        this.jumpsUsed=0; this.jumpWasDown=false; this.wasGrounded=false; this.jumpBufferUntil=0; this.jumpBufferMs=130; this.coyoteTimeMs=100; this.coyoteUntil=0; this.lastAirVelocityY=0; this.fastFallActive=false; this.motionFx={scaleX:1,scaleY:1}; this.directionFx={lean:0}; this.lastMoveDirection=0;
        this.maxStamina=100; this.stamina=100; this.doubleJumpStaminaCost=30; this.dashStaminaCost=25; this.staminaRegenDelay=350; this.staminaGroundRegen=40; this.staminaAirRegen=12; this.staminaRegenBlockedUntil=0; this.lastStaminaUpdateAt=this.time.now; this.nextStaminaFeedbackAt=0;
        this.dashUnlocked=this.registry.get('dashUnlocked')===true; this.isDashing=false; this.dashLandingVisual=false; this.dashEndsAt=0; this.nextDashAt=0; this.airDashUsed=false; this.nextDashDeniedFeedbackAt=0; this.dashDirection=1; this.dashSpeed=520; this.dashDuration = 380; this.dashCooldown=380;
        this.isAttacking=false; this.attackStartedAt=0; this.nextAttackAt=0; this.attackDirection=1; this.attackBufferUntil=0; this.attackBufferMs=100; this.attackVisualVariant=-1; this.attackSoundVariant=-1; this.attackArcShown=false; this.attackHitSnakeRegistered=false; this.attackHitCarapanaRegistered=false; this.attackHitBossRegistered=false;
        this.createSnake(); this.createCarapana(); this.createAttackHitbox(); this.createFruits(); this.createCaboclinhoTrial(); this.createFinalZone();
        this.cursors=this.input.keyboard.createCursorKeys(); this.keyA=this.input.keyboard.addKey('A'); this.keyD=this.input.keyboard.addKey('D'); this.keyW=this.input.keyboard.addKey('W'); this.keyS=this.input.keyboard.addKey('S'); this.spaceKey=this.input.keyboard.addKey('SPACE'); this.keyJ=this.input.keyboard.addKey('J'); this.keyX=this.input.keyboard.addKey('X'); this.keyShift=this.input.keyboard.addKey('SHIFT');
        this.keyJ.on('down', () => this.queueAttackInput()); this.keyX.on('down', () => this.queueAttackInput());
        createBasicMobileControls(this); this.keyShift.on('down',()=>this.tryDash());
        this.cameras.main.startFollow(this.player,true,0.08,0.08); this.cameras.main.setDeadzone(220,160);
        this.createHud(); this.createHealthHud(); this.createHungerHud(); this.createStaminaHud(); this.showLevelTitle(); this.createLivingAtmosphere(); this.createPorongaLightSystem(); this.spawnPoint={x:150,y:560};
        this.forestMonkeySystem = createForestMonkeySystem(this, {
            phase: 3,
            perches: [
                { x: 458, y: 282 },
                { x: 1140, y: 268 },
                { x: 1840, y: 250 },
                { x: 2540, y: 270 },
                { x: 3240, y: 245 }
            ],
            damage: 15,
            maxMonkeys: 2,
            throwMin: 2200,
            throwMax: 3000,
            maxProjectiles: 4,
            aimLead: 0.24,
            aimError: 27,
            spawnChance: 0.70,
            isPaused: () =>
                this.phaseCompleted ||
                (this.caboclinhoTestActive && !this.caboclinhoTestComplete)
        });
        this.oncaEncounter = new OncaEncounter(this, {
            phase: 3,
            canSpawn: () => {
                const bossActive = this.caboclinhoTestActive && !this.caboclinhoTestComplete;
                return {
                    allowed: !this.phaseCompleted && !this.isPlayerDead && !bossActive,
                    bossActive
                };
            }
        });

        this.weatherSystem = createTropicalStormSystem(this, { phase: 3 });
        this.audioManager = getAudioManager(this);
        this.audioManager?.startScene(this, { music: 'music_forest', ambient: 'forest_ambient' });
        this.audioSettingsUi = createAudioSettingsControl(this, {
            x: 900,
            y: 27,
            buttonSize: 40
        });

        this.horizontalExpansion = createHorizontalExpansion(this, {
            phase: 3,
            startX: 3800,
            endX: 11320,
            groundY: 710,
            checkpointXs: [4050, 6750, 9050],
            checkpointY: 560,
            enemyXs: [4380, 5280, 6180, 8720, 9800],
            monkeyPerches: [
                { x: 4050, y: 285 }, { x: 4920, y: 250 }, { x: 5840, y: 300 },
                { x: 6670, y: 245 }, { x: 7500, y: 280 }, { x: 8920, y: 250 },
                { x: 9860, y: 275 }, { x: 10720, y: 245 }
            ]
        });

        const finalSteps = [
            [7200,500,150],[7540,445,140],[7860,390,150],[8200,455,150],
            [10860,500,150],[10970,425,135],[11080,350,125],[11200,285,120]
        ];
        finalSteps.forEach(([x,y,w])=>{
            const body=this.add.rectangle(x,y,w,22,0x000000,0);
            this.physics.add.existing(body,true);this.platforms.add(body);
            this.add.rectangle(x,y,w,22,0x4f3826,.96).setDepth(10);
            this.add.ellipse(x,y-12,w*.82,8,0x3e7142,.62).setDepth(11);
        });
        this.finalBridge = createPhaseExitBridge(this, { step: finalSteps[finalSteps.length - 1], length: 330, landingLength: 85 });

        this.bossHintSign=createBossHintSign(this,{
            x:5550,
            y:650,
            title:'DICA: CABOCLINHO DA MATA',
            text:'Fique fora do alcance dos ataques. Saia da área de perigo e se aproxime apenas quando houver uma abertura; ataque e volte a se afastar.'
        });
}

    createHighForest ()
    {
        const sky=this.add.graphics().setDepth(-50).setScrollFactor(0);
        sky.fillStyle(0x526750,1);sky.fillRect(0,0,1024,768);
        sky.fillStyle(0x6d7855,.56);sky.fillRect(0,180,1024,340);
        sky.fillStyle(0x807650,.22);sky.fillRect(0,500,1024,268);
        this.add.circle(835,132,82,0xf0cf8a,.09).setDepth(-49).setScrollFactor(.035);
        this.add.circle(835,132,42,0xf2d497,.38).setDepth(-48).setScrollFactor(.035);
        const distant=this.add.graphics().setDepth(-40).setScrollFactor(0.12); distant.fillStyle(0x0a211a,0.96); distant.fillRect(-300,520,this.worldWidth+800,250);
        [[40,430,20,205,65],[250,390,26,245,82],[510,455,18,180,58],[760,365,32,270,96],[1040,420,22,215,72],[1320,350,34,285,102],[1620,440,20,195,64],[1910,370,30,265,92],[2210,415,24,220,76],[2520,340,36,295,108],[2860,430,21,205,68],[3160,360,32,275,98],[3470,410,24,225,78],[3740,345,34,290,105]].forEach(([x,y,w,h,c],i)=>{distant.fillStyle(i%2?0x0d2b20:0x102e23,0.9);distant.fillRect(x,y,w,h);distant.fillStyle(i%3?0x0d2b20:0x123527,0.9);distant.fillCircle(x+w/2,y-8,c);distant.fillCircle(x-c*0.45,y+20,c*0.55);distant.fillCircle(x+c*0.52,y+22,c*0.62);});
        const middle=this.add.graphics().setDepth(-24).setScrollFactor(0.44); [[120,315,46,345,1],[430,255,58,405,1.12],[780,340,40,320,.9],[1110,240,60,420,1.15],[1470,300,48,360,1],[1810,215,64,445,1.18],[2190,330,42,330,.94],[2510,235,58,425,1.12],[2860,285,50,375,1.04],[3210,205,66,455,1.2],[3570,300,46,360,1]].forEach(([x,y,w,h,s],i)=>this.drawHighTree(middle,x,y,w,h,s,i%2===0));
        const vines=this.add.graphics().setDepth(-12).setScrollFactor(.58); vines.lineStyle(5,0x18452d,.74); [300,690,1160,1580,2040,2460,2940,3380,3700].forEach((x,i)=>{vines.beginPath();vines.moveTo(x,15+(i%3)*20);vines.lineTo(x+(i%2?18:-16),270+(i%3)*45);vines.lineTo(x+(i%2?-5:7),430+(i%2)*35);vines.strokePath();});
        const roots=this.add.graphics().setDepth(4);
        [[360,650,520,560],[930,650,1110,500],[1450,650,1610,540],[2040,650,2200,495],[2500,650,2680,450],[3020,650,3200,410]].forEach(([a,b,c,d],i)=>{
            roots.lineStyle(18+(i%3)*3,0x412d1e,.92);
            roots.beginPath();roots.moveTo(a,b);roots.lineTo(a+(c-a)*.38,b-22-(i%2)*12);roots.lineTo(a+(c-a)*.7,d+28);roots.lineTo(c,d);roots.strokePath();
            roots.lineStyle(5,0x65472d,.54);roots.beginPath();roots.moveTo(a+(c-a)*.42,b-24);roots.lineTo(a+(c-a)*.52,b-58-(i%3)*8);roots.strokePath();
            roots.fillStyle(0x35623a,.58);roots.fillEllipse(a+(c-a)*.52,b-31,58+(i%2)*18,8);
        });
        this.createOrganicFogMass(720,510,1580,145,0xb8cabf,.055,-18,.2,2);
        this.createOrganicFogMass(2200,565,2280,120,0xd1ddd4,.04,-16,.38,4);
        this.createOrganicFogMass(3100,610,1500,105,0xe0e8e1,.035,-10,.68,6);
        const fg=this.add.graphics().setDepth(30).setScrollFactor(1.08).setAlpha(.72); [80,310,620,880,1260,1540,1880,2220,2580,2910,3260,3600].forEach((x,i)=>{const s=30+(i%4)*5;fg.fillStyle(i%2?0x102f1d:0x0b2518,.95);fg.fillCircle(x,650,s);fg.fillCircle(x+s*.7,655,s*.72);});
    }

    drawHighTree (g,x,y,w,h,s,left)
    {
        const cx=x+w*.5,baseY=y+h,cy=y-12;

        g.fillStyle(0x3c2b1f,.95);
        g.fillRoundedRect(x,y,w,h,Math.max(7,w*.24));
        g.fillStyle(0x523925,.4);
        g.fillRoundedRect(x+w*.17,y+8,w*.2,h-16,5);
        g.fillStyle(0x30231b,.28);
        g.fillRoundedRect(x+w*.7,y+24,w*.12,h-32,4);

        g.lineStyle(7,0x39281c,.8);
        g.beginPath();g.moveTo(cx,baseY-8);g.lineTo(x-30,baseY+4);g.strokePath();
        g.beginPath();g.moveTo(cx+4,baseY-7);g.lineTo(x+w+34,baseY+3);g.strokePath();

        g.lineStyle(9,0x39281c,.84);
        g.beginPath();g.moveTo(cx,y+88);g.lineTo(cx+(left?-82:90),y+7);g.strokePath();
        g.lineStyle(5,0x493224,.62);
        g.beginPath();g.moveTo(cx+3,y+132);g.lineTo(cx+(left?54:-60),y+66);g.strokePath();

        g.fillStyle(0x103924,.96);
        g.fillEllipse(cx,cy,158*s,114*s);
        g.fillEllipse(cx-70*s,cy+24,112*s,80*s);
        g.fillEllipse(cx+73*s,cy+20,122*s,84*s);
        g.fillStyle(0x1a4d30,.58);
        g.fillEllipse(cx-14,cy-30,98*s,62*s);
        g.fillStyle(0x235c39,.32);
        g.fillEllipse(cx+43,cy+6,78*s,52*s);
    }

    createRubberTreeAccents ()
    {
        this.rubberLatexInterval=3100;
        [
            [505,395,36,255],
            [2770,390,34,260]
        ].forEach(([x,y,w,h],index)=>this.createRubberTreeVisual(x,y,w,h,index,7,1));
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
        this.platforms=this.physics.add.staticGroup(); const add=(x,y,w,h)=>{const p=this.add.rectangle(x,y,w,h,0x000000,0);this.physics.add.existing(p,true);this.platforms.add(p);};
        add(350,710,700,116);add(1000,710,500,116);add(1510,710,420,116);add(2100,710,520,116);add(2700,710,420,116);
        add(560,595,150,28);add(900,525,170,28);add(1180,445,160,28);add(1460,585,145,30);add(1720,505,175,28);add(1980,415,165,28);add(2260,560,150,30);add(2470,470,170,28);add(2660,370,165,28);add(2860,500,165,28);add(3000,430,120,24);add(3550,390,150,30);add(3750,315,100,28);
        const g=this.add.graphics().setDepth(5);
        const ground=[[0,652,700,116],[750,652,500,116],[1300,652,420,116],[1840,652,520,116],[2490,652,420,116]];
        this.muddySwampWater = addMuddySwampWaterFromGroundSegments(this, ground, {
            phase: 3,
            surfaceY: 700,
            endX: 3800
        });
        ground.forEach(([x,y,w,h],i)=>{g.fillStyle(i%2?0x513824:0x4b3423,1);g.fillRect(x,y,w,h);});
        this.decorateGroundVisual(g,ground,3);
        [[485,581,150,28,'root'],[815,511,170,28,'bank'],[1100,431,160,28,'log'],[1388,570,145,30,'bank'],[1632,491,175,28,'root'],[1898,401,165,28,'log'],[2185,545,150,30,'bank'],[2385,456,170,28,'root'],[2578,356,165,28,'log'],[2778,486,165,28,'bank'],[2940,418,120,24,'root'],[3475,375,150,30,'root'],[3700,301,100,28,'log']].forEach(([x,y,w,h,t])=>this.drawNaturalPlatform(g,x,y,w,h,t));
    }

    drawNaturalPlatform (g,x,y,w,h,t)
    {
        if(t==='log'){
            g.fillStyle(0x49311f,1);g.fillRoundedRect(x+4,y+2,w-8,h-3,11);
            g.fillStyle(0x6a4a2e,.68);g.fillEllipse(x+w*.5,y+h*.44,w-17,8);
            g.lineStyle(2,0x2f221a,.58);[.24,.5,.72].forEach((r,i)=>{g.beginPath();g.moveTo(x+w*r,y+4);g.lineTo(x+w*r+9+(i%2)*5,y+h-4);g.strokePath();});
            g.fillStyle(0x2d5c34,.9);g.fillEllipse(x+w*.35,y+1,w*.47,7);g.fillEllipse(x+w*.72,y+2,w*.32,6);
            g.lineStyle(4,0x483124,.7);g.beginPath();g.moveTo(x+w*.18,y+h-2);g.lineTo(x+w*.1,y+h+10);g.strokePath();
        }else if(t==='root'){
            g.lineStyle(Math.max(12,h*.62),0x4b3422,.98);g.beginPath();
            g.moveTo(x+4,y+h-5);g.lineTo(x+w*.28,y+8);g.lineTo(x+w*.52,y+h*.5);g.lineTo(x+w*.72,y+6);g.lineTo(x+w-4,y+h-5);g.strokePath();
            g.lineStyle(5,0x68472d,.82);g.beginPath();g.moveTo(x+w*.28,y+9);g.lineTo(x+w*.2,y-5);g.strokePath();g.beginPath();g.moveTo(x+w*.72,y+7);g.lineTo(x+w*.82,y-3);g.strokePath();
            g.fillStyle(0x34633a,.82);g.fillEllipse(x+w*.35,y+3,w*.38,7);g.fillEllipse(x+w*.7,y+4,w*.3,6);
        }else{
            g.fillStyle(0x563a24,1);g.fillRoundedRect(x+2,y+5,w-4,h-5,8);
            g.fillStyle(0x315d34,.94);g.fillEllipse(x+w*.27,y+2,w*.48,8);g.fillEllipse(x+w*.72,y+3,w*.39,7);
            g.fillStyle(0x4b5148,.62);g.fillTriangle(x+w*.15,y+h-2,x+w*.28,y+h*.25,x+w*.41,y+h-2);
            g.fillStyle(0x714d2e,.38);g.fillEllipse(x+w*.7,y+h*.68,w*.34,h*.3);
        }
    }

    createCaboclinhoSigns ()
    {
        const g=this.add.graphics().setDepth(10);g.fillStyle(0x806b4b,.82);[[2050,635],[2100,620],[2160,632],[2220,615]].forEach(([x,y])=>{g.fillEllipse(x,y,13,7);g.fillCircle(x-5,y-6,2.5);g.fillCircle(x+1,y-8,2);g.fillCircle(x+6,y-6,2);});g.lineStyle(4,0x6a4a2e,.85);[[2290,605,2340,585],[2310,620,2360,600],[2330,602,2380,625]].forEach(([a,b,c,d])=>{g.beginPath();g.moveTo(a,b);g.lineTo(c,d);g.strokePath();});g.fillStyle(0xd7a346,.8);g.fillCircle(2370,618,7);g.fillCircle(2390,610,7);g.fillCircle(2410,620,7);
        const leaf=this.add.ellipse(2440,510,16,7,0x4d7b49,.78).setDepth(11);this.tweens.add({targets:leaf,x:2462,y:501,angle:35,duration:760,yoyo:true,repeat:-1,ease:'Sine.InOut'});
        const whistle=this.add.graphics().setDepth(12);whistle.lineStyle(2,0xc8d8ce,.35);[0,12,24].forEach(o=>{whistle.beginPath();whistle.arc(2510+o,445,18+o*.15,-.8,.8);whistle.strokePath();});this.tweens.add({targets:whistle,alpha:{from:.15,to:.55},duration:850,yoyo:true,repeat:-1});
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
            minX: 820,
            maxX: 1080,
            speed: 70
        };

        this.snake = this.add.rectangle(950, 620, 72, 24, 0x000000, 0);
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
        this.snakeVisualLastFacing = 1;
        this.snakeVisualUpdateInterval = 33;
        this.nextSnakeVisualUpdateAt = 0;
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

        // Física e colisão continuam a cada frame. No touch, apenas a animação visual
        // procedural da cobra é atualizada a ~30 Hz para reduzir custo de renderização.
        if (this.isTouchDevice === true && time < this.nextSnakeVisualUpdateAt)
        {
            return;
        }
        if (this.isTouchDevice === true)
        {
            this.nextSnakeVisualUpdateAt = time + this.snakeVisualUpdateInterval;
        }

        const seconds = time * 0.001;
        const wave = Math.sin(seconds * 8);
        const waveBack = Math.sin(seconds * 8 - 0.8);
        const waveTail = Math.sin(seconds * 8 - 1.5);

        this.snakeVisual.setPosition(this.snake.x, this.snake.y - 2 + wave * 1.2);
        if (this.snakeVisualLastFacing !== this.snakeVisual.facing)
        {
            this.snakeVisualLastFacing = this.snakeVisual.facing;
            this.snakeVisual.setScale(this.snakeVisualLastFacing, 1);
        }

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
            minX: 1580,
            maxX: 1860,
            baseX: 1720,
            baseY: 360,
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

            if (distance > 1)            {
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
        if (this.caboclinhoTestActive && !this.caboclinhoTestComplete) this.prepareCaboclinhoBossForPlayerDeath();
        this.resetCombatPolishState();
        this.clearRubberLatexDrops();
        this.player.body.setVelocity(0, 0);
        this.time.delayedCall(650, () => {
            this.player.setPosition(this.spawnPoint.x, this.spawnPoint.y);
            this.player.body.setVelocity(0, 0);
            this.bossHintSign?.reset?.();
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
            if (this.caboclinhoTestActive && !this.caboclinhoTestComplete) this.resetCaboclinhoBoss(true);
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
            { x: 430, y: 620, color: 0xc94432 },
            { x: 1110, y: 405, color: 0xe0b843 },
            { x: 1760, y: 335, color: 0xd77a2f },
            { x: 2460, y: 390, color: 0xc94432 },
            { x: 3440, y: 330, color: 0xe0b843 }
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
                feedback.destroy();            }
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

    createCaboclinhoTrial ()
    {
        this.caboclinhoTestActive = false;
        this.caboclinhoTestComplete = false;
        this.caboclinhoStage = 0;
        this.caboclinhoMoving = false;
        this.caboclinhoState = 'DORMANT';
        this.caboclinhoVisualState = 'IDLE';
        this.caboclinhoMaxHealth = 100;
        this.caboclinhoHealth = 100;
        this.caboclinhoArenaMinX = 9660;
        this.caboclinhoArenaMaxX = 10760;
        this.caboclinhoNextActionAt = 0;
        this.caboclinhoActionSerial = 0;
        this.caboclinhoStrongActions = 0;
        this.caboclinhoComboCount = 0;
        this.caboclinhoDashHitRegistered = false;
        this.caboclinhoJumpsUsed = 0;
        this.caboclinhoAirDashUsed = false;
        this.caboclinhoAttackTimers = [];
        this.caboclinhoArrows = [];
        this.caboclinhoSecondArrowQueued = false;
        this.caboclinhoVisualDestroyed = false;

        this.caboclinhoVisual = this.createCaboclinhoVisual();
        this.caboclinhoVisual.setVisible(false);

        this.caboclinho = this.add.rectangle(10380, 610, 44, 70, 0x000000, 0);
        this.physics.add.existing(this.caboclinho);
        this.caboclinho.body.setSize(44, 70);
        this.caboclinho.body.setCollideWorldBounds(true);
        this.caboclinho.body.setMaxVelocity(540, 900);
        this.caboclinho.body.enable = false;
        this.caboclinhoPlatformCollider = this.physics.add.collider(this.caboclinho, this.platforms);
        this.caboclinhoPlayerOverlap = this.physics.add.overlap(
            this.player,
            this.caboclinho,
            () => this.handleCaboclinhoContact()
        );
        this.caboclinhoAttackOverlap = this.physics.add.overlap(
            this.attackHitbox,
            this.caboclinho,
            () => this.tryHitCaboclinho()
        );

        // Garante limpeza mesmo se a scene for encerrada por um caminho diferente
        // dos botões de transição normais.
        this.events.once('shutdown', () => this.cleanupCaboclinhoBoss());

        this.caboclinhoArenaBarrierL = this.add.rectangle(9660, 500, 28, 420, 0x153321, 0).setDepth(14).setVisible(false);
        this.caboclinhoArenaBarrierR = this.add.rectangle(10770, 450, 28, 520, 0x153321, 0).setDepth(14).setVisible(false);
        [this.caboclinhoArenaBarrierL, this.caboclinhoArenaBarrierR].forEach(barrier => {
            this.physics.add.existing(barrier, true);
            barrier.body.enable = false;
        });
        this.caboclinhoBarrierPlayerL = this.physics.add.collider(this.player, this.caboclinhoArenaBarrierL);
        this.caboclinhoBarrierPlayerR = this.physics.add.collider(this.player, this.caboclinhoArenaBarrierR);
        this.caboclinhoBarrierBossL = this.physics.add.collider(this.caboclinho, this.caboclinhoArenaBarrierL);
        this.caboclinhoBarrierBossR = this.physics.add.collider(this.caboclinho, this.caboclinhoArenaBarrierR);

        this.createCaboclinhoBossHud();

        this.caboclinhoTrigger = this.add.rectangle(9760, 535, 190, 210, 0x000000, 0);
        this.physics.add.existing(this.caboclinhoTrigger);
        this.caboclinhoTrigger.body.setAllowGravity(false);
        this.caboclinhoTrigger.body.setImmovable(true);
        this.physics.add.overlap(this.player, this.caboclinhoTrigger, () => this.startCaboclinhoTrial());
    }

    createCaboclinhoVisual ()
    {
        const c = this.add.container(-200, -200).setDepth(22);
        const rig = this.add.container(0, 0);
        const aura = this.add.ellipse(0, -11, 62, 88, 0x6f9b57, 0.055).setDepth(-1);
        const shadow = this.add.ellipse(0, 35, 46, 10, 0x07100c, 0.28);

        const leftLegRig = this.add.container(-8, 12);
        const rightLegRig = this.add.container(8, 12);
        const leftShin = this.add.rectangle(0, 15, 7, 25, 0x9f6847).setOrigin(0.5, 0.12);
        const rightShin = this.add.rectangle(0, 15, 7, 25, 0x9f6847).setOrigin(0.5, 0.12);
        const leftFoot = this.add.ellipse(2, 35, 13, 6, 0x6e422d).setAngle(-8);
        const rightFoot = this.add.ellipse(2, 35, 13, 6, 0x6e422d).setAngle(-8);
        leftLegRig.add([leftShin, leftFoot]);
        rightLegRig.add([rightShin, rightFoot]);

        const torsoRig = this.add.container(0, -4);
        const waistFibers = this.add.container(0, 18);
        [-15, -9, -3, 4, 10, 15].forEach((x, index) => {
            waistFibers.add(
                this.add.triangle(
                    x,
                    0,
                    0, 0,
                    7, 0,
                    3.5, 17 + (index % 3) * 3,
                    index % 2 ? 0x56713b : 0x6d7842,
                    0.96
                )
            );
        });

        const torso = this.add.ellipse(0, -1, 28, 38, 0xa46b48);
        const chestShade = this.add.ellipse(2, 2, 18, 29, 0x8b543b, 0.48);
        const chestPaintA = this.add.rectangle(-5, -4, 3, 24, 0xb7472e, 0.9).setAngle(-18);
        const chestPaintB = this.add.rectangle(5, -4, 3, 24, 0x2d211d, 0.82).setAngle(18);
        const shoulderLeafL = this.add.ellipse(-15, -12, 18, 8, 0x315f39, 0.95).setAngle(-28);
        const shoulderLeafR = this.add.ellipse(15, -12, 18, 8, 0x315f39, 0.95).setAngle(28);
        torsoRig.add([torso, chestShade, chestPaintA, chestPaintB, shoulderLeafL, shoulderLeafR, waistFibers]);

        const leftArmRig = this.add.container(-15, -12);
        const rightArmRig = this.add.container(15, -12);
        const leftUpperArm = this.add.rectangle(0, 0, 7, 25, 0xa46b48).setOrigin(0.5, 0.1);
        const rightUpperArm = this.add.rectangle(0, 0, 7, 25, 0xa46b48).setOrigin(0.5, 0.1);
        const leftForearmRig = this.add.container(0, 21);
        const rightForearmRig = this.add.container(0, 21);
        const leftForearm = this.add.rectangle(0, 0, 6, 22, 0x985f42).setOrigin(0.5, 0.08);
        const rightForearm = this.add.rectangle(0, 0, 6, 22, 0x985f42).setOrigin(0.5, 0.08);
        const leftHand = this.add.circle(0, 20, 4.5, 0xb47751);
        const rightHand = this.add.circle(0, 20, 4.5, 0xb47751);
        const vineBracelet = this.add.ellipse(0, 10, 10, 4, 0x315e36, 0.95);
        leftForearmRig.add([leftForearm, leftHand, vineBracelet]);
        rightForearmRig.add([rightForearm, rightHand]);
        leftArmRig.add([leftUpperArm, leftForearmRig]);
        rightArmRig.add([rightUpperArm, rightForearmRig]);

        const headRig = this.add.container(0, -34);
        const earL = this.add.ellipse(-12, 0, 7, 11, 0x965d41);
        const earR = this.add.ellipse(12, 0, 7, 11, 0x965d41);
        const face = this.add.ellipse(0, 0, 27, 30, 0xaa704d);
        const jaw = this.add.ellipse(1, 8, 18, 11, 0x985f42, 0.7);
        const browL = this.add.rectangle(-6, -5, 9, 2.5, 0x2a201c).setAngle(14);
        const browR = this.add.rectangle(6, -5, 9, 2.5, 0x2a201c).setAngle(-14);
        const eyeL = this.add.ellipse(-5, -2, 5, 3, 0xf0c564);
        const eyeR = this.add.ellipse(5, -2, 5, 3, 0xf0c564);
        const pupilL = this.add.circle(-5, -2, 1.2, 0x120f0d);
        const pupilR = this.add.circle(5, -2, 1.2, 0x120f0d);
        const nose = this.add.triangle(0, 3, 0, 0, 4, 7, -2, 7, 0x7e4b35, 0.88);
        const mouth = this.add.ellipse(1, 8, 11, 4, 0x3b201d);
        const tooth = this.add.triangle(4, 8, 0, 0, 3, 0, 1.5, 3, 0xe6d8b5);
        const cheekPaintL = this.add.rectangle(-8, 4, 7, 2, 0xc1482f).setAngle(-12);
        const cheekPaintR = this.add.rectangle(8, 4, 7, 2, 0xc1482f).setAngle(12);

        const hairBack = this.add.ellipse(0, -9, 31, 20, 0x191a16);
        const hairTufts = this.add.container(0, -12);
        [-11, -6, 0, 6, 11].forEach((x, index) => {
            hairTufts.add(
                this.add.triangle(
                    x,
                    -2 - (index % 2) * 2,
                    0, 0,
                    8, 1,
                    3 + (index % 2), -11 - (index % 3) * 2,
                    index % 2 ? 0x20231d : 0x171914
                )
            );
        });

        const adornment = this.add.container(0, -17);
        adornment.add([
            this.add.ellipse(-9, -4, 7, 19, 0x426c3d).setAngle(-26),
            this.add.ellipse(-2, -7, 7, 22, 0x587d43).setAngle(-8),
            this.add.ellipse(6, -7, 6, 21, 0x8b5b36).setAngle(12),
            this.add.ellipse(12, -3, 6, 17, 0x456b3b).setAngle(28),
            this.add.circle(0, 1, 3, 0xb84931)
        ]);

        headRig.add([
            hairBack, hairTufts, adornment,
            earL, earR, face, jaw,
            browL, browR, eyeL, eyeR, pupilL, pupilR,
            nose, mouth, tooth, cheekPaintL, cheekPaintR
        ]);

        const bowRig = this.add.container(23, -9).setVisible(false);
        const bowWood = this.add.graphics();
        bowWood.lineStyle(3, 0x704827, 1);
        bowWood.beginPath();
        bowWood.arc(0, 0, 21, -1.18, 1.18, false);
        bowWood.strokePath();
        const bowString = this.add.graphics();
        bowString.lineStyle(1, 0xd8c7a1, 0.92);
        bowString.beginPath();
        bowString.moveTo(8, -19);
        bowString.lineTo(-5, 0);
        bowString.lineTo(8, 19);
        bowString.strokePath();
        const aimArrow = this.add.container(-2, 0);
        aimArrow.add([
            this.add.rectangle(0, 0, 32, 2, 0x8a6237).setOrigin(0.2, 0.5),
            this.add.triangle(25, 0, 0, -4, 8, 0, 0, 4, 0xb8b2a0),
            this.add.triangle(-5, 0, 0, 0, 8, -4, 8, 4, 0x6f824c)
        ]);
        bowRig.add([bowWood, bowString, aimArrow]);

        rig.add([
            shadow,
            leftLegRig, rightLegRig,
            torsoRig, leftArmRig, rightArmRig,
            bowRig, headRig
        ]);
        c.add([aura, rig]);

        c.parts = {
            rig, aura, shadow,
            leftLegRig, rightLegRig,
            leftForearmRig, rightForearmRig,
            torsoRig, leftArmRig, rightArmRig,
            headRig, hairTufts, adornment, bowRig, aimArrow,
            eyeL, eyeR, pupilL, pupilR,
            browL, browR, mouth,
            shoulderLeafL, shoulderLeafR,
            waistFibers
        };
        return c;
    }

    resetCaboclinhoVisualPose ()
    {
        const c = this.caboclinhoVisual;
        if (!c || !c.active || !c.parts) return;
        const p = c.parts;

        p.rig.setScale(this.caboclinhoFacing || 1, 1).setAngle(0);
        p.torsoRig.setPosition(0, -4).setAngle(0).setScale(1);
        p.headRig.setPosition(0, -34).setAngle(0).setScale(1);
        p.leftArmRig.setPosition(-15, -12).setAngle(18).setScale(1);
        p.rightArmRig.setPosition(15, -12).setAngle(-18).setScale(1);
        p.leftForearmRig.setPosition(0, 21).setAngle(-18).setScale(1);
        p.rightForearmRig.setPosition(0, 21).setAngle(18).setScale(1);
        p.leftLegRig.setPosition(-8, 12).setAngle(-6).setScale(1);
        p.rightLegRig.setPosition(8, 12).setAngle(6).setScale(1);
        p.hairTufts.setPosition(0, -12).setAngle(0).setScale(1);
        p.adornment.setPosition(0, -17).setAngle(0).setScale(1);
        p.aura.setAlpha(0.055).setScale(1);
        p.shadow.setAlpha(0.28).setScale(1);
        p.eyeL.setFillStyle(0xf0c564);
        p.eyeR.setFillStyle(0xf0c564);
        p.browL.setAngle(14);
        p.browR.setAngle(-14);
        p.mouth.setScale(1);
        if (p.bowRig) p.bowRig.setVisible(false).setPosition(23, -9).setAngle(0).setScale(1);
        if (p.aimArrow) p.aimArrow.setPosition(-2, 0).setAngle(0);
    }

    animateCaboclinhoVisual (time)
    {
        const c = this.caboclinhoVisual;
        if (!c || !c.active || !c.visible || !c.parts || this.caboclinhoVisualDestroyed) return;
        const p = c.parts;
        this.resetCaboclinhoVisualPose();

        const breath = Math.sin(time * 0.006);
        const twitch = Math.sin(time * 0.011);
        const state = this.caboclinhoVisualState || 'IDLE';

        p.torsoRig.y = -4 + breath * 1.4;
        p.headRig.y = -34 + breath * 0.7;
        p.headRig.angle = twitch * 1.8;
        p.hairTufts.angle = -twitch * 2.4;
        p.adornment.angle = twitch * 2;
        p.aura.alpha = 0.045 + (breath + 1) * 0.018;
        p.shadow.scaleX = 1 + Math.abs(breath) * 0.05;
        p.leftArmRig.angle = 20 + breath * 4;
        p.rightArmRig.angle = -22 - breath * 4;
        p.leftForearmRig.angle = -24 + twitch * 4;
        p.rightForearmRig.angle = 22 - twitch * 4;
        p.leftLegRig.angle = -8 + breath * 3;
        p.rightLegRig.angle = 8 - breath * 3;

        if (state === 'PREPARE') {
            p.torsoRig.y += 3;
            p.torsoRig.angle = -(this.caboclinhoFacing || 1) * 8;
            p.headRig.angle = (this.caboclinhoFacing || 1) * 5;
            p.leftArmRig.angle = 46;
            p.rightArmRig.angle = -52;
            p.leftLegRig.angle = -18;
            p.rightLegRig.angle = 20;
            p.hairTufts.setScale(1.04, 1.10);
            p.aura.setAlpha(0.11).setScale(1.08, 1.02);
        } else if (state === 'MOVING') {
            const stride = Math.sin(time * 0.034);
            p.torsoRig.angle = -(this.caboclinhoFacing || 1) * 10;
            p.headRig.angle = (this.caboclinhoFacing || 1) * 4;
            p.leftLegRig.angle = stride * 34;
            p.rightLegRig.angle = -stride * 34;
            p.leftArmRig.angle = -stride * 38;
            p.rightArmRig.angle = stride * 38;
            p.leftForearmRig.angle = -36;
            p.rightForearmRig.angle = 36;
            p.hairTufts.angle = -(this.caboclinhoFacing || 1) * 8;
            p.adornment.angle = -(this.caboclinhoFacing || 1) * 6;
            p.aura.setAlpha(0.09);
            p.shadow.setAlpha(0.18).setScale(0.82);
        } else if (state === 'RECOVER') {
            p.torsoRig.y += 2;
            p.torsoRig.angle = (this.caboclinhoFacing || 1) * 5;
            p.headRig.angle = -(this.caboclinhoFacing || 1) * 6;
            p.leftArmRig.angle = 34;
            p.rightArmRig.angle = -34;
            p.leftLegRig.angle = -13;
            p.rightLegRig.angle = 13;
        } else if (state === 'BOW_AIM' || state === 'BOW_SHOT') {
            p.bowRig.setVisible(true);
            p.torsoRig.angle = -(this.caboclinhoFacing || 1) * 7;
            p.headRig.angle = (this.caboclinhoFacing || 1) * 3;
            p.leftArmRig.angle = 74;
            p.rightArmRig.angle = -66;
            p.leftForearmRig.angle = -54;
            p.rightForearmRig.angle = 56;
            p.bowRig.setPosition(25, -10).setAngle(0);
            p.aimArrow.setPosition(state === 'BOW_SHOT' ? 6 : -4, 0);
            p.eyeL.setFillStyle(0xffd267);
            p.eyeR.setFillStyle(0xffd267);
            p.aura.setAlpha(0.10);
        } else if (state === 'RECOIL') {
            p.torsoRig.angle = -(this.caboclinhoFacing || 1) * 13;
            p.headRig.angle = (this.caboclinhoFacing || 1) * 11;
            p.leftArmRig.angle = 58;
            p.rightArmRig.angle = -58;
            p.eyeL.setFillStyle(0xff8f58);
            p.eyeR.setFillStyle(0xff8f58);
            p.mouth.setScale(1.18, 1.15);
            p.aura.setAlpha(0.14).setScale(1.12);
        } else if (state === 'DEFEATED') {
            p.torsoRig.angle = 12;
            p.headRig.angle = -14;
            p.leftArmRig.angle = 72;
            p.rightArmRig.angle = -70;
            p.leftLegRig.angle = -24;
            p.rightLegRig.angle = 28;
            p.eyeL.setFillStyle(0x8a7152);
            p.eyeR.setFillStyle(0x8a7152);
            p.aura.setAlpha(0.03);
        }
    }

    createCaboclinhoBossHud ()
    {
        this.caboclinhoBossHud = this.add.container(512, 112)
            .setScrollFactor(0)
            .setDepth(176)
            .setVisible(false);

        const panel = this.add.rectangle(0, 0, 430, 54, 0x06100d, 0.86);
        panel.setStrokeStyle(1, 0x8a7650, 0.62);
        const name = this.add.text(0, -16, 'CABOQUIM DA MATA', {
            fontFamily: 'Arial Black',
            fontSize: '14px',
            color: '#f1e1ae'
        }).setOrigin(0.5);
        const back = this.add.rectangle(-150, 10, 300, 14, 0x2b1815, 0.96).setOrigin(0, 0.5);
        back.setStrokeStyle(1, 0x86664f, 0.58);
        this.caboclinhoBossBar = this.add.rectangle(-150, 10, 300, 14, 0x8fb35b, 1).setOrigin(0, 0.5);
        this.caboclinhoBossText = this.add.text(0, 10, '100/100', {
            fontFamily: 'Arial',
            fontSize: '11px',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.caboclinhoBossHud.add([panel, name, back, this.caboclinhoBossBar, this.caboclinhoBossText]);
    }

    updateCaboclinhoBossHud ()
    {
        if (!this.caboclinhoBossBar || !this.caboclinhoBossText) return;
        const ratio = Math.max(0, Math.min(1, this.caboclinhoHealth / this.caboclinhoMaxHealth));
        this.caboclinhoBossBar.width = 300 * ratio;
        this.caboclinhoBossText.setText(`${this.caboclinhoHealth}/${this.caboclinhoMaxHealth}`);
    }

    startCaboclinhoTrial ()
    {
        if (this.caboclinhoTestActive || this.caboclinhoTestComplete) return;

        this.caboclinhoTestActive = true;
        this.caboclinhoTrigger.body.enable = false;
        this.spawnPoint = { x: 9820, y: 610 };

        this.forestMonkeySystem?.cleanup?.();
        this.oncaEncounter?.cleanupActive?.(true);

        this.resetCaboclinhoBoss(false);
        this.caboclinhoBossHud.setVisible(true);
        this.caboclinhoArenaBarrierL.setVisible(false);
        this.caboclinhoArenaBarrierR.setVisible(false);
        // Mantém o caminho de retorno livre; somente a subida final fica bloqueada.
        this.caboclinhoArenaBarrierL.body.enable = false;
        this.caboclinhoArenaBarrierR.body.enable = true;

        const panel = this.add.rectangle(512, 355, 650, 112, 0x06100d, 0.92).setScrollFactor(0).setDepth(180);
        const text = this.add.text(512, 355, '“A mata corre mais rápido que seus passos.”', {
            fontFamily: 'Arial',
            fontSize: '23px',
            color: '#f1e1ae'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(181);

        this.scheduleCaboclinhoCall(1050, () => {
            if (panel.active) panel.destroy();
            if (text.active) text.destroy();
            if (!this.caboclinhoTestActive || this.caboclinhoTestComplete) return;
            this.caboclinhoState = 'HUNT';
            this.caboclinhoVisualState = 'IDLE';
            this.caboclinhoNextActionAt = this.time.now + 360;
        });
    }

    resetCaboclinhoBoss (restartFight = true)
    {
        this.clearCaboclinhoAttackTimers();
        this.clearCaboclinhoArrows();
        this.caboclinhoHealth = this.caboclinhoMaxHealth;
        this.updateCaboclinhoBossHud();
        this.caboclinhoActionSerial = 0;
        this.caboclinhoStrongActions = 0;
        this.caboclinhoComboCount = 0;
        this.caboclinhoDashHitRegistered = false;
        this.caboclinhoJumpsUsed = 0;
        this.caboclinhoAirDashUsed = false;
        this.caboclinhoSecondArrowQueued = false;
        this.attackHitBossRegistered = false;
        this.caboclinhoVisualDestroyed = false;

        if (this.caboclinho) {
            this.caboclinho.setPosition(10380, 610);
            this.caboclinho.body.enable = true;
            this.caboclinho.body.setVelocity(0, 0);
        }

        if (this.caboclinhoVisual) {
            this.tweens.killTweensOf(this.caboclinhoVisual);
            this.caboclinhoVisual
                .setPosition(10380, 610)
                .setVisible(true)
                .setAlpha(1)
                .setAngle(0)
                .setScale(1);
            this.caboclinhoVisualState = 'IDLE';
            this.caboclinhoFacing = 1;
            this.resetCaboclinhoVisualPose();
        }

        this.caboclinhoState = 'INTRO';
        this.caboclinhoNextActionAt = this.time.now + (restartFight ? 850 : 1050);
        if (restartFight) {
            this.scheduleCaboclinhoCall(850, () => {
                if (!this.caboclinhoTestActive || this.caboclinhoTestComplete || this.isPlayerDead) return;
                this.caboclinhoState = 'HUNT';
                this.caboclinhoNextActionAt = this.time.now + 300;
            });
        }
    }

    prepareCaboclinhoBossForPlayerDeath ()
    {
        if (!this.caboclinhoTestActive || this.caboclinhoTestComplete) return;
        this.clearCaboclinhoAttackTimers();
        this.clearCaboclinhoArrows();
        this.caboclinhoState = 'INTRO';
        this.caboclinhoVisualState = 'RECOVER';
        if (this.caboclinho?.body) this.caboclinho.body.setVelocity(0, 0);
    }

    scheduleCaboclinhoCall (delay, callback)
    {
        const timer = this.time.delayedCall(delay, () => {
            const index = this.caboclinhoAttackTimers.indexOf(timer);
            if (index >= 0) this.caboclinhoAttackTimers.splice(index, 1);
            if (this.caboclinhoState === 'DEFEATED' || this.caboclinhoTestComplete) return;
            callback();
        });
        this.caboclinhoAttackTimers.push(timer);
        return timer;
    }

    clearCaboclinhoAttackTimers ()
    {
        this.caboclinhoAttackTimers?.forEach(timer => timer?.remove?.(false));
        if (this.caboclinhoAttackTimers) this.caboclinhoAttackTimers.length = 0;
    }

    caboclinhoPhase ()
    {
        if (this.caboclinhoHealth <= 25) return 4;
        if (this.caboclinhoHealth <= 50) return 3;
        if (this.caboclinhoHealth <= 75) return 2;
        return 1;
    }

    chooseCaboclinhoAction ()
    {
        const distance = Math.abs(this.player.x - this.caboclinho.x);
        const phase = this.caboclinhoPhase();
        const serial = this.caboclinhoActionSerial++;

        if (distance < 150) {
            return serial % 3 === 2 ? 'JUMP' : 'DASH';
        }
        if (distance <= 350) {
            if (phase >= 3 && serial % 4 === 2) return 'BOW';
            return serial % 2 === 0 ? 'DASH' : 'BOW';
        }
        if (phase >= 4 && serial % 3 !== 0) return 'DASH';
        return serial % 2 === 0 ? 'BOW' : 'DASH';
    }

    beginCaboclinhoPrepare (action)
    {
        if (this.caboclinhoState === 'DEFEATED' || this.isPlayerDead) return;
        this.caboclinhoPendingAction = action;
        this.caboclinhoState = 'PREPARE';
        this.caboclinhoVisualState = 'PREPARE';
        this.caboclinho.body.setVelocityX(0);
        const duration = action === 'DASH' ? 155 : 180;
        this.caboclinhoNextActionAt = this.time.now + duration;
        this.showCaboclinhoPrepareFx(action);
    }

    showCaboclinhoPrepareFx (action)
    {
        const direction = this.player.x < this.caboclinho.x ? -1 : 1;
        for (let i = 0; i < 4; i += 1) {
            const leaf = this.add.ellipse(
                this.caboclinho.x - direction * (5 + i * 5),
                this.caboclinho.y + 24,
                8,
                4,
                i % 2 ? 0x6d7842 : 0x315f39,
                0.65
            ).setDepth(23);
            this.tweens.add({
                targets: leaf,
                x: leaf.x - direction * (18 + i * 7),
                y: leaf.y - 8 - i * 4,
                angle: direction * (35 + i * 18),
                alpha: 0,
                duration: 190 + i * 22,
                onComplete: () => leaf.destroy()
            });
        }
        if (action === 'DASH') {
            const dust = this.add.ellipse(this.caboclinho.x, this.caboclinho.y + 34, 34, 8, 0x8b7256, 0.22).setDepth(20);
            this.tweens.add({ targets: dust, scaleX: 1.5, alpha: 0, duration: 190, onComplete: () => dust.destroy() });
        }
    }

    executeCaboclinhoDash ()
    {
        if (!this.caboclinho?.body?.enable) return;
        const direction = this.player.x < this.caboclinho.x ? -1 : 1;
        const speed = this.caboclinhoPhase() >= 4 ? 520 : 490;
        this.caboclinhoFacing = direction;
        this.caboclinhoState = 'DASH';
        this.caboclinhoVisualState = 'MOVING';
        this.caboclinhoDashHitRegistered = false;
        this.caboclinhoStrongActions += 1;
        this.caboclinho.body.setVelocity(direction * speed, 0);
        this.caboclinhoDashEndsAt = this.time.now + 210;
    }

    executeCaboclinhoJump ()
    {
        if (!this.caboclinho?.body?.enable) return;
        const direction = this.player.x < this.caboclinho.x ? -1 : 1;
        this.caboclinhoFacing = direction;
        this.caboclinhoState = 'JUMP';
        this.caboclinhoVisualState = 'MOVING';
        this.caboclinhoJumpsUsed = 1;
        this.caboclinhoAirDashUsed = false;
        this.caboclinhoJumpStartedAt = this.time.now;
        this.caboclinhoStrongActions += 1;
        this.caboclinho.body.setVelocity(direction * 145, -500);

        if (this.caboclinhoPhase() >= 2) {
            this.scheduleCaboclinhoCall(300, () => {
                if (!this.caboclinho.body.enable || this.caboclinho.body.blocked.down || this.caboclinhoJumpsUsed >= 2) return;
                this.caboclinhoJumpsUsed = 2;
                this.caboclinhoState = 'DOUBLE_JUMP';
                this.caboclinho.body.setVelocityY(this.caboclinhoPhase() >= 4 ? -470 : -450);
                this.showCaboclinhoAirBurst();

                this.scheduleCaboclinhoCall(170, () => {
                    if (this.caboclinho.body.blocked.down || !this.caboclinho.body.enable) return;
                    if (this.caboclinhoActionSerial % 2 === 0 && !this.caboclinhoAirDashUsed) {
                        this.executeCaboclinhoAirDash();
                    } else if (this.caboclinhoActionSerial % 3 === 0) {
                        this.beginCaboclinhoBowAim(true);
                    }
                });
            });
        }
    }

    executeCaboclinhoAirDash ()
    {
        if (this.caboclinhoAirDashUsed || this.caboclinho.body.blocked.down) return;
        this.caboclinhoAirDashUsed = true;
        const direction = this.player.x < this.caboclinho.x ? -1 : 1;
        this.caboclinhoFacing = direction;
        this.caboclinhoState = 'AIR_DASH';
        this.caboclinhoVisualState = 'MOVING';
        this.caboclinhoDashHitRegistered = false;
        this.caboclinho.body.setVelocity(direction * 480, this.caboclinho.body.velocity.y * 0.15);
        this.caboclinhoDashEndsAt = this.time.now + 190;
    }

    showCaboclinhoAirBurst ()
    {
        for (let i = 0; i < 5; i += 1) {
            const leaf = this.add.ellipse(this.caboclinho.x, this.caboclinho.y, 8, 4, 0x547344, 0.72).setDepth(23);
            const side = i % 2 ? 1 : -1;
            this.tweens.add({
                targets: leaf,
                x: leaf.x + side * (18 + i * 6),
                y: leaf.y + 12 + i * 3,
                angle: side * 55,
                alpha: 0,
                duration: 240,
                onComplete: () => leaf.destroy()
            });
        }
    }

    beginCaboclinhoBowAim (airborne = false)
    {
        if (!this.caboclinho?.body?.enable || this.caboclinhoState === 'DEFEATED') return;
        this.caboclinhoState = 'BOW_AIM';
        this.caboclinhoVisualState = 'BOW_AIM';
        this.caboclinhoBowAirborne = airborne;
        this.caboclinho.body.setVelocityX(0);
        if (airborne) this.caboclinho.body.setVelocityY(this.caboclinho.body.velocity.y * 0.22);
        this.caboclinhoBowAimEndsAt = this.time.now + (this.caboclinhoPhase() >= 4 ? 350 : 410);
    }

    fireCaboclinhoArrow ()
    {
        if (!this.caboclinho?.body?.enable || this.caboclinhoState === 'DEFEATED') return;

        const startX = this.caboclinho.x + this.caboclinhoFacing * 28;
        const startY = this.caboclinho.y - 13;
        const lead = this.caboclinhoPhase() >= 3 ? 0.20 : 0.17;
        const targetX = this.player.x + (this.player.body?.velocity?.x || 0) * lead;
        const targetY = this.player.y - 4;
        const dx = targetX - startX;
        const dy = targetY - startY;
        const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const speed = this.caboclinhoPhase() >= 4 ? 520 : 475;
        const vx = dx / length * speed;
        const vy = dy / length * speed;
        const angle = Math.atan2(vy, vx);

        const body = this.add.rectangle(startX, startY, 28, 7, 0x000000, 0);
        this.physics.add.existing(body);
        body.body.setAllowGravity(false);
        body.body.setVelocity(vx, vy);
        body.body.setSize(28, 7);

        const visual = this.add.container(startX, startY).setDepth(24).setRotation(angle);
        visual.add([
            this.add.rectangle(0, 0, 30, 2, 0x89613a),
            this.add.triangle(17, 0, 0, -4, 8, 0, 0, 4, 0xbeb7a4),
            this.add.triangle(-16, 0, 0, 0, 8, -4, 8, 4, 0x667e47)
        ]);

        const arrow = { body, visual, hit: false, collider: null, overlap: null, timer: null };
        arrow.collider = this.physics.add.collider(body, this.platforms, () => this.destroyCaboclinhoArrow(arrow, true));
        arrow.overlap = this.physics.add.overlap(body, this.player, () => {
            if (arrow.hit || this.isPlayerDead) return;
            arrow.hit = true;
            this.damagePlayer(20, vx < 0 ? -130 : 130, -85);
            this.destroyCaboclinhoArrow(arrow, false);
        });
        arrow.timer = this.time.delayedCall(3000, () => this.destroyCaboclinhoArrow(arrow, false));
        this.caboclinhoArrows.push(arrow);

        this.caboclinhoState = 'BOW_SHOT';
        this.caboclinhoVisualState = 'BOW_SHOT';
        this.caboclinhoStrongActions += 1;

        const doubleShot = this.caboclinhoPhase() >= 3 && this.caboclinhoActionSerial % 2 === 0;
        if (doubleShot && !this.caboclinhoSecondArrowQueued) {
            this.caboclinhoSecondArrowQueued = true;
            this.scheduleCaboclinhoCall(220, () => {
                this.caboclinhoSecondArrowQueued = false;
                if (this.caboclinhoState === 'DEFEATED' || this.isPlayerDead) return;
                this.caboclinhoState = 'BOW_AIM';
                this.caboclinhoVisualState = 'BOW_AIM';
                this.fireCaboclinhoArrow();
            });
            return;
        }
        this.caboclinhoSecondArrowQueued = false;

        if (
            this.caboclinhoPhase() >= 3 &&
            this.caboclinhoComboCount < 1 &&
            this.caboclinhoStrongActions < 2 &&
            this.caboclinhoActionSerial % 3 === 0
        ) {
            this.caboclinhoComboCount = 1;
            this.scheduleCaboclinhoCall(190, () => this.beginCaboclinhoPrepare('DASH'));
        } else {
            this.enterCaboclinhoRecovery();
        }
    }

    destroyCaboclinhoArrow (arrow, impact = false)
    {
        if (!arrow || arrow.destroyed) return;
        arrow.destroyed = true;
        arrow.timer?.remove?.(false);
        const world = this.physics?.world;
        if (world && arrow.collider) world.removeCollider(arrow.collider);
        if (world && arrow.overlap) world.removeCollider(arrow.overlap);
        if (impact && arrow.body?.active) {
            this.audioManager?.playAtDistance?.('arrow_impact', arrow.body.x, { cooldown: 120, volume: 0.62, maxDistance: 760 });
            const puff = this.add.circle(arrow.body.x, arrow.body.y, 5, 0xa48d6e, 0.25).setDepth(23);
            this.tweens.add({ targets: puff, scale: 1.8, alpha: 0, duration: 150, onComplete: () => puff.destroy() });
        }
        if (arrow.body?.active) arrow.body.destroy();
        if (arrow.visual?.active) arrow.visual.destroy();
        const index = this.caboclinhoArrows.indexOf(arrow);
        if (index >= 0) this.caboclinhoArrows.splice(index, 1);
    }

    clearCaboclinhoArrows ()
    {
        [...(this.caboclinhoArrows || [])].forEach(arrow => this.destroyCaboclinhoArrow(arrow, false));
        if (this.caboclinhoArrows) this.caboclinhoArrows.length = 0;
    }

    enterCaboclinhoRecovery ()
    {
        if (this.caboclinhoState === 'DEFEATED') return;
        this.caboclinhoState = 'RECOVERY';
        this.caboclinhoVisualState = 'RECOVER';
        this.caboclinho.body.setVelocityX(0);
        const duration = this.caboclinhoPhase() >= 4 ? 150 : 190;
        this.caboclinhoNextActionAt = this.time.now + duration;
    }

    enterCaboclinhoVulnerable ()
    {
        if (this.caboclinhoState === 'DEFEATED') return;
        this.caboclinhoState = 'VULNERABLE';
        this.caboclinhoVisualState = 'RECOVER';
        this.caboclinho.body.setVelocityX(0);
        const duration = this.caboclinhoHealth <= 25 ? 650 : this.caboclinhoHealth <= 50 ? 720 : 800;
        this.caboclinhoNextActionAt = this.time.now + duration;
        this.caboclinhoStrongActions = 0;
        this.caboclinhoComboCount = 0;
    }

    handleCaboclinhoContact ()
    {
        if (
            !this.caboclinhoTestActive ||
            this.caboclinhoTestComplete ||
            this.isPlayerDead ||
            this.caboclinhoDashHitRegistered ||
            (this.caboclinhoState !== 'DASH' && this.caboclinhoState !== 'AIR_DASH')
        ) return;

        this.caboclinhoDashHitRegistered = true;
        const direction = this.player.x < this.caboclinho.x ? -1 : 1;
        this.damagePlayer(20, direction * 190, -110);
    }

    tryHitCaboclinho ()
    {
        if (
            !this.caboclinhoTestActive ||
            this.caboclinhoTestComplete ||
            !this.isAttacking ||
            !this.attackHitbox.body.enable ||
            this.attackHitBossRegistered ||
            !this.caboclinho?.body?.enable
        ) return;

        // O facão deve registrar dano quando realmente toca o corpo do boss.
        // Mantemos invulnerabilidade apenas nos estados em que ele está entrando
        // na luta, em recoil ou executando um dash rápido.
        const blockedState =
            this.caboclinhoState === 'INTRO' ||
            this.caboclinhoState === 'HIT' ||
            this.caboclinhoState === 'DASH' ||
            this.caboclinhoState === 'AIR_DASH' ||
            this.caboclinhoState === 'DEFEATED';

        this.attackHitBossRegistered = true;
        if (blockedState) {
            this.showBlockDeflect(this.caboclinho.x, this.caboclinho.y - 12, true);
            return;
        }

        this.damageCaboclinho(25);
    }

    damageCaboclinho (amount)
    {
        if (this.caboclinhoState === 'DEFEATED' || this.caboclinhoTestComplete) return;

        this.clearCaboclinhoAttackTimers();
        this.caboclinhoHealth = Math.max(0, this.caboclinhoHealth - amount);
        this.updateCaboclinhoBossHud();
        this.caboclinhoState = 'HIT';
        this.caboclinhoVisualState = 'RECOIL';
        this.caboclinho.body.setVelocity(this.attackDirection * 125, -90);
        this.showCombatImpact(this.caboclinho.x, this.caboclinho.y - 8, null, { boss: true });

        for (let i = 0; i < 5; i += 1) {
            const leaf = this.add.ellipse(this.caboclinho.x, this.caboclinho.y - 8, 9, 4, i % 2 ? 0x6d7842 : 0x315f39, 0.72).setDepth(25);
            this.tweens.add({
                targets: leaf,
                x: leaf.x + (i - 2) * 18,
                y: leaf.y - 12 - i * 5,
                angle: (i - 2) * 50,
                alpha: 0,
                duration: 260,
                onComplete: () => leaf.destroy()
            });
        }

        if (this.caboclinhoHealth <= 0) {
            this.defeatCaboclinho();
            return;
        }

        this.scheduleCaboclinhoCall(170, () => this.enterCaboclinhoVulnerable());
    }

    defeatCaboclinho ()
    {
        if (this.caboclinhoState === 'DEFEATED') return;

        this.caboclinhoState = 'DEFEATED';
        this.caboclinhoVisualState = 'DEFEATED';
        this.caboclinhoTestComplete = true;
        this.clearCaboclinhoAttackTimers();
        this.clearCaboclinhoArrows();

        if (this.caboclinho?.body) {
            this.caboclinho.body.setVelocity(0, 0);
            this.caboclinho.body.enable = false;
        }

        this.caboclinhoArenaBarrierL.body.enable = false;
        this.caboclinhoArenaBarrierR.body.enable = false;
        this.caboclinhoArenaBarrierL.setVisible(false);
        this.caboclinhoArenaBarrierR.setVisible(false);
        this.caboclinhoBossHud.setVisible(false);

        this.defeatCaboclinhoVisual();

        this.time.delayedCall(620, () => this.completeCaboclinhoTrial());
    }

    completeCaboclinhoTrial ()
    {
        const panel = this.add.rectangle(512, 350, 650, 190, 0x06100d, 0.92).setScrollFactor(0).setDepth(190);
        const line = this.add.text(512, 318, '“O Caboquim reconhece seus passos.”', {
            fontFamily: 'Arial',
            fontSize: '22px',
            color: '#c8d8cc'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(191);

        this.time.delayedCall(850, () => {
            const skill = this.add.text(512, 385, 'HABILIDADE DESBLOQUEADA\nDASH', {
                fontFamily: 'Arial Black',
                fontSize: '30px',
                color: '#f1e1ae',
                align: 'center'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(191);

            this.showDashUnlockEffect();

            this.time.delayedCall(1150, () => {
                this.dashUnlocked = true;
                this.registry.set('dashUnlocked', true);
if (panel.active) panel.destroy();
                if (line.active) line.destroy();
                if (skill.active) skill.destroy();
                this.showDashTutorial();
            });
        });
    }

    updateCaboclinhoBoss (time)
    {
        if (!this.caboclinhoTestActive || this.caboclinhoState === 'DORMANT') return;
        if (this.caboclinhoState === 'DEFEATED') {
            this.updateCaboclinhoArrows();
            return;
        }
        if (!this.caboclinho?.body?.enable || this.isPlayerDead) {
            if (this.caboclinho?.body) this.caboclinho.body.setVelocity(0, 0);
            return;
        }

        this.caboclinho.x = Math.max(this.caboclinhoArenaMinX + 35, Math.min(this.caboclinhoArenaMaxX - 35, this.caboclinho.x));
        if (this.caboclinhoVisual?.active) {
            this.caboclinhoVisual.setPosition(this.caboclinho.x, this.caboclinho.y);
        }
        this.updateCaboclinhoArrows();

        const dx = this.player.x - this.caboclinho.x;
        const distance = Math.abs(dx);
        if (Math.abs(dx) > 8) this.caboclinhoFacing = dx < 0 ? -1 : 1;

        if (this.caboclinhoState === 'INTRO' || this.caboclinhoState === 'HIT') return;

        if (this.caboclinhoState === 'PREPARE') {
            if (time < this.caboclinhoNextActionAt) return;
            if (this.caboclinhoPendingAction === 'DASH') this.executeCaboclinhoDash();
            else this.executeCaboclinhoJump();
            return;
        }

        if (this.caboclinhoState === 'DASH' || this.caboclinhoState === 'AIR_DASH') {
            if (time >= this.caboclinhoDashEndsAt) {
                this.caboclinho.body.setVelocityX(0);
                this.enterCaboclinhoRecovery();
            }
            return;
        }

        if (this.caboclinhoState === 'BOW_AIM') {
            this.caboclinho.body.setVelocityX(0);
            if (time >= this.caboclinhoBowAimEndsAt) this.fireCaboclinhoArrow();
            return;
        }

        if (this.caboclinhoState === 'BOW_SHOT') return;

        if (this.caboclinhoState === 'JUMP' || this.caboclinhoState === 'DOUBLE_JUMP') {
            if (
                this.caboclinho.body.blocked.down &&
                time - this.caboclinhoJumpStartedAt > 180
            ) {
                this.caboclinhoAirDashUsed = false;
                this.enterCaboclinhoRecovery();
            }
            return;
        }

        if (this.caboclinhoState === 'RECOVERY') {
            if (time >= this.caboclinhoNextActionAt) {
                if (this.caboclinhoStrongActions >= 2) this.enterCaboclinhoVulnerable();
                else {
                    this.caboclinhoState = 'HUNT';
                    this.caboclinhoVisualState = 'IDLE';
                    this.caboclinhoNextActionAt = time + (this.caboclinhoPhase() >= 4 ? 170 : 260);
                }
            }
            return;
        }

        if (this.caboclinhoState === 'VULNERABLE') {
            if (time >= this.caboclinhoNextActionAt) {
                this.caboclinhoState = 'HUNT';
                this.caboclinhoVisualState = 'IDLE';
                this.caboclinhoNextActionAt = time + 180;
            }
            return;
        }

        if (this.caboclinhoState !== 'HUNT') return;

        const phase = this.caboclinhoPhase();
        const huntSpeed = phase >= 4 ? 230 : phase >= 3 ? 220 : 205;
        if (distance > 250) this.caboclinho.body.setVelocityX((dx < 0 ? -1 : 1) * huntSpeed);
        else if (distance < 105) this.caboclinho.body.setVelocityX((dx < 0 ? 1 : -1) * 175);
        else this.caboclinho.body.setVelocityX(0);

        this.caboclinhoVisualState = Math.abs(this.caboclinho.body.velocity.x) > 20 ? 'MOVING' : 'IDLE';

        if (time >= this.caboclinhoNextActionAt) {
            const action = this.chooseCaboclinhoAction();
            if (action === 'BOW') this.beginCaboclinhoBowAim(false);
            else this.beginCaboclinhoPrepare(action);
        }
    }

    updateCaboclinhoArrows ()
    {
        const minX = this.caboclinhoArenaMinX - 120;
        const maxX = this.caboclinhoArenaMaxX + 120;
        [...(this.caboclinhoArrows || [])].forEach(arrow => {
            if (!arrow.body?.active) {
                this.destroyCaboclinhoArrow(arrow, false);
                return;
            }
            arrow.visual?.setPosition(arrow.body.x, arrow.body.y);
            if (
                arrow.body.x < minX ||
                arrow.body.x > maxX ||
                arrow.body.y < -80 ||
                arrow.body.y > 820
            ) {
                this.destroyCaboclinhoArrow(arrow, false);
            }
        });
    }

    cleanupCaboclinhoBoss ()
    {
        this.clearCaboclinhoAttackTimers();
        this.clearCaboclinhoArrows();
        const world = this.physics?.world;
        [
            'caboclinhoAttackOverlap',
            'caboclinhoPlayerOverlap',
            'caboclinhoPlatformCollider',
            'caboclinhoBarrierPlayerL',
            'caboclinhoBarrierPlayerR',
            'caboclinhoBarrierBossL',
            'caboclinhoBarrierBossR'
        ].forEach(key => {
            if (world && this[key]) world.removeCollider(this[key]);
            this[key] = null;
        });
    }

    defeatCaboclinhoVisual ()
    {
        const c = this.caboclinhoVisual;
        if (!c || !c.active || this.caboclinhoVisualDestroyed) return;

        this.caboclinhoVisualState = 'DEFEATED';
        this.tweens.killTweensOf(c);

        for (let i = 0; i < 7; i += 1) {
            const leaf = this.add.ellipse(
                c.x,
                c.y - 12,
                9 + (i % 3) * 2,
                4 + (i % 2),
                i % 2 ? 0x6d7842 : 0x315f39,
                0.72
            ).setDepth(23);
            this.tweens.add({
                targets: leaf,
                x: c.x + (i - 3) * 18,
                y: c.y - 36 - (i % 3) * 12,
                angle: (i - 3) * 42,
                alpha: 0,
                duration: 420 + i * 30,
                onComplete: () => leaf.destroy()
            });
        }

        this.tweens.add({
            targets: c,
            y: c.y - 18,
            scaleX: 0.86,
            scaleY: 0.92,
            angle: this.caboclinhoFacing * -8,
            alpha: 0,
            duration: 520,
            ease: 'Sine.In',
            onComplete: () => {
                if (c.active) c.destroy();
                if (this.caboclinhoVisual === c) this.caboclinhoVisual = null;
                this.caboclinhoVisualDestroyed = true;
            }
        });
    }

    showDashUnlockEffect ()
    {
        const px = this.player.x;
        const py = this.player.y;
        const direction = this.playerVisual.facing || 1;
        const ring = this.add.circle(px, py, 20, 0xd6b56c, 0.22).setDepth(40);
        const glow = this.add.ellipse(px, py, 52, 82, 0xf1e1ae, 0.12).setDepth(39);

        this.tweens.add({ targets: ring, scale: 4.2, alpha: 0, duration: 720, onComplete: () => ring.destroy() });
        this.tweens.add({ targets: glow, scaleX: 1.7, alpha: 0, duration: 620, onComplete: () => glow.destroy() });

        for (let i = 0; i < 4; i += 1) {
            const streak = this.add.rectangle(px - direction * (16 + i * 18), py - 24 + i * 14, 28 + i * 8, 3, 0xe2e9d7, 0.4).setDepth(40);
            this.tweens.add({
                targets: streak,
                x: streak.x - direction * (65 + i * 8),
                alpha: 0,
                duration: 320 + i * 35,
                onComplete: () => streak.destroy()
            });
        }

        for (let i = 0; i < 9; i += 1) {
            const angle = (Math.PI * 2 * i) / 9;
            const leaf = this.add.ellipse(px, py, 10, 5, i % 2 ? 0x759657 : 0x4f7c49, 0.82).setDepth(41);
            this.tweens.add({
                targets: leaf,
                x: px + Math.cos(angle) * 64,
                y: py + Math.sin(angle) * 48,
                angle: i * 48,
                alpha: 0,
                duration: 680,
                onComplete: () => leaf.destroy()
            });
        }
    }

    showDashTutorial ()
    {
        const t = this.add.text(512, 220, 'DASH\nPressione SHIFT para avançar rapidamente.\nNo ar, o dash recarrega ao tocar o chão.', {
            fontFamily: 'Arial Black', fontSize: '19px', color: '#f1e1ae', align: 'center',
            backgroundColor: '#06100dcc', padding: { x: 18, y: 12 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(180);
        this.time.delayedCall(3600, () => t.destroy());
    }

    tryDash ()
    {
        if (!this.dashUnlocked || this.phaseCompleted || this.isPlayerDead || this.isDashing || this.time.now < this.nextDashAt) return;

        const grounded = this.player.body.blocked.down || this.player.body.touching.down;
        if (!grounded && this.airDashUsed) {
            this.showDashUnavailableFeedback();
            return;
        }
        if (this.stamina < this.dashStaminaCost) {
            this.showStaminaBlockedFeedback();
            return;
        }

        const left = this.cursors.left.isDown || this.keyA.isDown || this.mobileInput?.left === true;
        const right = this.cursors.right.isDown || this.keyD.isDown || this.mobileInput?.right === true;
        const direction = left && !right ? -1 : right && !left ? 1 : (this.playerVisual.facing || 1);

        this.spendStamina(this.dashStaminaCost);
        this.isDashing = true;
        this.dashLandingVisual = false;
        this.dashDirection = direction;
        this.dashEndsAt = this.time.now + this.dashDuration;
        this.nextDashAt = this.time.now + this.dashCooldown;
        if (!grounded) this.airDashUsed = true;

        this.player.body.setVelocityX(direction * this.dashSpeed);
        this.player.body.setVelocityY(this.player.body.velocity.y * 0.45);
        this.setMotionSquash(1.09, 0.92, 125);
        this.showDashFeedback(direction);
    }

    showDashFeedback (direction)
    {
        const ghost = this.add.container(this.player.x - direction * 8, this.player.y).setDepth(17).setAlpha(0.22);
        ghost.add([
            this.add.rectangle(0, -4, 25, 38, 0xc7aa73, 0.55),
            this.add.circle(0, -31, 9, 0xb98155, 0.55),
            this.add.rectangle(direction * 11, 4, 7, 34, 0xb8c0ba, 0.45).setAngle(direction * -18)
        ]);
        this.tweens.add({
            targets: ghost,
            x: ghost.x - direction * 34,
            alpha: 0,
            duration: 210,
            onComplete: () => ghost.destroy()
        });

        for (let i = 0; i < 4; i += 1) {
            const line = this.add.rectangle(this.player.x - direction * (18 + i * 12), this.player.y - 18 + i * 10, 22 + i * 4, 3, 0xd6e1cf, 0.4).setDepth(18);
            this.tweens.add({
                targets: line,
                x: line.x - direction * 48,
                alpha: 0,
                duration: 210 + i * 22,
                onComplete: () => line.destroy()
            });
        }

        for (let i = 0; i < 3; i += 1) {
            const leaf = this.add.ellipse(this.player.x - direction * 8, this.player.y + 10 + i * 6, 9, 4, 0x668d4d, 0.75).setDepth(19);
            this.tweens.add({
                targets: leaf,
                x: leaf.x - direction * (40 + i * 10),
                y: leaf.y - 12 - i * 4,
                angle: direction * 70,
                alpha: 0,
                duration: 290,
                onComplete: () => leaf.destroy()
            });
        }
    }

    showDashUnavailableFeedback ()
    {
        if (this.time.now < this.nextDashDeniedFeedbackAt) return;
        this.nextDashDeniedFeedbackAt = this.time.now + 240;
        const pulse = this.add.circle(this.player.x, this.player.y, 11, 0xc8d8ce, 0.08).setDepth(18);
        this.tweens.add({ targets: pulse, scale: 1.7, alpha: 0, duration: 160, onComplete: () => pulse.destroy() });
    }

    showAirDashRechargeFeedback ()
    {
        const ring = this.add.circle(this.player.x, this.player.y + 24, 10, 0x9fc98a, 0.22).setDepth(18);
        this.tweens.add({ targets: ring, scale: 2.1, alpha: 0, duration: 220, onComplete: () => ring.destroy() });
        for (let i = 0; i < 2; i += 1) {
            const leaf = this.add.ellipse(this.player.x + (i ? 9 : -9), this.player.y + 20, 7, 3, 0x6f9558, 0.55).setDepth(19);
            this.tweens.add({ targets: leaf, y: leaf.y - 14, alpha: 0, angle: i ? 45 : -45, duration: 240, onComplete: () => leaf.destroy() });
        }
    }

    updateDash (time, grounded)
    {
        if (grounded && !this.wasGrounded) {
            if (this.airDashUsed) {
                this.airDashUsed = false;
                this.showAirDashRechargeFeedback();
            }
            if (this.isDashing) {
                this.dashLandingVisual = true;
                this.playerVisual.parts.macheteGripAngle = 18;
            }
        }

        if (this.isDashing && time >= this.dashEndsAt) {
            this.isDashing = false;
            this.dashLandingVisual = false;
            this.playerVisual.parts.macheteGripAngle = 18;
        }
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
        if (this.isDashing && !grounded) return false;
        if (this.isDashing && grounded) {
            this.isDashing = false;
            this.dashLandingVisual = false;
            this.playerVisual.parts.macheteGripAngle = 18;
        }

        if (this.jumpsUsed === 0 && (grounded || this.time.now <= this.coyoteUntil)) {
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
            this.showDoubleJumpBurst(false);
            this.setMotionSquash(1.045, 0.955, 95);
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
        this.stamina = Math.max(0, this.stamina - amount);
        this.staminaRegenBlockedUntil = this.time.now + this.staminaRegenDelay;
        this.updateStaminaHud();
    }

    updateStamina (time, grounded)
    {
        const delta = Math.min(0.05, Math.max(0, (time - this.lastStaminaUpdateAt) / 1000));
        this.lastStaminaUpdateAt = time;
        if (this.phaseCompleted || this.isPlayerDead || time < this.staminaRegenBlockedUntil || this.stamina >= this.maxStamina) return;
        const rate = grounded ? this.staminaGroundRegen : this.staminaAirRegen;
        this.stamina = Math.min(this.maxStamina, this.stamina + rate * delta);
        this.updateStaminaHud();
    }

    showStaminaBlockedFeedback ()
    {
        if (!this.staminaHud || this.time.now < this.nextStaminaFeedbackAt) return;
        this.nextStaminaFeedbackAt = this.time.now + 220;
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
        this.finalZone=this.add.rectangle(11645,205,55,175,0x000000,0);this.physics.add.existing(this.finalZone);this.finalZone.body.setAllowGravity(false);this.finalZone.body.setImmovable(true);this.physics.add.overlap(this.player,this.finalZone,()=>this.completeLevel3());
    }

    completeLevel3 ()
    {
        if(this.phaseCompleted||!this.dashUnlocked)return;this.phaseCompleted=true;this.player.body.setVelocity(0,0);this.isAttacking=false;this.isDashing=false;this.attackHitbox.body.enable=false;this.add.rectangle(512,384,1024,768,0x020705,.94).setScrollFactor(0).setDepth(300);this.add.text(512,205,'FASE 3 CONCLUÍDA',{fontFamily:'Arial Black',fontSize:'43px',color:'#f1e1ae'}).setOrigin(.5).setScrollFactor(0).setDepth(301);this.add.text(512,285,'DASH ADQUIRIDO',{fontFamily:'Arial Black',fontSize:'27px',color:'#d6b56c'}).setOrigin(.5).setScrollFactor(0).setDepth(301);this.add.text(512,365,'Agora seus passos alcançam onde a mata se abre.\n\n“Nem todo rastro que atravessa a mata pertence\na quem nasceu nela.”',{fontFamily:'Arial',fontSize:'21px',color:'#c8d8cc',align:'center'}).setOrigin(.5).setScrollFactor(0).setDepth(301);const b=this.add.rectangle(512,545,280,64,0x8b5a2b).setStrokeStyle(3,0xd6b56c).setScrollFactor(0).setDepth(301).setInteractive({useHandCursor:true});this.add.text(512,545,'CONTINUAR',{fontFamily:'Arial Black',fontSize:'23px',color:'#fff'}).setOrigin(.5).setScrollFactor(0).setDepth(302);b.on('pointerdown',()=>{this.cleanupSceneHazardsBeforeTransition();this.scene.start('Level4Scene');});
    }

    createEnvironmentalChallenges ()
    {
        this.environmentTimers = [];
        this.environmentTransient = [];
        this.environmentPlatforms = [];
        this.environmentReactionSensors = [];
        this.environmentBranchVisual = null;
        this.environmentBranchTriggered = false;

        this.addEnvironmentalPlatform(1320, 525, 120, 20, 570, 'log', false);
        this.addEnvironmentalPlatform(2690, 565, 118, 18, 610, 'root', false);
        this.addEnvironmentalPlatform(3260, 430, 130, 20, 540, 'log', true);

        this.environmentBranchSensor = this.add.rectangle(1840, 455, 175, 260, 0x000000, 0);
        this.physics.add.existing(this.environmentBranchSensor);
        this.environmentBranchSensor.body.setAllowGravity(false);
        this.environmentBranchSensor.body.setImmovable(true);
        this.physics.add.overlap(this.player, this.environmentBranchSensor, () => this.triggerEnvironmentalBranch());

        [
            { x: 1050, type: 0 },
            { x: 2460, type: 1 },
            { x: 3150, type: 2 }
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

    addEnvironmentalPlatform (x, y, w, h, delay, kind, requiresDash)
    {
        const body = this.add.rectangle(x, y, w, h, 0x000000, 0);
        this.physics.add.existing(body, true);
        this.platforms.add(body);

        const visual = this.add.container(x, y).setDepth(8);
        const main = this.add.rectangle(0, 0, w, h, kind === 'root' ? 0x4b3422 : 0x4a321f)
            .setStrokeStyle(2, kind === 'root' ? 0x68472d : 0x765238, 0.78);
        const moss = this.add.rectangle(0, -h / 2 + 2, w - 14, 5, 0x315d34, 0.82);
        visual.add([main, moss]);

        const sensor = this.add.rectangle(x, y - 18, w - 8, 46, 0x000000, 0);
        this.physics.add.existing(sensor);
        sensor.body.setAllowGravity(false);
        sensor.body.setImmovable(true);

        const item = { x, y, w, h, delay, kind, requiresDash, body, visual, sensor, triggered: false };
        this.environmentPlatforms.push(item);
        this.physics.add.overlap(this.player, sensor, () => this.triggerEnvironmentalPlatform(item));
    }

    triggerEnvironmentalPlatform (item)
    {
        if (item.triggered || this.phaseCompleted) return;
        if (item.requiresDash && !this.dashUnlocked) return;

        item.triggered = true;
        item.sensor.body.enable = false;

        for (let i = 0; i < 5; i += 1)
        {
            const particle = this.trackEnvironmentObject(
                this.add.ellipse(item.x - 38 + i * 19, item.y + 4, 7, 3, item.kind === 'root' ? 0x76573a : (i % 2 ? 0x587247 : 0x6b563b), 0.66).setDepth(9)
            );
            this.tweens.add({ targets: particle, x: particle.x + (i % 2 ? 10 : -9), y: particle.y + 18, angle: i * 35, alpha: 0, duration: 340 + i * 25, onComplete: () => particle.destroy() });
        }

        this.tweens.add({ targets: item.visual, x: item.x + 4, y: item.y + 2, angle: item.kind === 'root' ? -2 : 2, duration: 55, yoyo: true, repeat: 4 });

        this.scheduleEnvironment(item.delay, () => {
            if (!item.triggered) return;
            item.body.body.enable = false;
            this.tweens.add({
                targets: item.visual,
                y: item.y + (item.requiresDash ? 165 : 115),
                angle: item.requiresDash ? 10 : (item.kind === 'root' ? -7 : 8),
                alpha: 0.14,
                duration: item.requiresDash ? 640 : 570,
                ease: 'Quad.In'
            });
        });
    }

    triggerEnvironmentalBranch ()
    {
        if (this.environmentBranchTriggered || this.phaseCompleted) return;
        this.environmentBranchTriggered = true;
        this.environmentBranchSensor.body.enable = false;

        const warningLeaves = [];
        for (let i = 0; i < 5; i += 1)
        {
            const leaf = this.trackEnvironmentObject(
                this.add.ellipse(1900 + i * 11, 315 + (i % 2) * 10, 10, 5, i % 2 ? 0x517544 : 0x68844f, 0.74).setDepth(16)
            );
            warningLeaves.push(leaf);
            this.tweens.add({ targets: leaf, x: leaf.x + (i % 2 ? 10 : -9), angle: i * 30, duration: 90, yoyo: true, repeat: 3 });
        }

        this.scheduleEnvironment(460, () => {
            warningLeaves.forEach((leaf) => {
                if (!leaf.active) return;
                this.tweens.add({ targets: leaf, y: leaf.y + 40, alpha: 0, duration: 220, onComplete: () => leaf.destroy() });
            });
            const branch = this.add.rectangle(1925, 340, 205, 20, 0x49311f, 0.97).setAngle(-62).setDepth(14);
            this.environmentBranchVisual = branch;
            this.tweens.add({
                targets: branch,
                y: 595,
                angle: 5,
                duration: 500,
                ease: 'Quad.In',
                onComplete: () => {
                    this.cameras.main.shake(70, 0.001);
                    this.scheduleEnvironment(900, () => {
                        if (this.environmentBranchVisual === branch) this.environmentBranchVisual = null;
                        branch.destroy();
                    });
                }
            });
        });
    }

    addEnvironmentalReactionSensor (x, type)
    {
        const sensor = this.add.rectangle(x, 495, 145, 260, 0x000000, 0);
        this.physics.add.existing(sensor);
        sensor.body.setAllowGravity(false);
        sensor.body.setImmovable(true);
        const item = { sensor, x, type, triggered: false };
        this.environmentReactionSensors.push(item);
        this.physics.add.overlap(this.player, sensor, () => this.triggerEnvironmentalReaction(item));
    }

    triggerEnvironmentalReaction (item)
    {
        if (item.triggered || this.phaseCompleted) return;
        item.triggered = true;
        item.sensor.body.enable = false;

        const count = item.type === 2 ? 6 : 4;
        for (let i = 0; i < count; i += 1)
        {
            const leaf = this.trackEnvironmentObject(
                this.add.ellipse(item.x - 32 + i * 13, 585 - (i % 3) * 8, 9, 4, i % 2 ? 0x537a45 : 0x6d8a52, 0.65).setDepth(18)
            );
            this.tweens.add({ targets: leaf, x: leaf.x + 34 + i * 4, y: leaf.y - 32 - (i % 3) * 10, angle: 60 + i * 25, alpha: 0, duration: 450 + i * 35, onComplete: () => leaf.destroy() });
        }

        if (item.type === 1)
        {
            for (let i = 0; i < 2; i += 1)
            {
                const bird = this.trackEnvironmentObject(
                    this.add.triangle(item.x + i * 20, 390 - i * 16, -7, 3, 0, -3, 7, 3, 0x14251b, 0.8).setDepth(17)
                );
                this.tweens.add({ targets: bird, x: bird.x + 100 + i * 20, y: bird.y - 75 - i * 18, alpha: 0, duration: 650 + i * 80, onComplete: () => bird.destroy() });
            }
        }
        else if (item.type === 2)
        {
            const fog = this.trackEnvironmentObject(this.add.ellipse(item.x, 600, 200, 42, 0xd2ddd5, 0.05).setDepth(3));
            this.tweens.add({ targets: fog, x: fog.x + 95, scaleX: 1.4, alpha: 0, duration: 820, onComplete: () => fog.destroy() });
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

        if (this.environmentBranchVisual)
        {
            this.tweens.killTweensOf(this.environmentBranchVisual);
            this.environmentBranchVisual.destroy();
            this.environmentBranchVisual = null;
        }
        this.environmentBranchTriggered = false;
        if (this.environmentBranchSensor) this.environmentBranchSensor.body.enable = true;

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
        this.porongaLightPhase=3;

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
        this.livingAtmosphereProfile={"phase":3,"worldWidth":3800,"farScroll":0.055,"farAlpha":0.46,"farColor":2442543,"farStep":285,"farHeight":180,"farHeightStep":28,"farTrunk":17,"farCrown":58,"lowCanopy":true,"lowCanopyColor":533272,"fogColor":14014397,"fogBackAlpha":0.038,"fogMidAlpha":0.032,"fogFrontAlpha":0.017,"rayColor":15780222,"rays":[{"x":720,"y":105,"w":110,"h":500,"alpha":0.058,"angle":-16,"scroll":0.48},{"x":1900,"y":120,"w":135,"h":480,"alpha":0.065,"angle":11,"scroll":0.52},{"x":3000,"y":110,"w":115,"h":510,"alpha":0.054,"angle":-7,"scroll":0.57}],"swayColor":1856049,"sway":[{"x":980,"y":595,"w":90,"h":22,"alpha":0.24},{"x":2180,"y":585,"w":100,"h":24,"alpha":0.22},{"x":3220,"y":575,"w":105,"h":23,"alpha":0.23}],"vignetteAlpha":0,"toneColor":11633749,"leafDelay":2800,"moteDelay":2700,"birdDelay":15000,"shadowDelay":22000,"maxLeaves":8,"maxMotes":10,"maxBirds":2,"initialMotes":6,"verticalLeaves":true,"largeLeaves":false,"leafColorA":7902298,"leafColorB":6259277,"leafAlpha":0.48,"leafDepth":15,"moteColor":15981992,"moteAlpha":0.24,"moteDepth":10,"dustMotes":false,"birdColor":1517597,"birdAlpha":0.58,"shadows":false,"shadowW":90,"shadowH":25,"shadowColor":1055765,"shadowAlpha":0.06,"region1":1300,"region2":2650};
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
            this.createOrganicFogMass(width*.28,500,width*.72,155,p.fogColor,p.fogBackAlpha,-20,.16,15)
        );
        this.livingFogMid=this.trackLivingPermanent(
            this.createOrganicFogMass(width*.58,555,width*.72,130,p.fogColor,p.fogMidAlpha,-15,.36,21)
        );
        this.livingFogFront=this.trackLivingPermanent(
            this.createOrganicFogMass(width*.42,610,740,80,p.fogColor,p.fogFrontAlpha,3,.72,31)
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
        this.createQuickMenuButton();
    }

    cleanupSceneHazardsBeforeTransition ()
    {
        this.forestMonkeySystem?.cleanup?.();
        this.oncaEncounter?.destroy?.();
        this.horizontalExpansion?.cleanup?.();
        this.weatherSystem?.cleanup?.();
        this.audioManager?.cleanupScene(this);
        this.cleanupCaboclinhoBoss?.();
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
        const intro = this.add.container(512, 286).setScrollFactor(0).setDepth(170);
        const panel = this.add.rectangle(0, 0, 430, 132, 0x06100d, 0.76)
            .setStrokeStyle(1, 0x78917c, 0.32);
        const phaseText = this.add.text(0, -38, 'FASE 3', {
            fontFamily: 'Arial Black',
            fontSize: '15px',
            color: '#d6b56c'
        }).setOrigin(0.5);
        const titleText = this.add.text(0, -8, 'AS RAÍZES DO ALTO', {
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
            delay: 1900,
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
        this.bossHintSign?.update?.(this.player);
        this.syncPlayerVisual();this.animatePlayerVisual(time);this.updatePorongaLight();this.updateAttack(time);this.updateMacheteVisual(time);this.updateAttackSprite(time);this.updateSnake(time);this.updateCarapana(time);this.updateFruits(time);this.updateHunger(time);this.updateLivingAtmosphere();this.weatherSystem?.update(time);this.updateCaboclinhoBoss(time);this.animateCaboclinhoVisual(time);this.oncaEncounter?.update(time);this.forestMonkeySystem?.update(time);

        this.audioManager?.updateScene(this, { grounded, time });
        this.horizontalExpansion?.update(this.time.now);
}

    createStaminaHud ()
    {
        this.staminaHud = this.add.container(390, 18)
            .setScrollFactor(0)
            .setDepth(102);

        const background = this.add.rectangle(0, 0, 178, 26, 0x06100d, 0.64).setOrigin(0);
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

    updateStaminaHud ()
    {
        if (!this.staminaBar || !this.staminaText) return;
        const ratio = Math.max(0, Math.min(1, this.stamina / this.maxStamina));
        this.staminaBar.width = 72 * ratio;
        this.staminaText.setText(Math.round(this.stamina) + '/' + this.maxStamina);
    }

    createHealthHud ()
    {
        this.healthHud = this.add.container(18, 18)
            .setScrollFactor(0)
            .setDepth(102);

        const background = this.add.rectangle(0, 0, 178, 26, 0x06100d, 0.64).setOrigin(0);
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

        const background = this.add.rectangle(0, 0, 178, 26, 0x06100d, 0.64).setOrigin(0);
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

    updateHealthHud ()
    {
        const ratio = Math.max(0, this.health / this.maxHealth);

        this.healthBar.width = 72 * ratio;
        this.healthText.setText(`${this.health}/${this.maxHealth}`);
    }

    updateHungerHud ()
    {
        const ratio = Math.max(0, this.hunger / this.maxHunger);

        this.hungerBar.width = 72 * ratio;
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