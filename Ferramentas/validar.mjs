// REDAME - validador de conteudo. Uso: node Ferramentas/validar.mjs
// Confere roteiros, mapas, personagens, itens, puzzles e cobertura da fonte.
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { COMANDOS, partesSe } from "../jogo/roteiro.js";
import { TILES } from "../jogo/mundo.js";
import { montarNivel, resolvido, embaralhar, fluxo } from "../jogo/canos.js";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const ler = (p) => JSON.parse(readFileSync(join(RAIZ, "dados", p + ".json"), "utf8"));
const erros = [];
const avisos = [];
const erro = (m) => erros.push(m);
const aviso = (m) => avisos.push(m);

const config = ler("config");
const arte = ler("arte");
const fonte = ler("fonte");
const pers = ler("personagens");
const itens = ler("itens");
const pioneiras = ler("pioneiras").pioneiras;
const mapas = Object.fromEntries(config.mapas.map((m) => [m, ler("mapas/" + m)]));
const minis = Object.fromEntries(config.minigames.map((m) => [m, ler("minigames/" + m)]));
const roteiros = {};
for (const f of config.roteiros) {
  const r = ler("roteiros/" + f);
  for (const k of Object.keys(r)) if (roteiros[k]) erro(`Roteiro duplicado: ${k}`);
  Object.assign(roteiros, r);
}
const arquivos = new Set(arte.arquivos);
for (const f of readdirSync(join(RAIZ, "arte"))) if (f.endsWith(".png") && !arquivos.has(f.slice(0, -4))) aviso(`PNG fora do manifesto: ${f}`);
const EMOCOES = new Set(arte.emocoes);
const EFEITOS = new Set(["blip", "cursor", "confirmar", "voltar", "item", "erro", "girar", "agua", "turbina", "sucesso", "revisor", "brilho", "porta", "tremor", "passo"]);
const MUSICAS = new Set(["titulo", "acervo", "curitiba", "usina", "revisor", "nada"]);
const DIRS = new Set(["baixo", "cima", "esq", "dir"]);
const glifos = new Set(fonte.glifos.map((g) => g.c));
const faltando = new Map();
const textos = [];
const usados = new Set();

function checarTexto(t, onde) {
  textos.push(t);
  for (const ch of t.replace(/\{nome\}|\{v:\w+\}/g, "")) {
    if (!glifos.has(ch.codePointAt(0))) faltando.set(ch, onde);
  }
}

function refRoteiro(id, onde) {
  if (!id) return;
  usados.add(id);
  if (!roteiros[id]) erro(`${onde}: roteiro inexistente "${id}"`);
}

function refVariantes(r, onde) {
  if (!r) return;
  if (typeof r === "string") return refRoteiro(r, onde);
  for (const v of r) refRoteiro(v.r, onde);
}

