import { Scene } from 'phaser';

export class Level5Scene extends Scene
{
    constructor () { super('Level5Scene'); }

    create ()
    {
        this.worldWidth = 4000;
        this.physics.world.setBounds(0, 0, this.worldWidth, 768);
        this.cameras.main.setBounds(0, 0, this.worldWidth, 768);
        this.cameras.main.setBackgroundColor('#040907');

        this.createTerritory();
        this.createPlatforms();

        this.player = this.add.rectangle(150, 530, 45, 70, 0x000000, 0);
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);
        this.player.body.setMaxVelocity(260, 900);
        this.player.body.setSize(45, 70);
        this.physics.add.collider(this.player, this.platforms);

        this.playerVisual = this.createPlayerVisual();
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
        this.dashDuration = 190;
        this.dashCooldown = 380;

        this.isAttacking = false;
        this.attackStartedAt = 0;
        this.nextAttackAt = 0;
        this.attackDirection = 1;
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
        this.bossCheckpoint = { x: 2960, y: 535 };

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

        this.keyJ.on('down', () => this.startAttack());
        this.keyX.on('down', () => this.startAttack());
        this.keyShift.on('down', () => this.tryDash());

        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setDeadzone(220, 160);

        this.createHud();
        this.createHealthHud();
        this.createHungerHud();
        this.createStaminaHud();
        this.createBossHud();
        this.showLevelTitle();

