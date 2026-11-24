#!/usr/bin/env python3
"""『夜の隣席』PV用の音声をすべて新規に合成する（既存楽曲・外部音源は不使用）。

出力:
  public/audio/music.wav        … 60秒のピアノ＋パッド（BGM）
  public/audio/sfx/<id>.wav     … 環境音（src/timeline.json の sfx.id ごとに1ファイル）

依存は numpy のみ。乱数シードを固定しているので、同じ timeline.json なら毎回同じ音になる。
使い方: python3 audio/make_audio.py
"""
import json
import os
import wave

import numpy as np

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "audio")
TL = json.load(open(os.path.join(ROOT, "src", "timeline.json"), encoding="utf-8"))
rng = np.random.default_rng(20261124)


# ---------------------------------------------------------------- utilities
def t_axis(sec):
    return np.arange(int(sec * SR)) / SR


def write_wav(path, x):
    """x: (n,) mono or (n, 2) stereo float in -1..1"""
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    peak = np.max(np.abs(x))
    if peak > 0.98:
        x = x * (0.98 / peak)
    pcm = (x * 32767).astype(np.int16)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def fft_filter(x, lo=None, hi=None, slope=4.0):
    """周波数領域の滑らかなバンドパス（lo/hi Hz）。"""
    n = len(x)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    g = np.ones_like(f)
    if lo:
        g *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** slope)
    if hi:
        g *= 1 / (1 + (f / hi) ** slope)
    return np.fft.irfft(X * g, n)


def noise(sec):
    return rng.standard_normal(int(sec * SR))


def env_ad(n, a=0.005, d=0.3):
    t = np.arange(n) / SR
    return np.minimum(t / max(a, 1e-4), 1.0) * np.exp(-t / d)


def fade(x, fin=0.3, fout=0.6):
    n = len(x)
    e = np.ones(n)
    a, b = int(fin * SR), int(fout * SR)
    if a:
        e[:a] = np.linspace(0, 1, a) ** 2
    if b:
        e[-b:] *= np.linspace(1, 0, b) ** 2
    return x * e if x.ndim == 1 else x * e[:, None]


def reverb(x, sec=3.2, wet=0.35, predelay=0.02, damp=6000):
    """ステレオのノイズIRで畳み込むホール風リバーブ。"""
    n = int(sec * SR)
    t = np.arange(n) / SR
    irs = []
    for _ in range(2):
        ir = rng.standard_normal(n) * np.exp(-t * 6.9 / sec)
        ir = fft_filter(ir, lo=180, hi=damp, slope=3)
        ir[: int(predelay * SR)] = 0
        irs.append(ir / np.sqrt(np.sum(ir ** 2)))
    mono = x if x.ndim == 1 else x.mean(axis=1)
    L = len(mono) + n
    nfft = 1 << (L - 1).bit_length()
    M = np.fft.rfft(mono, nfft)
    outs = [np.fft.irfft(M * np.fft.rfft(ir, nfft), nfft)[: len(mono)] for ir in irs]
    dry = x if x.ndim == 2 else np.stack([x, x], axis=1)
    return dry * (1 - wet) + np.stack(outs, axis=1) * wet * 1.6


def place(buf, x, at):
    i = int(at * SR)
    if i >= len(buf):
        return
    x = x[: len(buf) - i]
    buf[i : i + len(x)] += x


# ---------------------------------------------------------------- music
NOTE = {"C": 0, "Db": 1, "D": 2, "Eb": 3, "E": 4, "F": 5, "Gb": 6, "G": 7, "Ab": 8, "A": 9, "Bb": 10, "B": 11}


def hz(name):
    p, o = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((NOTE[p] + 12 * (o + 1) - 69) / 12)


