// REDAME - combate em tempo real (estilo action RPG simples).
//
// A protagonista golpeia com a chave inglesa (Espaço), dispara o pulso do Revisor (X)
// e se esquiva (Shift). Os inimigos sao criaturas do Esquecimento e maquinas tomadas
// por ele. Cada tipo de inimigo esta descrito em dados/inimigos.json.
import { TILE, clamp, iso } from "./base.js";
import { VETOR } from "./mundo.js";

const ENERGIA_MAX = 5;

function intersecta(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function normal(x, y) {
  const n = Math.hypot(x, y) || 1;
  return [x / n, y / n];
}

export class Inimigo {
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
}

export class Combate {
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
    void vida;
    for (const { def, cx, cy } of defs) {
      if (def.se && !this.estado.condicao(def.se)) continue;
      this.inimigos.push(new Inimigo(this, def.inimigo, def, cx * TILE + 8, cy * TILE + 8));
    }
  }

  // ---------------------------------------------------------------- acoes da jogadora
  atacar() {
    if (this.estado.v("arma_chave") <= 0 || this.cdGolpe > 0 || this.esquiva) return false;
    this.golpe = { t: 0, dur: 0.22, atingidos: new Set() };
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
      this.kx *= Math.pow(0.002, dt);
      this.ky *= Math.pow(0.002, dt);
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
    // quedas
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
    // golpe
    if (this.golpe) {
      this.golpe.t += dt;
      const cg = this.caixaGolpe();
      for (const i of this.inimigos) {
        if (this.golpe.atingidos.has(i)) continue;
        if (intersecta(cg, i.corpo())) {
          this.golpe.atingidos.add(i);
          this.ferirInimigo(i, 1, j.x, j.y, "golpe");
        }
      }
      if (this.golpe && this.golpe.t >= this.golpe.dur) this.golpe = null;
    }
    // inimigos
    const cj = this.caixaJogadora();
    for (const i of [...this.inimigos]) {
      this.atualizarInimigo(i, dt);
      if (i.morto) continue;
      const ci = i.caixa();
      const toque = { x: ci.x - 2, y: ci.y - 2, w: ci.w + 4, h: ci.h + 4 };
      if (intersecta(toque, cj)) this.ferirJogadora(i.t.dano || 1, i.x, i.y);
    }
    // projeteis
    for (const p of this.projeteis) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vida -= dt;
      const r = { x: p.x - 3, y: p.y - 3, w: 6, h: 6 };
      if (p.dono === "jogadora") {
        for (const i of this.inimigos) {
          if (intersecta(r, i.corpo())) {
            this.ferirInimigo(i, p.dano, p.x - p.vx * 0.05, p.y - p.vy * 0.05, "pulso");
            p.vida = 0;
            break;
          }
        }
      } else if (intersecta(r, cj)) {
        this.ferirJogadora(p.dano, p.x - p.vx, p.y - p.vy);
        p.vida = 0;
      }
      if (p.vida > 0 && this.bateParede(p.x, p.y)) {
        p.vida = 0;
        for (let k = 0; k < 3; k++) this.particula(p.x, p.y, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, p.dono === "jogadora" ? "#7fe3f0" : "#ffb04a", 0.25, p.z ?? 10);
      }
    }
    this.projeteis = this.projeteis.filter((p) => p.vida > 0);
    // quedas
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
    // efeitos
    for (const p of this.particulas) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 90 * dt;
      p.vida -= dt;
    }
    this.particulas = this.particulas.filter((p) => p.vida > 0);
    for (const t of this.textos) t.t += dt;
    this.textos = this.textos.filter((t) => t.t < 1.1);
    void e;
  }

  pegar(q) {
    const e = this.estado;
    if (q.tipo === "coracao") {
      e.vida = Math.min(e.vidaMax, e.vida + 2);
      this.texto(q.x, q.y, "+1 coração", "#e5675b", 18);
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
    if (!i.chefe && dist > 220) return; // longe da tela: descansa
    if (i.chefe && !this.estado.v(i.def.ativar || "chefe_ativo")) return;
    // empurrao
    if (Math.abs(i.kx) > 1 || Math.abs(i.ky) > 1) {
      this.mover(i, i.kx * dt, i.ky * dt);
      i.kx *= Math.pow(0.003, dt);
      i.ky *= Math.pow(0.003, dt);
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
          if (dist < alvo - 14) { mx = -nx; my = -ny; }
          else if (dist > alvo + 14) { mx = nx; my = ny; }
          else { mx = -ny * Math.sign(Math.sin(i.anim * 0.7)); my = nx * Math.sign(Math.sin(i.anim * 0.7)); }
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
          if (i.timer <= 0) { i.estado = "vagar"; i.timer = 0.8; }
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
      // nao se afasta demais de casa
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
        i.timer = 1.0 * (this.leve() ? 1.4 : 1);
        this.jogo.som.efeito("aviso");
      }
    } else if (i.estado === "carregando") {
      if (Math.random() < dt * 30) this.particula(i.x + (Math.random() - 0.5) * 30, i.y + (Math.random() - 0.5) * 20, 0, -20, "#7fe3f0", 0.3, 20 + Math.random() * 20);
      if (i.timer <= 0) {
        i.estado = "anel";
        const n = metade ? 12 : 8;
        const giro = Math.random() * Math.PI;
        for (let k = 0; k < n; k++) {
          const a = giro + (k * Math.PI * 2) / n;
          this.projeteis.push({ x: i.x, y: i.y, z: 18, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70, vida: 3.2, dono: "inimigo", dano: 1, sprite: "fx_faisca" });
        }
        this.jogo.som.efeito("turbina");
        i.timer = 0.5;
      }
    } else if (i.estado === "anel") {
      if (i.timer <= 0) {
        i.estado = "superaquecido";
        i.timer = (quarto ? 2.0 : 2.7) * (this.leve() ? 1.3 : 1);
        this.jogo.som.efeito("vapor");
        this.texto(i.x, i.y, "Núcleo exposto!", "#ffd98a", 60);
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
        },
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
        },
      });
    }
    return lista;
  }

  desenharSobre(dd, t) {
    const j = this.mundo.jogador;
    const pj = iso(j.x, j.y);
    // golpe da chave inglesa: a ferramenta gira num arco na frente da jogadora (na tela)
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
    void yObjetivo;
    // barra do chefe
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
}
