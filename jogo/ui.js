// REDAME - interface: dialogos, menus, HUD, titulo, caderneta e cerimonias.
import { LARG, ALT, COR, clamp } from "./base.js";

// Camada base: o jogo empilha camadas; so a do topo recebe a entrada.
export class Camada {
  constructor(jogo) {
    this.jogo = jogo;
    this.cobreTudo = false;
    this.t = 0;
  }
  atualizar() {}
  desenhar() {}
  fechar(valor) {
    this.jogo.desempilhar(this, valor);
  }
}

function clicouEm(ent, x, y, w, h) {
  return ent.cliques.some((c) => c.x >= x && c.x < x + w && c.y >= y && c.y < y + h);
}

// ------------------------------------------------------------------ dialogo
export class Dialogo extends Camada {
  constructor(jogo, quem, emocao, texto, opc = {}) {
    super(jogo);
    const pers = jogo.rec.dados.personagens;
    this.p = pers[quem] || pers.narrador;
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
      const nome = this.p.nome.replace("{nome}", this.jogo.estado.nome || "Você");
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
}

// ------------------------------------------------------------------ lista de opcoes
export class Menu extends Camada {
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
}

// ------------------------------------------------------------------ escolha (pergunta + opcoes)
export class Escolha extends Camada {
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
}

// ------------------------------------------------------------------ HUD, avisos e faixas
export class Hud {
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
    // no maximo dois avisos na tela: o mais antigo sai
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

  desenharObjetivo(d, t, mostrarObjetivo) {
    const e = this.jogo.estado;
    if (mostrarObjetivo && e.objetivo) {
      const linhas = d.quebrar(e.objetivo, 150);
      const h = 14 + linhas.length * 9;
      d.painel(3, 3, 170, h);
      const corT = this.brilhoObjetivo > 0 && Math.floor(t * 6) % 2 === 0 ? COR.destaque : COR.titulo;
      d.texto(this.brilhoObjetivo > 0 ? "NOVO OBJETIVO" : "OBJETIVO", 10, 7, corT, { sombra: true });
      linhas.forEach((l, i) => d.texto(l, 10, 17 + i * 9, COR.texto, { sombra: true }));
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
      d.ret(0, 62, LARG, 34, "rgba(14,12,26,0.78)");
      d.ret(0, 62, LARG, 1, COR.titulo);
      d.ret(0, 95, LARG, 1, COR.titulo);
      d.texto(f.texto, LARG / 2, 70, COR.titulo, { alinhar: "centro", escala: 2, sombra: true });
      d.ctx.globalAlpha = 1;
    }
  }
}

// ------------------------------------------------------------------ titulo
export class Titulo extends Camada {
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
    // o Revisor de Epocas, girando atras do titulo
    const q = Math.floor(t * 4) % 7;
    d.img("ret_revisor", LARG / 2 - 48, 6, { sx: q * 48, sw: 48, sh: 48, escala: 2, alpha: 0.35 });
    d.texto("REDAME", LARG / 2, 34, COR.titulo, { alinhar: "centro", escala: 4, contorno: "#3a2410", sombra: "#120c06" });
    d.texto("O Resgate do Legado", LARG / 2, 74, COR.destaque, { alinhar: "centro", escala: 2, sombra: true });
    d.texto("15 engenheiras pioneiras. Uma máquina do tempo. Nenhum nome esquecido.", LARG / 2, 96, COR.fraco, { alinhar: "centro" });
    if (!this.iniciado) {
      if (Math.floor(t * 2) % 2 === 0) d.texto(this.jogo.ent.usouToque ? "Toque para começar" : "Clique ou pressione Enter para começar", LARG / 2, 132, COR.texto, { alinhar: "centro", sombra: true });
    } else this.menu.desenhar(d, t);
    const dica = this.jogo.ent.usouToque ? "Direcional: andar   A: agir   B: correr/voltar   Menu: pausa" : "Setas/WASD: andar   Espaço/Enter: agir   Shift: correr   Esc: menu";
    d.texto(dica, LARG / 2, ALT - 11, "#6c7299", { alinhar: "centro" });
  }
}