def piano(f, vel=0.5, dur=4.0):
    """倍音加算による柔らかいピアノ風の音。"""
    t = t_axis(dur)
    B = 0.00035
    y = np.zeros_like(t)
    bright = 0.6 + 0.8 * vel
    for k in range(1, 13):
        fk = k * f * np.sqrt(1 + B * k * k)
        if fk > 16000:
            break
        amp = (1 / k ** (2.1 - bright)) * (0.5 if k % 2 == 0 else 1.0)
        dec = 0.35 + 0.42 * k + f / 900
        y += amp * np.sin(2 * np.pi * fk * t + rng.uniform(0, 6.28)) * np.exp(-t * dec)
    # 低い成分のゆっくりした減衰（サステイン）
    y += 0.35 * np.sin(2 * np.pi * f * t) * np.exp(-t * (0.25 + f / 2500))
    att = np.minimum(t / 0.004, 1)
    hammer = fft_filter(rng.standard_normal(len(t)), lo=1500, hi=6000) * np.exp(-t / 0.008) * 0.05
    rel = np.ones_like(t)
    r = int(0.35 * SR)
    rel[-r:] = np.linspace(1, 0, r)
    return (y * att + hammer) * rel * vel * 0.22


def pad(freqs, dur, gain=0.05):
    t = t_axis(dur)
    y = np.zeros_like(t)
    for f in freqs:
        for det in (-0.12, 0.0, 0.11):
            ff = f * 2 ** (det / 12)
            y += np.sin(2 * np.pi * ff * t + rng.uniform(0, 6.28)) + 0.18 * np.sin(4 * np.pi * ff * t)
    lfo = 0.75 + 0.25 * np.sin(2 * np.pi * 0.11 * t + rng.uniform(0, 6))
    y = fft_filter(y, hi=1800, slope=2) * lfo
    return fade(y * gain / len(freqs), fin=min(2.0, dur / 3), fout=min(2.5, dur / 2.5))


