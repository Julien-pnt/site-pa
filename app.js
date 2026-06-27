/* =========================================================
   SHARED STAR GEOMETRY
   ========================================================= */
function starPath(cx,cy,r){ let inner=r*0.40, p=[];
  for(let i=0;i<10;i++){ let a=-Math.PI/2 + i*Math.PI/5, rad=(i%2)?inner:r;
    p.push((cx+rad*Math.cos(a)).toFixed(1)+','+(cy+rad*Math.sin(a)).toFixed(1)); }
  return 'M'+p.join(' L')+' Z';
}
/* gold filled star — used by the uniform silhouettes (badge on chest / cap) */
function star(cx,cy,r,fill){ return `<path d="${starPath(cx,cy,r)}" fill="${fill||'url(#gGold)'}" stroke="#7d6325" stroke-width=".8" filter="url(#ds)"/>`;}

/* =========================================================
   GRADE INSIGNIA PRIMITIVES  (120x120 badge)
   Gold galons #c9a84c · silver bars #c0c0c0 · silver stars #d4d4d4
   ========================================================= */
/* RENDER_OPTS lets the same insignia be rendered as the main navy badge OR as a
   small category-coloured corner vignette, without threading params through every builder */
let RENDER_OPTS = {};
function badgeBase(inner){
  const bg = RENDER_OPTS.bg || '#1a2744';
  const cls = RENDER_OPTS.cls || 'insignia';
  return `<svg class="${cls}" viewBox="0 0 120 120" preserveAspectRatio="xMidYMid meet">
    <rect x="7" y="7" width="106" height="106" rx="20" fill="${bg}" stroke="#0a1220" stroke-width="2" filter="url(#dsSoft)"/>
    <rect x="7" y="7" width="106" height="106" rx="20" fill="none" stroke="#2c4470" stroke-width="1.2"/>
    <rect x="14" y="14" width="92" height="92" rx="14" fill="none" stroke="rgba(201,168,76,.16)" stroke-width="1"/>
    ${inner}</svg>`;
}

