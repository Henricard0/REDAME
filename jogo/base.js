// REDAME: O Resgate do Legado - base: constantes, recursos, desenho e entrada.

// Largura logica da tela. No computador e 320; no celular deitado ela cresce para
// preencher a tela inteira (a altura continua 180).
export let LARG = 320;
export function definirLargura(w) {
  LARG = w;
}
export const ALT = 180;
export const TILE = 16;

export const COR = {
  texto: "#f4ecd8",
  titulo: "#ffd98a",
  fraco: "#9aa3c7",
  destaque: "#7fe3f0",
  sombra: "#14121e",
  papel: "#3a2c24",
  papelFraco: "#8a7660",
  vermelho: "#e5675b",
  verde: "#8fe08a",
  fundo: "#14121e",
};

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
// projecao isometrica: ponto da grade logica -> ponto na tela (antes da camera)
export const iso = (x, y) => ({ x: x - y, y: (x + y) / 2 });
export const lerp = (a, b, t) => a + (b - a) * t;

export function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ------------------------------------------------------------------ recursos
export class Recursos {
  constructor() {
    this.img = {};
    this.dados = {};
  }

  async json(caminho) {
    const r = await fetch(`dados/${caminho}.json`);
    if (!r.ok) throw new Error(`Não consegui abrir dados/${caminho}.json`);
    return r.json();
  }

  imagem(nome) {
    return new Promise((ok, erro) => {
      const im = new Image();
      im.onload = () => {
        this.img[nome] = im;
        ok(im);
      };
      im.onerror = () => erro(new Error(`Não consegui abrir arte/${nome}.png`));
      im.src = `arte/${nome}.png`;
    });
  }

