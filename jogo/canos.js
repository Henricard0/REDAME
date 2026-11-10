// REDAME - minigame das tubulacoes (Fase 1: Usina Capivari-Cachoeira).
// Gire os canos para levar a agua da represa (A) ate todas as turbinas (T).
//
// Niveis desenhados a mao vem ja resolvidos, com caracteres de caixa:
//   │ ─ └ ┌ ┐ ┘ ├ ┤ ┬ ┴ ┼    pontas (tampoes): ╵ ╶ ╷ ╴
//   A = represa   T = turbina   # = rocha   . = vazio
// Niveis com "gerar" sao criados por algoritmo (arvore geradora): sempre tem solucao.
// Regras opcionais por nivel: "vazamento" (todo cano molhado precisa estar ligado
// dos dois lados), "tempo" (segundos ate a pressao estourar) e "travadas" (pecas fixas).
import { LARG, ALT, COR } from "./base.js";
import { Camada, Dialogo, Menu } from "./ui.js";

const VIZ = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // N L S O
const BASE = { reto: [0, 2], curva: [0, 1], te: [0, 1, 2], cruz: [0, 1, 2, 3], ponta: [0] };
const SIMBOLOS = {
  "│": [0, 2], "─": [1, 3], "└": [0, 1], "┌": [1, 2], "┐": [2, 3], "┘": [0, 3],
  "├": [0, 1, 2], "┤": [0, 2, 3], "┬": [1, 2, 3], "┴": [0, 1, 3], "┼": [0, 1, 2, 3],
  "╵": [0], "╶": [1], "╷": [2], "╴": [3],
};
const INDICE = { reto: 0, curva: 1, te: 2, cruz: 3, fonte: 4, turbina: 5, base: 6, bloqueio: 7, ponta: 8 };

const girar = (lista, r) => lista.map((d) => (d + r) % 4).sort();
const iguais = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

export function aleatorio(semente) {
  let s = semente >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tipoPorConexoes(conns) {
  const n = conns.length;
  if (n === 1) return "ponta";
  if (n === 4) return "cruz";
  if (n === 3) return "te";
  return conns[1] - conns[0] === 2 ? "reto" : "curva";
}

function encaixar(c, conns) {
  c.tipo = tipoPorConexoes(conns);
  for (let r = 0; r < 4; r++) if (iguais(girar(BASE[c.tipo], r), conns)) { c.sol = r; break; }
  c.rot = c.sol;
  c.fixa = c.tipo === "cruz";
}

function orientarFixas(nivel) {
  for (const c of nivel.cel) {
    if (c.tipo !== "fonte" && c.tipo !== "turbina") continue;
    const base = c.tipo === "fonte" ? 2 : 0;
    c.rot = c.conns.length ? (c.conns[0] - base + 4) % 4 : 0;
  }
}

export function montarNivel(def) {
  const linhas = Array.isArray(def) ? def : def.linhas;
  const grade = linhas.map((l) => [...l]);
  const h = grade.length;
  const w = Math.max(...grade.map((l) => l.length));
  const cel = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = grade[y][x] || ".";
      const c = { x, y, tipo: "base", rot: 0, sol: 0, fixa: true, conns: [] };
      if (SIMBOLOS[ch]) encaixar(c, [...SIMBOLOS[ch]].sort());
      else if (ch === "A") c.tipo = "fonte";
      else if (ch === "T") c.tipo = "turbina";
      else if (ch === "#") c.tipo = "bloqueio";
      else if (ch !== "." && ch !== " ") throw new Error(`Símbolo desconhecido no nível de canos: "${ch}"`);
      cel.push(c);
    }
  }
  const nivel = { w, h, cel };
  // represa e turbinas ligam-se aos vizinhos que apontam para elas na solucao
  for (const c of cel) {
    if (c.tipo !== "fonte" && c.tipo !== "turbina") continue;
    for (let d = 0; d < 4; d++) {
      const v = celula(nivel, c.x + VIZ[d][0], c.y + VIZ[d][1]);
      if (v && BASE[v.tipo] && girar(BASE[v.tipo], v.sol).includes((d + 2) % 4)) c.conns.push(d);
    }
  }
  orientarFixas(nivel);
  for (const [x, y] of (Array.isArray(def) ? [] : def.travadas || [])) {
    const c = celula(nivel, x, y);
    if (c && BASE[c.tipo]) c.fixa = c.travada = true;
  }
  return nivel;
}

