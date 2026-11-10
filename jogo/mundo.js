// REDAME - mundo isometrico: mapas feitos de texto, entidades, colisao, camera e desenho.
//
// A logica do jogo continua numa grade vista de cima (1 tile = 16 unidades): colisao,
// roteiros e combate nao mudam. So o desenho e projetado em isometrico:
//   tela_x = x - y      tela_y = (x + y) / 2
import { TILE, LARG, ALT, clamp, hash2, iso } from "./base.js";

// Legenda dos tiles do chao. "solido" bloqueia a passagem.
export const TILES = {
  ".": { t: ["grama", "grama", "grama2", "grama3"] },
  '"': { t: ["grama_flor"] },
  "=": { t: ["rua", "rua", "rua", "rua2"] },
  "-": { t: ["calcada"] },
  "_": { t: ["praca"] },
  ":": { t: ["terra"] },
  ";": { t: ["areia"] },
  "~": { t: ["agua", "agua2"], solido: true },
  w: { t: ["madeira", "madeira2"] },
  t: { t: ["tapete"] },
  z: { t: ["azulejo"] },
  "#": { t: ["parede"], solido: true },
  "+": { t: ["parede_topo"], solido: true },
  m: { t: ["parede_moderna"], solido: true },
  "&": { t: ["rocha"], solido: true },
  "%": { t: ["rocha_face"], solido: true },
  c: { t: ["concreto"] },
  g: { t: ["grade"] },
  " ": { t: ["vazio"], solido: true },
  k: { t: ["canteiro"] },
  r: { t: ["trilho"] },
  p: { t: ["chapa"] },
  y: { t: ["cabo_h"] },
  v: { t: ["cabo_v"] },
};

const R = Math.SQRT1_2;
const LINHA_DIR = { baixo: 0, cima: 1, dir: 2, esq: 2 };
// As setas andam ao longo da grade (como nos isometricos classicos):
//   cima = -y (sobe para a direita na tela)   baixo = +y (desce para a esquerda)
//   dir  = +x (desce para a direita)          esq   = -x (sobe para a esquerda)
// Assim corredores e ruas, que seguem a grade, ficam faceis de percorrer.
export const VETOR = { baixo: [0, 1], cima: [0, -1], esq: [-1, 0], dir: [1, 0] };
export const OPOSTA = { baixo: "cima", cima: "baixo", esq: "dir", dir: "esq" };
const TELA_DIR = { baixo: [0, 1], cima: [0, -1], esq: [-1, 0], dir: [1, 0] };

