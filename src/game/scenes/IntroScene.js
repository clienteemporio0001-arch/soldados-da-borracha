import { Scene } from 'phaser';

export class IntroScene extends Scene
{
    constructor ()
    {
        super('IntroScene');
    }

    create ()
    {
        this.currentMoment = 0;
        this.transitioning = false;

        this.background = this.add.rectangle(512, 384, 1024, 768, 0x071714);
        this.moon = this.add.circle(820, 125, 58, 0xdce4d5, 0.78);

        this.forest = this.add.graphics();
        this.drawForest();

        this.camp = this.add.container(210, 560);
        const hut = this.add.rectangle(0, 0, 120, 70, 0x4a3322);
        const roof = this.add.triangle(0, -60, -75, 45, 0, -25, 75, 45, 0x2f241b);
        const fire = this.add.circle(75, 45, 10, 0xd07a32, 0.75);
        this.camp.add([hut, roof, fire]);

        this.fogA = this.add.rectangle(360, 610, 820, 110, 0xc5d6ce, 0.08);
        this.fogB = this.add.rectangle(760, 665, 820, 90, 0xffffff, 0.05);

        this.shadow = this.add.container(760, 455).setAlpha(0);
        const shadowBody = this.add.ellipse(0, 10, 120, 190, 0x020403, 0.96);
        const shadowHead = this.add.circle(0, -80, 42, 0x020403, 0.98);
        const eyeLeft = this.add.circle(-14, -86, 4, 0xb56b43, 0.95);
        const eyeRight = this.add.circle(14, -86, 4, 0xb56b43, 0.95);
        this.shadow.add([shadowBody, shadowHead, eyeLeft, eyeRight]);

        this.titleText = this.add.text(512, 250, '', {
            fontFamily: 'Arial Black',
            fontSize: '34px',
            color: '#f1e1ae',
            align: 'center'
        }).setOrigin(0.5);

        this.bodyText = this.add.text(512, 355, '', {
            fontFamily: 'Arial',
            fontSize: '22px',
            color: '#d4dfd7',
            align: 'center',
            lineSpacing: 8,
            wordWrap: { width: 760 }
        }).setOrigin(0.5);

        this.hintText = this.add.text(512, 710, 'ESPAÇO / ENTER / CLIQUE para avançar', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#8ea397'
        }).setOrigin(0.5);

        this.skipText = this.add.text(930, 36, 'Pular introdução', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#b7c7bd'
        })
            .setOrigin(1, 0)
            .setInteractive({ useHandCursor: true });

        this.skipText.on('pointerdown', (pointer, localX, localY, event) => {
            event?.stopPropagation();
            this.startGame();
        });

        this.input.keyboard.on('keydown-SPACE', () => this.advanceMoment());
        this.input.keyboard.on('keydown-ENTER', () => this.advanceMoment());
        this.input.on('pointerdown', () => this.advanceMoment());

        this.showMoment(0);
    }

    drawForest ()
    {
        this.forest.clear();
        this.forest.fillStyle(0x0b211b, 1);
        this.forest.fillRect(0, 480, 1024, 288);

        [80, 180, 320, 470, 620, 790, 930].forEach((x, index) => {
            this.forest.fillStyle(0x102a21, 1);
            this.forest.fillRect(x, 250 + (index % 2) * 35, 28, 300);

            this.forest.fillStyle(0x0b261d, 1);
            this.forest.fillCircle(x + 14, 235 + (index % 2) * 35, 78);
            this.forest.fillCircle(x - 38, 265 + (index % 2) * 28, 52);
            this.forest.fillCircle(x + 62, 265 + (index % 2) * 30, 56);
        });
    }

    showMoment (index)
    {
        this.currentMoment = index;

        if (index === 0)
        {
            this.background.setFillStyle(0x071714);
            this.moon.setAlpha(0.78);
            this.shadow.setAlpha(0);
            this.camp.setAlpha(1);
            this.titleText.setText('ACRE, AMAZÔNIA.');
            this.bodyText.setText('Em meio à floresta, homens e mulheres construíam uma nova vida nos seringais.');
        }
        else if (index === 1)
        {
            this.background.setFillStyle(0x040b09);
            this.fogA.setAlpha(0.16);
            this.fogB.setAlpha(0.12);
            this.shadow.setAlpha(0.9);
            this.shadow.x = 790;
            this.titleText.setText('NAQUELA MADRUGADA');
            this.bodyText.setText('A neblina tomou conta da mata.\nEntão algo veio da floresta.');
        }
        else if (index === 2)
        {
            this.shadow.setAlpha(0.95);
            this.shadow.x = 690;
            this.titleText.setText('O ATAQUE FOI RÁPIDO.');
            this.bodyText.setText('Ferido, ele não conseguiu impedir que a criatura levasse sua companheira.');

            this.cameras.main.shake(260, 0.004);
            this.cameras.main.flash(180, 24, 20, 18, false);
        }
        else
        {
            this.background.setFillStyle(0x31483f);
            this.moon.setAlpha(0.12);
            this.fogA.setAlpha(0.07);
            this.fogB.setAlpha(0.05);
            this.shadow.setAlpha(0);
            this.camp.setAlpha(0.8);
            this.titleText.setText('AO AMANHECER, RESTARAM APENAS RASTROS.');
            this.bodyText.setText('Mesmo ferido, ele pegou seu facão e entrou na floresta.\n\nSOLDADO DA BORRACHA\nA jornada começa.');
        }
    }

    advanceMoment ()
    {
        if (this.transitioning)
        {
            return;
        }

        if (this.currentMoment >= 3)
        {
            this.startGame();
            return;
        }

        this.transitioning = true;

        this.cameras.main.fadeOut(220, 0, 0, 0);

        this.time.delayedCall(240, () => {
            this.showMoment(this.currentMoment + 1);
            this.cameras.main.fadeIn(260, 0, 0, 0);
            this.transitioning = false;
        });
    }

    startGame ()
    {
        if (this.scene.isActive('Game'))
        {
            return;
        }

        this.scene.start('Game');
    }
}
