// 画面効果（カメラ、雨、湯気、風、光）。どれも決定的（同じフレームなら同じ絵）。
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export const W = 1080;
export const H = 1920;
export const ease = Easing.bezier(0.33, 0, 0.2, 1);
export const easeInOut = Easing.bezier(0.45, 0, 0.55, 1);

export type CamKey = { s?: number; x?: number; y?: number };

/** 1枚絵を変形させずに、拡大率と平行移動だけでカメラを動かす。端が見えないよう移動量を制限する。 */
export const Cam: React.FC<{
  from: CamKey; to: CamKey; dur: number; children: React.ReactNode; easing?: (t: number) => number; origin?: string;
}> = ({ from, to, dur, children, easing = easeInOut, origin = "50% 50%" }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
  const s = (from.s ?? 1) + ((to.s ?? 1) - (from.s ?? 1)) * t;
  const lim = (v: number, half: number) => Math.max(-(s - 1) * half, Math.min((s - 1) * half, v));
  const x = lim((from.x ?? 0) + ((to.x ?? 0) - (from.x ?? 0)) * t, W / 2);
  const y = lim((from.y ?? 0) + ((to.y ?? 0) - (from.y ?? 0)) * t, H / 2);
  return (
    <AbsoluteFill style={{ transform: `translate(${x}px, ${y}px) scale(${s})`, transformOrigin: origin }}>{children}</AbsoluteFill>
  );
};

export const Pic: React.FC<{ src: string; style?: React.CSSProperties }> = ({ src, style }) => (
  <Img src={staticFile(src)} style={{ position: "absolute", inset: 0, width: W, height: H, objectFit: "cover", ...style }} />
);

/** 立ち絵。ゲームと同じ配置（幅いっぱい・下端をフェード）。 */
export const Standee: React.FC<{ src: string; dx?: number; bottom?: number; scale?: number; opacity?: number }> = ({
  src, dx = 0, bottom = 420, scale = 1, opacity = 1,
}) => (
  <Img
    src={staticFile(src)}
    style={{
      position: "absolute", width: 1080, height: 1440, left: 0, bottom, objectFit: "contain", objectPosition: "50% 100%",
      transform: `translateX(${dx}px) scale(${scale})`, transformOrigin: "50% 100%", opacity,
      WebkitMaskImage: "linear-gradient(to bottom,#000 84%,transparent 100%)",
      maskImage: "linear-gradient(to bottom,#000 84%,transparent 100%)",
    }}
  />
);

/** 雨の筋。 */
export const Rain: React.FC<{ count?: number; opacity?: number; speed?: number; angle?: number; seed?: string }> = ({
  count = 140, opacity = 0.45, speed = 70, angle = 8, seed = "rain",
}) => {
  const f = useCurrentFrame();
  const lines = new Array(count).fill(0).map((_, i) => {
    const x0 = random(`${seed}x${i}`) * (W + 300) - 150;
    const y0 = random(`${seed}y${i}`) * (H + 400);
    const len = 40 + random(`${seed}l${i}`) * 90;
    const sp = speed * (0.7 + random(`${seed}s${i}`) * 0.6);
    const y = ((y0 + f * sp) % (H + 400)) - 200;
    const x = x0 + Math.tan((angle * Math.PI) / 180) * y * 0.3;
    const a = 0.25 + random(`${seed}a${i}`) * 0.6;
    return <line key={i} x1={x} y1={y} x2={x - Math.tan((angle * Math.PI) / 180) * len} y2={y + len} stroke={`rgba(200,215,255,${a})`} strokeWidth={1.6} />;
  });
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: "screen" }}>
      <svg width={W} height={H}>{lines}</svg>
    </AbsoluteFill>
  );
};

