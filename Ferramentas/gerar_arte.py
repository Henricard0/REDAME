# -*- coding: utf-8 -*-
"""
REDAME: O Resgate do Legado - gerador da arte provisoria em pixel art.

Gera todos os PNGs usados pelo jogo na pasta arte/ (e os indices em dados/).
Qualquer PNG pode ser substituido por arte feita a mao, desde que mantenha
o mesmo nome e o mesmo tamanho (e, nas folhas de animacao, a mesma grade).

Uso:  python3 Ferramentas/gerar_arte.py
Requer: Pillow (pip install pillow)
"""
import json
import math
import os
import random

from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAIDA = os.path.join(RAIZ, "arte")
DADOS = os.path.join(RAIZ, "dados")
FONTE_TTF = os.path.join(RAIZ, "Ferramentas", "Tiny5-Regular.ttf")
os.makedirs(SAIDA, exist_ok=True)
os.makedirs(DADOS, exist_ok=True)

# ---------------------------------------------------------------- paleta
CONTORNO = (34, 28, 44, 255)
T = (0, 0, 0, 0)


def c(r, g, b, a=255):
    return (r, g, b, a)


def escurecer(cor, f=0.78):
    return (int(cor[0] * f), int(cor[1] * f), int(cor[2] * f), cor[3] if len(cor) > 3 else 255)


def clarear(cor, f=0.25):
    return (int(cor[0] + (255 - cor[0]) * f), int(cor[1] + (255 - cor[1]) * f),
            int(cor[2] + (255 - cor[2]) * f), cor[3] if len(cor) > 3 else 255)


PELES = {
    "parda_clara": c(204, 146, 108),
    "escura": c(116, 72, 46),
    "clara": c(240, 198, 162),
    "media": c(184, 124, 86),
}
CABELOS = {
    "castanho_escuro": c(66, 40, 28),
    "preto": c(36, 30, 36),
    "grisalho": c(176, 176, 184),
    "castanho": c(110, 70, 42),
    "ruivo": c(150, 64, 40),
}
ROUPAS = {
    "roxo": c(112, 76, 184),
    "jeans": c(62, 92, 144),
    "branco": c(236, 234, 224),
    "marinho": c(44, 56, 104),
    "cinza_escuro": c(70, 72, 84),
    "caqui": c(178, 152, 98),
    "azul_operario": c(66, 100, 156),
    "marrom": c(124, 84, 54),
    "vinho": c(134, 44, 64),
    "verde": c(72, 124, 84),
    "cinza": c(118, 120, 132),
    "mostarda": c(204, 162, 62),
    "vermelho": c(186, 64, 58),
    "preto": c(44, 40, 48),
    "bege": c(214, 192, 148),
    "amarelo": c(232, 196, 64),
    "teal": c(48, 132, 136),
}


# ---------------------------------------------------------------- canvas
class Tela:
    def __init__(self, w, h, fundo=T):
        self.w, self.h = w, h
        self.img = Image.new("RGBA", (w, h), fundo)
        self.px = self.img.load()

    def p(self, x, y, cor):
        if 0 <= x < self.w and 0 <= y < self.h and cor is not None:
            if len(cor) == 4 and cor[3] < 255 and cor[3] > 0:
                base = self.px[x, y]
                a = cor[3] / 255.0
                self.px[x, y] = (int(base[0] * (1 - a) + cor[0] * a), int(base[1] * (1 - a) + cor[1] * a),
                                 int(base[2] * (1 - a) + cor[2] * a), max(base[3], cor[3]))
            else:
                self.px[x, y] = cor

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.px[x, y]
        return T

    def ret(self, x, y, w, h, cor):
        for j in range(y, y + h):
            for i in range(x, x + w):
                self.p(i, j, cor)

    def moldura(self, x, y, w, h, cor):
        for i in range(x, x + w):
            self.p(i, y, cor)
            self.p(i, y + h - 1, cor)
        for j in range(y, y + h):
            self.p(x, j, cor)
            self.p(x + w - 1, j, cor)

    def elipse(self, cx, cy, rx, ry, cor):
        for j in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for i in range(int(cx - rx) - 1, int(cx + rx) + 2):
                if ((i + 0.5 - cx) / rx) ** 2 + ((j + 0.5 - cy) / ry) ** 2 <= 1.0:
                    self.p(i, j, cor)

    def linha(self, x0, y0, x1, y1, cor):
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for k in range(n + 1):
            self.p(round(x0 + (x1 - x0) * k / n), round(y0 + (y1 - y0) * k / n), cor)

    def carimbo(self, arte, pal, x=0, y=0, espelhar=False):
        """Desenha uma arte ASCII. '.' e ' ' sao transparentes."""
        for j, linha in enumerate(arte):
            n = len(linha)
            for i, ch in enumerate(linha):
                if ch in ". ":
                    continue
                cor = pal.get(ch)
                if cor is None:
                    continue
                xi = (x + n - 1 - i) if espelhar else (x + i)
                self.p(xi, y + j, cor)

    def contorno(self, cor=CONTORNO, diagonais=False):
        alvo = []
        viz = [(1, 0), (-1, 0), (0, 1), (0, -1)]
        if diagonais:
            viz += [(1, 1), (-1, 1), (1, -1), (-1, -1)]
        for j in range(self.h):
            for i in range(self.w):
                if self.px[i, j][3] == 0:
                    for dx, dy in viz:
                        if self.get(i + dx, j + dy)[3] > 200 and self.get(i + dx, j + dy) != cor:
                            alvo.append((i, j))
                            break
        for i, j in alvo:
            self.px[i, j] = cor

    def colar(self, outra, x, y):
        self.img.alpha_composite(outra.img if isinstance(outra, Tela) else outra, (x, y))
        self.px = self.img.load()

    def salvar(self, nome):
        self.img.save(os.path.join(SAIDA, nome + ".png"))


def ruido(tela, x, y, w, h, cores, densidade, seed):
    r = random.Random(seed)
    for j in range(y, y + h):
        for i in range(x, x + w):
            if r.random() < densidade:
                tela.p(i, j, r.choice(cores))


# ================================================================ PERSONAGENS
# 16x24 por quadro. Folha: 3 colunas (parado, passo A, passo B) x 3 linhas
# (baixo, cima, lado-direita). O jogo espelha "lado" para a esquerda.
W_P, H_P = 16, 24

CABECA_FRENTE = [
    "................",
    "................",
    "................",
    "....ssssssss....",
    "...ssssssssss...",
    "...ssssssssss...",
    "...ssssssssss...",
    "...ssessssess...",
    "...ssessssess...",
    "...srssssssrs...",
    "....sssmmsss....",
    ".....ssssss.....",
    "......SSSS......",
]
CABECA_COSTAS = [
    "................",
    "................",
    "................",
    "....ssssssss....",
    "...ssssssssss...",
    "...ssssssssss...",
    "...ssssssssss...",
    "...ssssssssss...",
    "...ssssssssss...",
    "...ssssssssss...",
    "....ssssssss....",
    ".....ssssss.....",
    "......SSSS......",
]
CABECA_LADO = [
    "................",
    "................",
    "................",
    ".....sssssss....",
    "....sssssssss...",
    "....sssssssss...",
    "....sssssssss...",
    "....ssssssess...",
    "....ssssssess...",
    "....ssssssssss..",
    "....sssssssms...",
    ".....sssssss....",
    "......SSS.......",
]
TRONCO_FRENTE = [
    "....cccccccc....",
    "...cccccccccc...",
    "...cccccccccc...",
    "...CccccccccC...",
    "...sccccccccs...",
    "....pppppppp....",
]
TRONCO_LADO = [
    ".....cccccc.....",
    ".....cccccc.....",
    ".....ccCccc.....",
    ".....ccCccc.....",
    ".....ccsccc.....",
    ".....pppppp.....",
]
PERNAS = {
    # calca
    ("frente", 0): [".....pp..pp.....", ".....pp..pp.....", ".....PP..PP.....", ".....bb..bb....."],
    ("frente", 1): [".....pp..pp.....", ".....pp..pp.....", ".....bb..PP.....", ".........bb....."],
    ("frente", 2): [".....pp..pp.....", ".....pp..pp.....", ".....PP..bb.....", ".....bb........."],
    ("lado", 0): ["......pppp......", "......pppp......", "......PPPP......", "......bbbbb....."],
    ("lado", 1): [".....pppppp.....", ".....pp..pp.....", "....PP....PP....", "....bb....bbb..."],
    ("lado", 2): ["......pppp......", "......ppp.......", "......PPP.......", "......bbbb......"],
}
PERNAS_SAIA = {
    ("frente", 0): ["...pppppppppp...", "...PPPPPPPPPP...", ".....ss..ss.....", ".....bb..bb....."],
    ("frente", 1): ["...pppppppppp...", "...PPPPPPPPPP...", ".....bb..ss.....", ".........bb....."],
    ("frente", 2): ["...pppppppppp...", "...PPPPPPPPPP...", ".....ss..bb.....", ".....bb........."],
    ("lado", 0): [".....ppppppp....", ".....PPPPPPP....", "......ss.ss.....", "......bb.bbb...."],
    ("lado", 1): [".....ppppppp....", ".....PPPPPPP....", ".....ss...ss....", "....bb....bbb..."],
    ("lado", 2): [".....ppppppp....", ".....PPPPPPP....", ".......ss.......", ".......bbb......"],
}