function intersecta(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// converte um deslocamento na tela em deslocamento na grade logica
export function telaParaGrade(sx, sy) {
  return [(sx + 2 * sy) / 2, (2 * sy - sx) / 2];
}

// direcao dominante de um deslocamento na grade
export function direcaoDe(dx, dy) {
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? "esq" : "dir";
  return dy < 0 ? "cima" : "baixo";
}

export class Ator {
  constructor(sprite, x, y, dir = "baixo") {
    this.sprite = sprite;
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.anim = 0;
    this.movendo = false;
    this.rota = null;
  }

  caixa() {
    return { x: this.x - 5, y: this.y - 5, w: 10, h: 10 };
  }

  quadro() {
    if (!this.movendo) return 0;
    return [0, 1, 0, 2][Math.floor(this.anim * 8) % 4];
  }

  desenhar(d) {
    const im = d.rec.img["pers_" + this.sprite];
    if (!im) return;
    const fw = im.width / 3;
    const fh = im.height / 3;
    const p = iso(this.x, this.y);
    d.img("ui_sombra", p.x - 6, p.y - 3);
    d.img("pers_" + this.sprite, p.x - fw / 2, p.y - fh + 1, {
      sx: this.quadro() * fw,
      sy: LINHA_DIR[this.dir] * fh,
      sw: fw,
      sh: fh,
      espelhar: this.dir === "esq",
    });
  }
}

export class Ent {
  constructor(mundo, tipo, def, cx, cy) {
    this.mundo = mundo;
    this.tipo = tipo;
    this.def = def;
    this.cx = cx;
    this.cy = cy;
    this.id = def.id || null;
    const [dx, dy] = def.desloc || [0, 0];
    this.x = cx * TILE + dx;
    this.base = (cy + 1) * TILE + dy;
    if (tipo === "coleta") this.chave = `coletado:${mundo.def.id}:${cx},${cy}`;
    if (tipo === "obj" || tipo === "coleta") {
      const meta = mundo.arte.objetos[def.obj];
      if (!meta) throw new Error(`Objeto desconhecido no mapa: ${def.obj}`);
      this.meta = meta;
      this.iso = mundo.arte.iso[def.obj] || null;
      this.parede = mundo.tileSolido(cx, cy) && (!this.iso || this.iso.tipo !== "caixa");
      const [w, d] = this.iso ? this.iso.pegada : [1, 1];
      this.x0 = cx * TILE + dx;
      this.y0 = (cy - d + 1) * TILE + dy;
      this.W = w * TILE;
      this.D = d * TILE;
      this.centro = { x: this.x0 + this.W / 2, y: this.y0 + this.D / 2 };
      let col = this.iso ? this.iso.col : meta.col ? [4, 4, 8, 8] : null;
      if (col && def.solido !== false && !this.parede) this.col = { x: this.x0 + col[0], y: this.y0 + col[1], w: col[2], h: col[3] };
    }
    if (tipo === "predio") {
      this.x0 = cx * TILE;
      this.y0 = (cy - (def.prof || 1) + 1) * TILE;
      this.W = (def.larg || 1) * TILE;
      this.D = (def.prof || 1) * TILE;
    }
    if (tipo === "npc") {
      this.ator = new Ator(def.sprite, cx * TILE + 8 + dx, cy * TILE + 8 + dy, def.dir || "baixo");
      this.casa = { x: this.ator.x, y: this.ator.y };
      this.vagarT = Math.random() * 2;
    }
    if (tipo === "carro") {
      this.vel = def.vel || 40;
      this.sentido = def.sentido || 1;
      this.y0 = cy * TILE;
      this.iso = mundo.arte.iso[def.obj + (this.sentido > 0 ? "_d" : "_e")];
    }
  }

  visivel() {
    if (this.chave && this.mundo.estado.v(this.chave)) return false;
    return !this.def.se || this.mundo.estado.condicao(this.def.se);
  }

  caixaColisao() {
    if (this.tipo === "barreira") {
      const w = (this.def.larg || 1) * TILE;
      const h = (this.def.alt || 1) * TILE;
      return { x: this.x, y: this.base - h, w, h };
    }
    if (this.tipo === "obj" || this.tipo === "coleta") return this.col || null;
    if (this.tipo === "npc") return this.ator.caixa();
    if (this.tipo === "carro") return { x: this.x + 2, y: this.y0 + 3, w: 28, h: 10 };
    return null;
  }

  // Area onde a protagonista pode interagir.
  caixaInteracao() {
    if (this.tipo === "npc") return { x: this.ator.x - 9, y: this.ator.y - 9, w: 18, h: 18 };
    if (this.tipo === "obj" || this.tipo === "coleta") {
      if (this.parede) return { x: this.cx * TILE - 3, y: this.cy * TILE - 3, w: TILE + 6, h: TILE + 6 };
      if (this.col) return { x: this.col.x - 4, y: this.col.y - 4, w: this.col.w + 8, h: this.col.h + 8 };
      return { x: this.x0 - 2, y: this.y0 - 2, w: this.W + 4, h: this.D + 4 };
    }
    if (this.tipo === "predio") return { x: this.x0 - 4, y: this.y0 - 4, w: this.W + 8, h: this.D + 8 };
    if (this.tipo === "item" || this.tipo === "inspecao" || this.tipo === "barreira") {
      const w = (this.def.larg || 1) * TILE;
      const h = (this.def.alt || 1) * TILE;
      return { x: this.x, y: this.base - h, w, h };
    }
    return null;
  }

  interativa() {
    if (!this.visivel()) return false;
    if (["npc", "item", "inspecao", "barreira", "obj", "predio"].includes(this.tipo)) return !!this.def.roteiro;
    if (this.tipo === "coleta") return true;
    return false;
  }

  ordem() {
    if (this.def.camada === "chao") return -1e7;
    if (this.tipo === "npc") return this.ator.x + this.ator.y;
    if (this.tipo === "carro") return this.x + 16 + this.y0 + 8;
    if (this.parede) return (this.cx + this.cy + 1) * TILE + 2;
    if (this.centro) return this.centro.x + this.centro.y - (this.def.camada === "fundo" ? 8 : 0);
    return this.x + 8 + this.base - 8;
  }

  // ponto de ancoragem na parede (objetos presos em blocos)
  pontoParede() {
    const m = this.mundo;
    let px = (this.cx + 1) * TILE;
    let py = (this.cy + 1) * TILE;
    if (!m.tileSolido(this.cx, this.cy + 1)) px = (this.cx + 0.5) * TILE; // face voltada para +y
    else if (!m.tileSolido(this.cx + 1, this.cy)) py = (this.cy + 0.5) * TILE; // face voltada para +x
    const b = iso(px, py);
    const h = m.alturaBloco(this.cx, this.cy);
    return { x: b.x, y: b.y - h * 0.5 };
  }

  topo() {
    if (this.tipo === "npc") {
      const p = iso(this.ator.x, this.ator.y);
      return { x: p.x, y: p.y - 40 };
    }
    if (this.tipo === "obj" || this.tipo === "coleta") {
      if (this.parede) {
        const p = this.pontoParede();
        return { x: p.x, y: p.y - this.meta.h / 2 - 6 };
      }
      const p = iso(this.centro.x, this.centro.y);
      if (this.iso && this.iso.tipo === "caixa") {
        const o = iso(this.x0, this.y0);
        return { x: p.x, y: o.y - this.iso.ancora[1] - 4 };
      }
      return { x: p.x, y: p.y - this.meta.h - 4 };
    }
    if (this.tipo === "predio") {
      const p = iso(this.x0 + this.W / 2, this.y0 + this.D);
      return { x: p.x, y: p.y - 20 };
    }
    const w = (this.def.larg || 1) * TILE;
    const h = (this.def.alt || 1) * TILE;
    const p = iso(this.x + w / 2, this.base - h / 2);
    return { x: p.x, y: p.y - 24 };
  }

  desenhar(d, t) {
    if (this.tipo === "obj" || this.tipo === "coleta") {
      const m = this.meta;
      const I = this.iso;
      if (this.parede) {
        const p = this.pontoParede();
        const q = m.quadros > 1 ? Math.floor(t * (this.def.fps || 4)) % m.quadros : 0;
        d.img("obj_" + this.def.obj, p.x - m.w / 2, p.y - m.h / 2, { sx: q * m.w, sw: m.w, sh: m.h });
        return;
      }
      if (I && I.tipo === "caixa") {
        const q = I.quadros > 1 ? Math.floor(t * (this.def.fps || 4)) % I.quadros : 0;
        const o = iso(this.x0, this.y0);
        d.img(I.sprite, o.x - I.ancora[0], o.y - I.ancora[1], { sx: q * I.w, sw: I.w, sh: I.h });
        return;
      }
      const q = m.quadros > 1 ? Math.floor(t * (this.def.fps || 4)) % m.quadros : 0;
      const p = iso(this.centro.x, this.centro.y);
      d.img("obj_" + this.def.obj, p.x - m.w / 2, p.y - m.h + 2, { sx: q * m.w, sw: m.w, sh: m.h, espelhar: this.def.espelhar });
      if (this.tipo === "coleta" && Math.floor(t * 2 + this.cx) % 3 === 0) d.img("ui_brilho", p.x + m.w / 2 - 5, p.y - m.h);
    } else if (this.tipo === "npc") {
      this.ator.desenhar(d);
    } else if (this.tipo === "item") {
      const bob = Math.round(Math.sin(t * 3) * 1.5);
      const p = iso(this.x + 8, this.base - 8);
      d.img("ui_sombra", p.x - 6, p.y - 3);
      d.img("item_" + this.def.item, p.x - 8, p.y - 18 + bob);
      if (Math.floor(t * 2) % 3 === 0) d.img("ui_brilho", p.x + 3, p.y - 19 + bob);
    } else if (this.tipo === "carro" && this.iso) {
      const I = this.iso;
      const o = iso(this.x, this.y0);
      d.img(I.sprite, o.x - I.ancora[0], o.y - I.ancora[1]);
    }
  }
}

export class Mundo {
  constructor(jogo) {
    this.jogo = jogo;
    this.estado = jogo.estado;
    this.arte = jogo.rec.dados.arte;
    this.def = null;
    this.ents = [];
    this.spawns = {};
    this.jogador = new Ator("protagonista", 0, 0);
    this.camX = 0;
    this.camY = 0;
    this.camada = document.createElement("canvas");
    this.camada.width = LARG;
    this.camada.height = ALT;
    this.camadaCtx = this.camada.getContext("2d");
    this.camadaCtx.imageSmoothingEnabled = false;
    this.memoriaVista = 100;
    this.nevoa = [];
    for (let i = 0; i < 18; i++) this.nevoa.push({ x: Math.random() * LARG, y: Math.random() * ALT, v: 4 + Math.random() * 8, f: Math.random() * 6 });
    this.alvo = null;
    this.tremor = 0;
    this.ultimoTile = null;
  }

  carregar(def) {
    this.def = def;
    this.h = def.linhas.length;
    this.w = Math.max(...def.linhas.map((l) => [...l].length));
    this.chao = [];
    this.solido = new Uint8Array(this.w * this.h);
    this.ents = [];
    this.spawns = {};
    this.defsInimigos = [];
    const pendentes = [];
    for (let cy = 0; cy < this.h; cy++) {
      const linha = [...def.linhas[cy]];
      for (let cx = 0; cx < this.w; cx++) {
        const ch = linha[cx] ?? def.chao;
        let tch = ch;
        if (!TILES[ch]) {
          const e = def.legenda?.[ch];
          tch = (e && e.chao) || def.chao;
          if (e) pendentes.push([e, cx, cy]);
          else console.warn(`Caractere sem legenda no mapa ${def.id}: "${ch}"`);
        }
        this.chao.push(tch);
        if (TILES[tch]?.solido) this.solido[cy * this.w + cx] = 1;
      }
    }
    // predios primeiro: marcam a pegada como solida (objetos de parede dependem disso)
    this.predios = [];
    for (const [e, cx, cy] of pendentes) if (e.tipo === "predio") this.criarPredio(e, cx, cy);
    for (const [e, cx, cy] of pendentes) if (e.tipo !== "predio") this.criarEnt(e, cx, cy);
    this.blocos = [];
    const B = this.arte.iso_chao.blocos;
    for (let cy = 0; cy < this.h; cy++) {
      for (let cx = 0; cx < this.w; cx++) {
        const ch = this.chao[cy * this.w + cx];
        if (B[ch] && !this.predioEm(cx, cy)) this.blocos.push({ cx, cy, i: B[ch].i, h: B[ch].altura });
      }
    }
    this.jogador.sprite = def.traje && this.jogo.rec.img["pers_protagonista_" + def.traje] ? "protagonista_" + def.traje : "protagonista";
    this.preRenderizar();
    if (this.jogo.combate) this.jogo.combate.carregarMapa(this.defsInimigos);
    this.memoriaVista = this.memoria();
    this.ultimoTile = null;
  }

  criarPredio(e, cx, cy) {
    const ent = new Ent(this, "predio", e, cx, cy);
    this.ents.push(ent);
    const larg = e.larg || 1;
    const prof = e.prof || 1;
    const tipos = this.arte.iso_chao.predios[e.estilo].tipos;
    const H = this.arte.iso_chao.predios[e.estilo].altura;
    for (let ty = cy - prof + 1; ty <= cy; ty++) {
      for (let tx = cx; tx < cx + larg; tx++) {
        this.solido[ty * this.w + tx] = 1;
        // face esquerda = lado +y (frente, com a porta); face direita = lado +x
        let esq = "liso";
        let dir = "liso";
        if (ty === cy) esq = tx - cx === e.porta ? "porta" : "janela";
        if (tx === cx + larg - 1) dir = "janela";
        this.predios.push({ cx: tx, cy: ty, estilo: e.estilo, cel: tipos.indexOf(esq) * 3 + tipos.indexOf(dir), h: H });
      }
    }
  }

  predioEm(cx, cy) {
    return this.predios.some((p) => p.cx === cx && p.cy === cy);
  }

  alturaBloco(cx, cy) {
    const p = this.predios.find((q) => q.cx === cx && q.cy === cy);
    if (p) return p.h;
    const b = this.arte.iso_chao.blocos[this.chao[cy * this.w + cx]];
    return b ? b.altura : 0;
  }

  criarEnt(e, cx, cy) {
    if (e.tipo === "spawn") {
      this.spawns[e.nome] = { cx, cy, dir: e.dir || "baixo" };
      return;
    }
    if (e.tipo === "inimigo") {
      this.defsInimigos.push({ def: e, cx, cy });
      return;
    }
    this.ents.push(new Ent(this, e.tipo, e, cx, cy));
  }

  preRenderizar() {
    const cv = document.createElement("canvas");
    this.OX = this.h * TILE;
    cv.width = (this.w + this.h) * TILE;
    cv.height = (this.w + this.h) * 8 + 16;
    const c = cv.getContext("2d");
    const atlas = this.jogo.rec.img.iso_chao;
    const IC = this.arte.iso_chao;
    for (let cy = 0; cy < this.h; cy++) {
      for (let cx = 0; cx < this.w; cx++) {
        const def = TILES[this.chao[cy * this.w + cx]] || TILES["."];
        const nome = def.t[Math.floor(hash2(cx, cy) * def.t.length)];
        const k = IC.chao[nome];
        c.drawImage(atlas, (k % IC.colunas) * 32, Math.floor(k / IC.colunas) * 16, 32, 16, this.OX + (cx - cy) * TILE - 16, (cx + cy) * 8, 32, 16);
      }
    }
    this.chaoCanvas = cv;
  }

  memoria() {
    if (!this.def?.esquecimento) return 100;
    const v = this.estado.vars["memoria_" + this.def.id];
    return v === undefined ? 0 : v;
  }

  posicionar(spawn) {
    const s = this.spawns[spawn];
    if (!s) {
      console.warn(`Ponto de chegada desconhecido: ${spawn}`);
      return;
    }
    this.jogador.x = s.cx * TILE + 8;
    this.jogador.y = s.cy * TILE + 8;
    this.jogador.dir = s.dir;
    this.desencalhar(this.jogador);
    this.ultimoTile = this.tileDe(this.jogador);
  }

  tileDe(a) {
    return Math.floor(a.x / TILE) + "," + Math.floor(a.y / TILE);
  }

  npc(id) {
    return this.ents.find((e) => e.tipo === "npc" && e.id === id);
  }

  ator(id) {
    if (id === "jogador" || id === "protagonista") return this.jogador;
    return this.npc(id)?.ator;
  }

  tileSolido(cx, cy) {
    if (cx < 0 || cy < 0 || cx >= this.w || cy >= this.h) return true;
    return this.solido[cy * this.w + cx] === 1;
  }

  colide(r, ignorar) {
    const x0 = Math.floor(r.x / TILE);
    const x1 = Math.floor((r.x + r.w - 0.01) / TILE);
    const y0 = Math.floor(r.y / TILE);
    const y1 = Math.floor((r.y + r.h - 0.01) / TILE);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) if (this.tileSolido(cx, cy)) return true;
    for (const e of this.ents) {
      if (e === ignorar || (ignorar && e.ator === ignorar)) continue;
      const c = e.caixaColisao();
      if (c && e.visivel() && intersecta(r, c)) return true;
    }
    if (ignorar !== this.jogador && intersecta(r, this.jogador.caixa())) return true;
    if (ignorar === this.jogador && this.jogo.combate) {
      for (const i of this.jogo.combate.inimigos) if (i.solido && intersecta(r, i.caixa())) return true;
    }
    return false;
  }

  livre(a, x, y, ign) {
    const ox = a.x;
    const oy = a.y;
    a.x = x;
    a.y = y;
    const ok = !this.colide(a.caixa(), ign);
    a.x = ox;
    a.y = oy;
    return ok;
  }

  // Se o ator ficou sobreposto a algo solido (barreira que surgiu, NPC, save antigo),
  // empurra para o espaco livre mais proximo, de preferencia para a frente.
  desencalhar(a, ign) {
    const ig = ign ?? a;
    if (!this.colide(a.caixa(), ig)) return false;
    const frente = VETOR[a.dir] || [0, 1];
    const dirs = [frente, [0, 1], [0, -1], [1, 0], [-1, 0], [R, R], [-R, R], [R, -R], [-R, -R]];
    for (let r = 1; r <= 28; r++) {
      for (const [dx, dy] of dirs) {
        if (this.livre(a, a.x + dx * r, a.y + dy * r, ig)) {
          a.x += dx * r;
          a.y += dy * r;
          return true;
        }
      }
    }
    return false;
  }

  // Move um eixo por vez; se bater numa quina, desliza um pouco para contorna-la.
  mover(a, dx, dy, ignorar) {
    const ign = ignorar ?? a;
    const eixo = (mx, my) => {
      if (this.livre(a, a.x + mx, a.y + my, ign)) {
        a.x += mx;
        a.y += my;
        return;
      }
      const passo = Math.min(Math.abs(mx + my), 1);
      for (const k of [1, -1, 2, -2, 3, -3, 4, -4]) {
        const lx = my ? k : 0;
        const ly = mx ? k : 0;
        if (this.livre(a, a.x + mx + lx, a.y + my + ly, ign)) {
          const nx = a.x + Math.sign(lx) * passo;
          const ny = a.y + Math.sign(ly) * passo;
          if (this.livre(a, nx, ny, ign)) {
            a.x = nx;
            a.y = ny;
          }
          return;
        }
      }
    };
    if (dx) eixo(dx, 0);
    if (dy) eixo(0, dy);
  }

  // ---------------------------------------------------------------- jogador
  atualizarJogador(dt, ent) {
    const j = this.jogador;
    this.desencalhar(j);
    const cb = this.jogo.combate;
    // direcao na grade: joystick (relativo a tela, analogico) ou setas (ao longo da grade)
    let gx = 0;
    let gy = 0;
    let forca = 1;
    let correr = ent.segurando("correr");
    const ex = ent.eixo;
    const mag = Math.hypot(ex.x, ex.y);
    if (ex.ativo && mag > 0.18) {
      const [tx, ty] = telaParaGrade(ex.x, ex.y);
      const n = Math.hypot(tx, ty) || 1;
      gx = tx / n;
      gy = ty / n;
      forca = clamp(mag / 0.75, 0.45, 1);
      correr = correr || mag > 0.95;
    } else if (!ex.ativo) {
      if (ent.segurando("esq")) gx -= 1;
      if (ent.segurando("dir")) gx += 1;
      if (ent.segurando("cima")) gy -= 1;
      if (ent.segurando("baixo")) gy += 1;
      if (gx && gy) {
        gx *= R;
        gy *= R;
      }
    }
    if (cb && cb.moverJogadora(dt)) {
      j.movendo = true;
      j.anim += dt * 2;
      return;
    }
    if (cb && (ent.apertou("correr") || ent.apertou("esquiva")) && cb.ativo() && cb.esquivar(gx, gy)) return;
    j.movendo = gx !== 0 || gy !== 0;
    if (j.movendo) {
      j.dir = direcaoDe(gx, gy);
      const vel = (correr ? 100 : 64) * forca * (cb && cb.golpe ? 0.45 : 1) * dt;
      this.mover(j, gx * vel, gy * vel);
      j.anim += dt * (correr ? 1.4 : 1) * Math.max(forca, 0.7);
    } else j.anim = 0;

    this.alvo = this.procurarAlvo();
    // em combate, Espaco golpeia; so pessoas, itens e materiais continuam tendo prioridade
    const prioriza = this.alvo && !(cb && cb.emCombate() && !["npc", "item", "coleta"].includes(this.alvo.tipo));
    // no celular, "interagir" e "golpe" sao botoes separados; no teclado, Espaco decide pelo contexto
    if (this.alvo && (ent.apertou("interagir") || (ent.apertou("acao") && prioriza))) {
      ent.consumir("acao");
      this.interagir(this.alvo);
      return;
    }
    if (cb && (ent.apertou("acao") || ent.apertou("golpe"))) cb.atacar();
    if (cb && (ent.apertou("voltar") || ent.apertou("pulso"))) cb.disparar();
    const tile = this.tileDe(j);
    if (tile !== this.ultimoTile) {
      this.ultimoTile = tile;
      this.pisar(tile);
    }
  }

  procurarAlvo() {
    const j = this.jogador;
    const [vx, vy] = VETOR[j.dir];
    const px = j.x + vx * 12;
    const py = j.y + vy * 12;
    let melhor = null;
    let dist = 1e9;
    for (const e of this.ents) {
      if (!e.interativa()) continue;
      const r = e.caixaInteracao();
      if (!r) continue;
      const cx = clamp(px, r.x, r.x + r.w);
      const cy = clamp(py, r.y, r.y + r.h);
      const d = Math.hypot(cx - px, cy - py);
      if (d <= 6 && d < dist) {
        dist = d;
        melhor = e;
      }
    }
    return melhor;
  }

  interagir(e) {
    if (e.tipo === "coleta") {
      this.jogo.coletar(e);
      return;
    }
    if (e.tipo === "npc") {
      e.ator.dir = OPOSTA[this.jogador.dir];
      e.ator.movendo = false;
    }
    this.jogo.rodarRoteiro(this.escolherRoteiro(e.def.roteiro), { ent: e });
  }

  escolherRoteiro(r) {
    if (typeof r === "string") return r;
    for (const v of r) if (this.estado.condicao(v.se)) return v.r;
    return null;
  }

  pisar(tile) {
    const [cx, cy] = tile.split(",").map(Number);
    for (const e of this.ents) {
      if (e.tipo !== "portal" && e.tipo !== "gatilho") continue;
      const w = e.def.larg || 1;
      const h = e.def.alt || 1;
      if (cx < e.cx || cx >= e.cx + w || cy < e.cy || cy >= e.cy + h) continue;
      if (e.tipo === "portal") {
        if (this.estado.condicao(e.def.se)) {
          this.jogo.irPara(e.def.para, e.def.chegada);
        } else if (e.def.bloqueado) {
          const [vx, vy] = VETOR[this.jogador.dir];
          this.jogador.x -= vx * 6;
          this.jogador.y -= vy * 6;
          this.ultimoTile = this.tileDe(this.jogador);
          this.jogo.rodarRoteiro(e.def.bloqueado);
        }
        return;
      }
      if (e.tipo === "gatilho" && this.estado.condicao(e.def.se)) {
        this.jogo.rodarRoteiro(e.def.roteiro);
        return;
      }
    }
  }

  // ---------------------------------------------------------------- mundo vivo
  atualizar(dt, livre) {
    for (const e of this.ents) {
      if (e.tipo === "npc") this.atualizarNpc(e, dt, livre);
      if (e.tipo === "carro") this.atualizarCarro(e, dt);
    }
    this.atualizarRota(this.jogador, dt);
    const alvoMem = this.memoria();
    this.memoriaVista += (alvoMem - this.memoriaVista) * Math.min(1, dt * 1.5);
    for (const n of this.nevoa) {
      n.x += n.v * dt;
      if (n.x > LARG + 30) {
        n.x = -50;
        n.y = Math.random() * ALT;
      }
    }
    if (this.tremor > 0) this.tremor = Math.max(0, this.tremor - dt);
    if (this.coletando) this.coletando.t += dt;
    this.camera();
  }

  atualizarRota(a, dt) {
    if (!a.rota) return false;
    const r = a.rota;
    const vel = (r.vel || 56) * dt;
    const dx = r.x - a.x;
    const dy = r.y - a.y;
    a.movendo = true;
    a.anim += dt;
    if (Math.abs(dx) > 0.5) {
      a.dir = direcaoDe(dx, 0);
      a.x += clamp(dx, -vel, vel);
    } else if (Math.abs(dy) > 0.5) {
      a.x = r.x;
      a.dir = direcaoDe(0, dy);
      a.y += clamp(dy, -vel, vel);
    } else {
      a.x = r.x;
      a.y = r.y;
      a.movendo = false;
      a.anim = 0;
      a.rota = null;
      r.fim();
    }
    return true;
  }

  andar(a, cx, cy, vel) {
    return new Promise((fim) => {
      a.rota = { x: cx * TILE + 8, y: cy * TILE + 8, vel, fim };
    });
  }

  atualizarNpc(e, dt, livre) {
    const a = e.ator;
    if (this.atualizarRota(a, dt)) return;
    if (!e.def.vagar || !livre || !e.visivel()) {
      a.movendo = false;
      return;
    }
    e.vagarT -= dt;
    if (e.vagarT <= 0) {
      if (e.passo) {
        e.passo = null;
        e.vagarT = 1 + Math.random() * 2.5;
      } else {
        const dirs = ["baixo", "cima", "esq", "dir"];
        e.passo = dirs[Math.floor(Math.random() * 4)];
        a.dir = e.passo;
        e.vagarT = 0.4 + Math.random() * 0.9;
      }
    }
    if (e.passo) {
      const [vx, vy] = VETOR[e.passo];
      const raio = e.def.vagar * TILE;
      const nx = a.x + vx * 26 * dt;
      const ny = a.y + vy * 26 * dt;
      if (Math.abs(nx - e.casa.x) > raio || Math.abs(ny - e.casa.y) > raio) {
        e.passo = null;
        a.movendo = false;
        return;
      }
      const ox = a.x;
      const oy = a.y;
      this.mover(a, vx * 26 * dt, vy * 26 * dt, e);
      a.movendo = ox !== a.x || oy !== a.y;
      a.anim += dt;
    } else a.movendo = false;
  }

  atualizarCarro(e, dt) {
    const j = this.jogador;
    const frente = e.sentido > 0 ? { x: e.x + 32, y: e.y0 + 1, w: 22, h: 14 } : { x: e.x - 22, y: e.y0 + 1, w: 22, h: 14 };
    if (intersecta(frente, j.caixa())) return;
    e.x += e.sentido * e.vel * dt;
    const lw = this.w * TILE;
    if (e.x > lw + 40) e.x = -72;
    if (e.x < -72) e.x = lw + 40;
  }

  camera() {
    const p = iso(this.jogador.x, this.jogador.y);
    const alt = this.arte.iso_chao.blocos_altura;
    const minX = -this.h * TILE;
    const maxX = this.w * TILE;
    const minY = -alt;
    const maxY = (this.w + this.h) * 8 + 8;
    this.camX = maxX - minX <= LARG ? Math.floor((minX + maxX - LARG) / 2) : Math.round(clamp(p.x - LARG / 2, minX, maxX - LARG));
    this.camY = maxY - minY <= ALT ? Math.floor((minY + maxY - ALT) / 2) : Math.round(clamp(p.y - 16 - ALT / 2, minY, maxY - ALT));
  }

  // a largura da tela mudou (celular girou): refaz as camadas de desenho
  redimensionar() {
    this.camada.width = LARG;
    this.camada.height = ALT;
    this.camadaCtx.imageSmoothingEnabled = false;
    this.vinheta = null;
    if (this.def) this.camera();
  }

  // posicao de tela (ja sem a camera) de um ponto logico a uma certa altura
  tela(x, y, z = 0) {
    const p = iso(x, y);
    return { x: p.x - this.camX, y: p.y - z - this.camY };
  }

  // ---------------------------------------------------------------- luz
  // Mapas com "luz": {"escuridao": 0.6} ficam escuros, com luz em volta de lampadas,
  // telas, disparos e da propria protagonista. Todos os mapas ganham uma vinheta suave.
  desenharLuz(c, t) {
    if (!this.vinheta) {
      this.vinheta = document.createElement("canvas");
      this.vinheta.width = LARG;
      this.vinheta.height = ALT;
      const v = this.vinheta.getContext("2d");
      const g = v.createRadialGradient(LARG / 2, ALT / 2, ALT * 0.45, LARG / 2, ALT / 2, LARG * 0.62);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(4,4,10,0.42)");
      v.fillStyle = g;
      v.fillRect(0, 0, LARG, ALT);
      this.luzCanvas = document.createElement("canvas");
      this.luzCanvas.width = LARG;
      this.luzCanvas.height = ALT;
      this.luzCtx = this.luzCanvas.getContext("2d");
    }
    const L = this.def.luz;
    if (L) {
      const lc = this.luzCtx;
      lc.globalCompositeOperation = "source-over";
      lc.clearRect(0, 0, LARG, ALT);
      lc.fillStyle = `rgba(5,7,14,${L.escuridao ?? 0.6})`;
      lc.fillRect(0, 0, LARG, ALT);
      lc.globalCompositeOperation = "destination-out";
      const brilhos = [];
      const furo = (x, y, r, forca = 1) => {
        if (x < -r || y < -r || x > LARG + r || y > ALT + r) return;
        const g = lc.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(0,0,0,${forca})`);
        g.addColorStop(0.55, `rgba(0,0,0,${forca * 0.7})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        lc.fillStyle = g;
        lc.fillRect(x - r, y - r, r * 2, r * 2);
      };
      const j = this.jogador;
      const pj = this.tela(j.x, j.y, 14);
      furo(pj.x, pj.y, L.jogadora || 60, 0.95);
      for (const e of this.ents) {
        if (e.tipo !== "obj" || !e.visivel()) continue;
        const nome = e.def.obj;
        let p;
        if (e.parede) {
          const q = e.pontoParede();
          p = { x: q.x - this.camX, y: q.y - this.camY };
        } else p = this.tela(e.centro.x, e.centro.y, 14);
        if (nome === "lampada") {
          const r = 52 + Math.sin(t * 7 + e.cx) * 1.5;
          furo(p.x, p.y + 8, r, 1);
          brilhos.push([p.x, p.y + 8, 42, "255,190,110", 0.16]);
        } else if (nome === "painel" || nome === "terminal" || nome === "servidor") {
          furo(p.x, p.y, 36, 0.85);
          brilhos.push([p.x, p.y, 28, "90,230,140", 0.14]);
        }
      }
      const cb = this.jogo.combate;
      if (cb) {
        for (const pr of cb.projeteis) {
          const p = this.tela(pr.x, pr.y, pr.z ?? 10);
          furo(p.x, p.y, 22, 0.9);
          brilhos.push([p.x, p.y, 14, pr.dono === "jogadora" ? "120,230,250" : "255,170,80", 0.3]);
        }
        for (const i of cb.inimigos) {
          if (i.chefe && i.estado === "superaquecido") {
            const p = this.tela(i.x, i.y, 24);
            furo(p.x, p.y, 70, 1);
            brilhos.push([p.x, p.y, 50, "255,150,60", 0.25]);
          } else if (i.t.brilho) {
            const p = this.tela(i.x, i.y, 8);
            furo(p.x, p.y, 26, 0.7);
          }
        }
      }
      c.drawImage(this.luzCanvas, 0, 0);
      c.globalCompositeOperation = "lighter";
      for (const [x, y, r, cor, a] of brilhos) {
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${cor},${a})`);
        g.addColorStop(1, `rgba(${cor},0)`);
        c.fillStyle = g;
        c.fillRect(x - r, y - r, r * 2, r * 2);
      }
      c.globalCompositeOperation = "source-over";
    }
    c.drawImage(this.vinheta, 0, 0);
  }

  // ---------------------------------------------------------------- desenho
  visivelNaTela(px, py, margem = 80) {
    return px > this.camX - margem && px < this.camX + LARG + margem && py > this.camY - margem && py < this.camY + ALT + margem * 1.5;
  }

  desenhar(ctxFinal, d, t, mostrarAlvo) {
    const c = this.camadaCtx;
    const dd = Object.create(d);
    dd.ctx = c;
    c.fillStyle = "#0c0a12";
    c.fillRect(0, 0, LARG, ALT);
    let sx = 0;
    let sy = 0;
    if (this.tremor > 0 && !this.jogo.movimentoReduzido) {
      sx = Math.round((Math.random() - 0.5) * 4);
      sy = Math.round((Math.random() - 0.5) * 4);
    }
    c.save();
    c.translate(-this.camX + sx, -this.camY + sy);
    c.drawImage(this.chaoCanvas, -this.OX, 0);
    const lista = [];
    // blocos de parede e rocha
    const imgB = this.jogo.rec.img.iso_blocos;
    const altB = this.arte.iso_chao.blocos_altura;
    const j0 = this.jogador;
    const pj0 = iso(j0.x, j0.y);
    const profJ = j0.x + j0.y;
    // um bloco que fica na frente da protagonista e cobre o desenho dela fica translucido
    const cobre = (o, p, h) => o > profJ + 4 && Math.abs(p.x - pj0.x) < 26 && pj0.y - 34 < p.y + 16 && pj0.y > p.y - h;
    const blocoFn = (im, sx, w, h, p, alpha) => () => {
      if (alpha < 1) c.globalAlpha = alpha;
      c.drawImage(im, sx, 0, w, 16 + h, p.x - 16, p.y - h, w, 16 + h);
      c.globalAlpha = 1;
    };
    for (const b of this.blocos) {
      const p = iso(b.cx * TILE, b.cy * TILE);
      if (!this.visivelNaTela(p.x, p.y)) continue;
      const o = (b.cx + b.cy + 1) * TILE;
      lista.push({ o, d: blocoFn(imgB, b.i * 32, 32, altB, p, cobre(o, p, altB) ? 0.35 : 1) });
    }
    // predios
    for (const b of this.predios) {
      const p = iso(b.cx * TILE, b.cy * TILE);
      if (!this.visivelNaTela(p.x, p.y, 120)) continue;
      const im = this.jogo.rec.img["iso_predio_" + b.estilo];
      const o = (b.cx + b.cy + 1) * TILE;
      lista.push({ o, d: blocoFn(im, b.cel * 32, 32, b.h, p, cobre(o, p, b.h) ? 0.4 : 1) });
    }
    for (const e of this.ents) {
      if (["portal", "gatilho", "inspecao", "barreira", "predio"].includes(e.tipo)) continue;
      if (!e.visivel()) continue;
      lista.push({ o: e.ordem(), d: () => e.desenhar(dd, t) });
    }
    const cb = this.jogo.combate;
    const j = this.jogador;
    if (!this.jogo.esconderJogador && (!cb || cb.jogadoraVisivel(t))) lista.push({ o: j.x + j.y, d: () => j.desenhar(dd) });
    if (cb) lista.push(...cb.itensDesenho(dd, t));
    lista.sort((a, b) => a.o - b.o);
    for (const it of lista) it.d();
    if (cb) cb.desenharSobre(dd, t);
    if (this.coletando) {
      const k = this.coletando;
      const p = k.ent.topo();
      dd.ret(p.x - 11, p.y - 2, 22, 5, "#14121e");
      dd.ret(p.x - 10, p.y - 1, Math.round(20 * Math.min(1, k.t / k.dur)), 3, "#7fe3f0");
    }
    if (mostrarAlvo && this.alvo) {
      const p = this.alvo.topo();
      const bob = Math.round(Math.sin(t * 6));
      dd.img(this.alvo.tipo === "npc" ? "ui_balao_fala" : "ui_balao", p.x - 6, p.y - 12 + bob);
    }
    c.restore();
    this.desenharLuz(c, t);

    // O Esquecimento: cores somem, nevoa cinza passa pela tela.
    const cinza = 1 - this.memoriaVista / 100;
    if (cinza > 0.01) {
      for (const n of this.nevoa) {
        c.globalAlpha = Math.min(1, cinza * 1.2) * (0.55 + 0.45 * Math.sin(t + n.f));
        dd.img("ui_nevoa", n.x - 24, n.y - 12);
      }
      c.globalAlpha = 1;
      c.fillStyle = `rgba(70,72,100,${0.18 * cinza})`;
      c.fillRect(0, 0, LARG, ALT);
      ctxFinal.filter = `grayscale(${(cinza * 0.9).toFixed(3)}) brightness(${(1 - cinza * 0.06).toFixed(3)})`;
    }
    ctxFinal.drawImage(this.camada, 0, 0);
    ctxFinal.filter = "none";
  }
}