/* chevron pointing UP ^ as a thick embroidered gold band (dark edge + gold + highlight) */
function chevUp(cx, apexY, hw, depth){
  const y2 = apexY + depth;
  const d = `M${cx-hw} ${y2} L${cx} ${apexY} L${cx+hw} ${y2}`;
  return `<path d="${d}" fill="none" stroke="#3f3110" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="${d}" fill="none" stroke="url(#gGold)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="${d}" fill="none" stroke="#f8ecae" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/>`;
}
/* n nested chevrons (bottom widest), returns markup + the bottom half-width for the rocker */
function chevronStack(n, topApexY, startHW, spacing){
  let s=''; let hw=startHW;
  for(let i=0;i<n;i++){ hw=startHW + i*spacing; s+=chevUp(60, topApexY + i*spacing, hw, 16); }
  return {svg:s, bottomHW:hw, bottomY:topApexY + (n-1)*spacing + 16};
}
/* rocker — thick gold band arcing DOWNWARD beneath the chevrons */
function rocker(yEnds, hw){
  const ctrlY = yEnds + 30;
  const d = `M${60-hw} ${yEnds} Q60 ${ctrlY} ${60+hw} ${yEnds}`;
  return `<path d="${d}" fill="none" stroke="#3f3110" stroke-width="10.5" stroke-linecap="round"/>
          <path d="${d}" fill="none" stroke="url(#gGold)" stroke-width="7.5" stroke-linecap="round"/>
          <path d="${d}" fill="none" stroke="#f8ecae" stroke-width="2" stroke-linecap="round" opacity=".6"/>`;
}
/* "//" marker for Police Officer I & II (no galon, per official table) */
function slashes(){
  return `<text x="60" y="74" text-anchor="middle" font-family="Oswald" font-weight="600" font-size="44" letter-spacing="-2" fill="url(#gGold)">//</text>`;
}
/* vertical silver bar with metallic left reflection (Lieutenant single bar) */
function barV(cx, w, h, fill){
  const y = 60 - h/2, x = cx - w/2;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${fill||'#c0c0c0'}" stroke="#6f6f6f" stroke-width=".8" filter="url(#ds)"/>
          <rect x="${x+1.6}" y="${y+2.5}" width="2.6" height="${h-5}" rx="1.3" fill="#f1f1f1" opacity=".9"/>`;
}
/* Captain double-bar (two silver bars side by side, like the official table) */
function captainInsignia(){ return barV(52,14,46) + barV(68,14,46); }
/* silver stars */
function starSilverFill(cx,cy,r){ return `<path d="${starPath(cx,cy,r)}" fill="#d4d4d4" stroke="#a9a9a9" stroke-width=".6" stroke-linejoin="round"/>`; }
function starSilverOutline(cx,cy,r){ return `<path d="${starPath(cx,cy,r)}" fill="none" stroke="#d4d4d4" stroke-width="2" stroke-linejoin="round"/>`; }
function starRow(n, r, glow){
  const span = (n-1)*(r*2 + (glow?4:7));
  const x0 = 60 - span/2; let s='';
  for(let i=0;i<n;i++){ s+=starSilverFill(x0 + i*(span/(n-1||1)), 60, r); }
  return glow ? `<g style="filter:drop-shadow(0 0 4px rgba(255,255,255,.53))">${s}</g>` : s;
}
/* function emblem (non-grade roles) */
function funcEmblem(label, icon){
  const core = icon==='star'
    ? starSilverFill(60,50,11).replace('#d4d4d4','#c9a84c').replace('#a9a9a9','#7d6325')
    : `<path d="M50 52a10 10 0 0120 0" fill="none" stroke="#4fc3f7" stroke-width="2.6" stroke-linecap="round"/>
       <path d="M54 52a6 6 0 0112 0" fill="none" stroke="#4fc3f7" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>
       <circle cx="60" cy="52" r="3" fill="#4fc3f7"/>`;
  return badgeBase(`<circle cx="60" cy="50" r="22" fill="#16243f" stroke="#c9a84c" stroke-width="2"/>${core}
    <text x="60" y="92" text-anchor="middle" font-family="Oswald" font-weight="600" font-size="11.5" letter-spacing="1.4" fill="#c9a84c">${label}</text>`);
}
function cadetEmblem(){
  return badgeBase(`<rect x="34" y="42" width="52" height="34" rx="5" fill="none" stroke="rgba(201,168,76,.45)" stroke-width="1.5" stroke-dasharray="4 4"/>
    <text x="60" y="64" text-anchor="middle" font-family="Oswald" font-weight="600" font-size="13" letter-spacing="2" fill="rgba(201,168,76,.75)">CADET</text>
    <text x="60" y="92" text-anchor="middle" font-family="JetBrains Mono" font-size="7" letter-spacing="2" fill="#7d93a8">AUCUN GALON</text>`);
}

/* convenience composers */
function gChevrons(n, top, hw, sp){ return badgeBase(chevronStack(n,top,hw,sp).svg); }
function gChevRocker(n, top, hw, sp){ const c=chevronStack(n,top,hw,sp); return badgeBase(c.svg + rocker(c.bottomY+8, c.bottomHW)); }

/* =========================================================
   GRADE DATA  (official LSPD insignia)
   ========================================================= */
const GRADES = [
  /* ---- TERRAIN ---- */
  {cat:'terrain', name:'Cadet', cdesc:'Aucun galon', desc:'Statut probatoire sous encadrement permanent. Aucun insigne de grade.',
   blurb:'Statut probatoire. Encadrement permanent obligatoire. Ne peut opérer seul en aucun cas.',
   build:()=> cadetEmblem()},
  {cat:'terrain', name:'Police Officer I', cdesc:'Aucun galon (//)', desc:'Premier grade actif. Pas d\'accès Lincoln ; un Training Officer (TO) est requis. Aucun galon — simple repère « // » sur le tableau officiel.',
   blurb:'Pas d\'accès au Lincoln. Doit avoir un TO référent. S\'adresse en priorité à l\'Officier II.',
   build:()=> badgeBase(slashes())},
  {cat:'terrain', name:'Police Officer II', cdesc:'Aucun galon (//)', desc:'First Lincoln obligatoire pour progresser. Aucun galon, identique à l\'Officer I.',
   blurb:'First Lincoln (FL) obligatoire pour progresser au grade supérieur.',
   build:()=> badgeBase(slashes())},
  {cat:'terrain', name:'Police Officer III', cdesc:'2 chevrons ^', desc:'Accès PA, galons portés sur les deux bras. Deux chevrons dorés (celui du bas plus grand).',
   blurb:'Training Officer. Ouvre l\'accès à la PA. Galon sur les deux bras. Peut encadrer les Cadets et Officier I.',
   build:()=> gChevrons(2, 44, 19, 12)},
  {cat:'terrain', name:'Police Officer III + 1 (SLO)', cdesc:'2 chevrons + rocker', desc:'Senior Lead Officer, sur recommandation de la supervision. Deux chevrons surmontant un rocker (arc courbé vers le bas).',
   blurb:'Sur recommandation forte de la supervision. Échelon intermédiaire vers la supervision.',
   build:()=> gChevRocker(2, 36, 19, 12)},
  {cat:'terrain', name:'Sergeant I', cdesc:'3 chevrons ^', desc:'Premier grade de supervision. Trois chevrons dorés superposés.',
   build:()=> gChevrons(3, 40, 15, 11)},
  {cat:'terrain', name:'Sergeant II', cdesc:'3 chevrons + rocker', desc:'Watch Commander adjoint. Trois chevrons dorés surmontant un rocker.',
   build:()=> gChevRocker(3, 32, 14, 10)},

  /* ---- INVESTIGATION (mêmes insignes que terrain) ---- */
  {cat:'investigation', name:'Detective I', cdesc:'2 chevrons + rocker', desc:'Bureau d\'investigation. Insigne identique au SLO : deux chevrons + rocker.',
   build:()=> gChevRocker(2, 36, 19, 12)},
  {cat:'investigation', name:'Detective II', cdesc:'3 chevrons ^', desc:'Détective confirmé. Insigne identique au Sergeant I : trois chevrons.',
   build:()=> gChevrons(3, 40, 15, 11)},
  {cat:'investigation', name:'Detective III', cdesc:'3 chevrons + rocker', desc:'Détective senior. Insigne identique au Sergeant II : trois chevrons + rocker.',
   build:()=> gChevRocker(3, 32, 14, 10)},

  /* ---- COMMAND STAFF (barres argentées — cf. tableau officiel) ---- */
  {cat:'command', name:'Lieutenant I', cdesc:'1 barre argentée', desc:'Command Staff. Une barre verticale argentée. Sur le tableau officiel, Lieutenant I & II partagent le même insigne.',
   build:()=> badgeBase(barV(60, 15, 50))},
  {cat:'command', name:'Lieutenant II', cdesc:'1 barre argentée', desc:'Insigne identique au Lieutenant I (barre unique), conformément au tableau officiel « Lieutenant I–II ».',
   build:()=> badgeBase(barV(60, 15, 50))},
  {cat:'command', name:'Captain I', cdesc:'Double barre', desc:'Insigne de capitaine : double barre verticale argentée. Captain I–III partagent le même insigne.',
   build:()=> badgeBase(captainInsignia())},
  {cat:'command', name:'Captain II', cdesc:'Double barre', desc:'Double barre argentée, identique au Captain I (tableau officiel « Captain I–III »).',
   build:()=> badgeBase(captainInsignia())},
  {cat:'command', name:'Captain III', cdesc:'Double barre', desc:'Double barre argentée, identique au Captain I & II (tableau officiel « Captain I–III »).',
   build:()=> badgeBase(captainInsignia())},

  /* ---- DIRECTION (étoiles) ---- */
  {cat:'direction', name:'Commander', cdesc:'1 étoile vide', desc:'Une étoile à 5 branches en contour seul (creuse), argent #d4d4d4.',
   build:()=> badgeBase(starSilverOutline(60,60,26))},
  {cat:'direction', name:'Deputy-Chief', cdesc:'2 étoiles pleines', desc:'Deux étoiles pleines argentées, côte à côte.',
   build:()=> badgeBase(starSilverFill(41,60,15)+starSilverFill(79,60,15))},
  {cat:'direction', name:'Assistant-Chief', cdesc:'3 étoiles pleines', desc:'Trois étoiles pleines argentées alignées.',
   build:()=> badgeBase(starRow(3, 11, false))},
  {cat:'direction', name:'Chief of Police', cdesc:'4 étoiles pleines', desc:'Sommet de la hiérarchie : quatre étoiles pleines argentées, avec un halo blanc subtil.',
   build:()=> badgeBase(starRow(4, 11, true))},

  /* ---- FONCTIONS (non-grades) ---- */
  {cat:'fonctions', name:'Dispatcher', cdesc:'Fonction radio', desc:'Coordonne et déploie les unités depuis le central.',
   note:'Dans le LAPD réel, c\'est une FONCTION, pas un grade.',
   build:()=> funcEmblem('DISPATCH','radio')},
  {cat:'fonctions', name:'Watch Commander', cdesc:'Fonction de commandement', desc:'Décisions sur les opérations majeures durant la vacation.',
   note:'Dans le LAPD réel, c\'est une fonction (Lieutenant/Sergent), pas un grade distinct.',
   build:()=> funcEmblem('WATCH C.','star')},
];

/* Official insignia images — cropped from the LSPD "planche officielle des grades"
   (grades source: lspd-serveur-fr). Ranks without galons (Cadet, PO I/II) and the
   non-grade functions keep their drawn emblem. */
const GRADE_IMG = {
  'Police Officer III':'off3.png',
  'Police Officer III + 1 (SLO)':'slo.png',
  'Sergeant I':'sgt1.png', 'Sergeant II':'sgt2.png',
  'Detective I':'det1.png', 'Detective II':'det2.png', 'Detective III':'det3.png',
  'Lieutenant I':'lieutenant.png', 'Lieutenant II':'lieutenant.png',
  'Captain I':'captain.png', 'Captain II':'captain.png', 'Captain III':'captain.png',
  'Commander':'commander.png', 'Deputy-Chief':'deputy.png',
  'Assistant-Chief':'asst.png', 'Chief of Police':'chief.png'
};
GRADES.forEach(g=>{ if(GRADE_IMG[g.name]) g.img='assets/grades/ins/'+GRADE_IMG[g.name]; });

const CAT_NAMES = {terrain:'Terrain · Patrol',investigation:'Investigation',command:'Command Staff',direction:'Direction · Star Ranks',fonctions:'Fonction (non-grade)'};
const CAT_COLOR = {terrain:'#16243f',investigation:'#4a1020',command:'#3d2800',direction:'#1a0030',fonctions:'#2d4a1e'};

/* render grade cards (with category-coloured corner vignette + short blurb) */
GRADES.forEach(g=>{
  const grid=document.querySelector(`.grade-grid[data-cat="${g.cat}"]`);
  if(!grid) return;
  let vign, main;
  if(g.img){
    main=`<div class="insignia-img-wrap"><img class="insignia-img" src="${g.img}" alt="Insigne ${g.name}" loading="lazy" decoding="async"></div>`;
    vign=`<img class="vignette-img" src="${g.img}" alt="" loading="lazy" decoding="async">`;
  } else {
    RENDER_OPTS={bg:CAT_COLOR[g.cat]||'#16243f', cls:'vignette'}; vign=g.build();
    RENDER_OPTS={}; main=g.build();
  }
  const card=document.createElement('div');
  card.className='grade-card';
  card.tabIndex=0;
  card.setAttribute('role','button');
  card.setAttribute('aria-label',`${g.name} — voir le détail`);
  card.innerHTML=`<div class="vign-corner">${vign}</div><span class="zoom-hint">⤢ Zoom</span>${main}
    <div class="gname">${g.name}</div><div class="gdesc">${g.cdesc}</div>
    ${g.blurb?`<p class="gblurb">${g.blurb}</p>`:''}
    ${g.note?'<span class="rp-flag">Note RP</span>':''}`;
  card.addEventListener('click',()=>openModal(g));
  card.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openModal(g); } });
  grid.appendChild(card);
});

/* =========================================================
   MODAL
   ========================================================= */
const modal=document.getElementById('modal');
let modalLastFocus=null;
function closeModal(){
  if(!modal.classList.contains('open')) return;
  modal.classList.remove('open');
  if(modalLastFocus){ modalLastFocus.focus(); modalLastFocus=null; }
}
function openModal(g){
  RENDER_OPTS={};
  modalLastFocus=document.activeElement;
  document.getElementById('mCat').textContent=CAT_NAMES[g.cat];
  document.getElementById('mName').textContent=g.name;
  document.getElementById('mSleeves').innerHTML = g.img
    ? `<figure><img class="modal-insignia-img" src="${g.img}" alt="Insigne ${g.name}" decoding="async"></figure>`
    : `<figure>${g.build()}</figure>`;
  document.getElementById('mDesc').textContent=g.desc;
  const note=document.getElementById('mNote');
  if(g.note){ note.style.display='block'; note.textContent='⚠ '+g.note; } else note.style.display='none';
  modal.classList.add('open');
  document.getElementById('modalClose').focus();
}
document.getElementById('modalClose').onclick=closeModal;
modal.addEventListener('click',e=>{ if(e.target===modal) closeModal(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeModal(); });

/* =========================================================
   TENUES — silhouette builder (150x300)
   ========================================================= */
function silhouette(cfg){
  const sleeves = cfg.sleeves || 'long';
  const tie = cfg.tie;
  const cap = cfg.cap;
  const gloves = cfg.gloves;
  const buttons = cfg.buttons || 0;
  const collarOpen = cfg.collarOpen;
  const skin = '#cdb094';
  const navy = 'url(#gFab)';
  let s = `<svg class="figure" viewBox="0 0 150 300" preserveAspectRatio="xMidYMid meet">`;
  if(cfg.gala){ s+=`<rect x="0" y="0" width="150" height="300" fill="url(#gDark)" opacity=".5"/>
      <radialGradient id="galaG" cx="50%" cy="35%" r="60%"><stop offset="0" stop-color="rgba(201,168,76,.18)"/><stop offset="1" stop-color="transparent"/></radialGradient>
      <rect x="0" y="0" width="150" height="300" fill="url(#galaG)"/>`; }
  s+=`<g filter="url(#dsSoft)">`;
  s+=`<path d="M58 196 h34 v92 q0 6 -6 6 h-9 q-3 0 -3 -4 v-50 h-4 v50 q0 4 -3 4 h-9 q-6 0 -6 -6 Z" fill="${navy}" stroke="#0d1117" stroke-width="1.2"/>`;
  s+=`<rect x="55" y="290" width="16" height="7" rx="2" fill="#0a0e15"/><rect x="79" y="290" width="16" height="7" rx="2" fill="#0a0e15"/>`;
  s+=`<path d="M40 92 q35 -16 70 0 l6 70 q-3 8 -10 8 l-6 30 H50 l-6 -30 q-7 0 -10 -8 Z" fill="${navy}" stroke="#0d1117" stroke-width="1.2"/>`;
  if(sleeves==='long'){
    s+=`<path d="M40 92 q-12 4 -16 20 l-6 60 q0 6 6 7 l10 1 q5 0 5 -6 l4 -52 Z" fill="${navy}" stroke="#0d1117" stroke-width="1.2"/>`;
    s+=`<path d="M110 92 q12 4 16 20 l6 60 q0 6 -6 7 l-10 1 q-5 0 -5 -6 l-4 -52 Z" fill="${navy}" stroke="#0d1117" stroke-width="1.2"/>`;
    const hand = gloves? '#f4f4f4' : skin;
    s+=`<circle cx="28" cy="184" r="8" fill="${hand}" stroke="#0d1117" stroke-width=".8"/>`;
    s+=`<circle cx="122" cy="184" r="8" fill="${hand}" stroke="#0d1117" stroke-width=".8"/>`;
    if(gloves){ s+=`<rect x="20" y="176" width="16" height="6" rx="2" fill="#e9e9e9"/><rect x="114" y="176" width="16" height="6" rx="2" fill="#e9e9e9"/>`; }
  } else {
    s+=`<path d="M40 92 q-12 4 -16 20 l-3 30 q10 4 22 2 l1 -34 Z" fill="${navy}" stroke="#0d1117" stroke-width="1.2"/>`;
    s+=`<path d="M110 92 q12 4 16 20 l3 30 q-10 4 -22 2 l-1 -34 Z" fill="${navy}" stroke="#0d1117" stroke-width="1.2"/>`;
    s+=`<path d="M21 140 q11 4 22 2 l-3 42 q0 5 -6 5 l-6 0 q-5 0 -5 -6 Z" fill="${skin}" stroke="#0d1117" stroke-width=".8"/>`;
    s+=`<path d="M129 140 q-11 4 -22 2 l3 42 q0 5 6 5 l6 0 q5 0 5 -6 Z" fill="${skin}" stroke="#0d1117" stroke-width=".8"/>`;
    s+=`<circle cx="29" cy="190" r="8" fill="${skin}" stroke="#0d1117" stroke-width=".8"/>`;
    s+=`<circle cx="121" cy="190" r="8" fill="${skin}" stroke="#0d1117" stroke-width=".8"/>`;
  }
  s+=`<rect x="48" y="186" width="54" height="11" rx="2" fill="#0a0e15" stroke="#000" stroke-width="1"/>`;
  s+=`<rect x="70" y="187" width="10" height="9" rx="2" fill="url(#gGold)" stroke="#7d6325"/>`;
  s+=`<rect x="96" y="190" width="12" height="22" rx="3" fill="#0a0e15" stroke="#000"/><rect x="99" y="186" width="6" height="9" rx="2" fill="#15181d"/>`;
  s+=`<rect x="66" y="74" width="18" height="22" rx="5" fill="${skin}"/>`;
  if(collarOpen && !tie){
    s+=`<path d="M58 90 L75 100 L92 90 L86 80 L75 92 L64 80 Z" fill="#16243f" stroke="#0d1117" stroke-width="1"/>`;
    s+=`<circle cx="75" cy="100" r="2" fill="url(#gGold)"/>`;
  } else {
    s+=`<path d="M60 88 L75 98 L90 88 L84 80 L75 86 L66 80 Z" fill="#16243f" stroke="#0d1117" stroke-width="1"/>`;
  }
  if(tie){
    s+=`<path d="M75 92 l-5 6 l5 6 l5 -6 Z" fill="#0a0e15"/>`;
    s+=`<path d="M72 104 l6 0 l3 56 l-6 8 l-6 -8 Z" fill="#0a0e15" stroke="#000" stroke-width=".6"/>`;
  }
  s+=`<circle cx="75" cy="52" r="24" fill="${skin}" stroke="#0d1117" stroke-width=".8"/>`;
  s+=`<path d="M52 50 q2 -26 23 -26 q21 0 23 26 q-6 -12 -23 -12 q-17 0 -23 12Z" fill="#2b2620"/>`;
  if(cap){
    s+=`<path d="M50 38 q25 -16 50 0 l0 6 q-25 -9 -50 0 Z" fill="${navy}" stroke="#0d1117" stroke-width="1"/>`;
    s+=`<rect x="48" y="44" width="54" height="8" rx="3" fill="#0a0e15"/>`;
    s+=`<rect x="56" y="30" width="38" height="12" rx="3" fill="${navy}" stroke="#0d1117"/>`;
    s+=`<rect x="50" y="42" width="50" height="3" fill="url(#gGoldH)"/>`;
    s+=star(75,35,5);
  }
  if(cfg.pockets){
    s+=`<rect x="50" y="120" width="20" height="16" rx="2" fill="none" stroke="#0d1117" stroke-width="1.2"/><path d="M50 122 h20" stroke="#0d1117" stroke-width="1"/><circle cx="60" cy="124" r="1.6" fill="url(#gGold)"/>`;
    s+=`<rect x="80" y="120" width="20" height="16" rx="2" fill="none" stroke="#0d1117" stroke-width="1.2"/><path d="M80 122 h20" stroke="#0d1117" stroke-width="1"/><circle cx="90" cy="124" r="1.6" fill="url(#gGold)"/>`;
  }
  s+=`<g filter="url(#ds)">${star(95,116,8)}</g>`;
  if(buttons){
    for(let i=0;i<buttons;i++){ s+=`<circle cx="75" cy="${112+i*13}" r="2.4" fill="url(#gGold)" stroke="#7d6325" stroke-width=".5"/>`; }
  }
  if(cfg.gala){
    s+=`<path d="M42 96 q12 -8 22 -8" fill="none" stroke="url(#gGold)" stroke-width="2.5"/>`;
    s+=`<path d="M108 96 q-12 -8 -22 -8" fill="none" stroke="url(#gGold)" stroke-width="2.5"/>`;
    s+=`<rect x="38" y="92" width="16" height="6" rx="3" fill="url(#gGold)" opacity=".85"/>`;
    s+=`<rect x="96" y="92" width="16" height="6" rx="3" fill="url(#gGold)" opacity=".85"/>`;
  }
  s+=`</g></svg>`;
  return s;
}

const TI={
  tie:'<svg class="ti" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="2" stroke-linejoin="round"><path d="M10 3h4l-1 4 2 9-3 5-3-5 2-9z"/></svg>',
  shirt:'<svg class="ti" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="2" stroke-linejoin="round"><path d="M8 3l4 3 4-3 5 4-3 3v11H6V10L3 7z"/></svg>',
  walk:'<svg class="ti" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13" cy="4" r="2"/><path d="M11 8l-2 5 3 2 2 6M9 13l-3 1M14 10l4 1"/></svg>',
  star:'<svg class="ti" width="16" height="16" viewBox="0 0 24 24" fill="#c9a84c" stroke="none"><path d="M12 2l2.9 6.3 6.8.6-5.1 4.5 1.5 6.7L12 17l-6 3.6 1.5-6.7L2.4 8.9l6.8-.6z"/></svg>'
};
const TENUES=[
  {name:'Classe A', icon:TI.tie, blurb:'Tenue formelle complète. Obligatoire pour Officier I et Command Staff. Port de la cravate exigé.', cfg:{sleeves:'long',tie:true,pockets:true,cap:true},
   items:['Tenue bleu marine, manches longues','Col fermé + cravate noire','Badge LSPD doré poitrine gauche','2 poches poitrine à rabats boutonnés','Ceinturon noir + holster','Casquette plate (optionnelle)']},
  {name:'Classe B', icon:TI.shirt, blurb:'Tenue de service standard. Manches longues sans cravate. Disponible dès Officier II.', cfg:{sleeves:'long',collarOpen:true,pockets:true},
   items:['Identique Classe A','Sans cravate — col ouvert','1ᵉʳ bouton visible','Même badge, même ceinturon']},
  {name:'Classe C', icon:TI.walk, blurb:'Tenue terrain allégée. Manches courtes. Adaptée aux conditions chaudes.', cfg:{sleeves:'short',collarOpen:true},
   items:['Manches courtes (arrêt au coude)','Col ouvert','Avant-bras nus visibles','Badge LSPD poitrine gauche','Ceinturon + holster']},
  {name:'Cérémonie', icon:TI.star, blurb:'Tenue d\'apparat. Casquette et gants blancs obligatoires. Réservée aux événements officiels et commémorations.', cfg:{sleeves:'long',tie:true,pockets:true,cap:true,gloves:true,buttons:6,gala:true}, gala:true,
   items:['Base Classe A','Casquette plate obligatoire + liseré doré','Gants blancs','6 boutons dorés alignés','Liseré doré aux épaules','Ambiance « gala »']},
];
const tg=document.getElementById('tenueGrid');
TENUES.forEach(t=>{
  const c=document.createElement('div');
  c.className='tenue-card'+(t.gala?' gala':'');
  c.innerHTML=`${silhouette(t.cfg)}<h3>${t.icon||''}${t.name}</h3>
    <p class="tenue-blurb">${t.blurb}</p>
    <ul>${t.items.map(i=>`<li>${i}</li>`).join('')}</ul>`;
  tg.appendChild(c);
});

/* =========================================================
   CODES PENAUX + RADIO
   ========================================================= */
const PENAL=[
  {n:'148', id:'148', l:'Refus d\'obtempérer', sev:'delit',
   desc:'Refus d\'obtempérer à un ordre d\'un agent de la force publique.'},
  {n:'187', id:'187', l:'Homicide', sev:'crime',
   desc:'Homicide volontaire ou involontaire d\'une personne.'},
  {n:'207', id:'207', l:'Kidnapping', sev:'crime',
   desc:'Séquestration ou enlèvement d\'une personne contre son gré.'},
  {n:'211', id:'211', l:'Braquage', meta:'Suspects armés', sev:'crime',
   desc:'Vol à main armée avec présence de suspects armés.'},
  {n:'211', id:'211s', l:'Braquage silencieux', meta:'Braquage avec alarme silencieuse', sub:'Silencieux', sev:'crime',
   rp:'N\'existe pas dans le vrai code pénal californien.',
   desc:'Braquage avec déclenchement d\'une alarme silencieuse.'},
  {n:'240', id:'240', l:'Attaque', meta:'Tout type', sev:'delit',
   desc:'Attaque physique de toute nature sur une ou plusieurs personnes.'},
  {n:'246', id:'246', l:'Attaque avec arme létale', sev:'crime',
   desc:'Agression commise avec une arme pouvant causer la mort.'},
  {n:'415', id:'415', l:'Trouble à l\'ordre public', sev:'contravention',
   desc:'Comportement perturbant l\'ordre et la tranquillité publique.'},
  {n:'417', id:'417', l:'Personne avec une arme', sev:'delit',
   desc:'Individu portant ou brandissant une arme en public.'},
  {n:'459', id:'459', l:'Cambriolage', sev:'crime',
   desc:'Entrée par effraction dans un bâtiment avec intention de commettre un délit.'},
  {n:'480', id:'480', l:'Délit de fuite', sev:'delit',
   rp:'Réellement VC 20001 / 20002 en droit californien.',
   desc:'Fuite après accident ou interpellation.'},
  {n:'487', id:'487', l:'Vol de voiture', sev:'crime',
   desc:'Vol d\'un véhicule motorisé appartenant à autrui.'},
  {n:'502', id:'502', l:'Conduite sous influence', meta:'Alcool / drogues', sev:'delit',
   rp:'Réellement VC 23152 en droit californien.',
   desc:'Conduite sous l\'emprise d\'alcool ou de stupéfiants.'},
];
const RADIO=[
  {n:'1',l:'Déplacement normal',meta:'Aucun gyrophare, aucune sirène. Conduite normale.',c:'#4fc3f7',gyro:false,siren:false},
  {n:'2',l:'Prioritaire',meta:'Gyrophare activé, sans sirène. Vitesse modérée, prudence aux carrefours.',c:'#ea580c',gyro:true,siren:false},
  {n:'3',l:'Urgence',meta:'Gyrophare + sirène activés. Conduite rapide.',c:'#dc2626',gyro:true,siren:true,urgent:true},
  {n:'3+',l:'Urgence maximale',meta:'Gyrophare + sirène + vitesse maximale + changement de tonalité de sirène.',c:'#dc2626',gyro:true,siren:true,urgent:true},
  {n:'4',l:'Intervention terminée',meta:'Situation en ordre. Retour en patrouille.',c:'#2fb96b',gyro:false,siren:false},
  {n:'4A',l:'Code 4 Adam',meta:'Perte visuelle d\'un fuyard (véhicule ou piéton). Lancer un BOLO : description physique du suspect ou du véhicule.',c:'#f0a93c'},
  {n:'5',l:'Surveillance de zone',meta:'Surveillance active d\'un secteur.',c:'#4fc3f7'},
  {n:'6',l:'Arrivée sur place',meta:'Annoncer l\'arrivée et préciser l\'endroit.',ex:'14Adam11 Code 6 sur les ventes de stup Vinewood Blvd',c:'#4fc3f7'},
  {n:'7',l:'Pause',meta:'Pause patrouille — à annoncer (peu utilisé).',c:'#6b7280'},
  {n:'TC',l:'CAR TC',meta:'Accident contre un véhicule.',c:'#9aa3ad'},
  {n:'FC',l:'CAR FC',meta:'Accident contre du mobilier urbain.',c:'#9aa3ad'},
  {n:'RA',l:'RA',meta:'Ambulance / Paramedic.',c:'#e23c3c'},
];

/* ---- Penal-code illustrations (100x100, navy ground) ---- */
function penalBase(inner){
  return `<svg class="code-illu" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
    <rect x="1" y="1" width="98" height="98" rx="14" fill="#1a2744" stroke="#0a1220" stroke-width="1.5"/>
    ${inner}</svg>`;
}
function rpCorner(){ return `<g><rect x="66" y="8" width="26" height="13" rx="3" fill="#ea580c"/>
  <text x="79" y="18" text-anchor="middle" font-family="JetBrains Mono" font-weight="800" font-size="8" fill="#1a1208">⚠RP</text></g>`; }

const PENAL_ILLU = {
  '148':()=>`<rect x="56" y="16" width="26" height="11" rx="4" fill="#8a93a0"/><path d="M60 16 q4 -5 12 0" fill="#8a93a0"/>
    <path d="M70 28 Q56 38 48 50" stroke="#dc2626" stroke-width="2" stroke-dasharray="3 3" fill="none"/>
    <rect x="22" y="50" width="52" height="30" rx="6" fill="#1a4d8f" stroke="#0d2747" stroke-width="1.5"/>
    <rect x="27" y="45" width="42" height="9" rx="3" fill="#15314f"/>
    <rect x="38" y="40" width="20" height="7" rx="2" fill="#0d1117"/><rect x="38" y="40" width="10" height="7" rx="2" fill="#e23c3c"/><rect x="48" y="40" width="10" height="7" rx="2" fill="#4fc3f7"/>
    <rect x="26" y="60" width="9" height="6" rx="2" fill="#dc2626"/><rect x="61" y="60" width="9" height="6" rx="2" fill="#dc2626"/>
    <circle cx="34" cy="80" r="5" fill="#0d1117"/><circle cx="62" cy="80" r="5" fill="#0d1117"/>
    <path d="M44 85 l4 5 l4 -5" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round"/>`,
  '187':()=>`<g transform="rotate(-16 50 60)"><circle cx="28" cy="60" r="8" fill="#0d1117"/><ellipse cx="54" cy="62" rx="22" ry="9" fill="#0d1117"/></g>
    <g transform="rotate(-16 50 60)" fill="none" stroke="#e8e8e8" stroke-width="1.6" stroke-dasharray="3 3"><circle cx="28" cy="60" r="11"/><ellipse cx="56" cy="62" rx="27" ry="13"/></g>
    <path d="M14 86 l4 -13 l4 13z" fill="#ea580c"/><rect x="13" y="85" width="10" height="3" fill="#c2470d"/>
    <path d="M82 86 l4 -13 l4 13z" fill="#ea580c"/><rect x="81" y="85" width="10" height="3" fill="#c2470d"/>
    <g transform="translate(80,20)"><rect x="-3" y="-9" width="6" height="18" rx="2" fill="#dc2626"/><rect x="-9" y="-3" width="18" height="6" rx="2" fill="#dc2626"/></g>`,
  '207':()=>`<circle cx="50" cy="26" r="9" fill="#e8e8e8"/><path d="M40 40 q10 -6 20 0 l-3 26 h-14 z" fill="#e8e8e8"/>
    <path d="M42 44 L20 56" stroke="#e8e8e8" stroke-width="5" stroke-linecap="round"/><path d="M58 44 L80 56" stroke="#e8e8e8" stroke-width="5" stroke-linecap="round"/>
    <g fill="none" stroke="#c9a84c" stroke-width="2"><ellipse cx="26" cy="60" rx="3" ry="4.5"/><ellipse cx="33" cy="65" rx="3" ry="4.5"/><ellipse cx="40" cy="69" rx="3" ry="4.5"/><ellipse cx="74" cy="60" rx="3" ry="4.5"/><ellipse cx="67" cy="65" rx="3" ry="4.5"/><ellipse cx="60" cy="69" rx="3" ry="4.5"/></g>
    <rect x="44" y="70" width="12" height="12" rx="2" fill="#c9a84c"/><path d="M46 70 v-4 a4 4 0 018 0 v4" fill="none" stroke="#c9a84c" stroke-width="2.4"/><circle cx="50" cy="76" r="2" fill="#1a2744"/>`,
  '211':()=>`<path d="M50 12 l11 18 h-22 z" fill="#ea580c"/><text x="50" y="28" text-anchor="middle" font-family="JetBrains Mono" font-weight="800" font-size="11" fill="#1a1208">!</text>
    <circle cx="62" cy="40" r="8" fill="#e8e8e8"/><path d="M54 52 q8 -5 16 0 l0 14 h-16 z" fill="#e8e8e8"/>
    <path d="M55 52 L50 38" stroke="#e8e8e8" stroke-width="4" stroke-linecap="round"/><path d="M69 52 L74 38" stroke="#e8e8e8" stroke-width="4" stroke-linecap="round"/>
    <rect x="12" y="66" width="76" height="6" fill="#8a93a0"/><rect x="12" y="72" width="76" height="12" fill="#555"/>
    <path d="M8 58 L34 55" stroke="#1a4d8f" stroke-width="6" stroke-linecap="round"/><rect x="32" y="51" width="15" height="6" rx="1" fill="#222"/><rect x="34" y="57" width="5" height="7" rx="1" fill="#222"/>`,
  '211s':()=>`<rect x="24" y="36" width="46" height="46" rx="4" fill="#555" stroke="#333" stroke-width="2"/><rect x="28" y="40" width="30" height="38" rx="2" fill="#444"/><line x1="58" y1="40" x2="58" y2="78" stroke="#2a2a2a" stroke-width="1.5"/>
    <circle cx="43" cy="59" r="7" fill="none" stroke="#c9a84c" stroke-width="2"/><circle cx="43" cy="59" r="2" fill="#c9a84c"/><rect x="61" y="56" width="7" height="3" fill="#c9a84c"/>
    <g transform="translate(72,30)"><path d="M-6 4 a6 6 0 0112 0 q0 4 2 6 h-16 q2 -2 2 -6Z" fill="#c9a84c"/><circle cx="0" cy="12" r="1.6" fill="#c9a84c"/><line x1="-10" y1="-3" x2="10" y2="15" stroke="#dc2626" stroke-width="2.5"/></g>
    <g transform="translate(24,22)" stroke="#dc2626" fill="none" stroke-width="2"><path d="M-6 0 a8 8 0 0112 0"/><path d="M-3 4 a4 4 0 016 0"/></g><circle cx="24" cy="32" r="1.6" fill="#dc2626"/>`,
  '240':()=>`<g stroke="#c9a84c" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"><path d="M74 42 q9 6 0 12"/><path d="M80 52 q8 6 0 12"/><path d="M72 60 q9 6 0 12"/></g>
    <g transform="translate(34,38)"><rect x="0" y="2" width="30" height="24" rx="9" fill="#e8c99a" stroke="#b9985f" stroke-width="1.6"/><g stroke="#b9985f" stroke-width="1.3"><path d="M7 2 v7"/><path d="M15 2 v7"/><path d="M23 2 v7"/></g><rect x="-4" y="9" width="9" height="12" rx="4.5" fill="#e8c99a" stroke="#b9985f" stroke-width="1.3"/></g>
    ${star(28,50,6)}${star(22,62,4)}${star(34,66,4)}`,
  '246':()=>`<g transform="translate(30,46)"><rect x="2" y="0" width="40" height="9" rx="2" fill="#555"/><rect x="8" y="9" width="11" height="16" rx="2" fill="#555"/><rect x="19" y="9" width="9" height="5" fill="#555"/><rect x="20" y="9" width="2.5" height="6" fill="#333"/></g>
    <path d="M30 50 l-12 -4 l9 4 l-10 4 l12 0 l-8 4 l11 -4z" fill="#ea580c"/><path d="M30 50 l-7 -2 l5 2 l-6 2 l8 0z" fill="#ffd54a"/>
    <g stroke="#e8e8e8" stroke-width="1.4" stroke-dasharray="2 3" opacity=".7"><path d="M16 48 H6"/><path d="M16 53 H4"/></g>
    <rect x="70" y="34" width="4" height="8" rx="1.5" fill="#c9a84c" transform="rotate(35 72 38)"/>`,
  '415':()=>`<g fill="#e8e8e8"><circle cx="20" cy="52" r="6"/><ellipse cx="20" cy="70" rx="8" ry="11"/><circle cx="40" cy="48" r="6"/><ellipse cx="40" cy="68" rx="8" ry="12"/><circle cx="60" cy="48" r="6"/><ellipse cx="60" cy="68" rx="8" ry="12"/><circle cx="80" cy="52" r="6"/><ellipse cx="80" cy="70" rx="8" ry="11"/></g>
    <g stroke="#e8e8e8" stroke-width="4" stroke-linecap="round"><path d="M34 60 L28 44"/><path d="M46 60 L52 44"/><path d="M54 60 L48 44"/><path d="M66 60 L72 44"/></g>
    <g transform="translate(50,18)"><rect x="-15" y="-11" width="30" height="17" rx="5" fill="#f2f2f2"/><path d="M-6 6 l-2 6 l8 -6z" fill="#f2f2f2"/><text x="0" y="2" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="12" fill="#dc2626">!!!</text></g>
    <g stroke="#4fc3f7" fill="none" stroke-width="1.5" opacity=".6"><path d="M10 44 q-4 8 0 16"/><path d="M90 44 q4 8 0 16"/></g>`,
  '417':()=>`<circle cx="50" cy="32" r="22" fill="none" stroke="#dc2626" stroke-width="2" stroke-dasharray="4 3"/>
    <rect x="36" y="42" width="28" height="40" rx="6" fill="#4a3728" stroke="#2e2114" stroke-width="1.5"/><rect x="34" y="40" width="32" height="8" rx="3" fill="#3a2a1c"/><rect x="47" y="41" width="6" height="6" rx="1" fill="#c9a84c"/>
    <rect x="42" y="24" width="16" height="18" rx="3" fill="#222"/><rect x="39" y="22" width="22" height="12" rx="6" fill="#e8c99a" stroke="#b9985f" stroke-width="1.3"/>
    <g transform="translate(50,10)"><rect x="-2" y="-6" width="4" height="9" rx="2" fill="#dc2626"/><circle cx="0" cy="6" r="2" fill="#dc2626"/></g>`,
  '459':()=>`<circle cx="80" cy="20" r="7" fill="#4fc3f7" opacity=".85"/><circle cx="83" cy="18" r="7" fill="#1a2744"/>
    <g fill="#4fc3f7"><circle cx="64" cy="16" r="1.3"/><circle cx="72" cy="26" r="1"/><circle cx="58" cy="24" r="1"/></g>
    <path d="M22 52 L50 30 L78 52 Z" fill="#16243f" stroke="#c9a84c" stroke-width="1.5"/><rect x="28" y="52" width="44" height="32" fill="#1a2744" stroke="#c9a84c" stroke-width="1.5"/>
    <rect x="54" y="58" width="14" height="14" fill="#0b1422" stroke="#c9a84c" stroke-width="1"/><g stroke="#9fb6c9" stroke-width="1"><path d="M61 58 v14M54 65 h14M55 59 l12 12M67 59 l-12 12"/></g>
    <circle cx="42" cy="60" r="5" fill="#0d1117"/><path d="M36 84 q4 -16 12 -12 l0 12z" fill="#0d1117"/><path d="M44 60 L60 53 L61 57 L45 64Z" fill="#ffe082" opacity=".5"/>`,
  '480':()=>`<g transform="rotate(5 50 58)"><rect x="26" y="52" width="46" height="14" rx="5" fill="#c9a84c"/><path d="M34 52 q7 -11 22 -9 l9 9z" fill="#c9a84c"/><rect x="58" y="46" width="8" height="6" rx="1" fill="#4fc3f7"/><circle cx="38" cy="67" r="5" fill="#0d1117"/><circle cx="62" cy="67" r="5" fill="#0d1117"/></g>
    <g stroke="#e8e8e8" stroke-width="2" stroke-linecap="round" opacity=".55"><path d="M8 44 h16"/><path d="M6 50 h20"/><path d="M9 56 h15"/><path d="M12 62 h11"/></g>
    <path d="M18 80 q9 -5 18 0 t18 0 t18 0" stroke="#0d1117" stroke-width="2.5" fill="none" opacity=".55"/>${rpCorner()}`,
  '487':()=>`<rect x="22" y="50" width="50" height="16" rx="5" fill="#555"/><path d="M30 50 q8 -12 26 -10 l9 10z" fill="#555"/>
    <rect x="46" y="42" width="14" height="10" fill="#0b1422"/><g stroke="#9fb6c9" stroke-width="1"><path d="M46 42 l14 10M60 42 l-14 10M53 42 v10"/></g>
    <rect x="44" y="38" width="2.4" height="22" fill="#c9a84c"/>
    <circle cx="34" cy="68" r="5" fill="#0d1117"/><circle cx="62" cy="68" r="5" fill="#0d1117"/>
    <g transform="translate(74,40)"><circle cx="0" cy="0" r="4" fill="none" stroke="#c9a84c" stroke-width="2"/><rect x="3" y="-1.5" width="11" height="3" fill="#c9a84c"/><rect x="12" y="1" width="2.4" height="3" fill="#c9a84c"/></g>
    <g fill="#9fb6c9" opacity=".35"><circle cx="18" cy="62" r="3"/><circle cx="13" cy="58" r="4"/><circle cx="8" cy="53" r="3"/></g>`,
  '502':()=>`<circle cx="42" cy="58" r="20" fill="none" stroke="#e8e8e8" stroke-width="4"/><circle cx="42" cy="58" r="6" fill="#e8e8e8"/>
    <g stroke="#e8e8e8" stroke-width="3"><path d="M42 58 L42 38"/><path d="M42 58 L25 68"/><path d="M42 58 L59 68"/></g>
    <g transform="translate(68,30)"><path d="M-11 0 L11 0 L0 13 Z" fill="#4fc3f7" opacity=".85"/><rect x="-1.2" y="13" width="2.4" height="12" fill="#4fc3f7"/><rect x="-7" y="25" width="14" height="2.4" fill="#4fc3f7"/></g>
    <g fill="#bfeaff"><circle cx="63" cy="26" r="1.6"/><circle cx="70" cy="22" r="1.3"/><circle cx="67" cy="31" r="1.1"/></g>
    <path d="M12 86 q8 -8 14 0 t12 0 t12 -2" stroke="#ea580c" stroke-width="2" fill="none" stroke-dasharray="3 2"/>${rpCorner()}`,
};

