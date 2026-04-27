const moneyIds = [
  "sueldoBasico","aportVolMensual","pensionGarantizada","bonoPension",
  "issste2008","cesantiaIssste","cuotaSocialIssste","sarIssste","voluntarias","complementarias","largoPlazo","ahorroSolidarioSaldo","sarFovissste92","fovissste2008",
  "imss97","cesantiaImss","cuotaSocialImss","sarImss92","sarInfonavit92","infonavit97","pensionImss",
  "retiroDeseado","invertirDeseado","exencionPension","limiteInferior","cuotaFija"
];

function raw(v){ return Number(String(v ?? "").replace(/[^\d.-]/g,"")) || 0; }
function n(id){ return raw(document.getElementById(id)?.value); }
function pct(id){ return (Number(document.getElementById(id)?.value || 0))/100; }
function money(x){ return (isFinite(x)?x:0).toLocaleString("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}); }
function fmt(el){ const x=raw(el.value); el.value=x ? x.toLocaleString("es-MX",{maximumFractionDigits:0}) : "0"; }
function d(id){ const v=document.getElementById(id)?.value; return v ? new Date(v+"T00:00:00") : null; }
function years(a,b){ if(!a||!b) return 0; let y=b.getFullYear()-a.getFullYear(); const m=b.getMonth()-a.getMonth(); if(m<0||(m===0&&b.getDate()<a.getDate())) y--; return Math.max(0,y); }
function months(a,b){ if(!a||!b) return 0; return Math.max(0,(b.getFullYear()-a.getFullYear())*12+(b.getMonth()-a.getMonth())); }
function sum(ids){ return ids.reduce((t,id)=>t+n(id),0); }

function renderChildrenInputs(){
  const has = document.getElementById("tieneHijos").value === "si";
  document.querySelectorAll(".hijosBox").forEach(x=>x.classList.toggle("hidden",!has));
  const cont = document.getElementById("hijosContainer");
  cont.classList.toggle("hidden",!has);
  if(!has){ cont.innerHTML=""; return; }
  const k = Math.min(8,Math.max(1,Number(document.getElementById("numeroHijos").value||1)));
  if(cont.children.length !== k){
    let html = "";
    for(let i=1;i<=k;i++) html += `<label>Fecha nacimiento hijo ${i}<input type="date" id="hijo${i}"></label>`;
    cont.innerHTML = html;
  }
}

function base(){
  const nac=d("fechaNacimiento"), ing=d("fechaIngresoIssste"), ret=d("fechaRetiro");
  const edadRet=years(nac,ret), servicio=years(ing,ret);
  const conyuge=document.getElementById("tieneConyuge").value==="si";
  const edadConyuge=conyuge ? years(d("fechaNacimientoConyuge"),ret) : 0;
  let hijosDerecho=0;
  if(document.getElementById("tieneHijos").value==="si"){
    const k=Number(document.getElementById("numeroHijos").value||0);
    for(let i=1;i<=k;i++){
      const fh=d("hijo"+i);
      if(fh && years(fh,ret)<25) hijosDerecho++;
    }
  }
  return {nac,ing,ret,edadRet,servicio,conyuge,edadConyuge,hijosDerecho};
}

function bonoValor(){
  const tipo=document.getElementById("tipoBono").value;
  const valor=n("bonoPension");
  if(tipo==="nominal") return valor;
  const b=base(), hoy=new Date();
  const udi=Number(document.getElementById("valorUdi").value||0);
  const crec=Number(document.getElementById("crecimientoUdi").value||0)/100;
  const f25=b.ing ? new Date(b.ing.getFullYear()+25,b.ing.getMonth(),b.ing.getDate()) : hoy;
  const f55=b.nac ? new Date(b.nac.getFullYear()+55,b.nac.getMonth(),b.nac.getDate()) : hoy;
  const redencion = f25 < f55 ? f25 : f55;
  const fechaFinal = b.ret && b.ret < redencion ? b.ret : redencion;
  const anios=Math.max(0,months(hoy,fechaFinal)/12);
  return valor * udi * Math.pow(1+crec,anios);
}

function saldos(){
  const isssteIds=["issste2008","cesantiaIssste","cuotaSocialIssste","sarIssste","voluntarias","complementarias","largoPlazo","ahorroSolidarioSaldo","sarFovissste92","fovissste2008"];
  const imssIds=["imss97","cesantiaImss","cuotaSocialImss","sarImss92","sarInfonavit92","infonavit97"];
  const issste=sum(isssteIds)+bonoValor();
  const hasImss=document.getElementById("tieneImss").value==="si";
  const imss=hasImss ? sum(imssIds) : 0;
  return {issste,imss,total:issste+imss};
}

function imssTreatment(){
  if(document.getElementById("tieneImss").value!=="si") return {aPension:0,aRetiro:0,nota:"Sin IMSS capturado."};
  const b=base();
  const total=saldos().imss;
  const op=document.getElementById("escenarioImss").value;
  const reg=document.getElementById("regimenImss").value;
  const noRetirableLey73=n("cesantiaImss")+n("cuotaSocialImss");
  if(op==="portabilidad") return {aPension:total,aRetiro:0,nota:"Portabilidad: los saldos IMSS se suman al saldo para calcular pensión y excedentes."};
  if(op==="negativa") return {aPension:0,aRetiro:b.edadRet>=60?total:0,nota:"Negativa IMSS: se suma al retiro si la fecha objetivo es posterior a 60 años."};
  if(op==="pension" && reg==="73") return {aPension:0,aRetiro:b.edadRet>=60?Math.max(0,total-noRetirableLey73):0,nota:"Pensión Ley 73: se excluyen Cesantía IMSS y Cuota Social IMSS del monto retirado."};
  return {aPension:0,aRetiro:b.edadRet>=60?total:0,nota:"Pensión IMSS Ley 97: requiere validación; se muestra retiro informativo."};
}

function proyeccion(){
  const b=base(), im=imssTreatment();
  const hoy=new Date();
  const meses=Math.max(0,months(hoy,b.ret));
  const rMens=Math.pow(1+pct("rendimiento"),1/12)-1;
  const sueldo=n("sueldoBasico");
  const oblig=sueldo*0.113;
  const solidTrab=sueldo*Number(document.getElementById("ahorroSolidarioPct").value||0);
  const solidDep=solidTrab*3.25;
  const vol=n("aportVolMensual");
  const aportMens=oblig+solidTrab+solidDep+vol;

  let saldo=saldos().issste+im.aPension;
  let aport=0, rend=0;
  const serie=[{anio:0,saldo,aport,rend}];
  for(let m=1;m<=meses;m++){
    const rr=saldo*rMens;
    saldo+=rr+aportMens;
    rend+=rr; aport+=aportMens;
    if(m%12===0 || m===meses) serie.push({anio:m/12,saldo,aport,rend});
  }
  return {saldo,aport,rend,aportMens,oblig,solidTrab,solidDep,vol,serie,im};
}

function escenario(){
  const p=proyeccion();
  const pmg=n("pensionGarantizada");
  const factor=Number(document.getElementById("factorAseguradora").value||18.5);
  const pensionMin=pmg*1.3;
  const costoMin=pensionMin*12*factor;
  const excedente=Math.max(0,p.saldo-costoMin);
  const pensionImss=n("pensionImss");

  function option(nombre,uso,retBase,penBase,tag){
    return {nombre,uso,retiro:retBase+p.im.aRetiro,pension:penBase+pensionImss,pensionIssste:penBase,tag};
  }

  return {
    saldo:p.saldo, factor, pensionMin, costoMin, excedente,
    opciones:[
      option("Renta máxima estimada",1,0,p.saldo/factor/12,"Mayor ingreso mensual"),
      option("75% del excedente",0.75,excedente*0.25,(costoMin+excedente*0.75)/factor/12,"Más pensión, algo de retiro"),
      option("50% del excedente",0.50,excedente*0.50,(costoMin+excedente*0.50)/factor/12,"Equilibrio"),
      option("1.3× pensión garantizada",0,excedente,pensionMin,"Mayor retiro inmediato")
    ]
  };
}

function retiroProgramado(){
  const b=base(), e=escenario();
  const esperanza=document.getElementById("sexo").value==="mujer" ? 88 : 84;
  const meses=Math.max(120,(esperanza-b.edadRet)*12);
  const r=Math.pow(1+pct("rendimiento"),1/12)-1;
  const pago = r>0 ? e.saldo*(r/(1-Math.pow(1+r,-meses))) : e.saldo/meses;
  return {pago,meses,esperanza};
}

function selectedOption(){
  const e=escenario();
  const v=document.getElementById("escenarioElegido").value;
  if(v==="max") return e.opciones[0];
  if(v==="75") return e.opciones[1];
  if(v==="50") return e.opciones[2];
  return e.opciones[3];
}

function drawAccum(){
  const canvas=document.getElementById("chartAcumulacion");
  const ctx=canvas.getContext("2d");
  const rect=canvas.getBoundingClientRect();
  const dpr=window.devicePixelRatio||1;
  canvas.width=rect.width*dpr; canvas.height=260*dpr; ctx.scale(dpr,dpr);
  const w=rect.width,h=260,pad=38;
  const data=proyeccion().serie;
  ctx.clearRect(0,0,w,h);
  const maxY=Math.max(...data.flatMap(x=>[x.saldo,x.aport,x.rend]),1);
  const maxX=Math.max(...data.map(x=>x.anio),1);
  ctx.strokeStyle="#334155"; ctx.beginPath(); ctx.moveTo(pad,pad); ctx.lineTo(pad,h-pad); ctx.lineTo(w-pad,h-pad); ctx.stroke();
  [["saldo","#22c55e","Saldo total"],["aport","#38bdf8","Aportaciones"],["rend","#f59e0b","Rendimientos"]].forEach(([key,color,label],idx)=>{
    ctx.strokeStyle=color; ctx.lineWidth=3; ctx.beginPath();
    data.forEach((pt,i)=>{
      const x=pad+(pt.anio/maxX)*(w-pad*2);
      const y=h-pad-(pt[key]/maxY)*(h-pad*2);
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke(); ctx.fillStyle=color; ctx.fillText(label,pad+8,pad+15+idx*18);
  });
  ctx.fillStyle="#9ca3af"; ctx.fillText(money(maxY),pad,18); ctx.fillText("Años",w-pad-28,h-10);
}

function gestion(){
  const op=selectedOption(), b=base();
  const retiroAhora=n("retiroDeseado");
  let invertir=n("invertirDeseado");
  if(invertir===0) invertir=Math.max(0,op.retiro-retiroAhora);

  const r=pct("rendInv"), infl=pct("inflacionInv");
  const tipo=document.getElementById("tipoGestion").value;
  let retiroRend=0;
  if(tipo==="patrimonio") retiroRend=invertir*Math.max(0,r-infl)*0.5/12;
  if(tipo==="equilibrio") retiroRend=invertir*Math.max(0,r-infl)/12;
  if(tipo==="liquidez") retiroRend=invertir*r/12;

  const pension=op.pension;
  const exenta=n("exencionPension");
  const pensionGrav=Math.max(0,pension-exenta);
  const baseGrav=pensionGrav+retiroRend;
  const li=n("limiteInferior"), cuota=n("cuotaFija"), tasa=Number(document.getElementById("porcentajeExcedente").value||0)/100;
  const isr=baseGrav>li ? cuota+(baseGrav-li)*tasa : 0;
  const bruto=pension+retiroRend;
  const neto=bruto-isr;
  const yearsToRet=Math.max(0,months(new Date(),b.ret)/12);
  const inflAcum=Math.pow(1+infl,yearsToRet);
  return {invertir,retiroRend,pension,pensionGrav,baseGrav,isr,bruto,neto,real:neto/inflAcum};
}

function render(){
  renderChildrenInputs();
  document.querySelectorAll(".conyugeBox").forEach(x=>x.classList.toggle("hidden",document.getElementById("tieneConyuge").value!=="si"));
  const hasImss=document.getElementById("tieneImss").value==="si";
  document.querySelectorAll(".imssBox").forEach(x=>x.classList.toggle("hidden",!hasImss));
  document.getElementById("subcuentasImss").classList.toggle("hidden",!hasImss);

  const b=base(), s=saldos(), p=proyeccion(), e=escenario(), rp=retiroProgramado();
  document.getElementById("resumenDatos").innerHTML = `
    <b>Edad al retiro:</b> ${b.edadRet} años · 
    <b>Años de servicio ISSSTE:</b> ${b.servicio} ·
    <b>Cónyuge:</b> ${b.conyuge ? "sí, edad al retiro "+b.edadConyuge : "no"} ·
    <b>Hijos con derecho al retiro:</b> ${b.hijosDerecho}
  `;

  document.getElementById("resumenSubcuentas").innerHTML = `
    <b>Total ISSSTE:</b> ${money(s.issste)} · <b>Total IMSS:</b> ${money(s.imss)}<br>
    <b>Bono considerado:</b> ${money(bonoValor())}<br>
    <b>Tratamiento IMSS:</b> ${p.im.nota}
  `;

  document.getElementById("resumenAcumulacion").innerHTML = `
    <b>Aportación obligatoria 11.3%:</b> ${money(p.oblig)} · 
    <b>Solidario trabajador:</b> ${money(p.solidTrab)} · 
    <b>Solidario dependencia:</b> ${money(p.solidDep)} · 
    <b>Voluntarias:</b> ${money(p.vol)}<br>
    <b>Aportación mensual total:</b> ${money(p.aportMens)}<br>
    <b>Saldo proyectado para pensión:</b> ${money(p.saldo)} · 
    <b>Aportaciones futuras:</b> ${money(p.aport)} · 
    <b>Rendimientos futuros:</b> ${money(p.rend)}
  `;
  drawAccum();

  let ruta="Retiro anticipado";
  if(b.edadRet>=60 && b.edadRet<65) ruta=b.servicio>=25 ? "Cesantía en edad avanzada" : "Posible negativa ISSSTE por años de servicio";
  if(b.edadRet>=65) ruta=b.servicio>=25 ? "Vejez" : "Posible negativa ISSSTE por años de servicio";
  document.getElementById("elegibilidad").innerHTML = `
    <b>Ruta detectada:</b> ${ruta}<br>
    <b>1.3× pensión garantizada:</b> ${money(e.pensionMin)} · 
    <b>Costo estimado mínimo:</b> ${money(e.costoMin)} · 
    <b>Factor usado:</b> ${e.factor}
  `;

  const infl=pct("inflacion");
  const yrs=Math.max(0,months(new Date(),b.ret)/12);
  const inflAcum=Math.pow(1+infl,yrs);
  document.getElementById("tablaOferta").innerHTML = e.opciones.map((o,i)=>`
    <div class="offerCard ${i===0?'highlight':''}">
      <div class="offerTitle">${o.nombre}</div>
      <div class="offerValue"><small>Pensión mensual nominal</small><div class="big">${money(o.pension)}</div></div>
      <div class="offerValue"><small>Poder adquisitivo actual</small><div class="big">${money(o.pension/inflAcum)}</div></div>
      <div class="offerValue"><small>Monto a retirar</small><div class="big">${o.retiro ? money(o.retiro) : "—"}</div></div>
      <div class="offerValue"><small>${o.tag}</small></div>
    </div>
  `).join("");

  document.getElementById("retiroProgramado").innerHTML = `
    <b>Pago mensual estimado:</b> ${money(rp.pago)} · 
    <b>Horizonte:</b> ${Math.round(rp.meses/12)} años, hasta edad ${rp.esperanza}. 
    Se recalcula periódicamente según saldo, edad y rendimientos.
  `;

  const edadFall=Number(document.getElementById("edadFallecimiento").value||0);
  const op=selectedOption();
  const mesesCobro=Math.max(0,(edadFall-b.edadRet)*12);
  const remanenteIlustrativo=Math.max(0,e.saldo-(op.pensionIssste*mesesCobro));
  document.getElementById("fallecimiento").innerHTML = `
    Si fallece a los ${edadFall} años, el remanente ilustrativo no usado sería ${money(remanenteIlustrativo)}.<br>
    <span class="muted">Nota: en renta vitalicia real no se hereda el saldo no usado; operan derechos de beneficiarios, seguro de sobrevivencia y recursos retirables según subcuenta y resolución.</span>
  `;

  const retiroDeseado=n("retiroDeseado");
  let invertir=n("invertirDeseado");
  if(invertir===0 && op.retiro>0){
    invertir=Math.max(0,op.retiro-retiroDeseado);
    document.getElementById("invertirDeseado").value= invertir ? invertir.toLocaleString("es-MX",{maximumFractionDigits:0}) : "0";
  }
  document.getElementById("decisionExcedente").innerHTML = `
    <b>Escenario elegido:</b> ${op.nombre}<br>
    <b>Retiro disponible estimado:</b> ${money(op.retiro)}<br>
    <b>Retiro elegido:</b> ${money(retiroDeseado)}<br>
    <b>Monto a invertir:</b> ${money(invertir)}
  `;

  const g=gestion();
  document.getElementById("baseFiscal").innerHTML = `
    <div class="taxCard"><div class="taxTitle">Ingreso renta vitalicia</div><div class="taxValue big">${money(g.pension)}</div></div>
    <div class="taxCard"><div class="taxTitle">Ingreso retiros/rendimientos</div><div class="taxValue big">${money(g.retiroRend)}</div></div>
    <div class="taxCard"><div class="taxTitle">Pensión gravable</div><div class="taxValue big">${money(g.pensionGrav)}</div></div>
    <div class="taxCard"><div class="taxTitle">Base gravable</div><div class="taxValue big">${money(g.baseGrav)}</div></div>
  `;
  document.getElementById("resultadoFiscal").innerHTML = `
    <div class="taxCard"><div class="taxTitle">Ingreso mensual bruto</div><div class="taxValue big">${money(g.bruto)}</div></div>
    <div class="taxCard"><div class="taxTitle">Ingreso por rendimientos</div><div class="taxValue big">${money(g.retiroRend)}</div></div>
    <div class="taxCard"><div class="taxTitle">ISR a guardar</div><div class="taxValue big">${money(g.isr)}</div></div>
    <div class="taxCard highlight"><div class="taxTitle">Ingreso neto real</div><div class="taxValue"><div class="big">${money(g.neto)}</div><small>Poder adquisitivo actual: ${money(g.real)}</small></div></div>
  `;
}

moneyIds.forEach(id=>{
  document.addEventListener("blur",e=>{ if(e.target.id===id){ fmt(e.target); render(); }}, true);
});
document.addEventListener("input",render);
document.addEventListener("change",render);
window.addEventListener("load",()=>{
  const today=new Date();
  if(!document.getElementById("fechaRetiro").value){
    document.getElementById("fechaRetiro").value = `${today.getFullYear()+6}-01-01`;
  }
  moneyIds.forEach(id=>{ const el=document.getElementById(id); if(el) fmt(el); });
  render();
});
