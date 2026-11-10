// REDAME - minigame das tubulacoes (Fase 1: Usina Capivari-Cachoeira).
// Gire os canos para levar a agua da represa (A) ate todas as turbinas (T).
//
// Os niveis sao desenhados ja resolvidos, com caracteres de caixa:
//   │ ─ └ ┌ ┐ ┘ ├ ┤ ┬ ┴ ┼   A = represa   T = turbina   # = rocha   . = vazio
// O jogo embaralha a rotacao de cada cano no inicio.
import { LARG, ALT, COR } from "./base.js";
import { Camada, Dialogo, Menu } from "./ui.js";

const VIZ = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // N L S O
const BASE = { reto: [0, 2], curva: [0, 1], te: [0, 1, 2], cruz: [0, 1, 2, 3] };
const SIMBOLOS = {
  "│": [0, 2], "─": [1, 3], "└": [0, 1], "┌": [1, 2], "┐": [2, 3], "┘": [0, 3],
  "├": [0, 1, 2], "┤": [0, 2, 3], "┬": [1, 2, 3], "┴": [0, 1, 3], "┼": [0, 1, 2, 3],
};
const INDICE = { reto: 0, curva: 1, te: 2, cruz: 3, fonte: 4, turbina: 5, base: 6, bloqueio: 7 };

const girar = (lista, r) => lista.map((d) => (d + r) % 4).sort();
const iguais = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

export function montarNivel(linhas) {
  const grade = linhas.map((l) => [...l]);
  const h = grade.length;
  const w = Math.max(...grade.map((l) => l.length));
  const cel = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = grade[y][x] || ".";
      const c = { x, y, tipo: "base", rot: 0, sol: 0, fixa: true, conns: [] };
      if (SIMBOLOS[ch]) {
        const conns = [...SIMBOLOS[ch]].sort();
        const n = conns.length;
        c.tipo = n === 4 ? "cruz" : n === 3 ? "te" : (conns[1] - conns[0]) === 2 ? "reto" : "curva";
        for (let r = 0; r < 4; r++) if (iguais(girar(BASE[c.tipo], r), conns)) { c.sol = r; break; }
        c.rot = c.sol;
        c.fixa = c.tipo === "cruz";
      } else if (ch === "A") c.tipo = "fonte";
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
    const base = c.tipo === "fonte" ? 2 : 0;
    c.rot = c.conns.length ? (c.conns[0] - base + 4) % 4 : 0;
  }
  return nivel;
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

// Busca em largura a partir das represas. Devolve distancia de cada celula molhada.
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

export function resolvido(n, dist = fluxo(n)) {
  const turb = n.cel.filter((c) => c.tipo === "turbina");
  return turb.length > 0 && turb.every((c) => dist.has(c));
}

export function embaralhar(n, aleat = Math.random) {
  const moveis = n.cel.filter((c) => BASE[c.tipo] && !c.fixa);
  for (let tent = 0; tent < 50; tent++) {
    for (const c of moveis) c.rot = Math.floor(aleat() * 4);
    const fora = moveis.filter((c) => !iguais(girar(BASE[c.tipo], c.rot), girar(BASE[c.tipo], c.sol))).length;
    if (!resolvido(n) && fora >= Math.ceil(moveis.length * 0.5)) return;
  }
}

export class MiniCanos extends Camada {
  constructor(jogo, def) {
    super(jogo);
    this.cobreTudo = true;
    this.def = def;
    this.k = -1;
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
    const nd = this.def.niveis[this.k];
    this.nivel = montarNivel(nd.linhas);
    embaralhar(this.nivel);
    this.cx = 0;
    this.cy = 0;
    const primeira = this.nivel.cel.find((c) => BASE[c.tipo] && !c.fixa);
    if (primeira) {
      this.cx = primeira.x;
      this.cy = primeira.y;
    }
    this.vitoria = 0;
    this.molhado = new Map();
    this.recalcular(true);
    if (nd.fala) {
      const [quem, emo, texto] = nd.fala.split("|");
      this.jogo.empilhar(new Dialogo(this.jogo, quem, emo, texto.replace(/\{nome\}/g, this.jogo.estado.nome)));
    }
  }

  recalcular(silencioso) {
    const dist = fluxo(this.nivel);
    const agora = this.t;
    const novo = new Map();
    let turbinaNova = false;
    for (const [c, d] of dist) {
      const antes = this.molhado.get(c);
      novo.set(c, antes !== undefined ? antes : agora + d * 0.05);
      if (antes === undefined && c.tipo === "turbina") turbinaNova = true;
    }
    this.molhado = novo;
    if (!silencioso && dist.size > 1) this.jogo.som.efeito("agua");
    if (turbinaNova && !silencioso) this.jogo.som.efeito("turbina");
    if (resolvido(this.nivel, dist) && !this.vitoria) {
      this.vitoria = 0.0001;
      this.jogo.som.efeito("sucesso");
    }
  }

  geometria() {
    const esc = 2;
    const tam = 16 * esc;
    const bx = Math.floor((LARG - this.nivel.w * tam) / 2);
    const by = 26 + Math.floor((138 - this.nivel.h * tam) / 2);
    return { esc, tam, bx, by };
  }

  girarCelula(c, sentido) {
    if (!c || !BASE[c.tipo] || c.fixa) {
      this.jogo.som.efeito("erro");
      return;
    }
    c.rot = (c.rot + sentido + 4) % 4;
    c.anim = -sentido;
    this.jogo.som.efeito("girar");
    this.recalcular(false);
  }

