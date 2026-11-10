// REDAME - mundo: mapas feitos de texto, entidades, colisao, camera e desenho.
import { TILE, LARG, ALT, clamp, hash2 } from "./base.js";

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

const LINHA_DIR = { baixo: 0, cima: 1, dir: 2, esq: 2 };
export const VETOR = { baixo: [0, 1], cima: [0, -1], esq: [-1, 0], dir: [1, 0] };
export const OPOSTA = { baixo: "cima", cima: "baixo", esq: "dir", dir: "esq" };

function intersecta(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
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
    return { x: this.x - 5, y: this.y - 5, w: 10, h: 5 };
  }

  quadro() {
    if (!this.movendo) return 0;
    return [0, 1, 0, 2][Math.floor(this.anim * 8) % 4];
  }

  desenhar(d) {
    const linha = LINHA_DIR[this.dir];
    d.img("ui_sombra", this.x - 6, this.y - 4);
    d.img("pers_" + this.sprite, this.x - 8, this.y - 22, {
      sx: this.quadro() * 16,
      sy: linha * 24,
      sw: 16,
      sh: 24,
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
      const c = meta.col;
      if (c && def.solido !== false) this.col = { x: this.x + c[0], y: this.base - c[1] - c[3], w: c[2], h: c[3] };
    }
    if (tipo === "npc") {
      this.ator = new Ator(def.sprite, cx * TILE + 8 + dx, cy * TILE + 14 + dy, def.dir || "baixo");
      this.casa = { x: this.ator.x, y: this.ator.y };
      this.vagarT = Math.random() * 2;
    }
    if (tipo === "carro") {
      this.cx0 = this.x;
      this.vel = def.vel || 40;
      this.sentido = def.sentido || 1;
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
    if (this.tipo === "carro") return { x: this.x + 2, y: this.base - 8, w: 28, h: 8 };
    return null;
  }

  // Area onde a protagonista pode interagir.
  caixaInteracao() {
    if (this.tipo === "npc") return { x: this.ator.x - 8, y: this.ator.y - 14, w: 16, h: 16 };
    if (this.tipo === "obj" || this.tipo === "coleta") {
      if (this.col) return { x: this.col.x - 3, y: this.col.y - 3, w: this.col.w + 6, h: this.col.h + 6 };
      return { x: this.x, y: this.base - Math.min(this.meta.h, 24), w: this.meta.w, h: Math.min(this.meta.h, 24) };
    }
    if (this.tipo === "item" || this.tipo === "inspecao" || this.tipo === "barreira") {
      const w = (this.def.larg || 1) * TILE;
      const h = (this.def.alt || 1) * TILE;
      return { x: this.x, y: this.base - h, w, h };
    }
    return null;
  }

  interativa() {
    if (!this.visivel()) return false;
    if (["npc", "item", "inspecao", "barreira"].includes(this.tipo)) return !!this.def.roteiro;
    if (this.tipo === "obj") return !!this.def.roteiro;
    if (this.tipo === "coleta") return true;
    return false;
  }

  ordem() {
    if (this.def.camada === "fundo") return -1e6 + this.base;
    if (this.def.camada === "chao") return -1e7;
    if (this.tipo === "npc") return this.ator.y;
    return this.base;
  }

  topo() {
    if (this.tipo === "npc") return { x: this.ator.x, y: this.ator.y - 30 };
    if (this.tipo === "obj" || this.tipo === "coleta") return { x: this.x + this.meta.w / 2, y: this.base - this.meta.h - 6 };
    if (this.tipo === "item") return { x: this.x + 8, y: this.base - 22 };
    const w = (this.def.larg || 1) * TILE;
    const h = (this.def.alt || 1) * TILE;
    return { x: this.x + w / 2, y: this.base - h - 6 };
  }

  desenhar(d, t) {
    if (this.tipo === "obj" || this.tipo === "coleta") {
      const m = this.meta;
      const q = m.quadros > 1 ? Math.floor(t * (this.def.fps || 4)) % m.quadros : 0;
      d.img("obj_" + this.def.obj, this.x, this.base - m.h, { sx: q * m.w, sw: m.w, sh: m.h, espelhar: this.def.espelhar });
      if (this.tipo === "coleta" && Math.floor(t * 2 + this.cx) % 3 === 0) d.img("ui_brilho", this.x + m.w - 5, this.base - m.h - 1);
    } else if (this.tipo === "npc") {
      this.ator.desenhar(d);
    } else if (this.tipo === "item") {
      const bob = Math.round(Math.sin(t * 3) * 1.5);
      d.img("ui_sombra", this.x + 2, this.base - 5);
      d.img("item_" + this.def.item, this.x, this.base - 18 + bob);
      if (Math.floor(t * 2) % 3 === 0) d.img("ui_brilho", this.x + 11, this.base - 19 + bob);
    } else if (this.tipo === "carro") {
      d.img("obj_" + this.def.obj, this.x, this.base - 20, { espelhar: this.sentido < 0 });
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
    this.w = Math.max(...def.linhas.map((l) => l.length));
    this.chao = [];
    this.solido = new Uint8Array(this.w * this.h);
    this.ents = [];
    this.spawns = {};
    this.defsInimigos = [];
    for (let cy = 0; cy < this.h; cy++) {
      for (let cx = 0; cx < this.w; cx++) {
        const ch = def.linhas[cy][cx] ?? def.chao;
        let tch = ch;
        if (!TILES[ch]) {
          const e = def.legenda?.[ch];
          tch = (e && e.chao) || def.chao;
          if (e) this.criarEnt(e, cx, cy);
          else console.warn(`Caractere sem legenda no mapa ${def.id}: "${ch}"`);
        }
        this.chao.push(tch);
        if (TILES[tch]?.solido) this.solido[cy * this.w + cx] = 1;
      }
    }
    this.preRenderizar();
    if (this.jogo.combate) this.jogo.combate.carregarMapa(this.defsInimigos);
    this.memoriaVista = this.memoria();
    this.ultimoTile = null;
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
    cv.width = this.w * TILE;
    cv.height = this.h * TILE;
    const c = cv.getContext("2d");
    const atlas = this.jogo.rec.img.tiles;
    const cols = this.arte.tiles_colunas;
    for (let cy = 0; cy < this.h; cy++) {
      for (let cx = 0; cx < this.w; cx++) {
        const def = TILES[this.chao[cy * this.w + cx]] || TILES["."];
        const nome = def.t[Math.floor(hash2(cx, cy) * def.t.length)];
        const k = this.arte.tiles[nome];
        c.drawImage(atlas, (k % cols) * TILE, Math.floor(k / cols) * TILE, TILE, TILE, cx * TILE, cy * TILE, TILE, TILE);
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
    this.jogador.y = s.cy * TILE + 14;
    this.jogador.dir = s.dir;
    this.ultimoTile = this.tileDe(this.jogador);
  }

  tileDe(a) {
    return Math.floor(a.x / TILE) + "," + Math.floor((a.y - 2) / TILE);
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
    let dx = 0;
    let dy = 0;
    if (ent.segurando("esq")) dx -= 1;
    if (ent.segurando("dir")) dx += 1;
    if (ent.segurando("cima")) dy -= 1;
    if (ent.segurando("baixo")) dy += 1;
    const cb = this.jogo.combate;
    if (cb && cb.moverJogadora(dt)) {
      j.movendo = true;
      j.anim += dt * 2;
      return;
    }
    if (cb && ent.apertou("correr") && cb.ativo() && cb.esquivar(dx, dy)) return;
    j.movendo = dx !== 0 || dy !== 0;
    if (j.movendo) {
      if (dx && !dy) j.dir = dx < 0 ? "esq" : "dir";
      else if (dy && !dx) j.dir = dy < 0 ? "cima" : "baixo";
      else if (!(VETOR[j.dir][0] === dx || VETOR[j.dir][1] === dy)) j.dir = dy < 0 ? "cima" : "baixo";
      const vel = (ent.segurando("correr") ? 112 : 72) * (cb && cb.golpe ? 0.45 : 1) * dt;
      const n = dx && dy ? Math.SQRT1_2 : 1;
      this.mover(j, dx * vel * n, dy * vel * n);
      j.anim += dt * (ent.segurando("correr") ? 1.4 : 1);
    } else j.anim = 0;

    this.alvo = this.procurarAlvo();
    if (ent.apertou("acao") && this.alvo) {
      ent.consumir("acao");
      this.interagir(this.alvo);
      return;
    }
    if (cb && ent.apertou("acao")) cb.atacar();
    if (cb && ent.apertou("voltar")) cb.disparar();
    const tile = this.tileDe(j);
    if (tile !== this.ultimoTile) {
      this.ultimoTile = tile;
      this.pisar(tile);
    }
  }

  procurarAlvo() {
    const j = this.jogador;
    const [vx, vy] = VETOR[j.dir];
    const px = j.x + vx * 11;
    const py = j.y - 3 + vy * 10;
    let melhor = null;
    let dist = 1e9;
    for (const e of this.ents) {
      if (!e.interativa()) continue;
      const r = e.caixaInteracao();
      if (!r) continue;
      const cx = clamp(px, r.x, r.x + r.w);
      const cy = clamp(py, r.y, r.y + r.h);
      const d = Math.hypot(cx - px, cy - py);
      if (d <= 5 && d < dist) {
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
    const t = this.jogo.t;
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
    void t;
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
      a.dir = dx < 0 ? "esq" : "dir";
      a.x += clamp(dx, -vel, vel);
    } else if (Math.abs(dy) > 0.5) {
      a.x = r.x;
      a.dir = dy < 0 ? "cima" : "baixo";
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
      a.rota = { x: cx * TILE + 8, y: cy * TILE + 14, vel, fim };
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
      const nx = a.x + vx * 28 * dt;
      const ny = a.y + vy * 28 * dt;
      if (Math.abs(nx - e.casa.x) > raio || Math.abs(ny - e.casa.y) > raio) {
        e.passo = null;
        a.movendo = false;
        return;
      }
      const ox = a.x;
      const oy = a.y;
      this.mover(a, vx * 28 * dt, vy * 28 * dt, e);
      a.movendo = ox !== a.x || oy !== a.y;
      a.anim += dt;
    } else a.movendo = false;
  }

  atualizarCarro(e, dt) {
    const j = this.jogador;
    const frente = e.sentido > 0 ? { x: e.x + 30, y: e.base - 10, w: 22, h: 12 } : { x: e.x - 20, y: e.base - 10, w: 22, h: 12 };
    if (intersecta(frente, j.caixa())) return;
    e.x += e.sentido * e.vel * dt;
    const lw = this.w * TILE;
    if (e.x > lw + 40) e.x = -72;
    if (e.x < -72) e.x = lw + 40;
  }

  camera() {
    const j = this.jogador;
    const lw = this.w * TILE;
    const lh = this.h * TILE;
    this.camX = lw <= LARG ? Math.floor((lw - LARG) / 2) : Math.round(clamp(j.x - LARG / 2, 0, lw - LARG));
    this.camY = lh <= ALT ? Math.floor((lh - ALT) / 2) : Math.round(clamp(j.y - 12 - ALT / 2, 0, lh - ALT));
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
      furo(j.x - this.camX, j.y - 10 - this.camY, L.jogadora || 58, 0.95);
      for (const e of this.ents) {
        if (e.tipo !== "obj" || !e.visivel()) continue;
        const nome = e.def.obj;
        const x = e.x + e.meta.w / 2 - this.camX;
        const y = e.base - e.meta.h / 2 - this.camY;
        if (nome === "lampada") {
          const r = 50 + Math.sin(t * 7 + e.cx) * 1.5;
          furo(x, y + 6, r, 1);
          brilhos.push([x, y + 6, 40, "255,190,110", 0.16]);
        } else if (nome === "painel" || nome === "terminal" || nome === "servidor") {
          furo(x, y, 34, 0.85);
          brilhos.push([x, y, 26, "90,230,140", 0.14]);
        }
      }
      const cb = this.jogo.combate;
      if (cb) {
        for (const p of cb.projeteis) {
          furo(p.x - this.camX, p.y - this.camY, 22, 0.9);
          brilhos.push([p.x - this.camX, p.y - this.camY, 14, p.dono === "jogadora" ? "120,230,250" : "255,170,80", 0.3]);
        }
        for (const i of cb.inimigos) {
          if (i.chefe && i.estado === "superaquecido") {
            furo(i.x - this.camX, i.y - 24 - this.camY, 70, 1);
            brilhos.push([i.x - this.camX, i.y - 24 - this.camY, 50, "255,150,60", 0.25]);
          } else if (i.t.brilho) furo(i.x - this.camX, i.y - 8 - this.camY, 26, 0.7);
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
    c.drawImage(this.chaoCanvas, 0, 0);
    const lista = [];
    for (const e of this.ents) {
      if (["portal", "gatilho", "inspecao", "barreira"].includes(e.tipo)) continue;
      if (!e.visivel()) continue;
      lista.push({ o: e.ordem(), d: () => e.desenhar(dd, t) });
    }
    const cb = this.jogo.combate;
    if (!this.jogo.esconderJogador && (!cb || cb.jogadoraVisivel(t))) lista.push({ o: this.jogador.y, d: () => this.jogador.desenhar(dd) });
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