function renderCodes(grid,data,radio){
  grid.innerHTML='';
  data.forEach(c=>{
    const card=document.createElement('div');
    card.dataset.search=(c.n+' '+c.l+' '+(c.meta||'')+' '+(c.sub||'')+' '+(c.desc||'')+' '+(c.ex||'')).toLowerCase();
    if(radio){
      card.className='code-card radio'+(c.rp?' rp':'')+(c.urgent?' urgent':'');
      if(c.c) card.style.setProperty('--rcol', c.c);
      const lights = (c.gyro!==undefined || c.siren!==undefined)
        ? `<div class="rlights">
             <span class="rl${c.gyro?' on':''}"><i class="dot gyro"></i>Gyrophare</span>
             <span class="rl${c.siren?' on':''}"><i class="dot siren"></i>Sirène</span>
           </div>` : '';
      card.innerHTML=`${c.rp?'<span class="tag-rp">Note RP</span>':''}
        <div class="num">${c.n}</div>
        <div class="body">
          <div class="label">${c.l}${c.sub?` <span style="color:#9fb3c9;font-size:.7rem">(${c.sub})</span>`:''}</div>
          ${c.meta?`<div class="meta">${c.meta}</div>`:''}
          ${lights}
          ${c.ex?`<div class="rex"><b>Ex :</b> ${c.ex}</div>`:''}
          ${c.rp?`<span class="rp-note">⚠ ${c.rp}</span>`:''}
        </div>`;
    } else {
      const sevColor = c.sev==='crime'?'#dc2626':c.sev==='delit'?'#ea580c':c.sev==='contravention'?'#ca8a04':'#c9a84c';
      card.className='code-card penal'+(c.rp?' rp':'');
      card.style.setProperty('--sev', sevColor);
      const illu = PENAL_ILLU[c.id] ? penalBase(PENAL_ILLU[c.id]()) : '';
      card.innerHTML=`${c.rp?'<span class="tag-rp">Note RP</span>':''}${illu}
        <div class="body">
          <div class="cnum-row"><span class="num">${c.n}</span><span class="clabel">${c.l}${c.sub?` <span class="csub">(${c.sub})</span>`:''}</span></div>
          ${c.meta?`<div class="meta">${c.meta}</div>`:''}
          ${c.rp?`<span class="rp-note">⚠ ${c.rp}</span>`:''}
          ${c.desc?`<p class="cdesc">${c.desc}</p>`:''}
        </div>`;
      card.addEventListener('click',()=>card.classList.toggle('show-desc'));
    }
    grid.appendChild(card);
  });
}
renderCodes(document.getElementById('penalGrid'),PENAL,false);
renderCodes(document.getElementById('radioGrid'),RADIO,true);