        this.spawnPoint = { x: 150, y: 530 };
    }

    createTerritory ()
    {
        const sky = this.add.graphics().setDepth(-60).setScrollFactor(0);
        sky.fillStyle(0x020806, 1);
        sky.fillRect(0, 0, 1024, 768);
        sky.fillStyle(0x07130f, 0.86);
        sky.fillRect(0, 180, 1024, 410);
        sky.fillStyle(0x101711, 0.34);
        sky.fillRect(0, 520, 1024, 248);

        this.add.circle(850, 115, 70, 0xbac7bb, 0.025).setDepth(-59).setScrollFactor(0.025);
        this.add.circle(850, 115, 34, 0xc8d0c7, 0.14).setDepth(-58).setScrollFactor(0.025);

        const distant = this.add.graphics().setDepth(-48).setScrollFactor(0.12);
        distant.fillStyle(0x05120d, 1);
        distant.fillRect(-300, 470, this.worldWidth + 700, 320);
        for (let x = 0, i = 0; x < this.worldWidth; x += 250, i += 1) {
            const w = 58 + (i % 4) * 13;
            const h = 360 + (i % 3) * 70;
            const y = 655 - h;
            distant.fillStyle(i % 2 ? 0x0a1c14 : 0x0d2118, 0.96);
            distant.fillRect(x, y, w, h);
            distant.fillStyle(0x0a2519, 0.95);
            distant.fillCircle(x + w * 0.5, y + 10, 95 + (i % 3) * 14);
            distant.fillCircle(x - 55, y + 32, 62);
            distant.fillCircle(x + w + 50, y + 38, 68);
        }

        const roots = this.add.graphics().setDepth(-12).setScrollFactor(0.76);
        roots.lineStyle(28, 0x2d2119, 0.92);
        const rootData = [
            [180,655,380,510],[620,655,830,480],[1050,655,1250,500],[1510,655,1720,450],
            [2060,655,2270,470],[2520,655,2720,430],[3140,655,3350,455],[3630,655,3860,430]
        ];
        rootData.forEach(([x1,y1,x2,y2]) => { roots.beginPath(); roots.moveTo(x1,y1); roots.lineTo(x2,y2); roots.strokePath(); });

        const marks = this.add.graphics().setDepth(-8).setScrollFactor(0.92);
        marks.lineStyle(12,0x4b3425,.7);
        [[640,360,720,240],[1450,400,1530,255],[2460,385,2550,235],[3330,410,3420,250]].forEach(([x1,y1,x2,y2])=>{
            marks.beginPath(); marks.moveTo(x1,y1); marks.lineTo(x2,y2); marks.strokePath();
            marks.beginPath(); marks.moveTo(x1+28,y1); marks.lineTo(x2+35,y2+12); marks.strokePath();
        });

        this.add.rectangle(870,570,1650,115,0xb7c7bd,.035).setDepth(-18).setScrollFactor(.25);
        this.add.rectangle(2500,545,2450,130,0xb7c7bd,.045).setDepth(-17).setScrollFactor(.42);

        const fg = this.add.graphics().setDepth(32).setScrollFactor(1.08).setAlpha(.72);
        [40,260,540,790,1060,1310,1600,1880,2180,2440,2720,3010,3290,3570,3860].forEach((x,i)=>{
            const r=32+(i%4)*6;
            fg.fillStyle(i%2?0x0a2518:0x102c1d,.94);
            fg.fillCircle(x,652,r);
            fg.fillCircle(x+r*.8,656,r*.72);
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
        [[0,592,640,116],[1435,592,330,116],[2740,592,260,116],[2970,592,420,116],[3465,592,330,116]].forEach(([x,y,w,h])=>{
            g.fillStyle(0x3c2b20,1); g.fillRect(x,y,w,h);
            g.fillStyle(0x203d29,1); g.fillRect(x,y,w,11);
        });

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
            g.fillStyle(0x3f2c20,1); g.fillRoundedRect(x,y,w,h,12);
            g.fillStyle(0x5b412c,.65); g.fillRect(x+10,y+5,w-20,5);
            g.fillStyle(0x1e482c,.9); g.fillRect(x+8,y-4,w-16,6);
        } else if(type==='root'){
            g.fillStyle(0x38291f,1); g.fillRoundedRect(x,y+6,w,Math.max(18,h-6),10);
            g.lineStyle(7,0x5a402c,.95); g.beginPath(); g.moveTo(x+5,y+h-3); g.lineTo(x+w*.45,y+3); g.lineTo(x+w-4,y+h-5); g.strokePath();
        } else {
            g.fillStyle(0x4b3424,1); g.fillRoundedRect(x,y,w,h,8);
            g.fillStyle(0x294d2f,1); g.fillRect(x,y,w,7);
        }
    }

    drawGiantFootprint (g,x,y,scale=1)
    {
        g.fillStyle(0x211a15,.66);
        g.fillEllipse(x,y,46*scale,66*scale);
        g.fillEllipse(x-21*scale,y-34*scale,17*scale,25*scale);
        g.fillEllipse(x,y-40*scale,17*scale,27*scale);
        g.fillEllipse(x+21*scale,y-33*scale,17*scale,24*scale);
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
            {x:620,y:610,color:0xc94432},
            {x:1510,y:610,color:0xe0b843},
            {x:2290,y:515,color:0xd77a2f},
            {x:3060,y:610,color:0xc94432}
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
        fruit.collected=true;fruit.sensor.body.enable=false;
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
        this.unstablePlatforms=[];
        this.addUnstablePlatform(2440,545,118,18);
        this.fallingTreeTriggered=false;

        this.fallingTreeSensor=this.add.rectangle(2570,470,150,240,0x000000,0);
        this.physics.add.existing(this.fallingTreeSensor);
        this.fallingTreeSensor.body.setAllowGravity(false);
        this.fallingTreeSensor.body.setImmovable(true);
        this.physics.add.overlap(this.player,this.fallingTreeSensor,()=>this.triggerTraversalTree());
    }

    addUnstablePlatform (x,y,w,h)
    {
        const body=this.add.rectangle(x,y,w,h,0x000000,0);
        this.physics.add.existing(body,true);
        this.platforms.add(body);
        const visual=this.add.rectangle(x,y,w,h,0x4a3323,.98).setDepth(10);
        visual.setStrokeStyle(2,0x77563b,.8);
        const sensor=this.add.rectangle(x,y-20,w,55,0x000000,0);
        this.physics.add.existing(sensor);
        sensor.body.setAllowGravity(false);sensor.body.setImmovable(true);
        const item={x,y,w,h,body,visual,sensor,triggered:false};
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
        this.time.delayedCall(520,()=>{
            item.body.body.enable=false;
            this.tweens.add({targets:item.visual,y:item.y+150,angle:8,alpha:.15,duration:620,ease:'Quad.In'});
        });
    }

    resetTraversalHazards ()
    {
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
            this.tweens.add({targets:leaf,x:leaf.x+(i%2?16:-16),angle:i*30,duration:170,yoyo:true,repeat:1});
        }
        this.time.delayedCall(420,()=>{
            leaves.forEach(l=>this.tweens.add({targets:l,y:l.y+50,alpha:0,duration:350,onComplete:()=>l.destroy()}));
            const tree=this.add.rectangle(2720,400,300,34,0x3e2a1e,.97).setOrigin(.5).setAngle(-76).setDepth(13);
            this.traversalFallenTree=tree;
            this.tweens.add({targets:tree,angle:-8,y:575,duration:560,ease:'Quad.In',onComplete:()=>this.cameras.main.shake(120,.002)});
        });
    }

    createCompanionEncounter ()
    {
        this.companionArea=this.add.container(2870,520).setDepth(18);
        const shelter=this.add.graphics();
        shelter.lineStyle(18,0x3d2b20,.96);shelter.beginPath();shelter.moveTo(-75,95);shelter.lineTo(-25,-70);shelter.lineTo(40,95);shelter.strokePath();
        shelter.fillStyle(0x102419,.85);shelter.fillEllipse(0,70,160,60);
        const body=this.add.rectangle(0,20,24,44,0x8f7350);
        const head=this.add.circle(0,-10,9,0xb98560);
        const cloth=this.add.rectangle(-12,7,18,30,0x7e3a48,.9).setAngle(5);
        this.companionArea.add([shelter,body,head,cloth]);

        this.companionSensor=this.add.rectangle(2860,510,150,220,0x000000,0);
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
        this.tweens.add({targets:this.companionArea,x:3030,y:410,duration:680,ease:'Sine.InOut'});
    }

    createBossArena ()
    {
        this.arenaMinX=3000;
        this.arenaMaxX=3940;
        const g=this.add.graphics().setDepth(8);
        g.fillStyle(0x3d2b20,1);g.fillRect(2980,592,960,116);g.fillStyle(0x1f432b,1);g.fillRect(2980,592,960,11);
        this.arenaLeftPlatform=this.add.rectangle(3260,500,170,25,0x4a3425,1).setDepth(9);
        this.arenaRightPlatform=this.add.rectangle(3670,465,180,25,0x4a3425,1).setDepth(9);
        this.physics.add.existing(this.arenaLeftPlatform,true);this.physics.add.existing(this.arenaRightPlatform,true);
        this.platforms.add(this.arenaLeftPlatform);this.platforms.add(this.arenaRightPlatform);
        this.addArenaUnstablePlatform(3470,555,140,18);

        this.bossTree=this.add.rectangle(3820,365,44,360,0x3a291e,.96).setDepth(7);
        this.bossTreeLeaves=this.add.container(3820,185).setDepth(6);
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
        this.mapinguari=this.add.rectangle(3550,470,120,220,0x000000,0);
        this.physics.add.existing(this.mapinguari);
        this.mapinguari.body.setAllowGravity(false);
        this.mapinguari.body.setImmovable(true);
        this.mapinguari.body.enable=false;

        const v=this.add.container(3550,470).setDepth(22).setVisible(false);
        const shadow=this.add.ellipse(0,105,150,28,0x020302,.35);
        const leftLeg=this.add.rectangle(-34,58,34,92,0x392f24).setOrigin(.5,.1);
        const rightLeg=this.add.rectangle(34,58,34,92,0x392f24).setOrigin(.5,.1);
        const torso=this.add.ellipse(0,-18,145,165,0x4a3b2c);
        const moss=this.add.ellipse(-12,-28,110,75,0x2b472c,.75);
        const leftArm=this.add.rectangle(-78,-12,34,128,0x46372a).setOrigin(.5,.1).setAngle(8);
        const rightArm=this.add.rectangle(78,-12,34,128,0x46372a).setOrigin(.5,.1).setAngle(-8);
        const head=this.add.ellipse(0,-112,72,67,0x3c3127);
        const brow=this.add.rectangle(0,-122,66,12,0x241f1a,.8);
        const eyeL=this.add.circle(-15,-111,5,0xd6b768,.88);
        const eyeR=this.add.circle(15,-111,5,0xd6b768,.88);
        for(let i=0;i<6;i++){
            const leaf=this.add.ellipse(-45+i*18,-63+(i%2)*12,22,10,i%2?0x36583a:0x2a4930,.85).setAngle(i*17);
            v.add(leaf);
        }
        v.add([shadow,leftLeg,rightLeg,torso,moss,leftArm,rightArm,head,brow,eyeL,eyeR]);
        v.parts={leftLeg,rightLeg,torso,leftArm,rightArm,head,eyeL,eyeR};
        this.mapinguariVisual=v;
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
            this.mapinguariVisual.setVisible(true).setAlpha(0).setPosition(3900,470);
            this.tweens.add({targets:this.mapinguariVisual,x:3550,alpha:1,duration:850,ease:'Quad.Out'});
        });
        this.time.delayedCall(1950,()=>{
            this.mapinguari.setPosition(3550,470);this.mapinguari.body.enable=true;
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
        this.physics.add.overlap(this.attackHitbox,this.mapinguari,()=>this.tryHitMapinguari());
    }

    startAttack ()
    {
        if(this.phaseCompleted||this.isPlayerDead||this.isAttacking||this.time.now<this.nextAttackAt)return;
        this.isAttacking=true;this.attackStartedAt=this.time.now;this.nextAttackAt=this.time.now+400;
        this.attackDirection=this.playerVisual.facing||1;this.attackHitBossRegistered=false;
    }

    updateAttack (time)
    {
        if(!this.isAttacking){this.attackHitbox.body.enable=false;return;}
        const elapsed=time-this.attackStartedAt;
        if(elapsed>=300){this.isAttacking=false;this.attackHitbox.body.enable=false;this.playerVisual.parts.machete.angle=18;return;}
        const progress=Math.min(elapsed/300,1);
        this.playerVisual.parts.rightArmRig.angle=-72+progress*145;
        if(elapsed>=90&&elapsed<=210){
            this.attackHitbox.body.enable=true;
            this.attackHitbox.setPosition(this.player.x+this.attackDirection*47,this.player.y-5);
        } else this.attackHitbox.body.enable=false;
    }

    tryHitMapinguari ()
    {
        if(!this.bossStarted||this.bossDefeated||!this.isAttacking||this.attackHitBossRegistered)return;
        this.attackHitBossRegistered=true;
        if(!this.bossVulnerable){this.showBossBlockFeedback();return;}
        this.bossVulnerable=false;
        this.bossProgress+=1;
        this.bossStageProgress+=1;
        this.showBossHitFeedback();
        this.updateBossHud();

        const required=this.bossStage===1?2:this.bossStage===2?2:3;
        if(this.bossStageProgress>=required){
            if(this.bossStage<3){
                this.bossStage+=1;this.bossStageProgress=0;
                if(this.bossStage===2)this.triggerArenaStage2();
                this.bossState='RECOVERY';this.bossNextActionAt=this.time.now+850;
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
        const ring=this.add.circle(this.mapinguari.x,this.mapinguari.y,28,0xc8d8ce,.08).setDepth(28);
        this.tweens.add({targets:ring,scale:1.5,alpha:0,duration:170,onComplete:()=>ring.destroy()});
    }

    showBossHitFeedback ()
    {
        this.cameras.main.shake(90,.002);
        this.tweens.add({targets:this.mapinguariVisual,alpha:.4,x:this.mapinguariVisual.x+(this.player.x<this.mapinguari.x?12:-12),duration:65,yoyo:true,repeat:1,onComplete:()=>this.mapinguariVisual.setAlpha(1)});
        for(let i=0;i<5;i++){
            const p=this.add.circle(this.mapinguari.x,this.mapinguari.y-20,4+i%2,0xd9c58c,.8).setDepth(30);
            const a=Math.PI*2*i/5;
            this.tweens.add({targets:p,x:p.x+Math.cos(a)*42,y:p.y+Math.sin(a)*32,alpha:0,duration:260,onComplete:()=>p.destroy()});
        }
    }

    updateBoss (time)
    {
        if(!this.bossStarted||this.bossDefeated||this.isPlayerDead||this.phaseCompleted)return;
        this.mapinguari.setPosition(this.mapinguariVisual.x,this.mapinguariVisual.y);

        if(this.player.x<this.arenaMinX)this.player.x=this.arenaMinX;
        if(this.player.x>this.arenaMaxX)this.player.x=this.arenaMaxX;

        if(this.bossState==='VULNERABLE')return;
        if(time<this.bossNextActionAt)return;

        if(this.bossState==='RECOVERY'||this.bossState==='DORMANT'){
            this.chooseBossAttack();
        }
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
        this.tweens.add({targets:this.mapinguariVisual,x:3700,duration:230});
        this.shakeArenaLeaves();
        this.tweens.add({targets:this.bossTree,angle:{from:0,to:-4},duration:120,yoyo:true,repeat:2});
        this.time.delayedCall(500,()=>this.executeBossTree());
    }

    executeBossTree ()
    {
        if(this.bossDefeated)return;
        this.bossState='ATTACK';
        this.resetBossTreeOnly();
        const tree=this.add.rectangle(3690,390,300,34,0x3b291e,.98).setOrigin(.5).setAngle(-78).setDepth(25);
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
        this.isPlayerDead=true;this.player.body.setVelocity(0,0);this.isDashing=false;
        this.time.delayedCall(650,()=>{
            if(this.bossStarted&&!this.bossDefeated)this.resetBossFight();
            this.player.setPosition(this.spawnPoint.x,this.spawnPoint.y);this.player.body.setVelocity(0,0);
            this.health=100;this.hunger=100;this.stamina=100;this.resetMovementPolishState();
            this.staminaRegenBlockedUntil=0;this.nextHungerDrainAt=this.time.now+2000;this.nextStarvationDamageAt=this.time.now+2000;
            this.invulnerableUntil=this.time.now+900;this.isPlayerDead=false;
            this.updateHealthHud();this.updateHungerHud();this.updateStaminaHud();this.playerVisual.setAlpha(1);
        });
    }

    resetBossFight ()
    {
        this.bossStage=1;this.bossProgress=0;this.bossStageProgress=0;this.bossVulnerable=false;this.bossState='RECOVERY';this.bossNextActionAt=this.time.now+900;this.bossAttackSerial=0;this.bossAttackHitRegistered=false;
        this.mapinguariVisual.setPosition(3550,470).setAngle(0).setAlpha(1).setVisible(true);
        this.mapinguariVisual.parts.torso.setScale(1);this.mapinguariVisual.parts.leftArm.setAngle(8);this.mapinguariVisual.parts.rightArm.setAngle(-8);
        this.mapinguari.setPosition(3550,470);this.mapinguari.body.enable=true;
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
        this.bossDefeated=true;this.bossVulnerable=false;this.bossState='DEFEATED';this.mapinguari.body.enable=false;this.bossHud.setVisible(false);
        this.player.body.setVelocity(0,0);this.knockbackUntil=this.time.now+2500;
        this.cameras.main.shake(180,.004);
        this.tweens.add({targets:this.mapinguariVisual,y:500,scaleY:.82,angle:this.mapinguariVisual.x>this.player.x?8:-8,duration:520,ease:'Quad.Out'});
        this.time.delayedCall(850,()=>{
            this.showBriefText('A floresta fica em silêncio.',1150);
            this.time.delayedCall(1200,()=>this.retreatMapinguari());
        });
    }

    retreatMapinguari ()
    {
        this.tweens.add({targets:this.mapinguariVisual,x:4050,alpha:.25,duration:1450,ease:'Sine.InOut',onComplete:()=>{
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
        this.add.text(512,165,'SOLDADOS DA BORRACHA',{fontFamily:'Arial Black',fontSize:'42px',color:'#f1e1ae'}).setOrigin(.5).setScrollFactor(0).setDepth(501);
        this.add.text(512,265,'A FLORESTA GUARDA\nQUEM APRENDE A ESCUTÁ-LA.',{fontFamily:'Arial Black',fontSize:'26px',color:'#c8d8cc',align:'center'}).setOrigin(.5).setScrollFactor(0).setDepth(501);
        this.add.text(512,380,'JORNADA CONCLUÍDA',{fontFamily:'Arial Black',fontSize:'32px',color:'#d6b56c'}).setOrigin(.5).setScrollFactor(0).setDepth(501);
        this.add.text(512,445,'TROPA DO SERINGAL',{fontFamily:'Arial Black',fontSize:'21px',color:'#9fba9f'}).setOrigin(.5).setScrollFactor(0).setDepth(501);
        const b=this.add.rectangle(512,560,310,64,0x8b5a2b).setStrokeStyle(3,0xd6b56c).setScrollFactor(0).setDepth(501).setInteractive({useHandCursor:true});
        this.add.text(512,560,'VOLTAR AO MENU',{fontFamily:'Arial Black',fontSize:'22px',color:'#fff'}).setOrigin(.5).setScrollFactor(0).setDepth(502);
        b.on('pointerdown',()=>this.scene.start('MainMenu'));
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
        const leftLeg=this.add.rectangle(-8,16,11,28,0x272820).setOrigin(.5,.08);
        const rightLeg=this.add.rectangle(8,16,11,28,0x272820).setOrigin(.5,.08);
        const torso=this.add.rectangle(0,-7,30,34,0xc7aa73);
        const leftArm=this.add.rectangle(-17,-14,9,30,0xb89562).setOrigin(.5,.12);
        const rightArmRig=this.add.container(17,-14);
        const rightArm=this.add.rectangle(0,0,9,30,0xb89562).setOrigin(.5,.12);
        const machete=this.add.container(7,21);
        machete.add([this.add.rectangle(0,0,6,16,0x3a2a1d).setOrigin(.5,.9),this.add.rectangle(0,-20,7,30,0xb8c0ba).setOrigin(.5,.9),this.add.triangle(0,-38,-3.5,0,3.5,0,0,-8,0xcbd1cc).setOrigin(.5,1)]);machete.setAngle(18);
        rightArmRig.add([rightArm,machete]);
        const head=this.add.circle(0,-34,11,0xb98155);
        const hat=this.add.container(0,-47);hat.add([this.add.rectangle(0,0,34,5,0x5a432b),this.add.rectangle(0,-5,21,10,0x6a5033)]);
        container.add([leftLeg,rightLeg,torso,leftArm,rightArmRig,head,hat]);
        container.parts={head,hat,torso,leftArm,rightArmRig,rightArm,machete,leftLeg,rightLeg};container.facing=1;return container;
    }

    syncPlayerVisual () { this.playerVisual.setPosition(this.player.x,this.player.y); }

    animatePlayerVisual (time)
    {
        const v=this.playerVisual,p=v.parts,b=this.player.body;const vx=b.velocity.x,vy=b.velocity.y;const grounded=b.blocked.down||b.touching.down;
        if(vx>1)v.facing=1;else if(vx<-1)v.facing=-1;v.setScale(v.facing*this.motionFx.scaleX,this.motionFx.scaleY);
        const s=time*.001;let torsoA=0,lA=5,rA=-5,lL=0,rL=0,off=0;
        if(this.isDashing&&!this.dashLandingVisual){torsoA=-12;lA=-34;rA=-42;lL=20;rL=-24;p.machete.angle=8;}
        else if(!grounded){const falling=vy>=0;torsoA=falling?6:-3;lA=falling?-46:-24;rA=falling?42:24;lL=falling?-24:12;rL=falling?20:-12;p.machete.angle=falling?28:18;}
        else if(Math.abs(vx)>1){const q=Math.sin(s*10);off=-Math.abs(Math.sin(s*20))*1.5;lL=q*24;rL=-q*24;lA=-q*20;rA=q*20;p.machete.angle=18;}
        else {const q=Math.sin(s*2.2);off=q*.6;lA=5+q*2;rA=-5-q*2;p.machete.angle=18;}
        torsoA+=this.directionFx.lean;
        v.y=this.player.y+off;p.torso.angle+=(torsoA-p.torso.angle)*.2;p.leftArm.angle+=(lA-p.leftArm.angle)*.2;p.rightArmRig.angle+=(rA-p.rightArmRig.angle)*.2;p.leftLeg.angle+=(lL-p.leftLeg.angle)*.2;p.rightLeg.angle+=(rL-p.rightLeg.angle)*.2;
    }

    tryDash ()
    {
        if(!this.dashUnlocked||this.phaseCompleted||this.isPlayerDead||this.isDashing||this.time.now<this.nextDashAt)return;
        const grounded=this.player.body.blocked.down||this.player.body.touching.down;
        if(!grounded&&this.airDashUsed){this.showDashUnavailableFeedback();return;}
        if(this.stamina<this.dashStaminaCost){this.showStaminaBlockedFeedback();return;}
        const left=this.cursors.left.isDown||this.keyA.isDown,right=this.cursors.right.isDown||this.keyD.isDown;
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
            if(this.isDashing){this.dashLandingVisual=true;this.playerVisual.parts.machete.angle=18;}
        }
        if(this.isDashing&&time>=this.dashEndsAt){this.isDashing=false;this.dashLandingVisual=false;this.playerVisual.parts.machete.angle=18;}
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
        if(this.isDashing&&grounded){this.isDashing=false;this.dashLandingVisual=false;this.playerVisual.parts.machete.angle=18;}
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
        this.playerVisual.parts.machete.angle=18;
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

    createHud ()
    {
        const p=this.add.rectangle(15,15,365,142,0x040907,.78).setOrigin(0).setScrollFactor(0).setDepth(100);p.setStrokeStyle(1,0x78917c,.32);
        this.add.text(30,27,'SOLDADOS DA BORRACHA - FASE 5',{fontFamily:'Arial',fontSize:'18px',color:'#f1e1ae'}).setScrollFactor(0).setDepth(101);
        this.add.text(30,56,'Controles:\nA/D ou ←/→ = mover\nW / ↑ / Espaço = pular\nJ / X = atacar\nSHIFT = dash',{fontFamily:'Arial',fontSize:'15px',color:'#c7d6ca',lineSpacing:3}).setScrollFactor(0).setDepth(101);
    }

    createHealthHud ()
    {
        this.healthHud=this.add.container(395,18).setScrollFactor(0).setDepth(102);const bg=this.add.rectangle(0,0,235,58,0x040907,.82).setOrigin(0);bg.setStrokeStyle(1,0x78917c,.35);const label=this.add.text(12,7,'VIDA',{fontFamily:'Arial',fontSize:'14px',color:'#f1e1ae'});const back=this.add.rectangle(12,29,150,16,0x351b18,.95).setOrigin(0);this.healthBar=this.add.rectangle(12,29,150,16,0x8fb35b,1).setOrigin(0);this.healthText=this.add.text(172,27,'100/100',{fontFamily:'Arial',fontSize:'14px',color:'#fff'});this.healthHud.add([bg,label,back,this.healthBar,this.healthText]);this.updateHealthHud();
    }

    createHungerHud ()
    {
        this.hungerHud=this.add.container(395,78).setScrollFactor(0).setDepth(102);const bg=this.add.rectangle(0,0,235,58,0x040907,.82).setOrigin(0);bg.setStrokeStyle(1,0x78917c,.35);this.hungerLabel=this.add.text(12,7,'FOME',{fontFamily:'Arial',fontSize:'14px',color:'#f1e1ae'});const back=this.add.rectangle(12,29,150,16,0x3d2b16,.95).setOrigin(0);this.hungerBar=this.add.rectangle(12,29,150,16,0xd49a3a,1).setOrigin(0);this.hungerText=this.add.text(172,27,'100/100',{fontFamily:'Arial',fontSize:'14px',color:'#fff'});this.hungerHud.add([bg,this.hungerLabel,back,this.hungerBar,this.hungerText]);this.updateHungerHud();
    }

    createStaminaHud ()
    {
        this.staminaHud=this.add.container(395,138).setScrollFactor(0).setDepth(102);const bg=this.add.rectangle(0,0,235,50,0x040907,.82).setOrigin(0);bg.setStrokeStyle(1,0x78917c,.35);const label=this.add.text(12,6,'FÔLEGO',{fontFamily:'Arial',fontSize:'13px',color:'#cfe5d2'});const back=this.add.rectangle(12,26,150,14,0x1d3025,.95).setOrigin(0);this.staminaBar=this.add.rectangle(12,26,150,14,0x72b58a,1).setOrigin(0);this.staminaText=this.add.text(172,24,'100/100',{fontFamily:'Arial',fontSize:'13px',color:'#fff'});this.staminaHud.add([bg,label,back,this.staminaBar,this.staminaText]);this.updateStaminaHud();
    }

    updateHealthHud () { const r=Math.max(0,this.health/this.maxHealth);this.healthBar.width=150*r;this.healthText.setText(`${this.health}/${this.maxHealth}`); }
    updateHungerHud () { const r=Math.max(0,this.hunger/this.maxHunger);this.hungerBar.width=150*r;this.hungerText.setText(`${this.hunger}/${this.maxHunger}`); }
    updateStaminaHud () { const r=Math.max(0,Math.min(1,this.stamina/this.maxStamina));this.staminaBar.width=150*r;this.staminaText.setText(`${Math.round(this.stamina)}/${this.maxStamina}`); }

    updateHunger (time)
    {
        if(this.phaseCompleted||this.isPlayerDead)return;
        if(time>=this.nextHungerDrainAt){const steps=Math.floor((time-this.nextHungerDrainAt)/2000)+1;this.hunger=Math.max(0,this.hunger-steps);this.nextHungerDrainAt+=steps*2000;this.updateHungerHud();}
        if(this.hunger<=0&&time>=this.nextStarvationDamageAt){this.nextStarvationDamageAt=time+2000;this.health=Math.max(0,this.health-5);this.updateHealthHud();if(this.health<=0)this.handlePlayerDeath();}
    }

    showLevelTitle ()
    {
        const t=this.add.text(512,275,'FASE 5\nTERRITÓRIO DO MAPINGUARI',{fontFamily:'Arial Black',fontSize:'34px',color:'#f1e1ae',align:'center',backgroundColor:'#040907dd',padding:{x:24,y:16}}).setOrigin(.5).setScrollFactor(0).setDepth(170);this.tweens.add({targets:t,alpha:0,delay:2100,duration:850,onComplete:()=>t.destroy()});
    }
    showBriefText (message,duration=1100)
    {
        const t=this.add.text(512,220,message,{fontFamily:'Arial Black',fontSize:'20px',color:'#e4d7ad',backgroundColor:'#040907cc',padding:{x:14,y:8}}).setOrigin(.5).setScrollFactor(0).setDepth(180);this.time.delayedCall(duration,()=>t.destroy());
    }

    update ()
    {
        const time=this.time.now;const moveSpeed=260;const grounded=this.player.body.blocked.down||this.player.body.touching.down;
        this.updateDash(time,grounded);this.updateStamina(time,grounded);
        const jumpDown=this.keyW.isDown||this.cursors.up.isDown||this.spaceKey.isDown;
        if(jumpDown&&!this.jumpWasDown)this.queueJumpInput(time);else if(!jumpDown&&this.jumpWasDown)this.applyJumpCut();this.jumpWasDown=jumpDown;

        if(!this.isPlayerDead&&!this.phaseCompleted){
            if(!this.isDashing&&time>=this.knockbackUntil){
                const left=this.cursors.left.isDown||this.keyA.isDown,right=this.cursors.right.isDown||this.keyD.isDown;
                const direction=left&&!right?-1:right&&!left?1:0;
                if(direction!==0&&this.lastMoveDirection!==0&&direction!==this.lastMoveDirection)this.showDirectionChangeFeedback(direction);
                if(direction!==0)this.lastMoveDirection=direction;
                this.player.body.setVelocityX(direction*moveSpeed);
            }
            this.updateGroundedState(grounded);this.consumeJumpBuffer(grounded);this.applyFastFall(grounded);
        } else {this.updateGroundedState(grounded);this.fastFallActive=false;}

        if(this.player.y>760){
            if(this.bossStarted&&!this.bossDefeated)this.resetBossFight();
            this.player.setPosition(this.spawnPoint.x,this.spawnPoint.y);this.player.body.setVelocity(0,0);
            if(this.bossStarted&&!this.bossDefeated){this.health=100;this.hunger=100;this.updateHealthHud();this.updateHungerHud();}
            this.stamina=100;this.staminaRegenBlockedUntil=0;this.resetMovementPolishState();this.resetTraversalHazards();this.updateStaminaHud();
        }

        this.syncPlayerVisual();this.animatePlayerVisual(time);this.updateAttack(time);this.updateBoss(time);this.updateFruits(time);this.updateHunger(time);
    }
}