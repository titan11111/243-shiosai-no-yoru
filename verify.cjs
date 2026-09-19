const {chromium}=require('../playwright-test/node_modules/playwright');
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/story.js','utf8')+';this.story=STORY',context);
const {scenes,endings}=context.story,paths=[];
function walk(id,path,seen){assert(scenes[id],id);assert(!seen.includes(id),'cycle');const s=scenes[id];if(s.end){paths.push({path,end:s.end});return}if(s.next)walk(s.next,path,[...seen,id]);else s.choices.forEach((c,i)=>walk(c.go,[...path,i],[...seen,id]));}
walk('start',[],[]);assert.equal(paths.length,5);assert.equal(new Set(paths.map(p=>p.end)).size,5);
(async()=>{const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('file://'+__dirname+'/index.html');await page.waitForURL('**/shiosai-no-yoru.html');
for(const route of paths){await page.locator('#startBtn').click();let ci=0;for(let step=0;step<160;step++){
const state=await page.evaluate(()=>({cur,li,n:S[cur].lines.length,end:S[cur].end,choices:!!S[cur].choices,next:S[cur].next}));
if(state.li===state.n-1&&state.end){assert.equal(state.end,route.end);await page.locator('.choice').click();break}
if(state.li===state.n-1&&state.choices){const b=page.locator('.choice').nth(route.path[ci++]);await b.scrollIntoViewIfNeeded();await b.click();}
else await page.locator('#text').click();
if(step===159)throw Error('route did not finish');}
console.log('PASS '+route.end);}
await page.reload();assert((await page.locator('#endcount').innerText()).includes('5／5'));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await page.screenshot({path:__dirname+'/verified-mobile.png'});
await page.setViewportSize({width:1280,height:800});await page.locator('#startBtn').click();await page.keyboard.press('Tab');await page.locator('#soundBtn').click();assert.equal(await page.locator('#soundBtn').innerText(),'音：オン');await page.locator('#soundBtn').click();
await page.locator('#restartBtn').click();await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#startBtn').click();await page.locator('#text').click();assert.equal(await page.evaluate(()=>typing),false);await page.locator('#restartBtn').click();assert.equal(await page.evaluate(()=>typing),false);
assert.deepEqual(errors,[]);console.log('PASS persistence, mobile width, audio toggle, typing/restart, no JS errors');await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