// Gera um nivel no estilo "rede": uma arvore que cobre todas as celulas abertas.
// A represa e as turbinas sao folhas da arvore; as outras folhas viram pontas.
export function gerarNivel(o, semente) {
  const r = aleatorio(semente);
  const { w, h } = o;
  const qtdTurbinas = o.turbinas || 2;
  for (let tentativa = 0; tentativa < 400; tentativa++) {
    const bloq = new Set();
    while (bloq.size < (o.bloqueios || 0)) bloq.add(Math.floor(r() * w * h));
    const abertas = [];
    for (let i = 0; i < w * h; i++) if (!bloq.has(i)) abertas.push(i);
    const viz = (i) => {
      const x = i % w;
      const y = Math.floor(i / w);
      const lista = [];
      for (let d = 0; d < 4; d++) {
        const nx = x + VIZ[d][0];
        const ny = y + VIZ[d][1];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (!bloq.has(j)) lista.push([d, j]);
      }
      return lista;
    };
    // arvore geradora aleatoria (Prim)
    const conns = Array.from({ length: w * h }, () => []);
    const inicio = abertas[Math.floor(r() * abertas.length)];
    const na = new Set([inicio]);
    const borda = viz(inicio).map(([d, j]) => [inicio, d, j]);
    while (borda.length) {
      const k = Math.floor(r() * borda.length);
      const [a, d, b] = borda[k];
      borda[k] = borda[borda.length - 1];
      borda.pop();
      if (na.has(b)) continue;
      conns[a].push(d);
      conns[b].push((d + 2) % 4);
      na.add(b);
      for (const [d2, j] of viz(b)) if (!na.has(j)) borda.push([b, d2, j]);
    }
    if (na.size !== abertas.length) continue; // rochas separaram o tabuleiro
    const folhas = abertas.filter((i) => conns[i].length === 1);
    if (folhas.length < qtdTurbinas + 1) continue;
    // represa: uma folha na metade esquerda
    const esquerda = folhas.filter((i) => i % w < Math.ceil(w / 3));
    if (!esquerda.length) continue;
    const fonte = esquerda[Math.floor(r() * esquerda.length)];
    // turbinas: folhas longe da represa (na metade mais distante)
    const dist = new Map([[fonte, 0]]);
    const fila = [fonte];
    while (fila.length) {
      const a = fila.shift();
      for (const d of conns[a]) {
        const b = a + VIZ[d][0] + VIZ[d][1] * w;
        if (!dist.has(b)) {
          dist.set(b, dist.get(a) + 1);
          fila.push(b);
        }
      }
    }
    const candidatas = folhas.filter((i) => i !== fonte).sort((a, b) => dist.get(b) - dist.get(a));
    const metade = candidatas.slice(0, Math.max(qtdTurbinas, Math.ceil(candidatas.length * 0.6)));
    const turbinas = new Set();
    while (turbinas.size < qtdTurbinas) turbinas.add(metade[Math.floor(r() * metade.length)]);
    const cel = [];
    for (let i = 0; i < w * h; i++) {
      const c = { x: i % w, y: Math.floor(i / w), tipo: "base", rot: 0, sol: 0, fixa: true, conns: [] };
      if (bloq.has(i)) c.tipo = "bloqueio";
      else if (i === fonte) { c.tipo = "fonte"; c.conns = [...conns[i]]; }
      else if (turbinas.has(i)) { c.tipo = "turbina"; c.conns = [...conns[i]]; }
      else encaixar(c, [...conns[i]].sort());
      cel.push(c);
    }
    const nivel = { w, h, cel, gerado: true };
    orientarFixas(nivel);
    const giraveis = cel.filter((c) => BASE[c.tipo] && !c.fixa && c.tipo !== "reto");
    for (let k = 0; k < (o.travadas || 0) && giraveis.length; k++) {
      const c = giraveis.splice(Math.floor(r() * giraveis.length), 1)[0];
      c.fixa = c.travada = true;
    }
    return nivel;
  }
  throw new Error("Não consegui gerar um nível de canos com essas regras");
}

