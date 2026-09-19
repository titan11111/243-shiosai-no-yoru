// ダッシュ（早送り）の検証。既存の verify.cjs とは別立て。
const {chromium}=require('../playwright-test/node_modules/playwright');
const assert=require('assert');
const ok=m=>console.log('PASS '+m);
(async()=>{
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('file://'+__dirname+'/shiosai-no-yoru.html');
const lastLi=id=>page.evaluate(i=>S[i].lines.length-1,id);
const st=()=>page.evaluate(()=>({cur,li,typing,hold,lock,dash:$dash.classList.contains('on'),
  btn:$dashBtn.textContent,press:$dashBtn.getAttribute('aria-pressed'),
  choices:document.querySelectorAll('.choice').length}));

// 1) 短いタップはこれまで通り1行送り（ダッシュしない）
await page.click('#startBtn');
await page.click('#text');                       // 表示中タップ＝全文表示
await page.click('#text');                       // 次の行へ
let s=await st();assert.equal(s.cur,'start');assert.equal(s.li,1);assert.equal(s.hold,false);
ok('短いタップは従来どおり1行送り（ダッシュ誤爆なし）');

// 2) 長押しでダッシュ開始 → 離すと停止
await page.mouse.move(195,500);await page.mouse.down();
await page.waitForTimeout(400);
s=await st();assert.equal(s.hold,true);assert.equal(s.dash,true);
const at=s.li+(s.cur==='start'?0:100);
await page.waitForTimeout(600);
const s2=await st();assert.ok(s2.cur!=='start'||s2.li>at,'長押し中に読み進んでいない');
await page.mouse.up();
await page.waitForTimeout(300);
const s3=await st();assert.equal(s3.hold,false);assert.equal(s3.dash,false);
const s4=await st();assert.deepEqual([s4.cur,s4.li],[s3.cur,s3.li],'指を離した後も進み続けている');
ok('長押しでダッシュ開始、指を離すと即停止');

// 3) 選択肢に着いたら自動で止まる（勝手に選ばれない）
await page.mouse.down();await page.waitForTimeout(4000);
s=await st();
assert.equal(s.cur,'blackout');assert.equal(s.li,await lastLi('blackout'));assert.equal(s.choices,2);
assert.equal(s.hold,false);assert.equal(s.dash,false);
await page.mouse.up();
ok('選択肢の手前でダッシュが自動停止（選択肢を飛ばさない）');

// 4) パネルのトグルでハンズフリー・ダッシュ、選択肢で自動オフ
await page.locator('.choice').nth(1).click();     // gather へ
await page.click('#dashBtn');
s=await st();assert.equal(s.lock,true);assert.equal(s.btn,'ダッシュ中');assert.equal(s.press,'true');
await page.waitForTimeout(3000);
s=await st();
assert.equal(s.cur,'gather');assert.equal(s.li,await lastLi('gather'));assert.equal(s.choices,2);
assert.equal(s.lock,false);assert.equal(s.btn,'ダッシュ');assert.equal(s.press,'false');
ok('トグルでハンズフリー・ダッシュ、選択肢で自動オフ');

// 5) Shift 押しっぱなしでダッシュ
await page.locator('.choice').nth(1).click();     // light へ
await page.keyboard.down('Shift');
await page.waitForTimeout(500);
s=await st();assert.equal(s.hold,true);
await page.keyboard.up('Shift');
await page.waitForTimeout(300);
s=await st();assert.equal(s.hold,false);assert.ok(s.li>0,'Shiftで進んでいない');
ok('Shift押しっぱなしでダッシュ');

// 6) エンディングでも止まる（勝手にタイトルへ戻らない）
await page.click('#dashBtn');
await page.waitForTimeout(6000);
s=await st();
assert.equal(s.cur,'reason');assert.equal(s.choices,2);assert.equal(s.lock,false);
await page.locator('.choice').nth(1).click();     // confession
await page.click('#dashBtn');await page.waitForTimeout(3000);
await page.locator('.choice').nth(1).click();     // true_end
await page.click('#dashBtn');await page.waitForTimeout(5000);
s=await st();
assert.equal(s.cur,'true_end');assert.equal(s.li,await lastLi('true_end'));assert.equal(s.lock,false);
assert.equal(await page.locator('#title').isVisible(),false,'ダッシュがエンディングを踏み越えた');
assert.ok((await page.locator('.choice').innerText()).includes('タイトルへ戻る'));
ok('エンディングでも自動停止（タイトルへ戻るを勝手に押さない）');

// 7) タイトルへ戻るとダッシュ解除
await page.click('#dashBtn');
await page.locator('#restartBtn').click();
s=await st();assert.equal(s.lock,false);assert.equal(s.hold,false);assert.equal(s.dash,false);
ok('タイトルへ戻るとダッシュ解除');

// 8) 横スクロールなし・JSエラーなし
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
assert.deepEqual(errors,[]);
ok('横スクロールなし・JSエラー0件');
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
