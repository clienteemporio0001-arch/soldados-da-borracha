import { addMuddySwampGap } from './muddySwampWater.js';

export function createHorizontalExpansion (scene, config = {})
{
    const system = {
        scene,
        phase: config.phase ?? 1,
        startX: config.startX ?? 3000,
        endX: config.endX ?? 8500,
        traversalEndX: config.traversalEndX ?? config.endX ?? 8500,
        resourceEndX: config.resourceEndX ?? config.traversalEndX ?? config.endX ?? 8500,
        groundY: config.groundY ?? 710,
        swampSurfaceY: config.swampSurfaceY ?? 700,
        checkpointXs: config.checkpointXs ?? [],
        monkeyPerches: config.monkeyPerches ?? [],
        enemies: [],
        unstable: [],
        timers: [],
        colliders: [],
        deathSeen: false,
        destroyed: false
    };

    const palettes = {
        1:{soil:0x4f3523,top:0x315d34,top2:0x244c2d,trunk:0x493221,crown:0x143c27,crown2:0x1d5333,rock:0x555a52,leaf:0x6f7545},
        2:{soil:0x453024,top:0x274f31,top2:0x1c4229,trunk:0x3d2c21,crown:0x0f3423,crown2:0x17472d,rock:0x484c46,leaf:0x5f6540},
        3:{soil:0x503521,top:0x2d6138,top2:0x214f30,trunk:0x493222,crown:0x133d28,crown2:0x235c39,rock:0x50564d,leaf:0x75804d},
        4:{soil:0x4e3929,top:0x394430,top2:0x333923,trunk:0x443126,crown:0x263326,crown2:0x47543a,rock:0x5a574d,leaf:0x887247},
        5:{soil:0x35261e,top:0x203d29,top2:0x173321,trunk:0x34261f,crown:0x0a2518,crown2:0x123523,rock:0x454943,leaf:0x4e5a39}
    };
    const p = palettes[system.phase] ?? palettes[1];
    const width = Math.max(0, system.endX - system.startX);
    const graphics = scene.add.graphics().setDepth(5);

    const addStatic = (x,y,w,h) => {
        const body = scene.add.rectangle(x,y,w,h,0x000000,0);
        scene.physics.add.existing(body,true);
        scene.platforms.add(body);
        return body;
    };

    // Terreno novo em segmentos, com buracos pequenos e recuperacao segura.
    let cursor = system.startX;
    let serial = 0;
    while (cursor < system.endX) {
        const segW = 500 + (serial % 3) * 90;
        const gap = serial % 4 === 2 ? 105 + (system.phase >= 3 ? 20 : 0) : 42;
        const usableW = Math.min(segW, system.endX - cursor);
        if (usableW > 80) {
            const cx = cursor + usableW * 0.5;
            addStatic(cx, system.groundY, usableW, 116);
            graphics.fillStyle(p.soil,.96);graphics.fillRect(cursor,system.groundY-58,usableW,116);
            graphics.fillStyle(serial%2?p.top:p.top2,.98);graphics.fillRect(cursor,system.groundY-62,usableW,12);
            for(let x=cursor+45,i=0;x<cursor+usableW-30;x+=105,i++){
                graphics.fillStyle(i%2?p.leaf:p.rock,.42);
                graphics.fillEllipse(x,system.groundY-67,12+(i%3)*4,5+(i%2)*2);
            }
        }
        const gapStart = cursor + usableW;
        const gapWidth = Math.max(0, Math.min(gap, system.endX - gapStart));
        if (gapWidth > 1) {
            addMuddySwampGap(scene, gapStart, gapWidth, {
                phase: system.phase,
                surfaceY: system.swampSurfaceY
            });
        }
        cursor += usableW + gap;
        serial += 1;
    }

    // Plataformas naturais extras; todas permanecem dentro do alcance normal.
    for (let x = system.startX + 330, i = 0; x < system.traversalEndX - 220; x += 470 + (i % 3) * 80, i += 1) {
        const y = 575 - (i % 3) * 48;
        const w = 118 + (i % 4) * 22;
        addStatic(x,y,w,22);
        graphics.fillStyle(i%2?0x4c3524:0x5a4029,.96);graphics.fillRoundedRect(x-w/2,y-11,w,22,7);
        graphics.fillStyle(p.top,.58);graphics.fillEllipse(x,y-12,w*.84,8);
    }

    // Copas/troncos/vegetacao agrupados em Graphics para nao triplicar custo de update.
    const back = scene.add.graphics().setDepth(-23);
    for (let x = system.startX + 120, i = 0; x < system.endX; x += 270 + (i % 4) * 35, i += 1) {
        const trunkW = 28 + (i % 4) * 7;
        const trunkH = 240 + (i % 3) * 55;
        const baseY = 654;
        const crown = 70 + (i % 3) * 16;
        back.fillStyle(p.trunk,.88);back.fillRoundedRect(x,baseY-trunkH,trunkW,trunkH,8);
        back.lineStyle(7,p.trunk,.72);
        back.beginPath();back.moveTo(x+trunkW/2,baseY-trunkH+95);back.lineTo(x+(i%2?95:-78),baseY-trunkH+28);back.strokePath();
        back.fillStyle(p.crown,.9);back.fillEllipse(x+trunkW/2,baseY-trunkH,crown*1.8,crown*1.18);
        back.fillEllipse(x-35,baseY-trunkH+24,crown*1.05,crown*.72);
        back.fillEllipse(x+trunkW+42,baseY-trunkH+22,crown*1.12,crown*.76);
        back.fillStyle(p.crown2,.34);back.fillEllipse(x+trunkW/2+20,baseY-trunkH-18,crown*.92,crown*.48);
    }

    // Neblina/clareiras estaticas distribuidas.
    for (let x = system.startX + 520, i = 0; x < system.endX; x += 1150, i += 1) {
        back.fillStyle(system.phase>=4?0x9ca69c:0xc5d4c9, system.phase===5?.025:.035);
        back.fillEllipse(x,545+(i%2)*35,720+(i%3)*130,90+(i%2)*25);
    }

    const addFruit = (x,y,index) => {
        if (!Array.isArray(scene.fruits)) return;
        const colors=[0xc94a3b,0xe2c74f,0xe8873a];
        const visual=scene.add.container(x,y).setDepth(18);
        const body=scene.add.circle(0,0,9,colors[index%colors.length]);
        const shine=scene.add.circle(-3,-3,2.5,0xffffff,.42);
        const stem=scene.add.rectangle(0,-11,3,7,0x5b4324).setOrigin(.5,1);
        const leaf=scene.add.ellipse(6,-13,10,5,0x4f7a38).setAngle(-24);
        visual.add([body,shine,stem,leaf]);
        const sensor=scene.add.rectangle(x,y,26,30,0x000000,0);
        scene.physics.add.existing(sensor);
        sensor.body.setAllowGravity(false);sensor.body.setImmovable(true);
        const fruit={visual,sensor,baseY:y,phase:(scene.fruits.length+index)*.85,collected:false};
        scene.fruits.push(fruit);
        system.colliders.push(scene.physics.add.overlap(scene.player,sensor,()=>{
            if(typeof scene.collectFruit==='function') scene.collectFruit(fruit);
        }));
    };

    for(let x=system.startX+520,i=0;x<system.resourceEndX-260;x+=690+(i%3)*110,i++){
        const elevated=i%3===1;
        addFruit(x,elevated?500:632,i);
    }

    // Checkpoints discretos por grandes trechos.
    system.checkpointXs.forEach((x,index)=>{
        const sensor=scene.add.rectangle(x,535,120,210,0x000000,0);
        scene.physics.add.existing(sensor);
        sensor.body.setAllowGravity(false);sensor.body.setImmovable(true);
        let used=false;
        system.colliders.push(scene.physics.add.overlap(scene.player,sensor,()=>{
            if(used||scene.phaseCompleted||scene.isPlayerDead)return;
            used=true;
            sensor.body.enable=false;
            scene.spawnPoint={x:x+40,y:config.checkpointY??560};
            if(typeof scene.showBriefText==='function') scene.showBriefText('Ponto seguro alcançado',750);
        }));
    });

    // Plataformas instaveis ocasionais nos trechos novos.
    for(let x=system.startX+1250,i=0;x<system.traversalEndX-500;x+=1850,i++){
        const y=545-(i%2)*35,w=130;
        const body=addStatic(x,y,w,18);
        const visual=scene.add.rectangle(x,y,w,18,0x4a3526,.96).setDepth(10);
        const sensor=scene.add.rectangle(x,y-18,w,52,0x000000,0);
        scene.physics.add.existing(sensor);
        sensor.body.setAllowGravity(false);sensor.body.setImmovable(true);
        const item={x,y,body,visual,sensor,triggered:false};
        system.unstable.push(item);
        system.colliders.push(scene.physics.add.overlap(scene.player,sensor,()=>{
            if(item.triggered||scene.isPlayerDead||scene.phaseCompleted)return;
            item.triggered=true;
            sensor.body.enable=false;
            scene.tweens.add({targets:visual,x:x+4,duration:55,yoyo:true,repeat:4});
            const timer=scene.time.delayedCall(620,()=>{
                if(system.destroyed)return;
                body.body.enable=false;
                scene.tweens.add({targets:visual,y:y+120,angle:i%2?7:-7,alpha:.2,duration:520});
            });
            system.timers.push(timer);
        }));
    }

    const makeEnemy = (type,x,y,index) => {
        const flying=type==='carapana';
        const body=scene.add.rectangle(x,y,flying?38:70,flying?24:24,0x000000,0);
        scene.physics.add.existing(body);
        body.body.setAllowGravity(!flying);
        body.body.setCollideWorldBounds(true);
        if(!flying) scene.physics.add.collider(body,scene.platforms);
        const visual=scene.add.container(x,y).setDepth(19);
        if(flying){
            visual.add([
                scene.add.ellipse(-7,0,22,8,0x4b3d2d),
                scene.add.ellipse(4,0,13,11,0x5d4b35),
                scene.add.circle(12,-1,5,0x6b5940),
                scene.add.ellipse(-1,-8,22,8,0xcbd8cf,.4),
                scene.add.ellipse(-1,8,22,8,0xcbd8cf,.4)
            ]);
        }else{
            visual.add([
                scene.add.ellipse(-28,2,22,8,0x49652f),
                scene.add.ellipse(-12,0,32,14,0x58773a),
                scene.add.ellipse(13,0,36,16,0x638342),
                scene.add.ellipse(31,-2,23,18,0x72924c)
            ]);
        }
        const enemy={
            type,body,visual,startX:x,startY:y,minX:x-105,maxX:x+105,
            speed:flying?58:70,hp:flying?25:50,maxHp:flying?25:50,alive:true,
            facing:1,lastAttackStamp:-1,index,
            nextVisualUpdateAt:0
        };
        body.body.setVelocityX(enemy.speed);
        system.enemies.push(enemy);
        system.colliders.push(scene.physics.add.overlap(scene.player,body,()=>{
            if(!enemy.alive||scene.isPlayerDead)return;
            const dir=scene.player.x<body.x?-1:1;
            if(typeof scene.damagePlayer==='function') scene.damagePlayer(flying?10:25,dir*(flying?120:210),flying?-80:-220);
        }));
        if(scene.attackHitbox){
            system.colliders.push(scene.physics.add.overlap(scene.attackHitbox,body,()=>{
                if(!enemy.alive||!scene.isAttacking||!scene.attackHitbox.body?.enable)return;
                const stamp=scene.attackStartedAt??scene.time.now;
                if(enemy.lastAttackStamp===stamp)return;
                enemy.lastAttackStamp=stamp;
                enemy.hp-=25;
                if(enemy.hp<=0){
                    enemy.alive=false;body.body.enable=false;
                    scene.tweens.add({targets:visual,alpha:0,y:visual.y+18,duration:220});
                }
            }));
        }
    };

    const enemyXs=config.enemyXs??[];
    enemyXs.forEach((x,index)=>makeEnemy(index%2?'carapana':'snake',x,index%2?430:620,index));

    if(scene.forestMonkeySystem?.perches && system.monkeyPerches.length){
        scene.forestMonkeySystem.perches.push(...system.monkeyPerches);
    }

    const resetAfterDeath=()=>{
        system.unstable.forEach(item=>{
            scene.tweens.killTweensOf(item.visual);
            item.triggered=false;item.body.body.enable=true;item.sensor.body.enable=true;
            item.visual.setPosition(item.x,item.y).setAngle(0).setAlpha(1);
        });
        system.enemies.forEach(enemy=>{
            scene.tweens.killTweensOf(enemy.visual);
            enemy.alive=true;enemy.hp=enemy.maxHp;enemy.lastAttackStamp=-1;
            enemy.body.setPosition(enemy.startX,enemy.startY);enemy.body.body.enable=true;
            enemy.body.body.setVelocity(enemy.speed,0);
            enemy.visual.setPosition(enemy.startX,enemy.startY).setAlpha(1).setVisible(true);
            enemy.nextVisualUpdateAt=0;
        });
    };

    system.update=(time)=>{
        if(system.destroyed)return;
        if(scene.isPlayerDead){system.deathSeen=true;return;}
        if(system.deathSeen){system.deathSeen=false;resetAfterDeath();}
        if(scene.phaseCompleted)return;

        system.enemies.forEach(enemy=>{
            if(!enemy.alive||!enemy.body.body?.enable)return;
            const near=Math.abs(scene.player.x-enemy.body.x)<1150;
            if(!near){
                enemy.body.body.setVelocity(0,0);
                if(enemy.visual.x!==enemy.body.x||enemy.visual.y!==enemy.body.y)enemy.visual.setPosition(enemy.body.x,enemy.body.y);
                return;
            }
            if(enemy.body.x>=enemy.maxX){enemy.body.body.setVelocityX(-enemy.speed);enemy.facing=-1;}
            else if(enemy.body.x<=enemy.minX){enemy.body.body.setVelocityX(enemy.speed);enemy.facing=1;}
            else if(Math.abs(enemy.body.body.velocity.x)<1){enemy.body.body.setVelocityX(enemy.facing*enemy.speed);}
            if(scene.isTouchDevice===true&&time<enemy.nextVisualUpdateAt)return;
            if(scene.isTouchDevice===true)enemy.nextVisualUpdateAt=time+33;
            if(enemy.type==='carapana'){
                const hover=Math.sin(time*.006+enemy.index)*4;
                enemy.body.body.setVelocityY(Math.sin(time*.003+enemy.index)*18);
                enemy.visual.setPosition(enemy.body.x,enemy.body.y+hover).setScale(enemy.facing,1);
            }else{
                enemy.visual.setPosition(enemy.body.x,enemy.body.y-2).setScale(enemy.facing,1);
            }
        });
    };

    system.cleanup=()=>{
        if(system.destroyed)return;
        system.destroyed=true;
        system.timers.forEach(timer=>timer?.remove?.(false));system.timers.length=0;
        const world=scene.physics?.world;
        if(world)system.colliders.forEach(collider=>{if(collider)world.removeCollider(collider);});
        system.colliders.length=0;
    };
    scene.events.once('shutdown',()=>system.cleanup());
    return system;
}