function celula(n, x, y) {
  if (x < 0 || y < 0 || x >= n.w || y >= n.h) return null;
  return n.cel[y * n.w + x];
}

export function aberturas(c) {
  if (c.tipo === "fonte" || c.tipo === "turbina") return c.conns;
  if (BASE[c.tipo]) return girar(BASE[c.tipo], c.rot);
  return [];
}

// Busca em largura a partir das represas. Devolve a distancia de cada celula molhada.
export function fluxo(n) {
  const dist = new Map();
  const fila = [];
  for (const c of n.cel) if (c.tipo === "fonte") { dist.set(c, 0); fila.push(c); }
  while (fila.length) {
    const c = fila.shift();
    if (c.tipo === "turbina") continue;
    for (const d of aberturas(c)) {
      const v = celula(n, c.x + VIZ[d][0], c.y + VIZ[d][1]);
      if (!v || dist.has(v)) continue;
      if (aberturas(v).includes((d + 2) % 4)) {
        dist.set(v, dist.get(c) + 1);
        fila.push(v);
      }
    }
  }
  return dist;
}

// Bocas abertas de canos molhados que nao encontram outro cano: a agua vaza ali.
export function vazamentos(n, dist = fluxo(n)) {
  const lista = [];
  for (const c of dist.keys()) {
    for (const d of aberturas(c)) {
      const v = celula(n, c.x + VIZ[d][0], c.y + VIZ[d][1]);
      if (!v || !aberturas(v).includes((d + 2) % 4)) lista.push({ c, d });
    }
  }
  return lista;
}

export function resolvido(n, regraVazamento = false, dist = fluxo(n)) {
  const turb = n.cel.filter((c) => c.tipo === "turbina");
  if (!turb.length || !turb.every((c) => dist.has(c))) return false;
  return !regraVazamento || vazamentos(n, dist).length === 0;
}

export function embaralhar(n, regraVazamento = false, aleat = Math.random) {
  const moveis = n.cel.filter((c) => BASE[c.tipo] && !c.fixa);
  for (let tent = 0; tent < 80; tent++) {
    for (const c of moveis) c.rot = Math.floor(aleat() * 4);
    const fora = moveis.filter((c) => !iguais(girar(BASE[c.tipo], c.rot), girar(BASE[c.tipo], c.sol))).length;
    if (!resolvido(n, regraVazamento) && fora >= Math.ceil(moveis.length * 0.6)) return;
  }
}

export function criarNivel(nd, semente) {
  return nd.gerar ? gerarNivel(nd.gerar, semente) : montarNivel(nd);
}

export class MiniCanos extends Camada {
  constructor(jogo, def) {
    super(jogo);
    this.cobreTudo = true;
    this.def = def;
    this.k = -1;
    this.gotas = [];
  }

  // chamado pelo jogo logo depois de empilhar esta camada
  iniciar() {
    this.proximo();
  }

  proximo() {
    this.k++;
    if (this.k >= this.def.niveis.length) {
      this.fechar(true);
      return;
    }
    this.falhas = 0;
    this.montar();
    const nd = this.def.niveis[this.k];
    if (nd.fala) {
      const [quem, emo, texto] = nd.fala.split("|");
      this.jogo.empilhar(new Dialogo(this.jogo, quem, emo, texto.replace(/\{nome\}/g, this.jogo.estado.nome)));
    }
  }