function wireSearch(inputId,gridId,countId,total){
  const input=document.getElementById(inputId), grid=document.getElementById(gridId), count=document.getElementById(countId);
  function upd(){
    const q=input.value.trim().toLowerCase(); let vis=0;
    grid.querySelectorAll('.code-card').forEach(c=>{
      const ok=!q||c.dataset.search.includes(q);
      c.style.display=ok?'':'none'; if(ok) vis++;
    });
    count.textContent=`${vis} / ${total} codes`;
  }
  input.addEventListener('input',upd); upd();
}
wireSearch('penalSearch','penalGrid','penalCount',PENAL.length);
wireSearch('radioSearch','radioGrid','radioCount',RADIO.length);

/* =========================================================
   ROUTER — belles URLs (/grades, /codes-radio, /traffic-stop…)
   History API côté client ; nginx sert la page unique pour ces chemins.
   ========================================================= */
const tabs=document.querySelectorAll('.tab'), panels=document.querySelectorAll('.panel');
/* id de panneau  ->  slug d'URL */
const SLUGS={
  grades:'grades', tenues:'tenues', penal:'codes-penaux', radio:'codes-radio',
  miranda:'miranda', procedures:'procedures', trafficstop:'traffic-stop',
  divisions:'divisions', quiz:'quiz'
};
const ID_BY_SLUG=Object.fromEntries(Object.entries(SLUGS).map(([id,s])=>[s,id]));
const TITLES={
  grades:'Grades & Insignes', tenues:'Tenues & Apparence', penal:'Codes Pénaux',
  radio:'Codes Radio', miranda:'Avertissement Miranda', procedures:'Procédures',
  trafficstop:'Traffic & Felony Stop', divisions:'Divisions', quiz:'Quiz'
};
const BASE_TITLE='LSPD — Manuel de Révision';

