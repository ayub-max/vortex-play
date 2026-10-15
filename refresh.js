
(function(){
"use strict";
const LANG_KEY="vortexplay.language";
const labels={en:{welcome:"Choose your language",desc:"VORTEX//PLAY will use this language where available.",continue:"Continue",home:"Home",news:"News",library:"Library",history:"History",profile:"Profile",explore:"Explore"},ru:{welcome:"Выберите язык",desc:"VORTEX//PLAY будет использовать выбранный язык там, где это доступно.",continue:"Продолжить",home:"Главная",news:"Новости",library:"Библиотека",history:"История",profile:"Профиль",explore:"Обзор"},uz:{welcome:"Tilni tanlang",desc:"VORTEX//PLAY mavjud joylarda tanlangan tildan foydalanadi.",continue:"Davom etish",home:"Bosh sahifa",news:"Yangiliklar",library:"Kutubxona",history:"Tarix",profile:"Profil",explore:"Kashf etish"}};
let lang=localStorage.getItem(LANG_KEY)||"";
function languagePicker(){
 if(lang)return;
 const m=document.createElement("div");m.className="vp-lang";m.innerHTML='<section class="vp-lang__card"><span class="vp-arcade__badge">VORTEX // PLAY</span><h2>Choose your language</h2><p>Pick the language for your experience.</p><div class="vp-lang__options"><button data-l="en">🇬🇧 English<small>English interface</small></button><button data-l="ru">🇷🇺 Русский<small>Русский интерфейс</small></button><button data-l="uz">🇺🇿 O‘zbekcha<small>O‘zbekcha interfeys</small></button><button data-l="es">🇪🇸 Español<small>Spanish interface</small></button></div></section>';
 document.body.appendChild(m);m.addEventListener("click",e=>{let b=e.target.closest("[data-l]");if(!b)return;lang=b.dataset.l;localStorage.setItem(LANG_KEY,lang);m.remove();applyLanguage();});
}
function applyLanguage(){
 const l=labels[lang];if(!l)return;
 document.documentElement.lang=lang;
 document.querySelectorAll(".nav a").forEach(a=>{let key=a.textContent.trim().toLowerCase();if(l[key])a.textContent=l[key]});
}
const kinds={
 fps:{name:"FIRST-PERSON OPS",mission:"Clear the research wing",goal:"Eliminate 6 hostile drones",help:"WASD move · mouse aim · click/Space shoot · Shift sprint",mode:"fps"},
 survival:{name:"WILDERNESS: LAST LIGHT",mission:"Find supplies and survive",goal:"Collect 5 supply crates and avoid infected",help:"WASD / arrows move · collect glowing supplies · survive",mode:"survival"},
 runner:{name:"SKYLINE RUNNER",mission:"Escape the collapsing city",goal:"Reach the extraction beacon",help:"A/D or arrows move · Space/W jump · avoid hazards",mode:"runner"}
};
let overlay=null,game=null,raf=0,keys={},mouse={x:0,y:0,down:false},last=0;
function makeArcade(title){
 closeArcade();
 const wrap=document.createElement("div");wrap.className="vp-arcade";wrap.innerHTML=`<section class="vp-arcade__shell"><header class="vp-arcade__top"><div><span class="vp-arcade__badge">VORTEX ORIGINALS · PLAYABLE DEMO</span><h2 id="vp-title"></h2><p>Campaign prototype · progress saved for this session</p></div><button class="vp-arcade__close" data-close>✕ Exit game</button></header><div class="vp-arcade__layout"><div class="vp-arcade__screen"><div class="vp-arcade__canvaswrap"><canvas width="900" height="520"></canvas><div class="vp-arcade__message"><h3>MISSION BRIEFING</h3><p></p><button class="vp-arcade__start">START MISSION</button></div></div></div><aside class="vp-arcade__side"><span class="vp-arcade__badge">ACTIVE MISSION</span><h3 class="vp-mission"></h3><p class="vp-goal"></p><div class="vp-arcade__stats"><span>OBJECTIVE<strong class="vp-objective">0/6</strong></span><span>HEALTH<strong class="vp-health">100</strong></span><span>SCORE<strong class="vp-score">0</strong></span></div><div class="vp-arcade__mission"><b>Mission briefing</b><p class="vp-help"></p></div><h3>Campaign log</h3><ul class="vp-log"><li>Signal acquired</li><li>Mission area loaded</li><li>Awaiting deployment</li></ul><p class="vp-arcade__hint">This is a playable browser prototype. Your keyboard and mouse control the action.</p></aside></div></section>`;
 document.body.appendChild(wrap);overlay=wrap;
 let kind= /Hollow Signal|Resident Evil|S\.T\.A\.L\.K\.E\.R|Far Cry|Call of Duty|DOOM/i.test(title)?"fps":/Little Nightmares|Dark Souls|Witcher|Assassin|Shadow of the Colossus/i.test(title)?"runner":"survival";
 const def=kinds[kind],canvas=wrap.querySelector("canvas"),ctx=canvas.getContext("2d"),msg=wrap.querySelector(".vp-arcade__message");
 wrap.querySelector("#vp-title").textContent=title;
 wrap.querySelector(".vp-mission").textContent=def.mission;wrap.querySelector(".vp-goal").textContent=def.goal;wrap.querySelector(".vp-help").textContent=def.help;
 msg.querySelector("p").textContent=def.name+" — "+def.goal+". Study the controls, then deploy.";
 game={title,kind,def,ctx,canvas,state:"brief",x:120,y:390,vx:0,vy:0,health:100,score:0,objective:0,time:0,enemies:[],items:[],shots:[],world:0,won:false,_t0:Date.now()};
 for(let i=0;i<7;i++)game.enemies.push({x:430+i*95,y:300+(i%3)*35,hp:1,alive:true,phase:i});
 for(let i=0;i<7;i++)game.items.push({x:250+i*85,y:330+(i%3)*30,got:false});
 wrap.querySelector(".vp-arcade__start").onclick=()=>{game.state="playing";msg.hidden=true;last=performance.now();raf=requestAnimationFrame(loop);};
 wrap.querySelector("[data-close]").onclick=closeArcade;
 canvas.addEventListener("mousemove",e=>{let r=canvas.getBoundingClientRect();mouse.x=(e.clientX-r.left)/r.width*900;mouse.y=(e.clientY-r.top)/r.height*520});
 canvas.addEventListener("mousedown",()=>{mouse.down=true;shoot()});canvas.addEventListener("mouseup",()=>mouse.down=false);
 wrap.addEventListener("click",e=>{if(e.target===msg){}});
 draw();
}
function draw(){
 if(!game)return;const g=game,c=g.ctx; c.clearRect(0,0,900,520);
 if(g.kind==="fps"){
  let sky=c.createLinearGradient(0,0,0,260);sky.addColorStop(0,"#101b35");sky.addColorStop(1,"#34536a");c.fillStyle=sky;c.fillRect(0,0,900,260);
  c.fillStyle="#1a2937";c.fillRect(0,260,900,260);
  c.fillStyle="#263d4b";for(let i=0;i<12;i++){c.fillRect(i*80,220,5,300);c.fillRect(i*80,220,80,5)}
  c.strokeStyle="#4e7180";c.lineWidth=2;for(let i=0;i<10;i++){c.beginPath();c.moveTo(450,260);c.lineTo(i*100,520);c.stroke()}
  let alive=g.enemies.filter(e=>e.alive);alive.forEach((e,i)=>{let dx=e.x-g.x,dist=Math.max(1,Math.abs(dx)),scale=Math.min(1.5,400/dist),x=450+dx*0.6+(e.phase%2?20:-20),y=280+(e.phase%3)*14;let w=35*scale,h=65*scale;c.fillStyle="#ff5f77";c.fillRect(x-w/2,y-h,w,h);c.fillStyle="#ffd7ce";c.fillRect(x-w*.3,y-h+8,w*.6,12*scale);c.fillStyle="#1a2636";c.fillRect(x-w*.35,y-h+28,w*.7,8*scale)});
  c.fillStyle="#7df7d1";c.fillRect(425,385,50,135);c.fillStyle="#d5fff3";c.fillRect(442,360,16,35);c.strokeStyle="#d5fff3";c.beginPath();c.moveTo(450,255);c.lineTo(450,280);c.moveTo(438,268);c.lineTo(462,268);c.stroke();
 }else if(g.kind==="survival"){
  c.fillStyle="#0d251f";c.fillRect(0,0,900,520);for(let i=0;i<130;i++){let x=(i*137)%900,y=(i*83)%520;c.fillStyle=i%2?"#173b30":"#204632";c.fillRect(x,y,3,3)}
  c.fillStyle="#4e6d52";for(let i=0;i<12;i++){let x=(i*91+40)%900,y=(i*127+30)%520;c.beginPath();c.arc(x,y,20,0,7);c.fill()}
  g.items.forEach(it=>{if(it.got)return;c.fillStyle="#b6ff68";c.shadowBlur=18;c.shadowColor="#b6ff68";c.fillRect(it.x,it.y,18,18);c.shadowBlur=0;c.fillStyle="#eaffc9";c.fillRect(it.x+5,it.y+5,8,8)});
  g.enemies.forEach(e=>{if(!e.alive)return;c.fillStyle="#e85d65";c.beginPath();c.arc(e.x,e.y,15,0,7);c.fill();c.fillStyle="#fff";c.fillRect(e.x-6,e.y-3,4,4);c.fillRect(e.x+3,e.y-3,4,4)});
  c.fillStyle="#77e6ff";c.beginPath();c.arc(g.x,g.y,14,0,7);c.fill();c.fillStyle="#e9fbff";c.fillRect(g.x-4,g.y-20,8,12);
 }else{
  c.fillStyle="#111d38";c.fillRect(0,0,900,520);for(let i=0;i<10;i++){c.fillStyle=i%2?"#243858":"#1a2d4b";c.fillRect(i*100-g.world%100,80,60,250)}
  c.fillStyle="#39445b";c.fillRect(0,450,900,70);for(let i=0;i<13;i++){let x=(i*110-g.world%110);c.fillStyle="#ff6e85";c.fillRect(x,430,24,20)}
  c.fillStyle="#76f7d1";c.fillRect(g.x, g.y, 34,50);c.fillStyle="#e9ffff";c.fillRect(g.x+8,g.y+8,18,8);
  c.fillStyle="#b6ff68";c.fillRect(830-g.world%200,360,24,90);c.fillStyle="#d9ffad";c.fillRect(836-g.world%200,345,12,15);
 }
 c.fillStyle="#e8f4ff";c.font="bold 18px sans-serif";c.fillText(g.kind==="fps"?"NIGHTFALL PROTOCOL":g.kind==="survival"?"LAST LIGHT / SECTOR 07":"SKYLINE ESCAPE",22,34);
 c.fillStyle="#76f7d1";c.font="14px sans-serif";c.fillText("MISSION 01   •   "+Math.floor(g.time)+"s",22,58);
 if(g.state==="playing"&&g.kind==="fps"){c.strokeStyle="#76f7d1";c.beginPath();c.moveTo(438,260);c.lineTo(462,260);c.moveTo(450,248);c.lineTo(450,272);c.stroke()}
}
function shoot(){if(!game||game.state!=="playing")return;const g=game;if(g.kind==="fps"){let target=g.enemies.filter(e=>e.alive).sort((a,b)=>Math.abs((450+(a.x-g.x)*.6)-mouse.x)-Math.abs((450+(b.x-g.x)*.6)-mouse.x))[0];if(target&&Math.abs((450+(target.x-g.x)*.6)-mouse.x)<90){target.alive=false;g.objective++;g.score+=100;log("Target neutralized +100");updateHud();checkWin()}else{g.score=Math.max(0,g.score-5);updateHud()}}else if(g.kind==="survival"){let e=g.enemies.find(e=>e.alive&&Math.hypot(e.x-g.x,e.y-g.y)<110);if(e){e.alive=false;g.score+=50;log("Infected repelled");updateHud()}}}
function log(t){if(!overlay)return;let ul=overlay.querySelector(".vp-log"),li=document.createElement("li");li.textContent=t;ul.prepend(li);while(ul.children.length>4)ul.lastChild.remove()}
function updateHud(){if(!overlay||!game)return;overlay.querySelector(".vp-objective").textContent=game.kind==="fps"?game.objective+"/6":game.kind==="survival"?game.objective+"/5":Math.min(100,Math.floor(game.world/7))+"%";overlay.querySelector(".vp-health").textContent=game.health;overlay.querySelector(".vp-score").textContent=game.score}
function checkWin(){if(!game)return;let won=game.kind==="fps"?game.objective>=6:game.kind==="survival"?game.objective>=5:game.world>700;if(won){game.state="over";const m=overlay.querySelector(".vp-arcade__message");m.hidden=false;m.querySelector("h3").textContent="MISSION COMPLETE";m.querySelector("p").textContent="Extraction successful · score "+game.score;m.querySelector("button").textContent="PLAY AGAIN";m.querySelector("button").onclick=()=>makeArcade(game.title);log("Mission completed — extraction confirmed");}}
function loop(now){if(!game||!overlay)return;let g=game,dt=Math.min(.04,(now-last)/1000);last=now;if(g.state==="playing"){g.time+=dt;let speed=220*dt;
 if(g.kind==="fps"){if(keys.KeyA||keys.ArrowLeft)g.x-=speed;if(keys.KeyD||keys.ArrowRight)g.x+=speed;g.x=Math.max(0,Math.min(900,g.x));g.enemies.forEach(e=>{if(e.alive)e.x+=Math.sin(g.time*1.5+e.phase)*.5});if(mouse.down&&Math.random()<.09)shoot();if(g.time>90){g.health-=10;g.time=0;log("Alarm wave incoming")}}
 else if(g.kind==="survival"){if(keys.KeyA||keys.ArrowLeft)g.x-=speed;if(keys.KeyD||keys.ArrowRight)g.x+=speed;if(keys.KeyW||keys.ArrowUp)g.y-=speed;if(keys.KeyS||keys.ArrowDown)g.y+=speed;g.x=Math.max(15,Math.min(885,g.x));g.y=Math.max(20,Math.min(500,g.y));g.items.forEach(it=>{if(!it.got&&Math.hypot(it.x-g.x,it.y-g.y)<25){it.got=true;g.objective++;g.score+=75;log("Supply crate secured +75");updateHud();checkWin()}});g.enemies.forEach(e=>{if(!e.alive)return;let dx=g.x-e.x,dy=g.y-e.y,d=Math.hypot(dx,dy)||1;e.x+=dx/d*30*dt;e.y+=dy/d*30*dt;if(d<22){g.health-=18*dt}});if(g.health<=0){g.health=0;g.state="over";const m=overlay.querySelector(".vp-arcade__message");m.hidden=false;m.querySelector("h3").textContent="YOU WERE OVERRUN";m.querySelector("p").textContent="Supplies found: "+g.objective+" · Try another route.";m.querySelector("button").textContent="RETRY";m.querySelector("button").onclick=()=>makeArcade(g.title)}}
 else {if(keys.KeyA||keys.ArrowLeft)g.x-=speed;if(keys.KeyD||keys.ArrowRight){g.x+=speed;g.world+=speed}if((keys.Space||keys.KeyW||keys.ArrowUp)&&g.y>=400)g.vy=-390;g.vy+=850*dt;g.y+=g.vy*dt;if(g.y>400) {g.y=400;g.vy=0}if(g.x>820||g.world>700){g.state="over";checkWin()}}
 updateHud();draw();if(g.state==="playing")raf=requestAnimationFrame(loop);else draw();}else{draw();raf=requestAnimationFrame(loop)}}
function closeArcade(){if(raf)cancelAnimationFrame(raf);raf=0;if(game&&window.VP&&window.VP.recordPlay){const sc=game.score||0;const dur=Math.max(1,(Date.now()-(game._t0||Date.now()))/1000);window.VP.recordPlay(game.title,sc,dur)}if(overlay)overlay.remove();overlay=null;game=null;keys={};mouse.down=false}
document.addEventListener("keydown",e=>{keys[e.code]=true;if(overlay&&["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code))e.preventDefault();if(e.code==="Escape"&&overlay)closeArcade();if(e.code==="Space"&&game&&game.kind==="fps")shoot()});
document.addEventListener("keyup",e=>{keys[e.code]=false});
document.addEventListener("click",e=>{const b=e.target.closest("[data-play],[data-again]");if(!b)return;const title=b.dataset.play||b.dataset.again;if(!title)return;e.preventDefault();e.stopImmediatePropagation();if(window.VPFP)VPFP.launch(title);else makeArcade(title)},true);
document.addEventListener("DOMContentLoaded",()=>{applyLanguage();languagePicker()});
})();