// ------------------------------------------------------------- mapas
const atores = new Set(["jogador", "protagonista"]);
const spawns = {};
for (const [id, m] of Object.entries(mapas)) {
  spawns[id] = new Set();
  const w = m.linhas[0].length;
  m.linhas.forEach((l, y) => { if ([...l].length !== w) erro(`Mapa ${id}: linha ${y} tem largura ${[...l].length}, esperado ${w}`); });
  if (!TILES[m.chao]) erro(`Mapa ${id}: chão padrão desconhecido "${m.chao}"`);
  const usadosLeg = new Set();
  m.linhas.forEach((l, y) => [...l].forEach((ch, x) => {
    if (TILES[ch]) return;
    const e = m.legenda[ch];
    if (!e) return erro(`Mapa ${id}: símbolo sem legenda "${ch}" em ${x},${y}`);
    usadosLeg.add(ch);
  }));
  for (const [ch, e] of Object.entries(m.legenda)) {
    const onde = `Mapa ${id} "${ch}"`;
    if (TILES[ch]) erro(`${onde}: símbolo de legenda conflita com um tile`);
    if (!usadosLeg.has(ch)) aviso(`${onde}: símbolo na legenda mas não no mapa`);
    if (e.chao && !TILES[e.chao]) erro(`${onde}: chão desconhecido "${e.chao}"`);
    switch (e.tipo) {
      case "obj":
      case "carro":
        if (!arte.objetos[e.obj]) erro(`${onde}: objeto desconhecido "${e.obj}"`);
        break;
      case "npc":
        if (!arquivos.has("pers_" + e.sprite)) erro(`${onde}: sprite desconhecido "${e.sprite}"`);
        if (e.id) atores.add(e.id);
        break;
      case "item":
        if (!itens[e.item]) erro(`${onde}: item desconhecido "${e.item}"`);
        break;
      case "spawn":
        spawns[id].add(e.nome);
        break;
      case "portal":
      case "gatilho":
      case "inspecao":
      case "barreira":
        break;
      default:
        erro(`${onde}: tipo desconhecido "${e.tipo}"`);
    }
    refVariantes(e.roteiro, onde);
    if (e.bloqueado) refRoteiro(e.bloqueado, onde);
    if (e.dir && !DIRS.has(e.dir)) erro(`${onde}: direção inválida "${e.dir}"`);
  }
  refVariantes(m.ao_entrar, `Mapa ${id} ao_entrar`);
  if (m.nome) checarTexto(m.nome, `mapa ${id}`);
}
for (const [id, m] of Object.entries(mapas)) {
  for (const e of Object.values(m.legenda)) {
    if (e.tipo === "portal") {
      if (!mapas[e.para]) erro(`Mapa ${id}: portal para mapa inexistente "${e.para}"`);
      else if (!spawns[e.para].has(e.chegada)) erro(`Mapa ${id}: portal para chegada inexistente "${e.para}/${e.chegada}"`);
    }
  }
}

// ------------------------------------------------------------- personagens, itens, pioneiras
for (const [id, p] of Object.entries(pers)) {
  if (p.retrato && !arquivos.has("ret_" + p.retrato)) erro(`Personagem ${id}: retrato inexistente "${p.retrato}"`);
  checarTexto(p.nome, `personagem ${id}`);
}
for (const [id, it] of Object.entries(itens)) {
  if (!arquivos.has("item_" + id)) erro(`Item ${id}: ícone item_${id}.png não existe`);
  checarTexto(it.nome, `item ${id}`);
  checarTexto(it.desc, `item ${id}`);
}
if (pioneiras.length !== 15) erro(`Esperadas 15 pioneiras, encontradas ${pioneiras.length}`);
for (const p of pioneiras) {
  for (const k of ["nome", "local", "area", "obra", "anos", "local_completo"]) if (p[k]) checarTexto(p[k], `pioneira ${p.id}`);
  (p.curiosidades || []).forEach((c) => checarTexto(c, `pioneira ${p.id}`));
  if (p.mapa && (!mapas[p.mapa] || !spawns[p.mapa].has(p.chegada))) erro(`Pioneira ${p.id}: mapa/chegada inválidos`);
  if (p.retrato && !arquivos.has("ret_" + p.retrato)) erro(`Pioneira ${p.id}: retrato inexistente`);
}

