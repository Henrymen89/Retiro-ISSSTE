const idsMoney = ["sueldo","voluntariaMensual","pmg","bono","rcvIssste","sarIssste92","sarFovissste92","solidarioSaldo","avSaldo","compRetiro","largoPlazo","fovissste2008","imss97","cyvImss","cuotaImss","infonavit97","infonavit08","retiroDeseado","invertirDeseado"];

function rawNumber(v){ return Number(String(v||"").replace(/[^\d.-]/g,"")) || 0; }
function getNum(id){ return rawNumber(document.getElementById(id)?.value); }
function money(n){ return (isFinite(n)?n:0).toLocaleString("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}); }
function fmtInput(el){ const n=rawNumber(el.value); el.value = n ? n.toLocaleString("es-MX",{maximumFractionDigits:0}) : "0"; }
function dateVal(id){ const v=document.getElementById(id).value; return v?new Date(v+"T00:00:00"):null; }
function yearsBetween(a,b){ if(!a||!b) return 0; let y=b.getFullYear()-a.getFullYear(); const m=b.getMonth()-a.getMonth(); if(m<0 || (m===0 && b.getDate()<a.getDate())) y--; return Math.max(0,y); }

function suma(ids){ return ids.reduce((t,id)=>t+getNum(id),0); }

function hijosConDerecho(fechaRetiro){
  let count=0;
  ["hijo1","hijo2","hijo3"].forEach(id=>{
    const f=dateVal(id);
    if(f && yearsBetween(f,fechaRetiro)<25) count++;
  });
  return count;
}

function datosBase(){
  const nac=dateVal("nacimiento"), ing=dateVal("ingreso"), ret=dateVal("retiro");
  const edadRet=yearsBetween(nac,ret);
  const servicio=yearsBetween(ing,ret);
  const hijos=hijosConDerecho(ret);
  return {nac,ing,ret,edadRet,servicio,hijos};
}

function saldoCuenta(){
  const isssteIds=["bono","rcvIssste","sarIssste92","sarFovissste92","solidarioSaldo","avSaldo","compRetiro","largoPlazo","fovissste2008"];
  const imssIds=["imss97","cyvImss","cuotaImss","infonavit97","infonavit08"];
  const issste=suma(isssteIds);
  const imss=document.getElementById("tieneImss").checked?suma(imssIds):0;
  return {issste, imss, total: issste+imss};
}

function proyeccion(){
  const d=datosBase(), sal=saldoCuenta();
  const sueldo=getNum("sueldo");
  const rendimiento=Number(document.getElementById("rendimiento").value||0)/100;
  const inflacion=Number(document.getElementById("inflacion").value||0)/100;
  const meses=Math.max(0, d.edadRet*12 - yearsBetween(d.nac,new Date())*12);
  const rMensual=Math.pow(1+rendimiento,1/12)-1;
  const obligatoria=sueldo*0.113;
  const solidarioTrab=sueldo*Number(document.getElementById("solidarioPct").value||0);
  const solidarioDep=solidarioTrab*3.25;
  const voluntaria=getNum("voluntariaMensual");
  const aportMensual=obligatoria+solidarioTrab+solidarioDep+voluntaria;

  let saldo=sal.total, aportAcum=0, rendAcum=0;
  const serie=[{anio:0,saldo,aport:0,rend:0}];
  for(let m=1;m<=meses;m++){
    const rend=saldo*rMensual;
    saldo+=rend+aportMensual;
    rendAcum+=rend; aportAcum+=aportMensual;
    if(m%12===0 || m===meses) serie.push({anio:m/12,saldo,aport:aportAcum,rend:rendAcum});
  }
  return {saldo, aportMensual, obligatoria, solidarioTrab, solidarioDep, voluntaria, aportAcum, rendAcum, serie, inflacion};
}

function escenarioPension(){
  const d=datosBase(), p=proyeccion();
  const pmg=getNum("pmg");
  const factor=Number(document.getElementById("factorAseg").value||18.5);
  const pensionMin=pmg*1.3;
  const costoMin=pensionMin*12*factor;
  const saldo=p.saldo;
  const excedente=Math.max(0, saldo-costoMin);

  const opciones=[
    {nombre:"Renta máxima estimada", usar:1, retiro:0, pension: saldo/factor/12, tag:"Mayor ingreso mensual"},
    {nombre:"75% del excedente", usar:.75, retiro:excedente*.25, pension:(costoMin+excedente*.75)/factor/12, tag:"Más pensión, algo de liquidez"},
    {nombre:"50% del excedente", usar:.50, retiro:excedente*.50, pension:(costoMin+excedente*.50)/factor/12, tag:"Equilibrio"},
    {nombre:"1.3× pensión garantizada", usar:0, retiro:excedente, pension:pensionMin, tag:"Mayor retiro inmediato"}
  ];

  return {opciones, excedente, costoMin, pensionMin, factor, saldo};
}

function retiroProgramado(){
  const esc=escenarioPension(), d=datosBase();
  const esperanza=document.getElementById("sexo").value==="mujer"?88:84;
  const meses=Math.max(120,(esperanza-d.edadRet)*12);
  const rAnual=Number(document.getElementById("rendimiento").value||0)/100;
  const r=Math.pow(1+rAnual,1/12)-1;
  const pago = r>0 ? esc.saldo*(r/(1-Math.pow(1+r,-meses))) : esc.saldo/meses;
  return {pago, meses, esperanza};
}

function drawChart(){
  const c=document.getElementById("graficaAcumulacion"), ctx=c.getContext("2d");
  const rect=c.getBoundingClientRect(), dpr=window.devicePixelRatio||1;
  c.width=rect.width*dpr; c.height=260*dpr; ctx.scale(dpr,dpr);
  const w=rect.width,h=260,pad=38, serie=proyeccion().serie;
  ctx.clearRect(0,0,w,h);
  const maxY=Math.max(...serie.flatMap(x=>[x.saldo,x.aport,x.rend]),1);
  const maxX=Math.max(...serie.map(x=>x.anio),1);
  ctx.strokeStyle="#334155"; ctx.beginPath(); ctx.moveTo(pad,pad); ctx.lineTo(pad,h-pad); ctx.lineTo(w-pad,h-pad); ctx.stroke();

  [["saldo","#22c55e","Saldo total"],["aport","#38bdf8","Aportaciones"],["rend","#f59e0b","Rendimientos"]].forEach(([key,color,label],idx)=>{
    ctx.strokeStyle=color; ctx.lineWidth=3; ctx.beginPath();
    serie.forEach((pt,i)=>{
      const x=pad+(pt.anio/maxX)*(w-pad*2);
      const y=h-pad-(pt[key]/maxY)*(h-pad*2);
      if(i===0)ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke(); ctx.fillStyle=color; ctx.fillText(label,pad+8,pad+15+idx*18);
  });
  ctx.fillStyle="#9ca3af"; ctx.fillText(money(maxY),pad,18); ctx.fillText("Años",w-pad-26,h-10);
}

function render(){
  const d=datosBase(), sal=saldoCuenta(), p=proyeccion(), esc=escenarioPension(), rp=retiroProgramado();
  document.getElementById("bloqueImss").classList.toggle("hidden",!document.getElementById("tieneImss").checked);

  document.getElementById("resumenDatos").innerHTML=`
    <b>Edad al retiro:</b> ${d.edadRet} años · <b>Años de servicio al retiro:</b> ${d.servicio} · <b>Hijos con derecho al retiro:</b> ${d.hijos}
  `;

  document.getElementById("resumenSubcuentas").innerHTML=`
    <b>Total ISSSTE:</b> ${money(sal.issste)}<br>
    <b>Total IMSS/INFONAVIT capturado:</b> ${money(sal.imss)}<br>
    <b>Saldo total para proyección:</b> ${money(sal.total)}
  `;

  document.getElementById("resumenAcumulacion").innerHTML=`
    <b>Aportación obligatoria estimada:</b> ${money(p.obligatoria)} mensuales<br>
    <b>Ahorro solidario trabajador:</b> ${money(p.solidarioTrab)} · <b>Dependencia estimada:</b> ${money(p.solidarioDep)}<br>
    <b>Voluntarias:</b> ${money(p.voluntaria)}<br>
    <b>Aportación mensual total:</b> ${money(p.aportMensual)}<br>
    <b>Saldo proyectado al retiro:</b> ${money(p.saldo)}<br>
    <b>Aportaciones acumuladas futuras:</b> ${money(p.aportAcum)} · <b>Rendimientos acumulados futuros:</b> ${money(p.rendAcum)}
  `;
  drawChart();

  let alerta="Retiro anticipado";
  if(d.edadRet>=60 && d.edadRet<65) alerta=d.servicio>=25?"Cesantía en edad avanzada":"Posible negativa de pensión ISSSTE por años de servicio insuficientes";
  if(d.edadRet>=65) alerta=d.servicio>=25?"Vejez":"Posible negativa de pensión ISSSTE por años de servicio insuficientes";
  document.getElementById("alertaElegibilidad").innerHTML=`<b>Ruta detectada:</b> ${alerta}`;

  document.getElementById("tablaOferta").innerHTML=esc.opciones.map((o,i)=>`
    <div class="offerCard ${i===0?'highlight':''}">
      <div class="offerTitle">${o.nombre}</div>
      <div class="offerValue"><small>Pensión mensual</small><div class="big">${money(o.pension)}</div></div>
      <div class="offerValue"><small>Monto a retirar</small><div class="big">${o.retiro?money(o.retiro):"—"}</div></div>
      <div class="offerValue"><small>${o.tag}</small></div>
    </div>
  `).join("");

  const anios=Math.max(0, d.edadRet-yearsBetween(d.nac,new Date()));
  const inflAcum=Math.pow(1+p.inflacion,anios);
  const maxP=esc.opciones[0].pension;
  document.getElementById("poderAdquisitivo").innerHTML=`
    <b>Pensión máxima nominal estimada:</b> ${money(maxP)}<br>
    <b>Equivalente en poder adquisitivo de hoy:</b> ${money(maxP/inflAcum)}<br>
    <b>Inflación acumulada estimada al retiro:</b> ${((inflAcum-1)*100).toFixed(1)}%
  `;

  document.getElementById("retiroProgramado").innerHTML=`
    <b>Retiro programado mensual estimado:</b> ${money(rp.pago)}<br>
    <b>Horizonte usado:</b> ${Math.round(rp.meses/12)} años, hasta edad ${rp.esperanza}. Se recalcula cada año según saldo y rendimientos.
  `;

  const escenarioImss=document.getElementById("escenarioImss");
  if(document.getElementById("tieneImss").checked){
    const semanas=Number(document.getElementById("semanasImss").value||0);
    escenarioImss.classList.remove("hidden");
    escenarioImss.innerHTML=`
      <b>Escenario IMSS:</b><br>
      Recursos IMSS/INFONAVIT capturados: ${money(sal.imss)}.<br>
      ${semanas>=500 ? "Tiene semanas suficientes para revisar ruta Ley 73 si conserva derechos y cumple requisitos." : "Puede revisarse posible negativa IMSS y retiro de recursos, sujeto a validación."}
    `;
  } else escenarioImss.classList.add("hidden");

  const retiroDeseado=getNum("retiroDeseado");
  let invertir=getNum("invertirDeseado");
  if(invertir===0 && esc.excedente>0){
    invertir=Math.max(0,esc.excedente-retiroDeseado);
    document.getElementById("invertirDeseado").value=money(invertir).replace("$","");
  }
  document.getElementById("decisionExcedente").innerHTML=`
    <b>Excedente máximo estimado:</b> ${money(esc.excedente)}<br>
    <b>Retiro elegido:</b> ${money(retiroDeseado)} (${document.getElementById("destinoRetiro").value})<br>
    <b>Monto a invertir:</b> ${money(invertir)}<br>
    Este monto será la base del módulo posterior de inversión, inflación e ISR.
  `;
}

idsMoney.forEach(id=>{
  document.addEventListener("input",e=>{ if(e.target.id===id){ render(); }});
  document.addEventListener("blur",e=>{ if(e.target.id===id){ fmtInput(e.target); render(); }}, true);
});
document.addEventListener("input",render);
document.addEventListener("change",render);
window.addEventListener("load",()=>{
  const today=new Date();
  if(!document.getElementById("retiro").value){
    const y=today.getFullYear()+6;
    document.getElementById("retiro").value=`${y}-01-01`;
  }
  idsMoney.forEach(id=>{ const el=document.getElementById(id); if(el) fmtInput(el); });
  render();
});
