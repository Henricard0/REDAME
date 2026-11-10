// REDAME - sons e musicas sintetizados com Web Audio (sem arquivos de audio).

const NOTAS = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };

export function freq(nota) {
  const m = /^([A-G][#b]?)(\d)$/.exec(nota);
  if (!m) return 0;
  const n = NOTAS[m[1]] + (parseInt(m[2], 10) + 1) * 12;
  return 440 * Math.pow(2, (n - 69) / 12);
}

// Cada faixa: bpm, e canais com notas em colcheias separadas por espaco.
// "." = pausa, "-" = segura a nota anterior, "|" = so separa compassos.
export const MUSICAS = {
  titulo: {
    bpm: 92,
    canais: [
      { onda: "square", vol: 0.05, notas: "A4 . C5 . E5 . D5 C5 | C5 . A4 . F4 . A4 C5 | E5 . G5 . E5 D5 C5 . | D5 . B4 . G4 . B4 D5 | A4 . C5 . E5 . A5 . | G5 . F5 . E5 . C5 . | D5 . F5 . A5 . G5 F5 | E5 - - - B4 - - -" },
      { onda: "triangle", vol: 0.09, notas: "A2 . E3 . A3 . E3 . | F2 . C3 . F3 . C3 . | C3 . G3 . C4 . G3 . | G2 . D3 . G3 . D3 . | A2 . E3 . A3 . E3 . | F2 . C3 . F3 . C3 . | D3 . A3 . D4 . A3 . | E2 . B2 . E3 . G#3 ." },
    ],
  },
  acervo: {
    bpm: 80,
    canais: [
      { onda: "triangle", vol: 0.07, notas: "E4 . G4 . C5 . G4 . | A4 . C5 . E5 . C5 . | F4 . A4 . C5 . A4 . | G4 . B4 . D5 - - . | E5 . D5 . C5 . G4 . | A4 . G4 . E4 . C4 . | F4 . E4 . D4 . F4 . | G4 - - - . . . ." },
      { onda: "sine", vol: 0.1, notas: "C3 - - - G2 - - - | A2 - - - E2 - - - | F2 - - - C3 - - - | G2 - - - D3 - - - | C3 - - - G2 - - - | A2 - - - E2 - - - | D3 - - - A2 - - - | G2 - - - G2 - - -" },
    ],
  },
  curitiba: {
    bpm: 116,
    canais: [
      { onda: "square", vol: 0.045, notas: "A4 . C5 . A4 . F4 . | D5 . C5 . Bb4 . A4 . | G4 . A4 Bb4 C5 . E5 . | F5 - - - C5 . . . | D5 . F5 . A5 . F5 . | G5 . F5 . E5 . D5 . | C5 . E5 . G5 . Bb4 . | A4 - - - F4 . . ." },
      { onda: "triangle", vol: 0.09, notas: "F2 . C3 . F3 . C3 . | Bb2 . F3 . Bb3 . F3 . | C3 . G3 . C4 . G3 . | F2 . C3 . F3 . A3 . | D3 . A3 . D4 . A3 . | G2 . D3 . G3 . D3 . | C3 . G3 . C4 . E3 . | F2 . C3 . F3 . C3 ." },
    ],
  },
  usina: {
    bpm: 128,
    canais: [
      { onda: "square", vol: 0.04, notas: "D5 . . F5 . . A5 . | G5 . F5 . E5 . C5 . | Bb4 . . D5 . . F5 . | E5 - - - A4 . . . | D5 . . F5 . . A5 . | C6 . Bb5 . A5 . G5 . | F5 . E5 . D5 . C#5 . | D5 - - - . . . ." },
      { onda: "triangle", vol: 0.1, notas: "D2 D3 D2 D3 D2 D3 D2 D3 | C2 C3 C2 C3 C2 C3 C2 C3 | Bb1 Bb2 Bb1 Bb2 Bb1 Bb2 Bb1 Bb2 | A1 A2 A1 A2 A1 A2 C#3 A2 | D2 D3 D2 D3 D2 D3 D2 D3 | F2 F3 F2 F3 G2 G3 G2 G3 | Bb1 Bb2 A1 A2 A1 A2 A1 A2 | D2 D3 D2 D3 D2 D3 D2 D3" },
    ],
  },
  chefe: {
    bpm: 148,
    canais: [
      { onda: "square", vol: 0.04, notas: "E5 . E5 G5 . E5 D5 . | C5 . C5 D5 . E5 B4 . | E5 . E5 G5 . A5 G5 . | F#5 . E5 D5 . B4 . . | E5 . G5 . B5 . A5 G5 | F#5 . D5 . E5 . B4 . | C5 . E5 . G5 . F#5 E5 | D#5 - - - B4 - - -" },
      { onda: "triangle", vol: 0.1, notas: "E2 E3 E2 E3 E2 E3 E2 E3 | C2 C3 C2 C3 D2 D3 D2 D3 | E2 E3 E2 E3 E2 E3 E2 E3 | B1 B2 B1 B2 B1 B2 D#2 D#3 | E2 E3 E2 E3 G2 G3 G2 G3 | D2 D3 D2 D3 B1 B2 B1 B2 | C2 C3 C2 C3 A1 A2 A1 A2 | B1 B2 B1 B2 B1 B2 B1 B2" },
    ],
  },
  revisor: {
    bpm: 70,
    canais: [
      { onda: "triangle", vol: 0.07, notas: "C5 E5 G5 C6 G5 E5 C5 E5 | A4 C5 E5 A5 E5 C5 A4 C5 | F4 A4 C5 F5 C5 A4 F4 A4 | G4 B4 D5 G5 D5 B4 G4 B4" },
      { onda: "sine", vol: 0.1, notas: "C3 - - - - - - - | A2 - - - - - - - | F2 - - - - - - - | G2 - - - - - - -" },
    ],
  },
};

export class Som {
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
    } catch (e) { /* armazenamento indisponivel */ }
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
    } catch (e) { /* ignora */ }
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
    g.gain.setValueAtTime(0.0001, ini);
    g.gain.exponentialRampToValueAtTime(vol, ini + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, ini + dur);
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
    g.gain.exponentialRampToValueAtTime(0.0001, ini + dur);
    s.connect(f);
    f.connect(g);
    g.connect(this.busEfeitos);
    s.start(ini);
  }

  efeito(nome, tom = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.005;
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
        this.ruido(t, 0.05, 0.08, 3000);
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
        this.ruido(t, 0.15, 0.04, 3000);
        break;
      case "aviso":
        this.nota(1300, t, 0.05, "square", 0.03);
        this.nota(1300, t + 0.09, 0.05, "square", 0.03);
        break;
      case "faisca":
        this.ruido(t, 0.08, 0.05, 4000);
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
}
