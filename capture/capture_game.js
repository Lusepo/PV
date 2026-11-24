// ゲーム画面（選択肢）を 1080x1920 相当で撮影する。
// 使い方: node capture/capture_game.js <yoru-no-rinseki のパス>
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const root = path.resolve(process.argv[2] || '../yoru-no-rinseki');
const out = path.resolve(__dirname, '../public/capture');
const types = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png' };
const srv = http.createServer((q, r) => { let p = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (p.endsWith('/')) p += 'index.html';
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); });
srv.listen(8765, async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 390, height: 693 }, deviceScaleFactor: 1080 / 390 });
  await pg.goto('http://localhost:8765/game/'); await pg.waitForTimeout(1500);
  await pg.click('#title [data-act=new]'); await pg.waitForTimeout(800);
  const shots = { lilia: false, free: false };
  for (let i = 0; i < 1500 && !shots.free; i++) {
    if (await pg.isVisible('#p-name')) { await pg.fill('#name-input', 'ハル'); await pg.click('#name-ok'); await pg.waitForTimeout(500); continue; }
    if (await pg.isVisible('#choices')) {
      await pg.waitForTimeout(700);
      const opts = await pg.$$eval('#choices button', bs => bs.map(b => b.textContent));
      if (opts.length >= 6) { await pg.screenshot({ path: out + '/choice_free.png' }); shots.free = true; break; }
      if (!shots.lilia && opts[0].includes('もらえる')) { await pg.screenshot({ path: out + '/choice_lilia.png' }); shots.lilia = true; }
      await pg.click('#choices button >> nth=0'); await pg.waitForTimeout(500); continue;
    }
    await pg.keyboard.press('Space'); await pg.waitForTimeout(90);
    if (await pg.isVisible('#choices')) continue;
    await pg.keyboard.press('Space'); await pg.waitForTimeout(200);
  }
  console.log(shots); await b.close(); srv.close();
});
