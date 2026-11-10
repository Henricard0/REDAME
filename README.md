# REDAME: O Resgate do Legado

Action RPG em pixel art para navegador. Uma estudante de engenharia encontra o **Revisor de Épocas**, um aparelho que liga o presente ao passado, e viaja no tempo para resgatar a história de 15 engenheiras pioneiras que o **Esquecimento** está apagando.

Roda em qualquer navegador (computador ou celular), sem instalar nada.

## O que já está pronto

- **Prólogo:** o acervo da universidade nos dias atuais, a Profa. Helena e a descoberta do Revisor de Épocas.
- **Época 1, Curitiba (anos 1940), com Enedina Alves Marques:**
  - Cidade aberta: Praça Santos Andrade, prédio histórico da Universidade do Paraná, Colégio Estadual, Departamento de Águas, canteiro de obras, bondes e carros.
  - A cidade começa cinza (efeito do Esquecimento) e ganha cor conforme você ajuda Enedina.
  - Missões: recuperar o registro de formatura, buscar o teodolito, conquistar o apoio dos operários (com quiz de engenharia).
  - Usina Capivari-Cachoeira: inspeção das galerias subterrâneas, coleta de materiais (sucata de ferro, fio de cobre, borracha, parafusos), bancada de montagem para fabricar as peças que abrem a sala de comando.
  - Minigame das tubulações com 5 níveis: vazamentos, pontas (tampões), peças travadas, medidor de pressão com tempo, dicas, e níveis 3 a 5 gerados por algoritmo (um tabuleiro novo a cada tentativa, sempre com solução).
  - Discurso final da Enedina, cerimônia do nome gravado no Dispositivo REDAME e página na Caderneta.
- **Combate em tempo real:** chave inglesa (golpe), pulso do Revisor (disparo com energia que recarrega), esquiva e corações.
  - Inimigos do Esquecimento: borrões de tinta cinza que perseguem, drones corrompidos que atiram faíscas (com aviso antes), robôs de manutenção que dão investidas e ficam tontos ao bater na parede (dano em dobro), e faíscas de curto-circuito que quicam.
  - Chefe: o **Gerador Esquecido**, na casa de força. Blindado, ele só leva dano quando o núcleo superaquece. Na metade da vida, invoca faíscas. Vencer dá +1 coração.
  - Inimigos soltam corações, energia e materiais. Se a vida acabar, você volta para a entrada do mapa sem perder nada.
  - Opção "Batalhas: leves" no menu, que reduz o dano e deixa os inimigos mais lentos.
- **Visual industrial:** iluminação dinâmica nas áreas escuras (lâmpadas, telas verdes, disparos e a própria protagonista), placas de madeira com o nome dos lugares, painéis metálicos.
- **Caderneta REDAME** com as 15 pioneiras (páginas reveladas conforme o resgate).
- **Revisor de Épocas** para escolher épocas (as outras 14 aparecem como "em breve").
- Salvamento automático no navegador, música e efeitos sonoros gerados pelo próprio jogo, controles de toque no celular e suporte a controle (gamepad).

## Como jogar

| Ação | Teclado | Celular |
|---|---|---|
| Andar | Setas ou WASD | Direcional |
| Falar, pegar, confirmar, golpear | Espaço, Enter, Z ou E | A |
| Pulso do Revisor (disparo), voltar | X ou K | B |
| Esquiva (tocar) e correr (segurar) | Shift ou L | Esquiva |
| Menu (Caderneta, itens, som, salvar) | Esc | Menu |
| Girar cano ao contrário (minigame) | Q | — |
| Dica (minigame) | H | Botão "Dica" |

## Rodar no seu computador

O jogo carrega arquivos com `fetch`, então precisa de um servidor local (abrir o `index.html` direto com dois cliques não funciona):

```bash
python3 -m http.server 8080
```

Depois abra `http://localhost:8080` no navegador.

## Publicar com link permanente (GitHub Pages)

1. No GitHub, abra o repositório e vá em **Settings → Pages**.
2. Em **Build and deployment**, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`, e salve.
3. Em um ou dois minutos o jogo fica disponível em `https://<seu-usuario>.github.io/REDAME/`.

## Como editar o jogo

Quase tudo é texto, em `dados/`:

| Arquivo | O que tem |
|---|---|
| `dados/config.json` | Lista de mapas, roteiros e minigames. Em `nome_protagonista`, escreva um nome para o jogo não perguntar. |
| `dados/roteiros/*.json` | Todos os diálogos e eventos. |
| `dados/mapas/*.json` | Os mapas, desenhados com caracteres. |
| `dados/personagens.json` | Nome, retrato e "voz" (tom dos bipes) de cada personagem. |
| `dados/itens.json` | Nome e descrição dos itens. |
| `dados/pioneiras.json` | As 15 pioneiras e o texto das páginas da Caderneta. |
| `dados/materiais.json` | Materiais, peças e receitas da bancada de montagem. |
| `dados/inimigos.json` | Tipos de inimigo: vida, dano, velocidade, comportamento e o que soltam. |
| `dados/minigames/*.json` | Os níveis do minigame das tubulações. |

Depois de editar, rode o validador. Ele aponta roteiro inexistente, personagem errado, letra que a fonte não tem, puzzle sem solução etc.:

```bash
npm run validar
```

Se mexer no código em `jogo/`, gere o pacote `jogo.js` de novo (é ele que a página carrega):

```bash
npm install
```

```bash
npm run build
```

### Comandos dos roteiros

Cada roteiro é uma lista de comandos:

| Comando | Exemplo |
|---|---|
| `fala <personagem> <emoção> <texto>` | `fala enedina determinada Vamos ligar essa usina!` |
| `narra <texto>` | `narra O vento frio atravessa a praça.` |
| `flag <nome>` / `desflag <nome>` | `flag conheceu_enedina` |
| `somar <variável> <n>` / `definir <variável> <n>` | `somar apoio 1` |
| `dar <item>` / `tirar <item>` | `dar teodolito` |
| `coletar <material> [n]` / `gastar <material> [n]` | `gastar valvula 2` |
| `bancada` | abre a bancada de montagem |
| `coracao` / `curar` | +1 coração máximo / recupera vida e energia |
| `objetivo <texto>` | `objetivo Encontre o Zé. Operários: {v:apoio}/3` |
| `se <condição> => <roteiro> \| <senão>` | `se apoio>=3 item:plantas => pronta \| ainda_nao` |
| `rodar <roteiro>` | `rodar objetivo_fase1` |
| `ir <mapa> <chegada>` | `ir usina entrada` |
| `andar <ator> <x> <y> [velocidade]` | `andar helena 15 7` |
| `olhar <ator> <direção>` | `olhar helena dir` |
| `minigame <id>` | `minigame canos_fase01` |
| `gravar <pioneira>` | `gravar enedina` |
| `caderneta`, `revisor`, `fimdemo`, `salvar`, `nome` | abrem as telas correspondentes |
| `som <efeito>`, `musica <faixa>`, `tremer <s>`, `flash`, `esperar <s>`, `fade sair\|entrar`, `aviso <texto>`, `titulo <texto>` | efeitos |

Emoções dos retratos: `neutro`, `feliz`, `determinada`, `cansada`, `surpresa`, `triste`, `cetica`.
No texto, `{nome}` vira o nome da protagonista e `{v:variavel}` vira o valor da variável (`{v:mat:valvula}` mostra quantas válvulas você tem).
Nas condições, `mat:ferro>=2` confere a quantidade de um material.

Para uma escolha (quiz), use um objeto:

```json
{"escolha": "O que é um teodolito?", "quem": "rui", "emocao": "neutro",
 "opcoes": [["Um instrumento que mede ângulos", "rui_certo"], ["Um remédio", "rui_errado"]]}
```

### Legenda dos mapas

Cada caractere de `linhas` é um quadrado de 16×16 pixels:

| Caractere | Chão | Caractere | Chão |
|---|---|---|---|
| `.` | grama | `#` | parede (sólida) |
| `"` | grama com flores | `+` | topo de parede (sólido) |
| `=` | rua de paralelepípedos | `m` | parede moderna (sólida) |
| `-` | calçada de petit-pavé | `&` | rocha (sólida) |
| `_` | piso de praça | `%` | face de rocha (sólida) |
| `:` | terra | `c` | concreto |
| `;` | areia | `g` | grade metálica |
| `~` | água (sólida) | `k` | canteiro |
| `w` | madeira | `r` | trilho de bonde |
| `t` | tapete | `z` | azulejo |
| `p` | chapa de aço | `y` / `v` | cabo amarelo no chão (horizontal / vertical) |

Letras maiúsculas, números e outros símbolos são entidades definidas em `legenda`: `npc`, `obj`, `item`, `coleta` (ponto de coleta de material, com `mat`, `qtd` e o sprite `obj`), `carro`, `spawn` (ponto de chegada), `portal`, `gatilho`, `inspecao` e `barreira`. No mapa, `ao_coletar` roda um roteiro a cada coleta (útil para atualizar o objetivo).