  montar(novoTabuleiro = true) {
    const nd = this.def.niveis[this.k];
    if (novoTabuleiro || !this.nivel) this.nivel = criarNivel(nd, (Date.now() ^ (this.k * 7919) ^ (this.falhas * 104729)) >>> 0);
    this.regra = !!nd.vazamento;
    this.tempo = nd.tempo || 0;
    this.decorrido = 0;
    this.giros = 0;
    this.dicas = 0;
    embaralhar(this.nivel, this.regra);
    const primeira = this.nivel.cel.find((c) => BASE[c.tipo] && !c.fixa);
    this.cx = primeira ? primeira.x : 0;
    this.cy = primeira ? primeira.y : 0;
    this.vitoria = 0;
    this.estouro = 0;
    this.molhado = new Map();
    this.vaz = [];
    this.recalcular(true);
  }

  recalcular(silencioso) {
    const dist = fluxo(this.nivel);
    const agora = this.t;
    const novo = new Map();
    let turbinaNova = false;
    for (const [c, d] of dist) {
      const antes = this.molhado.get(c);
      novo.set(c, antes !== undefined ? antes : agora + d * 0.04);
      if (antes === undefined && c.tipo === "turbina") turbinaNova = true;
    }
    this.molhado = novo;
    this.vaz = this.regra ? vazamentos(this.nivel, dist) : [];
    if (!silencioso && dist.size > 1) this.jogo.som.efeito("agua");
    if (turbinaNova && !silencioso) this.jogo.som.efeito("turbina");
    if (resolvido(this.nivel, this.regra, dist) && !this.vitoria) {
      this.vitoria = 0.0001;
      this.jogo.som.efeito("sucesso");
    }
  }

  geometria() {
    const tam = this.jogo.rec.img.mini_canos.height / 2;
    const bx = Math.floor((LARG - this.nivel.w * tam) / 2);
    const by = 36 + Math.floor((122 - this.nivel.h * tam) / 2);
    return { tam, bx, by };
  }

  girarCelula(c, sentido) {
    if (!c || !BASE[c.tipo] || c.fixa) {
      this.jogo.som.efeito("erro");
      return;
    }
    c.rot = (c.rot + sentido + 4) % 4;
    c.anim = -sentido;
    this.giros++;
    this.jogo.som.efeito("girar");
    this.recalcular(false);
  }

  dica() {
    const erradas = this.nivel.cel.filter((c) => BASE[c.tipo] && !c.fixa && !iguais(girar(BASE[c.tipo], c.rot), girar(BASE[c.tipo], c.sol)));
    if (!erradas.length) return;
    // prefere uma peca molhada ou vizinha da agua: a dica fica no caminho
    const perto = erradas.filter((c) => VIZ.some(([dx, dy]) => this.molhado.has(celula(this.nivel, c.x + dx, c.y + dy))));
    const lista = perto.length ? perto : erradas;
    const c = lista[Math.floor(Math.random() * lista.length)];
    c.rot = c.sol;
    c.anim = 1;
    c.dicaT = this.t;
    this.cx = c.x;
    this.cy = c.y;
    this.dicas++;
    if (this.tempo) this.decorrido += this.tempo * 0.1;
    this.jogo.som.efeito("confirmar");
    this.recalcular(false);
  }

  pausar() {
    const menu = new Menu(this.jogo, [
      { texto: "Continuar", acao: (m) => m.fechar() },
      { texto: "Recomeçar nível", acao: (m) => { m.fechar(); this.montar(false); } },
      { texto: "Pular este desafio", acao: (m) => { m.fechar(); this.vitoria = 1.6; } },
    ], { titulo: "Pausa", escurecer: 0.5 });
    this.jogo.empilhar(menu);
  }

