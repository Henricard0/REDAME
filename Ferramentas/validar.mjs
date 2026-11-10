// REDAME - validador de conteudo. Uso: node Ferramentas/validar.mjs
// Confere roteiros, mapas, personagens, itens, puzzles e cobertura da fonte.
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { COMANDOS, partesSe } from "../jogo/roteiro.js";
import { TILES } from "../jogo/mundo.js";
import { montarNivel, gerarNivel, resolvido, embaralhar, vazamentos, aleatorio } from "../jogo/canos.js";

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
const materiais = ler("materiais");
const MATS = materiais.materiais;
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
      case "coleta":
        if (!MATS[e.mat]) erro(`${onde}: material desconhecido "${e.mat}"`);
        if (!arte.objetos[e.obj]) erro(`${onde}: objeto desconhecido "${e.obj}"`);
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

// ------------------------------------------------------------- materiais e receitas
for (const [id, m] of Object.entries(MATS)) {
  if (!arquivos.has("mat_" + id)) erro(`Material ${id}: ícone mat_${id}.png não existe`);
  checarTexto(m.nome, `material ${id}`);
  checarTexto(m.desc, `material ${id}`);
}
for (const r of materiais.receitas) {
  if (!MATS[r.produz]) erro(`Receita: produto desconhecido "${r.produz}"`);
  for (const m of Object.keys(r.precisa)) if (!MATS[m]) erro(`Receita ${r.produz}: material desconhecido "${m}"`);
}
function checarCondicao(cond, onde) {
  for (const t of String(cond || "").split(/\s+/)) {
    const m = /^!?mat:(\w+)/.exec(t);
    if (m && !MATS[m[1]]) erro(`${onde}: material desconhecido na condição "${t}"`);
  }
}
// Quanto de cada material basico e preciso para montar uma lista de pecas
function custoBase(pecas) {
  const total = {};
  const somar = (m, n) => {
    const r = materiais.receitas.find((x) => x.produz === m);
    if (!r) { total[m] = (total[m] || 0) + n; return; }
    for (const [b, q] of Object.entries(r.precisa)) somar(b, q * Math.ceil(n / (r.qtd || 1)));
  };
  for (const [m, n] of Object.entries(pecas)) somar(m, n);
  return total;
}
const disponivel = {};
for (const [id, m] of Object.entries(mapas)) {
  disponivel[id] = {};
  for (const e of Object.values(m.legenda)) if (e.tipo === "coleta") {
    const n = [...m.linhas.join("")].filter((ch) => m.legenda[ch] === e).length;
    disponivel[id][e.mat] = (disponivel[id][e.mat] || 0) + n * (e.qtd || 1);
  }
}
for (const m of Object.values(mapas)) {
  for (const e of Object.values(m.legenda)) checarCondicao(e.se, `Mapa ${m.id}`);
  for (const v of Array.isArray(m.ao_entrar) ? m.ao_entrar : []) checarCondicao(v.se, `Mapa ${m.id}`);
  if (m.ao_coletar) refRoteiro(m.ao_coletar, `Mapa ${m.id} ao_coletar`);
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
      case "coletar":
      case "gastar":
        if (!MATS[a[0]]) erro(`${onde}: material inexistente "${a[0]}"`);
        break;
      case "rodar":
        refRoteiro(a[0], onde);
        break;
      case "se": {
        const p = partesSe(resto);
        checarCondicao(p.cond, onde);
        // condicoes que pedem pecas: da para juntar os materiais no mapa que as usa?
        const pecas = {};
        for (const t of p.cond.split(/\s+/)) {
          const mm = /^mat:(\w+)>=(\d+)$/.exec(t);
          if (mm && MATS[mm[1]]?.peca) pecas[mm[1]] = +mm[2];
        }
        if (Object.keys(pecas).length) {
          const precisa = custoBase(pecas);
          const tot = {};
          for (const d of Object.values(disponivel)) for (const [k, v] of Object.entries(d)) tot[k] = (tot[k] || 0) + v;
          for (const [k, v] of Object.entries(precisa)) {
            if ((tot[k] || 0) < v) erro(`${onde}: precisa de ${v} ${k} para as peças, mas os mapas só têm ${tot[k] || 0}`);
          }
          console.log(`Peças em ${id}: precisa ${JSON.stringify(precisa)} · disponível ${JSON.stringify(tot)}`);
        }
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
    const regra = !!n.vazamento;
    const sementes = n.gerar ? 300 : 1;
    let piorTurb = Infinity;
    for (let s = 1; s <= sementes; s++) {
      let nivel;
      try {
        nivel = n.gerar ? gerarNivel(n.gerar, s * 2654435761) : montarNivel(n);
      } catch (e) {
        return erro(`${onde}: ${e.message}`);
      }
      for (const c of nivel.cel) {
        if ((c.tipo === "fonte" || c.tipo === "turbina") && c.conns.length !== 1) erro(`${onde}: ${c.tipo} em ${c.x},${c.y} tem ${c.conns.length} conexões (esperado 1)`);
      }
      const turb = nivel.cel.filter((c) => c.tipo === "turbina").length;
      piorTurb = Math.min(piorTurb, turb);
      if (n.gerar && turb !== n.gerar.turbinas) erro(`${onde} (semente ${s}): ${turb} turbinas, esperado ${n.gerar.turbinas}`);
      if (!resolvido(nivel, regra)) {
        erro(`${onde}${n.gerar ? ` (semente ${s})` : ""}: a solução não leva água a todas as turbinas${regra ? " sem vazamentos" : ""} (${vazamentos(nivel).length} vazamentos)`);
        break;
      }
      embaralhar(nivel, regra, aleatorio(s));
      if (resolvido(nivel, regra)) erro(`${onde}: o embaralhamento deixou o nível resolvido (semente ${s})`);
      if (nivel.w > 12 || nivel.h > 5) erro(`${onde}: tabuleiro ${nivel.w}x${nivel.h} maior que 12x5`);
    }
    if (n.gerar) console.log(`${onde}: ${sementes} tabuleiros gerados e conferidos`);
    if (n.fala) {
      const [quem, emo, texto] = n.fala.split("|");
      if (!pers[quem]) erro(`${onde}: personagem inexistente "${quem}"`);
      if (!EMOCOES.has(emo)) erro(`${onde}: emoção inválida "${emo}"`);
      checarTexto(texto, onde);
    }
    void piorTurb;
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
