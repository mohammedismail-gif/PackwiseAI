// Food profiles. rr: respiration mL CO2/kg/h at 5C (0 = non-respiring). sl: baseline shelf life (days) at tr C. o2: target O2 fraction in pack.
// om: max OTR (cc/m2/day) for non-respiring foods. wv: acceptable WVTR window (g/m2/day). gain: best-case shelf-life multiplier from packaging.
const F={
strawberry:{n:"Strawberry",t:"Fresh fruit",g:"fresh",rr:15,sl:3,tr:5,q:2.6,o2:.08,wv:[8,30],gain:2.6},
tomato:{n:"Tomato",t:"Fresh vegetable",g:"fresh",rr:8,sl:12,tr:10,q:2.3,o2:.05,wv:[8,30],gain:2.0},
spinach:{n:"Spinach",t:"Leafy vegetable",g:"fresh",rr:40,sl:5,tr:5,q:2.8,o2:.05,wv:[10,40],gain:2.5},
mushroom:{n:"Button mushroom",t:"Fresh vegetable",g:"fresh",rr:40,sl:4,tr:5,q:2.8,o2:.04,wv:[10,40],gain:2.2},
mango:{n:"Mango",t:"Fresh fruit",g:"fresh",rr:12,sl:10,tr:12,q:2.4,o2:.06,wv:[10,40],gain:1.8},
chicken:{n:"Fresh chicken",t:"Meat",g:"meat",rr:0,sl:4,tr:4,q:3,om:60,wv:[.5,10],gain:2.5},
paneer:{n:"Paneer",t:"Dairy",g:"dairy",rr:0,sl:7,tr:4,q:2.5,om:100,wv:[.5,10],gain:2.2},
rice:{n:"Basmati rice",t:"Dry grain",g:"dry",rr:0,sl:270,tr:25,q:1.6,om:1000,wv:[.5,8],gain:1.6},
chips:{n:"Potato chips",t:"Dry snack",g:"dry",rr:0,sl:120,tr:25,q:1.6,om:5,wv:[.5,3],gain:1.8}};
// Packaging options. otr cc/m2/day, wv g/m2/day, cost Rs per pack, eco 0-100, rug = strength 1-5.
const P=[
{n:"PET tray + breathable MAP film",m:"PET",th:"50–75 µm",cost:[8,12],eco:55,rug:4,seal:"Good",map:1,otr:2800,wv:15,g:["fresh"]},
{n:"rPET tray + micro-perforated lid",m:"Recycled PET",th:"40–60 µm",cost:[9,13],eco:82,rug:4,seal:"Good",map:1,otr:9000,wv:20,g:["fresh"]},
{n:"Bio-blend (PBAT/PLA) breathable film",m:"PBAT/PLA",th:"30–50 µm",cost:[6,9],eco:88,rug:2,seal:"Fair",map:1,otr:800,wv:60,g:["fresh","dry"]},
{n:"PLA compostable bag",m:"PLA",th:"25–40 µm",cost:[6,10],eco:90,rug:2,seal:"Fair",map:1,otr:4000,wv:120,g:["fresh","dry"]},
{n:"LDPE pouch",m:"LDPE",th:"30–50 µm",cost:[2,4],eco:30,rug:3,seal:"Good",otr:7000,wv:14,g:["fresh","dry"]},
{n:"BOPP film pouch",m:"BOPP",th:"20–35 µm",cost:[3,5],eco:35,rug:3,seal:"Good",otr:1500,wv:6,g:["fresh","dry"]},
{n:"PA/PE vacuum pouch",m:"PA/PE",th:"70–90 µm",cost:[5,8],eco:20,rug:5,seal:"Excellent",otr:40,wv:5,g:["meat","dairy","dry"]},
{n:"PET/Al/PE barrier laminate",m:"PET/Al/PE",th:"60–80 µm",cost:[4,7],eco:15,rug:5,seal:"Excellent",otr:1,wv:.5,g:["meat","dairy","dry"]},
{n:"Paperboard + PLA-lined tray",m:"Paperboard/PLA",th:"300–400 µm",cost:[7,10],eco:86,rug:3,seal:"Fair",otr:20,wv:30,g:["dry","dairy"]}];
const $=i=>document.getElementById(i),cl=(x,a,b)=>Math.min(b,Math.max(a,x)),rd=x=>Math.round(x/(x>100?50:x>10?1:.1))*(x>100?50:x>10?1:.1);
const fit=(v,[lo,hi])=>v>=lo&&v<=hi?1:Math.exp(-1.2*Math.abs(Math.log10(Math.max(v,.01)/(v<lo?lo:hi))));
const lvl=x=>x<.25?"Low":x<.5?"Medium":"High";
const days=d=>d>=60?"about "+Math.round(d/30)+" months":Math.round(d*.85)+"–"+Math.round(d*1.15)+" days";
$("food").innerHTML=Object.entries(F).map(([k,f])=>`<option value="${k}">${f.n} (${f.t})</option>`).join("");
function need(f,T,rh){ // required barrier window from respiration or sensitivity
 let otr,k=f.g==="dry"?Math.min(1,1.5-rh/100):1;
 if(f.rr){const rrT=f.rr*Math.pow(2.5,(T-5)/10);const r=rrT*24*.2/(.15*(.21-f.o2));otr=[.5*r,2*r]}else otr=[0,f.om];
 return{otr,wv:[f.wv[0]*k,f.wv[1]*k]}}
