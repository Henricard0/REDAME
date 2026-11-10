# -*- coding: utf-8 -*-
"""
REDAME - arte da versao isometrica.

Chamado por gerar_arte.py no fim da geracao. Cria:
  - personagens mais altos (20x34 por quadro) com trajes por epoca;
  - retratos da protagonista para cada traje;
  - chao em losangos 32x16, blocos de parede/rocha e predios em blocos;
  - objetos desenhados como caixas isometricas.
"""
import json
import math
import os
import random

import gerar_arte as ga
from gerar_arte import Tela, c, escurecer, clarear, ruido, T, CONTORNO

PW, PH = 20, 34  # quadro de personagem

ISO = {}  # metadados dos objetos isometricos -> dados/arte.json ("iso")
ISO_CHAO = {}  # chao e blocos isometricos -> dados/arte.json ("iso_chao")


# ===================================================================== PERSONAGENS
def _sombreado(cor):
    return escurecer(cor, 0.8), clarear(cor, 0.18)


def pessoa(nome, pele, cabelo="curto", cor_cabelo="preto", topo="branco", calca="jeans", saia=None,
           casaco=None, avental=None, calcado=("sapato", c(52, 40, 38)), luvas=None, chapeu=None,
           cor_chapeu="cinza", oculos=False, goggles=None, bigode=False, gola=None):
    """Desenha uma folha 3x3 (parado, passo A, passo B) x (frente, costas, lado direito)."""
    cp = ga.PELES[pele]
    cp_e = escurecer(cp, 0.82)
    ch = ga.CABELOS[cor_cabelo] if isinstance(cor_cabelo, str) else cor_cabelo
    ch_e, ch_c = escurecer(ch, 0.72), clarear(ch, 0.25)
    ct = ga.ROUPAS[topo] if isinstance(topo, str) else topo
    ct_e, ct_c = _sombreado(ct)
    cc = ga.ROUPAS[calca] if isinstance(calca, str) else calca
    cc_e, _ = _sombreado(cc)
    folha = Tela(PW * 3, PH * 3)
    for linha, direcao in enumerate(["frente", "costas", "lado"]):
        for q in range(3):
            t = Tela(PW, PH)
            if direcao == "lado":
                _lado(t, q, cp, cp_e, ch, ch_e, ch_c, ct, ct_e, ct_c, cc, cc_e, cabelo, saia, casaco, avental, calcado,
                      luvas, chapeu, cor_chapeu, oculos, goggles, bigode)
            else:
                _frente(t, q, direcao == "costas", cp, cp_e, ch, ch_e, ch_c, ct, ct_e, ct_c, cc, cc_e, cabelo, saia,
                        casaco, avental, calcado, luvas, chapeu, cor_chapeu, oculos, goggles, bigode, gola)
            t.contorno()
            folha.colar(t, q * PW, linha * PH)
    folha.salvar("pers_" + nome)


def _cabelo_atras(t, estilo, ch, ch_e, costas, lado=False):
    cx = 8.5 if lado else 9.5
    if estilo == "cacheado":
        t.elipse(cx, 6, 6.2, 5.6, ch)
        for (x, y) in ([(3.5, 10), (4, 14), (15.5, 10), (15, 14)] if not lado else [(4, 10), (4.5, 14), (6, 16)]):
            t.elipse(x, y, 2.4, 2.6, ch)
        if costas:
            t.elipse(9.5, 13, 5.5, 4.5, ch)
            for x in range(5, 15, 2):
                t.p(x, 17, ch_e)
    elif estilo == "crespo":
        t.elipse(cx, 5, 6.8, 5.6, ch)
    elif estilo == "chanel":
        t.elipse(cx, 6, 5.2, 5.0, ch)
        if not lado:
            t.ret(4, 6, 3, 6, ch); t.ret(13, 6, 3, 6, ch)
        else:
            t.ret(5, 6, 4, 6, ch)
    elif estilo in ("curto", "coque", "preso"):
        t.elipse(cx, 5.5, 4.6, 4.4, ch)
        if estilo == "coque":
            t.elipse(cx, 1.5, 2.2, 1.8, ch)
        if estilo == "preso" and (costas or lado):
            t.elipse(cx - (3 if lado else 0), 8 if lado else 9, 2, 2, ch)


def _cabelo_frente(t, estilo, ch, ch_e, ch_c):
    if estilo == "cacheado":
        for x in range(5, 15):
            alt = 4 + (1 if x in (5, 6, 13, 14) else 0) + (1 if x in (5, 14) else 0)
            for y in range(1, alt):
                t.p(x, y, ch)
        for (x, y) in [(5, 6), (14, 6), (5, 7), (14, 7), (6, 4), (13, 4)]:
            t.p(x, y, ch)
        for (x, y) in [(7, 2), (9, 1), (11, 2), (4, 9), (15, 9), (4, 13), (15, 12)]:
            t.p(x, y, ch_c)
        for (x, y) in [(8, 3), (12, 3), (6, 5)]:
            t.p(x, y, ch_e)
    elif estilo == "crespo":
        for x in range(4, 16):
            for y in range(0, 4 if 6 <= x <= 13 else 6):
                if t.get(x, y)[3]:
                    t.p(x, y, ch)
        for (x, y) in [(6, 1), (10, 0), (13, 2), (4, 3), (15, 4)]:
            t.p(x, y, ch_c)
    elif estilo == "chanel":
        t.ret(6, 2, 8, 3, ch); t.ret(5, 4, 2, 6, ch); t.ret(13, 4, 2, 6, ch)
        t.ret(7, 2, 3, 1, ch_c)
    elif estilo in ("curto", "coque", "preso"):
        t.ret(6, 2, 8, 2, ch); t.p(6, 4, ch); t.p(13, 4, ch)
        t.ret(7, 2, 3, 1, ch_c)


def _chapeu(t, chapeu, cor, lado=False, costas=False):
    if not chapeu:
        return
    x_e, x_c = escurecer(cor, 0.72), clarear(cor, 0.3)
    cx = 10.5 if lado else 9.5
    if chapeu == "capacete":
        t.elipse(cx, 3.2, 5, 3.2, cor)
        t.ret(int(cx - 6), 5, 13, 1, x_e)
        t.ret(int(cx - 2), 1, 2, 1, x_c)
    elif chapeu == "bone":
        t.elipse(cx, 3, 4.6, 2.6, cor)
        if lado:
            t.ret(12, 4, 5, 1, x_e)
        elif not costas:
            t.ret(5, 4, 10, 1, x_e)
    elif chapeu == "chapeu":
        t.ret(int(cx - 4), 0, 8, 4, cor); t.ret(int(cx - 4), 3, 8, 1, x_e)
        t.ret(int(cx - 6), 4, 13, 1, cor)
    elif chapeu == "bandana":
        t.elipse(cx, 2.6, 5, 2.4, cor)
        t.ret(int(cx - 5), 3, 11, 2, cor)
        for (x, y) in [(int(cx - 3), 2), (int(cx + 1), 3), (int(cx + 3), 1)]:
            t.p(x, y, c(250, 240, 230))
        kx = int(cx + 4) if not lado else int(cx - 5)
        t.p(kx, 1, x_e); t.p(kx + 1, 0, cor); t.p(kx + 1, 2, cor)


