(() => {
  const canvas = document.getElementById('arena');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const resultOverlay = document.getElementById('resultOverlay');
  const flash = document.getElementById('hitFlash');
  const W = 960, H = 450;
  const keys = new Set();
  let running = false, soundOn = true, lastTime = 0, elapsed = 0, remaining = 90;
  let player, enemy, particles = [], audio;
  let cameraShake = 0;
  const $ = id => document.getElementById(id);
  const tips = ['Stay light on your feet. Wait for an opening.','A quick jab can create room for a heavy cross.','Hold guard to block incoming punches.','Keep your stamina up. Heavy punches need a moment to recover.'];
  let tipTimer = 0, tipIndex = 0;

  function newFighter(x, color, side) {
    return { x, y: 0, hp: 100, stamina: 100, color, side, attack: null, cooldown: 0, guard: false, hurt: 0, bob: 0, aiTimer: 1.1, combo: 0 };
  }
  function reset() {
    player = newFighter(315, '#328de0', 'player');
    enemy = newFighter(650, '#e24754', 'enemy');
    particles = []; elapsed = 0; remaining = 90; cameraShake = 0;
    running = true; lastTime = performance.now();
    overlay.classList.add('hidden'); resultOverlay.classList.add('hidden');
    $('statusLabel').textContent = 'FIGHT NIGHT';
    $('tipText').textContent = tips[0];
    updateHud();
    requestAnimationFrame(loop);
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    draw();
  }
  window.addEventListener('resize', resize);
  function roundedRect(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
  function draw() {
    if (!ctx) return;
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    let shakeX = cameraShake ? (Math.random() - .5) * cameraShake : 0;
    ctx.translate(shakeX, 0);
    const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#242329'); bg.addColorStop(.56, '#18181d'); bg.addColorStop(1, '#161619');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    drawAudience(); drawRing();
    if (player && enemy) {
      const fighters = [player, enemy].sort((a,b) => a.y - b.y);
      fighters.forEach(drawFighter);
    }
    particles.forEach(p => { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size*.75, p.size*1.35, p.angle, 0, Math.PI*2); ctx.fill(); });
    ctx.globalAlpha = 1;
    const vignette = ctx.createRadialGradient(W/2,H/2,120,W/2,H/2,610); vignette.addColorStop(0,'transparent'); vignette.addColorStop(1,'#08090bb0'); ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
    ctx.restore();
  }
  function drawAudience() {
    const crowd = ['#66636a','#b79a83','#41434d','#b7b0a7','#75454b','#7b8290','#d3c4a4'];
    for (let row=0; row<3; row++) {
      const y = 52 + row*35;
      for (let i=0; i<35; i++) {
        const x = i*29 + ((row%2)*14);
        const seed = Math.sin(i*37+row*11);
        ctx.fillStyle = crowd[Math.abs(Math.floor(seed*100))%crowd.length];
        ctx.globalAlpha = .32 + (Math.cos(i*8+row)*.11);
        ctx.beginPath(); ctx.arc(x, y+Math.sin(i*12+row)*5, 5+(row===0?1:0), 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#28282e'; ctx.fillRect(x-7,y+6,14,12);
      }
    }
    ctx.globalAlpha=1;
    const glow = ctx.createRadialGradient(480,50,5,480,65,520); glow.addColorStop(0,'#e3b86518');glow.addColorStop(1,'transparent');ctx.fillStyle=glow;ctx.fillRect(0,0,W,170);
    // Arena lights
    for(let i=0;i<8;i++){const x=50+i*123;ctx.fillStyle='#f8e9c0';ctx.globalAlpha=.5+Math.sin(elapsed*3+i)*.08;ctx.fillRect(x,20,28,3);ctx.globalAlpha=.12;ctx.fillRect(x-10,23,48,22)}ctx.globalAlpha=1;
  }
  function drawRing() {
    // distant ring apron
    ctx.fillStyle='#30282a';ctx.beginPath();ctx.moveTo(98,191);ctx.lineTo(862,191);ctx.lineTo(960,414);ctx.lineTo(0,414);ctx.closePath();ctx.fill();
    ctx.fillStyle='#bf3344';ctx.beginPath();ctx.moveTo(98,191);ctx.lineTo(862,191);ctx.lineTo(862,212);ctx.lineTo(98,212);ctx.closePath();ctx.fill();
    ctx.fillStyle='#e5ded2';ctx.beginPath();ctx.moveTo(124,211);ctx.lineTo(836,211);ctx.lineTo(928,390);ctx.lineTo(32,390);ctx.closePath();ctx.fill();
    // canvas boards
    const floor=ctx.createLinearGradient(0,212,0,390);floor.addColorStop(0,'#b5aaa0');floor.addColorStop(1,'#d4c9bd');ctx.fillStyle=floor;ctx.beginPath();ctx.moveTo(124,211);ctx.lineTo(836,211);ctx.lineTo(928,390);ctx.lineTo(32,390);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#716c69';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(190,212);ctx.lineTo(110,390);ctx.moveTo(770,212);ctx.lineTo(850,390);ctx.stroke();
    ctx.strokeStyle='#b44d53';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(255,215);ctx.lineTo(206,389);ctx.moveTo(705,215);ctx.lineTo(754,389);ctx.stroke();
    // center mark
    ctx.strokeStyle='#958a82';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(480,310,64,28,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#8c817a';ctx.font='700 11px sans-serif';ctx.textAlign='center';ctx.fillText('R / F',480,314);
    // ropes, multiple horizontal lines
    [137,157,177,197].forEach((y,i)=>{ctx.strokeStyle=['#e6d9d3','#cb3645','#f0e2d7','#dc4652'][i];ctx.lineWidth=i===1?4:3;ctx.beginPath();ctx.moveTo(10,y);ctx.lineTo(950,y);ctx.stroke();ctx.strokeStyle='#ffffff55';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(10,y-2);ctx.lineTo(950,y-2);ctx.stroke()});
    // corner posts and turnbuckles
    [[45,'#348bd5'],[915,'#d74350']].forEach(([x,col])=>{ctx.fillStyle=col;ctx.fillRect(x-10,130,20,97);ctx.fillStyle='#f0e9dd';ctx.fillRect(x-17,145,34,8);ctx.fillRect(x-17,175,34,8);ctx.fillRect(x-17,204,34,8)});
    // ring apron branding
    ctx.fillStyle='#d9d0c8';ctx.font='900 13px sans-serif';ctx.textAlign='center';ctx.save();ctx.translate(480,203);ctx.fillText('RING  //  FURY',0,0);ctx.restore();
  }
  function drawFighter(f) {
    const ground = 350 + f.y;
    const facing = f.side==='player' ? 1 : -1;
    const active = f.attack;
    let extension = 0;
    if (active) {
      if(active.phase==='wind') extension = -.12;
      else if(active.phase==='strike') extension = Math.sin(Math.min(1,active.t/active.duration)*Math.PI/2);
      else extension = Math.max(0, 1-(active.t-.22)*4);
    }
    const bob = Math.sin(elapsed*7 + (f.side==='enemy'?1:0)) * (f.hurt>0?0:2);
    ctx.save(); ctx.translate(f.x,ground+bob); ctx.scale(facing,1);
    // shadow
    ctx.fillStyle='#28202155';ctx.beginPath();ctx.ellipse(0,1,55,10,0,0,Math.PI*2);ctx.fill();
    // legs
    const legShift=active&&active.phase==='strike'?5:0;
    ctx.strokeStyle='#c08364';ctx.lineWidth=15;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-10,-57);ctx.lineTo(-18-legShift,-14);ctx.moveTo(12,-57);ctx.lineTo(20,-14);ctx.stroke();
    ctx.strokeStyle='#f1eee8';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-18-legShift,-17);ctx.lineTo(-18-legShift,-10);ctx.moveTo(20,-17);ctx.lineTo(20,-10);ctx.stroke();
    // shoes
    ctx.fillStyle='#191a1d';roundedRect(ctx,-34-legShift,-13,28,12,4);ctx.fill();roundedRect(ctx,7,-13,30,12,4);ctx.fill();ctx.fillStyle=f.color;ctx.fillRect(-32-legShift,-13,23,3);ctx.fillRect(10,-13,24,3);
    // torso, shoulders
    ctx.fillStyle='#b6785b';ctx.beginPath();ctx.moveTo(-27,-116);ctx.quadraticCurveTo(-43,-111,-36,-80);ctx.lineTo(-28,-53);ctx.quadraticCurveTo(0,-45,29,-54);ctx.lineTo(36,-84);ctx.quadraticCurveTo(43,-112,26,-117);ctx.lineTo(14,-124);ctx.lineTo(-13,-124);ctx.closePath();ctx.fill();
    const torsoShade=ctx.createLinearGradient(-30,-90,35,-90);torsoShade.addColorStop(0,'#623d37');torsoShade.addColorStop(.45,'#d2936e');torsoShade.addColorStop(1,'#8e5648');ctx.fillStyle=torsoShade;ctx.fill();
    ctx.strokeStyle='#e6ac82';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-2,-103);ctx.lineTo(-1,-72);ctx.moveTo(-18,-92);ctx.quadraticCurveTo(-2,-84,14,-93);ctx.stroke();
    // shorts
    ctx.fillStyle=f.color;ctx.beginPath();ctx.moveTo(-31,-69);ctx.lineTo(31,-69);ctx.lineTo(35,-42);ctx.lineTo(7,-38);ctx.lineTo(0,-48);ctx.lineTo(-8,-38);ctx.lineTo(-35,-42);ctx.closePath();ctx.fill();
    ctx.fillStyle='#e7e1d9';ctx.fillRect(-32,-69,64,5);ctx.fillStyle='#ffffff44';ctx.fillRect(-25,-60,15,2);
    // neck and head
    ctx.fillStyle='#b97c5d';ctx.fillRect(-10,-131,20,18);
    ctx.fillStyle='#c98b68';ctx.beginPath();ctx.ellipse(0,-145,22,25,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=f.side==='player'?'#171a20':'#281714';ctx.beginPath();ctx.moveTo(-22,-151);ctx.quadraticCurveTo(-19,-177,4,-173);ctx.quadraticCurveTo(23,-173,22,-151);ctx.lineTo(14,-157);ctx.lineTo(-4,-160);ctx.lineTo(-18,-151);ctx.fill();
    // face details
    ctx.fillStyle='#30211e';ctx.fillRect(7,-148,5,2);ctx.fillStyle='#824c42';ctx.fillRect(12,-137,5,2);ctx.fillStyle='#70453b';ctx.fillRect(3,-128,11,2);
    // far arm in guard position
    ctx.strokeStyle='#c58664';ctx.lineWidth=13;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-22,-111);ctx.lineTo(-36,-91);ctx.lineTo(-20,-105);ctx.stroke();
    ctx.fillStyle=f.color;ctx.beginPath();ctx.ellipse(-18,-109,13,12,-.3,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffffff77';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-25,-112);ctx.lineTo(-12,-108);ctx.stroke();
    // lead arm and glove. Punch drives the lead glove forward.
    let gloveX=25 + extension*48, gloveY=-103 - extension*13;
    if(f.guard){gloveX=31;gloveY=-137}
    ctx.strokeStyle='#c58664';ctx.lineWidth=14;ctx.beginPath();ctx.moveTo(21,-111);ctx.lineTo(gloveX-7,gloveY+4);ctx.stroke();
    ctx.fillStyle=f.color;ctx.beginPath();ctx.ellipse(gloveX,gloveY,17,13,-.1,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ffffff24';ctx.beginPath();ctx.ellipse(gloveX-4,gloveY-4,8,4,-.2,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#f3eee9';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(gloveX-8,gloveY+9);ctx.lineTo(gloveX+8,gloveY+9);ctx.stroke();
    // glove accent and guard shimmer
    if(f.guard){ctx.strokeStyle='#f6d279aa';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-119,38,-.9,.65);ctx.stroke()}
    if(f.hurt>0){ctx.globalAlpha=Math.min(.6,f.hurt*2);ctx.fillStyle='#fff';ctx.fillRect(-32,-169,64,123);ctx.globalAlpha=1}
    ctx.restore();
    // name / corner glow not on sprite
  }
  function startAttack(f, kind) {
    if(!running||f.cooldown>0||f.stamina<(kind==='cross'?24:12)) return;
    const cost=kind==='cross'?24:12;
    f.stamina-=cost; f.cooldown=kind==='cross'?.62:.35; f.guard=false;
    f.attack={kind,t:0,phase:'wind',duration:kind==='cross'?.22:.13,hit:false};
    if(kind==='cross') f.combo=0;
  }
  function resolveHit(attacker, target) {
    if(!attacker.attack||attacker.attack.hit||attacker.attack.phase!=='strike') return;
    const dist=Math.abs(attacker.x-target.x);
    const reach=attacker.attack.kind==='cross'?242:204;
    if(dist>reach) return;
    attacker.attack.hit=true;
    const blocked=target.guard;
    const damage=blocked?(attacker.attack.kind==='cross'?2:1):(attacker.side==='enemy'?(attacker.attack.kind==='cross'?10:5):(attacker.attack.kind==='cross'?14:8));
    target.hp=Math.max(0,target.hp-damage);
    if(!blocked){target.hurt=.22;target.x+=attacker.side==='player'?9:-9;cameraShake=5; spawnBlood(target.x+(attacker.side==='player'?16:-16),340+target.y-112,attacker.side==='player'?1:-1);playImpact(attacker.attack.kind==='cross'?1:0);flash.classList.remove('flash');void flash.offsetWidth;flash.classList.add('flash')}
    else {target.stamina=Math.max(0,target.stamina-5);playImpact(0)}
    updateHud();
    if(target.hp<=0)finish(attacker===player);
  }
  function spawnBlood(x,y,direction) {
    // Small, cartoony impact flecks — no graphic injury detail.
    for(let i=0;i<9;i++)particles.push({x,y,vx:direction*(1+Math.random()*4)+(Math.random()-.5)*2,vy:-2-Math.random()*4,life:.45+Math.random()*.38,max:.83,size:2+Math.random()*3,color:['#e34552','#bb253b','#f16a62'][i%3],angle:Math.random()});
  }
  function playImpact(heavy) {
    if(!soundOn)return;
    try{audio ||= new(window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.setValueAtTime(heavy?105:145,audio.currentTime);o.frequency.exponentialRampToValueAtTime(48,audio.currentTime+.09);g.gain.setValueAtTime(.055,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.11);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.12)}catch(_){ }
  }
  function finish(won) {
    if(!running)return;running=false;$('statusLabel').textContent='BOUT COMPLETE';
    $('resultTitle').textContent=won?'CHAMPION!':(player.hp<=0?'KNOCKOUT':'TIME');$('resultTitle').style.color=won?'#e5b85e':'#ed5360';
    $('resultText').textContent=won?'You take the belt. What a finish.':player.hp<=0?'El Toro takes the win. Run it back.':'The judges have it — fight again to settle it.';
    resultOverlay.classList.remove('hidden');
  }
  function updateHud() {
    if(!player||!enemy)return;
    $('playerHealth').style.width=player.hp+'%';$('enemyHealth').style.width=enemy.hp+'%';
    $('playerHealthText').textContent=Math.ceil(player.hp)+'%';$('enemyHealthText').textContent=Math.ceil(enemy.hp)+'%';
    $('playerStamina').style.width=player.stamina+'%';$('enemyStamina').style.width=enemy.stamina+'%';
    const m=Math.floor(remaining/60),s=Math.floor(remaining%60);$('clock').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  function update(dt) {
    if(!running)return;
    elapsed+=dt;remaining=Math.max(0,remaining-dt);tipTimer+=dt;
    if(tipTimer>9){tipTimer=0;tipIndex=(tipIndex+1)%tips.length;$('tipText').textContent=tips[tipIndex]}
    const speed=190*dt;
    if(keys.has('a')||keys.has('arrowleft'))player.x-=speed;
    if(keys.has('d')||keys.has('arrowright'))player.x+=speed;
    if(keys.has('w')||keys.has('arrowup'))player.y-=90*dt;
    if(keys.has('s')||keys.has('arrowdown'))player.y+=90*dt;
    player.x=Math.max(125,Math.min(835,player.x));player.y=Math.max(-28,Math.min(30,player.y));
    player.guard=keys.has('l')||keys.has('shift');
    [player,enemy].forEach(f=>{f.cooldown=Math.max(0,f.cooldown-dt);f.stamina=Math.min(100,f.stamina+14*dt);f.hurt=Math.max(0,f.hurt-dt);if(f.attack){f.attack.t+=dt;if(f.attack.phase==='wind'&&f.attack.t>=f.attack.duration){f.attack.phase='strike';f.attack.t=0}else if(f.attack.phase==='strike'){resolveHit(f,f===player?enemy:player);if(f.attack.t>(f.attack.kind==='cross'?.2:.13)){f.attack.phase='recover';f.attack.t=0}}else if(f.attack.phase==='recover'&&f.attack.t>.27)f.attack=null}});
    // Opponent reads your distance, occasionally feints, then commits to a punch.
    enemy.aiTimer-=dt;enemy.guard=enemy.attack===null&&Math.abs(enemy.x-player.x)<175&&Math.random()<.018;
    const gap=enemy.x-player.x;
    if(Math.abs(gap)>178)enemy.x-=Math.sign(gap)*Math.min(Math.abs(gap)-178,90*dt);
    else if(Math.abs(gap)<125)enemy.x+=Math.sign(gap||1)*65*dt;
    enemy.x=Math.max(135,Math.min(825,enemy.x));
    if(enemy.aiTimer<=0&&enemy.cooldown<=0&&!enemy.attack){
      if(Math.abs(gap)<246){enemy.attack={kind:Math.random()<.67?'jab':'cross',t:0,phase:'wind',duration:.28+Math.random()*.15,hit:false};enemy.cooldown=.4;enemy.stamina=Math.max(0,enemy.stamina-10)}
      enemy.aiTimer=1.5+Math.random()*1.5;
    }
    particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=10*dt;p.vx*=.98;p.life-=dt});particles=particles.filter(p=>p.life>0);
    cameraShake=Math.max(0,cameraShake-20*dt);
    if(remaining<=0){finish(player.hp>=enemy.hp);}
    updateHud();
  }
  function loop(now) {
    if(!running)return;
    const dt=Math.min(.04,(now-lastTime)/1000);lastTime=now;update(dt);draw();
    if(running)requestAnimationFrame(loop);
  }
  window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if([' ','arrowleft','arrowright','arrowup','arrowdown'].includes(key))e.preventDefault();keys.add(key);if(!e.repeat&&key==='j')startAttack(player,'jab');if(!e.repeat&&key==='k')startAttack(player,'cross')});
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur',()=>keys.clear());
  document.querySelectorAll('.mobile-controls button').forEach(button=>{
    const key=button.dataset.key;
    const down=e=>{e.preventDefault();keys.add(key);button.classList.add('active');if(key==='j')startAttack(player,'jab');if(key==='k')startAttack(player,'cross')};
    const up=e=>{e.preventDefault();keys.delete(key);button.classList.remove('active')};
    button.addEventListener('pointerdown',down);button.addEventListener('pointerup',up);button.addEventListener('pointercancel',up);button.addEventListener('pointerleave',up);
  });
  $('startButton').addEventListener('click',reset);$('rematchButton').addEventListener('click',reset);
  $('soundToggle').addEventListener('click',()=>{soundOn=!soundOn;$('soundToggle').setAttribute('aria-pressed',String(!soundOn));$('soundToggle').innerHTML=soundOn?'♫ <span>SOUND ON</span>':'♫ <span>SOUND OFF</span>'});
  resize();
})();