def make_music():
    total = TL["duration"]
    mus = np.zeros((int((total + 4) * SR), 2))
    padbuf = np.zeros(int((total + 4) * SR))

    def pn(name, at, vel=0.45, dur=4.5, pan=0.0):
        x = piano(hz(name), vel, dur)
        l, r = np.sqrt(0.5 - pan / 2), np.sqrt(0.5 + pan / 2)
        place(mus, np.stack([x * l, x * r], axis=1), at)

    # 0–7s: 夕暮れ。音数を絞った導入
    place(padbuf, pad([hz("Db3"), hz("Ab3"), hz("Eb4"), hz("F4")], 8.0, 0.05), 0.0)
    for at, n, v in [(0.6, "F5", 0.30), (2.0, "Ab5", 0.26), (3.4, "Eb5", 0.28), (4.7, "C5", 0.24), (5.8, "Db5", 0.30)]:
        pn(n, at, v, 5.0, 0.25)
    pn("Db3", 0.5, 0.35, 7.0, -0.2)

    # 7–31s: 6人の出会い。4秒ごとに和音が変わる穏やかなアルペジオ
    chords = [
        (["Db3", "Ab3", "Eb4", "F4", "Ab4", "C5"], "F5"),   # リリア：Db add9
        (["F2", "C3", "Ab3", "Eb4", "G4", "C5"], "Eb5"),    # ルミア：Fm9
        (["Gb2", "Db3", "Bb3", "F4", "Ab4", "Db5"], "Bb5"),  # クレア：Gbmaj7(9)
        (["Eb3", "Bb3", "Db4", "Gb4", "F4", "Bb4"], "Db5"),  # セシリア：Ebm9
        (["Bb2", "F3", "Db4", "Ab4", "C5", "F5"], "Ab5"),   # セレーヌ：Bbm9
        (["Ab2", "Eb3", "Db4", "Gb4", "Bb4", "Eb5"], "C5"),  # ルシェ：Ab sus (→3)
    ]
    for i, (notes, top) in enumerate(chords):
        base = 7.0 + i * 4.0
        place(padbuf, pad([hz(n) for n in notes[:4]], 4.6, 0.045), base - 0.2)
        pn(notes[0], base, 0.42, 4.6, -0.3)
        order = [1, 2, 3, 4, 5, 4, 3, 2]
        for j, k in enumerate(order):
            pn(notes[k], base + 0.12 + j * 0.48, 0.22 + 0.06 * (j % 2 == 0), 2.8, 0.15 * ((j % 3) - 1))
        pn(top, base + 1.95, 0.30, 3.5, 0.3)

    # 31–45s: 出会いの先。少し動きを増やす
    chords2 = [
        (["Gb2", "Db3", "Bb3", "F4", "Ab4", "Db5", "F5"], 31.0, 3.5),
        (["Ab2", "Eb3", "C4", "Eb4", "Ab4", "C5", "Eb5"], 34.5, 2.5),
        (["F2", "C3", "Ab3", "Eb4", "G4", "C5", "Eb5"], 37.0, 3.0),
        (["Bb2", "F3", "Db4", "F4", "Ab4", "Db5", "F5"], 40.0, 2.5),
        (["Gb2", "Db3", "Bb3", "Db4", "F4", "Bb4", "Db5"], 42.5, 2.5),
    ]
    for notes, base, length in chords2:
        place(padbuf, pad([hz(n) for n in notes[:4]], length + 0.8, 0.05), base - 0.2)
        pn(notes[0], base, 0.46, length + 1.2, -0.3)
        pn(notes[1], base + 0.02, 0.30, length + 1.0, -0.2)
        step = 0.3
        seq = [2, 3, 4, 5, 6, 5, 4, 3, 2, 3, 4, 5]
        for j in range(int(length / step)):
            k = seq[j % len(seq)]
            pn(notes[k], base + 0.1 + j * step, 0.18 + 0.05 * (j % 4 == 0), 2.2, 0.2 * ((j % 3) - 1))
    pn("Ab5", 32.9, 0.3, 3.0, 0.3)
    pn("Gb5", 38.4, 0.3, 3.0, 0.3)
    pn("F5", 41.2, 0.3, 3.0, 0.3)

    # 45–53s: 速度を落とす
    place(padbuf, pad([hz("Gb2"), hz("Db3"), hz("Bb3"), hz("F4")], 4.6, 0.055), 44.8)
    place(padbuf, pad([hz("Ab2"), hz("Eb3"), hz("Db4"), hz("Gb4")], 4.6, 0.055), 49.0)
    for at, n, v in [(45.0, "Gb2", 0.42), (45.05, "Db3", 0.3), (45.9, "Bb4", 0.26), (46.9, "F5", 0.24), (48.0, "Db5", 0.22),
                     (49.2, "Ab2", 0.42), (49.25, "Eb3", 0.3), (50.1, "Gb4", 0.24), (51.0, "Bb4", 0.22), (52.1, "Eb5", 0.2)]:
        pn(n, at, v, 5.0, 0.15)

    # 53–60s: タイトル。主和音を一度だけ鳴らして余韻
    place(padbuf, pad([hz("Db3"), hz("Ab3"), hz("F4"), hz("C5")], 7.5, 0.055), 52.9)
    for j, n in enumerate(["Db2", "Ab2", "F3", "C4", "Eb4", "Ab4", "F5"]):
        pn(n, 53.1 + j * 0.07, 0.40 - j * 0.02, 7.0, -0.3 + j * 0.1)

    mus[:, 0] += padbuf
    mus[:, 1] += padbuf
    mus = reverb(mus, sec=3.6, wet=0.42)
    mus = mus[: int(total * SR)]
    mus = fade(mus, fin=0.05, fout=2.2)
    return mus * (0.9 / np.max(np.abs(mus)))


# ---------------------------------------------------------------- sfx
def sfx_rain(dur):
    base = fft_filter(noise(dur), lo=500, hi=4500, slope=4) * 0.22
    drops = np.zeros(int(dur * SR))
    for _ in range(int(dur * 70)):
        i = rng.integers(0, len(drops) - 2000)
        d = int(rng.uniform(250, 900))
        tt = np.arange(d) / SR
        drops[i : i + d] += rng.uniform(0.1, 0.5) * np.sin(2 * np.pi * rng.uniform(2000, 5000) * tt) * np.exp(-tt / 0.004)
    x = base + fft_filter(drops, lo=1200) * 0.5
    return fade(reverb(x, 1.2, 0.25), 0.6, 1.0)


