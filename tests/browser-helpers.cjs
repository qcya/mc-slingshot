const {expect}=require('@playwright/test');
async function ready(page,{level=0,unlocked=5}={}){
 if(unlocked>1)await page.addInitScript(n=>localStorage.setItem('mc-block-launch.campaign.v1',JSON.stringify({unlocked:n,completed:[]})),unlocked);
 await page.goto('/');await page.waitForFunction(()=>window.MCBlockLaunch);await page.locator('#level-'+level).click();
 await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().screen)).toBe('play');
}
async function chooseLevel(page,level){
 if(await page.evaluate(()=>MCBlockLaunch.getStatus().screen)==='play')await page.keyboard.press('Escape');
 if(await page.locator('#levelMenuBtn').isVisible())await page.locator('#levelMenuBtn').click();
 else if(await page.locator('#resultLevels').isVisible())await page.locator('#resultLevels').click();
 await page.locator('#level-'+level).click();
}
async function restart(page){
 const screen=await page.evaluate(()=>MCBlockLaunch.getStatus().screen);
 if(screen==='play')await page.keyboard.press('r');else if(screen==='result')await page.locator('#retryBtn').click();else await page.locator('#restart').click();
}
async function aim(page,dx,dy){
 const b=await page.locator('#stage').boundingBox(),p=await page.evaluate(()=>MCBlockLaunch.getStatus().launcher),x=b.x+p.x*b.width/1536,y=b.y+p.y*b.height/864;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx*b.width/1536,y+dy*b.height/864,{steps:12});return {x,y};
}
async function shot(page,slot=1,dx=128,dy=34){await page.keyboard.press(String(slot));await aim(page,-dx,dy);await page.mouse.up();}
module.exports={ready,chooseLevel,restart,aim,shot};
