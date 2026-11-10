// REDAME: O Resgate do Legado - nucleo do jogo.
import { LARG, ALT, Recursos, Desenho, Entrada } from "./base.js";
import { Som } from "./som.js";
import { Estado } from "./estado.js";
import { Mundo } from "./mundo.js";
import { Roteirista } from "./roteiro.js";
import { Dialogo, Escolha, Menu, Hud, Titulo, EntradaNome, Inventario, Caderneta, Gravacao, Seletor, FimDemo, Bancada } from "./ui.js";
import { MiniCanos } from "./canos.js";

class Jogo {
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
    await r.carregar(["arte", "fonte", "personagens", "itens", "pioneiras", "materiais"], progresso);
    r.dados.mapas = {};
    for (const m of r.dados.config.mapas) r.dados.mapas[m] = await r.json("mapas/" + m);
    r.dados.minigames = {};
    for (const m of r.dados.config.minigames) r.dados.minigames[m] = await r.json("minigames/" + m);
    this.roteirista = new Roteirista(this);
    for (const f of r.dados.config.roteiros) this.roteirista.adicionar(await r.json("roteiros/" + f));
    this.d = new Desenho(this.ctx, r);
    this.mundo = new Mundo(this);
    this.hud = new Hud(this);
    this.ui = {
      falar: (quem, emo, texto, opc) => this.empilhar(new Dialogo(this, quem, emo, texto, opc)),
      escolher: (p, quem, emo, ops) => this.empilhar(new Escolha(this, p, quem, emo, ops)),
      aviso: (t) => this.hud.aviso(t),
      banner: (t) => this.hud.banner(t),
      novoObjetivo: () => this.hud.novoObjetivo(),
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

  salvar(avisar) {
    if (!this.mundo.def) return;
    const e = this.estado;
    e.x = this.mundo.jogador.x;
    e.y = this.mundo.jogador.y;
    e.dir = this.mundo.jogador.dir;
    const ok = e.salvar();
    if (avisar) this.hud.aviso(ok ? "Jogo salvo" : "Não foi possível salvar neste navegador");
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
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else el.requestFullscreen?.().catch(() => this.hud.aviso("Tela cheia indisponível aqui"));
  }

  abrirPausa() {
    const s = this.som;
    const ops = [
      { texto: "Continuar", acao: (m) => m.fechar() },
      { texto: "Caderneta REDAME", acao: () => this.abrirCaderneta(this.estado.resgatadas[0] || null) },
      { texto: "Itens", acao: () => this.empilhar(new Inventario(this)) },
      { texto: `Música: ${s.musicaLigada ? "ligada" : "desligada"}`, acao: (m) => { s.alternarMusica(); m.opcoes[3].texto = `Música: ${s.musicaLigada ? "ligada" : "desligada"}`; } },
      { texto: `Efeitos: ${s.efeitosLigados ? "ligados" : "desligados"}`, acao: (m) => { s.alternarEfeitos(); m.opcoes[4].texto = `Efeitos: ${s.efeitosLigados ? "ligados" : "desligados"}`; } },
      { texto: "Tela cheia", acao: () => this.telaCheia() },
      { texto: "Salvar jogo", acao: (m) => { this.salvar(true); m.fechar(); } },
      { texto: "Salvar e voltar ao título", acao: (m) => { this.salvar(false); m.fechar(); this.telaTitulo(); } },
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
    this.camadas.forEach((cam, i) => { if (cam.cobreTudo) inicio = i; });
    const cobre = this.camadas.some((cam) => cam.cobreTudo);
    if (this.mundo.def && !cobre) {
      const livre = this.ocupado === 0 && this.camadas.length === 0;
      this.mundo.desenhar(c, d, this.t, livre);
      this.hud.desenharObjetivo(d, this.t, this.camadas.length === 0 || this.camadas[0] instanceof Dialogo);
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
      const dt = Math.min(0.05, (agora - ultimo) / 1000);
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
}

// ------------------------------------------------------------------ tela e escala
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
    await jogo.carregar((p) => { if (barra) barra.style.width = Math.round(p * 100) + "%"; });
  } catch (e) {
    console.error(e);
    if (aviso) aviso.textContent = "Não foi possível carregar o jogo. Recarregue a página para tentar de novo.";
    return;
  }
  if (aviso) aviso.hidden = true;
  jogo.ent.ligarBotoes(document);
  const hot = window.claude?.hot;
  if (hot?.snapshot) hot.snapshot(() => (jogo.mundo.def ? { save: jogo.estado.serializar() } : {}));
  const comecar = (dados) => {
    jogo.rodar();
    if (dados?.save?.mapa) jogo.continuar(dados.save);
    else jogo.telaTitulo();
  };
  if (hot?.ready) hot.ready(comecar);
  else comecar(hot?.data ?? {});
}

iniciar();