Inimigos entram no mapa como `{"tipo": "inimigo", "inimigo": "drone"}`. Um chefe usa ainda `flag` (marcada ao vencer), `roteiro_derrota` e só age enquanto a variável `chefe_ativo` estiver ligada (troque com `ativar`).

Outras opções do mapa:
- `luz`: deixa o mapa escuro, por exemplo `{"escuridao": 0.6, "jogadora": 60}`.
- `renascer`: ponto de chegada para onde a protagonista volta ao desmaiar.
- `ao_desmaiar`: roteiro que roda nesse momento (por exemplo, para desligar a arena do chefe). O campo `se` define quando a entidade aparece. O campo `roteiro` pode ser um nome ou uma lista de variantes com condição.

### Níveis do minigame das tubulações

Cada nível em `dados/minigames/canos_fase01.json` pode ser desenhado à mão (`linhas`, já resolvido) ou gerado (`gerar`):

```json
{"vazamento": true, "tempo": 200, "gerar": {"w": 9, "h": 5, "turbinas": 3, "bloqueios": 4, "travadas": 3}}
```

- `vazamento`: todo cano com água precisa estar ligado dos dois lados.
- `tempo`: segundos até a pressão estourar (sem `tempo`, não há pressão).
- `gerar`: largura (até 12), altura (até 5), turbinas, rochas e peças travadas.
- Nos níveis à mão, as pontas são `╵ ╶ ╷ ╴` e `travadas` lista as peças fixas: `[[x, y], ...]`.

O validador gera 300 tabuleiros de cada nível e confere se todos têm solução.

### Arte

Toda a arte é provisória e foi gerada por `Ferramentas/gerar_arte.py`. Para trocar por arte feita à mão, substitua o PNG em `arte/` mantendo o mesmo nome e tamanho:

- Personagens: folha de 48×72, com 3 quadros (parado, passo, passo) × 3 direções (frente, costas, lado direito).
- Retratos: 48×48 por emoção, 7 emoções lado a lado.
- Tiles: `arte/tiles.png`, grade de 16×16.

Para gerar tudo de novo (requer Pillow):

```bash
npm run arte
```

## Estrutura

```
index.html            página do jogo
jogo.js               jogo empacotado (gerado por npm run build)
jogo/                 código-fonte (motor, mundo, roteiros, interface, minigame, som)
dados/                conteúdo editável (JSON)
arte/                 imagens em pixel art
Ferramentas/          gerador de arte, validador e a fonte Tiny5
```

## Próximas épocas (planejadas)

| # | Cidade | Pioneira | Mecânica |
|---|---|---|---|
| 2 | Nova York | Emily Warren Roebling | Equilibrar cargas e cabos da Ponte do Brooklyn |
| 3 | Boston | Ellen Swallow Richards | Puzzle de fluxo para mapear toxinas e levar água limpa |
| 4 | Hampton | Mary Jackson | Furtividade e alinhamento de dados do túnel de vento |
| 5 | Farnborough | Beatrice Shilling | Ritmo: encaixar o restritor na zona verde de pressão |
| 6 | Cambridge (EUA) | Margaret Hamilton | Blocos caindo: descartar alarmes e processar o pouso |
| 7 | Greenbelt | Aprille Ericsson-Jackson | Disparar lasers do satélite no tempo certo |
| 8 | Los Angeles | Hedy Lamarr | Salto de frequência no ritmo certo |
| 9 | Schenectady | Edith Clarke | Ligar nós de uma rede elétrica |
| 10 | Montclair | Lillian Gilbreth | Sokoban para reorganizar a fábrica |
| 11 | Wilmington | Stephanie Kwolek | Trançar polímeros (Kevlar) |
| 12 | Pasadena | Frances Arnold | Ligar cadeias de DNA na evolução dirigida |
| 13 | Boston (MIT) | Sangeeta Bhatia | Tangram de células na microplaca |
| 14 | Nova York | Nina Tandon | Conta-gotas com controle de tempo e temperatura |
| 15 | Cambridge (EUA) | Evelyn Wang | Girar espelhos para o extrator de água solar |

## Sobre os fatos históricos

Os textos sobre Enedina Alves Marques foram escritos com cuidado, mas vale uma revisão antes de usar o jogo em aula. Os diálogos são ficção inspirada na história real. Os personagens de Curitiba e da usina (exceto Enedina) são inventados.

## Créditos

- Fonte do jogo: [Tiny5](https://github.com/Gissio/font_tiny5), licença SIL Open Font License (`Ferramentas/Tiny5-OFL.txt`).
- Fonte da página: Pixelify Sans, via Google Fonts (SIL Open Font License).