/* lit l'onglet depuis l'URL courante (1er segment du chemin) */
function routeId(){
  const seg=location.pathname.replace(/^\/+|\/+$/g,'').split('/')[0];
  return ID_BY_SLUG[seg] || 'grades';
}
/* met à jour l'URL sans casser un usage local en file:// */
function pushURL(slug, replace){
  if(location.protocol==='file:') return;          // pas de routing propre en file://
  const url='/'+slug;
  if(location.pathname===url) return;
  try{ history[replace?'replaceState':'pushState']({tab:ID_BY_SLUG[slug]}, '', url); }catch(e){/* opaque origin */}
}
function setActive(targetId, {push=false, replace=false, scroll=true}={}){
  if(!document.getElementById(targetId)) targetId='grades';
  tabs.forEach(x=>{
    const on=x.dataset.target===targetId;
    x.classList.toggle('active', on);
    if(on){ x.setAttribute('aria-current','page'); } else { x.removeAttribute('aria-current'); }
  });
  panels.forEach(p=>p.classList.toggle('active', p.id===targetId));
  const slug=SLUGS[targetId]||targetId;
  document.title=`${TITLES[targetId]||'Manuel'} · ${BASE_TITLE}`;
  if(push) pushURL(slug,false); else if(replace) pushURL(slug,true);
  if(scroll) window.scrollTo({top:0,behavior:'smooth'});
}
tabs.forEach(t=>t.addEventListener('click',()=>setActive(t.dataset.target,{push:true})));
window.addEventListener('popstate',e=>setActive((e.state&&e.state.tab)||routeId(),{scroll:false}));
/* route initiale : canonise l'URL (/, /lspd-revision.html -> /grades) via replaceState */
setActive(routeId(),{replace:true, scroll:false});