/** 湯気。(x,y) から上へ立ちのぼる薄い白。 */
export const Steam: React.FC<{ x: number; y: number; opacity?: number }> = ({ x, y, opacity = 0.5 }) => {
  const f = useCurrentFrame();
  const puffs = new Array(7).fill(0).map((_, i) => {
    const life = 70;
    const p = ((f + i * (life / 7)) % life) / life;
    const sway = Math.sin(f / 13 + i * 1.7) * 14 * p;
    const yy = y - p * 230;
    const a = Math.sin(Math.PI * p) * 0.55;
    const r = 26 + p * 40;
    return (
      <div key={i} style={{
        position: "absolute", left: x + sway - r, top: yy - r * 1.4, width: r * 2, height: r * 2.8, borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(255,250,240,0.9), rgba(255,250,240,0) 70%)", opacity: a, filter: "blur(10px)",
      }} />
    );
  });
  return <AbsoluteFill style={{ opacity, mixBlendMode: "screen" }}>{puffs}</AbsoluteFill>;
};

/** 風に流れる細い光の筋。 */
export const Wind: React.FC<{ count?: number; opacity?: number; seed?: string }> = ({ count = 26, opacity = 0.5, seed = "wind" }) => {
  const f = useCurrentFrame();
  const items = new Array(count).fill(0).map((_, i) => {
    const y = random(`${seed}y${i}`) * H;
    const sp = 38 + random(`${seed}s${i}`) * 40;
    const len = 160 + random(`${seed}l${i}`) * 260;
    const x = ((random(`${seed}x${i}`) * (W + len + 400) + f * sp) % (W + len + 400)) - len - 200;
    const a = 0.08 + random(`${seed}a${i}`) * 0.18;
    const wob = Math.sin(f / 9 + i) * 10;
    return (
      <div key={i} style={{
        position: "absolute", left: x, top: y + wob, width: len, height: 2, borderRadius: 2,
        background: `linear-gradient(90deg, rgba(220,230,255,0), rgba(220,230,255,${a}), rgba(220,230,255,0))`,
      }} />
    );
  });
  return <AbsoluteFill style={{ opacity }}>{items}</AbsoluteFill>;
};

/** 室内の灯りのボケ。 */
export const Bokeh: React.FC<{ color?: string; count?: number; opacity?: number; seed?: string; area?: [number, number] }> = ({
  color = "255,190,120", count = 12, opacity = 0.35, seed = "bokeh", area = [0, H],
}) => {
  const f = useCurrentFrame();
  const items = new Array(count).fill(0).map((_, i) => {
    const r = 20 + random(`${seed}r${i}`) * 60;
    const x = random(`${seed}x${i}`) * W + Math.sin(f / 60 + i) * 18;
    const y = area[0] + random(`${seed}y${i}`) * (area[1] - area[0]) - f * (0.2 + random(`${seed}v${i}`) * 0.4);
    const a = 0.15 + 0.25 * (0.5 + 0.5 * Math.sin(f / 25 + i * 2.1));
    return (
      <div key={i} style={{
        position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%",
        background: `radial-gradient(circle, rgba(${color},${a}) 0%, rgba(${color},${a * 0.6}) 45%, rgba(${color},0) 72%)`, filter: "blur(3px)",
      }} />
    );
  });
  return <AbsoluteFill style={{ opacity, mixBlendMode: "screen" }}>{items}</AbsoluteFill>;
};

/** 斜めに走るやわらかな光（ガラスの反射）。 */
export const GlassSweep: React.FC<{ start: number; dur: number; left?: number; width?: number }> = ({ start, dur, left = 0, width = W }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [start, start + dur], [-0.4, 1.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  return (
    <div style={{ position: "absolute", left, top: 0, width, height: H, overflow: "hidden", mixBlendMode: "screen" }}>
      <div style={{
        position: "absolute", top: -200, height: H + 400, width: 260, left: p * width - 130, transform: "rotate(14deg)",
        background: "linear-gradient(90deg, rgba(210,235,255,0), rgba(210,235,255,0.28), rgba(210,235,255,0))", filter: "blur(6px)",
      }} />
    </div>
  );
};

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.55 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 60% at 50% 45%, rgba(0,0,0,0) 55%, rgba(3,4,10,${strength}) 100%)`, pointerEvents: "none" }} />
);

export const useDur = () => useVideoConfig().durationInFrames;