CABELOS_ARTE = {
    "medio": {
        "frente": [
            "................",
            "................",
            ".....hhhhhh.....",
            "...hhhhhhhhhh...",
            "..hhhLLhhhhhhh..",
            "..hhhhhhhhhhhh..",
            "..hhhhh....hhh..",
            "..hhh.......hh..",
            "..hh........hh..",
            "..hh........hh..",
            "..Hh........hH..",
            "..HH........HH..",
            "..HH........HH..",
            "...H........H...",
        ],
        "costas": [
            "................",
            "................",
            ".....hhhhhh.....",
            "...hhhhhhhhhh...",
            "..hhhLLhhhhhhh..",
            "..hhhhhhhhhhhh..",
            "..hhhhhhhhhhhh..",
            "..hhhhhhhhhhhh..",
            "..hhhhhhhhhhhh..",
            "..hhhhhhhhhhhh..",
            "..hhhhhhhhhhhh..",
            "..HhhhhhhhhhhH..",
            "..HHhhhhhhhhHH..",
            "...HHHhhhhHHH...",
            ".....HHHHHH.....",
        ],
        "lado": [
            "................",
            "................",
            "......hhhhh.....",
            "....hhhhhhhhh...",
            "...hhhhhLLhhhh..",
            "...hhhhhhhhhhh..",
            "...hhhhhhh......",
            "...hhhhhh.......",
            "...hhhhhh.......",
            "...hhhhhh.......",
            "...Hhhhhh.......",
            "...HHhhh........",
            "...HHHh.........",
            "....HH..........",
        ],
    },
    "crespo": {
        "frente": [
            "................",
            ".....hhhhhh.....",
            "...hhhhhhhhhh...",
            "..hhLhhhhhhLhh..",
            "..hhhhhhhhhhhh..",
            ".hhhhhhhhhhhhhh.",
            ".hhhh......hhhh.",
            ".hhh........hhh.",
            ".hh..........hh.",
            "..h..........h..",
        ],
        "costas": [
            "................",
            ".....hhhhhh.....",
            "...hhhhhhhhhh...",
            "..hhLhhhhhhLhh..",
            "..hhhhhhhhhhhh..",
            ".hhhhhhhhhhhhhh.",
            ".hhhhhhhhhhhhhh.",
            ".hhhhhhhhhhhhhh.",
            ".hhhhhhhhhhhhhh.",
            "..hhhhhhhhhhhh..",
            "..HhhhhhhhhhhH..",
            "...HHHHHHHHHH...",
        ],
        "lado": [
            "................",
            "......hhhhh.....",
            "....hhhhhhhhh...",
            "...hhLhhhhhLhh..",
            "..hhhhhhhhhhhh..",
            "..hhhhhhhhhhhh..",
            "..hhhhhhhh......",
            "..hhhhhhh.......",
            "..hhhhhhh.......",
            "...hhhhh........",
            "...HHHH.........",
        ],
    },
    "curto": {
        "frente": [
            "................",
            "................",
            "....hhhhhhhh....",
            "...hhhhhhhhhh...",
            "...hhLLhhhhhh...",
            "...hhhhhhhhhh...",
            "...hh......hh...",
            "...h........h...",
        ],
        "costas": [
            "................",
            "................",
            "....hhhhhhhh....",
            "...hhhhhhhhhh...",
            "...hhLLhhhhhh...",
            "...hhhhhhhhhh...",
            "...hhhhhhhhhh...",
            "...hhhhhhhhhh...",
            "...Hhhhhhhhhh...",
            "....HHHHHHHH....",
        ],
        "lado": [
            "................",
            "................",
            ".....hhhhhhh....",
            "....hhhhhhhhh...",
            "....hhhLLhhhh...",
            "....hhhhhhhhh...",
            "....hhhhh.......",
            "....hhhh........",
            "....Hhh.........",
            ".....H..........",
        ],
    },
    "coque": {
        "frente": [
            "......hhhh......",
            ".....hhhhhh.....",
            "....hhhhhhhh....",
            "...hhhhLLhhhh...",
            "...hhhhhhhhhh...",
            "...hhhh..hhhh...",
            "...hh......hh...",
            "...h........h...",
        ],
        "costas": [
            "......hhhh......",
            ".....hhLhhh.....",
            "....hHHHHHHh....",
            "...hhhhhhhhhh...",
            "...hhhhhhhhhh...",
            "...hhhhhhhhhh...",
            "...hhhhhhhhhh...",
            "...hhhhhhhhhh...",
            "...Hhhhhhhhhh...",
            "....HHHHHHHH....",
        ],
        "lado": [
            "................",
            "..hhh...........",
            ".hhhhhhhhhh.....",
            "..hhhhhhhhhhh...",
            "....hhhhLLhhh...",
            "....hhhhhhhhh...",
            "....hhhhh.......",
            "....hhhh........",
            "....Hhh.........",
        ],
    },
}
CHAPEUS_ARTE = {
    "chapeu": {
        "frente": ["................", "....xxxxxxxx....", "....xxxxxxxx....", "....XXXXXXXX....",
                   ".xxxxxxxxxxxxxx.", "...hh......hh..."],
        "costas": ["................", "....xxxxxxxx....", "....xxxxxxxx....", "....XXXXXXXX....",
                   ".xxxxxxxxxxxxxx.", "...hhhhhhhhhh...", "...hhhhhhhhhh...", "....HHHHHHHH...."],
        "lado": ["................", ".....xxxxxxx....", ".....xxxxxxx....", ".....XXXXXXX....",
                 "..xxxxxxxxxxxxx.", "....hhhh........", "....hhh........."],
    },
    "bone": {
        "frente": ["................", "................", "....xxxxxxxx....", "...xxxLxxxxxx...",
                   "...xxxxxxxxxx...", "..XXXXXXXXXXXX..", "...h........h..."],
        "costas": ["................", "................", "....xxxxxxxx....", "...xxxxxxxxxx...",
                   "...xxxxxxxxxx...", "...XXXXXXXXXX...", "...hhhhhhhhhh...", "...hhhhhhhhhh...",
                   "....HHHHHHHH...."],
        "lado": ["................", "................", ".....xxxxxxx....", "....xxxLxxxxx...",
                 "....xxxxxxxxx...", "....XXXXXXXXXXX.", "....hhhh........", "....hhh........."],
    },
    "capacete": {
        "frente": ["................", ".....xxxxxx.....", "...xxxxxxxxxx...", "..xxxxLLxxxxxx..",
                   "..xxxxxxxxxxxx..", ".XXXXXXXXXXXXXX.", "...h........h..."],
        "costas": ["................", ".....xxxxxx.....", "...xxxxxxxxxx...", "..xxxxLLxxxxxx..",
                   "..xxxxxxxxxxxx..", ".XXXXXXXXXXXXXX.", "...hhhhhhhhhh...", "....HHHHHHHH...."],
        "lado": ["................", "......xxxxxx....", "....xxxxxxxxx...", "...xxxxLLxxxxx..",
                 "...xxxxxxxxxxx..", "..XXXXXXXXXXXXX.", "....hhh........."],
    },
}
OCULOS = {
    "frente": [(4, 6, "ggg..ggg"), (4, 7, "l.lgglel"), (4, 8, "l.l..lel"), (4, 9, "lll..lll")],
    "lado": [(9, 6, "ggg"), (6, 7, "gggl"), (11, 7, "l"), (9, 8, "l"), (11, 8, "l"), (9, 9, "lll")],
}
MOCHILA = {
    "costas": [(4, 13, "mmmmmmmm"), (4, 14, "mMmmmmMm"), (4, 15, "mmmmmmmm"), (4, 16, "mmMMMMmm"),
               (4, 17, "mmmmmmmm")],
    "lado": [(3, 13, "mm"), (2, 14, "mmm"), (2, 15, "mMm"), (2, 16, "mmm"), (3, 17, "mm")],
}
BIGODE = {"frente": [(6, 10, "hhhh")], "lado": [(10, 10, "hh")]}
GOLA = {"frente": [(6, 13, "wwww"), (7, 14, "ww")], "lado": [(8, 13, "ww")]}
ALCAS = {"frente": [(5, 13, "P"), (10, 13, "P"), (5, 14, "P"), (10, 14, "P")], "lado": [(7, 13, "P")]}


def marcas(tela, lista, pal, espelho_lado=False):
    for (x, y, s) in lista:
        for k, ch in enumerate(s):
            if ch != "." and ch in pal:
                tela.p(x + k, y, pal[ch])


def personagem(nome, pele, cabelo=None, cor_cabelo="preto", chapeu=None, cor_chapeu="cinza",
               topo="branco", baixo="jeans", sapato=c(56, 44, 44), saia=False, oculos=False,
               mochila=None, bigode=False, gola=False, alcas=False):
    ps = PELES[pele]
    hc = CABELOS[cor_cabelo]
    tc = ROUPAS[topo] if isinstance(topo, str) else topo
    bc = ROUPAS[baixo] if isinstance(baixo, str) else baixo
    xc = ROUPAS.get(cor_chapeu, cor_chapeu) if isinstance(cor_chapeu, str) else cor_chapeu
    pal = {
        "s": ps, "S": escurecer(ps, 0.82), "r": clarear(c(214, 110, 110), 0.15) if pele != "escura" else escurecer(ps, 0.9),
        "e": c(30, 24, 34), "m": escurecer(ps, 0.7),
        "c": tc, "C": escurecer(tc), "p": bc, "P": escurecer(bc), "b": sapato,
        "h": hc, "H": escurecer(hc, 0.75), "L": clarear(hc, 0.3),
        "x": xc, "X": escurecer(xc, 0.7), "g": c(40, 34, 44), "w": c(244, 242, 236),
        "l": c(196, 226, 246),
    }
    if mochila:
        pal_m = {"m": mochila, "M": escurecer(mochila)}
    folha = Tela(W_P * 3, H_P * 3)
    for linha, direcao in enumerate(["frente", "costas", "lado"]):
        for quadro in range(3):
            t = Tela(W_P, H_P)
            cab = {"frente": CABECA_FRENTE, "costas": CABECA_COSTAS, "lado": CABECA_LADO}[direcao]
            tr = TRONCO_LADO if direcao == "lado" else TRONCO_FRENTE
            chave = ("lado" if direcao == "lado" else "frente", quadro)
            pernas = (PERNAS_SAIA if saia else PERNAS)[chave]
            t.carimbo(cab, pal, 0, 0)
            t.carimbo(tr, pal, 0, 13)
            t.carimbo(pernas, pal, 0, 19)
            if gola and direcao != "costas":
                marcas(t, GOLA["frente" if direcao == "frente" else "lado"], pal)
            if alcas and direcao != "lado":
                marcas(t, ALCAS["frente"], pal)
            if mochila and direcao in MOCHILA:
                marcas(t, MOCHILA[direcao], pal_m)
            if mochila and direcao == "frente":
                t.p(3, 13, pal_m["m"]); t.p(12, 13, pal_m["m"])
            if cabelo:
                t.carimbo(CABELOS_ARTE[cabelo][direcao], pal, 0, 0)
            if chapeu:
                t.carimbo(CHAPEUS_ARTE[chapeu][direcao], pal, 0, 0)
            if bigode and direcao != "costas":
                marcas(t, BIGODE["frente" if direcao == "frente" else "lado"], pal)
            if oculos and direcao != "costas":
                marcas(t, OCULOS["frente" if direcao == "frente" else "lado"], pal)
            t.contorno()
            folha.colar(t, quadro * W_P, linha * H_P)
    folha.salvar("pers_" + nome)
    return pal


# ================================================================ RETRATOS
EMOCOES = ["neutro", "feliz", "determinada", "cansada", "surpresa", "triste", "cetica"]
R = 48


