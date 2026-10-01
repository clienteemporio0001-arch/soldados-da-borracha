# Áudio — assets pendentes

O jogo ainda não possui arquivos de áudio reais. Esta pasta existe apenas para documentar os arquivos esperados e suas licenças.

## Estrutura esperada

- `audio/music/`: `music_forest`, `music_boss`, `music_final`
- `audio/ambient/`: `forest_ambient`
- `audio/player/`: passos, pulo, aterrissagem, dash, terçado, dano e morte
- `audio/enemies/`: cobra, carapanã, macaco, pedras e onça
- `audio/bosses/`: Curupira, Caboquim e Mapinguari
- `audio/weather/`: `rain_loop`, `thunder_01`, `thunder_02`

Consulte `src/game/audio/audioManifest.js` para a lista completa de chaves e caminhos conceituais.

## Regras para adicionar arquivos

1. Não registrar no Preloader até o arquivo realmente existir.
2. Preferir OGG/MP3 compactados.
3. Registrar origem e licença antes de publicar.
4. Preferência: CC0 ou licença que permita uso comercial.
5. O campo `license: 'PENDING'` no manifesto precisa ser substituído pela licença real do asset.

Nenhum arquivo de áudio protegido por copyright deve ser adicionado sem licença compatível.