  async carregar(listaDados, progresso) {
    for (const d of listaDados) {
      this.dados[d.replace(/^.*\//, "")] = await this.json(d);
    }
    const nomes = this.dados.arte.arquivos;
    let feitos = 0;
    await Promise.all(
      nomes.map((n) =>
        this.imagem(n).then(() => {
          feitos++;
          if (progresso) progresso(feitos / nomes.length);
        })
      )
    );
  }
}

// ------------------------------------------------------------------ desenho
export class Desenho {
  constructor(ctx, rec) {
    this.ctx = ctx;
    this.rec = rec;
    const f = rec.dados.fonte;
    this.fonte = f;
    this.glifos = new Map();
    for (const g of f.glifos) this.glifos.set(g.c, g);
    this.tintas = new Map();
  }

  fonteTinta(cor) {
    let t = this.tintas.get(cor);
    if (t) return t;
    const base = this.rec.img.fonte;
    t = document.createElement("canvas");
    t.width = base.width;
    t.height = base.height;
    const c = t.getContext("2d");
    c.drawImage(base, 0, 0);
    c.globalCompositeOperation = "source-in";
    c.fillStyle = cor;
    c.fillRect(0, 0, t.width, t.height);
    this.tintas.set(cor, t);
    return t;
  }

  glifo(ch) {
    return this.glifos.get(ch.codePointAt(0)) || this.glifos.get(63);
  }

  medir(s, esc = 1) {
    let w = 0;
    for (const ch of s) w += this.glifo(ch).a;
    return w * esc;
  }

  texto(s, x, y, cor = COR.texto, opc = {}) {
    s = String(s);
    const esc = opc.escala || 1;
    if (opc.alinhar === "centro") x -= Math.floor(this.medir(s, esc) / 2);
    else if (opc.alinhar === "direita") x -= this.medir(s, esc);
    x = Math.round(x);
    y = Math.round(y);
    if (opc.sombra) this._texto(s, x + esc, y + esc, opc.sombra === true ? COR.sombra : opc.sombra, esc);
    if (opc.contorno) {
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) this._texto(s, x + dx * esc, y + dy * esc, opc.contorno, esc);
    }
    this._texto(s, x, y, cor, esc);
  }

  _texto(s, x, y, cor, esc) {
    const atlas = this.fonteTinta(cor);
    const alt = this.fonte.altura;
    for (const ch of s) {
      const g = this.glifo(ch);
      if (ch !== " ") this.ctx.drawImage(atlas, g.x, g.y, g.w, alt, x, y, g.w * esc, alt * esc);
      x += g.a * esc;
    }
  }

  quebrar(s, larg, esc = 1) {
    const linhas = [];
    for (const par of String(s).split("\n")) {
      let atual = "";
      for (const palavra of par.split(" ")) {
        const teste = atual ? atual + " " + palavra : palavra;
        if (this.medir(teste, esc) > larg && atual) {
          linhas.push(atual);
          atual = palavra;
        } else atual = teste;
      }
      linhas.push(atual);
    }
    return linhas;
  }

  ret(x, y, w, h, cor) {
    this.ctx.fillStyle = cor;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  moldura(x, y, w, h, cor) {
    this.ret(x, y, w, 1, cor);
    this.ret(x, y + h - 1, w, 1, cor);
    this.ret(x, y, 1, h, cor);
    this.ret(x + w - 1, y, 1, h, cor);
  }

  img(nome, x, y, opc = {}) {
    const im = this.rec.img[nome];
    if (!im) return;
    const sw = opc.sw || im.width;
    const sh = opc.sh || im.height;
    const sx = opc.sx || 0;
    const sy = opc.sy || 0;
    const esc = opc.escala || 1;
    const c = this.ctx;
    x = Math.round(x);
    y = Math.round(y);
    if (opc.alpha !== undefined) c.globalAlpha = opc.alpha;
    if (opc.espelhar) {
      c.save();
      c.translate(x + sw * esc, y);
      c.scale(-1, 1);
      c.drawImage(im, sx, sy, sw, sh, 0, 0, sw * esc, sh * esc);
      c.restore();
    } else c.drawImage(im, sx, sy, sw, sh, x, y, sw * esc, sh * esc);
    if (opc.alpha !== undefined) c.globalAlpha = 1;
  }

  // desenha a imagem como silhueta branca (inimigo atingido)
  imgBranca(nome, x, y, opc = {}) {
    if (!this.brancas) this.brancas = new Map();
    let cv = this.brancas.get(nome);
    if (!cv) {
      const im = this.rec.img[nome];
      if (!im) return;
      cv = document.createElement("canvas");
      cv.width = im.width;
      cv.height = im.height;
      const c = cv.getContext("2d");
      c.drawImage(im, 0, 0);
      c.globalCompositeOperation = "source-in";
      c.fillStyle = "#ffffff";
      c.fillRect(0, 0, cv.width, cv.height);
      this.brancas.set(nome, cv);
      this.rec.img["__branca_" + nome] = cv;
    }
    this.img("__branca_" + nome, x, y, opc);
  }

  painel(x, y, w, h, nome = "ui_painel", b = 8) {
    const im = this.rec.img[nome];
    const c = this.ctx;
    x = Math.round(x);
    y = Math.round(y);
    w = Math.round(w);
    h = Math.round(h);
    const S = im.width;
    const m = S - 2 * b;
    c.drawImage(im, 0, 0, b, b, x, y, b, b);
    c.drawImage(im, S - b, 0, b, b, x + w - b, y, b, b);
    c.drawImage(im, 0, S - b, b, b, x, y + h - b, b, b);
    c.drawImage(im, S - b, S - b, b, b, x + w - b, y + h - b, b, b);
    c.drawImage(im, b, 0, m, b, x + b, y, w - 2 * b, b);
    c.drawImage(im, b, S - b, m, b, x + b, y + h - b, w - 2 * b, b);
    c.drawImage(im, 0, b, b, m, x, y + b, b, h - 2 * b);
    c.drawImage(im, S - b, b, b, m, x + w - b, y + b, b, h - 2 * b);
    c.drawImage(im, b, b, m, m, x + b, y + b, w - 2 * b, h - 2 * b);
  }

  retrato(nome, emocao, x, y) {
    const emo = this.rec.dados.arte.emocoes;
    let k = emo.indexOf(emocao);
    if (k < 0) k = 0;
    this.img("ui_moldura", x, y);
    this.img("ret_" + nome, x + 2, y + 2, { sx: k * 48, sw: 48, sh: 48 });
  }
}

// ------------------------------------------------------------------ entrada
const TECLAS = {
  ArrowUp: "cima", KeyW: "cima",
  ArrowDown: "baixo", KeyS: "baixo",
  ArrowLeft: "esq", KeyA: "esq",
  ArrowRight: "dir", KeyD: "dir",
  Space: "acao", Enter: "acao", KeyZ: "acao", KeyE: "acao", NumpadEnter: "acao",
  KeyX: "voltar", Backspace: "voltar", KeyK: "voltar", ShiftLeft: "correr", ShiftRight: "correr", KeyL: "correr",
  Escape: "menu", KeyP: "menu", Tab: "menu",
  KeyQ: "girarEsq",
  KeyH: "dica",
};

export class Entrada {
  constructor(canvas) {
    this.seg = new Set();
    this.fila = new Set();
    this.ap = new Set();
    this.textoFila = [];
    this.texto = [];
    this.cliqueFila = [];
    this.cliques = [];
    this.canvas = canvas;
    this.usouToque = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
    this.pads = {};
    // joystick analogico (coordenadas de tela, -1..1); tambem vira setas nos menus
    this.eixo = { x: 0, y: 0, ativo: false };
    this.segJoy = new Set();
    this.joyDir = null;
    this.joyDesde = 0;
    this.joyRepete = 0;
    addEventListener("keydown", (e) => {
      const a = TECLAS[e.code];
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (a || e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
      if (e.key && e.key.length === 1) this.textoFila.push(e.key);
      else if (e.key === "Backspace") this.textoFila.push("\b");
      else if (e.key === "Enter") this.textoFila.push("\n");
      if (!a) return;
      if (!this.seg.has(a) || !e.repeat) this.fila.add(a);
      this.seg.add(a);
    });
    addEventListener("keyup", (e) => {
      const a = TECLAS[e.code];
      if (a) this.seg.delete(a);
    });
    addEventListener("blur", () => this.seg.clear());
    canvas.addEventListener("pointerdown", (e) => {
      const r = canvas.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * LARG;
      const y = ((e.clientY - r.top) / r.height) * ALT;
      this.cliqueFila.push({ x, y });
      if (e.pointerType === "touch") this.usouToque = true;
    });
  }

  definirEixo(x, y, ativo) {
    this.eixo.x = x;
    this.eixo.y = y;
    this.eixo.ativo = ativo;
    if (ativo) this.usouToque = true;
  }

  ligarBotoes(raiz) {
    for (const b of raiz.querySelectorAll("[data-acao]")) {
      let a = null;
      const solta = (e) => {
        e.preventDefault();
        if (a) this.seg.delete(a);
        a = null;
        b.classList.remove("ativo");
      };
      b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        b.setPointerCapture?.(e.pointerId);
        a = b.dataset.acao; // le na hora: o mesmo botao muda de funcao conforme o contexto
        this.seg.add(a);
        this.fila.add(a);
        this.usouToque = true;
        b.classList.add("ativo");
        if (navigator.vibrate) try { navigator.vibrate(8); } catch (err) { /* ignora */ }
      });
      b.addEventListener("contextmenu", (e) => e.preventDefault());
      b.addEventListener("pointerup", solta);
      b.addEventListener("pointercancel", solta);
      b.addEventListener("lostpointercapture", solta);
    }
  }

  // o joystick tambem gera "setas" (com repeticao) para menus, dialogos e o minigame
  atualizarJoystick() {
    const e = this.eixo;
    let d = null;
    if (e.ativo && Math.hypot(e.x, e.y) > 0.55) d = Math.abs(e.x) > Math.abs(e.y) ? (e.x < 0 ? "esq" : "dir") : e.y < 0 ? "cima" : "baixo";
    const agora = performance.now();
    this.segJoy.clear();
    if (d) this.segJoy.add(d);
    if (d && d !== this.joyDir) {
      this.fila.add(d);
      this.joyDesde = agora;
      this.joyRepete = agora + 380;
    } else if (d && agora >= this.joyRepete) {
      this.fila.add(d);
      this.joyRepete = agora + 150;
    }
    this.joyDir = d;
  }

  atualizar() {
    this.atualizarJoystick();
    this.ap = this.fila;
    this.fila = new Set();
    this.texto = this.textoFila;
    this.textoFila = [];
    this.cliques = this.cliqueFila;
    this.cliqueFila = [];
    this.lerControle();
  }

  lerControle() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const estado = {
        cima: p.axes[1] < -0.5 || p.buttons[12]?.pressed,
        baixo: p.axes[1] > 0.5 || p.buttons[13]?.pressed,
        esq: p.axes[0] < -0.5 || p.buttons[14]?.pressed,
        dir: p.axes[0] > 0.5 || p.buttons[15]?.pressed,
        acao: p.buttons[0]?.pressed,
        voltar: p.buttons[1]?.pressed,
        correr: p.buttons[2]?.pressed,
        menu: p.buttons[9]?.pressed,
      };
      const ant = this.pads[p.index] || {};
      for (const [a, v] of Object.entries(estado)) {
        if (v && !ant[a]) this.ap.add(a);
        if (v) this.seg.add(a);
        else if (ant[a]) this.seg.delete(a);
      }
      this.pads[p.index] = estado;
    }
  }

  apertou(a) {
    return this.ap.has(a);
  }

  segurando(a) {
    return this.seg.has(a) || this.segJoy.has(a);
  }

  consumir(a) {
    const t = this.ap.has(a);
    this.ap.delete(a);
    return t;
  }

  limpar() {
    this.ap.clear();
    this.cliques = [];
    this.texto = [];
  }
}