  atualizar(dt, ent) {
    this.t += dt;
    for (const c of this.nivel.cel) if (c.anim) c.anim = Math.sign(c.anim) * Math.max(0, Math.abs(c.anim) - dt * 9);
    this.atualizarGotas(dt);
    if (this.vitoria) {
      this.vitoria += dt;
      if (this.vitoria > 2.2) this.proximo();
      return;
    }
    if (this.estouro) {
      this.estouro += dt;
      if (this.estouro > 2.2) {
        this.falhas++;
        this.montar(true);
      }
      return;
    }
    if (this.tempo) {
      this.decorrido += dt;
      if (this.decorrido >= this.tempo) {
        this.estouro = 0.0001;
        this.jogo.som.efeito("tremor");
        return;
      }
    }
    const n = this.nivel;
    if (ent.apertou("cima")) this.cy = (this.cy + n.h - 1) % n.h;
    if (ent.apertou("baixo")) this.cy = (this.cy + 1) % n.h;
    if (ent.apertou("esq")) this.cx = (this.cx + n.w - 1) % n.w;
    if (ent.apertou("dir")) this.cx = (this.cx + 1) % n.w;
    if (ent.apertou("acao")) this.girarCelula(celula(n, this.cx, this.cy), 1);
    if (ent.apertou("girarEsq")) this.girarCelula(celula(n, this.cx, this.cy), -1);
    if (ent.apertou("dica")) this.dica();
    const g = this.geometria();
    for (const cl of ent.cliques) {
      if (cl.y < 34 && cl.x > LARG - 60) {
        this.dica();
        continue;
      }
      const x = Math.floor((cl.x - g.bx) / g.tam);
      const y = Math.floor((cl.y - g.by) / g.tam);
      if (x >= 0 && y >= 0 && x < n.w && y < n.h) {
        this.cx = x;
        this.cy = y;
        this.girarCelula(celula(n, x, y), 1);
      }
    }
    if (ent.apertou("menu") || ent.apertou("voltar")) this.pausar();
  }

