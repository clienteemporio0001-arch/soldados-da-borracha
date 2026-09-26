import { Scene } from 'phaser';

export class Game extends Scene
{
    constructor ()
    {
        super('Game');
    }

    create ()
    {
        // Fundo
        this.cameras.main.setBackgroundColor('#071a12');

        // Lua
        this.add.circle(820, 120, 60, 0xd9e2d0);

        // Chão
        this.add.rectangle(512, 700, 1024, 136, 0x3b2a18);

        // Vegetação provisória
        this.add.rectangle(512, 630, 1024, 20, 0x1f4d2e);

        // Personagem provisório
        this.player = this.add.rectangle(
            150,
            580,
            45,
            70,
            0xd6b56c
        );

        // Título
        this.add.text(
            20,
            20,
            'SOLDADOS DA BORRACHA - PROTÓTIPO',
            {
                fontFamily: 'Arial',
                fontSize: '18px',
                color: '#ffffff'
            }
        );

        // Instruções
        this.add.text(
            20,
            50,
            'Mover: ← → ou A D',
            {
                fontFamily: 'Arial',
                fontSize: '16px',
                color: '#b7c9bd'
            }
        );

        // Teclas
        this.cursors = this.input.keyboard.createCursorKeys();

        this.keyA = this.input.keyboard.addKey('A');
        this.keyD = this.input.keyboard.addKey('D');
    }

    update ()
    {
        const velocidade = 4;

        if (this.cursors.left.isDown || this.keyA.isDown)
        {
            this.player.x -= velocidade;
        }

        if (this.cursors.right.isDown || this.keyD.isDown)
        {
            this.player.x += velocidade;
        }

        // Não deixa sair da tela
        this.player.x = Math.max(
            25,
            Math.min(999, this.player.x)
        );
    }
}