function evaluate(f,T,rh,tr,w){
 const nd=need(f,T,rh),s=w.s+w.c+w.e||1;
 const rows=P.filter(p=>p.g.includes(f.g)).map(p=>{
  const of=fit(p.otr,nd.otr),wf=fit(p.wv,nd.wv);
  let tech=(.65*of+.35*wf)*(1-.03*tr*(5-p.rug));
  const cs=cl(1-((p.cost[0]+p.cost[1])/2-2)/14,0,1);
  const score=(w.s*tech+w.c*cs+w.e*p.eco/100)/s;
  const pen=f.g==="fresh"?(rh<75?.7:rh<85?.85:1):1;
  const sl=f.sl*Math.pow(f.q,(f.tr-T)/10)*(1+(f.gain-1)*tech)*pen;
  return{p,of,wf,tech,score,sl}}).sort((a,b)=>b.score-a.score);
 return{rows,nd}}
function risks(f,r,T,rh,tr){
 const fresh=f.g!=="dry",mo=(1-r.wf)+(f.g==="fresh"&&rh<85?.25:0);
 const mi=fresh?(T<=4?.1:T<=8?.4:.8):(rh>75?.5:.1);
 return[["Moisture loss or gain",lvl(mo)],["Oxidation",lvl(1-r.of)],["Microbial spoilage",lvl(cl(mi-.15*r.tech,0,1))+(r.p.map&&mi<.8?" ":"")],["Packaging failure",lvl((5-r.p.rug)*.05*tr+(1-r.tech)*.3)]]}
function chart(f,rh,tr,w,T){
 const pts=[];for(let t=0;t<=20;t+=2){const e=evaluate(f,t,rh,tr,w).rows[0];pts.push([t,e.sl,f.sl*Math.pow(f.q,(f.tr-t)/10)])}
 const mx=Math.max(...pts.map(p=>p[1]));const X=t=>40+t*13,Y=d=>170-d/mx*140;
 const line=i=>pts.map((p,j)=>(j?"L":"M")+X(p[0])+" "+Y(p[i])).join("");
 return`<svg viewBox="0 0 320 210" width="100%" role="img" aria-label="Shelf life versus temperature"><path d="${line(2)}" fill="none" stroke="#8A9A93" stroke-width="2" stroke-dasharray="4 4"/><path d="${line(1)}" fill="none" stroke="var(--g)" stroke-width="3"/><line x1="${X(cl(T,0,20))}" x2="${X(cl(T,0,20))}" y1="20" y2="170" stroke="var(--b)" stroke-dasharray="3 3"/>
 <text x="4" y="34">${Math.round(mx)} d</text><text x="4" y="172">0</text><text x="40" y="190">0 °C</text><text x="270" y="190">20 °C</text><text x="60" y="14" style="fill:var(--g)">With recommended pack</text><text x="190" y="14">Unpacked</text></svg>`}
