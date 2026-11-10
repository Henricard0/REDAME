// REDAME - executor de roteiros.
//
// Um roteiro e uma lista de comandos (texto). Exemplos:
//   "fala enedina determinada Vamos ligar essa usina!"
//   "narra O vento frio de Curitiba sopra pela praça."
//   "flag conheceu_enedina"        "somar apoio 1"        "dar marmita"
//   "coletar ferro 2"              "gastar valvula 2"     "bancada"
//   "objetivo Encontre a marmita do Zé"
//   "se apoio>=3 item:plantas => pronta_para_usina | ainda_nao"
//   "ir usina entrada"             "minigame canos_fase01"   "gravar enedina"
// Escolhas usam um objeto:
//   {"escolha": "Pergunta?", "quem": "antonio", "emocao": "cetica",
//    "opcoes": [["Resposta A", "roteiro_a"], ["Resposta B", "roteiro_b"]]}

export const COMANDOS = {
  fala: { min: 3 },
  narra: { min: 1 },
  flag: { min: 1 },
  desflag: { min: 1 },
  somar: { min: 2 },
  definir: { min: 2 },
  dar: { min: 1 },
  tirar: { min: 1 },
  coletar: { min: 1 },
  gastar: { min: 1 },
  bancada: { min: 0 },
  coracao: { min: 0 },
  curar: { min: 0 },
  objetivo: { min: 1 },
  rodar: { min: 1 },
  se: { min: 3 },
  ir: { min: 2 },
  esperar: { min: 1 },
  tremer: { min: 1 },
  som: { min: 1 },
  musica: { min: 1 },
  memoria: { min: 1 },
  minigame: { min: 1 },
  gravar: { min: 1 },
  caderneta: { min: 0 },
  andar: { min: 3 },
  partir: { min: 3 },
  olhar: { min: 2 },
  esconder: { min: 0 },
  mostrar: { min: 0 },
  titulo: { min: 1 },
  aviso: { min: 1 },
  salvar: { min: 0 },
  nome: { min: 0 },
  revisor: { min: 0 },
  fim: { min: 0 },
  fimdemo: { min: 0 },
  fade: { min: 1 },
  flash: { min: 0 },
};

// Separa "se <cond> => a | b" em partes.
export function partesSe(resto) {
  const [cond, alvo] = resto.split("=>");
  const [sim, nao] = (alvo || "").split("|").map((s) => s.trim());
  return { cond: cond.trim(), sim, nao: nao || null };
}

export class Roteirista {
  constructor(jogo) {
    this.jogo = jogo;
    this.roteiros = {};
  }

  adicionar(lista) {
    Object.assign(this.roteiros, lista);
  }

  texto(s) {
    const e = this.jogo.estado;
    return String(s)
      .replace(/\{nome\}/g, e.nome || "Você")
      .replace(/\{v:([\w:]+)\}/g, (_, v) => String(e.v(v)));
  }

  async executar(id, ctx = {}) {
    const cmds = this.roteiros[id];
    if (!cmds) {
      console.warn(`Roteiro não encontrado: ${id}`);
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
      if (c.escolha !== undefined) {
        const k = await j.ui.escolher(this.texto(c.escolha), c.quem || "narrador", c.emocao || "neutro",
          c.opcoes.map((o) => this.texto(o[0])));
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
        await j.ui.falar("narrador", "neutro", `Você recebeu: ${it ? it.nome : a[0]}!`, { icone: "item_" + a[0] });
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
        j.ui.aviso("Coração de Engenheira: +1 coração!");
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
          console.warn(`Ator não encontrado: ${a[0]}`);
          break;
        }
        const p = j.mundo.andar(ator, parseInt(a[1], 10), parseInt(a[2], 10), a[3] ? parseFloat(a[3]) : undefined);
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
}
