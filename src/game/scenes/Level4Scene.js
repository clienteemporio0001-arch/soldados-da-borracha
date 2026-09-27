import { Scene } from 'phaser';

export class Level4Scene extends Scene
{

    constructor () { super('Level4Scene'); }

    create ()
    {
        this.worldWidth = 4100;
        this.physics.world.setBounds(0, 0, this.worldWidth, 768);
        this.cameras.main.setBounds(0, 0, this.worldWidth, 768);
        this.cameras.main.setBackgroundColor('#08120f');

        this.createWoundedForest();
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
        this.isDashing = false;
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
        this.attackHitSnakeRegistered = false;
        this.attackHitCarapanaRegistered = false;

        this.companionClueFound = false;
        this.escapeStarted = false;
        this.escapeCompleted = false;
        this.escapeCheckpoint = { x: 2860, y: 540 };

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
        this.showLevelTitle();

        this.spawnPoint = { x: 150, y: 515 };
    }

    createWoundedForest ()
    {
        const sky = this.add.graphics().setDepth(-50).setScrollFactor(0);
        sky.fillStyle(0x07130f, 1);
        sky.fillRect(0, 0, 1024, 768);
        sky.fillStyle(0x10251d, 0.55);
        sky.fillRect(0, 180, 1024, 350);
        sky.fillStyle(0x2b2c20, 0.18);
        sky.fillRect(0, 500, 1024, 268);

        this.add.circle(840, 116, 78, 0xd7dfd2, 0.045).setDepth(-49).setScrollFactor(0.035);
        this.add.circle(840, 116, 43, 0xd9e2d7, 0.32).setDepth(-48).setScrollFactor(0.035);

        const distant = this.add.graphics().setDepth(-40).setScrollFactor(0.12);
        distant.fillStyle(0x0a2119, 0.95);
        distant.fillRect(-300, 520, this.worldWidth + 700, 250);

        const liveTrees = [
            [30,390,26,245,82],[250,345,34,290,100],[520,410,24,225,74],
            [780,330,38,305,110],[1050,400,27,235,82],[1300,365,32,270,96],
            [1550,420,22,215,70],[1800,385,28,250,86]
        ];
        liveTrees.forEach(([x,y,w,h,c],i)=>{
            distant.fillStyle(i%2 ? 0x0f2d21 : 0x123427, 0.9);
            distant.fillRect(x,y,w,h);
            distant.fillStyle(0x103324,0.9);
            distant.fillCircle(x+w/2,y-8,c);
            distant.fillCircle(x-c*.45,y+18,c*.58);
            distant.fillCircle(x+c*.5,y+22,c*.62);
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

        // Névoa baixa e fumaça distante.
        this.add.rectangle(650,545,1500,105,0xb8c9be,.05).setDepth(-18).setScrollFactor(.2);
        this.add.rectangle(2400,575,2200,90,0xb8b8a8,.045).setDepth(-16).setScrollFactor(.38);
        this.add.ellipse(3350,360,280,160,0x8a8b7a,.055).setDepth(-14).setScrollFactor(.55);

        const fg=this.add.graphics().setDepth(30).setScrollFactor(1.08).setAlpha(.68);
        [70,310,610,900,1240,1530,1860,2210,2580,2970,3360,3820].forEach((x,i)=>{
            const s=27+(i%4)*5;
            fg.fillStyle(i<6 ? 0x12341f : 0x1d2c1f,.9);
            fg.fillCircle(x,650,s);
            fg.fillCircle(x+s*.75,655,s*.7);
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
        [[0,592,600,116],[1360,592,360,116],[2690,592,340,116]].forEach(([x,y,w,h],i)=>{
            g.fillStyle(i===2?0x4a3728:0x4b3423,1);g.fillRect(x,y,w,h);
            g.fillStyle(i===2?0x394430:0x285331,1);g.fillRect(x,y,w,12);
        });

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
            g.fillStyle(0x4a321f,1);g.fillRoundedRect(x,y,w,h,12);
            g.fillStyle(0x6b4a2b,.72);g.fillRect(x+10,y+5,w-20,5);
            g.fillStyle(0x2d5c34,.9);g.fillRect(x+8,y-4,w-16,6);
        } else if(t==='root'){
            g.fillStyle(0x4b3422,1);g.fillRoundedRect(x,y+6,w,Math.max(18,h-6),10);
            g.lineStyle(7,0x68472d,.95);g.beginPath();
            g.moveTo(x+5,y+h-3);g.lineTo(x+w*.45,y+3);g.lineTo(x+w-4,y+h-5);g.strokePath();
        } else {
            g.fillStyle(0x5b3d25,1);g.fillRoundedRect(x,y,w,h,8);
            g.fillStyle(0x315d34,1);g.fillRect(x,y,w,7);
        }
    }

    createHumanSigns ()
    {
        const g=this.add.graphics().setDepth(9);

        // Árvore cortada.
        g.fillStyle(0x63462f,1);g.fillRect(1470,535,42,120);
        g.fillStyle(0xa57a51,.9);g.fillEllipse(1491,535,44,15);
        g.lineStyle(2,0x69472f,.8);g.strokeEllipse(1491,535,29,9);

        // Corda e madeira cortada.
        g.lineStyle(4,0x9a7a4c,.75);g.beginPath();g.moveTo(1580,570);g.lineTo(1635,615);g.lineTo(1660,580);g.strokePath();
        g.fillStyle(0x755337,.92);g.fillRect(1680,610,75,12);g.fillRect(1705,592,72,11);

        // Caixa e ferramenta abandonada.        g.fillStyle(0x725437,.95);g.fillRect(1765,598,55,45);g.lineStyle(3,0x3d2c20,.9);g.strokeRect(1765,598,55,45);
        g.lineStyle(5,0x6b4c31,.95);g.beginPath();g.moveTo(1850,612);g.lineTo(1890,575);g.strokePath();
        g.fillStyle(0x9aa09a,.85);g.fillRect(1885,565,27,10);

        // Fogueira apagada.
        g.lineStyle(6,0x453024,.95);g.beginPath();g.moveTo(1970,628);g.lineTo(2010,603);g.strokePath();g.beginPath();g.moveTo(2008,628);g.lineTo(1972,603);g.strokePath();
        g.fillStyle(0x1d1c18,.85);g.fillEllipse(1990,630,70,18);
        this.add.ellipse(1990,575,70,95,0xb9b7a5,.045).setDepth(8);

        // Pegadas humanas na direção do acampamento.
        g.fillStyle(0x594635,.68);
        for(let i=0;i<7;i++){
            g.fillEllipse(2050+i*65,630-(i%2)*8,13,25);
        }
    }

    createMapinguariSigns ()
    {
        const g=this.add.graphics().setDepth(8);

        // Primeira pegada gigantesca.
        this.drawGiantFootprint(g,2260,625,.85);

        // Marcas cada vez maiores.
        this.drawGiantFootprint(g,2740,620,1.05);
        this.drawGiantFootprint(g,3060,610,1.18);

        g.lineStyle(11,0x4b3325,.75);
        g.beginPath();g.moveTo(2820,420);g.lineTo(2890,320);g.strokePath();
        g.beginPath();g.moveTo(2845,425);g.lineTo(2920,335);g.strokePath();

        // Vegetação que treme antes da fuga.
        this.mapinguariLeaves=[
            this.add.ellipse(3000,500,32,13,0x284b30,.75).setDepth(7),
            this.add.ellipse(3040,480,36,14,0x31593a,.7).setDepth(7),
            this.add.ellipse(3080,510,30,12,0x24452d,.72).setDepth(7)
        ];
        this.mapinguariLeaves.forEach((leaf,i)=>{
            this.tweens.add({targets:leaf,x:leaf.x+(i%2?8:-8),angle:(i%2?7:-7),duration:230+i*35,yoyo:true,repeat:-1,ease:'Sine.InOut'});
        });

        // Silhueta distante parcial, sempre coberta por vegetação.
        this.mapinguariShadow=this.add.ellipse(3280,405,120,230,0x070807,.32).setDepth(-8);
        this.mapinguariEyes=[
            this.add.circle(3258,372,4,0xd4b35e,.24).setDepth(-7),
            this.add.circle(3280,372,4,0xd4b35e,.24).setDepth(-7)
        ];
        this.mapinguariShadow.setVisible(false);
        this.mapinguariEyes.forEach(e=>e.setVisible(false));
    }

    drawGiantFootprint (g,x,y,scale=1)
    {
        g.fillStyle(0x2e241d,.62);
        g.fillEllipse(x,y,42*scale,62*scale);
        g.fillEllipse(x-20*scale,y-32*scale,16*scale,24*scale);
        g.fillEllipse(x,y-38*scale,16*scale,25*scale);
        g.fillEllipse(x+20*scale,y-31*scale,16*scale,23*scale);
    }

    createAttackHitbox ()
    {
        this.attackHitbox=this.add.rectangle(-100,-100,54,46,0x000000,0);this.physics.add.existing(this.attackHitbox);this.attackHitbox.body.setAllowGravity(false);this.attackHitbox.body.enable=false;this.physics.add.overlap(this.attackHitbox,this.snake,()=>this.tryHitSnake());this.physics.add.overlap(this.attackHitbox,this.carapana,()=>this.tryHitCarapana());
    }

    startAttack ()
    {
        if(this.phaseCompleted||this.isPlayerDead||this.isAttacking||this.time.now<this.nextAttackAt)return;this.isAttacking=true;this.attackStartedAt=this.time.now;this.nextAttackAt=this.time.now+400;this.attackDirection=this.playerVisual.facing||1;this.attackHitSnakeRegistered=false;this.attackHitCarapanaRegistered=false;
    }

    createPlayerVisual ()
    {
        const container = this.add.container(this.player.x, this.player.y).setDepth(20);

        const leftLeg = this.add.rectangle(-8, 16, 11, 28, 0x272820)
            .setOrigin(0.5, 0.08);
        const rightLeg = this.add.rectangle(8, 16, 11, 28, 0x272820)
            .setOrigin(0.5, 0.08);

        const torso = this.add.rectangle(0, -7, 30, 34, 0xc7aa73)
            .setOrigin(0.5);

        const leftArm = this.add.rectangle(-17, -14, 9, 30, 0xb89562)
            .setOrigin(0.5, 0.12);
        const rightArmRig = this.add.container(17, -14);
        const rightArm = this.add.rectangle(0, 0, 9, 30, 0xb89562)
            .setOrigin(0.5, 0.12);

        const machete = this.add.container(7, 21);
        const macheteHandle = this.add.rectangle(0, 0, 6, 16, 0x3a2a1d)
            .setOrigin(0.5, 0.9);
        const macheteBlade = this.add.rectangle(0, -20, 7, 30, 0xb8c0ba)
            .setOrigin(0.5, 0.9);
        const macheteTip = this.add.triangle(0, -38, -3.5, 0, 3.5, 0, 0, -8, 0xcbd1cc)
            .setOrigin(0.5, 1);
        machete.add([macheteHandle, macheteBlade, macheteTip]);
        machete.setAngle(18);

        rightArmRig.add([rightArm, machete]);

        const head = this.add.circle(0, -34, 11, 0xb98155);

        const hat = this.add.container(0, -47);
        const hatBrim = this.add.rectangle(0, 0, 34, 5, 0x5a432b).setOrigin(0.5);
        const hatCrown = this.add.rectangle(0, -5, 21, 10, 0x6a5033).setOrigin(0.5);
        hat.add([hatBrim, hatCrown]);

        container.add([
            leftLeg,
            rightLeg,
            torso,
            leftArm,
            rightArmRig,
            head,
            hat
        ]);

        container.parts = {
            head,
            hat,
            torso,
            leftArm,
            rightArmRig,
            rightArm,
            machete,
            leftLeg,
            rightLeg
        };
        container.animationState = 'IDLE';
        container.facing = 1;

        return container;
    }

    syncPlayerVisual ()
    {
        this.playerVisual.setPosition(this.player.x, this.player.y);
    }

    animatePlayerVisual (time)
    {
        const visual = this.playerVisual;
        const parts = visual.parts;
        const body = this.player.body;
        const velocityX = body.velocity.x;
        const velocityY = body.velocity.y;
        const grounded = body.blocked.down || body.touching.down;
        const moving = Math.abs(velocityX) > 1;

        let state = 'IDLE';

        if (this.isDashing)
        {
            state = 'DASH';
        }
        else if (!grounded)
        {
            state = velocityY < 0 ? 'JUMP' : 'FALL';
        }
        else if (moving)
        {
            state = 'WALK';
        }

        visual.animationState = state;

        if (velocityX > 1)
        {
            visual.facing = 1;
        }
        else if (velocityX < -1)
        {
            visual.facing = -1;
        }

        visual.setScale(visual.facing, 1);

        const seconds = time * 0.001;
        const lerp = (current, target, amount = 0.2) =>
            current + (target - current) * amount;

        let bodyOffsetY = 0;
        let torsoAngle = 0;
        let torsoY = -7;
        let headY = -34;
        let hatY = -47;
        let hatAngle = 0;
        let leftArmAngle = 5;
        let rightArmAngle = -5;
        let leftLegAngle = 0;
        let rightLegAngle = 0;
        let leftLegY = 16;
        let rightLegY = 16;

        if (state === 'IDLE')
        {
            const breath = Math.sin(seconds * 2.2);
            const armSway = Math.sin(seconds * 1.7) * 2;

            bodyOffsetY = breath * 0.7;
            torsoY = -7 + breath * 0.7;
            headY = -34 + breath * 0.45;
            hatY = -47 + breath * 0.45;
            hatAngle = Math.sin(seconds * 1.4) * 0.7;
            leftArmAngle = 5 + armSway;
            rightArmAngle = -5 - armSway;
        }
        else if (state === 'WALK')
        {
            const speedRatio = Math.min(Math.abs(velocityX) / 260, 1);
            const phase = seconds * (7 + speedRatio * 4);
            const swing = Math.sin(phase);
            const bounce = Math.abs(Math.sin(phase * 2)) * 1.5;

            bodyOffsetY = -bounce;
            torsoY = -7 - bounce * 0.45;
            headY = -34 - bounce * 0.35;
            hatY = -47 - bounce * 0.3;
            hatAngle = Math.sin(phase) * 1.5;

            leftLegAngle = swing * 24;
            rightLegAngle = -swing * 24;
            leftArmAngle = -swing * 20;
            rightArmAngle = swing * 20;
        }
        else if (state === 'JUMP')
        {
            bodyOffsetY = -1;
            torsoY = -8;
            torsoAngle = -3;
            headY = -35;
            hatY = -48;
            hatAngle = -2;
            leftArmAngle = -24;
            rightArmAngle = 24;
            leftLegAngle = 12;
            rightLegAngle = -12;
            leftLegY = 13;
            rightLegY = 13;
        }
        else if (state === 'FALL')
        {
            bodyOffsetY = 1;
            torsoY = -6;
            torsoAngle = 2;
            headY = -33;
            hatY = -46;
            hatAngle = 2;
            leftArmAngle = -34;
            rightArmAngle = 34;            leftLegAngle = -15;
            rightLegAngle = 15;
            leftLegY = 17;
            rightLegY = 17;
        }
        else if (state === 'DASH')
        {
            bodyOffsetY = 0;
            torsoY = -7;
            torsoAngle = -12;
            headY = -34;
            hatY = -47;
            hatAngle = -7;
            leftArmAngle = -34;
            rightArmAngle = -42;
            leftLegAngle = 20;
            rightLegAngle = -24;
            leftLegY = 15;
            rightLegY = 14;
            parts.machete.angle = 8;
        }

        visual.y = this.player.y + bodyOffsetY;

        parts.torso.y = lerp(parts.torso.y, torsoY);
        parts.torso.angle = lerp(parts.torso.angle, torsoAngle);

        parts.head.y = lerp(parts.head.y, headY);
        parts.hat.y = lerp(parts.hat.y, hatY);
        parts.hat.angle = lerp(parts.hat.angle, hatAngle);

        parts.leftArm.angle = lerp(parts.leftArm.angle, leftArmAngle);
        parts.rightArmRig.angle = lerp(parts.rightArmRig.angle, rightArmAngle);

        this.playerBaseRightArmAngle = rightArmAngle;
        this.playerBaseTorsoAngle = torsoAngle;

        parts.leftLeg.angle = lerp(parts.leftLeg.angle, leftLegAngle);
        parts.rightLeg.angle = lerp(parts.rightLeg.angle, rightLegAngle);
        parts.leftLeg.y = lerp(parts.leftLeg.y, leftLegY);
        parts.rightLeg.y = lerp(parts.rightLeg.y, rightLegY);
    }

    updateAttack (time)
    {
        if (!this.isAttacking) {
            this.attackHitbox.body.enable = false;
            return;
        }
        const elapsed = time - this.attackStartedAt;
        const progress = Math.min(elapsed / 300, 1);
        const swing = Math.sin(progress * Math.PI);
        const parts = this.playerVisual.parts;
        parts.rightArmRig.angle = (this.playerBaseRightArmAngle ?? parts.rightArmRig.angle) + 55 * swing;
        parts.machete.angle = 18 + 40 * swing;
        parts.torso.angle = (this.playerBaseTorsoAngle ?? parts.torso.angle) + 5 * swing;

        if (elapsed >= 90 && elapsed <= 210) {
            this.attackHitbox.body.enable = true;
            this.attackHitbox.setPosition(this.player.x + 46 * this.attackDirection, this.player.y - 2);
        } else {
            this.attackHitbox.body.enable = false;
        }

        if (elapsed >= 300) {
            this.isAttacking = false;
            this.attackHitbox.body.enable = false;
            parts.machete.angle = 18;
        }
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
            angle: 18,            scaleY: 0.55,
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

        if (this.carapanaHealth <= 0)        {
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
        this.player.body.setVelocity(0, 0);
        this.time.delayedCall(650, () => {
            this.player.setPosition(this.spawnPoint.x, this.spawnPoint.y);
            this.player.body.setVelocity(0, 0);
            this.health = 100;
            this.hunger = 100;
            this.nextHungerDrainAt = this.time.now + 2000;
            this.nextStarvationDamageAt = this.time.now + 2000;
            this.invulnerableUntil = this.time.now + 1000;
            this.isPlayerDead = false;
            this.updateHealthHud();
            this.updateHungerHud();
            this.playerVisual.setAlpha(1);
            this.resetUnstablePlatforms();
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
        const data=[
            {x:1505,y:510,w:145,h:24},
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

        this.tweens.add({
            targets:item.visual,
            x:item.x+3,
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
            }
        });
    }

    resetUnstablePlatforms ()
    {
        this.unstablePlatforms.forEach(item=>{
            this.tweens.killTweensOf(item.visual);
            item.triggered=false;
            item.body.body.enable=true;
            item.sensor.body.enable=true;
            item.visual.setPosition(item.x,item.y).setAngle(0).setAlpha(1);        });
    }

    createCompanionClue ()
    {
        const camp=this.add.graphics().setDepth(11);

        // Barraca rasgada.
        camp.fillStyle(0x50503d,.85);
        camp.fillTriangle(2450,625,2520,525,2590,625);
        camp.lineStyle(4,0x332b21,.95);
        camp.beginPath();camp.moveTo(2520,525);camp.lineTo(2520,625);camp.strokePath();
        camp.lineStyle(3,0x28241f,.9);
        camp.beginPath();camp.moveTo(2505,555);camp.lineTo(2542,590);camp.strokePath();

        // Caixas, cordas e objetos espalhados.
        camp.fillStyle(0x755337,.95);camp.fillRect(2600,590,62,48);camp.fillRect(2680,610,44,30);
        camp.lineStyle(3,0x9a7a4c,.72);camp.beginPath();camp.moveTo(2550,640);camp.lineTo(2630,620);camp.lineTo(2705,642);camp.strokePath();
        camp.fillStyle(0x8f9690,.78);camp.fillRect(2720,605,32,9);

        // Uma pegada gigantesca misturada às humanas.
        this.drawGiantFootprint(camp,2790,615,.72);

        // Lenço preso a um galho.
        this.companionScarf=this.add.rectangle(2815,495,34,15,0x9e3f52,.92).setAngle(-18).setDepth(14);
        this.tweens.add({targets:this.companionScarf,angle:{from:-21,to:-12},y:this.companionScarf.y-3,duration:700,yoyo:true,repeat:-1,ease:'Sine.InOut'});

        // Marca inequívoca feita por ela.
        camp.lineStyle(5,0xc3a477,.92);
        camp.beginPath();camp.moveTo(2860,520);camp.lineTo(2880,500);camp.lineTo(2900,520);camp.lineTo(2880,540);camp.closePath();camp.strokePath();

        this.companionClueSensor=this.add.rectangle(2845,545,170,180,0x000000,0);
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
        this.knockbackUntil=this.time.now+1750;

        const panel=this.add.rectangle(512,330,520,112,0x06100d,.92).setScrollFactor(0).setDepth(190);
        const text=this.add.text(512,330,'É dela.',{fontFamily:'Arial Black',fontSize:'28px',color:'#f1e1ae'}).setOrigin(.5).setScrollFactor(0).setDepth(191);

        this.time.delayedCall(850,()=>{
            text.setText('Ela esteve aqui recentemente.').setFontSize(24);
        });
        this.time.delayedCall(1850,()=>{
            panel.destroy();text.destroy();
            const hint=this.add.text(512,210,'Os rastros continuam.',{fontFamily:'Arial',fontSize:'20px',color:'#c8d8cc',backgroundColor:'#06100dcc',padding:{x:14,y:8}}).setOrigin(.5).setScrollFactor(0).setDepth(180);
            this.time.delayedCall(1800,()=>hint.destroy());
        });
    }

    createMapinguariEscape ()
    {
        this.escapeTrigger=this.add.rectangle(3090,520,180,230,0x000000,0);
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

        this.cameras.main.shake(240,.004);
        this.showImpactBurst(3060,560);

        this.mapinguariShadow.setVisible(true);
        this.mapinguariEyes.forEach(e=>e.setVisible(true));
        this.tweens.add({targets:[this.mapinguariShadow,...this.mapinguariEyes],alpha:{from:.12,to:.42},duration:350,yoyo:true,repeat:1});

        // Árvore cai atrás e bloqueia retorno.
        const fallen=this.add.rectangle(3000,520,260,30,0x4a3020,.96).setOrigin(.5).setDepth(12).setAngle(-72);
        this.tweens.add({
            targets:fallen,
            angle:-8,
            y:610,
            duration:520,
            ease:'Quad.In',
            onComplete:()=>{
                this.escapeBlocker=this.add.rectangle(2995,610,250,44,0x000000,0);
                this.physics.add.existing(this.escapeBlocker,true);
                this.physics.add.collider(this.player,this.escapeBlocker);
            }
        });

        this.time.delayedCall(650,()=>{this.cameras.main.shake(170,.003);this.showImpactBurst(3370,530);});
        this.time.delayedCall(1250,()=>{this.cameras.main.shake(150,.0025);this.showImpactBurst(3600,500);});
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
        const t=this.add.text(512,205,'NOVO RASTRO\\nSIGA PARA O TERRITÓRIO DO MAPINGUARI',{
            fontFamily:'Arial Black',fontSize:'20px',color:'#f1e1ae',align:'center',
            backgroundColor:'#06100dcc',padding:{x:16,y:10}
        }).setOrigin(.5).setScrollFactor(0).setDepth(180);
        this.time.delayedCall(2500,()=>t.destroy());
    }

    tryDash ()
    {
        if(!this.dashUnlocked||this.phaseCompleted||this.isPlayerDead||this.isDashing||this.time.now<this.nextDashAt)return;
        const grounded=this.player.body.blocked.down||this.player.body.touching.down;
        if(!grounded&&this.airDashUsed){this.showDashUnavailableFeedback();return;}
        const left=this.cursors.left.isDown||this.keyA.isDown;
        const right=this.cursors.right.isDown||this.keyD.isDown;
        const direction=left&&!right?-1:right&&!left?1:(this.playerVisual.facing||1);

        this.isDashing=true;
        this.dashDirection=direction;
        this.dashEndsAt=this.time.now+this.dashDuration;
        this.nextDashAt=this.time.now+this.dashCooldown;
        if(!grounded)this.airDashUsed=true;

        this.player.body.setVelocityX(direction*this.dashSpeed);
        this.player.body.setVelocityY(this.player.body.velocity.y*.45);
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
        if(grounded&&this.airDashUsed){
            this.airDashUsed=false;
            this.showAirDashRechargeFeedback();
        }
        if(this.isDashing&&time>=this.dashEndsAt){
            this.isDashing=false;
            this.playerVisual.parts.machete.angle=18;
        }
    }

    performJump (isGrounded) { if(isGrounded)this.jumpsUsed=0;if(this.jumpsUsed===0&&isGrounded){this.player.body.setVelocityY(-520);this.jumpsUsed=1;return;}if(this.doubleJumpUnlocked&&this.jumpsUsed===1&&!isGrounded){this.player.body.setVelocityY(-500);this.jumpsUsed=2;this.showDoubleJumpBurst(false);} }

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
        this.escapeFinishZone=this.add.rectangle(3820,500,160,230,0x000000,0);
        this.physics.add.existing(this.escapeFinishZone);
        this.escapeFinishZone.body.setAllowGravity(false);
        this.escapeFinishZone.body.setImmovable(true);
        this.physics.add.overlap(this.player,this.escapeFinishZone,()=>{if(this.escapeStarted)this.completeEscape();});

        this.finalZone=this.add.rectangle(4040,345,110,190,0x000000,0);
        this.physics.add.existing(this.finalZone);
        this.finalZone.body.setAllowGravity(false);
        this.finalZone.body.setImmovable(true);
        this.physics.add.overlap(this.player,this.finalZone,()=>this.completeLevel4());

        const g=this.add.graphics().setDepth(9);        this.drawGiantFootprint(g,3920,405,.72);
        g.fillStyle(0x63503e,.72);
        g.fillEllipse(3970,405,12,24);

        // Entrada escura entre raízes e pedras.
        g.fillStyle(0x050706,.9);g.fillEllipse(4070,330,145,230);
        g.lineStyle(22,0x3e2c1f,.95);
        g.beginPath();g.moveTo(3990,455);g.lineTo(4045,260);g.strokePath();
        g.beginPath();g.moveTo(4150,455);g.lineTo(4095,260);g.strokePath();
    }

    completeLevel4 ()
    {
        if(this.phaseCompleted||!this.escapeCompleted)return;
        this.phaseCompleted=true;
        this.player.body.setVelocity(0,0);
        this.isAttacking=false;
        this.isDashing=false;
        this.attackHitbox.body.enable=false;

        this.add.rectangle(512,384,1024,768,0x020705,.94).setScrollFactor(0).setDepth(300);
        this.add.text(512,190,'FASE 4 CONCLUÍDA',{fontFamily:'Arial Black',fontSize:'42px',color:'#f1e1ae'}).setOrigin(.5).setScrollFactor(0).setDepth(301);
        this.add.text(512,260,'RASTROS NA MATA FERIDA',{fontFamily:'Arial Black',fontSize:'27px',color:'#c9b477'}).setOrigin(.5).setScrollFactor(0).setDepth(301);
        this.add.text(512,350,'“Os rastros seguem juntos.”',{fontFamily:'Arial',fontSize:'24px',color:'#c8d8cc'}).setOrigin(.5).setScrollFactor(0).setDepth(301);
        this.add.text(512,420,'TERRITÓRIO DO MAPINGUARI',{fontFamily:'Arial Black',fontSize:'28px',color:'#d6b56c'}).setOrigin(.5).setScrollFactor(0).setDepth(301);

        const b=this.add.rectangle(512,545,280,64,0x8b5a2b).setStrokeStyle(3,0xd6b56c).setScrollFactor(0).setDepth(301).setInteractive({useHandCursor:true});
        this.add.text(512,545,'CONTINUAR',{fontFamily:'Arial Black',fontSize:'23px',color:'#fff'}).setOrigin(.5).setScrollFactor(0).setDepth(302);
        b.on('pointerdown',()=>this.scene.start('MainMenu'));
    }

    createHud ()
    {
        const p=this.add.rectangle(15,15,365,142,0x06100d,.72).setOrigin(0).setScrollFactor(0).setDepth(100);
        p.setStrokeStyle(1,0x78917c,.35);
        this.add.text(30,27,'SOLDADOS DA BORRACHA - FASE 4',{fontFamily:'Arial',fontSize:'18px',color:'#f1e1ae'}).setScrollFactor(0).setDepth(101);
        this.controlsText=this.add.text(30,56,'Controles:\\nA/D ou ←/→ = mover\\nW / ↑ / Espaço = pular\\nJ / X = atacar\\nSHIFT = dash',{fontFamily:'Arial',fontSize:'15px',color:'#c7d6ca',lineSpacing:3}).setScrollFactor(0).setDepth(101);
    }

    showLevelTitle ()
    {
        const t=this.add.text(512,275,'FASE 4\\nRASTROS NA MATA FERIDA',{fontFamily:'Arial Black',fontSize:'34px',color:'#f1e1ae',align:'center',backgroundColor:'#06100dcc',padding:{x:24,y:16}}).setOrigin(.5).setScrollFactor(0).setDepth(170);
        this.tweens.add({targets:t,alpha:0,delay:1900,duration:800,onComplete:()=>t.destroy()});
    }

    update ()
    {
        const time=this.time.now;
        const moveSpeed=260;
        const grounded=this.player.body.blocked.down||this.player.body.touching.down;
        if(grounded)this.jumpsUsed=0;
        this.updateDash(time,grounded);

        if(!this.isPlayerDead&&!this.phaseCompleted){
            if(!this.isDashing&&time>=this.knockbackUntil){
                const left=this.cursors.left.isDown||this.keyA.isDown;
                const right=this.cursors.right.isDown||this.keyD.isDown;
                this.player.body.setVelocityX(left?-moveSpeed:right?moveSpeed:0);
            }
            const jumpDown=this.keyW.isDown||this.cursors.up.isDown||this.spaceKey.isDown;
            if(jumpDown&&!this.jumpWasDown&&!this.isDashing)this.performJump(grounded);
            this.jumpWasDown=jumpDown;
        }

        if(this.player.y>760){
            this.player.setPosition(this.spawnPoint.x,this.spawnPoint.y);
            this.player.body.setVelocity(0,0);
            this.isDashing=false;
            this.resetUnstablePlatforms();
        }

        this.syncPlayerVisual();
        this.animatePlayerVisual(time);
        this.updateAttack(time);
        this.updateSnake(time);
        this.updateCarapana(time);
        this.updateFruits(time);
        this.updateHunger(time);
    }

    createHealthHud ()
    {
        this.healthHud = this.add.container(395, 18)
            .setScrollFactor(0)
            .setDepth(102);

        const background = this.add.rectangle(0, 0, 235, 58, 0x06100d, 0.78)
            .setOrigin(0);
        background.setStrokeStyle(1, 0x78917c, 0.35);

        const label = this.add.text(12, 7, 'VIDA', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#f1e1ae'
        });

        const barBack = this.add.rectangle(12, 29, 150, 16, 0x351b18, 0.95)
            .setOrigin(0);
        barBack.setStrokeStyle(1, 0x8e6f62, 0.65);

        this.healthBar = this.add.rectangle(12, 29, 150, 16, 0x8fb35b, 1)
            .setOrigin(0);

        this.healthText = this.add.text(172, 27, '100/100', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#ffffff'
        });

        this.healthHud.add([
            background,
            label,
            barBack,
            this.healthBar,
            this.healthText
        ]);

        this.updateHealthHud();
    }

    createHungerHud ()
    {
        this.hungerHud = this.add.container(395, 78)
            .setScrollFactor(0)
            .setDepth(102);

        const background = this.add.rectangle(0, 0, 235, 58, 0x06100d, 0.78)
            .setOrigin(0);
        background.setStrokeStyle(1, 0x78917c, 0.35);

        this.hungerLabel = this.add.text(12, 7, 'FOME', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#f1e1ae'
        });

        const barBack = this.add.rectangle(12, 29, 150, 16, 0x3d2b16, 0.95)
            .setOrigin(0);
        barBack.setStrokeStyle(1, 0x9b7b45, 0.65);

        this.hungerBar = this.add.rectangle(12, 29, 150, 16, 0xd49a3a, 1)
            .setOrigin(0);

        this.hungerText = this.add.text(172, 27, '100/100', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#ffffff'
        });

        this.hungerHud.add([
            background,
            this.hungerLabel,
            barBack,
            this.hungerBar,
            this.hungerText
        ]);

        this.updateHungerHud();
    }

    updateHealthHud ()
    {
        const ratio = Math.max(0, this.health / this.maxHealth);

        this.healthBar.width = 150 * ratio;
        this.healthText.setText(`${this.health}/${this.maxHealth}`);
    }

    updateHungerHud ()
    {
        const ratio = Math.max(0, this.hunger / this.maxHunger);

        this.hungerBar.width = 150 * ratio;
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