def _frente(t, q, costas, cp, cp_e, ch, ch_e, ch_c, ct, ct_e, ct_c, cc, cc_e, cabelo, saia, casaco, avental,
            calcado, luvas, chapeu, cor_chapeu, oculos, goggles, bigode, gola):
    _cabelo_atras(t, cabelo, ch, ch_e, costas)
    # pernas e calcados
    pe_e = 1 if q == 1 else 0
    pe_d = 1 if q == 2 else 0
    tipo_calc, cor_calc = calcado
    perna = cc if not saia else cp
    for (x0, sobe) in [(6, pe_e), (11, pe_d)]:
        t.ret(x0, 23, 3, 8 - sobe, perna)
        t.ret(x0 + 2, 23, 1, 8 - sobe, escurecer(perna, 0.85))
        topo_calc = 31 - sobe - (3 if tipo_calc == "bota" else 0)
        t.ret(x0, topo_calc, 3, 33 - sobe - topo_calc, cor_calc)
        t.ret(x0, 32 - sobe, 3, 1, escurecer(cor_calc, 0.7))
    t.ret(6, 21, 8, 3, cc if not saia else (ga.ROUPAS[saia] if isinstance(saia, str) else saia))
    if saia:
        cs = ga.ROUPAS[saia] if isinstance(saia, str) else saia
        for j, y in enumerate(range(21, 28)):
            w = 8 + (j // 2) * 2
            t.ret(10 - w // 2, y, w, 1, cs if j < 6 else escurecer(cs, 0.8))
    # tronco
    t.ret(6, 12, 8, 10, ct)
    t.ret(13, 13, 1, 9, ct_e)
    t.ret(6, 13, 1, 8, ct_c)
    if gola and not costas:
        cg = ga.ROUPAS[gola]
        t.ret(8, 12, 4, 1, cg); t.p(9, 13, cg); t.p(10, 13, cg)
    # avental
    if avental and not costas:
        ca = avental
        t.p(7, 12, ca); t.p(12, 12, ca); t.p(7, 13, ca); t.p(12, 13, ca)
        t.ret(7, 14, 6, 6, ca); t.ret(7, 14, 6, 1, clarear(ca, 0.2))
        for j, y in enumerate(range(20, 28)):
            t.ret(6 - (j > 3), y, 8 + 2 * (j > 3), 1, ca if j < 7 else escurecer(ca, 0.75))
        t.ret(9, 21, 2, 2, escurecer(ca, 0.8))
    # casaco
    if casaco:
        cca = casaco["cor"]
        cca_e, cca_c = _sombreado(cca)
        comp = 28 if casaco.get("comprimento", "longo") == "longo" else 23
        t.ret(5, 12, 10, 10, cca)
        for j, y in enumerate(range(22, comp)):
            w = 10 + (1 if j > 2 else 0) * 2
            t.ret(10 - w // 2, y, w, 1, cca if y < comp - 1 else cca_e)
        t.ret(14, 13, 1, comp - 13, cca_e)
        t.ret(5, 13, 1, comp - 14, cca_c)
        if not costas and casaco.get("aberto", True):
            t.ret(9, 14, 2, comp - 14, ct if not avental else avental)
            t.p(8, 12, cca_c); t.p(11, 12, cca_c); t.p(8, 13, cca_c); t.p(11, 13, cca_c)
        if casaco.get("cinto"):
            t.ret(5, 20, 10, 1, casaco["cinto"])
        if costas:
            t.ret(9, 21, 1, comp - 21, cca_e)
    # bracos (manga) e maos
    cm = casaco["cor"] if casaco else ct
    for (x0, swing) in [(4, 1 if q == 2 else 0), (14, 1 if q == 1 else 0)]:
        t.ret(x0, 13 + swing, 2, 8, cm)
        t.ret(x0, 13 + swing, 1, 8, escurecer(cm, 0.88))
        t.ret(x0, 21 + swing, 2, 2, luvas or cp)
    # pescoco e cabeca
    t.ret(9, 11, 2, 2, cp_e)
    t.elipse(9.5, 7, 3.9, 4.4, cp)
    t.ret(13, 7, 1, 3, cp_e)
    if not costas:
        t.p(8, 7, c(30, 24, 30)); t.p(11, 7, c(30, 24, 30))
        t.p(9, 9, escurecer(cp, 0.7)); t.p(10, 9, escurecer(cp, 0.7))
        t.p(7, 8, clarear(c(230, 120, 120), 0.1) if cp[0] > 150 else escurecer(cp, 0.92))
        if bigode:
            t.ret(8, 9, 4, 1, ch_e)
        _cabelo_frente(t, cabelo, ch, ch_e, ch_c)
        if oculos:
            arm = c(46, 36, 46)
            lente = c(196, 226, 246)
            for x in (7, 8, 11, 12):
                t.p(x, 6, arm)
            t.p(6, 7, arm); t.p(13, 7, arm); t.p(9, 7, arm); t.p(10, 7, arm)
            t.p(7, 7, lente); t.p(12, 7, lente)
            t.p(7, 8, arm); t.p(8, 8, arm); t.p(11, 8, arm); t.p(12, 8, arm)
        if goggles:
            g_e = escurecer(goggles, 0.6)
            t.ret(5, 6, 10, 1, c(60, 46, 36))
            t.ret(6, 6, 3, 3, g_e); t.ret(11, 6, 3, 3, g_e)
            t.ret(7, 7, 2, 1, goggles); t.ret(12, 7, 2, 1, goggles); t.p(7, 7, clarear(goggles, 0.5))
    else:
        t.elipse(9.5, 6.5, 4.3, 4.6, ch)
        if cabelo == "cacheado":
            for (x, y) in [(6, 3), (12, 4), (8, 8), (11, 9)]:
                t.p(x, y, ch_c)
        if goggles:
            t.ret(5, 6, 10, 1, c(60, 46, 36))
    _chapeu(t, chapeu, ga.ROUPAS.get(cor_chapeu, cor_chapeu) if isinstance(cor_chapeu, str) else cor_chapeu, costas=costas)


def _lado(t, q, cp, cp_e, ch, ch_e, ch_c, ct, ct_e, ct_c, cc, cc_e, cabelo, saia, casaco, avental, calcado,
          luvas, chapeu, cor_chapeu, oculos, goggles, bigode):
    _cabelo_atras(t, cabelo, ch, ch_e, False, lado=True)
    tipo_calc, cor_calc = calcado
    perna = cc if not saia else cp
    # pernas: parado juntas; passos afastadas
    if q == 0:
        pernas = [(8, 23, 0), (9, 23, 0)]
    elif q == 1:
        pernas = [(6, 23, -2), (11, 23, 2)]
    else:
        pernas = [(7, 23, -1), (10, 23, 1)]
    for (x0, y0, inc) in pernas:
        for y in range(y0, 31):
            dx = round(inc * (y - y0) / 8)
            t.ret(x0 + dx, y, 3, 1, perna)
        dx = inc
        topo_calc = 30 - (3 if tipo_calc == "bota" else 0)
        t.ret(x0 + dx, topo_calc, 3, 31 - topo_calc, cor_calc)
        t.ret(x0 + dx, 31, 5, 2, cor_calc)
        t.ret(x0 + dx, 32, 5, 1, escurecer(cor_calc, 0.7))
    if saia:
        cs = ga.ROUPAS[saia] if isinstance(saia, str) else saia
        for j, y in enumerate(range(21, 28)):
            t.ret(7 - j // 3, y, 7 + (j // 3) * 2, 1, cs)
    else:
        t.ret(7, 21, 6, 3, cc)
    t.ret(7, 12, 6, 10, ct)
    t.ret(7, 13, 1, 8, ct_e)
    if avental:
        t.ret(11, 14, 2, 14, avental); t.ret(10, 20, 3, 8, avental)
    if casaco:
        cca = casaco["cor"]
        cca_e, cca_c = _sombreado(cca)
        comp = 28 if casaco.get("comprimento", "longo") == "longo" else 23
        t.ret(6, 12, 8, 10, cca)
        for y in range(22, comp):
            t.ret(6 - (y > 24), y, 8 + (y > 24) * 2, 1, cca if y < comp - 1 else cca_e)
        t.ret(6, 13, 1, comp - 13, cca_e)
        if casaco.get("cinto"):
            t.ret(6, 20, 8, 1, casaco["cinto"])
    cm = casaco["cor"] if casaco else ct
    off = {0: 0, 1: 2, 2: -2}[q]
    t.ret(9 + off // 2, 13, 3, 8, cm)
    t.ret(9 + off // 2, 13, 1, 8, escurecer(cm, 0.85))
    t.ret(9 + off, 21, 3, 2, luvas or cp)
    t.ret(10, 11, 2, 2, cp_e)
    t.elipse(10.5, 7, 3.7, 4.4, cp)
    t.p(14, 8, cp); t.p(14, 7, cp)
    t.p(9, 8, cp_e)
    t.p(12, 7, c(30, 24, 30))
    t.p(13, 9, escurecer(cp, 0.7))
    if bigode:
        t.ret(12, 9, 2, 1, ch_e)
    # cabelo do lado
    if cabelo == "cacheado":
        for x in range(6, 14):
            for y in range(1, 4 if x > 9 else 6):
                t.p(x, y, ch)
        t.ret(6, 4, 3, 8, ch)
        for (x, y) in [(7, 2), (10, 1), (5, 8), (6, 12)]:
            t.p(x, y, ch_c)
    elif cabelo == "crespo":
        for x in range(4, 15):
            for y in range(0, 4 if x > 10 else 7):
                if t.get(x, y)[3]:
                    t.p(x, y, ch)
    elif cabelo == "chanel":
        t.ret(7, 2, 7, 3, ch); t.ret(6, 4, 4, 7, ch)
    else:
        t.ret(7, 2, 7, 2, ch); t.ret(7, 4, 3, 3, ch)
    if oculos:
        arm = c(46, 36, 46)
        t.p(11, 6, arm); t.p(12, 6, arm); t.p(13, 6, arm)
        t.p(13, 7, c(196, 226, 246)); t.p(11, 7, arm); t.p(10, 7, arm); t.p(9, 7, arm)
        t.p(12, 8, arm); t.p(13, 8, arm)
    if goggles:
        t.ret(7, 6, 5, 1, c(60, 46, 36))
        t.ret(11, 6, 3, 3, escurecer(goggles, 0.6)); t.ret(12, 7, 2, 1, goggles)
    _chapeu(t, chapeu, ga.ROUPAS.get(cor_chapeu, cor_chapeu) if isinstance(cor_chapeu, str) else cor_chapeu, lado=True)


# trajes da protagonista (pele levemente parda, cabelo cacheado castanho escuro, oculos)
TRAJES = {
    "jaleco": dict(topo=c(52, 54, 66), calca=c(48, 54, 80), casaco={"cor": c(236, 238, 240), "aberto": True},
                   calcado=("sapato", c(96, 62, 40)), oculos=True),
    "noir": dict(topo=c(40, 40, 48), calca=c(36, 36, 44), casaco={"cor": c(112, 112, 118), "aberto": True, "cinto": c(70, 70, 76)},
                 calcado=("bota", c(34, 30, 34)), luvas=c(40, 38, 44), oculos=True),
    "industrial": dict(topo=c(70, 74, 60), calca=c(70, 82, 64), casaco={"cor": c(214, 170, 50), "aberto": True, "cinto": c(120, 84, 40)},
                       calcado=("bota", c(40, 40, 44)), luvas=c(52, 52, 58), chapeu="bandana", cor_chapeu=c(196, 52, 46),
                       goggles=c(150, 214, 200)),
    "vapor": dict(topo=c(232, 220, 196), calca=c(48, 40, 44), avental=c(122, 78, 46),
                  calcado=("bota", c(96, 60, 36)), luvas=c(132, 96, 60), oculos=True),
}


def gerar_personagens():
    for traje, cfg in TRAJES.items():
        pessoa("protagonista_" + traje, "parda_clara", cabelo="cacheado", cor_cabelo="castanho_escuro", **cfg)
    pessoa("protagonista", "parda_clara", cabelo="cacheado", cor_cabelo="castanho_escuro", **TRAJES["jaleco"])
    pessoa("enedina", "escura", cabelo="crespo", cor_cabelo="preto", topo=c(236, 234, 224), saia=c(60, 62, 76),
           casaco={"cor": c(44, 56, 104), "aberto": True, "comprimento": "curto"}, calcado=("sapato", c(40, 32, 32)))
    pessoa("enedina_obra", "escura", cabelo="crespo", cor_cabelo="preto", topo="caqui", calca="caqui", chapeu="capacete",
           cor_chapeu="branco", calcado=("bota", c(92, 62, 40)), luvas=c(170, 140, 90))
    pessoa("coordenadora", "clara", cabelo="coque", cor_cabelo="grisalho", topo=c(236, 234, 224), calca="preto",
           casaco={"cor": c(134, 44, 64), "aberto": True, "comprimento": "curto"}, oculos=True)
    pessoa("professor", "clara", cabelo="curto", cor_cabelo="grisalho", topo="branco", calca="cinza",
           casaco={"cor": c(100, 102, 114), "aberto": True, "comprimento": "curto"}, oculos=True, bigode=True)
    pessoa("zelador", "media", cabelo="curto", cor_cabelo="preto", topo="caqui", calca="marrom", chapeu="bone",
           cor_chapeu="azul_operario")
    pessoa("ze", "media", cabelo="curto", cor_cabelo="preto", topo="azul_operario", calca="azul_operario", chapeu="bone",
           cor_chapeu="vermelho", calcado=("bota", c(70, 50, 36)))
    pessoa("bento", "escura", cabelo="curto", cor_cabelo="preto", topo="branco", calca="marrom", chapeu="chapeu",
           cor_chapeu="bege", calcado=("bota", c(70, 50, 36)))
    pessoa("antonio", "clara", cabelo="curto", cor_cabelo="castanho", topo="caqui", calca="marrom", chapeu="capacete",
           cor_chapeu="amarelo", bigode=True, calcado=("bota", c(70, 50, 36)))
    pessoa("morador", "clara", cabelo="curto", cor_cabelo="castanho", topo="branco", calca="marrom", chapeu="chapeu",
           cor_chapeu="cinza", casaco={"cor": c(120, 84, 56), "aberto": True, "comprimento": "curto"})
    pessoa("moradora", "media", cabelo="coque", cor_cabelo="castanho", topo="vermelho", saia="vermelho")
    pessoa("moradora2", "escura", cabelo="chanel", cor_cabelo="preto", topo="verde", saia="verde")
    pessoa("jornaleiro", "parda_clara", cabelo="curto", cor_cabelo="preto", topo="branco", calca="marrom", chapeu="bone",
           cor_chapeu="cinza")
    pessoa("estudante", "clara", cabelo="curto", cor_cabelo="ruivo", topo="branco", calca="cinza", gola="branco",
           casaco={"cor": c(70, 72, 84), "aberto": True, "comprimento": "curto"})
    pessoa("operario_usina", "media", cabelo="curto", cor_cabelo="preto", topo="azul_operario", calca="azul_operario",
           chapeu="capacete", cor_chapeu="amarelo", calcado=("bota", c(40, 40, 44)))
    pessoa("operaria_usina", "escura", cabelo="preso", cor_cabelo="preto", topo="azul_operario", calca="azul_operario",
           chapeu="capacete", cor_chapeu="amarelo", calcado=("bota", c(40, 40, 44)))


def gerar_retratos():
    base = dict(pele="parda_clara", cabelo="cacheado", cor_cabelo="castanho_escuro")
    ga.retrato("protagonista", topo="branco", gola="preto", oculos=True, **base)
    ga.retrato("protagonista_jaleco", topo="branco", gola="preto", oculos=True, **base)
    ga.retrato("protagonista_noir", topo="cinza", gola="preto", oculos=True, **base)
    ga.retrato("protagonista_industrial", topo="mostarda", gola="vermelho", chapeu="bandana", cor_chapeu="vermelho",
               goggles=True, **base)
    ga.retrato("protagonista_vapor", topo="marrom", gola="bege", oculos=True, **base)




# ===================================================================== ISOMETRICO: BASE
from PIL import ImageDraw

TW, TH = 32, 16  # losango do chao


def losango(textura):
    """Converte uma textura 16x16 vista de cima num losango isometrico 32x16."""
    t = Tela(TW, TH)
    for j in range(TH):
        for i in range(TW):
            sx = i - 16 + 0.5
            sy = j + 0.5
            x = (sx + 2 * sy) / 2
            y = (2 * sy - sx) / 2
            if 0 <= x < 16 and 0 <= y < 16:
                t.px[i, j] = textura.get(int(x), int(y))
    return t


def bloco(topo, face, altura, sombra_esq=0.84, sombra_dir=0.64, borda=True):
    """Bloco isometrico de um tile: topo em losango e duas faces visiveis com textura."""
    H = altura
    t = Tela(TW, TH + H)
    top = losango(topo)
    t.img.alpha_composite(top.img, (0, 0))
    t.px = t.img.load()
    for i in range(16):
        ytopo = 8 + i / 2
        for k in range(H + 1):
            y = int(ytopo + k)
            cor = face.get(i, k % 16)
            if cor[3]:
                t.p(i, y + (1 if ytopo % 1 else 0), escurecer(cor, sombra_esq))
    for i in range(16, 32):
        ytopo = 16 - (i - 16) / 2
        for k in range(H + 1):
            y = int(ytopo + k)
            cor = face.get(i - 16, k % 16)
            if cor[3]:
                t.p(i, y + (0 if ytopo % 1 else 0), escurecer(cor, sombra_dir))
    if borda:
        for i in range(16):
            t.p(i, int(8 + i / 2), clarear(face.get(i, 0), 0.25))
        for i in range(16, 32):
            t.p(i, int(16 - (i - 16) / 2), clarear(face.get(i - 16, 0), 0.1))
        for k in range(H):
            t.p(16, 16 + k, escurecer(face.get(0, k % 16), 0.5))
    return t


class Iso:
    """Desenho de caixas isometricas dentro de um sprite.
    (u, v, z): u ao longo de x do mundo, v ao longo de y, z para cima, em pixels logicos (16 = 1 tile)."""

    def __init__(self, nome, w, d, h, quadros=1, extra_alto=0):
        self.w, self.d, self.h = w, d, h + extra_alto
        self.W, self.D = w * 16, d * 16
        self.sw = (w + d) * 16
        self.sh = (w + d) * 8 + self.h + 2
        self.ox = d * 16
        self.oy = self.h
        self.q = quadros
        self.nome = nome
        self.tela = Tela(self.sw * quadros, self.sh)
        self.k = 0

    def pt(self, u, v, z):
        return (self.k * self.sw + self.ox + (u - v), self.oy + (u + v) / 2 - z)

    def poli(self, pts, cor):
        d = ImageDraw.Draw(self.tela.img)
        d.polygon([self.pt(*p) for p in pts], fill=cor)
        self.tela.px = self.tela.img.load()

    def caixa(self, u0, v0, z0, u1, v1, z1, cor, sombra=(1.0, 0.82, 0.64)):
        """Caixa de (u0,v0,z0) a (u1,v1,z1). Desenha topo, face esquerda (v=v1) e direita (u=u1)."""
        st, se, sd = sombra
        self.poli([(u0, v1, z0), (u1, v1, z0), (u1, v1, z1), (u0, v1, z1)], escurecer(cor, se))
        self.poli([(u1, v0, z0), (u1, v1, z0), (u1, v1, z1), (u1, v0, z1)], escurecer(cor, sd))
        self.poli([(u0, v0, z1), (u1, v0, z1), (u1, v1, z1), (u0, v1, z1)], escurecer(cor, st) if st != 1 else cor)

    def ponto(self, u, v, z, cor):
        x, y = self.pt(u, v, z)
        self.tela.p(int(x), int(y), cor)

    def ret_esq(self, u0, u1, z0, z1, v, cor):
        """Retangulo na face esquerda (plano v fixo)."""
        for u in range(int(u0), int(u1)):
            for z in range(int(z0), int(z1)):
                self.ponto(u + 0.5, v, z + 0.5, cor)

    def ret_dir(self, v0, v1, z0, z1, u, cor):
        """Retangulo na face direita (plano u fixo)."""
        for v in range(int(v0), int(v1)):
            for z in range(int(z0), int(z1)):
                self.ponto(u, v + 0.5, z + 0.5, cor)

    def ret_topo(self, u0, u1, v0, v1, z, cor):
        for u in range(int(u0), int(u1)):
            for v in range(int(v0), int(v1)):
                self.ponto(u + 0.5, v + 0.5, z, cor)

    def cilindro(self, cu, cv, r, z0, z1, cor, cor_topo=None):
        cx, cy0 = self.pt(cu, cv, z0)
        _, cy1 = self.pt(cu, cv, z1)
        rx, ry = r * 1.41, r * 0.71
        d = ImageDraw.Draw(self.tela.img)
        d.ellipse([cx - rx, cy0 - ry, cx + rx, cy0 + ry], fill=escurecer(cor, 0.7))
        d.rectangle([cx - rx, cy1, cx + rx, cy0], fill=escurecer(cor, 0.8))
        d.rectangle([cx - rx * 0.2, cy1, cx + rx * 0.35, cy0], fill=escurecer(cor, 0.9))
        d.ellipse([cx - rx, cy1 - ry, cx + rx, cy1 + ry], fill=cor_topo or cor)
        self.tela.px = self.tela.img.load()
        return cx, cy1, rx, ry

    def proximo(self):
        self.k += 1

    def salvar(self, col=None, solido=True, contorno=True):
        if contorno:
            sheet = self.tela.img.copy()
            for k in range(self.q):
                s = Tela(self.sw, self.sh)
                s.img.alpha_composite(sheet.crop((k * self.sw, 0, (k + 1) * self.sw, self.sh)))
                s.px = s.img.load()
                s.contorno()
                self.tela.img.paste(s.img, (k * self.sw, 0))
            self.tela.px = self.tela.img.load()
        self.tela.salvar("iso_" + self.nome)
        ISO[self.nome] = {"tipo": "caixa", "sprite": "iso_" + self.nome, "pegada": [self.w, self.d],
                          "ancora": [self.ox, self.oy], "w": self.sw, "h": self.sh, "quadros": self.q,
                          "col": col if col is not None else ([1, 1, self.W - 2, self.D - 2] if solido else None)}


def billboard(nome, pegada=(1, 1), col=None):
    """Objeto desenhado de frente (arvores, postes, placas): continua usando o sprite obj_*."""
    meta = ga.OBJETOS[nome]
    ISO[nome] = {"tipo": "billboard", "sprite": "obj_" + nome, "pegada": list(pegada), "w": meta["w"], "h": meta["h"],
                 "quadros": meta.get("quadros", 1), "col": col}


# ===================================================================== CHAO E BLOCOS
BLOCOS = {
    "#": ("parede_topo", "parede", 30),
    "+": ("parede_topo", "parede", 30),
    "m": ("parede_topo", "parede_moderna", 30),
    "&": ("rocha", "rocha_face", 34),
    "%": ("rocha", "rocha_face", 34),
    " ": ("vazio", "vazio", 34),
}


def gerar_chao():
    texturas = dict(ga.TILES)
    nomes = [n for n, _ in ga.TILES]
    atlas = Tela(TW * 8, TH * ((len(nomes) + 7) // 8))
    for k, n in enumerate(nomes):
        atlas.colar(losango(texturas[n]), (k % 8) * TW, (k // 8) * TH)
    atlas.salvar("iso_chao")
    ISO_CHAO["chao"] = {n: k for k, n in enumerate(nomes)}
    ISO_CHAO["colunas"] = 8
    blocos = {}
    alt_max = max(h for _, _, h in BLOCOS.values())
    folha = Tela(TW * len(BLOCOS), TH + alt_max)
    for k, (ch, (topo, face, h)) in enumerate(BLOCOS.items()):
        b = bloco(texturas[topo], texturas[face], h)
        folha.colar(b, k * TW, alt_max - h)
        blocos[ch] = {"i": k, "altura": h}
    folha.salvar("iso_blocos")
    ISO_CHAO["blocos"] = blocos
    ISO_CHAO["blocos_altura"] = alt_max


# ===================================================================== PREDIOS EM BLOCOS
ESTILOS = {
    "ufpr": dict(parede=c(232, 220, 188), telhado=c(150, 142, 134), altura=56, janela="coluna"),
    "colegio": dict(parede=c(236, 234, 226), telhado=c(170, 172, 178), altura=46, janela="faixa"),
    "departamento": dict(parede=c(190, 202, 190), telhado=c(126, 120, 116), altura=40, janela="janela"),
    "casa_azul": dict(parede=c(150, 182, 208), telhado=c(158, 78, 56), altura=36, janela="janela", telha=True),
    "casa_rosa": dict(parede=c(220, 164, 166), telhado=c(158, 78, 56), altura=36, janela="janela", telha=True),
    "casa_amarela": dict(parede=c(226, 202, 128), telhado=c(158, 78, 56), altura=36, janela="janela", telha=True),
    "casa_verde": dict(parede=c(156, 196, 156), telhado=c(158, 78, 56), altura=36, janela="janela", telha=True),
}


def textura_fachada(estilo, tipo, H):
    """Textura vertical (16 x H) de um trecho de fachada."""
    e = ESTILOS[estilo]
    p = e["parede"]
    t = Tela(16, H)
    t.ret(0, 0, 16, H, p)
    ruido(t, 0, 0, 16, H, [escurecer(p, 0.95), clarear(p, 0.05)], 0.12, H + len(tipo))
    t.ret(0, 0, 16, 3, clarear(p, 0.12)); t.ret(0, 3, 16, 1, escurecer(p, 0.8))
    t.ret(0, H - 3, 16, 3, escurecer(p, 0.75))
    vidro, moldura = c(70, 96, 128), c(250, 248, 240)
    if tipo == "janela":
        jan = e["janela"]
        if jan == "coluna":
            t.ret(2, 6, 4, H - 9, c(250, 248, 240)); t.ret(5, 6, 1, H - 9, escurecer(p, 0.85))
            t.ret(1, 5, 6, 2, moldura); t.ret(1, H - 5, 6, 2, moldura)
            t.ret(9, 12, 5, 9, vidro); t.moldura(8, 11, 7, 11, moldura)
            if H > 40:
                t.ret(9, 30, 5, 9, vidro); t.moldura(8, 29, 7, 11, moldura)
        elif jan == "faixa":
            for y in range(7, H - 6, 13):
                t.ret(0, y, 16, 7, c(70, 120, 170)); t.ret(0, y + 1, 16, 1, c(140, 190, 230))
                t.ret(7, y, 1, 7, moldura)
        else:
            for y in range(7, H - 10, 15):
                t.ret(4, y, 8, 9, vidro); t.moldura(3, y - 1, 10, 11, moldura); t.ret(7, y, 1, 9, moldura)
                t.ret(3, y + 9, 10, 1, escurecer(p, 0.7))
    elif tipo == "porta":
        t.ret(3, H - 22, 10, 19, c(104, 66, 40)); t.ret(7, H - 22, 1, 19, c(78, 48, 30))
        t.moldura(2, H - 23, 12, 21, moldura); t.p(10, H - 12, c(230, 200, 90))
        if e["janela"] == "coluna":
            t.ret(2, 6, 12, 4, moldura)
    return t


def predio_bloco(estilo, tipo_esq, tipo_dir):
    e = ESTILOS[estilo]
    H = e["altura"]
    topo = Tela(16, 16)
    topo.ret(0, 0, 16, 16, e["telhado"])
    if e.get("telha"):
        for y in range(0, 16, 3):
            topo.ret(0, y, 16, 1, escurecer(e["telhado"], 0.8))
        ruido(topo, 0, 0, 16, 16, [clarear(e["telhado"], 0.1)], 0.08, 5)
    else:
        ruido(topo, 0, 0, 16, 16, [escurecer(e["telhado"], 0.9), clarear(e["telhado"], 0.08)], 0.2, 6)
        topo.ret(0, 0, 16, 1, clarear(e["telhado"], 0.2))
    fe = textura_fachada(estilo, tipo_esq, H)
    fd = textura_fachada(estilo, tipo_dir, H)
    t = Tela(TW, TH + H)
    t.img.alpha_composite(losango(topo).img, (0, 0))
    t.px = t.img.load()
    for i in range(16):
        ytopo = 8 + i / 2
        for k in range(H):
            t.p(i, int(ytopo + k) + (1 if ytopo % 1 else 0), escurecer(fe.get(i, k), 0.9))
    for i in range(16, 32):
        ytopo = 16 - (i - 16) / 2
        for k in range(H):
            t.p(i, int(ytopo + k), escurecer(fd.get(i - 16, k), 0.7))
    for k in range(H):
        t.p(16, 16 + k, escurecer(e["parede"], 0.55))
    return t


def gerar_predios():
    tipos = ["liso", "janela", "porta"]
    for estilo, e in ESTILOS.items():
        H = e["altura"]
        folha = Tela(TW * 9, TH + H)
        for a, te in enumerate(tipos):
            for b, td in enumerate(tipos):
                folha.colar(predio_bloco(estilo, te, td), (a * 3 + b) * TW, 0)
        folha.salvar("iso_predio_" + estilo)
        ISO_CHAO.setdefault("predios", {})[estilo] = {"altura": H, "tipos": tipos}


def gerar():
    gerar_personagens()
    gerar_retratos()
    gerar_chao()
    gerar_predios()
    gerar_objetos_iso()


# ===================================================================== OBJETOS ISOMETRICOS
VERDE = c(90, 230, 140)
VERDE_E = c(18, 54, 34)
ACO = c(84, 90, 102)
ACO_E = c(54, 58, 68)
MADEIRA = c(130, 88, 54)


def tela_verde(o, u0, u1, z0, z1, v, q, seed=0):
    o.ret_esq(u0, u1, z0, z1, v, VERDE_E)
    for u in range(int(u0) + 1, int(u1) - 1):
        z = (z0 + z1) / 2 + math.sin((u + q * 3) * 0.9 + seed) * (z1 - z0) / 3.5
        o.ponto(u + 0.5, v, z, VERDE)
    o.ret_esq(u0, u1, z1 - 1, z1, v, c(30, 34, 40))


def gerar_objetos_iso():
    # terminal de mesa com dois monitores verdes
    o = Iso("terminal", 2, 1, 28, quadros=2)
    for q in range(2):
        o.caixa(0, 0, 0, 32, 16, 12, c(70, 76, 88))
        o.ret_topo(6, 24, 9, 14, 12, c(36, 40, 48))
        for (u0, u1, s) in [(3, 14, 1), (17, 29, 4)]:
            o.caixa(u0, 2, 12, u1, 7, 27, c(48, 52, 62))
            tela_verde(o, u0 + 1, u1 - 1, 15, 26, 7, q + s, s)
        o.ponto(27.5, 16, 6, VERDE if q else c(40, 90, 60))
        o.proximo()
    o.salvar()
    # painel de comando
    o = Iso("painel", 2, 1, 24, quadros=2)
    for q in range(2):
        o.caixa(0, 0, 0, 32, 16, 22, ACO)
        o.caixa(0, 0, 22, 32, 8, 26, ACO_E)
        tela_verde(o, 2, 14, 11, 20, 16, q, 1)
        tela_verde(o, 18, 30, 11, 20, 16, q + 2, 4)
        for k in range(6):
            cor = (VERDE if k % 2 else c(230, 80, 70)) if (k + q) % 3 else c(50, 60, 56)
            o.ret_esq(3 + k * 5, 5 + k * 5, 6, 8, 16, cor)
        for u in range(0, 32, 2):
            o.ret_esq(u, u + 1, 0, 3, 16, c(226, 180, 40))
        o.proximo()
    o.salvar()
    # rack de servidores
    o = Iso("servidor", 1, 1, 36, quadros=2)
    r = random.Random(3)
    for q in range(2):
        o.caixa(1, 1, 0, 15, 15, 36, c(44, 48, 58))
        for z in range(4, 34, 5):
            o.ret_esq(2, 14, z, z + 3, 15, c(28, 32, 40))
            o.ret_dir(2, 14, z, z + 3, 15, c(28, 32, 40))
            for u in range(3, 13, 2):
                if r.random() < 0.5 + 0.2 * q:
                    o.ponto(u + 0.5, 15, z + 1.5, VERDE if r.random() < 0.75 else c(240, 170, 60))
        o.proximo()
    o.salvar()
    # turbina (cilindro com pas)
    o = Iso("turbina", 2, 2, 22, quadros=4)
    for q in range(4):
        cx, cy, rx, ry = o.cilindro(16, 16, 14, 0, 18, c(64, 70, 82), c(226, 180, 40))
        d = ImageDraw.Draw(o.tela.img)
        d.ellipse([cx - rx * 0.72, cy - ry * 0.72, cx + rx * 0.72, cy + ry * 0.72], fill=c(30, 36, 44))
        for k in range(4):
            a = q * math.pi / 8 + k * math.pi / 2
            d.line([cx, cy, cx + math.cos(a) * rx * 0.66, cy + math.sin(a) * ry * 0.66], fill=c(170, 180, 192), width=2)
        d.ellipse([cx - 2, cy - 1.5, cx + 2, cy + 1.5], fill=c(230, 190, 80))
        o.tela.px = o.tela.img.load()
        o.proximo()
    o.salvar(col=[3, 3, 26, 26])
    # gerador
    o = Iso("gerador", 1, 1, 26)
    o.caixa(1, 1, 0, 15, 15, 26, c(64, 86, 74))
    for z in range(2, 6):
        for u in range(1, 15):
            o.ponto(u + 0.5, 15, z + 0.5, c(226, 180, 40) if ((u + z) // 2) % 2 else c(40, 36, 36))
    o.ret_esq(3, 12, 12, 20, 15, VERDE_E); o.ret_esq(4, 11, 15, 16, 15, VERDE)
    o.ret_dir(4, 10, 12, 18, 15, c(220, 220, 210))
    o.salvar()
    # bancada de montagem
    o = Iso("bancada", 2, 1, 22)
    for (u, v) in [(1, 1), (29, 1), (1, 13), (29, 13)]:
        o.caixa(u, v, 0, u + 2, v + 2, 12, c(90, 60, 38))
    o.caixa(0, 0, 12, 32, 16, 15, MADEIRA)
    o.caixa(3, 3, 15, 9, 9, 20, c(96, 102, 116))
    o.caixa(22, 4, 15, 29, 10, 20, c(196, 60, 50))
    o.ret_topo(12, 19, 6, 8, 15, c(170, 176, 186))
    o.salvar()
    # mesas
    for nome, tampo, extra in [("mesa", MADEIRA, None), ("mesa_moderna", c(226, 228, 232), "laptop"),
                               ("mesa_projeto", MADEIRA, "planta")]:
        o = Iso(nome, 2, 1, 22 if extra == "laptop" else 16)
        for (u, v) in [(1, 1), (29, 1), (1, 13), (29, 13)]:
            o.caixa(u, v, 0, u + 2, v + 2, 12, escurecer(tampo, 0.7))
        o.caixa(0, 0, 12, 32, 16, 14, tampo)
        if extra == "laptop":
            o.ret_topo(10, 22, 7, 13, 14, c(70, 74, 86))
            o.caixa(10, 4, 14, 22, 6, 22, c(60, 64, 80))
            o.ret_esq(11, 21, 15, 21, 6, c(110, 190, 220))
        elif extra == "planta":
            o.ret_topo(3, 26, 2, 14, 14, c(56, 104, 176))
            for k in range(4):
                o.ret_topo(5 + k * 5, 7 + k * 5, 4, 12, 14, c(200, 230, 255))
        else:
            o.ret_topo(4, 12, 3, 9, 14, c(240, 236, 220)); o.ret_topo(16, 22, 5, 11, 14, c(220, 200, 150))
        o.salvar()
    # estante de livros
    o = Iso("estante", 2, 1, 38)
    o.caixa(0, 2, 0, 32, 16, 38, c(110, 72, 44))
    r = random.Random(9)
    for z in (3, 12, 21, 30):
        o.ret_esq(2, 30, z, z + 7, 16, c(70, 44, 28))
        u = 2
        while u < 29:
            w = r.choice([1, 2, 2])
            hgt = r.choice([5, 6, 7])
            o.ret_esq(u, u + w, z, z + hgt, 16, r.choice([c(170, 60, 60), c(60, 100, 170), c(200, 170, 70),
                                                           c(70, 140, 90), c(130, 80, 150), c(220, 210, 190)]))
            u += w + (1 if r.random() < 0.15 else 0)
    o.salvar()
    # arquivo de aco
    o = Iso("arquivo", 1, 1, 26)
    o.caixa(2, 2, 0, 14, 14, 26, c(110, 120, 112))
    for z in (3, 11, 19):
        o.ret_esq(3, 13, z, z + 6, 14, c(92, 102, 94)); o.ret_esq(6, 10, z + 3, z + 4, 14, c(210, 210, 200))
    o.salvar()
    # caixas e caixotes
    o = Iso("caixas", 1, 1, 20)
    o.caixa(1, 1, 0, 15, 15, 10, c(184, 146, 96)); o.ret_topo(7, 9, 1, 15, 10, c(240, 230, 200))
    o.caixa(3, 3, 10, 12, 12, 18, c(200, 164, 110))
    o.salvar()
    o = Iso("caixa_antiga", 1, 1, 12)
    o.caixa(2, 2, 0, 14, 14, 10, c(120, 92, 64))
    ruido(o.tela, 0, 0, o.sw, o.sh, [c(170, 160, 150, 120)], 0.02, 3)
    o.ret_esq(6, 10, 4, 7, 14, c(200, 170, 90))
    o.salvar()
    o = Iso("caixa_obra", 1, 1, 14)
    o.caixa(1, 1, 0, 15, 15, 12, c(170, 124, 72))
    for z in (4, 8):
        o.ret_esq(1, 15, z, z + 1, 15, c(120, 84, 48)); o.ret_dir(1, 15, z, z + 1, 15, c(110, 76, 42))
    o.salvar()
    o = Iso("tijolos", 1, 1, 10)
    for z in (0, 3, 6):
        o.caixa(2, 2, z, 14, 14, z + 3, c(176, 84, 60))
    o.salvar()
    # banco de praca, canteiro de flores, banca, ponto de bonde
    o = Iso("banco", 2, 1, 14)
    for u in (3, 27):
        o.caixa(u, 5, 0, u + 2, 11, 6, c(50, 50, 56))
    o.caixa(0, 4, 6, 32, 12, 8, c(80, 136, 86))
    o.caixa(0, 2, 8, 32, 4, 14, c(70, 120, 76))
    o.salvar(col=[0, 4, 32, 8])
    o = Iso("flores", 2, 1, 10)
    o.caixa(0, 1, 0, 32, 15, 6, c(110, 76, 48))
    r = random.Random(5)
    for _ in range(40):
        o.ponto(r.uniform(2, 30), r.uniform(3, 13), 7 + r.random() * 2, r.choice([c(240, 80, 100), c(250, 220, 80),
                                                                                    c(250, 250, 250), c(200, 120, 220)]))
    o.salvar()
    o = Iso("banca", 2, 2, 34)
    o.caixa(1, 1, 0, 31, 31, 28, c(52, 112, 74))
    o.caixa(0, 0, 28, 32, 32, 31, c(40, 90, 60))
    for u in range(2, 30, 6):
        o.ret_esq(u, u + 4, 12, 20, 31, r.choice([c(240, 240, 230), c(230, 200, 120), c(200, 220, 240)]))
    o.ret_esq(1, 31, 24, 27, 31, c(240, 220, 120))
    o.salvar()
    o = Iso("ponto_bonde", 2, 1, 32)
    for u in (2, 28):
        o.caixa(u, 7, 0, u + 2, 9, 28, c(60, 60, 70))
    o.caixa(4, 6, 0, 28, 11, 5, c(130, 90, 60))
    o.caixa(0, 0, 28, 32, 16, 31, c(150, 60, 50))
    o.salvar(col=[2, 6, 28, 5])
    # chafariz
    o = Iso("chafariz", 3, 2, 26)
    o.cilindro(24, 16, 15, 0, 8, c(170, 168, 164), c(80, 140, 206))
    o.cilindro(24, 16, 3, 8, 22, c(186, 184, 180), c(210, 208, 204))
    for k in range(10):
        a = k * math.pi / 5
        o.ponto(24 + math.cos(a) * 6, 16 + math.sin(a) * 6, 20 - abs(math.sin(a)) * 3, c(180, 225, 255))
    o.salvar(col=[10, 2, 28, 28])
    # andaime
    o = Iso("andaime", 3, 1, 46)
    for (u, v) in [(1, 2), (23, 2), (45, 2), (1, 13), (23, 13), (45, 13)]:
        o.caixa(u, v, 0, u + 2, v + 2, 44, c(150, 108, 64))
    for z in (14, 30):
        o.caixa(0, 2, z, 48, 15, z + 2, c(170, 124, 76))
    o.salvar(col=[0, 2, 48, 13])
    # porta da sala de comando
    o = Iso("porta_comando", 1, 1, 32)
    o.caixa(0, 0, 0, 16, 16, 30, c(96, 104, 116))
    for z in (8, 16, 24):
        o.ret_esq(1, 15, z, z + 1, 16, c(70, 76, 88)); o.ret_dir(1, 15, z, z + 1, 16, c(64, 70, 80))
    for (u, v, esq) in [(8, 16, True), (16, 8, False)]:
        for a in range(12):
            ang = a * math.pi / 6
            if esq:
                o.ponto(8 + math.cos(ang) * 3, 16, 14 + math.sin(ang) * 3, c(200, 60, 50))
            else:
                o.ponto(16, 8 + math.cos(ang) * 3, 14 + math.sin(ang) * 3, c(200, 60, 50))
    for u in range(0, 16, 2):
        o.ret_topo(u, u + 1, 0, 16, 30, c(226, 180, 40))
    o.salvar()
    # carros dos anos 1940 (dois sentidos ao longo de x)
    for nome, cor in [("carro_preto", c(44, 42, 52)), ("carro_vinho", c(124, 40, 54)), ("carro_verde", c(52, 100, 70))]:
        for sentido in ("d", "e"):
            o = Iso(nome + "_" + sentido, 2, 1, 18)
            o.caixa(0, 2, 2, 32, 14, 10, cor)
            o.caixa(8, 3, 10, 24, 13, 17, cor)
            o.ret_esq(10, 15, 11, 16, 13, c(170, 210, 230)); o.ret_esq(17, 22, 11, 16, 13, c(170, 210, 230))
            o.ret_dir(4, 12, 11, 16, 24, c(150, 196, 220))
            for u in (6, 25):
                for a in range(16):
                    ang = a * math.pi / 8
                    o.ponto(u + math.cos(ang) * 3, 14, 3 + math.sin(ang) * 3, c(24, 24, 28))
            if sentido == "d":
                o.ret_dir(3, 6, 6, 8, 32, c(250, 240, 180)); o.ret_dir(10, 13, 6, 8, 32, c(250, 240, 180))
            else:
                o.ret_dir(3, 5, 6, 8, 32, c(220, 60, 50)); o.ret_dir(11, 13, 6, 8, 32, c(220, 60, 50))
            o.salvar(solido=False)
    # objetos que continuam de frente (billboards)
    for nome, peg, col in [("araucaria", (1, 1), [4, 4, 8, 8]), ("arvore", (1, 1), [3, 3, 10, 10]),
                           ("arbusto", (1, 1), [3, 3, 10, 10]), ("poste", (1, 1), [6, 6, 4, 4]),
                           ("placa", (1, 1), [6, 6, 4, 4]), ("revisor", (1, 1), [2, 2, 12, 12]),
                           ("vaso", (1, 1), [4, 4, 8, 8]), ("cadeira", (1, 1), None), ("valvula", (1, 1), [3, 3, 10, 10]),
                           ("cano_v", (1, 1), [4, 4, 8, 8]), ("cano_h", (1, 1), None), ("lampada", (1, 1), None),
                           ("placa_perigo", (1, 1), None), ("monte_areia", (1, 1), [1, 1, 14, 14]),
                           ("carrinho", (1, 1), [2, 2, 12, 12]), ("cerca", (1, 1), [0, 6, 16, 4]),
                           ("sucata", (1, 1), [2, 2, 12, 12]), ("bobina", (1, 1), [2, 2, 12, 12]),
                           ("pneus", (1, 1), [2, 2, 12, 12]), ("caixa_parafusos", (1, 1), [2, 2, 12, 12]),
                           ("lousa_usina", (1, 1), [2, 6, 12, 4])]:
        billboard(nome, peg, col)
    for nome in list(ga.OBJETOS):
        if nome.startswith("placa_") and nome not in ISO:
            billboard(nome, (1, 1), None)