/* =========================================================
   MIRANDA — speech synthesis
   ========================================================= */
const MIRANDA={
  en:"You have the right to remain silent. Anything you say can and will be used against you in a court of law. You have the right to an attorney. If you cannot afford an attorney, one will be appointed for you. Do you understand these rights as they have been read to you?",
  es:"Tiene el derecho de guardar silencio. Todo lo que diga puede y será usado en su contra ante un tribunal de justicia. Tiene el derecho a tener un abogado presente. Si no puede pagar un abogado, se le asignará uno antes del interrogatorio. ¿Entiende estos derechos?",
  fr:"Vous avez le droit de garder le silence. Tout ce que vous direz pourra être utilisé contre vous devant un tribunal. Vous avez le droit de consulter un avocat. Si vous n'en avez pas les moyens, un avocat vous sera désigné avant l'interrogatoire. Comprenez-vous ces droits tels qu'ils viennent de vous être lus ?"
};
const MIRANDA_LOCALE={en:'en-US',es:'es-ES',fr:'fr-FR'};
document.querySelectorAll('.play').forEach(btn=>{
  btn.addEventListener('click',()=>{
    if(!('speechSynthesis' in window)){ btn.textContent='Synthèse vocale indisponible'; return; }
    const lang=btn.dataset.lang;
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(MIRANDA[lang]);
    u.lang = MIRANDA_LOCALE[lang]||'en-US'; u.rate=.95;
    speechSynthesis.speak(u);
  });
});