  atualizarGotas(dt) {
    const g = this.nivel && this.geometria();
    if (g && this.vaz.length && !this.vitoria) {
      for (const { c, d } of this.vaz) {
        if (Math.random() > dt * 14) continue;
        const cx = g.bx + c.x * g.tam + g.tam / 2 + VIZ[d][0] * (g.tam / 2);
        const cy = g.by + c.y * g.tam + g.tam / 2 + VIZ[d][1] * (g.tam / 2);
        this.gotas.push({ x: cx, y: cy, vx: VIZ[d][0] * 30 + (Math.random() - 0.5) * 30, vy: VIZ[d][1] * 30 - 20 - Math.random() * 20, v: 0.6 });
      }
    }
    for (const p of this.gotas) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt;
      p.v -= dt;
    }
    this.gotas = this.gotas.filter((p) => p.v > 0);
  }

  desenhar(d, t) {
    const c = d.ctx;
    d.ret(0, 0, LARG, ALT, "#151a26");
    for (let x = 0; x < LARG; x += 16) d.ret(x, 0, 1, ALT, "#1b2130");
    for (let y = 0; y < ALT; y += 16) d.ret(0, y, LARG, 1, "#1b2130");
    d.ret(0, 0, LARG, 33, "#0e121c");
    d.ret(0, 33, LARG, 1, COR.titulo);
    d.texto(this.def.titulo, 8, 4, COR.titulo, { sombra: true });
    d.texto(`Nível ${this.k + 1}/${this.def.niveis.length}`, LARG - 8, 4, COR.fraco, { alinhar: "direita" });
    // segunda linha: pressao, giros, vazamentos, dica
    let x = 8;
    if (this.tempo) {
      const p = Math.min(1, this.decorrido / this.tempo);
      d.texto("PRESSÃO", x, 19, p > 0.8 && Math.floor(t * 6) % 2 === 0 ? COR.vermelho : COR.texto);
      x += 38;
      d.ret(x, 19, 82, 8, "#2a2f40");
      const cor = p < 0.6 ? "#7fd36a" : p < 0.85 ? "#e8c04a" : "#e5675b";
      d.ret(x + 1, 20, Math.round(80 * p), 6, cor);
      d.moldura(x, 19, 82, 8, "#5a6280");
      x += 90;
    }
    d.texto(`Giros: ${this.giros}`, x, 19, COR.fraco);
    x += 46;
    if (this.regra) d.texto(`Vazamentos: ${this.vaz.length}`, x, 19, this.vaz.length ? COR.vermelho : COR.verde);
    d.painel(LARG - 52, 16, 46, 14, "ui_holograma");
    d.texto("Dica (H)", LARG - 29, 19, COR.destaque, { alinhar: "centro" });

    const g = this.geometria();
    const n = this.nivel;
    const img = this.jogo.rec.img.mini_canos;
    const T = g.tam;
    d.painel(g.bx - 6, g.by - 6, n.w * T + 12, n.h * T + 12);
    for (const cel of n.cel) {
      const px = g.bx + cel.x * T;
      const py = g.by + cel.y * T;
      c.drawImage(img, INDICE.base * T, 0, T, T, px, py, T, T);
      if (cel.tipo === "base") continue;
      const m = this.molhado.get(cel);
      const cheio = m !== undefined && t >= m ? 1 : 0;
      const ang = ((cel.rot + (cel.anim || 0)) * Math.PI) / 2;
      c.save();
      c.translate(px + T / 2, py + T / 2);
      c.rotate(ang);
      c.drawImage(img, INDICE[cel.tipo] * T, cheio * T, T, T, -T / 2, -T / 2, T, T);
      c.restore();
      if (cel.travada) d.img("mini_trava", px, py);
      if (cel.dicaT !== undefined && t - cel.dicaT < 1) d.moldura(px + 2, py + 2, T - 4, T - 4, COR.verde);
      if (cel.tipo === "turbina" && cheio) {
        const cx = px + T / 2;
        const cy = py + T / 2 + 1;
        c.strokeStyle = "#fff6c8";
        c.lineWidth = 2;
        for (let k = 0; k < 2; k++) {
          const a = t * 10 + (k * Math.PI) / 2;
          c.beginPath();
          c.moveTo(Math.round(cx - Math.cos(a) * 5), Math.round(cy - Math.sin(a) * 5));
          c.lineTo(Math.round(cx + Math.cos(a) * 5), Math.round(cy + Math.sin(a) * 5));
          c.stroke();
        }
      }
    }
    for (const p of this.gotas) d.ret(p.x, p.y, 2, 2, `rgba(150,210,255,${Math.min(1, p.v * 2)})`);
    if (!this.vitoria && !this.estouro) {
      const pisca = Math.floor(t * 4) % 2 === 0 ? COR.destaque : "#ffffff";
      d.moldura(g.bx + this.cx * T, g.by + this.cy * T, T, T, pisca);
      d.moldura(g.bx + this.cx * T + 1, g.by + this.cy * T + 1, T - 2, T - 2, pisca);
    }
    const toque = this.jogo.ent.usouToque;
    const ajuda = toque ? "Toque num cano para girar   B: pausa" : "Setas: mover   Espaço: girar   Q: voltar   H: dica   Esc: pausa";
    d.texto(ajuda, LARG / 2, ALT - 11, COR.fraco, { alinhar: "centro" });
    if (this.vitoria || this.estouro) {
      const v = this.vitoria || this.estouro;
      c.globalAlpha = Math.min(1, v * 3);
      d.ret(0, 70, LARG, 40, "rgba(14,12,26,0.85)");
      if (this.vitoria) {
        d.texto(this.def.vitoria || "TURBINAS GIRANDO!", LARG / 2, 76, COR.titulo, { alinhar: "centro", escala: 2, sombra: true });
        d.texto(`${this.giros} giros${this.dicas ? ` · ${this.dicas} dica${this.dicas > 1 ? "s" : ""}` : ""}`, LARG / 2, 96, COR.fraco, { alinhar: "centro" });
      } else {
        d.texto("A PRESSÃO ESTOUROU!", LARG / 2, 76, COR.vermelho, { alinhar: "centro", escala: 2, sombra: true });
        d.texto("As comportas fecharam. Um novo tabuleiro vai começar.", LARG / 2, 96, COR.texto, { alinhar: "centro" });
      }
      c.globalAlpha = 1;
    }
  }
}
