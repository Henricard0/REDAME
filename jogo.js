(() => {
  // jogo/base.js
  var LARG = 320;
  var ALT = 180;
  var TILE = 16;
  var COR = {
    texto: "#f4ecd8",
    titulo: "#ffd98a",
    fraco: "#9aa3c7",
    destaque: "#7fe3f0",
    sombra: "#14121e",
    papel: "#3a2c24",
    papelFraco: "#8a7660",
    vermelho: "#e5675b",
    verde: "#8fe08a",
    fundo: "#14121e"
  };
  var clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  var iso = (x, y) => ({ x: x - y, y: (x + y) / 2 });
  function hash2(x, y) {
    let h = x * 374761393 + y * 668265263 | 0;
    h = Math.imul(h ^ h >>> 13, 1274126177);
    return ((h ^ h >>> 16) >>> 0) / 4294967296;
  }
  var Recursos = class {
    constructor() {
      this.img = {};
      this.dados = {};
    }
    async json(caminho) {
      const r = await fetch(`dados/${caminho}.json`);
      if (!r.ok) throw new Error(`N\xE3o consegui abrir dados/${caminho}.json`);
      return r.json();
    }
    imagem(nome) {
      return new Promise((ok, erro) => {
        const im = new Image();
        im.onload = () => {
          this.img[nome] = im;
          ok(im);
        };
        im.onerror = () => erro(new Error(`N\xE3o consegui abrir arte/${nome}.png`));
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
        nomes.map(
          (n) => this.imagem(n).then(() => {
            feitos++;
            if (progresso) progresso(feitos / nomes.length);
          })
        )
      );
    }
  };
  var Desenho = class {
    constructor(ctx, rec) {
      this.ctx = ctx;
      this.rec = rec;
      const f = rec.dados.fonte;
      this.fonte = f;
      this.glifos = /* @__PURE__ */ new Map();
      for (const g of f.glifos) this.glifos.set(g.c, g);
      this.tintas = /* @__PURE__ */ new Map();
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
      if (opc.alpha !== void 0) c.globalAlpha = opc.alpha;
      if (opc.espelhar) {
        c.save();
        c.translate(x + sw * esc, y);
        c.scale(-1, 1);
        c.drawImage(im, sx, sy, sw, sh, 0, 0, sw * esc, sh * esc);
        c.restore();
      } else c.drawImage(im, sx, sy, sw, sh, x, y, sw * esc, sh * esc);
      if (opc.alpha !== void 0) c.globalAlpha = 1;
    }
    // desenha a imagem como silhueta branca (inimigo atingido)
    imgBranca(nome, x, y, opc = {}) {
      if (!this.brancas) this.brancas = /* @__PURE__ */ new Map();
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
  };
  var TECLAS = {
    ArrowUp: "cima",
    KeyW: "cima",
    ArrowDown: "baixo",
    KeyS: "baixo",
    ArrowLeft: "esq",
    KeyA: "esq",
    ArrowRight: "dir",
    KeyD: "dir",
    Space: "acao",
    Enter: "acao",
    KeyZ: "acao",
    KeyE: "acao",
    NumpadEnter: "acao",
    KeyX: "voltar",
    Backspace: "voltar",
    KeyK: "voltar",
    ShiftLeft: "correr",
    ShiftRight: "correr",
    KeyL: "correr",
    Escape: "menu",
    KeyP: "menu",
    Tab: "menu",
    KeyQ: "girarEsq",
    KeyH: "dica"
  };
  var Entrada = class {
    constructor(canvas) {
      this.seg = /* @__PURE__ */ new Set();
      this.fila = /* @__PURE__ */ new Set();
      this.ap = /* @__PURE__ */ new Set();
      this.textoFila = [];
      this.texto = [];
      this.cliqueFila = [];
      this.cliques = [];
      this.canvas = canvas;
      this.usouToque = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
      this.pads = {};
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
        const x = (e.clientX - r.left) / r.width * LARG;
        const y = (e.clientY - r.top) / r.height * ALT;
        this.cliqueFila.push({ x, y });
        if (e.pointerType === "touch") this.usouToque = true;
      });
    }
    ligarBotoes(raiz) {
      for (const b of raiz.querySelectorAll("[data-acao]")) {
        const a = b.dataset.acao;
        const solta = (e) => {
          e.preventDefault();
          this.seg.delete(a);
          b.classList.remove("ativo");
        };
        b.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          b.setPointerCapture?.(e.pointerId);
          this.seg.add(a);
          this.fila.add(a);
          this.usouToque = true;
          b.classList.add("ativo");
        });
        b.addEventListener("pointerup", solta);
        b.addEventListener("pointercancel", solta);
        b.addEventListener("lostpointercapture", solta);
      }
    }
    atualizar() {
      this.ap = this.fila;
      this.fila = /* @__PURE__ */ new Set();
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
          menu: p.buttons[9]?.pressed
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
      return this.seg.has(a);
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
  };

  // jogo/som.js
  var NOTAS = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
  function freq(nota) {
    const m = /^([A-G][#b]?)(\d)$/.exec(nota);
    if (!m) return 0;
    const n = NOTAS[m[1]] + (parseInt(m[2], 10) + 1) * 12;
    return 440 * Math.pow(2, (n - 69) / 12);
  }
  var MUSICAS = {
    titulo: {
      bpm: 92,
      canais: [
        { onda: "square", vol: 0.05, notas: "A4 . C5 . E5 . D5 C5 | C5 . A4 . F4 . A4 C5 | E5 . G5 . E5 D5 C5 . | D5 . B4 . G4 . B4 D5 | A4 . C5 . E5 . A5 . | G5 . F5 . E5 . C5 . | D5 . F5 . A5 . G5 F5 | E5 - - - B4 - - -" },
        { onda: "triangle", vol: 0.09, notas: "A2 . E3 . A3 . E3 . | F2 . C3 . F3 . C3 . | C3 . G3 . C4 . G3 . | G2 . D3 . G3 . D3 . | A2 . E3 . A3 . E3 . | F2 . C3 . F3 . C3 . | D3 . A3 . D4 . A3 . | E2 . B2 . E3 . G#3 ." }
      ]
    },
    acervo: {
      bpm: 80,
      canais: [
        { onda: "triangle", vol: 0.07, notas: "E4 . G4 . C5 . G4 . | A4 . C5 . E5 . C5 . | F4 . A4 . C5 . A4 . | G4 . B4 . D5 - - . | E5 . D5 . C5 . G4 . | A4 . G4 . E4 . C4 . | F4 . E4 . D4 . F4 . | G4 - - - . . . ." },
        { onda: "sine", vol: 0.1, notas: "C3 - - - G2 - - - | A2 - - - E2 - - - | F2 - - - C3 - - - | G2 - - - D3 - - - | C3 - - - G2 - - - | A2 - - - E2 - - - | D3 - - - A2 - - - | G2 - - - G2 - - -" }
      ]
    },
    curitiba: {
      bpm: 116,
      canais: [
        { onda: "square", vol: 0.045, notas: "A4 . C5 . A4 . F4 . | D5 . C5 . Bb4 . A4 . | G4 . A4 Bb4 C5 . E5 . | F5 - - - C5 . . . | D5 . F5 . A5 . F5 . | G5 . F5 . E5 . D5 . | C5 . E5 . G5 . Bb4 . | A4 - - - F4 . . ." },
        { onda: "triangle", vol: 0.09, notas: "F2 . C3 . F3 . C3 . | Bb2 . F3 . Bb3 . F3 . | C3 . G3 . C4 . G3 . | F2 . C3 . F3 . A3 . | D3 . A3 . D4 . A3 . | G2 . D3 . G3 . D3 . | C3 . G3 . C4 . E3 . | F2 . C3 . F3 . C3 ." }
      ]
    },
    usina: {
      bpm: 128,
      canais: [
        { onda: "square", vol: 0.04, notas: "D5 . . F5 . . A5 . | G5 . F5 . E5 . C5 . | Bb4 . . D5 . . F5 . | E5 - - - A4 . . . | D5 . . F5 . . A5 . | C6 . Bb5 . A5 . G5 . | F5 . E5 . D5 . C#5 . | D5 - - - . . . ." },
        { onda: "triangle", vol: 0.1, notas: "D2 D3 D2 D3 D2 D3 D2 D3 | C2 C3 C2 C3 C2 C3 C2 C3 | Bb1 Bb2 Bb1 Bb2 Bb1 Bb2 Bb1 Bb2 | A1 A2 A1 A2 A1 A2 C#3 A2 | D2 D3 D2 D3 D2 D3 D2 D3 | F2 F3 F2 F3 G2 G3 G2 G3 | Bb1 Bb2 A1 A2 A1 A2 A1 A2 | D2 D3 D2 D3 D2 D3 D2 D3" }
      ]
    },
    chefe: {
      bpm: 148,
      canais: [
        { onda: "square", vol: 0.04, notas: "E5 . E5 G5 . E5 D5 . | C5 . C5 D5 . E5 B4 . | E5 . E5 G5 . A5 G5 . | F#5 . E5 D5 . B4 . . | E5 . G5 . B5 . A5 G5 | F#5 . D5 . E5 . B4 . | C5 . E5 . G5 . F#5 E5 | D#5 - - - B4 - - -" },
        { onda: "triangle", vol: 0.1, notas: "E2 E3 E2 E3 E2 E3 E2 E3 | C2 C3 C2 C3 D2 D3 D2 D3 | E2 E3 E2 E3 E2 E3 E2 E3 | B1 B2 B1 B2 B1 B2 D#2 D#3 | E2 E3 E2 E3 G2 G3 G2 G3 | D2 D3 D2 D3 B1 B2 B1 B2 | C2 C3 C2 C3 A1 A2 A1 A2 | B1 B2 B1 B2 B1 B2 B1 B2" }
      ]
    },
    revisor: {
      bpm: 70,
      canais: [
        { onda: "triangle", vol: 0.07, notas: "C5 E5 G5 C6 G5 E5 C5 E5 | A4 C5 E5 A5 E5 C5 A4 C5 | F4 A4 C5 F5 C5 A4 F4 A4 | G4 B4 D5 G5 D5 B4 G4 B4" },
        { onda: "sine", vol: 0.1, notas: "C3 - - - - - - - | A2 - - - - - - - | F2 - - - - - - - | G2 - - - - - - -" }
      ]
    }
  };
  var Som = class {
    constructor() {
      this.ctx = null;
      this.musicaLigada = true;
      this.efeitosLigados = true;
      this.faixa = null;
      this.nomeFaixa = null;
      this.passo = 0;
      this.proximo = 0;
      try {
        const s = JSON.parse(localStorage.getItem("redame_som") || "{}");
        if (s.musica === false) this.musicaLigada = false;
        if (s.efeitos === false) this.efeitosLigados = false;
      } catch (e) {
      }
      setInterval(() => this.agendar(), 40);
    }
    destravar() {
      if (this.ctx) {
        if (this.ctx.state === "suspended") this.ctx.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.mestre = this.ctx.createGain();
      this.mestre.gain.value = 0.8;
      this.mestre.connect(this.ctx.destination);
      this.busMusica = this.ctx.createGain();
      this.busMusica.connect(this.mestre);
      this.busMusica.gain.value = this.musicaLigada ? 1 : 0;
      this.busEfeitos = this.ctx.createGain();
      this.busEfeitos.connect(this.mestre);
      this.busEfeitos.gain.value = this.efeitosLigados ? 1 : 0;
      if (this.nomeFaixa) this.tocarMusica(this.nomeFaixa, true);
    }
    salvarPref() {
      try {
        localStorage.setItem("redame_som", JSON.stringify({ musica: this.musicaLigada, efeitos: this.efeitosLigados }));
      } catch (e) {
      }
    }
    alternarMusica() {
      this.musicaLigada = !this.musicaLigada;
      if (this.busMusica) this.busMusica.gain.value = this.musicaLigada ? 1 : 0;
      this.salvarPref();
    }
    alternarEfeitos() {
      this.efeitosLigados = !this.efeitosLigados;
      if (this.busEfeitos) this.busEfeitos.gain.value = this.efeitosLigados ? 1 : 0;
      this.salvarPref();
    }
    nota(f, ini, dur, onda = "square", vol = 0.1, destino = null, deslize = 0) {
      if (!this.ctx || !f) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = onda;
      o.frequency.setValueAtTime(f, ini);
      if (deslize) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * deslize), ini + dur);
      g.gain.setValueAtTime(1e-4, ini);
      g.gain.exponentialRampToValueAtTime(vol, ini + 8e-3);
      g.gain.exponentialRampToValueAtTime(1e-4, ini + dur);
      o.connect(g);
      g.connect(destino || this.busEfeitos);
      o.start(ini);
      o.stop(ini + dur + 0.02);
    }
    ruido(ini, dur, vol = 0.1, filtroHz = 1200) {
      if (!this.ctx) return;
      const n = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const s = this.ctx.createBufferSource();
      s.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = filtroHz;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, ini);
      g.gain.exponentialRampToValueAtTime(1e-4, ini + dur);
      s.connect(f);
      f.connect(g);
      g.connect(this.busEfeitos);
      s.start(ini);
    }
    efeito(nome, tom = 1) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime + 5e-3;
      switch (nome) {
        case "blip":
          this.nota(620 * tom, t, 0.035, "square", 0.025);
          break;
        case "cursor":
          this.nota(880, t, 0.04, "square", 0.04);
          break;
        case "confirmar":
          this.nota(660, t, 0.06, "square", 0.05);
          this.nota(990, t + 0.06, 0.08, "square", 0.05);
          break;
        case "voltar":
          this.nota(500, t, 0.06, "square", 0.04);
          this.nota(330, t + 0.06, 0.08, "square", 0.04);
          break;
        case "item":
          ["C5", "E5", "G5", "C6"].forEach((n, i) => this.nota(freq(n), t + i * 0.07, 0.12, "square", 0.05));
          break;
        case "erro":
          this.nota(140, t, 0.18, "sawtooth", 0.05);
          break;
        case "girar":
          this.ruido(t, 0.05, 0.08, 3e3);
          this.nota(300, t, 0.05, "square", 0.03, null, 1.6);
          break;
        case "agua":
          this.ruido(t, 0.35, 0.05, 900);
          break;
        case "turbina":
          this.nota(110, t, 0.5, "sawtooth", 0.04, null, 3);
          break;
        case "sucesso":
          ["C5", "E5", "G5", "C6", "G5", "C6"].forEach((n, i) => this.nota(freq(n), t + i * 0.1, i === 5 ? 0.5 : 0.14, "square", 0.05));
          ["C3", "G3", "C4"].forEach((n, i) => this.nota(freq(n), t + i * 0.2, 0.3, "triangle", 0.08));
          break;
        case "revisor":
          this.nota(220, t, 0.9, "sine", 0.08, null, 4);
          this.nota(330, t + 0.1, 0.9, "triangle", 0.05, null, 3);
          break;
        case "brilho":
          this.nota(1400 + Math.random() * 600, t, 0.08, "sine", 0.04);
          break;
        case "porta":
          this.ruido(t, 0.12, 0.06, 600);
          break;
        case "tremor":
          this.ruido(t, 0.6, 0.12, 200);
          break;
        case "passo":
          this.ruido(t, 0.03, 0.02, 500);
          break;
        case "golpe":
          this.ruido(t, 0.09, 0.06, 2400);
          this.nota(420, t, 0.08, "triangle", 0.04, null, 0.6);
          break;
        case "acerto":
          this.nota(180, t, 0.08, "square", 0.06, null, 0.5);
          this.ruido(t, 0.06, 0.06, 1800);
          break;
        case "dano":
          this.nota(300, t, 0.2, "sawtooth", 0.06, null, 0.4);
          break;
        case "disparo":
          this.nota(900, t, 0.12, "sine", 0.05, null, 2.2);
          this.nota(600, t, 0.1, "square", 0.02, null, 1.8);
          break;
        case "esquiva":
          this.ruido(t, 0.12, 0.05, 900);
          break;
        case "escudo":
          this.nota(1200, t, 0.06, "square", 0.04);
          this.nota(1500, t + 0.03, 0.08, "square", 0.03);
          break;
        case "restaurado":
          ["E5", "G5", "C6"].forEach((n, i) => this.nota(freq(n), t + i * 0.05, 0.1, "triangle", 0.05));
          this.ruido(t, 0.15, 0.04, 3e3);
          break;
        case "aviso":
          this.nota(1300, t, 0.05, "square", 0.03);
          this.nota(1300, t + 0.09, 0.05, "square", 0.03);
          break;
        case "faisca":
          this.ruido(t, 0.08, 0.05, 4e3);
          this.nota(700, t, 0.08, "sawtooth", 0.025, null, 0.5);
          break;
        case "investida":
          this.nota(90, t, 0.4, "sawtooth", 0.05, null, 2.5);
          break;
        case "vapor":
          this.ruido(t, 0.8, 0.06, 1200);
          break;
      }
    }
    tocarMusica(nome, forcar = false) {
      if (!forcar && nome === this.nomeFaixa) return;
      this.nomeFaixa = nome;
      this.faixa = MUSICAS[nome] || null;
      if (!this.ctx || !this.faixa) return;
      this.faixa.seq = this.faixa.canais.map((c) => c.notas.replace(/\|/g, " ").split(/\s+/).filter(Boolean));
      this.passo = 0;
      this.proximo = this.ctx.currentTime + 0.1;
    }
    pararMusica() {
      this.nomeFaixa = null;
      this.faixa = null;
    }
    agendar() {
      if (!this.ctx || !this.faixa || !this.faixa.seq) return;
      const dur = 60 / this.faixa.bpm / 2;
      while (this.proximo < this.ctx.currentTime + 0.25) {
        this.faixa.canais.forEach((canal, k) => {
          const seq = this.faixa.seq[k];
          const nota = seq[this.passo % seq.length];
          if (nota === "." || nota === "-") return;
          let segura = 1;
          while (seq[(this.passo + segura) % seq.length] === "-" && segura < seq.length) segura++;
          this.nota(freq(nota), this.proximo, dur * segura * 0.95, canal.onda, canal.vol, this.busMusica);
        });
        this.passo++;
        this.proximo += dur;
      }
    }
  };

  // jogo/estado.js
  var CHAVE = "redame_save_v1";
  var Estado = class {
    constructor() {
      this.zerar();
    }
    zerar() {
      this.nome = "";
      this.vars = {};
      this.itens = [];
      this.mat = {};
      this.objetivo = "";
      this.mapa = null;
      this.x = 0;
      this.y = 0;
      this.dir = "frente";
      this.resgatadas = [];
      this.tempo = 0;
      this.vidaMax = 6;
      this.vida = 6;
    }
    v(nome) {
      if (nome.startsWith("mat:")) return this.mat[nome.slice(4)] || 0;
      return this.vars[nome] || 0;
    }
    qtd(mat) {
      return this.mat[mat] || 0;
    }
    coletar(mat, n = 1) {
      this.mat[mat] = this.qtd(mat) + n;
    }
    gastar(mat, n = 1) {
      this.mat[mat] = Math.max(0, this.qtd(mat) - n);
      if (!this.mat[mat]) delete this.mat[mat];
    }
    definir(nome, valor) {
      this.vars[nome] = valor;
    }
    somar(nome, n) {
      this.vars[nome] = this.v(nome) + n;
    }
    tem(item) {
      return this.itens.includes(item);
    }
    dar(item) {
      if (!this.tem(item)) this.itens.push(item);
    }
    tirar(item) {
      this.itens = this.itens.filter((i) => i !== item);
    }
    // Condicao: termos separados por espaco, todos precisam valer.
    //   flag   !flag   item:x   !item:x   resgatada:x   var>=n  var<=n  var==n  var!=n  var>n  var<n
    //   mat:ferro>=2 (quantidade de um material)
    condicao(texto) {
      if (!texto) return true;
      for (let termo of String(texto).trim().split(/\s+/)) {
        let neg = false;
        if (termo.startsWith("!")) {
          neg = true;
          termo = termo.slice(1);
        }
        let ok;
        const m = /^([\w:]+)(>=|<=|==|!=|>|<)(-?\d+)$/.exec(termo);
        if (m) {
          const a = this.v(m[1]);
          const b = parseInt(m[3], 10);
          ok = { ">=": a >= b, "<=": a <= b, "==": a === b, "!=": a !== b, ">": a > b, "<": a < b }[m[2]];
        } else if (termo.startsWith("item:")) ok = this.tem(termo.slice(5));
        else if (termo.startsWith("resgatada:")) ok = this.resgatadas.includes(termo.slice(10));
        else ok = this.v(termo) > 0;
        if (neg) ok = !ok;
        if (!ok) return false;
      }
      return true;
    }
    serializar() {
      return {
        versao: 1,
        nome: this.nome,
        vars: this.vars,
        itens: this.itens,
        mat: this.mat,
        objetivo: this.objetivo,
        mapa: this.mapa,
        x: this.x,
        y: this.y,
        dir: this.dir,
        resgatadas: this.resgatadas,
        tempo: this.tempo,
        vida: this.vida,
        vidaMax: this.vidaMax
      };
    }
    restaurar(d) {
      this.zerar();
      Object.assign(this, {
        nome: d.nome || "",
        vars: d.vars || {},
        itens: d.itens || [],
        mat: d.mat || {},
        objetivo: d.objetivo || "",
        mapa: d.mapa,
        x: d.x,
        y: d.y,
        dir: d.dir || "frente",
        resgatadas: d.resgatadas || [],
        tempo: d.tempo || 0,
        vidaMax: d.vidaMax || 6,
        vida: d.vida || d.vidaMax || 6
      });
    }
    salvar() {
      try {
        localStorage.setItem(CHAVE, JSON.stringify(this.serializar()));
        return true;
      } catch (e) {
        return false;
      }
    }
    static lerSave() {
      try {
        const s = localStorage.getItem(CHAVE);
        return s ? JSON.parse(s) : null;
      } catch (e) {
        return null;
      }
    }
    static apagarSave() {
      try {
        localStorage.removeItem(CHAVE);
      } catch (e) {
      }
    }
  };

  // jogo/mundo.js
  var TILES = {
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
    v: { t: ["cabo_v"] }
  };
  var R = Math.SQRT1_2;
  var LINHA_DIR = { baixo: 0, cima: 1, dir: 2, esq: 2 };
  var VETOR = { baixo: [0, 1], cima: [0, -1], esq: [-1, 0], dir: [1, 0] };
  var OPOSTA = { baixo: "cima", cima: "baixo", esq: "dir", dir: "esq" };
  var TELA_DIR = { baixo: [0, 1], cima: [0, -1], esq: [-1, 0], dir: [1, 0] };
  function intersecta(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function direcaoDe(dx, dy) {
    if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? "esq" : "dir";
    return dy < 0 ? "cima" : "baixo";
  }
  var Ator = class {
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
        espelhar: this.dir === "esq"
      });
    }
  };
  var Ent = class {
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
      if (!m.tileSolido(this.cx, this.cy + 1)) px = (this.cx + 0.5) * TILE;
      else if (!m.tileSolido(this.cx + 1, this.cy)) py = (this.cy + 0.5) * TILE;
      const b = iso(px, py);
      const h = m.alturaBloco(this.cx, this.cy);
      return { x: b.x, y: b.y - h * 0.5 };
    }
    topo() {
      if (this.tipo === "npc") {
        const p2 = iso(this.ator.x, this.ator.y);
        return { x: p2.x, y: p2.y - 40 };
      }
      if (this.tipo === "obj" || this.tipo === "coleta") {
        if (this.parede) {
          const p3 = this.pontoParede();
          return { x: p3.x, y: p3.y - this.meta.h / 2 - 6 };
        }
        const p2 = iso(this.centro.x, this.centro.y);
        if (this.iso && this.iso.tipo === "caixa") {
          const o = iso(this.x0, this.y0);
          return { x: p2.x, y: o.y - this.iso.ancora[1] - 4 };
        }
        return { x: p2.x, y: p2.y - this.meta.h - 4 };
      }
      if (this.tipo === "predio") {
        const p2 = iso(this.x0 + this.W / 2, this.y0 + this.D);
        return { x: p2.x, y: p2.y - 20 };
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
          const p2 = this.pontoParede();
          const q2 = m.quadros > 1 ? Math.floor(t * (this.def.fps || 4)) % m.quadros : 0;
          d.img("obj_" + this.def.obj, p2.x - m.w / 2, p2.y - m.h / 2, { sx: q2 * m.w, sw: m.w, sh: m.h });
          return;
        }
        if (I && I.tipo === "caixa") {
          const q2 = I.quadros > 1 ? Math.floor(t * (this.def.fps || 4)) % I.quadros : 0;
          const o = iso(this.x0, this.y0);
          d.img(I.sprite, o.x - I.ancora[0], o.y - I.ancora[1], { sx: q2 * I.w, sw: I.w, sh: I.h });
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
  };
  var Mundo = class {
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
            tch = e && e.chao || def.chao;
            if (e) pendentes.push([e, cx, cy]);
            else console.warn(`Caractere sem legenda no mapa ${def.id}: "${ch}"`);
          }
          this.chao.push(tch);
          if (TILES[tch]?.solido) this.solido[cy * this.w + cx] = 1;
        }
      }
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
          c.drawImage(atlas, k % IC.colunas * 32, Math.floor(k / IC.colunas) * 16, 32, 16, this.OX + (cx - cy) * TILE - 16, (cx + cy) * 8, 32, 16);
        }
      }
      this.chaoCanvas = cv;
    }
    memoria() {
      if (!this.def?.esquecimento) return 100;
      const v = this.estado.vars["memoria_" + this.def.id];
      return v === void 0 ? 0 : v;
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
        if (e === ignorar || ignorar && e.ator === ignorar) continue;
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
        else if (!(TELA_DIR[j.dir][0] === dx || TELA_DIR[j.dir][1] === dy)) j.dir = dy < 0 ? "cima" : "baixo";
        const vel = (ent.segurando("correr") ? 100 : 64) * (cb && cb.golpe ? 0.45 : 1) * dt;
        const n = dx && dy ? R : 1;
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
      const imgB = this.jogo.rec.img.iso_blocos;
      const altB = this.arte.iso_chao.blocos_altura;
      const j0 = this.jogador;
      const pj0 = iso(j0.x, j0.y);
      const profJ = j0.x + j0.y;
      const cobre = (o, p, h) => o > profJ + 4 && Math.abs(p.x - pj0.x) < 26 && pj0.y - 34 < p.y + 16 && pj0.y > p.y - h;
      const blocoFn = (im, sx2, w, h, p, alpha) => () => {
        if (alpha < 1) c.globalAlpha = alpha;
        c.drawImage(im, sx2, 0, w, 16 + h, p.x - 16, p.y - h, w, 16 + h);
        c.globalAlpha = 1;
      };
      for (const b of this.blocos) {
        const p = iso(b.cx * TILE, b.cy * TILE);
        if (!this.visivelNaTela(p.x, p.y)) continue;
        const o = (b.cx + b.cy + 1) * TILE;
        lista.push({ o, d: blocoFn(imgB, b.i * 32, 32, altB, p, cobre(o, p, altB) ? 0.35 : 1) });
      }
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
  };

  // jogo/roteiro.js
  function partesSe(resto) {
    const [cond, alvo] = resto.split("=>");
    const [sim, nao] = (alvo || "").split("|").map((s) => s.trim());
    return { cond: cond.trim(), sim, nao: nao || null };
  }
  var Roteirista = class {
    constructor(jogo) {
      this.jogo = jogo;
      this.roteiros = {};
    }
    adicionar(lista) {
      Object.assign(this.roteiros, lista);
    }
    texto(s) {
      const e = this.jogo.estado;
      return String(s).replace(/\{nome\}/g, e.nome || "Voc\xEA").replace(/\{v:([\w:]+)\}/g, (_, v) => String(e.v(v)));
    }
    async executar(id, ctx = {}) {
      const cmds = this.roteiros[id];
      if (!cmds) {
        console.warn(`Roteiro n\xE3o encontrado: ${id}`);
        return;
      }
      this.jogo.ocupado++;
      try {
        for (const c of cmds) {
          const r = await this.comando(c, ctx);
          if (r === "fim") break;
        }
      } finally {
        this.jogo.ocupado--;
      }
    }
    async comando(c, ctx) {
      const j = this.jogo;
      const e = j.estado;
      if (typeof c === "object") {
        if (c.escolha !== void 0) {
          const k = await j.ui.escolher(
            this.texto(c.escolha),
            c.quem || "narrador",
            c.emocao || "neutro",
            c.opcoes.map((o) => this.texto(o[0]))
          );
          const alvo = c.opcoes[k][1];
          if (alvo) await this.executar(alvo, ctx);
        }
        return;
      }
      const s = String(c).trim();
      const esp = s.indexOf(" ");
      const cmd = esp < 0 ? s : s.slice(0, esp);
      const resto = esp < 0 ? "" : s.slice(esp + 1).trim();
      const a = resto.split(/\s+/);
      switch (cmd) {
        case "fala": {
          const m = /^(\S+)\s+(\S+)\s+([\s\S]*)$/.exec(resto);
          await j.ui.falar(m[1], m[2], this.texto(m[3]));
          break;
        }
        case "narra":
          await j.ui.falar("narrador", "neutro", this.texto(resto));
          break;
        case "flag":
          e.definir(a[0], 1);
          break;
        case "desflag":
          e.definir(a[0], 0);
          break;
        case "somar":
          e.somar(a[0], parseInt(a[1], 10));
          break;
        case "definir":
          e.definir(a[0], parseInt(a[1], 10));
          break;
        case "dar": {
          e.dar(a[0]);
          const it = j.rec.dados.itens[a[0]];
          j.som.efeito("item");
          await j.ui.falar("narrador", "neutro", `Voc\xEA recebeu: ${it ? it.nome : a[0]}!`, { icone: "item_" + a[0] });
          break;
        }
        case "tirar":
          e.tirar(a[0]);
          break;
        case "coletar": {
          const n = a[1] ? parseInt(a[1], 10) : 1;
          e.coletar(a[0], n);
          j.som.efeito("item");
          j.ui.aviso(`+${n} ${j.rec.dados.materiais.materiais[a[0]]?.nome || a[0]}`);
          break;
        }
        case "gastar":
          e.gastar(a[0], a[1] ? parseInt(a[1], 10) : 1);
          break;
        case "bancada":
          await j.abrirBancada();
          break;
        case "coracao":
          e.vidaMax += 2;
          e.vida = e.vidaMax;
          j.som.efeito("sucesso");
          j.ui.aviso("Cora\xE7\xE3o de Engenheira: +1 cora\xE7\xE3o!");
          break;
        case "curar":
          e.vida = e.vidaMax;
          if (j.combate) j.combate.energia = 5;
          break;
        case "objetivo":
          e.objetivo = resto === "-" ? "" : this.texto(resto);
          if (e.objetivo) j.ui.novoObjetivo();
          break;
        case "rodar":
          await this.executar(a[0], ctx);
          break;
        case "se": {
          const p = partesSe(resto);
          if (e.condicao(p.cond)) await this.executar(p.sim, ctx);
          else if (p.nao) await this.executar(p.nao, ctx);
          break;
        }
        case "ir":
          await j.irPara(a[0], a[1]);
          break;
        case "esperar":
          await j.esperar(parseFloat(a[0]));
          break;
        case "tremer":
          j.mundo.tremor = parseFloat(a[0]);
          j.som.efeito("tremor");
          break;
        case "som":
          j.som.efeito(a[0]);
          break;
        case "musica":
          if (a[0] === "nada") j.som.pararMusica();
          else j.som.tocarMusica(a[0]);
          break;
        case "memoria":
          e.definir("memoria_" + j.mundo.def.id, parseInt(a[0], 10));
          break;
        case "minigame":
          await j.abrirMinigame(a[0]);
          break;
        case "gravar":
          await j.gravar(a[0]);
          break;
        case "caderneta":
          await j.abrirCaderneta(a[0] || null);
          break;
        case "andar":
        case "partir": {
          const ator = j.mundo.ator(a[0]);
          if (!ator) {
            console.warn(`Ator n\xE3o encontrado: ${a[0]}`);
            break;
          }
          const p = j.mundo.andar(ator, parseInt(a[1], 10), parseInt(a[2], 10), a[3] ? parseFloat(a[3]) : void 0);
          if (cmd === "andar") await p;
          break;
        }
        case "olhar": {
          const ator = j.mundo.ator(a[0]);
          if (ator) ator.dir = a[1];
          break;
        }
        case "esconder":
          j.esconderJogador = true;
          break;
        case "mostrar":
          j.esconderJogador = false;
          break;
        case "titulo":
          j.ui.banner(this.texto(resto));
          break;
        case "aviso":
          j.ui.aviso(this.texto(resto));
          break;
        case "salvar":
          j.salvar(true);
          break;
        case "nome":
          await j.pedirNome();
          break;
        case "revisor":
          await j.abrirSeletor();
          break;
        case "fim":
          return "fim";
        case "fimdemo":
          await j.fimDemo();
          break;
        case "fade":
          await j.fade(a[0] === "sair" ? 1 : 0, a[1] ? parseFloat(a[1]) : 0.5);
          break;
        case "flash":
          j.flash = 1;
          break;
        default:
          console.warn(`Comando desconhecido no roteiro: ${s}`);
      }
    }
  };

  // jogo/ui.js
  var Camada = class {
    constructor(jogo) {
      this.jogo = jogo;
      this.cobreTudo = false;
      this.t = 0;
    }
    atualizar() {
    }
    desenhar() {
    }
    fechar(valor) {
      this.jogo.desempilhar(this, valor);
    }
  };
  function clicouEm(ent, x, y, w, h) {
    return ent.cliques.some((c) => c.x >= x && c.x < x + w && c.y >= y && c.y < y + h);
  }
  var Dialogo = class extends Camada {
    constructor(jogo, quem, emocao, texto, opc = {}) {
      super(jogo);
      const pers = jogo.rec.dados.personagens;
      this.p = pers[quem] || pers.narrador;
      const traje = jogo.mundo?.def?.traje;
      if (quem === "protagonista" && traje && jogo.rec.img["ret_protagonista_" + traje]) this.p = { ...this.p, retrato: "protagonista_" + traje };
      this.quem = quem;
      this.emocao = emocao;
      this.icone = opc.icone || null;
      this.semFechar = !!opc.semFechar;
      const d = jogo.d;
      const largura = this.p.retrato || this.icone ? 240 : 292;
      const linhas = d.quebrar(texto, largura);
      this.paginas = [];
      for (let i = 0; i < linhas.length; i += 4) this.paginas.push(linhas.slice(i, i + 4));
      this.pag = 0;
      this.chars = 0;
      this.blip = 0;
    }
    totalPagina() {
      return this.paginas[this.pag].reduce((s, l) => s + [...l].length, 0);
    }
    completo() {
      return this.chars >= this.totalPagina();
    }
    atualizar(dt, ent) {
      this.t += dt;
      const avancar = ent.apertou("acao") || ent.apertou("voltar") || ent.cliques.length > 0;
      if (!this.completo()) {
        const antes = Math.floor(this.chars);
        this.chars += dt * (ent.segurando("acao") && this.t > 0.25 ? 120 : 52);
        if (Math.floor(this.chars / 3) !== Math.floor(antes / 3) && this.quem !== "narrador") {
          this.jogo.som.efeito("blip", this.p.voz || 1);
        }
        if (avancar && this.t > 0.08) this.chars = this.totalPagina();
        return;
      }
      if (this.semFechar) return;
      if (avancar) {
        if (this.pag < this.paginas.length - 1) {
          this.pag++;
          this.chars = 0;
          this.jogo.som.efeito("cursor");
        } else this.fechar();
      }
    }
    desenhar(d, t) {
      const y0 = ALT - 58;
      d.painel(4, y0, LARG - 8, 54);
      let tx = 14;
      if (this.p.retrato) {
        d.retrato(this.p.retrato, this.emocao, 8, y0 + 1);
        tx = 66;
      } else if (this.icone) {
        d.painel(10, y0 + 11, 32, 32, "ui_papel");
        d.img(this.icone, 18, y0 + 19);
        tx = 50;
      }
      let ty = y0 + 6;
      if (this.p.nome) {
        const nome = this.p.nome.replace("{nome}", this.jogo.estado.nome || "Voc\xEA");
        d.texto(nome, tx, ty, COR.titulo, { sombra: true });
        ty += 11;
      } else ty += 5;
      let resta = Math.floor(this.chars);
      for (const l of this.paginas[this.pag]) {
        const vis = [...l].slice(0, Math.max(0, resta)).join("");
        d.texto(vis, tx, ty, this.quem === "narrador" ? "#d6dcf5" : COR.texto, { sombra: true });
        resta -= [...l].length;
        ty += 9;
      }
      if (this.completo() && !this.semFechar) {
        d.img("ui_seta", LARG - 18, ALT - 13 + Math.round(Math.sin(t * 8)), {});
      }
    }
  };
  var Menu = class extends Camada {
    constructor(jogo, opcoes, opc = {}) {
      super(jogo);
      this.opcoes = opcoes;
      this.sel = opc.sel || 0;
      this.x = opc.x;
      this.y = opc.y;
      this.titulo = opc.titulo || null;
      this.podeVoltar = opc.podeVoltar !== false;
      this.fundo = opc.fundo || "ui_painel";
      this.larg = opc.larg || null;
      this.escurecer = opc.escurecer || 0;
      this.cobreTudo = !!opc.cobreTudo;
    }
    geometria() {
      const d = this.jogo.d;
      const larg = this.larg || Math.max(80, ...this.opcoes.map((o) => d.medir(o.texto) + 30), this.titulo ? d.medir(this.titulo) + 20 : 0);
      const alt = this.opcoes.length * 12 + 12 + (this.titulo ? 14 : 0);
      const x = this.x ?? Math.floor((LARG - larg) / 2);
      const y = this.y ?? Math.floor((ALT - alt) / 2);
      return { x, y, larg, alt };
    }
    atualizar(dt, ent) {
      this.t += dt;
      const n = this.opcoes.length;
      if (ent.apertou("cima")) {
        this.sel = (this.sel + n - 1) % n;
        this.jogo.som.efeito("cursor");
      }
      if (ent.apertou("baixo")) {
        this.sel = (this.sel + 1) % n;
        this.jogo.som.efeito("cursor");
      }
      const g = this.geometria();
      const y0 = g.y + 8 + (this.titulo ? 14 : 0);
      for (let i = 0; i < n; i++) {
        if (clicouEm(ent, g.x, y0 + i * 12 - 2, g.larg, 12)) {
          this.sel = i;
          this.escolher();
          return;
        }
      }
      if (ent.apertou("acao")) this.escolher();
      else if (this.podeVoltar && (ent.apertou("voltar") || ent.apertou("menu"))) {
        this.jogo.som.efeito("voltar");
        this.fechar(-1);
      }
    }
    escolher() {
      const o = this.opcoes[this.sel];
      if (o.inativo) {
        this.jogo.som.efeito("erro");
        return;
      }
      this.jogo.som.efeito("confirmar");
      if (o.acao) o.acao(this);
      else this.fechar(this.sel);
    }
    desenhar(d, t) {
      if (this.escurecer) d.ret(0, 0, LARG, ALT, `rgba(10,8,20,${this.escurecer})`);
      const g = this.geometria();
      d.painel(g.x, g.y, g.larg, g.alt, this.fundo);
      let y = g.y + 7;
      if (this.titulo) {
        d.texto(this.titulo, g.x + g.larg / 2, y, COR.titulo, { alinhar: "centro", sombra: true });
        y += 14;
      }
      this.opcoes.forEach((o, i) => {
        const cor = o.inativo ? COR.fraco : i === this.sel ? COR.destaque : COR.texto;
        if (i === this.sel) d.img("ui_cursor", g.x + 7 + Math.round(Math.sin(t * 8)), y);
        d.texto(o.texto, g.x + 18, y, cor, { sombra: true });
        y += 12;
      });
    }
  };
  var Escolha = class extends Camada {
    constructor(jogo, pergunta, quem, emocao, opcoes) {
      super(jogo);
      this.dialogo = new Dialogo(jogo, quem, emocao, pergunta, { semFechar: true });
      this.menu = new Menu(jogo, opcoes.map((t) => ({ texto: t })), { podeVoltar: false });
      this.menu.fechar = (v) => this.fechar(v);
    }
    atualizar(dt, ent) {
      if (!this.dialogo.completo()) {
        this.dialogo.atualizar(dt, ent);
        return;
      }
      const g = this.menu.geometria();
      this.menu.x = LARG - g.larg - 6;
      this.menu.y = ALT - 62 - g.alt;
      this.menu.atualizar(dt, ent);
    }
    desenhar(d, t) {
      this.dialogo.desenhar(d, t);
      if (this.dialogo.completo()) this.menu.desenhar(d, t);
    }
  };
  var Hud = class {
    constructor(jogo) {
      this.jogo = jogo;
      this.avisos = [];
      this.faixa = null;
      this.brilhoObjetivo = 0;
    }
    aviso(texto) {
      const ultimo = this.avisos[this.avisos.length - 1];
      if (ultimo && ultimo.texto === texto) {
        ultimo.t = Math.min(ultimo.t, 0.3);
        return;
      }
      this.avisos.push({ texto, t: 0 });
      while (this.avisos.length > 2) this.avisos.shift();
    }
    banner(texto) {
      this.faixa = { texto, t: 0 };
    }
    novoObjetivo() {
      this.brilhoObjetivo = 2.2;
      this.jogo.som.efeito("confirmar");
    }
    atualizar(dt) {
      for (const a of this.avisos) a.t += dt;
      this.avisos = this.avisos.filter((a) => a.t < 3);
      if (this.faixa) {
        this.faixa.t += dt;
        if (this.faixa.t > 3.4) this.faixa = null;
      }
      this.brilhoObjetivo = Math.max(0, this.brilhoObjetivo - dt);
    }
    desenharObjetivo(d, t, mostrarObjetivo, dy = 0) {
      const e = this.jogo.estado;
      if (mostrarObjetivo && e.objetivo) {
        const linhas = d.quebrar(e.objetivo, 150);
        const h = 14 + linhas.length * 9;
        d.painel(3, 3 + dy, 170, h);
        const corT = this.brilhoObjetivo > 0 && Math.floor(t * 6) % 2 === 0 ? COR.destaque : COR.titulo;
        d.texto(this.brilhoObjetivo > 0 ? "NOVO OBJETIVO" : "OBJETIVO", 10, 7 + dy, corT, { sombra: true });
        linhas.forEach((l, i) => d.texto(l, 10, 17 + dy + i * 9, COR.texto, { sombra: true }));
      }
      if (mostrarObjetivo && e.itens.length) {
        const n = e.itens.length;
        d.painel(LARG - 8 - n * 17, 3, n * 17 + 5, 24);
        e.itens.forEach((it, i) => d.img("item_" + it, LARG - 5 - (n - i) * 17, 7));
      }
      const mats = Object.entries(e.mat).filter(([, q]) => q > 0);
      if (mostrarObjetivo && mats.length) {
        const y = e.itens.length ? 29 : 3;
        const w = mats.length * 28 + 6;
        d.painel(LARG - 3 - w, y, w, 24);
        mats.forEach(([m, q], i) => {
          const x = LARG - w + i * 28 + 1;
          d.img("mat_" + m, x, y + 4);
          d.texto(String(q), x + 17, y + 12, COR.texto, { sombra: true });
        });
      }
    }
    desenharAvisos(d) {
      this.avisos.forEach((a, i) => {
        const w = d.medir(a.texto) + 16;
        const entrada = Math.min(1, a.t * 5);
        const y = 30 + i * 18 - (1 - entrada) * 8;
        d.ctx.globalAlpha = a.t > 2.6 ? Math.max(0, (3 - a.t) / 0.4) : entrada;
        d.painel((LARG - w) / 2, y, w, 16, "ui_holograma");
        d.texto(a.texto, LARG / 2, y + 4, COR.destaque, { alinhar: "centro" });
        d.ctx.globalAlpha = 1;
      });
      if (this.faixa) {
        const f = this.faixa;
        const a = f.t < 0.4 ? f.t / 0.4 : f.t > 2.8 ? Math.max(0, (3.4 - f.t) / 0.6) : 1;
        d.ctx.globalAlpha = a;
        const w = Math.min(LARG - 16, d.medir(f.texto, 2) + 36);
        const x = Math.round((LARG - w) / 2);
        d.ret(x + 10, 92, 4, 14, "#46301c");
        d.ret(x + w - 14, 92, 4, 14, "#46301c");
        d.painel(x, 62, w, 32, "ui_madeira");
        d.texto(f.texto, LARG / 2, 70, "#f4e6c4", { alinhar: "centro", escala: 2, sombra: "#2a1a0c" });
        d.ctx.globalAlpha = 1;
      }
    }
  };
  var Titulo = class extends Camada {
    constructor(jogo, temSave) {
      super(jogo);
      this.cobreTudo = true;
      this.iniciado = false;
      this.temSave = temSave;
      this.estrelas = Array.from({ length: 70 }, () => ({ x: Math.random() * LARG, y: Math.random() * ALT, v: Math.random() }));
      const ops = [];
      if (temSave) ops.push({ texto: "Continuar", acao: () => this.fechar("continuar") });
      ops.push({ texto: "Novo jogo", acao: () => this.fechar("novo") });
      ops.push({ texto: "Tela cheia", acao: () => jogo.telaCheia() });
      this.menu = new Menu(jogo, ops, { podeVoltar: false, y: 116, larg: 110 });
    }
    atualizar(dt, ent) {
      this.t += dt;
      if (!this.iniciado) {
        if (ent.apertou("acao") || ent.apertou("menu") || ent.cliques.length) {
          this.iniciado = true;
          this.jogo.som.destravar();
          this.jogo.som.tocarMusica("titulo");
          this.jogo.som.efeito("confirmar");
          ent.limpar();
        }
        return;
      }
      this.menu.atualizar(dt, ent);
    }
    desenhar(d, t) {
      const c = d.ctx;
      const g = c.createLinearGradient(0, 0, 0, ALT);
      g.addColorStop(0, "#0d0b1c");
      g.addColorStop(1, "#262046");
      c.fillStyle = g;
      c.fillRect(0, 0, LARG, ALT);
      for (const s of this.estrelas) {
        const b = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.5 + s.v) + s.x));
        d.ret(s.x, s.y, 1, 1, `rgba(220,230,255,${b * 0.8})`);
      }
      const q = Math.floor(t * 4) % 7;
      d.img("ret_revisor", LARG / 2 - 48, 6, { sx: q * 48, sw: 48, sh: 48, escala: 2, alpha: 0.35 });
      d.texto("REDAME", LARG / 2, 34, COR.titulo, { alinhar: "centro", escala: 4, contorno: "#3a2410", sombra: "#120c06" });
      d.texto("O Resgate do Legado", LARG / 2, 74, COR.destaque, { alinhar: "centro", escala: 2, sombra: true });
      d.texto("15 engenheiras pioneiras. Uma m\xE1quina do tempo. Nenhum nome esquecido.", LARG / 2, 96, COR.fraco, { alinhar: "centro" });
      if (!this.iniciado) {
        if (Math.floor(t * 2) % 2 === 0) d.texto(this.jogo.ent.usouToque ? "Toque para come\xE7ar" : "Clique ou pressione Enter para come\xE7ar", LARG / 2, 132, COR.texto, { alinhar: "centro", sombra: true });
      } else this.menu.desenhar(d, t);
      const dica = this.jogo.ent.usouToque ? "Direcional: andar   A: agir/golpe   B: pulso   Esquiva   Menu" : "Setas: andar na grade   Espa\xE7o: agir/golpe   X: pulso   Shift: esquiva";
      d.texto(dica, LARG / 2, ALT - 11, "#6c7299", { alinhar: "centro" });
    }
  };
  var GRADE_NOME = [
    "ABCDEFGHIJKLM",
    "NOPQRSTUVWXYZ",
    "abcdefghijklm",
    "nopqrstuvwxyz",
    "\xC1\xC2\xC3\xC9\xCA\xCD\xD3\xD4\xD5\xDA\xC7-'",
    "\xE1\xE2\xE3\xE9\xEA\xED\xF3\xF4\xF5\xFA\xE7. "
  ];
  var EntradaNome = class extends Camada {
    constructor(jogo) {
      super(jogo);
      this.cobreTudo = true;
      this.nome = "";
      this.cx = 0;
      this.cy = 0;
      this.max = 12;
    }
    celulas() {
      const linhas = GRADE_NOME.map((l) => [...l]);
      linhas.push(["ESPA\xC7O", "APAGAR", "PRONTO"]);
      return linhas;
    }
    tecla(ch) {
      if (ch === "APAGAR" || ch === "\b") this.nome = [...this.nome].slice(0, -1).join("");
      else if (ch === "PRONTO" || ch === "\n") {
        const n = this.nome.trim();
        if (!n) {
          this.jogo.som.efeito("erro");
          return;
        }
        this.jogo.som.efeito("confirmar");
        this.fechar(n);
        return;
      } else if (ch === "ESPA\xC7O") {
        if (this.nome.length && [...this.nome].length < this.max) this.nome += " ";
      } else if ([...this.nome].length < this.max && ch.length === 1) this.nome += ch;
      this.jogo.som.efeito("blip");
    }
    atualizar(dt, ent) {
      this.t += dt;
      const cel = this.celulas();
      for (const ch of ent.texto) {
        if (ch === "\b" || ch === "\n" || /^[\p{L} .'-]$/u.test(ch)) {
          this.tecla(ch);
          if (ch === "\n") return;
        }
      }
      if (ent.texto.length) return;
      const mover = (dx, dy) => {
        this.cy = (this.cy + dy + cel.length) % cel.length;
        this.cx = clamp(this.cx + dx, 0, cel[this.cy].length - 1);
        if (dx) this.cx = (this.cx + cel[this.cy].length) % cel[this.cy].length;
        this.jogo.som.efeito("cursor");
      };
      if (ent.apertou("cima")) mover(0, -1);
      if (ent.apertou("baixo")) mover(0, 1);
      if (ent.apertou("esq")) mover(-1, 0);
      if (ent.apertou("dir")) mover(1, 0);
      for (const c of ent.cliques) {
        const p = this.posCelula(c.x, c.y);
        if (p) {
          this.cx = p[0];
          this.cy = p[1];
          this.tecla(cel[p[1]][p[0]]);
          return;
        }
      }
      if (ent.apertou("acao")) this.tecla(cel[this.cy][this.cx]);
    }
    posCelula(x, y) {
      const cel = this.celulas();
      for (let j = 0; j < cel.length; j++) {
        for (let i = 0; i < cel[j].length; i++) {
          const r = this.rectCelula(i, j);
          if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return [i, j];
        }
      }
      return null;
    }
    rectCelula(i, j) {
      if (j < GRADE_NOME.length) return { x: 70 + i * 13, y: 62 + j * 13, w: 13, h: 13 };
      return { x: 76 + i * 58, y: 62 + j * 13 + 4, w: 54, h: 13 };
    }
    desenhar(d, t) {
      d.ret(0, 0, LARG, ALT, "#14121e");
      d.painel(40, 6, 240, 168);
      d.retrato("protagonista_jaleco", "feliz", 52, 12);
      d.texto("Qual \xE9 o seu nome?", 112, 18, COR.titulo, { sombra: true });
      d.texto("A estudante do projeto REDAME", 112, 30, COR.fraco);
      d.painel(110, 40, 160, 16, "ui_papel");
      const cursor = Math.floor(t * 3) % 2 === 0 ? "_" : "";
      d.texto(this.nome + cursor, 116, 44, COR.papel);
      const cel = this.celulas();
      cel.forEach(
        (linha, j) => linha.forEach((ch, i) => {
          const r = this.rectCelula(i, j);
          const sel = i === this.cx && j === this.cy;
          if (sel) d.ret(r.x, r.y, r.w - 1, r.h - 1, "rgba(127,227,240,0.25)");
          d.texto(ch === " " ? "\xB7" : ch, r.x + r.w / 2, r.y + 3, sel ? COR.destaque : COR.texto, { alinhar: "centro" });
        })
      );
    }
  };
  var Inventario = class extends Camada {
    constructor(jogo) {
      super(jogo);
      this.sel = 0;
    }
    entradas() {
      const e = this.jogo.estado;
      const dados = this.jogo.rec.dados;
      const lista = e.itens.map((it) => ({ icone: "item_" + it, nome: dados.itens[it]?.nome || it, desc: dados.itens[it]?.desc || "", col: 0 }));
      for (const [m, q] of Object.entries(e.mat)) {
        const md = dados.materiais.materiais[m];
        if (q > 0) lista.push({ icone: "mat_" + m, nome: `${md?.nome || m}  \xD7${q}`, desc: md?.desc || "", col: 1 });
      }
      return lista;
    }
    atualizar(dt, ent) {
      const n = this.entradas().length;
      if (n) {
        if (ent.apertou("cima")) this.sel = (this.sel + n - 1) % n;
        if (ent.apertou("baixo")) this.sel = (this.sel + 1) % n;
      }
      if (ent.apertou("voltar") || ent.apertou("menu") || ent.apertou("acao") || ent.cliques.length) this.fechar();
    }
    desenhar(d) {
      d.ret(0, 0, LARG, ALT, "rgba(10,8,20,0.6)");
      d.painel(14, 10, 292, 160);
      const lista = this.entradas();
      d.texto("ITENS", 86, 17, COR.titulo, { alinhar: "centro", sombra: true });
      d.texto("MATERIAIS E PE\xC7AS", 232, 17, COR.titulo, { alinhar: "centro", sombra: true });
      d.ret(159, 18, 1, 122, "#3b3366");
      if (!lista.length) {
        d.texto("A mochila est\xE1 vazia.", LARG / 2, 70, COR.fraco, { alinhar: "centro" });
        return;
      }
      const linha = [0, 0];
      lista.forEach((it, i) => {
        const x = it.col ? 164 : 22;
        const y = 28 + linha[it.col] * 16;
        linha[it.col]++;
        if (i === this.sel) d.ret(x - 2, y - 1, 136, 16, "rgba(127,227,240,0.15)");
        d.img(it.icone, x, y);
        d.texto(it.nome, x + 19, y + 4, i === this.sel ? COR.destaque : COR.texto, { sombra: true });
      });
      const desc = lista[Math.min(this.sel, lista.length - 1)].desc;
      d.ret(22, 142, 276, 1, "#3b3366");
      d.quebrar(desc, 272).slice(0, 2).forEach((l, k) => d.texto(l, 24, 147 + k * 9, COR.fraco));
    }
  };
  var Bancada = class extends Camada {
    constructor(jogo) {
      super(jogo);
      const m = jogo.rec.dados.materiais;
      this.mats = m.materiais;
      this.receitas = m.receitas;
      this.sel = 0;
      this.brilho = 0;
    }
    pode(r) {
      return Object.entries(r.precisa).every(([m, n]) => this.jogo.estado.qtd(m) >= n);
    }
    montar() {
      const r = this.receitas[this.sel];
      const nome = this.mats[r.produz]?.nome || r.produz;
      if (!this.pode(r)) {
        this.jogo.som.efeito("erro");
        this.msg = { texto: "Faltam materiais para: " + nome, cor: COR.vermelho, t: 2.2 };
        return;
      }
      const e = this.jogo.estado;
      for (const [m, n] of Object.entries(r.precisa)) e.gastar(m, n);
      e.coletar(r.produz, r.qtd || 1);
      this.jogo.som.efeito("girar");
      this.jogo.som.efeito("item");
      this.brilho = 1;
      this.msg = { texto: `Montado: ${nome}!`, cor: COR.verde, t: 2.2 };
    }
    atualizar(dt, ent) {
      this.t += dt;
      this.brilho = Math.max(0, this.brilho - dt * 1.5);
      if (this.msg && (this.msg.t -= dt) <= 0) this.msg = null;
      const n = this.receitas.length;
      if (ent.apertou("cima")) {
        this.sel = (this.sel + n - 1) % n;
        this.jogo.som.efeito("cursor");
      }
      if (ent.apertou("baixo")) {
        this.sel = (this.sel + 1) % n;
        this.jogo.som.efeito("cursor");
      }
      for (const c of ent.cliques) {
        const i = Math.floor((c.y - 28) / 22);
        if (c.x >= 14 && c.x < 140 && i >= 0 && i < n) this.sel = i;
        if (c.x >= 216 && c.x < 304 && c.y >= 150 && c.y < 168) this.montar();
      }
      if (ent.apertou("acao")) this.montar();
      if (ent.apertou("voltar") || ent.apertou("menu")) {
        this.jogo.som.efeito("voltar");
        this.fechar();
      }
    }
    desenhar(d, t) {
      const e = this.jogo.estado;
      d.ret(0, 0, LARG, ALT, "rgba(10,8,20,0.65)");
      d.painel(8, 6, 304, 168);
      d.texto("BANCADA DE MONTAGEM", LARG / 2, 12, COR.titulo, { alinhar: "centro", sombra: true });
      d.ret(142, 24, 1, 120, "#3b3366");
      this.receitas.forEach((r2, i) => {
        const y = 28 + i * 22;
        const sel = i === this.sel;
        if (sel) d.ret(14, y - 2, 126, 21, "rgba(127,227,240,0.15)");
        d.img("mat_" + r2.produz, 18, y);
        d.texto(this.mats[r2.produz]?.nome || r2.produz, 38, y + 1, sel ? COR.destaque : COR.texto, { sombra: true });
        d.texto(`Voc\xEA tem: ${e.qtd(r2.produz)}`, 38, y + 10, this.pode(r2) ? COR.verde : COR.fraco);
      });
      const base = Object.keys(this.mats).filter((m) => !this.mats[m].peca);
      d.texto("Na mochila:", 16, 104, COR.fraco);
      base.forEach((m, i) => {
        const x = 16 + i % 2 * 62;
        const y = 114 + Math.floor(i / 2) * 18;
        d.img("mat_" + m, x, y);
        d.texto(`\xD7${e.qtd(m)}`, x + 18, y + 5, e.qtd(m) ? COR.texto : COR.fraco);
      });
      const r = this.receitas[this.sel];
      const md = this.mats[r.produz] || {};
      const pulo = this.brilho > 0 ? -Math.round(Math.sin(this.brilho * Math.PI) * 3) : 0;
      d.img("mat_" + r.produz, 150, 28 + pulo, { escala: 2 });
      d.texto(md.nome || r.produz, 188, 30, COR.titulo, { sombra: true });
      d.quebrar(md.desc || "", 116).slice(0, 3).forEach((l, k) => d.texto(l, 188, 41 + k * 9, COR.fraco));
      d.texto("Precisa de:", 150, 74, COR.texto);
      Object.entries(r.precisa).forEach(([m, n], k) => {
        const y = 84 + k * 18;
        const tem = e.qtd(m);
        d.img("mat_" + m, 150, y);
        d.texto(this.mats[m]?.nome || m, 170, y + 5, COR.texto);
        d.texto(`${tem}/${n}`, 302, y + 5, tem >= n ? COR.verde : COR.vermelho, { alinhar: "direita" });
      });
      const ok = this.pode(r);
      if (this.msg) d.texto(this.msg.texto, 16, 157, this.msg.cor, { sombra: true });
      d.painel(216, 150, 88, 18, ok ? "ui_holograma" : "ui_painel");
      d.texto(this.jogo.ent.usouToque ? "Montar" : "Montar (Espa\xE7o)", 260, 155, ok ? COR.destaque : COR.fraco, { alinhar: "centro" });
      if (this.brilho > 0) {
        d.ctx.globalAlpha = this.brilho * 0.5;
        d.ret(146, 24, 160, 46, "#fff6c8");
        d.ctx.globalAlpha = 1;
      }
    }
  };
  var Caderneta = class extends Camada {
    constructor(jogo, focar) {
      super(jogo);
      this.cobreTudo = true;
      this.lista = jogo.rec.dados.pioneiras.pioneiras;
      this.sel = Math.max(0, this.lista.findIndex((p) => p.id === focar));
      this.pag = 0;
    }
    resgatada(p) {
      return this.jogo.estado.resgatadas.includes(p.id);
    }
    paginas(d) {
      const p = this.lista[this.sel];
      if (!this.resgatada(p)) return [];
      const pars = [d.quebrar(p.obra, 124).map((l) => ({ l, cor: COR.papel }))];
      for (const c of p.curiosidades) pars.push(d.quebrar("\u2022 " + c, 124).map((l) => ({ l, cor: "#4a3a30" })));
      const pags = [[]];
      let cap = 9;
      for (const par of pars) {
        let pg = pags[pags.length - 1];
        const sep = pg.length ? 1 : 0;
        if (pg.length && pg.length + sep + par.length > cap) {
          pg = [];
          pags.push(pg);
          cap = 15;
        } else if (sep) pg.push({ l: "", cor: COR.papel });
        pg.push(...par);
      }
      return pags.filter((pg) => pg.length);
    }
    atualizar(dt, ent) {
      this.t += dt;
      const n = this.lista.length;
      if (ent.apertou("cima")) {
        this.sel = (this.sel + n - 1) % n;
        this.pag = 0;
        this.jogo.som.efeito("cursor");
      }
      if (ent.apertou("baixo")) {
        this.sel = (this.sel + 1) % n;
        this.pag = 0;
        this.jogo.som.efeito("cursor");
      }
      const total = Math.max(1, this.paginas(this.jogo.d).length);
      if (ent.apertou("dir") || ent.apertou("acao")) {
        if (this.pag < total - 1) {
          this.pag++;
          this.jogo.som.efeito("cursor");
        }
      }
      if (ent.apertou("esq") && this.pag > 0) {
        this.pag--;
        this.jogo.som.efeito("cursor");
      }
      for (const c of ent.cliques) {
        if (c.x < 156 && c.y >= 27 && c.y < 27 + n * 9) {
          this.sel = Math.floor((c.y - 27) / 9);
          this.pag = 0;
        } else if (c.x > 164) {
          this.pag = (this.pag + 1) % total;
        }
      }
      if (ent.apertou("voltar") || ent.apertou("menu")) {
        this.jogo.som.efeito("voltar");
        this.fechar();
      }
    }
    desenhar(d, t) {
      d.img("ui_caderneta", 0, 0);
      d.texto("CADERNETA REDAME", 85, 15, COR.papel, { alinhar: "centro" });
      const n = this.jogo.estado.resgatadas.length;
      d.texto(`${n}/15`, 150, 15, COR.papelFraco, { alinhar: "direita" });
      this.lista.forEach((p2, i) => {
        const y2 = 28 + i * 9;
        const ok = this.resgatada(p2);
        if (i === this.sel) d.ret(24, y2 - 1, 130, 9, "rgba(127,180,240,0.35)");
        const num = String(p2.fase).padStart(2, "0");
        d.texto(num, 26, y2, COR.papelFraco);
        d.texto(ok ? p2.nome : `??? \xB7 ${p2.local}`, 38, y2, ok ? COR.papel : "#a89884");
      });
      const p = this.lista[this.sel];
      const x = 178;
      if (!this.resgatada(p)) {
        for (let k = 0; k < 10; k++) d.ret(x, 30 + k * 10 + 3, 90 + k * 37 % 30, 3, "rgba(120,110,100,0.35)");
        d.texto("P\xE1gina apagada", 235, 70, COR.papel, { alinhar: "centro", escala: 1 });
        d.texto("pelo Esquecimento", 235, 80, COR.papel, { alinhar: "centro" });
        d.texto(`\xC9poca ${p.fase}: ${p.local}`, 235, 104, COR.papelFraco, { alinhar: "centro" });
        d.texto(p.area || "", 235, 114, COR.papelFraco, { alinhar: "centro" });
        d.texto("Resgate esta pioneira", 235, 136, "#7a5a40", { alinhar: "centro" });
        d.texto("para revelar sua hist\xF3ria.", 235, 145, "#7a5a40", { alinhar: "centro" });
        return;
      }
      const pags = this.paginas(d);
      const pg = Math.min(this.pag, pags.length - 1);
      let y = 16;
      if (pg === 0) {
        if (p.retrato) {
          d.ret(x - 1, y - 1, 50, 50, "#8a6a50");
          d.img("ret_" + p.retrato, x, y, { sx: 0, sw: 48, sh: 48 });
        }
        const tx = p.retrato ? x + 54 : x;
        const linhasNome = d.quebrar(p.nome, 300 - tx);
        linhasNome.forEach((l, k) => d.texto(l, tx, y + 2 + k * 9, "#2a1c14"));
        const yy = y + 4 + linhasNome.length * 9;
        d.texto(p.anos, tx, yy, COR.papelFraco);
        d.quebrar(p.local_completo || p.local, 300 - tx).forEach((l, k) => d.texto(l, tx, yy + 9 + k * 9, COR.papelFraco));
        y = 70;
      }
      for (const b of pags[pg] || []) {
        d.texto(b.l, x, y, b.cor);
        y += 9;
      }
      if (pags.length > 1) d.texto(`${pg > 0 ? "\xAB " : ""}${pg + 1}/${pags.length}${pg < pags.length - 1 ? " \xBB" : ""}`, 300, 160, COR.papelFraco, { alinhar: "direita" });
    }
  };
  var Gravacao = class extends Camada {
    constructor(jogo, pioneira) {
      super(jogo);
      this.p = pioneira;
      this.nome = pioneira.nome.toUpperCase();
      this.letras = 0;
      this.particulas = [];
      this.fim = false;
      this.cobreTudo = false;
    }
    atualizar(dt, ent) {
      this.t += dt;
      const inicio = 1.4;
      const alvo = Math.floor(Math.max(0, this.t - inicio) / 0.09);
      const total = [...this.nome].length;
      while (this.letras < Math.min(alvo, total)) {
        this.letras++;
        this.jogo.som.efeito("brilho");
        const d = this.jogo.d;
        const larg = d.medir(this.nome, 2);
        const x = LARG / 2 - larg / 2 + d.medir([...this.nome].slice(0, this.letras).join(""), 2);
        for (let k = 0; k < 4; k++) this.particulas.push({ x, y: 128, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 40, v: 1 });
      }
      for (const p of this.particulas) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 40 * dt;
        p.v -= dt;
      }
      this.particulas = this.particulas.filter((p) => p.v > 0);
      if (this.letras >= total && this.t > inicio + total * 0.09 + 1.6) {
        this.fim = true;
        if (ent.apertou("acao") || ent.cliques.length) this.fechar();
      }
    }
    desenhar(d, t) {
      const a = Math.min(0.88, this.t * 1.5);
      d.ret(0, 0, LARG, ALT, `rgba(6,10,24,${a})`);
      const q = Math.floor(t * 6) % 7;
      const pulso = 0.6 + 0.4 * Math.sin(t * 4);
      d.img("ret_revisor", LARG / 2 - 48, 12, { sx: q * 48, sw: 48, sh: 48, escala: 2, alpha: Math.min(1, this.t) * pulso });
      const vis = [...this.nome].slice(0, this.letras).join("");
      const larg = d.medir(this.nome, 2);
      d.texto(vis, LARG / 2 - larg / 2, 120, COR.titulo, { escala: 2, sombra: "#3a2410" });
      for (const p of this.particulas) d.img("ui_brilho", p.x, p.y, { alpha: Math.max(0, p.v) });
      const pos = this.t - (1.4 + [...this.nome].length * 0.09);
      if (pos > 0.3) {
        d.ctx.globalAlpha = Math.min(1, (pos - 0.3) * 2);
        d.texto("Nome gravado no Dispositivo REDAME", LARG / 2, 145, COR.destaque, { alinhar: "centro", sombra: true });
        d.texto("Nova p\xE1gina na Caderneta!", LARG / 2, 156, COR.texto, { alinhar: "centro", sombra: true });
        d.ctx.globalAlpha = 1;
      }
      if (this.fim) d.img("ui_seta", LARG - 18, ALT - 13 + Math.round(Math.sin(t * 8)));
    }
  };
  var Seletor = class extends Camada {
    constructor(jogo) {
      super(jogo);
      this.lista = jogo.rec.dados.pioneiras.pioneiras;
      this.sel = 0;
    }
    atualizar(dt, ent) {
      this.t += dt;
      const n = this.lista.length;
      if (ent.apertou("cima")) {
        this.sel = (this.sel + n - 1) % n;
        this.jogo.som.efeito("cursor");
      }
      if (ent.apertou("baixo")) {
        this.sel = (this.sel + 1) % n;
        this.jogo.som.efeito("cursor");
      }
      for (const c of ent.cliques) {
        const i = Math.floor((c.y - 30) / 9);
        if (c.x > 20 && c.x < 300 && i >= 0 && i < n) {
          this.sel = i;
          this.escolher();
          return;
        }
      }
      if (ent.apertou("acao")) this.escolher();
      if (ent.apertou("voltar") || ent.apertou("menu")) {
        this.jogo.som.efeito("voltar");
        this.fechar(null);
      }
    }
    escolher() {
      const p = this.lista[this.sel];
      if (p.mapa) {
        this.jogo.som.efeito("confirmar");
        this.fechar(p);
      } else {
        this.jogo.som.efeito("erro");
        this.jogo.ui.aviso("Esta \xE9poca ainda est\xE1 sendo reconstru\xEDda. Em breve!");
      }
    }
    desenhar(d, t) {
      d.ret(0, 0, LARG, ALT, "rgba(4,10,20,0.7)");
      d.painel(14, 8, 292, 164, "ui_holograma");
      d.texto("REVISOR DE \xC9POCAS", LARG / 2, 15, COR.destaque, { alinhar: "centro", sombra: true });
      this.lista.forEach((p, i) => {
        const y = 30 + i * 9;
        const ok = this.jogo.estado.resgatadas.includes(p.id);
        const sel = i === this.sel;
        if (sel) d.ret(20, y - 1, 280, 9, "rgba(127,227,240,0.18)");
        const cor = p.mapa ? sel ? COR.destaque : COR.texto : "#55708a";
        d.texto(String(p.fase).padStart(2, "0"), 24, y, cor);
        d.texto(p.local, 38, y, cor);
        d.texto(ok ? p.nome : p.mapa ? "???" : "em breve", 150, y, ok ? COR.verde : cor);
      });
    }
  };
  var FimDemo = class extends Camada {
    constructor(jogo) {
      super(jogo);
      this.cobreTudo = true;
    }
    atualizar(dt, ent) {
      this.t += dt;
      if (this.t > 2 && (ent.apertou("acao") || ent.cliques.length)) this.fechar();
    }
    desenhar(d, t) {
      d.ret(0, 0, LARG, ALT, "#0d0b1c");
      const q = Math.floor(t * 4) % 7;
      d.img("ret_revisor", LARG / 2 - 24, 14, { sx: q * 48, sw: 48, sh: 48 });
      d.texto("Fim da \xC9poca 1", LARG / 2, 70, COR.titulo, { alinhar: "centro", escala: 2, sombra: true });
      const txt = "Enedina Alves Marques est\xE1 de volta \xE0 hist\xF3ria. Mas outras 14 pioneiras ainda esperam pelo resgate. As pr\xF3ximas \xE9pocas do Revisor est\xE3o sendo reconstru\xEDdas...";
      d.quebrar(txt, 260).forEach((l, i) => d.texto(l, LARG / 2, 94 + i * 10, COR.texto, { alinhar: "centro" }));
      if (this.t > 2 && Math.floor(t * 2) % 2 === 0) d.texto("Continuar", LARG / 2, 156, COR.destaque, { alinhar: "centro" });
    }
  };

  // jogo/canos.js
  var VIZ = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  var BASE = { reto: [0, 2], curva: [0, 1], te: [0, 1, 2], cruz: [0, 1, 2, 3], ponta: [0] };
  var SIMBOLOS = {
    "\u2502": [0, 2],
    "\u2500": [1, 3],
    "\u2514": [0, 1],
    "\u250C": [1, 2],
    "\u2510": [2, 3],
    "\u2518": [0, 3],
    "\u251C": [0, 1, 2],
    "\u2524": [0, 2, 3],
    "\u252C": [1, 2, 3],
    "\u2534": [0, 1, 3],
    "\u253C": [0, 1, 2, 3],
    "\u2575": [0],
    "\u2576": [1],
    "\u2577": [2],
    "\u2574": [3]
  };
  var INDICE = { reto: 0, curva: 1, te: 2, cruz: 3, fonte: 4, turbina: 5, base: 6, bloqueio: 7, ponta: 8 };
  var girar = (lista, r) => lista.map((d) => (d + r) % 4).sort();
  var iguais = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  function aleatorio(semente) {
    let s = semente >>> 0 || 1;
    return () => {
      s = s + 1831565813 >>> 0;
      let t = s;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
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
    for (let r = 0; r < 4; r++) if (iguais(girar(BASE[c.tipo], r), conns)) {
      c.sol = r;
      break;
    }
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
  function montarNivel(def) {
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
        else if (ch !== "." && ch !== " ") throw new Error(`S\xEDmbolo desconhecido no n\xEDvel de canos: "${ch}"`);
        cel.push(c);
      }
    }
    const nivel = { w, h, cel };
    for (const c of cel) {
      if (c.tipo !== "fonte" && c.tipo !== "turbina") continue;
      for (let d = 0; d < 4; d++) {
        const v = celula(nivel, c.x + VIZ[d][0], c.y + VIZ[d][1]);
        if (v && BASE[v.tipo] && girar(BASE[v.tipo], v.sol).includes((d + 2) % 4)) c.conns.push(d);
      }
    }
    orientarFixas(nivel);
    for (const [x, y] of Array.isArray(def) ? [] : def.travadas || []) {
      const c = celula(nivel, x, y);
      if (c && BASE[c.tipo]) c.fixa = c.travada = true;
    }
    return nivel;
  }
  function gerarNivel(o, semente) {
    const r = aleatorio(semente);
    const { w, h } = o;
    const qtdTurbinas = o.turbinas || 2;
    for (let tentativa = 0; tentativa < 400; tentativa++) {
      const bloq = /* @__PURE__ */ new Set();
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
      const conns = Array.from({ length: w * h }, () => []);
      const inicio = abertas[Math.floor(r() * abertas.length)];
      const na = /* @__PURE__ */ new Set([inicio]);
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
      if (na.size !== abertas.length) continue;
      const folhas = abertas.filter((i) => conns[i].length === 1);
      if (folhas.length < qtdTurbinas + 1) continue;
      const esquerda = folhas.filter((i) => i % w < Math.ceil(w / 3));
      if (!esquerda.length) continue;
      const fonte = esquerda[Math.floor(r() * esquerda.length)];
      const dist = /* @__PURE__ */ new Map([[fonte, 0]]);
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
      const turbinas = /* @__PURE__ */ new Set();
      while (turbinas.size < qtdTurbinas) turbinas.add(metade[Math.floor(r() * metade.length)]);
      const cel = [];
      for (let i = 0; i < w * h; i++) {
        const c = { x: i % w, y: Math.floor(i / w), tipo: "base", rot: 0, sol: 0, fixa: true, conns: [] };
        if (bloq.has(i)) c.tipo = "bloqueio";
        else if (i === fonte) {
          c.tipo = "fonte";
          c.conns = [...conns[i]];
        } else if (turbinas.has(i)) {
          c.tipo = "turbina";
          c.conns = [...conns[i]];
        } else encaixar(c, [...conns[i]].sort());
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
    throw new Error("N\xE3o consegui gerar um n\xEDvel de canos com essas regras");
  }
  function celula(n, x, y) {
    if (x < 0 || y < 0 || x >= n.w || y >= n.h) return null;
    return n.cel[y * n.w + x];
  }
  function aberturas(c) {
    if (c.tipo === "fonte" || c.tipo === "turbina") return c.conns;
    if (BASE[c.tipo]) return girar(BASE[c.tipo], c.rot);
    return [];
  }
  function fluxo(n) {
    const dist = /* @__PURE__ */ new Map();
    const fila = [];
    for (const c of n.cel) if (c.tipo === "fonte") {
      dist.set(c, 0);
      fila.push(c);
    }
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
  function vazamentos(n, dist = fluxo(n)) {
    const lista = [];
    for (const c of dist.keys()) {
      for (const d of aberturas(c)) {
        const v = celula(n, c.x + VIZ[d][0], c.y + VIZ[d][1]);
        if (!v || !aberturas(v).includes((d + 2) % 4)) lista.push({ c, d });
      }
    }
    return lista;
  }
  function resolvido(n, regraVazamento = false, dist = fluxo(n)) {
    const turb = n.cel.filter((c) => c.tipo === "turbina");
    if (!turb.length || !turb.every((c) => dist.has(c))) return false;
    return !regraVazamento || vazamentos(n, dist).length === 0;
  }
  function embaralhar(n, regraVazamento = false, aleat = Math.random) {
    const moveis = n.cel.filter((c) => BASE[c.tipo] && !c.fixa);
    for (let tent = 0; tent < 80; tent++) {
      for (const c of moveis) c.rot = Math.floor(aleat() * 4);
      const fora = moveis.filter((c) => !iguais(girar(BASE[c.tipo], c.rot), girar(BASE[c.tipo], c.sol))).length;
      if (!resolvido(n, regraVazamento) && fora >= Math.ceil(moveis.length * 0.6)) return;
    }
  }
  function criarNivel(nd, semente) {
    return nd.gerar ? gerarNivel(nd.gerar, semente) : montarNivel(nd);
  }
  var MiniCanos = class extends Camada {
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
      if (novoTabuleiro || !this.nivel) this.nivel = criarNivel(nd, (Date.now() ^ this.k * 7919 ^ this.falhas * 104729) >>> 0);
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
      this.molhado = /* @__PURE__ */ new Map();
      this.vaz = [];
      this.recalcular(true);
    }
    recalcular(silencioso) {
      const dist = fluxo(this.nivel);
      const agora = this.t;
      const novo = /* @__PURE__ */ new Map();
      let turbinaNova = false;
      for (const [c, d] of dist) {
        const antes = this.molhado.get(c);
        novo.set(c, antes !== void 0 ? antes : agora + d * 0.04);
        if (antes === void 0 && c.tipo === "turbina") turbinaNova = true;
      }
      this.molhado = novo;
      this.vaz = this.regra ? vazamentos(this.nivel, dist) : [];
      if (!silencioso && dist.size > 1) this.jogo.som.efeito("agua");
      if (turbinaNova && !silencioso) this.jogo.som.efeito("turbina");
      if (resolvido(this.nivel, this.regra, dist) && !this.vitoria) {
        this.vitoria = 1e-4;
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
      const erradas = this.nivel.cel.filter((c2) => BASE[c2.tipo] && !c2.fixa && !iguais(girar(BASE[c2.tipo], c2.rot), girar(BASE[c2.tipo], c2.sol)));
      if (!erradas.length) return;
      const perto = erradas.filter((c2) => VIZ.some(([dx, dy]) => this.molhado.has(celula(this.nivel, c2.x + dx, c2.y + dy))));
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
        { texto: "Recome\xE7ar n\xEDvel", acao: (m) => {
          m.fechar();
          this.montar(false);
        } },
        { texto: "Pular este desafio", acao: (m) => {
          m.fechar();
          this.vitoria = 1.6;
        } }
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
          this.estouro = 1e-4;
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
      for (let x2 = 0; x2 < LARG; x2 += 16) d.ret(x2, 0, 1, ALT, "#1b2130");
      for (let y = 0; y < ALT; y += 16) d.ret(0, y, LARG, 1, "#1b2130");
      d.ret(0, 0, LARG, 33, "#0e121c");
      d.ret(0, 33, LARG, 1, COR.titulo);
      d.texto(this.def.titulo, 8, 4, COR.titulo, { sombra: true });
      d.texto(`N\xEDvel ${this.k + 1}/${this.def.niveis.length}`, LARG - 8, 4, COR.fraco, { alinhar: "direita" });
      let x = 8;
      if (this.tempo) {
        const p = Math.min(1, this.decorrido / this.tempo);
        d.texto("PRESS\xC3O", x, 19, p > 0.8 && Math.floor(t * 6) % 2 === 0 ? COR.vermelho : COR.texto);
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
        const cheio = m !== void 0 && t >= m ? 1 : 0;
        const ang = (cel.rot + (cel.anim || 0)) * Math.PI / 2;
        c.save();
        c.translate(px + T / 2, py + T / 2);
        c.rotate(ang);
        c.drawImage(img, INDICE[cel.tipo] * T, cheio * T, T, T, -T / 2, -T / 2, T, T);
        c.restore();
        if (cel.travada) d.img("mini_trava", px, py);
        if (cel.dicaT !== void 0 && t - cel.dicaT < 1) d.moldura(px + 2, py + 2, T - 4, T - 4, COR.verde);
        if (cel.tipo === "turbina" && cheio) {
          const cx = px + T / 2;
          const cy = py + T / 2 + 1;
          c.strokeStyle = "#fff6c8";
          c.lineWidth = 2;
          for (let k = 0; k < 2; k++) {
            const a = t * 10 + k * Math.PI / 2;
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
      const ajuda = toque ? "Toque num cano para girar   B: pausa" : "Setas: mover   Espa\xE7o: girar   Q: voltar   H: dica   Esc: pausa";
      d.texto(ajuda, LARG / 2, ALT - 11, COR.fraco, { alinhar: "centro" });
      if (this.vitoria || this.estouro) {
        const v = this.vitoria || this.estouro;
        c.globalAlpha = Math.min(1, v * 3);
        d.ret(0, 70, LARG, 40, "rgba(14,12,26,0.85)");
        if (this.vitoria) {
          d.texto(this.def.vitoria || "TURBINAS GIRANDO!", LARG / 2, 76, COR.titulo, { alinhar: "centro", escala: 2, sombra: true });
          d.texto(`${this.giros} giros${this.dicas ? ` \xB7 ${this.dicas} dica${this.dicas > 1 ? "s" : ""}` : ""}`, LARG / 2, 96, COR.fraco, { alinhar: "centro" });
        } else {
          d.texto("A PRESS\xC3O ESTOUROU!", LARG / 2, 76, COR.vermelho, { alinhar: "centro", escala: 2, sombra: true });
          d.texto("As comportas fecharam. Um novo tabuleiro vai come\xE7ar.", LARG / 2, 96, COR.texto, { alinhar: "centro" });
        }
        c.globalAlpha = 1;
      }
    }
  };

  // jogo/combate.js
  var ENERGIA_MAX = 5;
  function intersecta2(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function normal(x, y) {
    const n = Math.hypot(x, y) || 1;
    return [x / n, y / n];
  }
  var Inimigo = class {
    constructor(combate, tipo, def, x, y) {
      this.c = combate;
      this.id = tipo;
      this.t = combate.tipos[tipo];
      if (!this.t) throw new Error(`Inimigo desconhecido: ${tipo}`);
      this.def = def;
      this.x = x;
      this.y = y;
      this.casa = { x, y };
      this.vida = this.t.vida;
      this.estado = "vagar";
      this.timer = Math.random() * 1.5;
      this.recarga = (this.t.recarga || 2) * (0.5 + Math.random() * 0.5);
      this.vx = 0;
      this.vy = 0;
      this.kx = 0;
      this.ky = 0;
      this.flash = 0;
      this.anim = Math.random() * 3;
      this.dirMov = normal(Math.random() - 0.5, Math.random() - 0.5);
      this.solido = !!this.t.solido;
      this.chefe = !!this.t.chefe;
      this.fase = 0;
      this.invocou = false;
    }
    caixa() {
      const [w, h] = this.t.caixa;
      return { x: this.x - w / 2, y: this.y - h / 2, w, h };
    }
    // area que recebe golpes e disparos: cobre boa parte do desenho, nao so os pes
    corpo() {
      const c = this.caixa();
      const m = this.t.voa ? 5 : 3;
      return { x: c.x - m, y: c.y - m, w: c.w + 2 * m, h: c.h + 2 * m };
    }
    vulneravel() {
      return this.t.ia !== "chefe_gerador" || this.estado === "superaquecido";
    }
    quadro() {
      const t = this.t;
      if (t.ia === "chefe_gerador") return this.estado === "superaquecido" ? 1 : this.estado === "carregando" || this.estado === "anel" ? 2 : 0;
      if (t.ia === "investida") return this.estado === "tonto" ? 2 : this.estado === "investir" || Math.floor(this.anim * 6) % 2 ? 1 : 0;
      if (t.ia === "atirador" && this.estado === "mirar") return 2;
      if (t.ia === "perseguir" && this.estado === "perseguir") return 2;
      return Math.floor(this.anim * (t.fps || 4)) % 2;
    }
  };
  var Combate = class {
    constructor(jogo) {
      this.jogo = jogo;
      this.tipos = jogo.rec.dados.inimigos.tipos;
      this.limpar();
    }
    limpar() {
      this.inimigos = [];
      this.projeteis = [];
      this.quedas = [];
      this.particulas = [];
      this.textos = [];
      this.golpe = null;
      this.cdGolpe = 0;
      this.cdPulso = 0;
      this.esquiva = null;
      this.cdEsquiva = 0;
      this.inv = 0;
      this.kx = 0;
      this.ky = 0;
      this.energia = ENERGIA_MAX;
      this.recargaEnergia = 0;
    }
    get estado() {
      return this.jogo.estado;
    }
    get mundo() {
      return this.jogo.mundo;
    }
    ativo() {
      return this.estado.v("arma_chave") > 0 || this.estado.v("arma_pulso") > 0;
    }
    leve() {
      return this.estado.v("dificuldade_leve") > 0;
    }
    // chamado quando um mapa e carregado
    carregarMapa(defs) {
      const vida = this.estado.vida;
      this.limpar();
      for (const { def, cx, cy } of defs) {
        if (def.se && !this.estado.condicao(def.se)) continue;
        this.inimigos.push(new Inimigo(this, def.inimigo, def, cx * TILE + 8, cy * TILE + 8));
      }
    }
    // ---------------------------------------------------------------- acoes da jogadora
    atacar() {
      if (this.estado.v("arma_chave") <= 0 || this.cdGolpe > 0 || this.esquiva) return false;
      this.golpe = { t: 0, dur: 0.22, atingidos: /* @__PURE__ */ new Set() };
      this.cdGolpe = 0.36;
      this.jogo.som.efeito("golpe");
      return true;
    }
    disparar() {
      if (this.estado.v("arma_pulso") <= 0 || this.cdPulso > 0) return false;
      if (this.energia < 1) {
        this.jogo.som.efeito("erro");
        this.texto(this.mundo.jogador.x, this.mundo.jogador.y, "sem energia", "#9aa3c7", 40);
        this.cdPulso = 0.4;
        return true;
      }
      const j = this.mundo.jogador;
      const [vx, vy] = VETOR[j.dir];
      const gx = vx * 165;
      const gy = vy * 165;
      this.energia -= 1;
      this.recargaEnergia = 0;
      this.cdPulso = 0.28;
      this.projeteis.push({ x: j.x + vx * 8, y: j.y + vy * 8, z: 12, vx: gx, vy: gy, vida: 0.8, dono: "jogadora", dano: 1, sprite: "fx_pulso" });
      this.jogo.som.efeito("disparo");
      return true;
    }
    esquivar(dx, dy) {
      if (this.cdEsquiva > 0 || this.esquiva) return false;
      const j = this.mundo.jogador;
      let [vx, vy] = dx || dy ? normal(dx, dy) : VETOR[j.dir];
      this.esquiva = { t: 0, dur: 0.17, vx: vx * 210, vy: vy * 210 };
      this.cdEsquiva = 0.6;
      this.jogo.som.efeito("esquiva");
      for (let k = 0; k < 4; k++) this.particula(j.x, j.y, (Math.random() - 0.5) * 30, -Math.random() * 15, "#c8d0e0", 0.3, 4);
      return true;
    }
    caixaGolpe() {
      const j = this.mundo.jogador;
      const [vx, vy] = VETOR[j.dir];
      const cx = j.x + vx * 12;
      const cy = j.y + vy * 12;
      return { x: cx - 10, y: cy - 10, w: 20, h: 20 };
    }
    caixaJogadora() {
      const j = this.mundo.jogador;
      return { x: j.x - 6, y: j.y - 6, w: 12, h: 12 };
    }
    // movimento extra da jogadora (esquiva e empurrao); devolve true se a esquiva controla o movimento
    moverJogadora(dt) {
      const m = this.mundo;
      const j = m.jogador;
      if (this.esquiva) {
        const e = this.esquiva;
        e.t += dt;
        m.mover(j, e.vx * dt, 0);
        m.mover(j, 0, e.vy * dt);
        if (e.t >= e.dur) this.esquiva = null;
        return true;
      }
      if (Math.abs(this.kx) > 1 || Math.abs(this.ky) > 1) {
        m.mover(j, this.kx * dt, 0);
        m.mover(j, 0, this.ky * dt);
        this.kx *= Math.pow(2e-3, dt);
        this.ky *= Math.pow(2e-3, dt);
      }
      return false;
    }
    // ---------------------------------------------------------------- dano
    ferirJogadora(dano, ox, oy) {
      if (this.inv > 0 || this.esquiva || this.jogo.ocupado > 0) return;
      const e = this.estado;
      const real = this.leve() ? dano * 0.5 : dano;
      e.vida = Math.max(0, e.vida - real);
      this.inv = 1.1;
      const j = this.mundo.jogador;
      const [nx, ny] = normal(j.x - ox, j.y - oy);
      this.kx = nx * 170;
      this.ky = ny * 170;
      this.mundo.tremor = Math.max(this.mundo.tremor, 0.18);
      this.jogo.som.efeito("dano");
      for (let k = 0; k < 6; k++) this.particula(j.x, j.y, (Math.random() - 0.5) * 60, -Math.random() * 50, "#e5675b", 0.4, 14);
      if (e.vida <= 0) this.jogo.desmaiar();
    }
    ferirInimigo(i, dano, ox, oy, fonte) {
      if (i.morto) return;
      if (!i.vulneravel()) {
        this.jogo.som.efeito("escudo");
        for (let k = 0; k < 4; k++) this.particula(ox, oy, (Math.random() - 0.5) * 60, -Math.random() * 40, "#fff6c8", 0.25, 16);
        if (fonte === "golpe") {
          const j = this.mundo.jogador;
          const [nx, ny] = normal(j.x - i.x, j.y - i.y);
          this.kx = nx * 120;
          this.ky = ny * 120;
        }
        return;
      }
      const mult = i.estado === "tonto" ? 2 : 1;
      i.vida -= dano * mult;
      i.flash = 0.16;
      if (!i.solido) {
        const [nx, ny] = normal(i.x - ox, i.y - oy);
        i.kx = nx * 140;
        i.ky = ny * 140;
      }
      this.jogo.som.efeito("acerto");
      for (let k = 0; k < 5; k++) this.particula(i.x, i.y, (Math.random() - 0.5) * 70, -Math.random() * 60, "#d6dcf5", 0.35, 10);
      if (i.vida <= 0) this.derrotar(i);
    }
    derrotar(i) {
      i.morto = true;
      const t = i.t;
      this.jogo.som.efeito(i.chefe ? "sucesso" : "restaurado");
      const n = i.chefe ? 40 : 12;
      for (let k = 0; k < n; k++) {
        const cor = k % 3 === 0 ? "#7c7e90" : ["#7fe3f0", "#ffd98a", "#8fe08a", "#e58fd6"][k % 4];
        this.particula(i.x, i.y, (Math.random() - 0.5) * (i.chefe ? 160 : 90), -Math.random() * (i.chefe ? 120 : 80), cor, 0.7 + Math.random() * 0.5, i.chefe ? 26 : 10);
      }
      this.texto(i.x, i.y, t.maquina ? "Restaurado!" : "Dissipado!", "#8fe08a", i.chefe ? 56 : 26);
      if (i.chefe) {
        this.mundo.tremor = 0.8;
        this.jogo.flash = 0.8;
      }
      const q = t.queda || {};
      if (q.coracao && Math.random() < q.coracao) this.soltar(i.x - 5, i.y, "coracao");
      if (q.energia && Math.random() < q.energia) this.soltar(i.x + 5, i.y, "energia");
      for (const [m, chance] of Object.entries(q.mat || {})) if (Math.random() < chance) this.soltar(i.x + (Math.random() - 0.5) * 12, i.y + 2, "mat", m);
      if (i.def.flag) this.estado.definir(i.def.flag, 1);
      if (i.def.roteiro_derrota) setTimeout(() => this.jogo.rodarRoteiro(i.def.roteiro_derrota), 900);
      this.inimigos = this.inimigos.filter((x) => x !== i);
    }
    soltar(x, y, tipo, mat) {
      this.quedas.push({ x, y, tipo, mat, t: 0, vy: -50, z: 0 });
    }
    // particulas e textos ficam em coordenadas de TELA (x, y da grade + altura z)
    particula(x, y, vx, vy, cor, vida, z = 8) {
      const p = iso(x, y);
      this.particulas.push({ x: p.x, y: p.y - z, vx, vy, cor, vida, max: vida });
    }
    texto(x, y, s, cor, z = 26) {
      const p = iso(x, y);
      this.textos.push({ x: p.x, y: p.y - z, s, cor, t: 0 });
    }
    // ---------------------------------------------------------------- laco
    atualizar(dt) {
      const m = this.mundo;
      const j = m.jogador;
      const e = this.estado;
      this.cdGolpe = Math.max(0, this.cdGolpe - dt);
      this.cdPulso = Math.max(0, this.cdPulso - dt);
      this.cdEsquiva = Math.max(0, this.cdEsquiva - dt);
      this.inv = Math.max(0, this.inv - dt);
      if (this.energia < ENERGIA_MAX) {
        this.recargaEnergia += dt;
        if (this.recargaEnergia >= 2.2) {
          this.energia += 1;
          this.recargaEnergia = 0;
        }
      }
      if (this.golpe) {
        this.golpe.t += dt;
        const cg = this.caixaGolpe();
        for (const i of this.inimigos) {
          if (this.golpe.atingidos.has(i)) continue;
          if (intersecta2(cg, i.corpo())) {
            this.golpe.atingidos.add(i);
            this.ferirInimigo(i, 1, j.x, j.y, "golpe");
          }
        }
        if (this.golpe && this.golpe.t >= this.golpe.dur) this.golpe = null;
      }
      const cj = this.caixaJogadora();
      for (const i of [...this.inimigos]) {
        this.atualizarInimigo(i, dt);
        if (i.morto) continue;
        const ci = i.caixa();
        const toque = { x: ci.x - 2, y: ci.y - 2, w: ci.w + 4, h: ci.h + 4 };
        if (intersecta2(toque, cj)) this.ferirJogadora(i.t.dano || 1, i.x, i.y);
      }
      for (const p of this.projeteis) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vida -= dt;
        const r = { x: p.x - 3, y: p.y - 3, w: 6, h: 6 };
        if (p.dono === "jogadora") {
          for (const i of this.inimigos) {
            if (intersecta2(r, i.corpo())) {
              this.ferirInimigo(i, p.dano, p.x - p.vx * 0.05, p.y - p.vy * 0.05, "pulso");
              p.vida = 0;
              break;
            }
          }
        } else if (intersecta2(r, cj)) {
          this.ferirJogadora(p.dano, p.x - p.vx, p.y - p.vy);
          p.vida = 0;
        }
        if (p.vida > 0 && this.bateParede(p.x, p.y)) {
          p.vida = 0;
          for (let k = 0; k < 3; k++) this.particula(p.x, p.y, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, p.dono === "jogadora" ? "#7fe3f0" : "#ffb04a", 0.25, p.z ?? 10);
        }
      }
      this.projeteis = this.projeteis.filter((p) => p.vida > 0);
      for (const q of this.quedas) {
        q.t += dt;
        if (q.z < 0 || q.vy < 0) {
          q.vy += 240 * dt;
          q.z = Math.min(0, q.z + q.vy * dt);
        }
        if (q.t > 0.3 && Math.hypot(q.x - j.x, q.y - j.y) < 11) {
          this.pegar(q);
          q.t = 99;
        }
      }
      this.quedas = this.quedas.filter((q) => q.t < 14);
      for (const p of this.particulas) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 90 * dt;
        p.vida -= dt;
      }
      this.particulas = this.particulas.filter((p) => p.vida > 0);
      for (const t of this.textos) t.t += dt;
      this.textos = this.textos.filter((t) => t.t < 1.1);
    }
    pegar(q) {
      const e = this.estado;
      if (q.tipo === "coracao") {
        e.vida = Math.min(e.vidaMax, e.vida + 2);
        this.texto(q.x, q.y, "+1 cora\xE7\xE3o", "#e5675b", 18);
      } else if (q.tipo === "energia") {
        this.energia = Math.min(ENERGIA_MAX, this.energia + 2);
        this.texto(q.x, q.y, "+2 energia", "#7fe3f0", 18);
      } else {
        e.coletar(q.mat, 1);
        const nome = this.jogo.rec.dados.materiais.materiais[q.mat]?.nome || q.mat;
        this.texto(q.x, q.y, `+1 ${nome}`, "#ffd98a", 18);
      }
      this.jogo.som.efeito("brilho");
    }
    bateParede(x, y) {
      const m = this.mundo;
      if (m.tileSolido(Math.floor(x / TILE), Math.floor(y / TILE))) return true;
      for (const e of m.ents) {
        if (e.tipo !== "obj" || !e.col || !e.visivel() || e.def.camada === "fundo") continue;
        if (x >= e.col.x && x < e.col.x + e.col.w && y >= e.col.y && y < e.col.y + e.col.h) return true;
      }
      return false;
    }
    mover(i, dx, dy) {
      const ox = i.x;
      const oy = i.y;
      this.mundo.mover(i, dx, dy, i);
      return Math.abs(i.x - ox - dx) > 0.01 || Math.abs(i.y - oy - dy) > 0.01;
    }
    atualizarInimigo(i, dt) {
      const j = this.mundo.jogador;
      const t = i.t;
      i.anim += dt;
      i.flash = Math.max(0, i.flash - dt);
      const dx = j.x - i.x;
      const dy = j.y - i.y;
      const dist = Math.hypot(dx, dy);
      if (!i.chefe && dist > 220) return;
      if (i.chefe && !this.estado.v(i.def.ativar || "chefe_ativo")) return;
      if (Math.abs(i.kx) > 1 || Math.abs(i.ky) > 1) {
        this.mover(i, i.kx * dt, i.ky * dt);
        i.kx *= Math.pow(3e-3, dt);
        i.ky *= Math.pow(3e-3, dt);
        if (i.estado !== "tonto") return;
      }
      const vel = (t.vel || 30) * (this.leve() ? 0.8 : 1);
      i.timer -= dt;
      switch (t.ia) {
        case "perseguir": {
          if (dist < (t.alcance || 90)) {
            i.estado = "perseguir";
            const [nx, ny] = normal(dx, dy);
            const ond = Math.sin(i.anim * 5) * 0.5;
            this.mover(i, (nx - ny * ond) * vel * dt, (ny + nx * ond) * vel * dt);
          } else {
            i.estado = "vagar";
            this.vagar(i, dt, vel * 0.5);
          }
          break;
        }
        case "atirador": {
          if (dist > (t.alcance || 130)) {
            i.estado = "vagar";
            this.vagar(i, dt, vel * 0.5);
            break;
          }
          const [nx, ny] = normal(dx, dy);
          const alvo = t.distancia || 70;
          if (i.estado !== "mirar") {
            i.estado = "manter";
            let mx = 0;
            let my = 0;
            if (dist < alvo - 14) {
              mx = -nx;
              my = -ny;
            } else if (dist > alvo + 14) {
              mx = nx;
              my = ny;
            } else {
              mx = -ny * Math.sign(Math.sin(i.anim * 0.7));
              my = nx * Math.sign(Math.sin(i.anim * 0.7));
            }
            if (this.mover(i, mx * vel * dt, my * vel * dt)) i.anim += 1.3;
            i.recarga -= dt;
            if (i.recarga <= 0) {
              i.estado = "mirar";
              i.timer = (t.aviso || 0.6) * (this.leve() ? 1.4 : 1);
              this.jogo.som.efeito("aviso");
            }
          } else if (i.timer <= 0) {
            const v = t.projetil_vel || 85;
            this.projeteis.push({ x: i.x, y: i.y, z: t.voa ? 16 : 10, vx: nx * v, vy: ny * v, vida: 2.2, dono: "inimigo", dano: t.dano || 1, sprite: "fx_faisca" });
            this.jogo.som.efeito("faisca");
            i.estado = "manter";
            i.recarga = (t.recarga || 2.4) * (0.8 + Math.random() * 0.4);
          }
          break;
        }
        case "investida": {
          if (i.estado === "tonto") {
            if (i.timer <= 0) {
              i.estado = "vagar";
              i.timer = 0.8;
            }
            break;
          }
          if (i.estado === "mirar") {
            if (i.timer <= 0) {
              i.estado = "investir";
              i.timer = t.duracao || 0.9;
              this.jogo.som.efeito("investida");
            }
            break;
          }
          if (i.estado === "investir") {
            const v = (t.investida_vel || 150) * (this.leve() ? 0.8 : 1);
            const bateu = this.mover(i, i.dirMov[0] * v * dt, i.dirMov[1] * v * dt);
            if (Math.random() < dt * 20) this.particula(i.x, i.y, (Math.random() - 0.5) * 20, -10, "#8a8c9a", 0.3, 2);
            if (bateu) {
              i.estado = "tonto";
              i.timer = t.tonto || 1.4;
              this.mundo.tremor = Math.max(this.mundo.tremor, 0.15);
              this.jogo.som.efeito("escudo");
            } else if (i.timer <= 0) {
              i.estado = "vagar";
              i.timer = 1;
            }
            break;
          }
          this.vagar(i, dt, vel);
          if (i.timer <= 0 && dist < (t.alcance || 110)) {
            i.estado = "mirar";
            i.timer = (t.aviso || 0.7) * (this.leve() ? 1.4 : 1);
            i.dirMov = normal(dx, dy);
            this.jogo.som.efeito("aviso");
          }
          break;
        }
        case "quicar": {
          if (!i.vq) i.vq = [Math.random() < 0.5 ? -1 : 1, Math.random() < 0.5 ? -1 : 1];
          const ox = i.x;
          this.mundo.mover(i, i.vq[0] * vel * dt, 0, i);
          if (Math.abs(i.x - ox - i.vq[0] * vel * dt) > 0.01) i.vq[0] *= -1;
          const oy = i.y;
          this.mundo.mover(i, 0, i.vq[1] * vel * dt, i);
          if (Math.abs(i.y - oy - i.vq[1] * vel * dt) > 0.01) i.vq[1] *= -1;
          if (Math.random() < dt * 6) this.particula(i.x, i.y, (Math.random() - 0.5) * 30, -Math.random() * 30, "#ffd98a", 0.2, 5);
          break;
        }
        case "chefe_gerador":
          this.atualizarChefe(i, dt, dx, dy);
          break;
      }
    }
    vagar(i, dt, vel) {
      i.tVagar = (i.tVagar ?? 0) - dt;
      if (i.tVagar <= 0) {
        i.tVagar = 0.8 + Math.random() * 1.6;
        i.parado = Math.random() < 0.4;
        i.dirMov = normal(Math.random() - 0.5, Math.random() - 0.5);
        if (Math.hypot(i.x - i.casa.x, i.y - i.casa.y) > 48) i.dirMov = normal(i.casa.x - i.x, i.casa.y - i.y);
      }
      if (!i.parado) this.mover(i, i.dirMov[0] * vel * dt, i.dirMov[1] * vel * dt);
    }
    // Chefe: blindado (atira) -> carregando (aviso) -> anel de faiscas -> superaquecido (vulneravel)
    atualizarChefe(i, dt, dx, dy) {
      const t = i.t;
      const metade = i.vida <= t.vida / 2;
      const quarto = i.vida <= t.vida / 4;
      if (metade && !i.invocou) {
        i.invocou = true;
        for (const [ox, oy] of [[-40, 10], [40, 10]]) this.inimigos.push(new Inimigo(this, "faisca", {}, i.x + ox, i.y + oy));
        this.jogo.som.efeito("tremor");
        this.texto(i.x, i.y, "Sobrecarga!", "#ffb04a", 60);
      }
      if (i.estado === "vagar") {
        i.estado = "blindado";
        i.timer = 2.2;
        i.rajada = 0.9;
      }
      if (i.estado === "blindado") {
        i.rajada -= dt;
        if (i.rajada <= 0) {
          const n = metade ? 5 : 3;
          const [nx, ny] = normal(dx, dy);
          const base = Math.atan2(ny, nx);
          for (let k = 0; k < n; k++) {
            const a = base + (k - (n - 1) / 2) * 0.22;
            this.projeteis.push({ x: i.x, y: i.y, z: 20, vx: Math.cos(a) * 80, vy: Math.sin(a) * 80, vida: 3, dono: "inimigo", dano: 1, sprite: "fx_faisca" });
          }
          this.jogo.som.efeito("faisca");
          i.rajada = 9;
        }
        if (i.timer <= 0) {
          i.estado = "carregando";
          i.timer = 1 * (this.leve() ? 1.4 : 1);
          this.jogo.som.efeito("aviso");
        }
      } else if (i.estado === "carregando") {
        if (Math.random() < dt * 30) this.particula(i.x + (Math.random() - 0.5) * 30, i.y + (Math.random() - 0.5) * 20, 0, -20, "#7fe3f0", 0.3, 20 + Math.random() * 20);
        if (i.timer <= 0) {
          i.estado = "anel";
          const n = metade ? 12 : 8;
          const giro = Math.random() * Math.PI;
          for (let k = 0; k < n; k++) {
            const a = giro + k * Math.PI * 2 / n;
            this.projeteis.push({ x: i.x, y: i.y, z: 18, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70, vida: 3.2, dono: "inimigo", dano: 1, sprite: "fx_faisca" });
          }
          this.jogo.som.efeito("turbina");
          i.timer = 0.5;
        }
      } else if (i.estado === "anel") {
        if (i.timer <= 0) {
          i.estado = "superaquecido";
          i.timer = (quarto ? 2 : 2.7) * (this.leve() ? 1.3 : 1);
          this.jogo.som.efeito("vapor");
          this.texto(i.x, i.y, "N\xFAcleo exposto!", "#ffd98a", 60);
        }
      } else if (i.estado === "superaquecido") {
        if (Math.random() < dt * 25) this.particula(i.x + (Math.random() - 0.5) * 30, i.y + (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 10, -30, "#d8dce6", 0.6, 40);
        if (i.timer <= 0) {
          i.estado = "blindado";
          i.timer = metade ? 1.8 : 2.2;
          i.rajada = 0.7;
        }
      }
    }
    // ---------------------------------------------------------------- desenho
    // itens para o desenho ordenado por profundidade (o mundo junta tudo)
    itensDesenho(dd, t) {
      const lista = [];
      for (const i of this.inimigos) {
        lista.push({
          o: i.x + i.y,
          d: () => {
            const tt = i.t;
            const sw = tt.w;
            const sh = tt.h;
            const p = iso(i.x, i.y);
            const voo = tt.voa ? Math.round(Math.sin(i.anim * 4) * 2) - 8 : 0;
            if (!i.chefe) dd.img("ui_sombra", p.x - 6, p.y - 3);
            let tremer = 0;
            if ((i.estado === "mirar" || i.estado === "carregando") && Math.floor(t * 20) % 2) tremer = 1;
            const x = Math.round(p.x - sw / 2 + tremer);
            const y = Math.round(p.y - sh + (i.chefe ? 10 : 2) + voo);
            const jx = iso(this.mundo.jogador.x, this.mundo.jogador.y).x;
            const opc = { sx: i.quadro() * sw, sw, sh, espelhar: !i.chefe && jx < p.x && tt.espelhar !== false };
            if (i.flash > 0) dd.imgBranca("obj_" + tt.sprite, x, y, opc);
            else dd.img("obj_" + tt.sprite, x, y, opc);
            if (i.estado === "mirar" && tt.ia === "investida") dd.texto("!", p.x, y - 9, "#e5675b", { alinhar: "centro", sombra: true });
            if (i.estado === "tonto") for (let k = 0; k < 3; k++) dd.ret(p.x - 6 + k * 5 + Math.round(Math.sin(t * 6 + k) * 2), y - 4, 2, 2, "#ffd98a");
          }
        });
      }
      for (const q of this.quedas) {
        if (q.t > 11 && Math.floor(q.t * 8) % 2) continue;
        lista.push({
          o: q.x + q.y,
          d: () => {
            const p = iso(q.x, q.y);
            const bob = q.z + Math.round(Math.sin(q.t * 5) * 1);
            const nome = q.tipo === "coracao" ? "drop_coracao" : q.tipo === "energia" ? "drop_energia" : "mat_" + q.mat;
            if (q.tipo === "mat") dd.img(nome, p.x - 8, p.y - 14 + bob);
            else dd.img(nome, p.x - 4, p.y - 9 + bob);
          }
        });
      }
      return lista;
    }
    desenharSobre(dd, t) {
      const j = this.mundo.jogador;
      const pj = iso(j.x, j.y);
      if (this.golpe) {
        const p = this.golpe.t / this.golpe.dur;
        const v = VETOR[j.dir];
        const sv = iso(v[0], v[1]);
        const base = Math.atan2(sv.y, sv.x);
        const a = base - 1.1 + p * 2.2;
        const r = 12;
        const cx = pj.x + Math.cos(a) * r;
        const cy = pj.y - 14 + Math.sin(a) * r * 0.7;
        const c = dd.ctx;
        c.save();
        c.translate(Math.round(cx), Math.round(cy));
        c.rotate(a + Math.PI / 4);
        c.drawImage(this.jogo.rec.img.item_chave, -8, -8);
        c.restore();
        c.strokeStyle = "rgba(255,255,255,0.55)";
        c.lineWidth = 2;
        c.beginPath();
        c.ellipse(Math.round(pj.x), Math.round(pj.y - 14), 16, 11, 0, base - 1.1, a);
        c.stroke();
      }
      for (const p of this.projeteis) {
        const q = Math.floor(t * 12) % 2;
        const s = p.sprite === "fx_pulso" ? 8 : 6;
        const ps = iso(p.x, p.y);
        dd.img("ui_sombra", ps.x - 6, ps.y - 3, { alpha: 0.5 });
        dd.img(p.sprite, ps.x - s / 2, ps.y - (p.z ?? 10) - s / 2, { sx: q * s, sw: s, sh: s });
      }
      for (const p of this.particulas) {
        dd.ctx.globalAlpha = Math.max(0, p.vida / p.max);
        dd.ret(p.x, p.y, 2, 2, p.cor);
      }
      dd.ctx.globalAlpha = 1;
      for (const tx of this.textos) {
        dd.ctx.globalAlpha = Math.max(0, 1 - tx.t / 1.1);
        dd.texto(tx.s, tx.x, tx.y - tx.t * 14, tx.cor, { alinhar: "centro", contorno: "#14121e" });
      }
      dd.ctx.globalAlpha = 1;
    }
    jogadoraVisivel(t) {
      return this.inv <= 0 || Math.floor(t * 16) % 2 === 0;
    }
    chefeAtual() {
      return this.inimigos.find((i) => i.chefe && this.estado.v(i.def.ativar || "chefe_ativo"));
    }
    desenharHud(d, t, yObjetivo) {
      const e = this.estado;
      if (!this.ativo()) return 0;
      const cheios = Math.floor(e.vida / 2);
      const meio = e.vida % 2 >= 1;
      const total = Math.ceil(e.vidaMax / 2);
      for (let k = 0; k < total; k++) {
        const q = k < cheios ? 0 : k === cheios && meio ? 1 : 2;
        d.img("ui_coracao", 4 + k * 9, 3, { sx: q * 9, sw: 9, sh: 8 });
      }
      if (e.v("arma_pulso")) {
        const x = 8 + total * 9;
        d.img("ui_raio", x, 2);
        for (let k = 0; k < ENERGIA_MAX; k++) {
          d.ret(x + 9 + k * 6, 4, 5, 5, "#14121e");
          d.ret(x + 10 + k * 6, 5, 3, 3, k < this.energia ? "#7fe3f0" : "#2a3550");
        }
      }
      const ch = this.chefeAtual();
      if (ch) {
        const w = 180;
        const x = (320 - w) / 2;
        const y = 168;
        d.texto(ch.t.nome.toUpperCase(), 160, y - 10, "#ffd98a", { alinhar: "centro", contorno: "#14121e" });
        d.ret(x, y, w, 7, "#14121e");
        d.ret(x + 1, y + 1, Math.round((w - 2) * Math.max(0, ch.vida) / ch.t.vida), 5, ch.vulneravel() ? "#ffb04a" : "#e5675b");
        d.moldura(x, y, w, 7, "#5a6280");
      }
      return 11;
    }
  };

  // jogo/main.js
  var Jogo = class {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.ctx.imageSmoothingEnabled = false;
      this.rec = new Recursos();
      this.ent = new Entrada(canvas);
      this.som = new Som();
      this.estado = new Estado();
      this.camadas = [];
      this.esperas = [];
      this.t = 0;
      this.ocupado = 0;
      this.fadeA = 0;
      this.fadeAlvo = 0;
      this.fadeVel = 2;
      this.fadeFim = null;
      this.flash = 0;
      this.esconderJogador = false;
      this.movimentoReduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const destravar = () => this.som.destravar();
      addEventListener("keydown", destravar);
      addEventListener("pointerdown", destravar);
    }
    async carregar(progresso) {
      const r = this.rec;
      r.dados.config = await r.json("config");
      await r.carregar(["arte", "fonte", "personagens", "itens", "pioneiras", "materiais", "inimigos"], progresso);
      r.dados.mapas = {};
      for (const m of r.dados.config.mapas) r.dados.mapas[m] = await r.json("mapas/" + m);
      r.dados.minigames = {};
      for (const m of r.dados.config.minigames) r.dados.minigames[m] = await r.json("minigames/" + m);
      this.roteirista = new Roteirista(this);
      for (const f of r.dados.config.roteiros) this.roteirista.adicionar(await r.json("roteiros/" + f));
      this.d = new Desenho(this.ctx, r);
      this.combate = new Combate(this);
      this.mundo = new Mundo(this);
      this.hud = new Hud(this);
      this.ui = {
        falar: (quem, emo, texto, opc) => this.empilhar(new Dialogo(this, quem, emo, texto, opc)),
        escolher: (p, quem, emo, ops) => this.empilhar(new Escolha(this, p, quem, emo, ops)),
        aviso: (t) => this.hud.aviso(t),
        banner: (t) => this.hud.banner(t),
        novoObjetivo: () => this.hud.novoObjetivo()
      };
    }
    // ---------------------------------------------------------------- camadas
    empilhar(c) {
      return new Promise((ok) => {
        c._resolver = ok;
        this.camadas.push(c);
        if (c.iniciar) c.iniciar();
      });
    }
    desempilhar(c, valor) {
      const i = this.camadas.indexOf(c);
      if (i >= 0) this.camadas.splice(i, 1);
      if (c._resolver) c._resolver(valor);
    }
    esperar(s) {
      return new Promise((ok) => this.esperas.push({ fim: this.t + s, ok }));
    }
    fade(alvo, dur = 0.5) {
      this.fadeAlvo = alvo;
      this.fadeVel = 1 / Math.max(0.01, dur);
      return new Promise((ok) => {
        if (this.fadeFim) this.fadeFim();
        this.fadeFim = ok;
      });
    }
    rodarRoteiro(id, ctx) {
      if (!id) return Promise.resolve();
      return this.roteirista.executar(id, ctx).catch((e) => console.error(e));
    }
    // ---------------------------------------------------------------- mapas e progresso
    carregarMapa(id, chegada) {
      const def = this.rec.dados.mapas[id];
      if (!def) throw new Error(`Mapa desconhecido: ${id}`);
      this.estado.mapa = id;
      this.mundo.carregar(def);
      if (chegada) this.mundo.posicionar(chegada);
      if (def.musica) this.som.tocarMusica(def.musica);
    }
    async irPara(id, chegada) {
      this.ocupado++;
      try {
        this.mundo.jogador.movendo = false;
        if (this.mundo.def) {
          this.som.efeito("porta");
          await this.fade(1, 0.35);
        } else this.fadeA = 1;
        this.carregarMapa(id, chegada);
        this.estado.vida = this.estado.vidaMax;
        this.salvar(false);
        await this.fade(0, 0.4);
        const def = this.mundo.def;
        if (def.nome && !this.estado.v("visitou_" + id)) {
          this.estado.definir("visitou_" + id, 1);
          this.hud.banner(def.nome);
        }
        if (def.ao_entrar) await this.rodarRoteiro(this.mundo.escolherRoteiro(def.ao_entrar));
      } finally {
        this.ocupado--;
      }
    }
    // Vida zerada: a protagonista desmaia e volta para a entrada do mapa, com tudo o que ja conquistou.
    async desmaiar() {
      if (this.desmaiando) return;
      this.desmaiando = true;
      this.ocupado++;
      try {
        this.mundo.jogador.movendo = false;
        this.som.efeito("tremor");
        await this.esperar(0.4);
        await this.fade(1, 0.7);
        const def = this.mundo.def;
        if (def.ao_desmaiar) await this.rodarRoteiro(def.ao_desmaiar);
        this.estado.vida = this.estado.vidaMax;
        this.carregarMapa(def.id, def.renascer || Object.keys(this.mundo.spawns)[0]);
        if (def.musica) this.som.tocarMusica(def.musica, true);
        this.salvar(false);
        await this.fade(0, 0.6);
        await this.ui.falar("revisor", "neutro", "Voc\xEA desmaiou... Eu trouxe voc\xEA de volta para a entrada. Seus materiais e seu progresso continuam com voc\xEA.");
      } finally {
        this.ocupado--;
        this.desmaiando = false;
      }
    }
    salvar(avisar) {
      if (!this.mundo.def) return;
      const e = this.estado;
      e.x = this.mundo.jogador.x;
      e.y = this.mundo.jogador.y;
      e.dir = this.mundo.jogador.dir;
      const ok = e.salvar();
      if (avisar) this.hud.aviso(ok ? "Jogo salvo" : "N\xE3o foi poss\xEDvel salvar neste navegador");
    }
    continuar(dados) {
      this.estado.restaurar(dados);
      this.carregarMapa(dados.mapa, null);
      const j = this.mundo.jogador;
      j.x = dados.x;
      j.y = dados.y;
      j.dir = dados.dir || "baixo";
      this.mundo.ultimoTile = this.mundo.tileDe(j);
      this.mundo.camera();
      this.combate.energia = 5;
    }
    async abrirMinigame(id) {
      const def = this.rec.dados.minigames[id];
      if (!def) {
        console.warn(`Minigame desconhecido: ${id}`);
        return;
      }
      await this.fade(1, 0.3);
      const p = this.empilhar(new MiniCanos(this, def));
      await this.fade(0, 0.3);
      await p;
      await this.fade(1, 0.3);
      this.fade(0, 0.4);
    }
    async gravar(id) {
      const p = this.rec.dados.pioneiras.pioneiras.find((x) => x.id === id);
      if (!p) return;
      const faixa = this.som.nomeFaixa;
      this.som.tocarMusica("revisor");
      this.som.efeito("revisor");
      await this.empilhar(new Gravacao(this, p));
      if (!this.estado.resgatadas.includes(id)) this.estado.resgatadas.push(id);
      this.salvar(false);
      if (faixa) this.som.tocarMusica(faixa);
    }
    abrirBancada() {
      return this.empilhar(new Bancada(this));
    }
    // Coleta um material de um ponto do mapa (com uma barrinha de progresso).
    async coletar(e) {
      if (this.mundo.coletando) return;
      this.ocupado++;
      try {
        const dur = 0.75;
        this.mundo.coletando = { ent: e, t: 0, dur };
        for (let k = 0; k < 3; k++) {
          this.som.efeito("girar");
          await this.esperar(dur / 3);
        }
        this.mundo.coletando = null;
        this.estado.definir(e.chave, 1);
        const qtd = e.def.qtd || 1;
        const nome = this.rec.dados.materiais.materiais[e.def.mat]?.nome || e.def.mat;
        this.estado.coletar(e.def.mat, qtd);
        this.som.efeito("item");
        this.hud.aviso(`+${qtd} ${nome}`);
        if (e.def.roteiro) await this.rodarRoteiro(this.mundo.escolherRoteiro(e.def.roteiro));
        if (this.mundo.def.ao_coletar) await this.rodarRoteiro(this.mundo.def.ao_coletar);
      } finally {
        this.mundo.coletando = null;
        this.ocupado--;
      }
    }
    abrirCaderneta(id) {
      return this.empilhar(new Caderneta(this, id));
    }
    async pedirNome() {
      const fixo = (this.rec.dados.config.nome_protagonista || "").trim();
      if (fixo) {
        this.estado.nome = fixo;
        return;
      }
      this.estado.nome = await this.empilhar(new EntradaNome(this));
    }
    async abrirSeletor() {
      const p = await this.empilhar(new Seletor(this));
      if (!p || !p.mapa) return;
      this.som.efeito("revisor");
      this.flash = 1;
      await this.irPara(p.mapa, p.chegada);
    }
    fimDemo() {
      return this.empilhar(new FimDemo(this));
    }
    telaCheia() {
      const el = document.documentElement;
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {
      });
      else el.requestFullscreen?.().catch(() => this.hud.aviso("Tela cheia indispon\xEDvel aqui"));
    }
    abrirPausa() {
      const s = this.som;
      const ops = [
        { texto: "Continuar", acao: (m) => m.fechar() },
        { texto: "Caderneta REDAME", acao: () => this.abrirCaderneta(this.estado.resgatadas[0] || null) },
        { texto: "Itens", acao: () => this.empilhar(new Inventario(this)) },
        { texto: `M\xFAsica: ${s.musicaLigada ? "ligada" : "desligada"}`, acao: (m) => {
          s.alternarMusica();
          m.opcoes[3].texto = `M\xFAsica: ${s.musicaLigada ? "ligada" : "desligada"}`;
        } },
        { texto: `Efeitos: ${s.efeitosLigados ? "ligados" : "desligados"}`, acao: (m) => {
          s.alternarEfeitos();
          m.opcoes[4].texto = `Efeitos: ${s.efeitosLigados ? "ligados" : "desligados"}`;
        } },
        { texto: "Tela cheia", acao: () => this.telaCheia() },
        { texto: `Batalhas: ${this.estado.v("dificuldade_leve") ? "leves" : "normais"}`, acao: (m) => {
          const e = this.estado;
          e.definir("dificuldade_leve", e.v("dificuldade_leve") ? 0 : 1);
          m.opcoes[6].texto = `Batalhas: ${e.v("dificuldade_leve") ? "leves" : "normais"}`;
        } },
        { texto: "Salvar jogo", acao: (m) => {
          this.salvar(true);
          m.fechar();
        } },
        { texto: "Salvar e voltar ao t\xEDtulo", acao: (m) => {
          this.salvar(false);
          m.fechar();
          this.telaTitulo();
        } }
      ];
      this.empilhar(new Menu(this, ops, { titulo: "PAUSA", escurecer: 0.45, larg: 150 }));
    }
    async telaTitulo() {
      this.camadas = [];
      this.esperas = [];
      this.ocupado = 0;
      this.mundo.def = null;
      this.fadeA = 0;
      this.fadeAlvo = 0;
      const save = Estado.lerSave();
      const r = await this.empilhar(new Titulo(this, !!save));
      if (r === "continuar" && save) {
        this.fadeA = 1;
        this.continuar(save);
        this.fade(0, 0.5);
      } else {
        this.estado.zerar();
        this.rodarRoteiro("inicio");
      }
    }
    // ---------------------------------------------------------------- laco
    atualizar(dt) {
      this.ent.atualizar();
      this.t += dt;
      this.estado.tempo += dt;
      const prontas = this.esperas.filter((e) => this.t >= e.fim);
      this.esperas = this.esperas.filter((e) => this.t < e.fim);
      prontas.forEach((e) => e.ok());
      const topo = this.camadas[this.camadas.length - 1];
      const cobre = this.camadas.some((c) => c.cobreTudo);
      if (topo) topo.atualizar(dt, this.ent);
      else if (this.mundo.def && this.ocupado === 0 && this.fadeA < 0.5) {
        if (this.ent.apertou("menu")) this.abrirPausa();
        else this.mundo.atualizarJogador(dt, this.ent);
      }
      if (this.mundo.def && (this.ocupado > 0 || topo) && !this.mundo.jogador.rota) this.mundo.jogador.movendo = false;
      if (this.mundo.def && !cobre) this.mundo.atualizar(dt, this.ocupado === 0 && !topo);
      if (this.mundo.def && !cobre && this.ocupado === 0 && !topo && this.fadeA < 0.5) this.combate.atualizar(dt);
      this.hud.atualizar(dt);
      if (this.fadeA !== this.fadeAlvo) {
        const passo = this.fadeVel * dt;
        this.fadeA = this.fadeA < this.fadeAlvo ? Math.min(this.fadeAlvo, this.fadeA + passo) : Math.max(this.fadeAlvo, this.fadeA - passo);
      }
      if (this.fadeA === this.fadeAlvo && this.fadeFim) {
        const f = this.fadeFim;
        this.fadeFim = null;
        f();
      }
      this.flash = Math.max(0, this.flash - dt * 2.5);
    }
    desenhar() {
      const c = this.ctx;
      const d = this.d;
      c.fillStyle = "#0c0a12";
      c.fillRect(0, 0, LARG, ALT);
      let inicio = 0;
      this.camadas.forEach((cam, i) => {
        if (cam.cobreTudo) inicio = i;
      });
      const cobre = this.camadas.some((cam) => cam.cobreTudo);
      if (this.mundo.def && !cobre) {
        const livre = this.ocupado === 0 && this.camadas.length === 0;
        this.mundo.desenhar(c, d, this.t, livre);
        const mostrar = this.camadas.length === 0 || this.camadas[0] instanceof Dialogo;
        const dy = mostrar ? this.combate.desenharHud(d, this.t) : 0;
        this.hud.desenharObjetivo(d, this.t, mostrar, dy);
      }
      for (let i = inicio; i < this.camadas.length; i++) this.camadas[i].desenhar(d, this.t);
      this.hud.desenharAvisos(d, this.t);
      if (this.fadeA > 0) {
        c.fillStyle = `rgba(8,6,14,${this.fadeA})`;
        c.fillRect(0, 0, LARG, ALT);
      }
      if (this.flash > 0) {
        c.fillStyle = `rgba(200,250,255,${this.flash * 0.8})`;
        c.fillRect(0, 0, LARG, ALT);
      }
    }
    rodar() {
      let ultimo = performance.now();
      const quadro = (agora) => {
        const dt = Math.min(0.05, (agora - ultimo) / 1e3);
        ultimo = agora;
        try {
          this.atualizar(dt);
          this.desenhar();
        } catch (e) {
          console.error(e);
        }
        requestAnimationFrame(quadro);
      };
      requestAnimationFrame(quadro);
    }
  };
  function ajustarTela(canvas) {
    const area = document.getElementById("area-jogo");
    const w = area.clientWidth;
    const h = area.clientHeight;
    let esc = Math.min(w / LARG, h / ALT);
    if (esc >= 2) esc = Math.floor(esc);
    canvas.style.width = Math.floor(LARG * esc) + "px";
    canvas.style.height = Math.floor(ALT * esc) + "px";
  }
  async function iniciar() {
    const canvas = document.getElementById("tela");
    const barra = document.getElementById("carregando-barra");
    const aviso = document.getElementById("carregando");
    ajustarTela(canvas);
    addEventListener("resize", () => ajustarTela(canvas));
    const jogo = new Jogo(canvas);
    window.REDAME = jogo;
    try {
      await jogo.carregar((p) => {
        if (barra) barra.style.width = Math.round(p * 100) + "%";
      });
    } catch (e) {
      console.error(e);
      if (aviso) aviso.textContent = "N\xE3o foi poss\xEDvel carregar o jogo. Recarregue a p\xE1gina para tentar de novo.";
      return;
    }
    if (aviso) aviso.hidden = true;
    jogo.ent.ligarBotoes(document);
    const hot = window.claude?.hot;
    if (hot?.snapshot) hot.snapshot(() => jogo.mundo.def ? { save: jogo.estado.serializar() } : {});
    const comecar = (dados) => {
      jogo.rodar();
      if (dados?.save?.mapa) jogo.continuar(dados.save);
      else jogo.telaTitulo();
    };
    if (hot?.ready) hot.ready(comecar);
    else comecar(hot?.data ?? {});
  }
  iniciar();
})();
