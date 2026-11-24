// 文字まわり：台詞、人物名、場所ラベル、縦書きコピー。
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ease } from "./fx";

export const MINCHO = "'Shippori Mincho', serif";
export const GOTHIC = "'Zen Kaku Gothic New', sans-serif";
export const INK = "#f4f1ea";
export const ACCENT = "#c9a86a"; // ゲーム本体の --accent と同じ金色

const fadeWindow = (f: number, start: number, end: number, fi = 10, fo = 12) =>
  interpolate(f, [start, start + fi, end - fo, end], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** 1文字ずつ柔らかく現れる文字列（ノベルゲームの文字送りを控えめに再現）。 */
const Reveal: React.FC<{ text: string; start: number; perChar?: number }> = ({ text, start, perChar = 1.6 }) => {
  const f = useCurrentFrame();
  let k = 0;
  return (
    <>
      {text.split("\n").map((ln, li) => (
        <div key={li} style={{ whiteSpace: "nowrap" }}>
          {Array.from(ln).map((ch, ci) => {
            const at = start + k++ * perChar;
            const o = interpolate(f, [at, at + 7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return <span key={ci} style={{ opacity: o, display: "inline-block", transform: `translateY(${(1 - o) * 6}px)` }}>{ch}</span>;
          })}
        </div>
      ))}
    </>
  );
};

/** 画面下部の台詞。顔に重ならないよう下 1/4 に置く。 */
export const Line: React.FC<{ name: string; en: string; text: string; start: number; end: number; bottom?: number }> = ({
  name, en, text, start, end, bottom = 250,
}) => {
  const f = useCurrentFrame();
  const o = fadeWindow(f, start, end);
  const slide = interpolate(f, [start, start + 18], [16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(4,5,12,0) 58%, rgba(4,5,12,0.55) 80%, rgba(4,5,12,0.72) 100%)", opacity: o }} />
      <div style={{ position: "absolute", left: 92, right: 70, bottom, opacity: o, transform: `translateY(${slide}px)` }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginBottom: 22 }}>
          <span style={{ width: 46, height: 2, background: ACCENT, display: "inline-block", transform: "translateY(-12px)" }} />
          <span style={{ fontFamily: MINCHO, fontWeight: 600, fontSize: 46, letterSpacing: "0.16em", color: INK, textShadow: "0 2px 12px rgba(0,0,0,.7)" }}>{name}</span>
          <span style={{ fontFamily: GOTHIC, fontSize: 24, letterSpacing: "0.3em", color: ACCENT, textTransform: "uppercase" }}>{en}</span>
        </div>
        <div style={{ fontFamily: MINCHO, fontWeight: 500, fontSize: 58, lineHeight: 1.62, letterSpacing: "0.04em", color: INK, textShadow: "0 2px 4px rgba(0,0,0,.75), 0 0 24px rgba(0,0,0,.55)" }}>
          <Reveal text={text} start={start + 6} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** 左上の場所ラベル（ゲーム画面の .loc を踏襲）。 */
export const Loc: React.FC<{ place: string; time: string; start: number; end: number }> = ({ place, time, start, end }) => {
  const f = useCurrentFrame();
  const o = fadeWindow(f, start, end, 12, 10);
  return (
    <div style={{
      position: "absolute", top: 130, left: 56, padding: "12px 26px", background: "rgba(8,9,18,.58)", borderLeft: `4px solid ${ACCENT}`,
      fontFamily: GOTHIC, fontSize: 30, letterSpacing: "0.08em", color: INK, opacity: o, display: "flex", gap: 22,
    }}>
      <span>{place}</span><span style={{ color: "#b9b6c8" }}>{time}</span>
    </div>
  );
};

/** 縦書きのコピー。lines は右から左へ並ぶ。 */
export const VCopy: React.FC<{ lines: { text: string; start: number }[]; end: number; right: number; top: number; size?: number }> = ({
  lines, end, right, top, size = 78,
}) => {
  const f = useCurrentFrame();
  const out = interpolate(f, [end - 16, end], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{
      position: "absolute", right, top, writingMode: "vertical-rl", display: "flex", flexDirection: "column", gap: size * 0.55, opacity: out,
      fontFamily: MINCHO, fontWeight: 500, fontSize: size, letterSpacing: "0.22em", color: INK,
      textShadow: "0 0 18px rgba(0,0,0,.65), 0 2px 6px rgba(0,0,0,.6)",
    }}>
      {lines.map((l, i) => (
        <div key={i} style={{ paddingTop: i * size * 1.6 }}>
          <Reveal text={l.text} start={l.start} perChar={3} />
        </div>
      ))}
    </div>
  );
};

/** 横書きの短い説明コピー（選択肢パート）。 */
export const Caption: React.FC<{ text: string; start: number; end: number; top: number }> = ({ text, start, end, top }) => {
  const f = useCurrentFrame();
  const o = fadeWindow(f, start, end, 12, 12);
  return (
    <div style={{
      position: "absolute", top, left: 0, right: 0, textAlign: "center", opacity: o, fontFamily: MINCHO, fontWeight: 500,
      fontSize: 54, letterSpacing: "0.12em", color: INK, textShadow: "0 2px 14px rgba(0,0,0,.7)",
    }}>
      {text}
    </div>
  );
};
