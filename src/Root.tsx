import React from "react";
import { Composition, staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";
import { PV } from "./PV";
import tl from "./timeline.json";

// フォント（SIL OFL）。public/fonts に同梱。
loadFont({ family: "Shippori Mincho", url: staticFile("fonts/ShipporiMincho-Medium.ttf"), weight: "500" });
loadFont({ family: "Shippori Mincho", url: staticFile("fonts/ShipporiMincho-SemiBold.ttf"), weight: "600" });
loadFont({ family: "Zen Kaku Gothic New", url: staticFile("fonts/ZenKakuGothicNew-Medium.ttf"), weight: "500" });

export const RemotionRoot: React.FC = () => (
  <Composition id="YoruPV" component={PV} durationInFrames={tl.duration * tl.fps} fps={tl.fps} width={tl.width} height={tl.height} />
);