// ------------------------------------------------------------------ nome da protagonista
const GRADE_NOME = [
  "ABCDEFGHIJKLM",
  "NOPQRSTUVWXYZ",
  "abcdefghijklm",
  "nopqrstuvwxyz",
  "ÁÂÃÉÊÍÓÔÕÚÇ-'",
  "áâãéêíóôõúç. ",
];

export class EntradaNome extends Camada {
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
    linhas.push(["ESPAÇO", "APAGAR", "PRONTO"]);
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
    } else if (ch === "ESPAÇO") {
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
    d.retrato("protagonista", "feliz", 52, 12);
    d.texto("Qual é o seu nome?", 112, 18, COR.titulo, { sombra: true });
    d.texto("A estudante do projeto REDAME", 112, 30, COR.fraco);
    d.painel(110, 40, 160, 16, "ui_papel");
    const cursor = Math.floor(t * 3) % 2 === 0 ? "_" : "";
    d.texto(this.nome + cursor, 116, 44, COR.papel);
    const cel = this.celulas();
    cel.forEach((linha, j) =>
      linha.forEach((ch, i) => {
        const r = this.rectCelula(i, j);
        const sel = i === this.cx && j === this.cy;
        if (sel) d.ret(r.x, r.y, r.w - 1, r.h - 1, "rgba(127,227,240,0.25)");
        d.texto(ch === " " ? "·" : ch, r.x + r.w / 2, r.y + 3, sel ? COR.destaque : COR.texto, { alinhar: "centro" });
      })
    );
  }
}

// ------------------------------------------------------------------ inventario
export class Inventario extends Camada {
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
      if (q > 0) lista.push({ icone: "mat_" + m, nome: `${md?.nome || m}  ×${q}`, desc: md?.desc || "", col: 1 });
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
    d.texto("MATERIAIS E PEÇAS", 232, 17, COR.titulo, { alinhar: "centro", sombra: true });
    d.ret(159, 18, 1, 122, "#3b3366");
    if (!lista.length) {
      d.texto("A mochila está vazia.", LARG / 2, 70, COR.fraco, { alinhar: "centro" });
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
}

// ------------------------------------------------------------------ bancada de montagem
export class Bancada extends Camada {
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
    this.receitas.forEach((r, i) => {
      const y = 28 + i * 22;
      const sel = i === this.sel;
      if (sel) d.ret(14, y - 2, 126, 21, "rgba(127,227,240,0.15)");
      d.img("mat_" + r.produz, 18, y);
      d.texto(this.mats[r.produz]?.nome || r.produz, 38, y + 1, sel ? COR.destaque : COR.texto, { sombra: true });
      d.texto(`Você tem: ${e.qtd(r.produz)}`, 38, y + 10, this.pode(r) ? COR.verde : COR.fraco);
    });
    // materiais basicos que voce carrega
    const base = Object.keys(this.mats).filter((m) => !this.mats[m].peca);
    d.texto("Na mochila:", 16, 104, COR.fraco);
    base.forEach((m, i) => {
      const x = 16 + (i % 2) * 62;
      const y = 114 + Math.floor(i / 2) * 18;
      d.img("mat_" + m, x, y);
      d.texto(`×${e.qtd(m)}`, x + 18, y + 5, e.qtd(m) ? COR.texto : COR.fraco);
    });
    // receita selecionada
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
    d.texto(this.jogo.ent.usouToque ? "Montar" : "Montar (Espaço)", 260, 155, ok ? COR.destaque : COR.fraco, { alinhar: "centro" });
    if (this.brilho > 0) {
      d.ctx.globalAlpha = this.brilho * 0.5;
      d.ret(146, 24, 160, 46, "#fff6c8");
      d.ctx.globalAlpha = 1;
    }
  }
}

