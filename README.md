# REDAME: O Resgate do Legado

Aventura em pixel art para navegador. Uma estudante de engenharia encontra o **Revisor de Épocas**, um aparelho que liga o presente ao passado, e viaja no tempo para resgatar a história de 15 engenheiras pioneiras que o **Esquecimento** está apagando.

Roda em qualquer navegador (computador ou celular), sem instalar nada.

## O que já está pronto

- **Prólogo:** o acervo da universidade nos dias atuais, a Profa. Helena e a descoberta do Revisor de Épocas.
- **Época 1, Curitiba (anos 1940), com Enedina Alves Marques:**
  - Cidade aberta: Praça Santos Andrade, prédio histórico da Universidade do Paraná, Colégio Estadual, Departamento de Águas, canteiro de obras, bondes e carros.
  - A cidade começa cinza (efeito do Esquecimento) e ganha cor conforme você ajuda Enedina.
  - Missões: recuperar o registro de formatura, buscar o teodolito, conquistar o apoio dos operários (com quiz de engenharia).
  - Usina Capivari-Cachoeira: inspeção das galerias subterrâneas e o minigame de girar as tubulações (3 níveis).
  - Discurso final da Enedina, cerimônia do nome gravado no Dispositivo REDAME e página na Caderneta.
- **Caderneta REDAME** com as 15 pioneiras (páginas reveladas conforme o resgate).
- **Revisor de Épocas** para escolher épocas (as outras 14 aparecem como "em breve").
- Salvamento automático no navegador, música e efeitos sonoros gerados pelo próprio jogo, controles de toque no celular e suporte a controle (gamepad).

## Como jogar

| Ação | Teclado | Celular |
|---|---|---|
| Andar | Setas ou WASD | Direcional |
| Falar, pegar, confirmar | Espaço, Enter, Z ou E | A |
| Correr, voltar | Shift ou X | B |
| Menu (Caderneta, itens, som, salvar) | Esc | Menu |
| Girar cano ao contrário (minigame) | Q | — |

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
No texto, `{nome}` vira o nome da protagonista e `{v:variavel}` vira o valor da variável.

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

Letras maiúsculas, números e outros símbolos são entidades definidas em `legenda`: `npc`, `obj`, `item`, `carro`, `spawn` (ponto de chegada), `portal`, `gatilho`, `inspecao` e `barreira`. O campo `se` define quando a entidade aparece. O campo `roteiro` pode ser um nome ou uma lista de variantes com condição.

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