/* =========================================================
   DIVISIONS — illustrations (each ~104x104) + organigramme
   ========================================================= */
function divPA(){return `<svg class="div-illu" viewBox="0 0 104 104"><g filter="url(#dsSoft)">
  <path d="M52 22 L86 36 L52 50 L18 36 Z" fill="#1a2744" stroke="#c9a84c" stroke-width="2"/>
  <path d="M40 44 v11 q12 8 24 0 v-11" fill="#16243f" stroke="#c9a84c" stroke-width="1.5"/>
  <line x1="86" y1="36" x2="86" y2="58" stroke="#c9a84c" stroke-width="2"/><circle cx="86" cy="61" r="3.6" fill="#c9a84c"/>
  <path d="M22 70 q28 -7 30 3 q2 -10 30 -3 v17 q-28 -7 -30 3 q-2 -10 -30 -3 Z" fill="#16243f" stroke="#c9a84c" stroke-width="1.5"/>
  <line x1="52" y1="73" x2="52" y2="89" stroke="#c9a84c" stroke-width="1"/>
  <text x="37" y="84" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="7" fill="#c9a84c">LSPD</text></g></svg>`;}
function divMetro(){return `<svg class="div-illu" viewBox="0 0 104 104"><g filter="url(#dsSoft)">
  <path d="M52 14 L82 30 V62 L52 86 L22 62 V30 Z" fill="#1a2744" stroke="#c9a84c" stroke-width="2.5"/>
  <text x="52" y="50" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="13" letter-spacing="1" fill="#c9a84c">METRO</text>
  <path d="M28 60 L76 38" stroke="#e23c3c" stroke-width="2"/>
  <text x="52" y="66" text-anchor="middle" font-family="JetBrains Mono" font-weight="800" font-size="7" letter-spacing="2" fill="#e23c3c">ELITE</text></g></svg>`;}
function divASD(){return `<svg class="div-illu" viewBox="0 0 104 104"><g filter="url(#dsSoft)">
  <rect x="16" y="28" width="72" height="4" rx="2" fill="#c9a84c"/><rect x="50" y="30" width="4" height="12" fill="#c9a84c"/>
  <ellipse cx="46" cy="58" rx="28" ry="15" fill="#1a2744" stroke="#c9a84c" stroke-width="1.8"/>
  <path d="M72 56 L96 51 L96 58 L72 62 Z" fill="#1a2744" stroke="#c9a84c" stroke-width="1.2"/><rect x="92" y="42" width="4" height="14" rx="2" fill="#c9a84c"/>
  <circle cx="38" cy="56" r="7" fill="#4fc3f7" stroke="#0d1117" stroke-width="1"/>
  <path d="M30 76 h34 M36 72 v6 M58 72 v6" stroke="#c9a84c" stroke-width="2" fill="none" stroke-linecap="round"/></g></svg>`;}
function divTD(){return `<svg class="div-illu" viewBox="0 0 104 104"><g filter="url(#dsSoft)">
  <rect x="40" y="14" width="24" height="58" rx="7" fill="#2b2f36" stroke="#0d1117" stroke-width="1.5"/>
  <circle cx="52" cy="27" r="7" fill="#e23c3c"/><circle cx="52" cy="43" r="7" fill="#f0a93c"/><circle cx="52" cy="59" r="7" fill="#2fb96b"/>
  <rect x="49" y="72" width="6" height="18" fill="#4a4f57"/></g></svg>`;}
function divRHD(){return `<svg class="div-illu" viewBox="0 0 104 104"><g filter="url(#dsSoft)">
  <line x1="60" y1="60" x2="84" y2="84" stroke="#c9a84c" stroke-width="8" stroke-linecap="round"/>
  <circle cx="44" cy="44" r="22" fill="rgba(79,195,247,.08)" stroke="#c9a84c" stroke-width="4"/>
  <path d="M34 38 a12 12 0 018 -6" stroke="#ffffff" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".75"/></g></svg>`;}
function divGND(){return `<svg class="div-illu" viewBox="0 0 104 104"><g filter="url(#dsSoft)">
  <path d="M20 34 h22 l5 6 h37 v44 H20 Z" fill="#9c7d2e"/>
  <rect x="30" y="40" width="44" height="32" fill="#f3ead0"/><g stroke="#c9a84c" stroke-width="1.6"><path d="M36 48h32"/><path d="M36 55h32"/><path d="M36 62h22"/></g>
  <path d="M16 48 h72 l-7 38 H23 Z" fill="#c9a84c" stroke="#7d6325" stroke-width="1"/>
  <rect x="42" y="40" width="22" height="9" rx="2" fill="#1a2744"/><text x="53" y="47" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="7" fill="#c9a84c">GND</text></g></svg>`;}
function divDSG(){return `<svg class="div-illu" viewBox="0 0 104 104"><g filter="url(#dsSoft)" fill="none" stroke="#e8e8e8" stroke-width="3" stroke-linecap="round">
  <path d="M32 86 h40"/><path d="M52 86 v-12"/><path d="M52 74 q-16 -2 -12 -28"/>
  <path d="M38 70 h24"/></g>
  <rect x="44" y="22" width="12" height="26" rx="5" fill="#1a2744" stroke="#e8e8e8" stroke-width="2"/>
  <circle cx="50" cy="19" r="6" fill="#1a2744" stroke="#e8e8e8" stroke-width="2"/></svg>`;}
function divComm(){return `<svg class="div-illu" viewBox="0 0 104 104"><g filter="url(#dsSoft)">
  <g fill="none" stroke="#4fc3f7" stroke-width="2.4"><circle cx="52" cy="40" r="13" opacity=".8"/><circle cx="52" cy="40" r="21" opacity=".45"/><circle cx="52" cy="40" r="29" opacity=".22"/></g>
  <rect x="49" y="40" width="6" height="46" fill="#e8e8e8"/><path d="M40 86 h24" stroke="#e8e8e8" stroke-width="3" stroke-linecap="round"/>
  <g fill="#c9a84c"><rect x="44" y="40" width="16" height="4" rx="2"/><rect x="46" y="48" width="12" height="4" rx="2"/><rect x="48" y="56" width="8" height="4" rx="2"/></g></g></svg>`;}
function divMRD(){return `<svg class="div-illu" viewBox="0 0 104 104"><g filter="url(#dsSoft)">
  <rect x="22" y="40" width="58" height="38" rx="5" fill="#1a2744" stroke="#c9a84c" stroke-width="1.8"/>
  <rect x="30" y="32" width="16" height="10" rx="2" fill="#1a2744" stroke="#c9a84c" stroke-width="1.2"/>
  <circle cx="56" cy="59" r="13" fill="#0d1117" stroke="#c9a84c" stroke-width="2"/><circle cx="56" cy="59" r="7" fill="#16243f" stroke="#4fc3f7" stroke-width="1.5"/>
  <rect x="72" y="30" width="12" height="10" rx="2" fill="#e8e8e8"/><path d="M78 23 l-3 6 h6 z" fill="#fff3c4"/>
  <text x="40" y="73" text-anchor="middle" font-family="JetBrains Mono" font-weight="800" font-size="7" fill="#c9a84c">PRESS</text></g></svg>`;}

const DIVISIONS=[
  {sig:'PA', name:'Police Academy', accent:'#f0c34c', special:false, illu:divPA, desc:'Formation initiale et continue des recrues et officiers.'},
  {sig:'Metro', name:"Division d'élite", accent:'#e23c3c', special:true, illu:divMetro, desc:'Patrol, Bomb Squad, K-9, SWAT. Regroupe les unités d\'intervention spécialisées.'},
  {sig:'ASD', name:'Air Support Division', accent:'#4fc3f7', special:true, illu:divASD, desc:'Surveillance et support aérien, coordination depuis les airs.'},
  {sig:'TD', name:'Traffic Division', accent:'#f0a93c', special:false, illu:divTD, desc:'Régulation routière, gestion auto et moto.'},
  {sig:'RHD', name:'Robbery & Homicide Division', accent:'#b86bff', special:true, illu:divRHD, desc:'Crimes graves, homicides, braquages. Dossiers complexes.'},
  {sig:'GND', name:'Gang & Narcotic Division', accent:'#2fb96b', special:true, illu:divGND, desc:'Trafics de stupéfiants et activités des gangs.'},
  {sig:'DSG', name:'Detective Service Group', accent:'#46c9c9', special:true, illu:divDSG, desc:'Support investigation (légistes, SIS, analyses).'},
  {sig:'Comm', name:'Communication Division', accent:'#5b8def', special:false, illu:divComm, desc:'Dispatching — ouvert aux civils.'},
  {sig:'MRD', name:'Media Relations Division', accent:'#ff7eb6', special:false, illu:divMRD, desc:'Interface médias et population. Gestion de l\'image publique du LSPD.'},
];