// ------------------------------------------------------------------ caderneta REDAME
export class Caderneta extends Camada {
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
    // cada paragrafo fica inteiro numa pagina (a primeira tem menos linhas por causa do retrato)
    const pars = [d.quebrar(p.obra, 124).map((l) => ({ l, cor: COR.papel }))];
    for (const c of p.curiosidades) pars.push(d.quebrar("• " + c, 124).map((l) => ({ l, cor: "#4a3a30" })));
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
    this.lista.forEach((p, i) => {
      const y = 28 + i * 9;
      const ok = this.resgatada(p);
      if (i === this.sel) d.ret(24, y - 1, 130, 9, "rgba(127,180,240,0.35)");
      const num = String(p.fase).padStart(2, "0");
      d.texto(num, 26, y, COR.papelFraco);
      d.texto(ok ? p.nome : `??? · ${p.local}`, 38, y, ok ? COR.papel : "#a89884");
    });
    const p = this.lista[this.sel];
    const x = 178;
    if (!this.resgatada(p)) {
      for (let k = 0; k < 10; k++) d.ret(x, 30 + k * 10 + 3, 90 + ((k * 37) % 30), 3, "rgba(120,110,100,0.35)");
      d.texto("Página apagada", 235, 70, COR.papel, { alinhar: "centro", escala: 1 });
      d.texto("pelo Esquecimento", 235, 80, COR.papel, { alinhar: "centro" });
      d.texto(`Época ${p.fase}: ${p.local}`, 235, 104, COR.papelFraco, { alinhar: "centro" });
      d.texto(p.area || "", 235, 114, COR.papelFraco, { alinhar: "centro" });
      d.texto("Resgate esta pioneira", 235, 136, "#7a5a40", { alinhar: "centro" });
      d.texto("para revelar sua história.", 235, 145, "#7a5a40", { alinhar: "centro" });
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
    if (pags.length > 1) d.texto(`${pg > 0 ? "« " : ""}${pg + 1}/${pags.length}${pg < pags.length - 1 ? " »" : ""}`, 300, 160, COR.papelFraco, { alinhar: "direita" });
  }
}

// ------------------------------------------------------------------ cerimonia: nome gravado
export class Gravacao extends Camada {
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
      d.texto("Nova página na Caderneta!", LARG / 2, 156, COR.texto, { alinhar: "centro", sombra: true });
      d.ctx.globalAlpha = 1;
    }
    if (this.fim) d.img("ui_seta", LARG - 18, ALT - 13 + Math.round(Math.sin(t * 8)));
  }
}

// ------------------------------------------------------------------ seletor de epocas (o Revisor)
export class Seletor extends Camada {
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
      this.jogo.ui.aviso("Esta época ainda está sendo reconstruída. Em breve!");
    }
  }

  desenhar(d, t) {
    d.ret(0, 0, LARG, ALT, "rgba(4,10,20,0.7)");
    d.painel(14, 8, 292, 164, "ui_holograma");
    d.texto("REVISOR DE ÉPOCAS", LARG / 2, 15, COR.destaque, { alinhar: "centro", sombra: true });
    this.lista.forEach((p, i) => {
      const y = 30 + i * 9;
      const ok = this.jogo.estado.resgatadas.includes(p.id);
      const sel = i === this.sel;
      if (sel) d.ret(20, y - 1, 280, 9, "rgba(127,227,240,0.18)");
      const cor = p.mapa ? (sel ? COR.destaque : COR.texto) : "#55708a";
      d.texto(String(p.fase).padStart(2, "0"), 24, y, cor);
      d.texto(p.local, 38, y, cor);
      d.texto(ok ? p.nome : p.mapa ? "???" : "em breve", 150, y, ok ? COR.verde : cor);
    });
  }
}

// ------------------------------------------------------------------ fim da demonstracao
export class FimDemo extends Camada {
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
    d.texto("Fim da Época 1", LARG / 2, 70, COR.titulo, { alinhar: "centro", escala: 2, sombra: true });
    const txt = "Enedina Alves Marques está de volta à história. Mas outras 14 pioneiras ainda esperam pelo resgate. As próximas épocas do Revisor estão sendo reconstruídas...";
    d.quebrar(txt, 260).forEach((l, i) => d.texto(l, LARG / 2, 94 + i * 10, COR.texto, { alinhar: "centro" }));
    if (this.t > 2 && Math.floor(t * 2) % 2 === 0) d.texto("Continuar", LARG / 2, 156, COR.destaque, { alinhar: "centro" });
  }
}