def sfx_wind(dur):
    t = t_axis(dur)
    n = noise(dur)
    lo = fft_filter(n, lo=120, hi=700, slope=4)
    gust = 0.55 + 0.45 * np.sin(2 * np.pi * 0.23 * t + 1.0) * np.sin(2 * np.pi * 0.07 * t + 0.3)
    whistle = fft_filter(noise(dur), lo=1100, hi=1500, slope=6) * (0.3 + 0.7 * np.clip(gust - 0.6, 0, 1))
    x = (lo * 0.6 + whistle * 0.8) * gust
    return fade(np.stack([x, np.roll(x, 900)], axis=1), 0.8, 1.2)


def sfx_town(dur):
    hum = fft_filter(noise(dur), lo=60, hi=400, slope=4) * 0.35
    air = fft_filter(noise(dur), lo=1500, hi=3500, slope=4) * 0.025
    x = hum + air
    return fade(np.stack([x, np.roll(x, 1500)], axis=1), 1.0, 1.4)


def sfx_room(dur):
    x = fft_filter(noise(dur), lo=80, hi=900, slope=4) * 0.18
    return fade(x, 0.6, 0.8)


def sfx_train(dur):
    t = t_axis(dur)
    rumble = fft_filter(noise(dur), lo=40, hi=300, slope=3)
    clack = np.zeros_like(t)
    for k in np.arange(0.5, dur - 0.5, 0.42):
        i = int(k * SR)
        d = int(0.05 * SR)
        clack[i : i + d] += np.exp(-np.arange(d) / SR / 0.01) * (1 if int(k / 0.42) % 2 else 0.6)
    clack = fft_filter(clack * noise(dur), lo=200, hi=1500)
    swell = np.sin(np.pi * t / dur) ** 2
    return reverb((rumble * 0.6 + clack * 0.3) * swell, 2.0, 0.5)


def sfx_door():
    """隣室のドア：ラッチの金属音と、蝶番の短いきしみ。"""
    d = 1.6
    t = t_axis(d)
    x = np.zeros_like(t)
    latch = fft_filter(noise(0.04), lo=1500, hi=7000) * env_ad(int(0.04 * SR), 0.0005, 0.006)
    x[: len(latch)] += latch * 0.8
    i2 = int(0.09 * SR)
    l2 = fft_filter(noise(0.05), lo=900, hi=4000) * env_ad(int(0.05 * SR), 0.0005, 0.012)
    x[i2 : i2 + len(l2)] += l2 * 0.6
    tc = t_axis(0.8)
    f0 = 330 + 80 * np.sin(2 * np.pi * 1.3 * tc)
    creak = np.sign(np.sin(2 * np.pi * np.cumsum(f0) / SR)) * (0.5 + 0.5 * np.sin(2 * np.pi * 23 * tc))
    creak = fft_filter(creak, lo=400, hi=2500) * np.sin(np.pi * tc / 0.8) ** 2 * 0.08
    i3 = int(0.3 * SR)
    x[i3 : i3 + len(creak)] += creak
    return reverb(x, 0.9, 0.3)


def sfx_cup():
    d = 1.4
    t = t_axis(d)
    x = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / dd) for f, a, dd in [(2630, 0.5, 0.25), (3970, 0.35, 0.18), (5410, 0.2, 0.12), (1720, 0.25, 0.3)])
    x2 = np.zeros_like(x)
    i = int(0.11 * SR)
    x2[i:] = x[: len(x) - i] * 0.45
    tick = fft_filter(noise(d), lo=3000) * np.exp(-t / 0.002) * 0.4
    return reverb((x + x2 + tick) * 0.5, 1.0, 0.25)


def sfx_bell():
    d = 2.6
    t = t_axis(d)
    y = np.zeros_like(t)
    for k, at in enumerate([0.0, 0.17, 0.31]):
        tt = np.clip(t - at, 0, None)
        on = (t >= at).astype(float)
        y += on * (0.9 - 0.25 * k) * sum(a * np.sin(2 * np.pi * f * tt) * np.exp(-tt / dd)
                                         for f, a, dd in [(1870, 0.5, 0.8), (2810, 0.3, 0.5), (4630, 0.2, 0.3), (5920, 0.12, 0.2)])
    return reverb(y * 0.35, 1.8, 0.35)