def retrato(nome, pele, cabelo="curto", cor_cabelo="preto", topo="branco", gola=None, oculos=False,
            chapeu=None, cor_chapeu="cinza", bigode=False, rugas=False, cor_fundo=None):
    ps = PELES[pele]
    sh = escurecer(ps, 0.84)
    hc = CABELOS[cor_cabelo]
    hs = escurecer(hc, 0.72)
    hl = clarear(hc, 0.28)
    tc = ROUPAS[topo]
    folha = Tela(R * len(EMOCOES), R)
    for k, emo in enumerate(EMOCOES):
        t = Tela(R, R)
        # cabelo de tras
        if cabelo == "medio":
            t.elipse(24, 20, 15, 15, hc)
            t.ret(9, 20, 8, 21, hc)
            t.ret(31, 20, 8, 21, hc)
            t.ret(9, 36, 8, 5, hs)
            t.ret(31, 36, 8, 5, hs)
        elif cabelo == "crespo":
            for (cx, cy, r) in [(24, 13, 15), (13, 18, 8), (35, 18, 8), (16, 9, 8), (32, 9, 8), (24, 6, 9),
                                (11, 26, 6), (37, 26, 6)]:
                t.elipse(cx, cy, r, r, hc)
        elif cabelo == "coque":
            t.elipse(24, 18, 13, 13, hc)
            t.elipse(24, 5, 6, 5, hc)
        elif cabelo == "curto":
            t.elipse(24, 17, 13, 12, hc)
        # corpo
        t.elipse(24, 52, 21, 14, tc)
        for j in range(40, 48):
            for i in range(0, 48):
                if t.get(i, j)[3] and t.get(i, j)[:3] == tc[:3] and i > 34:
                    t.p(i, j, escurecer(tc, 0.85))
        if gola:
            gc = ROUPAS[gola]
            for j in range(38, 44):
                w = 44 - j
                t.ret(24 - w, j, 2, 1, gc)
                t.ret(23 + w, j, 2, 1, gc)
            t.ret(21, 38, 6, 2, gc)
        # pescoco
        t.ret(20, 30, 8, 9, sh)
        t.ret(21, 38, 6, 2, sh) if not gola else None
        # orelhas
        t.elipse(12.5, 24, 2.5, 3.5, ps)
        t.elipse(35.5, 24, 2.5, 3.5, sh)
        # rosto
        for j in range(8, 37):
            for i in range(12, 37):
                dx = (i + 0.5 - 24) / 11.5
                dy = (j + 0.5 - 22) / 13.5
                if dx * dx + dy * dy <= 1.0:
                    # queixo mais estreito
                    if j > 28 and abs(i + 0.5 - 24) > 11.5 - (j - 28) * 0.9:
                        continue
                    sombra = dx * 0.8 + dy * 0.35 > 0.62
                    t.p(i, j, sh if sombra else ps)
        # cabelo da frente (franja)
        if cabelo == "medio":
            for i in range(12, 37):
                limite = 14 + (3 if i > 26 else 0) - (1 if 20 < i < 24 else 0)
                for j in range(6, limite):
                    if t.get(i, j)[3]:
                        t.p(i, j, hc)
            for i in range(14, 21):
                t.p(i, 8, hl)
            t.ret(12, 14, 2, 16, hc)
            t.ret(35, 14, 2, 16, hc)
        elif cabelo == "crespo":
            for i in range(12, 37):
                limite = 12 + int(1.5 * math.sin(i * 1.3))
                for j in range(4, limite):
                    if t.get(i, j)[3]:
                        t.p(i, j, hc)
            for (x, y) in [(15, 5), (22, 3), (30, 5), (36, 12), (11, 13), (19, 8), (28, 8)]:
                t.p(x, y, hl); t.p(x + 1, y, hl)
        elif cabelo == "coque":
            for i in range(12, 37):
                for j in range(6, 13 if i < 24 else 12):
                    if t.get(i, j)[3]:
                        t.p(i, j, hc)
            t.linha(24, 6, 24, 12, hs)
            for i in range(19, 23):
                t.p(i, 3, hl)
        elif cabelo == "curto":
            for i in range(12, 37):
                for j in range(5, 12 if i < 30 else 13):
                    if t.get(i, j)[3]:
                        t.p(i, j, hc)
            for i in range(16, 22):
                t.p(i, 7, hl)
        # sobrancelhas
        brow = {
            "neutro": [(0, 0), (1, 0), (2, 0), (3, 0), (4, 0)],
            "feliz": [(0, 1), (1, 0), (2, -1), (3, -1), (4, 0)],
            "determinada": [(0, -1), (1, -1), (2, 0), (3, 0), (4, 1)],
            "cansada": [(0, 1), (1, 1), (2, 1), (3, 1), (4, 1)],
            "surpresa": [(0, -1), (1, -2), (2, -2), (3, -2), (4, -1)],
            "triste": [(0, 1), (1, 1), (2, 0), (3, -1), (4, -1)],
            "cetica": [(0, 0), (1, 0), (2, 0), (3, 0), (4, 0)],
        }[emo]
        for (dx, dy) in brow:
            t.p(16 + dx, 19 + dy, hs)
            t.p(16 + dx, 20 + dy, hs) if emo in ("determinada",) else None
            dyr = dy if emo != "cetica" else dy - 2 + (dx // 3)
            t.p(32 - dx, 19 + dyr, hs)
            t.p(32 - dx, 20 + dyr, hs) if emo in ("determinada",) else None
        # olhos
        branco = c(250, 248, 244)
        iris = c(70, 44, 30) if pele != "clara" else c(70, 96, 120)
        pup = c(24, 20, 28)
        for (ex, lado) in [(16, 0), (28, 1)]:
            if emo == "feliz":
                t.linha(ex, 24, ex + 1, 23, pup); t.linha(ex + 2, 23, ex + 4, 24, pup)
                t.p(ex + 2, 22, pup)
                continue
            topo_o = 22
            alt = 4
            if emo == "cansada":
                topo_o, alt = 24, 2
            if emo == "cetica" and lado == 1:
                topo_o, alt = 24, 2
            if emo == "surpresa":
                topo_o, alt = 21, 5
            t.ret(ex, topo_o, 5, alt, branco)
            t.ret(ex + 1 + (lado == 0), topo_o + (1 if alt > 2 else 0), 2, max(alt - 1, 1), iris)
            t.p(ex + 2 - (lado == 1) + (lado == 0) * 0, topo_o + alt - 2 if alt > 2 else topo_o, pup)
            t.ret(ex - 1, topo_o - 1, 7, 1, pup)  # palpebra/cilio
            if emo == "triste":
                t.p(ex + (4 if lado == 0 else 0), topo_o, pup)
            if emo == "determinada":
                t.ret(ex, topo_o, 5, 1, pup)
            t.p(ex + 3 - lado * 2, topo_o + 1, branco)  # brilho
        # nariz
        t.p(25, 27, escurecer(ps, 0.72)); t.p(24, 28, escurecer(ps, 0.72))
        # bochechas
        if emo in ("feliz",):
            blush = c(226, 120, 120, 150)
            t.ret(14, 28, 3, 1, blush); t.ret(31, 28, 3, 1, blush)
        # boca
        boca = c(120, 46, 54)
        dente = c(250, 248, 244)
        if emo == "neutro":
            t.ret(22, 31, 5, 1, boca)
        elif emo == "feliz":
            t.ret(21, 30, 7, 1, boca); t.ret(22, 31, 5, 2, boca); t.ret(22, 31, 5, 1, dente)
            t.p(20, 29, boca); t.p(28, 29, boca)
        elif emo == "determinada":
            t.ret(21, 31, 7, 1, boca); t.p(27, 30, boca)
        elif emo == "cansada":
            t.ret(22, 32, 2, 1, boca); t.ret(24, 31, 2, 1, boca); t.p(26, 32, boca)
        elif emo == "surpresa":
            t.ret(23, 30, 3, 3, boca)
        elif emo == "triste":
            t.ret(22, 31, 5, 1, boca); t.p(21, 32, boca); t.p(27, 32, boca)
        elif emo == "cetica":
            t.ret(22, 32, 3, 1, boca); t.ret(25, 31, 3, 1, boca)
        if emo == "cansada":
            gota = c(150, 200, 240)
            t.ret(36, 13, 2, 3, gota); t.p(36, 12, gota)
        if rugas:
            t.p(14, 26, sh); t.p(34, 26, sh); t.linha(19, 32, 20, 33, sh); t.linha(29, 32, 28, 33, sh)
        if bigode:
            t.ret(20, 29, 9, 2, hs); t.p(19, 30, hs); t.p(29, 30, hs)
        if oculos:
            arm = c(40, 34, 44)
            t.moldura(14, 20, 9, 8, arm); t.moldura(26, 20, 9, 8, arm)
            t.ret(23, 22, 3, 1, arm)
            t.ret(12, 22, 2, 1, arm); t.ret(35, 22, 2, 1, arm)
            lente = c(200, 230, 255, 60)
            for j in range(21, 27):
                for i in list(range(15, 22)) + list(range(27, 34)):
                    t.p(i, j, lente)
        if chapeu:
            xc = ROUPAS.get(cor_chapeu)
            xs = escurecer(xc, 0.72)
            if chapeu == "capacete":
                t.elipse(24, 11, 15, 10, xc)
                t.ret(8, 13, 33, 3, xs)
                t.ret(16, 4, 5, 2, clarear(xc, 0.4))
            elif chapeu == "bone":
                t.elipse(24, 11, 14, 8, xc)
                t.ret(10, 13, 28, 2, xc)
                t.ret(8, 15, 22, 2, xs)
            elif chapeu == "chapeu":
                t.ret(14, 3, 20, 9, xc)
                t.ret(14, 9, 20, 2, xs)
                t.ret(7, 11, 34, 3, xc)
        t.contorno()
        folha.colar(t, k * R, 0)
    folha.salvar("ret_" + nome)


def retrato_revisor():
    folha = Tela(R * len(EMOCOES), R)
    for k in range(len(EMOCOES)):
        t = Tela(R, R)
        latao = c(196, 150, 72)
        lat_e = c(140, 100, 46)
        t.elipse(24, 24, 20, 20, lat_e)
        t.elipse(24, 24, 18, 18, latao)
        t.elipse(24, 24, 13, 13, c(30, 40, 70))
        brilho = 0.5 + 0.5 * math.sin(k * 0.9)
        nucleo = c(int(90 + 60 * brilho), int(220), int(230 + 25 * brilho))
        t.elipse(24, 24, 7 + brilho * 2, 7 + brilho * 2, nucleo)
        t.elipse(24, 24, 3, 3, c(240, 255, 255))
        for a in range(12):
            ang = a * math.pi / 6
            x = 24 + math.cos(ang) * 16
            y = 24 + math.sin(ang) * 16
            t.ret(int(x) - 1, int(y) - 1, 2, 2, lat_e)
        t.linha(24, 24, 24 + int(10 * math.cos(k)), 24 + int(10 * math.sin(k)), c(255, 230, 160))
        t.contorno()
        folha.colar(t, k * R, 0)
    folha.salvar("ret_revisor")


# ================================================================ TILES 16x16
TILES = []  # (nome, Tela)


def tile(nome):
    t = Tela(16, 16)
    TILES.append((nome, t))
    return t


def gerar_tiles():
    # grama
    for k, nome in enumerate(["grama", "grama2", "grama3"]):
        t = tile(nome)
        t.ret(0, 0, 16, 16, c(98, 160, 72))
        ruido(t, 0, 0, 16, 16, [c(84, 142, 62), c(112, 176, 84)], 0.22, 10 + k)
        r = random.Random(20 + k)
        for _ in range(3):
            x, y = r.randrange(1, 15), r.randrange(2, 15)
            t.p(x, y, c(70, 126, 54)); t.p(x, y - 1, c(124, 188, 92))
    t = tile("grama_flor")
    t.ret(0, 0, 16, 16, c(98, 160, 72))
    ruido(t, 0, 0, 16, 16, [c(84, 142, 62), c(112, 176, 84)], 0.22, 33)
    for (x, y, cor) in [(3, 4, c(250, 250, 250)), (11, 3, c(250, 220, 80)), (7, 10, c(240, 130, 170)),
                        (13, 12, c(250, 250, 250)), (2, 13, c(250, 220, 80))]:
        t.p(x, y, cor); t.p(x + 1, y, cor); t.p(x, y + 1, cor); t.p(x + 1, y + 1, escurecer(cor))
    # rua de paralelepipedos
    for k, nome in enumerate(["rua", "rua2"]):
        t = tile(nome)
        t.ret(0, 0, 16, 16, c(84, 80, 90))
        r = random.Random(40 + k)
        for row in range(4):
            off = 0 if row % 2 == 0 else -4
            for col in range(3):
                x = off + col * 8
                y = row * 4
                base = r.choice([c(132, 128, 136), c(120, 116, 126), c(142, 136, 140)])
                t.ret(x + 1, y + 1, 6, 3, base)
                t.ret(x + 1, y + 1, 5, 1, clarear(base, 0.18))
                t.p(x + 6, y + 3, escurecer(base, 0.85))
        if k == 1:
            t.p(9, 6, c(98, 160, 72)); t.p(10, 6, c(84, 142, 62))
    # calcada de petit-pave (ondas pretas e brancas de Curitiba)
    for k, nome in enumerate(["calcada", "calcada2"]):
        t = tile(nome)
        t.ret(0, 0, 16, 16, c(150, 146, 140))
        for ty in range(0, 16, 2):
            for tx in range(0, 16, 2):
                onda = math.sin((tx + k * 16) / 16 * math.pi * 2) * 3 + 8
                preto = abs(ty - onda) < 2.2
                base = c(60, 56, 64) if preto else c(226, 220, 206)
                t.p(tx, ty, base)
                t.p(tx + 1, ty, base if (tx + ty) % 4 else escurecer(base, 0.92))
                t.p(tx, ty + 1, escurecer(base, 0.92))
    t = tile("praca")
    t.ret(0, 0, 16, 16, c(196, 186, 168))
    t.ret(0, 0, 16, 1, c(170, 160, 144)); t.ret(0, 0, 1, 16, c(170, 160, 144))
    t.ret(8, 0, 1, 16, c(176, 166, 150)); t.ret(0, 8, 16, 1, c(176, 166, 150))
    ruido(t, 1, 1, 15, 15, [c(206, 198, 180), c(186, 176, 160)], 0.1, 50)
    t = tile("terra")
    t.ret(0, 0, 16, 16, c(150, 108, 70))
    ruido(t, 0, 0, 16, 16, [c(132, 94, 60), c(166, 124, 84), c(120, 86, 58)], 0.25, 60)
    t = tile("areia")
    t.ret(0, 0, 16, 16, c(222, 196, 136))
    ruido(t, 0, 0, 16, 16, [c(206, 178, 120), c(236, 214, 160)], 0.25, 61)
    for k, nome in enumerate(["agua", "agua2"]):
        t = tile(nome)
        t.ret(0, 0, 16, 16, c(64, 120, 196))
        ruido(t, 0, 0, 16, 16, [c(56, 108, 184), c(74, 132, 206)], 0.2, 70 + k)
        for (x, y) in [(2 + k * 3, 3), (9 - k * 2, 9), (12, 5 + k * 4)]:
            t.ret(x, y, 3, 1, c(170, 210, 240))
    # pisos internos
    for k, nome in enumerate(["madeira", "madeira2"]):
        t = tile(nome)
        cores = [c(168, 116, 72), c(156, 106, 64), c(176, 124, 78), c(162, 110, 68)]
        for row in range(4):
            t.ret(0, row * 4, 16, 4, cores[(row + k) % 4])
            t.ret(0, row * 4 + 3, 16, 1, c(120, 80, 50))
            jx = (row * 7 + k * 5) % 16
            t.ret(jx, row * 4, 1, 3, c(130, 88, 56))
        ruido(t, 0, 0, 16, 16, [c(146, 98, 60)], 0.05, 80 + k)
    t = tile("tapete")
    t.ret(0, 0, 16, 16, c(150, 50, 56))
    ruido(t, 0, 0, 16, 16, [c(138, 44, 50), c(162, 60, 64)], 0.2, 90)
    t = tile("azulejo")
    for j in range(16):
        for i in range(16):
            t.p(i, j, c(230, 236, 240) if ((i // 8) + (j // 8)) % 2 == 0 else c(200, 220, 236))
    t.ret(0, 7, 16, 1, c(170, 180, 190)); t.ret(7, 0, 1, 16, c(170, 180, 190))
    t = tile("parede")
    t.ret(0, 0, 16, 16, c(214, 196, 160))
    for i in range(0, 16, 4):
        t.ret(i, 0, 1, 13, c(200, 180, 144))
    t.ret(0, 12, 16, 4, c(110, 74, 50)); t.ret(0, 12, 16, 1, c(140, 100, 70))
    t = tile("parede_topo")
    t.ret(0, 0, 16, 16, c(74, 56, 52))
    ruido(t, 0, 0, 16, 16, [c(66, 50, 46), c(84, 64, 58)], 0.15, 100)
    t = tile("parede_moderna")
    t.ret(0, 0, 16, 16, c(206, 214, 226))
    t.ret(0, 12, 16, 4, c(120, 130, 150)); t.ret(0, 12, 16, 1, c(150, 160, 180))
    t = tile("rocha")
    t.ret(0, 0, 16, 16, c(70, 66, 74))
    ruido(t, 0, 0, 16, 16, [c(60, 56, 64), c(84, 80, 88)], 0.3, 110)
    t.linha(2, 3, 6, 6, c(50, 46, 54)); t.linha(10, 9, 14, 12, c(50, 46, 54))
    t = tile("rocha_face")
    t.ret(0, 0, 16, 16, c(104, 98, 102))
    ruido(t, 0, 0, 16, 16, [c(92, 86, 92), c(118, 112, 116)], 0.3, 111)
    for (x, y, w) in [(1, 4, 6), (8, 9, 7), (3, 13, 5)]:
        t.ret(x, y, w, 1, c(76, 70, 78))
    t.ret(0, 15, 16, 1, c(60, 56, 64))
    t = tile("concreto")
    t.ret(0, 0, 16, 16, c(164, 164, 160))
    ruido(t, 0, 0, 16, 16, [c(150, 150, 148), c(176, 176, 170)], 0.18, 120)
    t.ret(0, 15, 16, 1, c(140, 140, 136)); t.ret(15, 0, 1, 16, c(140, 140, 136))
    t = tile("grade")
    t.ret(0, 0, 16, 16, c(70, 76, 86))
    for j in range(1, 16, 3):
        for i in range(1, 16, 3):
            t.ret(i, j, 2, 2, c(36, 40, 48))
    t = tile("vazio")
    t.ret(0, 0, 16, 16, c(12, 10, 18))
    t = tile("canteiro")
    t.ret(0, 0, 16, 16, c(110, 76, 48))
    ruido(t, 0, 0, 16, 16, [c(96, 66, 42), c(124, 88, 58)], 0.3, 130)
    t = tile("trilho")
    t.ret(0, 0, 16, 16, c(84, 80, 90))
    for x in range(0, 16, 4):
        t.ret(x, 2, 2, 12, c(110, 80, 56))
    t.ret(0, 4, 16, 2, c(170, 170, 180)); t.ret(0, 10, 16, 2, c(170, 170, 180))
    t.ret(0, 5, 16, 1, c(120, 120, 130)); t.ret(0, 11, 16, 1, c(120, 120, 130))

    cols = 8
    linhas = (len(TILES) + cols - 1) // cols
    atlas = Tela(cols * 16, linhas * 16)
    indice = {}
    for k, (nome, t) in enumerate(TILES):
        atlas.colar(t, (k % cols) * 16, (k // cols) * 16)
        indice[nome] = k
    atlas.salvar("tiles")
    return indice


# ================================================================ OBJETOS
OBJETOS = {}  # nome -> {"w","h","col":[x,y,w,h] (px, a partir do canto inferior esquerdo), "quadros"}


def objeto(nome, w, h, col=None, quadros=1):
    t = Tela(w * quadros, h)
    OBJETOS[nome] = {"w": w, "h": h, "col": col, "quadros": quadros}
    return t


def texto(t, x, y, s, cor, escala=1):
    f = ImageFont.truetype(FONTE_TTF, 8 * escala)
    tmp = Image.new("RGBA", (t.w, t.h), T)
    d = ImageDraw.Draw(tmp)
    d.fontmode = "1"
    d.text((x, y), s, font=f, fill=cor)
    t.img.alpha_composite(tmp)
    t.px = t.img.load()


def largura_texto(s):
    f = ImageFont.truetype(FONTE_TTF, 8)
    return int(f.getlength(s))


def gerar_objetos():
    # ---- natureza
    t = objeto("araucaria", 32, 64, [12, 0, 8, 6])
    tronco = c(110, 76, 52)
    t.ret(14, 20, 4, 44, tronco); t.ret(14, 20, 1, 44, c(130, 92, 64))
    verde = c(46, 104, 64); verde_c = c(70, 132, 80); verde_e = c(34, 80, 50)
    for (y, larg) in [(2, 14), (12, 22), (22, 28), (32, 30)]:
        t.ret(16 - larg // 2, y, larg, 5, verde)
        t.ret(16 - larg // 2 + 1, y, larg - 2, 2, verde_c)
        t.ret(16 - larg // 2, y + 4, larg, 1, verde_e)
        t.linha(16, y + 6, 16 - larg // 2 + 2, y + 2, tronco)
        t.linha(16, y + 6, 16 + larg // 2 - 2, y + 2, tronco)
    t.contorno()
    t.salvar("obj_araucaria")
    t = objeto("arvore", 32, 40, [12, 0, 8, 6])
    t.ret(13, 22, 6, 18, c(110, 76, 52)); t.ret(13, 22, 2, 18, c(130, 92, 64))
    for (cx, cy, r, cor) in [(16, 14, 13, c(60, 130, 70)), (10, 12, 7, c(76, 148, 82)), (20, 8, 7, c(76, 148, 82)),
                             (16, 18, 9, c(54, 118, 64))]:
        t.elipse(cx, cy, r, r * 0.85, cor)
    ruido(t, 4, 2, 24, 22, [c(90, 160, 90)], 0.05, 200)
    for j in range(40):
        for i in range(32):
            if t.get(i, j)[3] == 0:
                t.px[i, j] = T
    t.contorno()
    t.salvar("obj_arvore")
    t = objeto("arbusto", 16, 16, [1, 0, 14, 8])
    t.elipse(8, 9, 7, 6, c(64, 136, 72)); t.elipse(6, 7, 4, 3, c(84, 156, 88))
    t.contorno(); t.salvar("obj_arbusto")
    t = objeto("flores", 32, 16, [0, 0, 32, 8])
    t.ret(0, 6, 32, 10, c(110, 76, 48))
    r = random.Random(5)
    for _ in range(26):
        x, y = r.randrange(1, 31), r.randrange(4, 14)
        t.p(x, y, r.choice([c(240, 80, 100), c(250, 220, 80), c(250, 250, 250), c(200, 120, 220)]))
        t.p(x, y + 1, c(70, 140, 70))
    t.contorno(); t.salvar("obj_flores")
    t = objeto("chafariz", 48, 40, [2, 0, 44, 22])
    t.elipse(24, 28, 23, 11, c(170, 168, 164))
    t.elipse(24, 27, 20, 9, c(80, 140, 206))
    ruido(t, 6, 20, 36, 14, [c(150, 200, 240)], 0.06, 7)
    t.ret(21, 8, 6, 18, c(186, 184, 180)); t.elipse(24, 9, 7, 3, c(196, 194, 190))
    for k in range(5):
        t.p(24 - 6 + k * 3, 5 - (k % 2), c(170, 220, 255))
    t.contorno(); t.salvar("obj_chafariz")
    # ---- mobiliario urbano
    t = objeto("poste", 16, 40, [6, 0, 4, 4])
    t.ret(7, 6, 2, 34, c(40, 44, 52)); t.ret(5, 36, 6, 4, c(50, 54, 62))
    t.elipse(8, 5, 4, 4, c(250, 236, 170)); t.ret(5, 8, 6, 2, c(40, 44, 52))
    t.contorno(); t.salvar("obj_poste")
    t = objeto("banco", 32, 16, [0, 0, 32, 8])
    t.ret(1, 3, 30, 3, c(70, 120, 76)); t.ret(1, 7, 30, 3, c(80, 136, 86))
    t.ret(3, 10, 2, 6, c(50, 50, 56)); t.ret(27, 10, 2, 6, c(50, 50, 56))
    t.contorno(); t.salvar("obj_banco")
    t = objeto("placa", 16, 24, [6, 0, 4, 3])
    t.ret(7, 8, 2, 16, c(60, 60, 70)); t.ret(1, 2, 14, 8, c(40, 90, 150)); t.ret(2, 3, 12, 6, c(60, 120, 180))
    t.contorno(); t.salvar("obj_placa")
    t = objeto("banca", 32, 32, [0, 0, 32, 18])
    t.ret(1, 8, 30, 24, c(52, 112, 74)); t.ret(0, 4, 32, 6, c(40, 90, 60)); t.ret(0, 2, 32, 2, c(240, 220, 120))
    for x in range(3, 29, 5):
        t.ret(x, 13, 4, 6, r.choice([c(240, 240, 230), c(230, 200, 120), c(200, 220, 240)]))
    t.ret(4, 22, 24, 6, c(36, 70, 48))
    texto(t, 3, 1, "JORNAIS", c(40, 40, 40))
    t.contorno(); t.salvar("obj_banca")
    t = objeto("ponto_bonde", 32, 32, [0, 0, 32, 8])
    t.ret(2, 6, 2, 26, c(60, 60, 70)); t.ret(28, 6, 2, 26, c(60, 60, 70))
    t.ret(0, 2, 32, 6, c(150, 60, 50)); t.ret(0, 7, 32, 1, c(110, 44, 36))
    t.ret(4, 22, 24, 3, c(130, 90, 60))
    texto(t, 4, 0, "BONDE", c(250, 240, 220))
    t.contorno(); t.salvar("obj_ponto_bonde")
    for nome, cor in [("carro_preto", c(44, 42, 52)), ("carro_vinho", c(124, 40, 54)), ("carro_verde", c(52, 100, 70))]:
        t = objeto(nome, 32, 20, None)
        t.ret(2, 8, 28, 7, cor); t.ret(8, 2, 14, 7, cor)
        t.ret(10, 3, 5, 5, c(170, 210, 230)); t.ret(16, 3, 5, 5, c(170, 210, 230))
        t.ret(2, 8, 28, 1, clarear(cor, 0.3)); t.ret(27, 9, 3, 2, c(250, 240, 180))
        t.elipse(8, 16, 3.5, 3.5, c(30, 30, 34)); t.elipse(24, 16, 3.5, 3.5, c(30, 30, 34))
        t.p(8, 16, c(160, 160, 170)); t.p(24, 16, c(160, 160, 170))
        t.contorno(); t.salvar("obj_" + nome)
    # ---- obra
    t = objeto("andaime", 48, 48, [0, 0, 48, 10])
    madeira = c(150, 108, 64)
    for x in (2, 22, 42):
        t.ret(x, 0, 3, 48, madeira)
    for y in (6, 22, 38):
        t.ret(0, y, 48, 3, madeira)
    t.linha(4, 8, 22, 22, escurecer(madeira)); t.linha(24, 24, 42, 38, escurecer(madeira))
    t.contorno(); t.salvar("obj_andaime")
    t = objeto("tijolos", 16, 16, [0, 0, 16, 8])
    for row in range(3):
        for col in range(2):
            t.ret(1 + col * 7 + (row % 2) * 2, 4 + row * 4, 6, 3, c(176, 84, 60))
            t.ret(1 + col * 7 + (row % 2) * 2, 4 + row * 4, 6, 1, c(200, 110, 80))
    t.contorno(); t.salvar("obj_tijolos")
    t = objeto("monte_areia", 32, 16, [0, 0, 32, 8])
    t.elipse(16, 13, 15, 9, c(222, 196, 136)); t.elipse(13, 10, 7, 4, c(236, 214, 160))
    for j in range(16):
        for i in range(32):
            if j > 13:
                t.px[i, j] = T
    t.contorno(); t.salvar("obj_monte_areia")
    t = objeto("cerca", 16, 16, [0, 0, 16, 6])
    t.ret(0, 5, 16, 2, c(170, 130, 80)); t.ret(0, 10, 16, 2, c(170, 130, 80))
    t.ret(2, 2, 2, 14, c(150, 110, 66)); t.ret(12, 2, 2, 14, c(150, 110, 66))
    t.contorno(); t.salvar("obj_cerca")
    t = objeto("carrinho", 16, 16, [1, 0, 14, 6])
    t.ret(2, 6, 11, 5, c(110, 120, 130)); t.ret(3, 7, 9, 2, c(150, 110, 70))
    t.elipse(4, 12, 2.5, 2.5, c(30, 30, 34)); t.linha(12, 10, 15, 13, c(120, 90, 60))
    t.contorno(); t.salvar("obj_carrinho")
    t = objeto("caixa_obra", 16, 16, [0, 0, 16, 10])
    t.ret(1, 3, 14, 12, c(170, 124, 72)); t.moldura(1, 3, 14, 12, c(120, 84, 48))
    t.linha(1, 3, 14, 14, c(140, 100, 58))
    t.contorno(); t.salvar("obj_caixa_obra")
    # ---- predios
    gerar_ufpr()
    gerar_colegio()
    for nome, cor in [("casa_azul", c(150, 186, 214)), ("casa_rosa", c(226, 168, 170)),
                      ("casa_amarela", c(232, 208, 130)), ("casa_verde", c(160, 200, 160))]:
        gerar_casa(nome, cor)
    gerar_departamento()
    # ---- interiores
    t = objeto("estante", 32, 40, [0, 0, 32, 12])
    t.ret(0, 0, 32, 40, c(120, 80, 50)); t.ret(2, 2, 28, 36, c(84, 54, 34))
    r = random.Random(9)
    for prat in range(4):
        y = 3 + prat * 9
        x = 3
        while x < 29:
            w = r.choice([2, 2, 3])
            hgt = r.choice([6, 7, 7])
            t.ret(x, y + 8 - hgt, w, hgt, r.choice([c(170, 60, 60), c(60, 100, 170), c(200, 170, 70), c(70, 140, 90),
                                                    c(130, 80, 150), c(220, 210, 190)]))
            x += w + (1 if r.random() < 0.2 else 0)
        t.ret(2, y + 8, 28, 1, c(140, 96, 60))
    t.contorno(); t.salvar("obj_estante")
    t = objeto("mesa", 32, 24, [0, 0, 32, 12])
    t.ret(0, 4, 32, 12, c(150, 100, 60)); t.ret(0, 4, 32, 2, c(176, 124, 78))
    t.ret(2, 16, 3, 8, c(110, 72, 44)); t.ret(27, 16, 3, 8, c(110, 72, 44))
    t.ret(6, 6, 8, 5, c(240, 236, 220)); t.ret(18, 5, 6, 6, c(220, 200, 150))
    t.contorno(); t.salvar("obj_mesa")
    t = objeto("mesa_moderna", 32, 24, [0, 0, 32, 12])
    t.ret(0, 6, 32, 10, c(230, 232, 236)); t.ret(0, 6, 32, 2, c(250, 250, 252))
    t.ret(2, 16, 2, 8, c(90, 96, 110)); t.ret(28, 16, 2, 8, c(90, 96, 110))
    t.ret(9, 0, 14, 8, c(60, 64, 80)); t.ret(10, 1, 12, 6, c(110, 190, 220)); t.ret(8, 8, 16, 2, c(150, 156, 170))
    t.contorno(); t.salvar("obj_mesa_moderna")
    t = objeto("cadeira", 16, 16, [3, 0, 10, 6])
    t.ret(3, 2, 10, 6, c(130, 86, 52)); t.ret(3, 8, 10, 3, c(150, 100, 62))
    t.ret(3, 11, 2, 5, c(110, 72, 44)); t.ret(11, 11, 2, 5, c(110, 72, 44))
    t.contorno(); t.salvar("obj_cadeira")
    t = objeto("arquivo", 16, 32, [0, 0, 16, 10])
    t.ret(1, 2, 14, 30, c(110, 120, 110)); t.ret(1, 2, 14, 2, c(140, 150, 140))
    for y in (8, 16, 24):
        t.ret(2, y, 12, 6, c(96, 106, 96)); t.ret(6, y + 2, 4, 1, c(200, 200, 190))
    t.contorno(); t.salvar("obj_arquivo")
    t = objeto("caixas", 16, 16, [0, 0, 16, 10])
    t.ret(1, 6, 14, 10, c(184, 146, 96)); t.ret(3, 1, 10, 6, c(200, 164, 110))
    t.ret(1, 10, 14, 1, c(150, 116, 74)); t.ret(7, 1, 2, 6, c(240, 230, 200))
    t.contorno(); t.salvar("obj_caixas")
    t = objeto("caixa_antiga", 16, 16, [0, 0, 16, 10])
    t.ret(1, 4, 14, 11, c(120, 92, 64)); t.ret(1, 4, 14, 3, c(140, 110, 80))
    ruido(t, 1, 4, 14, 11, [c(170, 160, 150, 160)], 0.25, 77)
    t.ret(6, 8, 4, 3, c(200, 170, 90))
    t.contorno(); t.salvar("obj_caixa_antiga")
    t = objeto("quadro", 32, 24, None)
    t.ret(0, 0, 32, 20, c(130, 90, 56)); t.ret(2, 2, 28, 16, c(40, 74, 60))
    t.linha(5, 6, 14, 6, c(230, 230, 220)); t.linha(5, 10, 20, 10, c(230, 230, 220))
    t.linha(18, 14, 26, 5, c(230, 230, 220))
    t.contorno(); t.salvar("obj_quadro")
    t = objeto("janela", 32, 24, None)
    t.ret(0, 0, 32, 20, c(236, 232, 220)); t.ret(2, 2, 28, 16, c(150, 200, 236))
    t.ret(15, 2, 2, 16, c(236, 232, 220)); t.ret(2, 9, 28, 2, c(236, 232, 220))
    t.ret(4, 3, 6, 2, c(210, 236, 250))
    t.contorno(); t.salvar("obj_janela")
    t = objeto("vaso", 16, 24, [3, 0, 10, 6])
    t.ret(4, 15, 8, 9, c(180, 96, 64)); t.ret(3, 15, 10, 2, c(200, 116, 80))
    for (cx, cy) in [(8, 9), (5, 12), (11, 11), (8, 4)]:
        t.elipse(cx, cy, 3.5, 4, c(70, 140, 80))
    t.contorno(); t.salvar("obj_vaso")
    t = objeto("revisor", 16, 24, [1, 0, 14, 8], quadros=2)
    for q in range(2):
        ox = q * 16
        t.ret(ox + 3, 16, 10, 8, c(90, 70, 60)); t.ret(ox + 2, 15, 12, 2, c(120, 96, 80))
        t.elipse(ox + 8, 9, 6.5, 6.5, c(196, 150, 72))
        t.elipse(ox + 8, 9, 4.5, 4.5, c(30, 40, 70))
        t.elipse(ox + 8, 9, 2.5 + q, 2.5 + q, c(120, 230, 240) if q else c(80, 180, 210))
        t.p(ox + 8, 9, c(240, 255, 255))
        if q:
            for (dx, dy) in [(-7, 2), (7, 3), (0, -7), (-5, -5), (6, -4)]:
                t.p(ox + 8 + dx, 9 + dy, c(160, 250, 255))
    sub = Tela(16, 24)
    for q in range(2):
        s = Tela(16, 24)
        s.img.alpha_composite(t.img.crop((q * 16, 0, q * 16 + 16, 24)))
        s.px = s.img.load()
        s.contorno()
        t.img.paste(s.img, (q * 16, 0))
    t.px = t.img.load()
    t.salvar("obj_revisor")
    # ---- usina
    t = objeto("turbina", 32, 32, [0, 0, 32, 16], quadros=4)
    for q in range(4):
        ox = q * 32
        t.elipse(ox + 16, 18, 15, 13, c(70, 90, 110))
        t.elipse(ox + 16, 18, 12, 10, c(110, 130, 150))
        t.elipse(ox + 16, 18, 9, 7, c(40, 50, 64))
        for k in range(4):
            ang = q * math.pi / 8 + k * math.pi / 2
            t.linha(ox + 16, 18, ox + 16 + int(round(8 * math.cos(ang))), 18 + int(round(6 * math.sin(ang))),
                    c(200, 210, 220))
        t.elipse(ox + 16, 18, 2, 2, c(230, 190, 80))
        t.ret(ox + 4, 28, 24, 4, c(60, 66, 76))
    sheet = t.img.copy()
    for q in range(4):
        s = Tela(32, 32)
        s.img.alpha_composite(sheet.crop((q * 32, 0, q * 32 + 32, 32)))
        s.px = s.img.load()
        s.contorno()
        t.img.paste(s.img, (q * 32, 0))
    t.px = t.img.load()
    t.salvar("obj_turbina")
    t = objeto("gerador", 32, 40, [0, 0, 32, 16])
    t.ret(2, 8, 28, 30, c(196, 160, 60)); t.ret(2, 8, 28, 3, c(220, 190, 90))
    t.ret(6, 14, 20, 10, c(60, 60, 70)); t.ret(8, 16, 4, 2, c(120, 230, 120)); t.ret(14, 16, 4, 2, c(230, 80, 70))
    for y in range(26, 36, 3):
        t.ret(5, y, 22, 1, c(150, 120, 40))
    t.contorno(); t.salvar("obj_gerador")
    t = objeto("painel", 32, 32, [0, 0, 32, 14], quadros=2)
    for q in range(2):
        ox = q * 32
        t.ret(ox + 1, 6, 30, 26, c(80, 96, 110)); t.ret(ox + 1, 6, 30, 3, c(110, 126, 140))
        t.ret(ox + 4, 11, 24, 9, c(30, 40, 50))
        for k in range(5):
            on = (k + q) % 2 == 0
            t.ret(ox + 6 + k * 4, 13, 2, 2, c(120, 240, 140) if on else c(40, 90, 50))
        t.ret(ox + 6, 17, 20, 1, c(80, 200, 220))
        t.ret(ox + 5, 23, 6, 4, c(200, 60, 60)); t.ret(ox + 13, 23, 6, 4, c(220, 200, 80))
        t.ret(ox + 21, 23, 6, 4, c(60, 140, 220))
    sheet = t.img.copy()
    for q in range(2):
        s = Tela(32, 32)
        s.img.alpha_composite(sheet.crop((q * 32, 0, q * 32 + 32, 32)))
        s.px = s.img.load()
        s.contorno()
        t.img.paste(s.img, (q * 32, 0))
    t.px = t.img.load()
    t.salvar("obj_painel")
    t = objeto("cano_v", 16, 16, [4, 0, 8, 16])
    t.ret(4, 0, 8, 16, c(130, 140, 150)); t.ret(5, 0, 2, 16, c(170, 180, 190)); t.ret(3, 6, 10, 3, c(100, 110, 120))
    t.salvar("obj_cano_v")
    t = objeto("cano_h", 16, 16, [0, 4, 16, 8])
    t.ret(0, 4, 16, 8, c(130, 140, 150)); t.ret(0, 5, 16, 2, c(170, 180, 190)); t.ret(6, 3, 3, 10, c(100, 110, 120))
    t.salvar("obj_cano_h")
    t = objeto("lampada", 16, 16, None)
    t.elipse(8, 8, 6, 6, c(250, 230, 150, 90)); t.elipse(8, 8, 3, 3, c(255, 244, 190))
    t.ret(7, 1, 2, 4, c(60, 60, 70))
    t.salvar("obj_lampada")
    t = objeto("placa_perigo", 16, 16, None)
    t.ret(2, 2, 12, 12, c(240, 200, 40)); t.moldura(2, 2, 12, 12, c(40, 40, 40))
    t.linha(9, 4, 6, 8, c(40, 40, 40)); t.linha(6, 8, 10, 8, c(40, 40, 40)); t.linha(10, 8, 7, 12, c(40, 40, 40))
    t.contorno(); t.salvar("obj_placa_perigo")
    t = objeto("valvula", 16, 16, [2, 0, 12, 6])
    t.ret(6, 8, 4, 8, c(110, 120, 130))
    t.elipse(8, 6, 6, 5, c(200, 60, 50)); t.elipse(8, 6, 3, 2, T if False else c(160, 40, 36))
    t.contorno(); t.salvar("obj_valvula")
    t = objeto("mesa_projeto", 32, 24, [0, 0, 32, 12])
    t.ret(0, 4, 32, 12, c(150, 100, 60)); t.ret(2, 2, 22, 10, c(60, 110, 180))
    for k in range(4):
        t.linha(4 + k * 5, 4, 6 + k * 5, 10, c(200, 230, 255))
    t.ret(2, 16, 3, 8, c(110, 72, 44)); t.ret(27, 16, 3, 8, c(110, 72, 44))
    t.contorno(); t.salvar("obj_mesa_projeto")
    t = objeto("lousa_usina", 32, 24, None)
    t.ret(0, 0, 32, 20, c(60, 64, 72)); t.ret(2, 2, 28, 16, c(236, 236, 228))
    texto(t, 4, 3, "260 MW", c(40, 60, 120))
    t.linha(4, 14, 28, 14, c(200, 60, 60))
    t.contorno(); t.salvar("obj_lousa_usina")


def gerar_ufpr():
    w, h = 176, 128
    t = objeto("ufpr", w, h, [0, 0, w, 100])
    creme = c(240, 228, 196)
    creme_s = c(214, 198, 160)
    branco = c(250, 248, 240)
    # telhado/cobertura visto de cima
    t.ret(4, 30, w - 8, 18, c(170, 160, 150))
    t.ret(4, 30, w - 8, 2, c(196, 188, 178))
    # cupula central
    t.elipse(88, 26, 26, 20, c(120, 150, 150))
    t.elipse(84, 20, 14, 10, c(150, 180, 178))
    t.ret(84, 0, 8, 10, c(110, 140, 140)); t.ret(86, 0, 4, 3, c(200, 180, 90))
    t.ret(62, 30, 52, 8, c(214, 198, 160))
    # fachada
    t.ret(0, 46, w, 66, creme)
    t.ret(0, 46, w, 4, branco); t.ret(0, 56, w, 2, creme_s)
    # frontao triangular
    for k in range(18):
        t.ret(52 + k * 2, 38 - k // 2 + 10, w - 104 - k * 4, 1, branco)
    t.ret(52, 48, 72, 2, creme_s)
    # colunas
    for i in range(8):
        x = 52 + i * 10
        t.ret(x, 58, 6, 44, branco)
        t.ret(x + 4, 58, 2, 44, creme_s)
        t.ret(x - 1, 58, 8, 3, creme_s); t.ret(x - 1, 99, 8, 3, creme_s)
    # janelas laterais
    for lado in (0, 1):
        for i in range(4):
            x = 6 + i * 11 if lado == 0 else w - 50 + i * 11
            for y in (62, 84):
                t.ret(x, y, 7, 13, c(90, 110, 140)); t.ret(x, y, 7, 2, creme_s); t.ret(x + 3, y, 1, 13, creme_s)
    # porta
    t.ret(80, 72, 16, 30, c(110, 70, 44)); t.ret(87, 72, 2, 30, c(80, 50, 30))
    # escadaria
    for k in range(5):
        t.ret(40 - k * 3, 102 + k * 5, 96 + k * 6, 5, c(200 - k * 6, 196 - k * 6, 190 - k * 6))
        t.ret(40 - k * 3, 102 + k * 5, 96 + k * 6, 1, c(220, 216, 210))
    texto(t, 52, 50, "UNIVERSIDADE DO PARANÁ", c(90, 80, 70))
    t.contorno()
    t.salvar("obj_ufpr")


def gerar_colegio():
    w, h = 192, 96
    t = objeto("colegio", w, h, [0, 0, w, 72])
    t.ret(0, 0, w, 20, c(190, 190, 196)); t.ret(0, 0, w, 2, c(214, 214, 220))
    t.ret(0, 20, w, 70, c(244, 242, 236))
    for andar in range(3):
        y = 26 + andar * 18
        t.ret(4, y, w - 8, 10, c(70, 120, 170))
        for x in range(4, w - 4, 8):
            t.ret(x, y, 1, 10, c(230, 230, 230))
        t.ret(4, y + 1, w - 8, 1, c(140, 190, 230))
    t.ret(80, 74, 32, 16, c(120, 84, 56)); t.ret(95, 74, 2, 16, c(90, 60, 40))
    for x in range(0, w, 24):
        t.ret(x + 2, 76, 4, 14, c(220, 220, 220))
    t.ret(0, 88, w, 8, c(180, 176, 168))
    t.ret(186, 0, 2, 26, c(80, 80, 90)); t.ret(178, 2, 8, 5, c(60, 140, 80)); t.ret(178, 3, 8, 1, c(240, 210, 60))
    texto(t, 44, 8, "COLÉGIO ESTADUAL DO PARANÁ", c(70, 70, 80))
    t.contorno()
    t.salvar("obj_colegio")


def gerar_casa(nome, cor):
    w, h = 64, 72
    t = objeto(nome, w, h, [0, 0, w, 52])
    telha = c(170, 84, 60)
    t.ret(0, 4, w, 24, telha)
    for y in range(6, 28, 4):
        t.ret(0, y, w, 1, escurecer(telha, 0.82))
    t.ret(0, 4, w, 2, clarear(telha, 0.2))
    t.ret(26, 0, 6, 8, c(130, 70, 50))
    t.ret(2, 28, w - 4, 44, cor); t.ret(2, 28, w - 4, 2, clarear(cor, 0.3))
    t.ret(2, 48, w - 4, 2, escurecer(cor, 0.85))
    for x in (8, 42):
        t.ret(x, 33, 12, 12, c(80, 110, 140)); t.ret(x, 33, 12, 2, c(250, 248, 240)); t.ret(x + 5, 33, 2, 12, c(250, 248, 240))
        t.ret(x - 1, 45, 14, 2, c(250, 248, 240))
    t.ret(8, 54, 12, 12, c(80, 110, 140)); t.ret(13, 54, 2, 12, c(250, 248, 240))
    t.ret(40, 52, 14, 20, c(120, 76, 48)); t.ret(46, 52, 2, 20, c(90, 56, 34)); t.p(43, 62, c(230, 200, 90))
    t.contorno()
    t.salvar("obj_" + nome)


def gerar_departamento():
    w, h = 112, 80
    t = objeto("departamento", w, h, [0, 0, w, 58])
    t.ret(0, 0, w, 16, c(150, 140, 136)); t.ret(0, 0, w, 2, c(176, 168, 160))
    t.ret(0, 16, w, 64, c(200, 210, 200)); t.ret(0, 16, w, 3, c(230, 236, 230))
    for andar in range(2):
        for i in range(6):
            x = 6 + i * 17
            y = 24 + andar * 22
            if andar == 1 and i in (2, 3):
                continue
            t.ret(x, y, 10, 14, c(80, 110, 140)); t.ret(x + 4, y, 2, 14, c(230, 236, 230))
    t.ret(44, 48, 24, 32, c(110, 76, 50)); t.ret(55, 48, 2, 32, c(80, 56, 36))
    texto(t, 10, 6, "DEPARTAMENTO DE ÁGUAS", c(60, 60, 70))
    t.contorno()
    t.salvar("obj_departamento")


# ================================================================ ITENS 16x16
def gerar_itens():
    itens = {}

    def item(nome):
        t = Tela(16, 16)
        itens[nome] = t
        return t

    t = item("plantas")
    t.ret(2, 5, 12, 6, c(60, 110, 190)); t.ret(2, 5, 12, 1, c(110, 160, 230))
    t.elipse(2.5, 8, 2, 3, c(90, 140, 210)); t.elipse(13.5, 8, 2, 3, c(40, 90, 160))
    t.linha(5, 7, 10, 9, c(220, 240, 255))
    t = item("teodolito")
    t.ret(6, 2, 5, 4, c(196, 160, 60)); t.ret(10, 3, 3, 2, c(60, 60, 70)); t.ret(7, 6, 3, 2, c(80, 80, 90))
    t.linha(8, 8, 3, 15, c(130, 90, 56)); t.linha(8, 8, 13, 15, c(130, 90, 56)); t.linha(8, 8, 8, 15, c(110, 76, 46))
    t = item("marmita")
    t.ret(3, 5, 10, 9, c(190, 196, 204)); t.ret(3, 5, 10, 2, c(220, 226, 232)); t.ret(3, 9, 10, 1, c(150, 156, 166))
    t.linha(4, 4, 7, 2, c(120, 126, 136)); t.linha(8, 2, 11, 4, c(120, 126, 136))
    t = item("lanterna")
    t.ret(5, 4, 6, 9, c(250, 220, 120)); t.ret(4, 3, 8, 2, c(60, 60, 70)); t.ret(4, 13, 8, 2, c(60, 60, 70))
    t.ret(7, 1, 2, 2, c(60, 60, 70)); t.ret(7, 6, 2, 4, c(255, 250, 220))
    t = item("diploma")
    t.ret(2, 5, 12, 6, c(240, 232, 210)); t.elipse(2.5, 8, 2, 3, c(220, 210, 180)); t.elipse(13.5, 8, 2, 3, c(220, 210, 180))
    t.ret(7, 5, 2, 6, c(180, 40, 50)); t.ret(6, 10, 4, 3, c(180, 40, 50))
    t = item("livro")
    t.ret(3, 2, 10, 12, c(120, 50, 40)); t.ret(4, 3, 8, 10, c(150, 66, 52)); t.ret(3, 2, 2, 12, c(90, 36, 30))
    t.ret(6, 5, 5, 1, c(220, 190, 110))
    t = item("luvas")
    t.ret(3, 6, 5, 7, c(200, 160, 90)); t.ret(3, 3, 1, 4, c(200, 160, 90)); t.ret(5, 3, 1, 4, c(200, 160, 90))
    t.ret(8, 6, 5, 7, c(180, 140, 76)); t.ret(12, 3, 1, 4, c(180, 140, 76)); t.ret(10, 3, 1, 4, c(180, 140, 76))
    t = item("chave")
    t.linha(4, 12, 11, 5, c(160, 166, 176)); t.linha(5, 12, 12, 5, c(130, 136, 146))
    t.elipse(12, 4, 2.5, 2.5, c(160, 166, 176)); t.p(13, 3, T)
    t.elipse(4, 12, 2, 2, c(130, 136, 146))
    t = item("capacete")
    t.elipse(8, 9, 6, 5, c(240, 240, 236)); t.ret(1, 10, 14, 2, c(210, 210, 206)); t.ret(5, 5, 2, 2, c(255, 255, 255))
    for y in range(12, 16):
        for x in range(16):
            t.px[x, y] = T
    t = item("regua")
    t.ret(1, 6, 14, 4, c(230, 220, 190)); t.ret(5, 6, 4, 4, c(200, 220, 230))
    for x in range(2, 15, 2):
        t.p(x, 6, c(60, 60, 60))
    t = item("relatorio")
    t.ret(3, 2, 10, 12, c(240, 238, 230)); t.ret(3, 2, 10, 2, c(200, 160, 60))
    for y in range(6, 13, 2):
        t.ret(5, y, 6, 1, c(120, 120, 130))
    t = item("giz")
    t.ret(3, 6, 10, 7, c(70, 120, 180)); t.ret(4, 3, 2, 4, c(250, 250, 250)); t.ret(7, 3, 2, 4, c(250, 220, 220))
    t.ret(10, 3, 2, 4, c(250, 250, 200))
    for nome, t in itens.items():
        t.contorno()
        t.salvar("item_" + nome)
    return list(itens.keys())


# ================================================================ UI
def gerar_ui():
    t = Tela(24, 24)
    t.ret(0, 0, 24, 24, c(222, 210, 170)); t.ret(1, 1, 22, 22, c(150, 120, 80))
    t.ret(2, 2, 20, 20, c(28, 30, 60)); t.ret(3, 3, 18, 18, c(36, 40, 76))
    for (x, y) in [(0, 0), (23, 0), (0, 23), (23, 23)]:
        t.px[x, y] = T
    t.salvar("ui_painel")
    t = Tela(24, 24)
    t.ret(0, 0, 24, 24, c(120, 84, 50)); t.ret(1, 1, 22, 22, c(244, 236, 214)); t.ret(2, 2, 20, 20, c(250, 244, 226))
    for (x, y) in [(0, 0), (23, 0), (0, 23), (23, 23)]:
        t.px[x, y] = T
    t.salvar("ui_papel")
    t = Tela(24, 24)
    t.ret(0, 0, 24, 24, c(120, 230, 240)); t.ret(1, 1, 22, 22, c(40, 120, 150)); t.ret(2, 2, 20, 20, c(14, 30, 50, 230))
    for (x, y) in [(0, 0), (23, 0), (0, 23), (23, 23)]:
        t.px[x, y] = T
    t.salvar("ui_holograma")
    t = Tela(8, 8)
    t.carimbo(["#.......", "##......", "###.....", "####....", "###.....", "##......", "#......."],
              {"#": c(250, 230, 140)}, 1, 0)
    t.salvar("ui_cursor")
    t = Tela(8, 8)
    t.carimbo(["#######", ".#####.", "..###..", "...#..."], {"#": c(250, 230, 140)}, 0, 2)
    t.salvar("ui_seta")
    t = Tela(12, 14)
    t.ret(1, 0, 10, 10, c(250, 250, 250)); t.ret(0, 1, 12, 8, c(250, 250, 250))
    t.ret(4, 10, 3, 2, c(250, 250, 250)); t.ret(5, 12, 1, 1, c(250, 250, 250))
    t.ret(5, 2, 2, 4, c(220, 60, 60)); t.ret(5, 7, 2, 2, c(220, 60, 60))
    t.contorno(); t.salvar("ui_balao")
    t = Tela(12, 14)
    t.ret(1, 0, 10, 10, c(250, 250, 250)); t.ret(0, 1, 12, 8, c(250, 250, 250))
    t.ret(4, 10, 3, 2, c(250, 250, 250))
    for x in (3, 6, 9):
        t.ret(x - 1, 4, 2, 2, c(80, 80, 90))
    t.contorno(); t.salvar("ui_balao_fala")
    t = Tela(12, 6)
    t.elipse(6, 3, 6, 3, c(0, 0, 0, 70))
    t.salvar("ui_sombra")
    t = Tela(48, 24)
    for k in range(260):
        r = random.Random(k)
        x, y = 24 + r.gauss(0, 9), 12 + r.gauss(0, 4)
        t.p(int(x), int(y), c(200, 200, 210, 40))
    for (cx, cy, rx, ry) in [(16, 13, 12, 7), (30, 11, 14, 8), (24, 14, 18, 6)]:
        for j in range(24):
            for i in range(48):
                d = ((i - cx) / rx) ** 2 + ((j - cy) / ry) ** 2
                if d < 1:
                    a = int(70 * (1 - d))
                    b = t.px[i, j]
                    t.px[i, j] = (196, 196, 206, min(255, b[3] + a))
    t.salvar("ui_nevoa")
    t = Tela(4, 4)
    t.carimbo([".#..", "###.", ".#.."], {"#": c(255, 255, 255)}, 0, 0)
    t.salvar("ui_brilho")
    t = Tela(8, 8)
    t.carimbo(["..##..", ".####.", "######", "######", ".####.", "..##.."], {"#": c(255, 255, 255)}, 1, 1)
    t.salvar("ui_bola")
    # caderneta (fundo 320x180)
    t = Tela(320, 180)
    t.ret(0, 0, 320, 180, c(20, 16, 30))
    t.ret(6, 6, 308, 168, c(110, 66, 46)); t.ret(8, 8, 304, 164, c(130, 80, 56))
    for (x0, x1) in [(14, 156), (164, 306)]:
        t.ret(x0, 12, x1 - x0, 156, c(246, 238, 214))
        for y in range(28, 166, 10):
            t.ret(x0 + 4, y, x1 - x0 - 8, 1, c(206, 216, 230))
        t.ret(x0, 12, x1 - x0, 1, c(220, 210, 186))
    t.ret(x0 := 22, 12, 1, 156, c(236, 170, 170))
    t.ret(172, 12, 1, 156, c(236, 170, 170))
    for y in range(18, 168, 12):
        t.ret(155, y, 10, 4, c(170, 170, 180)); t.ret(155, y, 10, 1, c(220, 220, 230))
    t.salvar("ui_caderneta")
    # moldura de retrato
    t = Tela(52, 52)
    t.ret(0, 0, 52, 52, c(222, 210, 170)); t.ret(1, 1, 50, 50, c(150, 120, 80)); t.ret(2, 2, 48, 48, c(58, 66, 110))
    for j in range(2, 50):
        t.ret(2, j, 48, 1, c(58 + j // 3, 66 + j // 3, 110 + j // 4))
    t.salvar("ui_moldura")


# ================================================================ MINIGAME: TUBULACOES
def gerar_canos():
    """Pecas 24x24. Conexoes no estado sem rotacao (N=cima, L=direita, S=baixo, O=esquerda):
    reto=N,S  curva=N,L  te=N,L,S  cruz=N,L,S,O  fonte=S  turbina=N  ponta=N
    Linha 0: seca. Linha 1: com agua."""
    T = 24
    cores_cano = (c(150, 160, 172), c(108, 116, 128), c(190, 200, 210))
    cores_agua = (c(70, 156, 236), c(40, 104, 184), c(160, 216, 255))
    pecas = ["reto", "curva", "te", "cruz", "fonte", "turbina", "base", "bloqueio", "ponta"]
    folha = Tela(T * len(pecas), T * 2)
    m0, m1 = 8, 16  # o cano ocupa as colunas/linhas 8..15
    for linha, (cor, cor_e, cor_c) in enumerate([cores_cano, cores_agua]):
        for k, nome in enumerate(pecas):
            t = Tela(T, T)
            t.ret(0, 0, T, T, c(50, 56, 70)); t.moldura(0, 0, T, T, c(38, 42, 54))
            for (x, y) in [(2, 2), (T - 3, 2), (2, T - 3), (T - 3, T - 3)]:
                t.p(x, y, c(92, 98, 112))

            def braco(d):
                if d == "N":
                    t.ret(m0, 0, 8, m1, cor); t.ret(m0 + 1, 0, 2, m1, cor_c); t.ret(m0 + 7, 0, 1, m1, cor_e)
                    t.ret(m0 - 1, 1, 10, 2, cor_e)
                if d == "S":
                    t.ret(m0, m0, 8, T - m0, cor); t.ret(m0 + 1, m0, 2, T - m0, cor_c); t.ret(m0 + 7, m0, 1, T - m0, cor_e)
                    t.ret(m0 - 1, T - 3, 10, 2, cor_e)
                if d == "L":
                    t.ret(m0, m0, T - m0, 8, cor); t.ret(m0, m0 + 1, T - m0, 2, cor_c); t.ret(m0, m0 + 7, T - m0, 1, cor_e)
                    t.ret(T - 3, m0 - 1, 2, 10, cor_e)
                if d == "O":
                    t.ret(0, m0, m1, 8, cor); t.ret(0, m0 + 1, m1, 2, cor_c); t.ret(0, m0 + 7, m1, 1, cor_e)
                    t.ret(1, m0 - 1, 2, 10, cor_e)

            conex = {"reto": "NS", "curva": "NL", "te": "NLS", "cruz": "NLSO", "fonte": "S", "turbina": "N",
                     "base": "", "bloqueio": "", "ponta": "N"}[nome]
            for d in conex:
                braco(d)
            if conex:
                t.ret(m0, m0, 8, 8, cor); t.ret(m0 + 1, m0 + 1, 3, 3, cor_c)
            if nome == "fonte":
                t.elipse(12, 11, 9, 9, c(150, 160, 172)); t.elipse(12, 11, 7, 7, c(56, 116, 196))
                t.elipse(12, 11, 5, 5, c(96, 168, 240)); t.ret(9, 8, 3, 1, c(200, 230, 255))
            if nome == "turbina":
                t.elipse(12, 13, 9, 9, c(196, 160, 60)); t.elipse(12, 13, 7, 7, c(150, 116, 40))
                t.elipse(12, 13, 5, 5, c(30, 40, 50) if linha == 0 else c(250, 236, 140))
            if nome == "ponta":
                t.elipse(12, 12, 5.5, 5.5, c(196, 70, 60)); t.elipse(12, 12, 3, 3, c(150, 44, 40))
                t.ret(11, 7, 2, 10, c(220, 120, 100)); t.ret(7, 11, 10, 2, c(220, 120, 100))
            if nome == "bloqueio":
                t.ret(2, 2, T - 4, T - 4, c(96, 90, 96))
                ruido(t, 2, 2, T - 4, T - 4, [c(80, 76, 82), c(112, 106, 112)], 0.35, 3)
                t.linha(5, 6, 10, 10, c(70, 66, 72)); t.linha(14, 15, 19, 18, c(70, 66, 72))
            folha.colar(t, k * T, linha * T)
    folha.salvar("mini_canos")
    # sobreposicao de peca travada: parafusos nos cantos e um cadeado
    t = Tela(T, T)
    for (x, y) in [(1, 1), (T - 5, 1), (1, T - 5), (T - 5, T - 5)]:
        t.ret(x, y, 4, 4, c(214, 140, 60)); t.ret(x + 1, y + 1, 2, 2, c(150, 90, 36))
    t.ret(17, 14, 6, 5, c(230, 196, 80)); t.moldura(18, 11, 4, 4, c(230, 196, 80)); t.p(20, 16, c(80, 60, 20))
    t.contorno()
    t.salvar("mini_trava")


# ================================================================ MATERIAIS
def gerar_materiais():
    icones = {}

    def icone(nome):
        t = Tela(16, 16)
        icones[nome] = t
        return t

    t = icone("ferro")
    t.ret(2, 8, 7, 4, c(120, 124, 132)); t.ret(2, 8, 7, 1, c(170, 174, 182))
    t.ret(7, 4, 6, 3, c(140, 120, 110)); t.ret(7, 4, 6, 1, c(180, 150, 130))
    t.ret(9, 10, 5, 4, c(100, 104, 112)); t.p(4, 10, c(170, 110, 70)); t.p(11, 5, c(170, 110, 70))
    t = icone("cobre")
    t.elipse(8, 8, 6, 6, c(196, 110, 60)); t.elipse(8, 8, 4, 4, c(150, 76, 40)); t.elipse(8, 8, 2, 2, c(90, 60, 40))
    for k in range(3):
        t.linha(3 + k * 3, 4, 3 + k * 3, 12, c(230, 150, 90))
    t = icone("borracha")
    t.elipse(8, 9, 6.5, 4.5, c(40, 40, 46)); t.elipse(8, 9, 3.5, 2, c(0, 0, 0, 0))
    for j in range(16):
        for i in range(16):
            if ((i + 0.5 - 8) / 3.5) ** 2 + ((j + 0.5 - 9) / 2) ** 2 <= 1:
                t.px[i, j] = T
    t.ret(5, 5, 6, 1, c(80, 80, 90))
    t = icone("parafuso")
    for (x, y) in [(3, 3), (9, 6)]:
        t.ret(x, y, 5, 2, c(190, 194, 200)); t.ret(x + 1, y + 2, 3, 6, c(150, 154, 162))
        for k in range(3):
            t.p(x + 1, y + 3 + k * 2, c(110, 114, 122))
    t = icone("valvula")
    t.ret(7, 9, 2, 6, c(120, 126, 136))
    t.elipse(8, 7, 6, 6, c(200, 60, 50)); t.elipse(8, 7, 3.5, 3.5, c(140, 36, 30)); t.elipse(8, 7, 1.5, 1.5, c(220, 200, 90))
    t.linha(3, 7, 13, 7, c(230, 100, 90)); t.linha(8, 2, 8, 12, c(230, 100, 90))
    t = icone("cabo")
    t.elipse(7, 8, 5.5, 5.5, c(60, 120, 70)); t.elipse(7, 8, 3, 3, c(40, 80, 50)); t.elipse(7, 8, 1.5, 1.5, c(196, 110, 60))
    t.ret(11, 11, 4, 3, c(60, 60, 70)); t.ret(14, 12, 2, 1, c(196, 160, 60))
    t = icone("manometro")
    t.ret(7, 12, 2, 4, c(196, 160, 60))
    t.elipse(8, 7, 6.5, 6.5, c(196, 160, 60)); t.elipse(8, 7, 5, 5, c(240, 238, 228))
    t.linha(8, 7, 11, 4, c(200, 50, 40)); t.p(5, 4, c(60, 60, 60)); t.p(11, 10, c(60, 60, 60)); t.p(4, 8, c(60, 60, 60))
    for nome, t in icones.items():
        t.contorno()
        t.salvar("mat_" + nome)

    # pontos de coleta no mundo
    t = objeto("sucata", 16, 16, [1, 0, 14, 7])
    t.ret(1, 9, 14, 6, c(110, 114, 122)); t.ret(3, 6, 9, 4, c(140, 120, 110)); t.ret(5, 3, 5, 4, c(124, 128, 136))
    t.ret(1, 9, 14, 1, c(160, 164, 172)); t.p(8, 7, c(176, 110, 70)); t.p(4, 12, c(176, 110, 70))
    t.contorno(); t.salvar("obj_sucata")
    t = objeto("bobina", 16, 16, [1, 0, 14, 7])
    t.ret(2, 2, 12, 13, c(150, 110, 70)); t.ret(2, 2, 12, 2, c(120, 86, 54)); t.ret(2, 13, 12, 2, c(120, 86, 54))
    for y in range(5, 13, 2):
        t.ret(3, y, 10, 1, c(206, 120, 66)); t.ret(3, y + 1, 10, 1, c(176, 96, 52))
    t.contorno(); t.salvar("obj_bobina")
    t = objeto("pneus", 16, 16, [1, 0, 14, 7])
    for (cx, cy) in [(8, 12), (8, 8), (8, 4)]:
        t.elipse(cx, cy, 6.5, 3, c(44, 44, 50)); t.elipse(cx, cy, 3, 1.3, c(80, 80, 88))
    t.contorno(); t.salvar("obj_pneus")
    t = objeto("caixa_parafusos", 16, 16, [0, 0, 16, 8])
    t.ret(1, 6, 14, 9, c(160, 116, 70)); t.ret(1, 6, 14, 2, c(184, 140, 90)); t.moldura(1, 6, 14, 9, c(120, 84, 48))
    for (x, y) in [(3, 4), (6, 3), (9, 4), (12, 3), (5, 5), (10, 5)]:
        t.ret(x, y, 2, 2, c(196, 200, 206))
    t.contorno(); t.salvar("obj_caixa_parafusos")
    t = objeto("bancada", 32, 24, [0, 0, 32, 12])
    t.ret(0, 6, 32, 9, c(140, 96, 58)); t.ret(0, 6, 32, 2, c(170, 122, 78))
    t.ret(2, 15, 3, 9, c(100, 66, 40)); t.ret(27, 15, 3, 9, c(100, 66, 40)); t.ret(2, 19, 28, 2, c(100, 66, 40))
    t.ret(3, 1, 7, 6, c(90, 96, 110)); t.ret(5, 0, 3, 2, c(120, 126, 140))
    t.linha(14, 4, 20, 2, c(150, 156, 166)); t.ret(19, 1, 3, 3, c(150, 156, 166))
    t.ret(24, 3, 5, 3, c(200, 60, 50)); t.ret(25, 2, 3, 1, c(200, 60, 50))
    t.contorno(); t.salvar("obj_bancada")
    t = objeto("porta_comando", 16, 32, [0, 0, 16, 16])
    t.ret(0, 4, 16, 28, c(96, 104, 116)); t.moldura(0, 4, 16, 28, c(60, 66, 76))
    t.ret(2, 6, 12, 24, c(116, 124, 136))
    for y in (8, 16, 24):
        t.ret(2, y, 12, 1, c(80, 86, 98))
    t.elipse(8, 18, 4, 4, c(200, 60, 50)); t.elipse(8, 18, 2, 2, c(130, 36, 30))
    t.ret(3, 0, 10, 5, c(240, 200, 40)); t.linha(3, 0, 7, 4, c(40, 40, 40)); t.linha(8, 0, 12, 4, c(40, 40, 40))
    t.contorno(); t.salvar("obj_porta_comando")


# ================================================================ FONTE BITMAP
def gerar_fonte():
    chars = [chr(i) for i in range(32, 127)]
    chars += list("ÀÁÂÃÄÇÉÊÈÍÎÓÔÕÖÚÛÜàáâãäçéêèíîóôõöúûüñÑ°ºª«»—–…“”‘’•·×")
    f = ImageFont.truetype(FONTE_TTF, 8)
    ascent, descent = f.getmetrics()
    altura = ascent + descent + 1
    cols = 16
    cel_w = 10
    linhas = (len(chars) + cols - 1) // cols
    atlas = Image.new("RGBA", (cols * cel_w, linhas * altura), T)
    d = ImageDraw.Draw(atlas)
    d.fontmode = "1"
    meta = {"altura": altura, "base": ascent, "glifos": []}
    cmap = None
    try:
        from fontTools.ttLib import TTFont
        cmap = TTFont(FONTE_TTF).getBestCmap()
    except Exception:
        pass
    for k, ch in enumerate(chars):
        if cmap is not None and ord(ch) not in cmap and ch != " ":
            continue
        x = (k % cols) * cel_w
        y = (k // cols) * altura
        d.text((x, y + ascent), ch, font=f, fill=(255, 255, 255, 255), anchor="ls")
        adv = int(round(f.getlength(ch)))
        meta["glifos"].append({"c": ord(ch), "x": x, "y": y, "w": min(cel_w, max(adv, 1)), "a": adv})
    atlas.save(os.path.join(SAIDA, "fonte.png"))
    with open(os.path.join(DADOS, "fonte.json"), "w", encoding="utf-8") as fp:
        json.dump(meta, fp, ensure_ascii=False)


# ================================================================ PRINCIPAL
def main():
    # Protagonista: pele levemente parda, cabelo castanho escuro medio, oculos.
    personagem("protagonista", "parda_clara", cabelo="medio", cor_cabelo="castanho_escuro", topo="roxo",
               baixo="jeans", sapato=c(236, 236, 240), oculos=True, mochila=ROUPAS["teal"])
    personagem("enedina", "escura", cabelo="crespo", cor_cabelo="preto", topo="marinho", baixo="cinza_escuro",
               saia=True, gola=True, sapato=c(40, 32, 32))
    personagem("enedina_obra", "escura", cabelo="crespo", cor_cabelo="preto", chapeu="capacete",
               cor_chapeu="branco", topo="caqui", baixo="caqui", sapato=c(90, 60, 40), alcas=True)
    personagem("coordenadora", "clara", cabelo="coque", cor_cabelo="grisalho", topo="vinho", baixo="preto",
               oculos=True)
    personagem("professor", "clara", cabelo="curto", cor_cabelo="grisalho", topo="cinza", baixo="cinza",
               oculos=True, bigode=True, gola=True)
    personagem("zelador", "media", cabelo="curto", cor_cabelo="preto", chapeu="bone", cor_chapeu="azul_operario",
               topo="caqui", baixo="marrom")
    personagem("ze", "media", cabelo="curto", cor_cabelo="preto", chapeu="bone", cor_chapeu="vermelho",
               topo="azul_operario", baixo="azul_operario", alcas=True)
    personagem("bento", "escura", cabelo="curto", cor_cabelo="preto", chapeu="chapeu", cor_chapeu="bege",
               topo="branco", baixo="marrom", alcas=True)
    personagem("antonio", "clara", cabelo="curto", cor_cabelo="castanho", chapeu="capacete", cor_chapeu="amarelo",
               topo="caqui", baixo="marrom", bigode=True)
    personagem("morador", "clara", cabelo="curto", cor_cabelo="castanho", chapeu="chapeu", cor_chapeu="cinza",
               topo="marrom", baixo="marrom", gola=True)
    personagem("moradora", "media", cabelo="coque", cor_cabelo="castanho", topo="vermelho", baixo="vermelho",
               saia=True)
    personagem("moradora2", "escura", cabelo="medio", cor_cabelo="preto", topo="verde", baixo="verde", saia=True)
    personagem("jornaleiro", "parda_clara", cabelo="curto", cor_cabelo="preto", chapeu="bone", cor_chapeu="cinza",
               topo="branco", baixo="marrom")
    personagem("estudante", "clara", cabelo="curto", cor_cabelo="ruivo", topo="branco", baixo="cinza", gola=True)
    personagem("operario_usina", "media", cabelo="curto", cor_cabelo="preto", chapeu="capacete",
               cor_chapeu="amarelo", topo="azul_operario", baixo="azul_operario", alcas=True)
    personagem("operaria_usina", "escura", cabelo="crespo", cor_cabelo="preto", chapeu="capacete",
               cor_chapeu="amarelo", topo="azul_operario", baixo="azul_operario", alcas=True)

    retrato("protagonista", "parda_clara", cabelo="medio", cor_cabelo="castanho_escuro", topo="roxo",
            gola="branco", oculos=True)
    retrato("enedina", "escura", cabelo="crespo", cor_cabelo="preto", topo="marinho", gola="branco")
    retrato("enedina_obra", "escura", cabelo="crespo", cor_cabelo="preto", topo="caqui", chapeu="capacete",
            cor_chapeu="branco")
    retrato("coordenadora", "clara", cabelo="coque", cor_cabelo="grisalho", topo="vinho", gola="branco",
            oculos=True, rugas=True)
    retrato("professor", "clara", cabelo="curto", cor_cabelo="grisalho", topo="cinza", gola="branco", oculos=True,
            bigode=True, rugas=True)
    retrato("zelador", "media", cabelo="curto", cor_cabelo="preto", topo="caqui", chapeu="bone",
            cor_chapeu="azul_operario")
    retrato("ze", "media", cabelo="curto", cor_cabelo="preto", topo="azul_operario", chapeu="bone",
            cor_chapeu="vermelho")
    retrato("bento", "escura", cabelo="curto", cor_cabelo="preto", topo="branco", chapeu="chapeu",
            cor_chapeu="bege")
    retrato("antonio", "clara", cabelo="curto", cor_cabelo="castanho", topo="caqui", chapeu="capacete",
            cor_chapeu="amarelo", bigode=True, rugas=True)
    retrato("jornaleiro", "parda_clara", cabelo="curto", cor_cabelo="preto", topo="branco", chapeu="bone",
            cor_chapeu="cinza")
    retrato_revisor()

    indice = gerar_tiles()
    gerar_objetos()
    itens = gerar_itens()
    gerar_ui()
    gerar_canos()
    gerar_materiais()
    gerar_fonte()
    arquivos = sorted(f[:-4] for f in os.listdir(SAIDA) if f.endswith(".png"))
    meta = {"tiles": indice, "tiles_colunas": 8, "objetos": OBJETOS, "itens": itens, "emocoes": EMOCOES,
            "arquivos": arquivos}
    with open(os.path.join(DADOS, "arte.json"), "w", encoding="utf-8") as fp:
        json.dump(meta, fp, ensure_ascii=False, indent=1)
    print("Arte gerada em", SAIDA)


if __name__ == "__main__":
    main()
