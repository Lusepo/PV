# 『夜の隣席』PV（60秒・縦型 1080×1920）

ノベルゲーム『夜の隣席』（https://lusepo.github.io/yoru-no-rinseki/game/ ）のPV制作一式です。
映像は [Remotion](https://www.remotion.dev/)（React で映像を組むツール）で作っています。音声はすべて `audio/make_audio.py` で新規に合成しました。

- 完成版: `out/yoru-no-rinseki_pv_1080x1920.mp4`（H.264 / AAC、30fps、60.0秒）
- 尺とカット構成: `src/PV.tsx`（各カットは `<Shot from={秒} to={秒}>`）
- 環境音の位置と音量: `src/timeline.json`

## 構成

| 秒 | 内容 | 素材 |
|---|---|---|
| 0–7 | 夕暮れの坂のシェアハウス → 隣室の廊下。縦書きコピー「知らない街で、／夜だけが少し近かった。」 | bg_sharehouse_ext_dusk, bg_sharehouse_hall_night |
| 7–11 | リリア：ドアが開く動きのワイプで登場。「お隣さん、夜食いる？」 | cg_lilia_1 |
| 11–15 | 坂を下りる → ルミア：写真館カフェ、カップの湯気。「……閉店、あと一杯ぶんはあるよ。」 | bg_street_night_clear, cg_lumia_1 |
| 15–19 | 雨の街路 → クレア：タオルを差し出す。「タオル、使ってください。風邪ひいちゃいますよ。」 | bg_street_rain_evening, cg_claire_1 |
| 19–23 | 雨上がりの路面 → セシリア：花屋カフェ（背景と立ち絵の二層で視差）。「そのユリ、あなたが選んだなら……それでいいです。」 | bg_street_after_rain, bg_flower_cafe_night, cecilia_neutral |
| 23–27 | 風の坂 → セレーヌ：屋上バー（視差、風の光の筋）。「隣、空いてるよ。座るなら静かにね。」 | bg_street_night_wind, bg_rooftop_bar_wind, selene_neutral |
| 27–31 | 商店街の窓 → ルシェ：窓の中の反射に先行する残像。「ごめんね。きみの反射、ちょっとだけ借りちゃった。」 | bg_shopstreet_night, cg_luche_1 |
| 31–36 | 雨傘のリリア → 霧の歩道橋でカメラを構えるルミア（シャッター音と閃光） | cg_lilia_2, cg_lumia_2 |
| 36–40.5 | 実際のゲーム画面：リリアへの返答の選択肢 → 「今夜どこへ行くか」の7択。コピー「誰に会いに行くか。何を言うか。」 | capture/choice_lilia.png, capture/choice_free.png |
| 40.5–45 | クレア（花と横顔）→ セシリア（星の窓辺）→ ルシェ（噴水から手を差し出す） | cg_claire_2, cg_cecilia_1, cg_luche_2 |
| 45–50 | 屋上バーの隣席のセレーヌと夜景。引きの画で隣に置いた手が見える | cg_selene_1 |
| 50–53 | 誰も座っていない屋上バーのスツール。縦書きコピー「今夜、誰の隣に座ろう。」 | bg_rooftop_bar_calm |
| 53–60 | タイトル『夜の隣席』、yoru no rinseki、「ブラウザでプレイ」とURL（約5.4秒表示） | 同上（ゲームのタイトル画面と同じ背景） |

台詞6つは、すべて `script/game_script.json` の共通ルートにある原作の台詞と一致することを確認済みです（話者・表記とも）。
コピー3つ（冒頭・選択肢パート・締め）は、PV用に新しく書いた文で、原作の台詞ではありません。

## ネタバレへの配慮

- 告白・結末に近いCGは使っていません：`cg_*_3`（各ルートの終盤）、`cg_normal`（ノーマルエンド）。
- 個別ルートのCGで使ったのは、ルート序盤から中盤の情景だけです（`cg_lumia_1`、`cg_selene_1`、`cg_cecilia_1`、`*_2`）。ルート固有の台詞や展開は字幕に出していません。
- `cg_cecilia_2`（肩にもたれる）、`cg_selene_2`、`cg_selene_3`、`cg_luche_3` などは、関係の進展が強く見えるため外しました。

## 使用素材一覧

すべて `lusepo/yoru-no-rinseki` の `art/` から、加工せずにコピーしています（`public/art/`）。拡大と平行移動のカメラだけを使い、顔・髪・衣装・輪郭を変形させる処理はしていません。

- 背景（11枚）: bg_sharehouse_ext_dusk / bg_sharehouse_hall_night / bg_sharehouse_room_night（選択肢パートの背景、ぼかし） / bg_street_night_clear / bg_street_rain_evening / bg_street_after_rain / bg_flower_cafe_night / bg_street_night_wind / bg_rooftop_bar_wind / bg_shopstreet_night / bg_rooftop_bar_calm
- CG（10枚）: cg_lilia_1, cg_lilia_2, cg_lumia_1, cg_lumia_2, cg_claire_1, cg_claire_2, cg_cecilia_1, cg_selene_1, cg_luche_1, cg_luche_2
- 立ち絵（2枚、透過PNG）: cecilia_neutral, selene_neutral
- ゲーム画面キャプチャ（2枚）: `public/capture/`。`capture/capture_game.js` が実際のゲーム（`game/index.html`）を Chromium で自動プレイし、選択肢が出た時点で 1080×1920 相当で撮影したもの
- フォント（SIL Open Font License、`public/fonts/` にライセンス同梱）: Shippori Mincho（Medium / SemiBold）、Zen Kaku Gothic New（Medium）
- 音声（すべて新規合成、`public/audio/`）: BGM `music.wav`（Db長調の控えめなピアノとパッド）、環境音 `sfx/`（街のざわめき、遠い電車、ドア、足音、店内の空気、カップ、雨、ドアベル、雨だれ、チャイム、風、ガラスのきらめき、シャッター、タップ）

既存の楽曲・効果音は使っていません。ゲーム本体にも音声ファイルはありません（`engine.js` が `bgm` / `se` 命令を無視する作り）。

## 不足素材と、あると良くなるもの

1. **BGM・効果音の本番素材**：今の音はプログラムで合成した仮の音です。曲の雰囲気は決めてありますが、生演奏や市販の音源ほどの質感はありません。利用条件を確認済みの楽曲があれば、`public/audio/music.wav` を差し替えるだけで入れ替わります。
2. **ボイス**：ゲームにボイスがないため、台詞は字幕だけで見せています。
3. **立ち絵のある背景**：リリア・クレア・ルシェ・ルミアは立ち絵もありますが、今回はCGを優先しました。差し替えたい場合は `src/PV.tsx` の `<Parallax>` を使えます。
4. **ロゴ画像**：ゲームのタイトルはHTMLの文字（明朝体）なので、PVでも Shippori Mincho で組んでいます。正式なロゴ画像があれば差し替えてください。

## 再書き出しの手順

必要なもの: Node.js 18以上、Python 3 と numpy、ffmpeg（Remotion が同梱のものを使うので必須ではない）。

```bash
npm install
```

音声を作り直す（`src/timeline.json` を変えたとき）:

```bash
npm run audio
```

プレビュー（ブラウザで Remotion Studio が開く）:

```bash
npm run studio
```

書き出し（`out/yoru-no-rinseki_pv_1080x1920.mp4` に出力）:

```bash
npm run render
```

1フレームだけ静止画で確認:

```bash
npx remotion still src/index.ts YoruPV out/still.png --frame=300
```

- 初回の書き出し時、Remotion は Chrome Headless Shell を自動で取得します。すでにある Chromium を使う場合は環境変数 `REMOTION_BROWSER` に実行ファイルのパスを入れてください（`remotion.config.ts` 参照）。
- ゲーム画面のキャプチャを撮り直す場合（Playwright が必要）:

```bash
node capture/capture_game.js ../yoru-no-rinseki
```

### よく触る場所

- カットの尺：`src/PV.tsx` の `<Shot from to>`。音の位置は `src/timeline.json` の `at` も合わせて動かす
- 台詞・人物名・場所ラベル：`src/PV.tsx` の `<Line>` と `<Loc>`
- 文字の大きさ・位置：`src/text.tsx`
- 雨・湯気・風・光：`src/fx.tsx`

## ライセンスについて

- Remotion は個人や小規模チームなら無料で使えますが、一定規模以上の会社での利用には有料ライセンスが必要です（https://www.remotion.dev/license ）。
- キャラクター・背景・CGの権利は原作者に帰属します。