def sfx_drip(dur):
    x = np.zeros(int(dur * SR))
    for at in np.sort(rng.uniform(0.05, dur - 0.2, 7)):
        tt = t_axis(0.12)
        f = rng.uniform(900, 1600)
        drop = np.sin(2 * np.pi * (f + 900 * np.exp(-tt / 0.02)) * tt) * np.exp(-tt / 0.03)
        place(x, drop * rng.uniform(0.2, 0.5), at)
    return fade(reverb(x, 1.4, 0.4), 0.05, 0.4)


def sfx_chime():
    d = 3.0
    t = t_axis(d)
    y = np.zeros_like(t)
    for at, f in [(0.0, 2349), (0.12, 2793), (0.26, 3136), (0.41, 3520)]:
        tt = np.clip(t - at, 0, None)
        y += (t >= at) * (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2.76 * tt)) * np.exp(-tt / 0.7)
    return reverb(y * 0.18, 2.2, 0.45)


def sfx_shimmer():
    """窓の反射：ガラスを撫でるような上昇音。"""
    d = 2.6
    t = t_axis(d)
    y = np.zeros_like(t)
    for k in range(9):
        at = k * 0.09
        f = 1800 * 2 ** (k * 2 / 12) * (1 if k % 2 else 1.5)
        tt = np.clip(t - at, 0, None)
        y += (t >= at) * np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.5) * (0.5 + 0.5 * np.sin(2 * np.pi * 5.5 * tt))
    sweep = fft_filter(noise(d), lo=4000, hi=9000) * np.sin(np.pi * np.clip(t / 1.2, 0, 1)) ** 2 * 0.15
    return reverb((y * 0.12 + sweep), 2.4, 0.5)


def sfx_shutter():
    d = 0.9
    x = np.zeros(int(d * SR))
    for at, g, dd in [(0.0, 0.9, 0.006), (0.004, 0.5, 0.02), (0.085, 0.7, 0.008), (0.09, 0.4, 0.03)]:
        c = fft_filter(noise(0.08), lo=800, hi=8000) * env_ad(int(0.08 * SR), 0.0003, dd)
        place(x, c * g, at)
    return reverb(x * 0.7, 0.6, 0.2)


def sfx_tap():
    d = 0.5
    t = t_axis(d)
    y = np.sin(2 * np.pi * 1320 * t) * np.exp(-t / 0.05) * 0.25 + np.sin(2 * np.pi * 1980 * t) * np.exp(-t / 0.03) * 0.12
    return reverb(y, 0.8, 0.3)


def sfx_steps(dur):
    x = np.zeros(int(dur * SR))
    for k, at in enumerate(np.arange(0.05, dur - 0.15, 0.36)):
        s = fft_filter(noise(0.12), lo=150, hi=2500) * env_ad(int(0.12 * SR), 0.002, 0.025)
        place(x, s * (0.7 if k % 2 else 0.5), at)
    return reverb(x, 1.0, 0.3)


GEN = {
    "rain": sfx_rain, "wind": sfx_wind, "town": sfx_town, "room": sfx_room, "train": sfx_train, "drip": sfx_drip, "steps": sfx_steps,
    "door": sfx_door, "cup": sfx_cup, "bell": sfx_bell, "chime": sfx_chime, "shimmer": sfx_shimmer, "shutter": sfx_shutter, "tap": sfx_tap,
}


def main():
    write_wav(os.path.join(OUT, "music.wav"), make_music())
    print("music.wav")
    done = set()
    for cue in TL["sfx"]:
        key = cue["id"] + (f"_{cue['dur']}" if "dur" in cue else "")
        if key in done:
            continue
        done.add(key)
        fn = GEN[cue["id"]]
        x = fn(cue["dur"]) if "dur" in cue else fn()
        write_wav(os.path.join(OUT, "sfx", key + ".wav"), x)
        print("sfx/" + key + ".wav")


if __name__ == "__main__":
    main()
