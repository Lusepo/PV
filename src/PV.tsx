// 『夜の隣席』PV 本編（60秒 / 1080x1920 / 30fps）。
// 秒数はすべてこのファイルの SHOTS と src/timeline.json（環境音）にまとまっている。
import React from "react";
import { AbsoluteFill, Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import tl from "./timeline.json";
import { Bokeh, Cam, ease, easeInOut, GlassSweep, H, Pic, Rain, Standee, Steam, Vignette, W, Wind } from "./fx";
import { ACCENT, Caption, GOTHIC, INK, Line, Loc, MINCHO, VCopy } from "./text";

const FPS = tl.fps;
const s = (sec: number) => Math.round(sec * FPS);

type In = "cut" | "fade" | "wipe" | "blur" | "flash";

/** 1カット。from〜to 秒の間だけ表示。入りの効果は後のカットが前のカットに重なることで成立する。 */
const Shot: React.FC<{ from: number; to: number; enter?: In; inDur?: number; fadeOut?: number; children: React.ReactNode }> = ({
  from, to, enter = "fade", inDur = 0.5, fadeOut = 0, children,
}) => (
  <Sequence from={s(from)} durationInFrames={s(to) - s(from)}>
    <ShotBody len={s(to) - s(from)} enter={enter} inDur={s(inDur)} fadeOut={s(fadeOut)}>{children}</ShotBody>
  </Sequence>
);

const ShotBody: React.FC<{ len: number; enter: In; inDur: number; fadeOut: number; children: React.ReactNode }> = ({ len, enter, inDur, fadeOut, children }) => {
  const f = useCurrentFrame();
  const p = enter === "cut" ? 1 : interpolate(f, [0, Math.max(1, inDur)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const out = fadeOut ? interpolate(f, [len - fadeOut, len], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const style: React.CSSProperties = { opacity: out };
  if (enter === "fade" || enter === "flash") style.opacity = (style.opacity as number) * p;
  if (enter === "blur") { style.opacity = (style.opacity as number) * p; style.filter = `blur(${(1 - p) * 22}px)`; }
  if (enter === "wipe") style.clipPath = `inset(0 ${(1 - p) * 100}% 0 0)`;
  return (
    <AbsoluteFill style={style}>
      {children}
      {enter === "flash" && <AbsoluteFill style={{ background: "#fff", opacity: interpolate(f, [0, 2, 12], [0.95, 0.85, 0], { extrapolateRight: "clamp" }) }} />}
    </AbsoluteFill>
  );
};

/** 奥行きのための二層カメラ：背景はゆっくり、立ち絵は少し大きく動かす。 */
const Parallax: React.FC<{ bg: string; standee: string; len: number; bgFrom: number; bgTo: number; stFrom: number; stTo: number; sway?: boolean }> = ({
  bg, standee, len, bgFrom, bgTo, stFrom, stTo, sway,
}) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, len], [0, 1], { extrapolateRight: "clamp", easing: easeInOut });
  const sw = sway ? Math.sin(f / 7) * 3 + Math.sin(f / 3.1) * 1.2 : 0;
  const stIn = interpolate(f, [0, 16], [0, 1], { extrapolateRight: "clamp", easing: ease });
  return (
    <AbsoluteFill>
      <Cam from={{ s: 1.1, x: bgFrom }} to={{ s: 1.12, x: bgTo }} dur={len}>
        <AbsoluteFill style={{ transform: `translateX(${sw}px)` }}><Pic src={bg} /></AbsoluteFill>
      </Cam>
      <Standee src={standee} dx={stFrom + (stTo - stFrom) * t + (1 - stIn) * 30} scale={1.0 + 0.03 * t} opacity={stIn} />
    </AbsoluteFill>
  );
};

/** 窓の反射が本人より先に動く：窓の部分だけ、半拍遅れの残像を重ねる。 */
const ReflectionEcho: React.FC<{ src: string; left: number }> = ({ src, left }) => {
  const f = useCurrentFrame();
  const lag = interpolate(f, [0, 30, 70], [26, 10, 0], { extrapolateRight: "clamp", easing: ease });
  const o = interpolate(f, [0, 10, 60, 80], [0, 0.42, 0.25, 0], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left, top: 0, width: W - left, height: H, overflow: "hidden", opacity: o, mixBlendMode: "screen" }}>
      <Img src={staticFile(src)} style={{ position: "absolute", left: -left - lag, top: -lag * 0.3, width: W, height: H }} />
    </div>
  );
};