  atualizar(dt, ent) {
    this.t += dt;
    for (const c of this.nivel.cel) if (c.anim) c.anim = Math.sign(c.anim) * Math.max(0, Math.abs(c.anim) - dt * 9);
    if (this.vitoria) {
      this.vitoria += dt;
      if (this.vitoria > 2.2) this.proximo();
      return;
    }
    const n = this.nivel;
    if (ent.apertou("cima")) this.cy = (this.cy + n.h - 1) % n.h;
    if (ent.apertou("baixo")) this.cy = (this.cy + 1) % n.h;
    if (ent.apertou("esq")) this.cx = (this.cx + n.w - 1) % n.w;
    if (ent.apertou("dir")) this.cx = (this.cx + 1) % n.w;
    if (ent.apertou("acao")) this.girarCelula(celula(n, this.cx, this.cy), 1);
    if (ent.apertou("girarEsq")) this.girarCelula(celula(n, this.cx, this.cy), -1);
    const g = this.geometria();
    for (const cl of ent.cliques) {
      const x = Math.floor((cl.x - g.bx) / g.tam);
      const y = Math.floor((cl.y - g.by) / g.tam);
      if (x >= 0 && y >= 0 && x < n.w && y < n.h) {
        this.cx = x;
        this.cy = y;
        this.girarCelula(celula(n, x, y), 1);
      }
    }
    if (ent.apertou("menu") || ent.apertou("voltar")) {
      const menu = new Menu(this.jogo, [
        { texto: "Continuar tentando", acao: (m) => m.fechar() },
        { texto: "Pular este desafio", acao: (m) => { m.fechar(); this.vitoria = 1.6; } },
      ], { titulo: "Pausa", escurecer: 0.5 });
      this.jogo.empilhar(menu);
    }
  }

  desenhar(d, t) {
    const c = d.ctx;
    d.ret(0, 0, LARG, ALT, "#151a26");
    for (let x = 0; x < LARG; x += 16) d.ret(x, 0, 1, ALT, "#1b2130");
    for (let y = 0; y < ALT; y += 16) d.ret(0, y, LARG, 1, "#1b2130");
    d.ret(0, 0, LARG, 22, "#0e121c");
    d.ret(0, 22, LARG, 1, COR.titulo);
    d.texto(this.def.titulo, 8, 7, COR.titulo, { sombra: true });
    d.texto(`Nível ${this.k + 1}/${this.def.niveis.length}`, LARG - 8, 7, COR.fraco, { alinhar: "direita" });
    const g = this.geometria();
    const n = this.nivel;
    const img = this.jogo.rec.img.mini_canos;
    d.painel(g.bx - 6, g.by - 6, n.w * g.tam + 12, n.h * g.tam + 12);
    for (const cel of n.cel) {
      const px = g.bx + cel.x * g.tam;
      const py = g.by + cel.y * g.tam;
      c.drawImage(img, INDICE.base * 16, 0, 16, 16, px, py, g.tam, g.tam);
      if (cel.tipo === "base") continue;
      const m = this.molhado.get(cel);
      const cheio = m !== undefined && t >= m ? 1 : 0;
      const ang = ((cel.rot + (cel.anim || 0)) * Math.PI) / 2;
      c.save();
      c.translate(px + g.tam / 2, py + g.tam / 2);
      c.rotate(ang);
      c.drawImage(img, INDICE[cel.tipo] * 16, cheio * 16, 16, 16, -g.tam / 2, -g.tam / 2, g.tam, g.tam);
      c.restore();
      if (cel.tipo === "turbina" && cheio) {
        const cx = px + g.tam / 2;
        const cy = py + g.tam / 2 + 2;
        c.strokeStyle = "#fff6c8";
        c.lineWidth = 2;
        for (let k = 0; k < 2; k++) {
          const a = t * 10 + (k * Math.PI) / 2;
          c.beginPath();
          c.moveTo(Math.round(cx - Math.cos(a) * 6), Math.round(cy - Math.sin(a) * 6));
          c.lineTo(Math.round(cx + Math.cos(a) * 6), Math.round(cy + Math.sin(a) * 6));
          c.stroke();
        }
      }
    }
    if (!this.vitoria) {
      const pisca = Math.floor(t * 4) % 2 === 0 ? COR.destaque : "#ffffff";
      d.moldura(g.bx + this.cx * g.tam, g.by + this.cy * g.tam, g.tam, g.tam, pisca);
      d.moldura(g.bx + this.cx * g.tam + 1, g.by + this.cy * g.tam + 1, g.tam - 2, g.tam - 2, pisca);
    }
    const toque = this.jogo.ent.usouToque;
    const ajuda = toque ? "Toque num cano para girá-lo" : "Setas: mover   Espaço: girar   Q: girar ao contrário   Esc: pausa";
    d.texto(ajuda, LARG / 2, ALT - 11, COR.fraco, { alinhar: "centro" });
    if (this.vitoria) {
      const a = Math.min(1, this.vitoria * 3);
      c.globalAlpha = a;
      d.ret(0, 70, LARG, 30, "rgba(14,12,26,0.8)");
      d.texto(this.def.vitoria || "TURBINAS GIRANDO!", LARG / 2, 78, COR.titulo, { alinhar: "centro", escala: 2, sombra: true });
      c.globalAlpha = 1;
    }
  }
}