function run(){
 const f=F[$("food").value],T=+$("temp").value,rh=+$("rh").value,tr=+$("tr").value,w={s:+$("ws").value,c:+$("wc").value,e:+$("we").value};
 $("tv").textContent=T+" °C";$("rv").textContent=rh+"%";$("wsv").textContent=w.s;$("wcv").textContent=w.c;$("wev").textContent=w.e;
 const {rows,nd}=evaluate(f,T,rh,tr,w),b=rows[0],p=b.p;
 const alt=rows.slice(1).filter(r=>r.p.eco>p.eco+10&&r.score>=b.score*.85).sort((a,c)=>c.p.eco-a.p.eco)[0];
 const fmt=r=>f.rr?rd(r[0])+"–"+rd(r[1])+" cc/m²/day":"up to "+r[1]+" cc/m²/day",
 wvf=r=>rd(r[0])+"–"+rd(r[1])+" g/m²/day",rk=risks(f,b,T,rh,tr),cost=p.cost[0]+"–"+p.cost[1];
 const type=f.rr&&p.map?"Modified atmosphere packaging (MAP)":f.rr?"Passive breathable pack":p.otr<100?"High-barrier / vacuum pack":"Moisture-barrier pack";
 const sl=days(b.sl),payload=`PACKWISE|${f.n}|${p.n}|${sl}|Rs ${cost}`;
 let qr="";try{const q=qrcode(0,"M");q.addData(payload);q.make();qr=q.createSvgTag(3)}catch(e){}
 $("out").innerHTML=`
 <section class="recipe"><h2>Packaging recipe for ${f.n}</h2>
 <div class="rt"><div class="k"><small>Material and structure</small><b>${p.n}</b></div><div class="k"><small>Packaging type</small><b>${type}</b></div>
 <div class="k"><small>Estimated shelf life at ${T} °C</small><b>${sl}</b></div><div class="k"><small>Cost estimate</small><b>₹ ${cost} per pack</b></div>
 <div class="k"><small>Sustainability score</small><b>${p.eco}%${p.eco>=80?" (high)":p.eco>=50?" (moderate)":" (low)"}</b></div><div class="k"><small>Fit to food needs</small><b>${Math.round(b.tech*100)}%</b></div></div>
 ${alt?`<p class="note" style="margin:12px 0 0">Eco-friendly alternative: <b>${alt.p.n}</b> (${alt.p.eco}% score, ${days(alt.sl)}).</p>`:""}</section>
 <div class="two">
 <section class="card"><h3>Packaging specifications</h3><table>
 <tr><td>Required OTR</td><td>${fmt(nd.otr)}</td></tr><tr><td>Required WVTR</td><td>${wvf(nd.wv)}</td></tr>
 <tr><td>Chosen film OTR / WVTR</td><td>${p.otr} / ${p.wv}</td></tr><tr><td>Thickness</td><td>${p.th}</td></tr><tr><td>Sealability</td><td>${p.seal}</td></tr>
 <tr><td>Target in-pack O₂</td><td>${f.rr?Math.round(f.o2*100)+"%":"Not applicable"}</td></tr></table>
 <p class="hint">${f.rr?"Respiration at "+T+" °C is "+(f.rr*Math.pow(2.5,(T-5)/10)).toFixed(1)+" mL CO₂/kg/h (Q10 = 2.5). Sized for a 200 g pack with 0.15 m² of film.":"Barrier limits come from the food's oxygen and moisture sensitivity."}</p></section>
 <section class="card"><h3>Risk analysis</h3><table>${rk.map(r=>`<tr><td>${r[0]}</td><td><span class="pill ${r[1].trim()}">${r[1].trim()}</span></td></tr>`).join("")}</table>
 <p class="hint">${f.g==="fresh"&&rh<85?"Humidity below 85% raises moisture loss for fresh produce. ":""}${T>8&&f.g!=="dry"?"Warm storage speeds up spoilage. ":""}${tr==2?"Long transport favours tougher films.":""}</p></section></div>
 <section class="card"><h3>Packaging options compared</h3>${rows.slice(0,6).map((r,i)=>`<div class="bar ${i?"":"top"}"><span>${r.p.n}</span><div><i style="width:${Math.round(r.score*100)}%"></i></div><b>${Math.round(r.score*100)}</b></div>`).join("")}
 <p class="hint">Score combines barrier fit, cost and sustainability using your priority weights. Options unsuitable for this food type are left out.</p></section>
 <div class="two"><section class="card"><h3>What-if: storage temperature</h3><div class="ov">${chart(f,rh,tr,w,T)}</div><p class="hint">Shelf life at each temperature using the best pack for that temperature. Dashed blue line marks your setting.</p></section>
 <section class="card"><h3>QR traceability</h3><div class="qr">${qr||""}<p class="note">Scan to carry the recipe with the pack: food, material, shelf life and cost.</p></div></section></div>`}
["food","temp","rh","tr","ws","wc","we"].forEach(i=>$(i).addEventListener("input",run));run();
