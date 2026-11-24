import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setCodec("h264");
Config.setCrf(16);
Config.setPixelFormat("yuv420p");
Config.setAudioCodec("aac");
Config.setOverwriteOutput(true);

// このクラウド環境に入っている Chromium を使う。ローカルでは REMOTION_BROWSER を外せば
// Remotion が自動で Chrome Headless Shell を取得する。
if (process.env.REMOTION_BROWSER) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
}
Config.setConcurrency(null);