/** ゲーム画面の実機キャプチャ。端末の画面のように縮めて置き、選択肢にカーソルを当てる。 */
const GameScreen: React.FC<{ src: string; len: number; hovers: { at: number; y: number }[]; tapAt?: number; tapY?: number }> = ({ src, len, hovers, tapAt, tapY }) => {
  const f = useCurrentFrame();
  const sc = 0.8;
  const top = 250;
  const left = (W - W * sc) / 2;
  const push = interpolate(f, [0, len], [1, 1.025]);
  let hy = hovers[0].y;
  for (let i = 1; i < hovers.length; i++) {
    const k = interpolate(f, [hovers[i].at, hovers[i].at + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
    hy = hy + (hovers[i].y - hy) * k;
  }
  const hoverOn = interpolate(f, [hovers[0].at, hovers[0].at + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tp = tapAt !== undefined ? interpolate(f, [tapAt, tapAt + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  return (
    <AbsoluteFill>
      <div style={{
        position: "absolute", left, top, width: W * sc, height: H * sc, borderRadius: 34, overflow: "hidden",
        boxShadow: "0 30px 80px rgba(0,0,0,.6), 0 0 0 2px rgba(201,168,106,.35)", transform: `scale(${push})`, transformOrigin: "50% 40%",
      }}>
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%" }} />
        {/* 選択肢のハイライト（キャプチャ座標 1080x1920 → 縮小） */}
        <div style={{
          position: "absolute", left: 64 * sc, width: (1016 - 64) * sc, top: (hy - 52) * sc, height: 104 * sc, borderRadius: 24 * sc,
          boxShadow: `0 0 0 ${3}px ${ACCENT}, 0 0 28px rgba(201,168,106,.55)`, background: "rgba(201,168,106,.14)", opacity: hoverOn,
        }} />
        {tapAt !== undefined && tp > 0 && tp < 1 && (
          <div style={{
            position: "absolute", left: 540 * sc - 90 * tp * sc * 2, top: (tapY ?? hy) * sc - 90 * tp * sc * 2, width: 180 * tp * sc * 2, height: 180 * tp * sc * 2,
            borderRadius: "50%", border: `3px solid rgba(255,240,210,${1 - tp})`, background: `rgba(255,240,210,${0.25 * (1 - tp)})`,
          }} />
        )}
      </div>
    </AbsoluteFill>
  );
};

const Title: React.FC = () => {
  const f = useCurrentFrame(); // 53.0 秒を 0 とする
  const veil = interpolate(f, [0, 30], [0, 0.55], { extrapolateRight: "clamp" });
  const t1 = interpolate(f, [8, 44], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const t2 = interpolate(f, [26, 54], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const t3 = interpolate(f, [44, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(5,6,12,.35), rgba(5,6,12,.15) 35%, rgba(5,6,12,.75) 85%)", opacity: veil / 0.55 }} />
      <div style={{ position: "absolute", top: 560, left: 0, right: 0, textAlign: "center", opacity: t1, transform: `translateY(${(1 - t1) * 18}px)`, filter: `blur(${(1 - t1) * 8}px)` }}>
        <div style={{ fontFamily: MINCHO, fontWeight: 600, fontSize: 168, letterSpacing: "0.28em", textIndent: "0.28em", color: INK, textShadow: "0 4px 30px rgba(0,0,0,.6)" }}>夜の隣席</div>
        <div style={{ marginTop: 26, fontFamily: MINCHO, fontSize: 38, letterSpacing: "0.5em", textIndent: "0.5em", color: "#c9c5d6", opacity: t2 }}>yoru no rinseki</div>
      </div>
      <div style={{ position: "absolute", bottom: 300, left: 0, right: 0, textAlign: "center", opacity: t3, transform: `translateY(${(1 - t3) * 14}px)` }}>
        <div style={{ display: "inline-block", padding: "16px 54px", border: `2px solid ${ACCENT}`, borderRadius: 999, fontFamily: GOTHIC, fontSize: 44, letterSpacing: "0.24em", textIndent: "0.24em", color: INK, background: "rgba(10,11,20,.55)" }}>
          ブラウザでプレイ
        </div>
        <div style={{ marginTop: 34, fontFamily: GOTHIC, fontSize: 38, letterSpacing: "0.03em", color: INK, textShadow: "0 2px 10px rgba(0,0,0,.8)" }}>
          lusepo.github.io/yoru-no-rinseki/game/
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SFX: React.FC = () => (
  <>
    {tl.sfx.map((c, i) => (
      <Sequence key={i} from={s(c.at)}>
        <Audio src={staticFile(`audio/sfx/${c.id}${"dur" in c ? `_${(c as { dur: number }).dur.toFixed(1)}` : ""}.wav`)} volume={c.gain} />
      </Sequence>
    ))}
  </>
);

export const PV: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#05060b" }}>
      {/* ===== 0–7秒：知らない街の夕暮れ ===== */}
      <Shot from={0} to={4.1} enter="fade" inDur={1.0}>
        <Cam from={{ s: 1.2, y: 150 }} to={{ s: 1.08, y: -40 }} dur={s(4.1)}><Pic src="art/bg/bg_sharehouse_ext_dusk.jpg" /></Cam>
        <Vignette />
      </Shot>
      <Shot from={3.6} to={7.4} enter="fade" inDur={0.6}>
        <Cam from={{ s: 1.0 }} to={{ s: 1.16, y: 30 }} dur={s(3.8)} easing={ease}><Pic src="art/bg/bg_sharehouse_hall_night.jpg" /></Cam>
        <Bokeh count={6} opacity={0.25} seed="hall" />
        <Vignette strength={0.6} />
      </Shot>
      <Sequence from={0} durationInFrames={s(7.0)}>
        <VCopy right={150} top={250} end={s(6.9)} lines={[{ text: "知らない街で、", start: s(0.9) }, { text: "夜だけが少し近かった。", start: s(3.4) }]} />
      </Sequence>

      {/* ===== 7–31秒：夜の街で、六人に出会う ===== */}
      {/* リリア：隣室のドアが開く */}
      <Shot from={7.0} to={11.3} enter="wipe" inDur={0.7}>
        <Cam from={{ s: 1.08, x: -30 }} to={{ s: 1.0, x: 0 }} dur={s(4.3)}><Pic src="art/cg/cg_lilia_1.jpg" /></Cam>
        <Bokeh count={8} opacity={0.22} seed="lilia" area={[200, 1200]} />
        <Vignette strength={0.45} />
        <Loc place="シェアハウス・廊下" time="夜" start={s(0.5)} end={s(4.2)} />
        <Line name="リリア" en="Lilia" text="お隣さん、夜食いる？" start={s(0.7)} end={s(4.2)} />
      </Shot>

      {/* 坂を下りる → ルミア：写真館カフェ */}
      <Shot from={11.0} to={12.1} enter="fade" inDur={0.3}>
        <Cam from={{ s: 1.18, y: -120 }} to={{ s: 1.1, y: 90 }} dur={s(1.1)} easing={(t) => t}><Pic src="art/bg/bg_street_night_clear.jpg" /></Cam>
        <Vignette />
      </Shot>
      <Shot from={11.8} to={15.3} enter="fade" inDur={0.4}>
        <Cam from={{ s: 1.12, x: 45 }} to={{ s: 1.12, x: -35 }} dur={s(3.5)}><Pic src="art/cg/cg_lumia_1.jpg" /></Cam>
        <Steam x={395} y={780} opacity={0.55} />
        <Bokeh count={7} opacity={0.3} seed="lumia" area={[300, 1100]} />
        <Vignette strength={0.5} />
        <Loc place="写真館カフェ" time="深夜" start={s(0.3)} end={s(3.4)} />
        <Line name="ルミア" en="Lumia" text={"……閉店、\nあと一杯ぶんはあるよ。"} start={s(0.4)} end={s(3.5)} />
      </Shot>

      {/* 雨 → クレア：古本屋カフェ */}
      <Shot from={15.0} to={16.1} enter="fade" inDur={0.3}>
        <Cam from={{ s: 1.05, y: 40 }} to={{ s: 1.14, y: -40 }} dur={s(1.1)}><Pic src="art/bg/bg_street_rain_evening.jpg" /></Cam>
        <Rain count={170} opacity={0.6} speed={85} />
        <Vignette />
      </Shot>
      <Shot from={15.8} to={19.4} enter="blur" inDur={0.6}>
        <Cam from={{ s: 1.16, y: 40 }} to={{ s: 1.04, y: 0 }} dur={s(3.6)} easing={ease}><Pic src="art/cg/cg_claire_1.jpg" /></Cam>
        <Bokeh count={9} opacity={0.28} seed="claire" area={[100, 900]} />
        <Vignette strength={0.45} />
        <Loc place="古本屋カフェ" time="雨の夕方" start={s(0.4)} end={s(3.5)} />
        <Line name="クレア" en="Claire" text={"タオル、使ってください。\n風邪ひいちゃいますよ。"} start={s(0.4)} end={s(3.6)} />
      </Shot>

      {/* 雨上がり → セシリア：花屋カフェ */}
      <Shot from={19.2} to={20.2} enter="fade" inDur={0.3}>
        <Cam from={{ s: 1.1, y: -60 }} to={{ s: 1.2, y: 120 }} dur={s(1.0)}><Pic src="art/bg/bg_street_after_rain.jpg" /></Cam>
        <Vignette />
      </Shot>
      <Shot from={19.9} to={23.5} enter="fade" inDur={0.4}>
        <Parallax bg="art/bg/bg_flower_cafe_night.jpg" standee="art/standee/cecilia_neutral.png" len={s(3.6)} bgFrom={30} bgTo={-20} stFrom={50} stTo={-15} />
        <Bokeh color="255,240,215" count={8} opacity={0.22} seed="cecilia" area={[200, 1000]} />
        <Vignette strength={0.5} />
        <Loc place="花屋カフェ" time="閉店間際の夜" start={s(0.3)} end={s(3.5)} />
        <Line name="セシリア" en="Cecilia" text={"そのユリ、あなたが選んだなら……\nそれでいいです。"} start={s(0.4)} end={s(3.6)} />
      </Shot>

      {/* 風 → セレーヌ：屋上バー */}
      <Shot from={23.2} to={24.2} enter="fade" inDur={0.3}>
        <Cam from={{ s: 1.12, x: -50 }} to={{ s: 1.16, x: 40, y: -40 }} dur={s(1.0)}><Pic src="art/bg/bg_street_night_wind.jpg" /></Cam>
        <Wind opacity={0.8} seed="w1" />
        <Vignette />
      </Shot>
      <Shot from={23.9} to={27.5} enter="fade" inDur={0.4}>
        <Parallax bg="art/bg/bg_rooftop_bar_wind.jpg" standee="art/standee/selene_neutral.png" len={s(3.6)} bgFrom={-25} bgTo={25} stFrom={-45} stTo={15} sway />
        <Wind opacity={0.6} seed="w2" count={18} />
        <Vignette strength={0.5} />
        <Loc place="屋上バー" time="風の強い夜" start={s(0.3)} end={s(3.5)} />
        <Line name="セレーヌ" en="Selene" text={"隣、空いてるよ。\n座るなら静かにね。"} start={s(0.4)} end={s(3.6)} />
      </Shot>

      {/* 商店街の窓 → ルシェ：反射が先に動く */}
      <Shot from={27.2} to={28.2} enter="fade" inDur={0.3}>
        <Cam from={{ s: 1.0 }} to={{ s: 1.18, x: 60 }} dur={s(1.0)} easing={ease}><Pic src="art/bg/bg_shopstreet_night.jpg" /></Cam>
        <Vignette />
      </Shot>
      <Shot from={27.9} to={31.3} enter="fade" inDur={0.35}>
        <Cam from={{ s: 1.1, x: 50 }} to={{ s: 1.06, x: 10 }} dur={s(3.4)}><Pic src="art/cg/cg_luche_1.jpg" /></Cam>
        <ReflectionEcho src="art/cg/cg_luche_1.jpg" left={600} />
        <GlassSweep start={4} dur={36} left={590} width={490} />
        <Vignette strength={0.5} />
        <Loc place="窓際のカフェ" time="風の夜・帰り" start={s(0.3)} end={s(3.3)} />
        <Line name="ルシェ" en="Luche" text={"ごめんね。きみの反射、\nちょっとだけ借りちゃった。"} start={s(0.4)} end={s(3.4)} />
      </Shot>

      {/* ===== 31–45秒：出会いの先と、選ぶこと ===== */}
      <Shot from={31.0} to={33.8} enter="blur" inDur={0.6}>
        <Cam from={{ s: 1.0, x: 0 }} to={{ s: 1.1, x: -40, y: 30 }} dur={s(2.8)}><Pic src="art/cg/cg_lilia_2.jpg" /></Cam>
        <Rain count={110} opacity={0.4} speed={60} seed="r2" />
        <Vignette strength={0.5} />
      </Shot>
      <Shot from={33.6} to={36.2} enter="fade" inDur={0.35}>
        <ShutterCam />
      </Shot>
      <Shot from={36.0} to={38.2} enter="fade" inDur={0.4}>
        <Pic src="art/bg/bg_sharehouse_room_night.jpg" style={{ filter: "blur(18px) brightness(.55)", transform: "scale(1.1)" }} />
        <GameScreen src="capture/choice_lilia.png" len={s(2.2)} hovers={[{ at: s(0.35), y: 940 }]} tapAt={s(0.95)} tapY={940} />
      </Shot>
      <Shot from={38.0} to={40.6} enter="fade" inDur={0.3}>
        <Pic src="art/bg/bg_sharehouse_room_night.jpg" style={{ filter: "blur(18px) brightness(.55)", transform: "scale(1.1)" }} />
        <GameScreen src="capture/choice_free.png" len={s(2.6)}
          hovers={[{ at: s(0.2), y: 320 }, { at: s(0.55), y: 456 }, { at: s(0.85), y: 730 }, { at: s(1.1), y: 868 }, { at: s(1.25), y: 730 }]}
          tapAt={s(1.35)} tapY={730} />
      </Shot>
      <Sequence from={s(36.0)} durationInFrames={s(4.6)}>
        <Caption text="誰に会いに行くか。何を言うか。" start={s(0.2)} end={s(4.6)} top={120} />
      </Sequence>
      <Shot from={40.4} to={42.1} enter="fade" inDur={0.4}>
        <Cam from={{ s: 1.12, x: 40 }} to={{ s: 1.06, x: -10 }} dur={s(1.7)}><Pic src="art/cg/cg_claire_2.jpg" /></Cam>
        <Vignette strength={0.5} />
      </Shot>
      <Shot from={41.9} to={43.6} enter="fade" inDur={0.4}>
        <Cam from={{ s: 1.04, y: -30 }} to={{ s: 1.12, y: 20 }} dur={s(1.7)}><Pic src="art/cg/cg_cecilia_1.jpg" /></Cam>
        <GlassSweep start={0} dur={45} width={540} />
        <Vignette strength={0.5} />
      </Shot>
      <Shot from={43.4} to={45.3} enter="fade" inDur={0.4}>
        <Cam from={{ s: 1.12, x: -40 }} to={{ s: 1.05, x: 10 }} dur={s(1.9)}><Pic src="art/cg/cg_luche_2.jpg" /></Cam>
        <Vignette strength={0.5} />
      </Shot>

      {/* ===== 45–53秒：隣にいる人と夜景 ===== */}
      <Shot from={45.0} to={50.0} enter="fade" inDur={0.8}>
        <Cam from={{ s: 1.2, y: 160 }} to={{ s: 1.0, y: 0 }} dur={s(5.0)} easing={easeInOut}><Pic src="art/cg/cg_selene_1.jpg" /></Cam>
        <Vignette strength={0.45} />
      </Shot>
      <Shot from={49.6} to={60} enter="fade" inDur={1.0} fadeOut={0.35}>
        <Cam from={{ s: 1.14, x: 60, y: 40 }} to={{ s: 1.04, x: -10, y: 0 }} dur={s(10.4)} easing={(t) => 1 - Math.pow(1 - t, 2)}><Pic src="art/bg/bg_rooftop_bar_calm.jpg" /></Cam>
        <Vignette strength={0.45} />
        <Sequence from={0} durationInFrames={s(3.4)}>
          <VCopy right={720} top={300} end={s(3.4)} size={84} lines={[{ text: "今夜、誰の隣に座ろう。", start: s(0.5) }]} />
        </Sequence>
        <Sequence from={s(53.0 - 49.6)}>
          <Title />
        </Sequence>
      </Shot>

      <Audio src={staticFile("audio/music.wav")} volume={0.8} />
      <SFX />
    </AbsoluteFill>
  );
};

/** ルミアの霧の歩道橋：シャッター音と同時に白く光り、半拍止まる。 */
const ShutterCam: React.FC = () => {
  const f = useCurrentFrame(); // 33.6 秒を 0 とする
  const shot = s(34.25 - 33.6);
  const sc = f < shot ? 1.0 + f * 0.0016 : 1.035 + (f - shot) * 0.0004;
  const flash = interpolate(f, [shot, shot + 2, shot + 14], [0, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const frame = interpolate(f, [shot + 2, shot + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${sc})` }}><Pic src="art/cg/cg_lumia_2.jpg" /></AbsoluteFill>
      <AbsoluteFill style={{ boxShadow: `inset 0 0 0 ${28 * frame}px rgba(244,241,234,${0.9 * frame})` }} />
      <Vignette strength={0.4} />
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
    </AbsoluteFill>
  );
};
