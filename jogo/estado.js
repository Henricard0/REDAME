// REDAME - estado do jogo (variaveis, itens, progresso) e salvamento.

const CHAVE = "redame_save_v1";

export class Estado {
  constructor() {
    this.zerar();
  }

  zerar() {
    this.nome = "";
    this.vars = {};
    this.itens = [];
    this.objetivo = "";
    this.mapa = null;
    this.x = 0;
    this.y = 0;
    this.dir = "frente";
    this.resgatadas = [];
    this.tempo = 0;
  }

  v(nome) {
    return this.vars[nome] || 0;
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
      objetivo: this.objetivo,
      mapa: this.mapa,
      x: this.x,
      y: this.y,
      dir: this.dir,
      resgatadas: this.resgatadas,
      tempo: this.tempo,
    };
  }

  restaurar(d) {
    this.zerar();
    Object.assign(this, {
      nome: d.nome || "",
      vars: d.vars || {},
      itens: d.itens || [],
      objetivo: d.objetivo || "",
      mapa: d.mapa,
      x: d.x,
      y: d.y,
      dir: d.dir || "frente",
      resgatadas: d.resgatadas || [],
      tempo: d.tempo || 0,
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
    } catch (e) { /* ignora */ }
  }
}