function buildOrg(){
  const cx=140, cy=100, rx=108, ry=72; let lines='', nodes='';
  DIVISIONS.forEach((d,i)=>{
    const a=(-90 + i*40)*Math.PI/180, x=cx+rx*Math.cos(a), y=cy+ry*Math.sin(a);
    lines+=`<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#c9a84c" stroke-width="1.4" opacity=".55"/>`;
    nodes+=`<g><rect x="${(x-25).toFixed(1)}" y="${(y-13).toFixed(1)}" width="50" height="26" rx="8" fill="#16243f" stroke="${d.accent}" stroke-width="1.6"/>
      <text x="${x.toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="middle" font-family="Oswald" font-weight="600" font-size="11" fill="${d.accent}">${d.sig}</text></g>`;
  });
  return `<svg viewBox="0 0 280 200" aria-label="Organigramme des divisions">${lines}${nodes}
    <rect x="106" y="84" width="68" height="32" rx="8" fill="#1a2744" stroke="url(#gGold)" stroke-width="2.2" filter="url(#dsSoft)"/>
    <text x="140" y="105" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="15" letter-spacing="1" fill="url(#gGold)">LSPD</text></svg>
    <div class="illu-cap">Vue d'ensemble de l'organisation interne du LSPD</div>`;
}
document.getElementById('divOrg').innerHTML = buildOrg();

const dg=document.getElementById('divGrid');
DIVISIONS.forEach(d=>{
  const card=document.createElement('div');
  card.className='div-card';
  card.style.setProperty('--accent', d.accent);
  card.innerHTML=`${d.illu()}<div class="div-sigle">${d.sig}</div><div class="div-name">${d.name}</div>
    <div class="div-desc">${d.desc}</div>
    ${d.special?'<span class="access-badge">🔒 Accès requis</span>':''}`;
  dg.appendChild(card);
});

/* =========================================================
   QUIZ — score & progression
   ========================================================= */
const QUIZ=[
  {cat:'Codes pénaux', q:'Que signifie le code 187 ?', opts:['Homicide','Kidnapping','Braquage','Cambriolage'], a:0, expl:'187 = Homicide.'},
  {cat:'Codes pénaux', q:'Le code 211 correspond à :', opts:['Vol de voiture','Braquage (suspects armés)','Délit de fuite','Attaque'], a:1, expl:'211 = Braquage, suspects armés.'},
  {cat:'Codes pénaux', q:'Quel code est une note RP (inexistant en vrai) ?', opts:['480','502','211 Silencieux','148'], a:2, expl:'Le 211 Silencieux est propre au RP.'},
  {cat:'Codes radio', q:'Le Code 4 signifie :', opts:['Urgence absolue','Pas de renfort nécessaire','Surveillance active','Pause patrouille'], a:1, expl:'Code 4 = pas de renfort / fin d\'opération.'},
  {cat:'Codes radio', q:'Quel code impose une arrivée gyrophares allumés ?', opts:['Code 1','Code 2','Code 3','Code 6'], a:2, expl:'Code 3 = urgence, gyros allumés.'},
  {cat:'Codes radio', q:'« RA » désigne :', opts:['Un renfort armé','Une ambulance / paramedic','Un accident','Une arrestation'], a:1, expl:'RA = Ambulance / Paramedic.'},
  {cat:'Grades', q:'L\'insigne d\'un Sergeant II est :', opts:['2 chevrons','3 chevrons','3 chevrons + rocker','1 étoile'], a:2, expl:'Sergeant II = 3 chevrons + rocker.'},
  {cat:'Grades', q:'Le Chief of Police porte :', opts:['1 étoile vide','2 étoiles','3 étoiles','4 étoiles pleines'], a:3, expl:'Chief = 4 étoiles pleines argentées.'},
  {cat:'Grades', q:'L\'insigne du Commander est :', opts:['1 étoile vide (contour)','1 barre','Double barre','Un aigle'], a:0, expl:'Commander = 1 étoile en contour seul.'},
  {cat:'Grades', q:'1 barre de galon dorée représente :', opts:['1 an','5 ans','10 ans','un grade'], a:1, expl:'1 barre = 5 ans de service.'},
  {cat:'Tenues', q:'La Classe C se caractérise par :', opts:['Cravate obligatoire','Manches courtes','Gants blancs','Casquette obligatoire'], a:1, expl:'Classe C = manches courtes, avant-bras nus.'},
  {cat:'Tenues', q:'Quelle classe exige gants blancs et casquette ?', opts:['Classe A','Classe B','Classe C','Cérémonie'], a:3, expl:'La tenue de cérémonie.'},
  {cat:'Miranda', q:'En droit réel, les droits Miranda se lisent :', opts:['Au moment exact de l\'arrestation','Avant l\'interrogatoire en garde à vue','Au tribunal','Jamais'], a:1, expl:'En droit réel : avant l\'interrogatoire.'},
  {cat:'Procédures', q:'Après avoir menotté, l\'étape suivante est :', opts:['Transport direct','Fouille de sécurité','Mise en cellule','Rédaction du rapport'], a:1, expl:'Fouille de sécurité (palpation) après menottage.'},
  {cat:'Procédures', q:'Un délit majeur (ex. 187) implique :', opts:['PV simple','Amende plafonnée','Procédure pénale complète','Aucune suite'], a:2, expl:'Délit majeur = procédure pénale complète + jugement.'},
  {cat:'Divisions', q:'Un officier peut appartenir à :', opts:['Autant de divisions qu\'il veut','Une seule division majeure','Deux divisions','Aucune division'], a:1, expl:'Une seule division majeure à la fois.'},
  {cat:'Divisions', q:'La division GND traite :', opts:['Le trafic aérien','Gangs & stupéfiants','La circulation','Les médias'], a:1, expl:'GND = Gang & Narcotic Division.'},
  {cat:'Traffic Stop', q:'La « dead zone » se situe entre :', opts:['Les deux pare-chocs avant','Le feu AV droit police & le feu AR gauche du véhicule','Les deux portières conducteur','Le coffre et la roue de secours'], a:1, expl:'Dead zone = entre le feu avant droit de la police et le feu arrière gauche du véhicule contrôlé. Zone d\'exposition maximale.'},
  {cat:'Traffic Stop', q:'Comment positionner le véhicule de police ?', opts:['Pare-chocs contre pare-chocs','En diagonale derrière le véhicule','Devant le véhicule','Sur la voie d\'en face'], a:1, expl:'En diagonale derrière : cela force la circulation à se déporter et évite les frôlements.'},
  {cat:'Traffic Stop', q:'En fin de contrôle, avant de repartir, on attend :', opts:['Un appel du dispatch','Que le conducteur klaxonne','5 minutes','Le feu vert'], a:1, expl:'Le klaxon du conducteur signale la reprise en sécurité.'},
  {cat:'Traffic Stop', q:'Quel code clôture un traffic stop sans incident ?', opts:['Code 2','Code 3','Code 4','Code 7'], a:2, expl:'Code 4 = situation sous contrôle, retour en patrouille.'},
  {cat:'Traffic Stop', q:'Le Code 3+ ajoute au Code 3 :', opts:['Rien de plus','Vitesse max + changement de tonalité de sirène','Seulement le gyrophare','Un second véhicule'], a:1, expl:'Code 3+ = gyrophare + sirène + vitesse maximale + changement de tonalité de sirène.'},
];
const quizGrid=document.getElementById('quizGrid');
let qAnswered=0, qCorrect=0;
function updateQuiz(){
  document.getElementById('qScore').textContent=qCorrect;
  document.getElementById('qTotal').textContent=QUIZ.length;
  document.getElementById('qAnswered').textContent=qAnswered;
  document.getElementById('qCorrect').textContent=qCorrect;
  document.getElementById('qBar').style.width=(qAnswered/QUIZ.length*100).toFixed(1)+'%';
}
function onAnswer(e){
  const btn=e.currentTarget, card=btn.closest('.qcard');
  if(card.dataset.done) return;
  card.dataset.done='1';
  const qi=+btn.dataset.q, oi=+btn.dataset.o, correct=QUIZ[qi].a;
  card.querySelectorAll('.qopt').forEach((b,idx)=>{
    b.classList.add('locked');
    if(idx===correct) b.classList.add('correct');
    if(idx===oi && oi!==correct) b.classList.add('wrong');
  });
  qAnswered++; if(oi===correct) qCorrect++;
  const ex=card.querySelector('.qexpl');
  ex.innerHTML=`<b>${oi===correct?'✅ Correct.':'❌ Incorrect.'}</b> ${QUIZ[qi].expl}`;
  ex.classList.add('show');
  updateQuiz();
}
function renderQuiz(){
  quizGrid.innerHTML=''; qAnswered=0; qCorrect=0;
  QUIZ.forEach((item,qi)=>{
    const card=document.createElement('div'); card.className='qcard';
    const opts=item.opts.map((o,oi)=>`<button class="qopt" data-q="${qi}" data-o="${oi}">${o}</button>`).join('');
    card.innerHTML=`<div class="qcat">${item.cat}</div><div class="qq">${item.q}</div>${opts}<div class="qexpl"></div>`;
    quizGrid.appendChild(card);
  });
  quizGrid.querySelectorAll('.qopt').forEach(b=>b.addEventListener('click',onAnswer));
  updateQuiz();
}
document.getElementById('qReset').addEventListener('click',renderQuiz);
renderQuiz();
