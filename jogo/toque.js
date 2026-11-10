// REDAME - controles de toque: joystick flutuante e botoes que aparecem conforme o contexto.
//
// O joystick aparece onde o dedo encosta (metade esquerda da tela) e anda na direcao da tela.
// Os botoes da direita mudam sozinhos:
//   perto de alguem ou de algo .... botao com a acao certa ("Falar", "Pegar", "Usar"...)
//   inimigos por perto ............ Golpe, Pulso e Esquiva
//   dialogos e menus .............. Avancar / OK / Voltar

const ROTULO_TIPO = { npc: "Falar", item: "Pegar", coleta: "Coletar", inspecao: "Inspecionar", predio: "Ver", barreira: "Ver" };
const ROTULO_OBJ = {
  bancada: "Montar", painel: "Usar", terminal: "Usar", porta_comando: "Usar", valvula: "Inspecionar",
  turbina: "Inspecionar", caixa_antiga: "Abrir", revisor: "Usar", banca: "Ler", estante: "Ver",
  arquivo: "Ver", quadro: "Ler", lousa_usina: "Ler", mesa_moderna: "Usar", mesa_projeto: "Ver",
};

export function rotuloDe(alvo) {
  if (!alvo) return null;
  if (alvo.def.rotulo) return alvo.def.rotulo;
  if (alvo.tipo === "obj") {
    const o = alvo.def.obj;
    return ROTULO_OBJ[o] || (o.startsWith("placa") ? "Ler" : "Ver");
  }
  return ROTULO_TIPO[alvo.tipo] || "Usar";
}

export class Toque {
  constructor(jogo) {
    this.jogo = jogo;
    this.raiz = document.getElementById("toque");
    this.ultimo = "";
    if (!this.raiz) return;
    this.zona = document.getElementById("zona-joy");
    this.base = document.getElementById("joy-base");
    this.pino = document.getElementById("joy-pino");
    this.rotulo = document.getElementById("t-interagir-rotulo");
    this.ok = document.getElementById("t-ok-rotulo");
    this.botaoOk = document.getElementById("t-ok");
    this.ligarJoystick();
  }

  ligarJoystick() {
    const R = 46;
    let id = null;
    let cx = 0;
    let cy = 0;
    const ent = this.jogo.ent;
    const mover = (e) => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const d = Math.hypot(dx, dy);
      if (d > R) {
        dx = (dx / d) * R;
        dy = (dy / d) * R;
      }
      this.pino.style.transform = `translate(${dx}px, ${dy}px)`;
      ent.definirEixo(dx / R, dy / R, true);
    };
    const soltar = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      this.base.classList.remove("ativo");
      this.base.style.left = "";
      this.base.style.top = "";
      this.pino.style.transform = "";
      ent.definirEixo(0, 0, false);
    };
    this.zona.addEventListener("pointerdown", (e) => {
      if (id !== null) return;
      e.preventDefault();
      id = e.pointerId;
      this.zona.setPointerCapture?.(e.pointerId);
      const r = this.zona.getBoundingClientRect();
      cx = e.clientX;
      cy = e.clientY;
      this.base.style.left = `${cx - r.left}px`;
      this.base.style.top = `${cy - r.top}px`;
      this.base.classList.add("ativo");
      mover(e);
    });
    this.zona.addEventListener("pointermove", (e) => {
      e.preventDefault();
      mover(e);
    });
    this.zona.addEventListener("pointerup", soltar);
    this.zona.addEventListener("pointercancel", soltar);
    this.zona.addEventListener("lostpointercapture", soltar);
    this.zona.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  atualizar() {
    if (!this.raiz) return;
    const c = this.jogo.contextoToque();
    const chave = JSON.stringify(c);
    if (chave === this.ultimo) return;
    this.ultimo = chave;
    const r = this.raiz;
    r.dataset.modo = c.modo;
    r.classList.toggle("com-alvo", !!c.rotulo);
    r.classList.toggle("combate", c.combate);
    r.classList.toggle("tem-golpe", c.golpe);
    r.classList.toggle("tem-pulso", c.pulso);
    r.classList.toggle("tem-voltar", c.voltar);
    if (c.rotulo) this.rotulo.textContent = c.rotulo;
    this.ok.textContent = c.ok;
  }
}