// ------------------------------------------------------------- roteiros
for (const [id, cmds] of Object.entries(roteiros)) {
  cmds.forEach((c, i) => {
    const onde = `Roteiro ${id}[${i}]`;
    if (typeof c === "object") {
      if (c.escolha === undefined || !Array.isArray(c.opcoes)) return erro(`${onde}: objeto de comando inválido`);
      checarTexto(c.escolha, onde);
      if (c.quem && !pers[c.quem]) erro(`${onde}: personagem inexistente "${c.quem}"`);
      if (c.emocao && !EMOCOES.has(c.emocao)) erro(`${onde}: emoção inválida "${c.emocao}"`);
      for (const [t, alvo] of c.opcoes) {
        checarTexto(t, onde);
        refRoteiro(alvo, onde);
      }
      return;
    }
    const s = String(c).trim();
    const esp = s.indexOf(" ");
    const cmd = esp < 0 ? s : s.slice(0, esp);
    const resto = esp < 0 ? "" : s.slice(esp + 1).trim();
    const a = resto ? resto.split(/\s+/) : [];
    const def = COMANDOS[cmd];
    if (!def) return erro(`${onde}: comando desconhecido "${cmd}"`);
    if (a.length < def.min) return erro(`${onde}: "${cmd}" precisa de ${def.min} argumento(s)`);
    switch (cmd) {
      case "fala":
        if (!pers[a[0]]) erro(`${onde}: personagem inexistente "${a[0]}"`);
        if (!EMOCOES.has(a[1])) erro(`${onde}: emoção inválida "${a[1]}"`);
        checarTexto(a.slice(2).join(" "), onde);
        break;
      case "narra":
      case "objetivo":
      case "titulo":
      case "aviso":
        checarTexto(resto, onde);
        break;
      case "dar":
      case "tirar":
        if (!itens[a[0]]) erro(`${onde}: item inexistente "${a[0]}"`);
        break;
      case "rodar":
        refRoteiro(a[0], onde);
        break;
      case "se": {
        const p = partesSe(resto);
        if (!p.sim) erro(`${onde}: "se" sem "=>"`);
        refRoteiro(p.sim, onde);
        if (p.nao) refRoteiro(p.nao, onde);
        break;
      }
      case "ir":
        if (!mapas[a[0]]) erro(`${onde}: mapa inexistente "${a[0]}"`);
        else if (!spawns[a[0]].has(a[1])) erro(`${onde}: chegada inexistente "${a[0]}/${a[1]}"`);
        break;
      case "som":
        if (!EFEITOS.has(a[0])) erro(`${onde}: efeito sonoro inexistente "${a[0]}"`);
        break;
      case "musica":
        if (!MUSICAS.has(a[0])) erro(`${onde}: música inexistente "${a[0]}"`);
        break;
      case "minigame":
        if (!minis[a[0]]) erro(`${onde}: minigame inexistente "${a[0]}"`);
        break;
      case "gravar":
      case "caderneta":
        if (a[0] && !pioneiras.find((p) => p.id === a[0])) erro(`${onde}: pioneira inexistente "${a[0]}"`);
        break;
      case "andar":
      case "partir":
      case "olhar":
        if (!atores.has(a[0])) erro(`${onde}: ator inexistente "${a[0]}"`);
        if (cmd === "olhar" && !DIRS.has(a[1])) erro(`${onde}: direção inválida "${a[1]}"`);
        break;
    }
  });
}
for (const id of Object.keys(roteiros)) if (!usados.has(id) && id !== "inicio") aviso(`Roteiro nunca usado: ${id}`);

// ------------------------------------------------------------- minigames
for (const [id, m] of Object.entries(minis)) {
  m.niveis.forEach((n, k) => {
    const onde = `Minigame ${id} nível ${k + 1}`;
    let nivel;
    try {
      nivel = montarNivel(n.linhas);
    } catch (e) {
      return erro(`${onde}: ${e.message}`);
    }
    for (const c of nivel.cel) {
      if ((c.tipo === "fonte" || c.tipo === "turbina") && c.conns.length !== 1) erro(`${onde}: ${c.tipo} em ${c.x},${c.y} tem ${c.conns.length} conexões (esperado 1)`);
    }
    if (!resolvido(nivel)) erro(`${onde}: a solução desenhada não leva água a todas as turbinas`);
    const alcance = fluxo(nivel).size;
    embaralhar(nivel);
    if (resolvido(nivel)) erro(`${onde}: o embaralhamento deixou o nível resolvido`);
    if (n.fala) {
      const [quem, emo, texto] = n.fala.split("|");
      if (!pers[quem]) erro(`${onde}: personagem inexistente "${quem}"`);
      if (!EMOCOES.has(emo)) erro(`${onde}: emoção inválida "${emo}"`);
      checarTexto(texto, onde);
    }
    if (nivel.w > 9 || nivel.h > 4) erro(`${onde}: tabuleiro ${nivel.w}x${nivel.h} maior que 9x4`);
    void alcance;
  });
  checarTexto(m.titulo, `minigame ${id}`);
}

// ------------------------------------------------------------- relatorio
for (const [ch, onde] of faltando) erro(`Fonte sem o caractere "${ch}" (U+${ch.codePointAt(0).toString(16)}) usado em ${onde}`);
console.log(`Roteiros: ${Object.keys(roteiros).length} · Mapas: ${Object.keys(mapas).length} · Textos conferidos: ${textos.length}`);
for (const a of avisos) console.log("aviso:", a);
for (const e of erros) console.log("ERRO:", e);
if (erros.length) {
  console.log(`\n${erros.length} erro(s).`);
  process.exit(1);
}
console.log("Tudo certo.");
