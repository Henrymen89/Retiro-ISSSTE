const moneyIds=["sueldoBasico","aportVolMensual","pensionGarantizada","bonoPension","issste2008","cesantiaIssste","cuotaSocialIssste","sarIssste","voluntarias","complementarias","largoPlazo","ahorroSolidarioSaldo","sarFovissste92","fovissste2008","imss97","cesantiaImss","cuotaSocialImss","sarImss92","sarInfonavit92","infonavit97","retiroDeseado","invertirDeseado","exencionPension","limiteInferior","cuotaFija"];
const raw=v=>Number(String(v??"").replace(/[^\d.-]/g,""))||0;
const n=id=>raw(document.getElementById(id)?.value);
const pct=id=>Number(document.getElementById(id)?.value||0)/100;
const money=x=>(isFinite(x)?x:0).toLocaleString("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0});
function fmt(el){const x=raw(el.value);el.value=x?x.toLocaleString("es-MX",{maximumFractionDigits:0}):"0"}
function d(id){const v=document.getElementById(id)?.value;return v?new Date(v+"T00:00:00"):null}
function years(a,b){if(!a||!b)return 0;let y=b.getFullYear()-a.getFullYear(),m=b.getMonth()-a.getMonth();if(m<0||(m===0&&b.getDate()<a.getDate()))y--;return Math.max(0,y)}
function months(a,b){if(!a||!b)return 0;return Math.max(0,(b.getFullYear()-a.getFullYear())*12+(b.getMonth()-a.getMonth()))}
const sum=ids=>ids.reduce((t,id)=>t+n(id),0);
function renderChildrenInputs(){const has=document.getElementById("tieneHijos").value==="si";document.querySelectorAll(".hijosBox").forEach(x=>x.classList.toggle("hidden",!has));const cont=document.getElementById("hijosContainer");cont.classList.toggle("hidden",!has);if(!has){cont.innerHTML="";return}const k=Math.min(8,Math.max(1,Number(document.getElementById("numeroHijos").value||1)));if(cont.children.length!==k){cont.innerHTML=Array.from({length:k},(_,i)=>`<label>Fecha nacimiento hijo ${i+1}<input type="date" id="hijo${i+1}"></label>`).join("")}}
function base(){const nac=d("fechaNacimiento"),ing=d("fechaIngresoIssste"),ret=d("fechaRetiro");const edadRet=years(nac,ret),servicio=years(ing,ret);const conyuge=document.getElementById("tieneConyuge").value==="si";const edadConyuge=conyuge?years(d("fechaNacimientoConyuge"),ret):0;let hijosDerecho=0;if(document.getElementById("tieneHijos").value==="si"){const k=Number(document.getElementById("numeroHijos").value||0);for(let i=1;i<=k;i++){const fh=d("hijo"+i);if(fh&&years(fh,ret)<25)hijosDerecho++}}return{nac,ing,ret,edadRet,servicio,conyuge,edadConyuge,hijosDerecho}}
function bonoValor(){const tipo=document.getElementById("tipoBono").value,valor=n("bonoPension");if(tipo==="nominal")return valor;const b=base(),hoy=new Date(),udi=Number(document.getElementById("valorUdi").value||0),crec=Number(document.getElementById("crecimientoUdi").value||0)/100;const f25=b.ing?new Date(b.ing.getFullYear()+25,b.ing.getMonth(),b.ing.getDate()):hoy;const f55=b.nac?new Date(b.nac.getFullYear()+55,b.nac.getMonth(),b.nac.getDate()):hoy;const red=f25<f55?f25:f55,fin=b.ret&&b.ret<red?b.ret:red;return valor*udi*Math.pow(1+crec,Math.max(0,months(hoy,fin)/12))}
function isssteBase(){return sum(["issste2008","cesantiaIssste","cuotaSocialIssste","sarIssste","voluntarias","complementarias","largoPlazo","ahorroSolidarioSaldo","sarFovissste92","fovissste2008"])+bonoValor()}
function imssBase(){return sum(["imss97","cesantiaImss","cuotaSocialImss","sarImss92","sarInfonavit92","infonavit97"])}
function saldos(){const has=document.getElementById("tieneImss").value==="si";return{issste:isssteBase(),imss:has?imssBase():0}}
function imssGrowth(monto){const b=base(),mes=Math.max(0,months(new Date(),b.ret)),r=Math.pow(1+pct("rendimiento"),1/12)-1;let s=monto;for(let i=0;i<mes;i++)s+=s*r;return s}
function imssTreatment(){if(document.getElementById("tieneImss").value!=="si")return{aPension:0,aRetiro:0,nota:"Sin IMSS capturado."};const b=base(),total=imssGrowth(imssBase()),op=document.getElementById("escenarioImss").value,reg=document.getElementById("regimenImss").value;const noRet73=imssGrowth(n("cesantiaImss")+n("cuotaSocialImss"));if(op==="portabilidad")return{aPension:total,aRetiro:0,nota:"Portabilidad: los saldos IMSS crecen y se suman al saldo para calcular renta y excedentes."};if(op==="negativa")return{aPension:0,aRetiro:b.edadRet>=60?total:0,nota:"Negativa IMSS: no se suma a pensión; si la fecha objetivo es posterior a 60 años, se suma al monto a retirar."};if(op==="pension"&&reg==="73")return{aPension:0,aRetiro:b.edadRet>=60?Math.max(0,total-noRet73):0,nota:"Pensión Ley 73: se retira IMSS excepto Cesantía IMSS y Cuota Social IMSS; no se suma a pensión ISSSTE."};return{aPension:0,aRetiro:0,nota:"Pensión IMSS Ley 97: no se suma a pensión ISSSTE. Validar resolución IMSS."}}
function proyeccion(){const b=base(),im=imssTreatment(),mes=Math.max(0,months(new Date(),b.ret)),r=Math.pow(1+pct("rendimiento"),1/12)-1,sueldo=n("sueldoBasico");const oblig=sueldo*.113,solidTrab=sueldo*Number(document.getElementById("ahorroSolidarioPct").value||0),solidDep=solidTrab*3.25,vol=n("aportVolMensual"),aportMens=oblig+solidTrab+solidDep+vol;let saldo=isssteBase()+im.aPension,aport=0,rend=0,serie=[{anio:0,saldo,aport,rend}];for(let m=1;m<=mes;m++){const rr=saldo*r;saldo+=rr+aportMens;rend+=rr;aport+=aportMens;if(m%12===0||m===mes)serie.push({anio:m/12,saldo,aport,rend})}return{saldo,aport,rend,aportMens,oblig,solidTrab,solidDep,vol,serie,im}}

function factorBasePorEdadSexo(edad, sexo){
  // Tabla prudente inicial inspirada en factores implícitos de ofertas reales y lógica actuarial:
  // menor edad = más meses esperados de pago = mayor factor; mayor edad = menor factor.
  // Es editable en código y debe calibrarse con nuevas ofertas reales.
  const tablaH = {
    50:22.8,51:22.3,52:21.8,53:21.3,54:20.8,55:20.3,56:19.8,57:19.3,58:18.9,59:18.5,
    60:18.1,61:17.6,62:17.2,63:16.8,64:16.4,65:16.1,66:15.7,67:15.4,68:15.1,69:14.8,70:14.5
  };
  const tablaM = {
    50:24.0,51:23.5,52:23.0,53:22.5,54:22.0,55:21.5,56:21.0,57:20.5,58:20.0,59:19.5,
    60:19.0,61:18.5,62:18.0,63:17.6,64:17.2,65:16.8,66:16.4,67:16.1,68:15.8,69:15.5,70:15.2
  };
  const tabla = sexo==="mujer" ? tablaM : tablaH;
  const ages = Object.keys(tabla).map(Number).sort((a,b)=>a-b);
  if(edad<=ages[0]) return tabla[ages[0]] + (ages[0]-edad)*0.45;
  if(edad>=ages[ages.length-1]) return Math.max(11.5, tabla[ages[ages.length-1]] - (edad-ages[ages.length-1])*0.28);
  for(let i=0;i<ages.length-1;i++){
    const a=ages[i], b=ages[i+1];
    if(edad>=a && edad<=b){
      const t=(edad-a)/(b-a);
      return tabla[a]+(tabla[b]-tabla[a])*t;
    }
  }
  return tabla[60];
}

function ajusteBeneficiarios(){
  const b=base();
  let ajuste = 0;
  let detalle = [];
  if(b.conyuge){
    const dif = b.edadRet - b.edadConyuge; // positivo: cónyuge menor
    if(dif >= 10){ ajuste += 1.8; detalle.push("cónyuge 10+ años menor +1.8"); }
    else if(dif >= 5){ ajuste += 1.3; detalle.push("cónyuge 5+ años menor +1.3"); }
    else if(dif >= 0){ ajuste += 0.9; detalle.push("cónyuge edad similar/menor +0.9"); }
    else { ajuste += 0.6; detalle.push("cónyuge mayor +0.6"); }
  }
  if(b.hijosDerecho>0){
    const add = Math.min(1.8, b.hijosDerecho*0.45);
    ajuste += add;
    detalle.push(`${b.hijosDerecho} hijo(s) con derecho +${add.toFixed(2)}`);
  }
  return {ajuste, detalle: detalle.length?detalle.join(" · "):"sin beneficiarios con impacto"};
}

function factorActuarialFinal(){
  const b=base();
  const sexo=document.getElementById("sexo").value;
  const baseFactor=factorBasePorEdadSexo(b.edadRet, sexo);
  const fam=ajusteBeneficiarios();
  const prudencia=(Number(document.getElementById("factorAseguradora").value||0)/100);
  const final=(baseFactor + fam.ajuste) * (1+prudencia);
  return {final, baseFactor, ajusteFam:fam.ajuste, detalleFam:fam.detalle, prudencia};
}

function escenario(){
  const p=proyeccion(), pmg=n("pensionGarantizada");
  const fa=factorActuarialFinal();
  const factor=fa.final;
  const pensionMin=pmg*1.3;
  const costoMin=pensionMin*12*factor;
  const exced=Math.max(0,p.saldo-costoMin);
  const opt=(key,nombre,ret,pen,costo,tag)=>({key,nombre,retiro:ret+p.im.aRetiro,pension:pen,pensionIssste:pen,costo,tag});
  return{
    saldo:p.saldo,
    factor,
    factorBase:fa.baseFactor,
    ajusteFam:fa.ajusteFam,
    detalleFam:fa.detalleFam,
    prudencia:fa.prudencia,
    pensionMin,
    costoMin,
    excedente:exced,
    opciones:[
      opt("max","Renta máxima estimada",0,p.saldo/factor/12,p.saldo,"Mayor ingreso mensual"),
      opt("75","75% del excedente",exced*.25,(costoMin+exced*.75)/factor/12,costoMin+exced*.75,"Más pensión, algo de retiro"),
      opt("50","50% del excedente",exced*.5,(costoMin+exced*.5)/factor/12,costoMin+exced*.5,"Equilibrio"),
      opt("min","1.3× pensión garantizada",exced,pensionMin,costoMin,"Mayor retiro inmediato")
    ]
  };
}
function retiroProgramado(){const b=base(),e=escenario(),edadFinal=Number(document.getElementById("edadRetiroProgramado").value||84),mes=Math.max(1,(edadFinal-b.edadRet)*12),r=Math.pow(1+pct("rendimiento"),1/12)-1;return{pago:r>0?e.saldo*(r/(1-Math.pow(1+r,-mes))):e.saldo/mes,meses:mes,edadFinal}}
function selectedOption(){const e=escenario(),v=document.getElementById("escenarioElegido").value;return e.opciones.find(x=>x.key===v)||e.opciones[1]}
function drawAccum(){const c=document.getElementById("chartAcumulacion"),ctx=c.getContext("2d"),rect=c.getBoundingClientRect(),dpr=window.devicePixelRatio||1;c.width=rect.width*dpr;c.height=340*dpr;ctx.scale(dpr,dpr);const w=rect.width,h=340,L=80,R=30,T=32,B=58,data=proyeccion().serie;ctx.clearRect(0,0,w,h);const maxY=Math.max(...data.flatMap(x=>[x.saldo,x.aport,x.rend]),1),maxX=Math.max(...data.map(x=>x.anio),1);ctx.strokeStyle="#334155";ctx.beginPath();ctx.moveTo(L,T);ctx.lineTo(L,h-B);ctx.lineTo(w-R,h-B);ctx.stroke();ctx.font="12px Arial";for(let i=0;i<=4;i++){const y=h-B-(i/4)*(h-T-B),val=maxY*i/4;ctx.strokeStyle="#1f2937";ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(w-R,y);ctx.stroke();ctx.fillStyle="#9ca3af";ctx.fillText(money(val),8,y+4)}[["saldo","#22c55e","Saldo total"],["aport","#38bdf8","Aportaciones"],["rend","#f59e0b","Rendimientos"]].forEach(([key,col,label])=>{ctx.strokeStyle=col;ctx.lineWidth=3;ctx.beginPath();data.forEach((pt,i)=>{const x=L+(pt.anio/maxX)*(w-L-R),y=h-B-(pt[key]/maxY)*(h-T-B);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.stroke();const last=data[data.length-1],lx=L+(last.anio/maxX)*(w-L-R),ly=h-B-(last[key]/maxY)*(h-T-B);ctx.fillStyle=col;ctx.fillText(`${label}: ${money(last[key])}`,Math.max(L,lx-230),Math.max(T+14,ly-8))});ctx.fillStyle="#9ca3af";ctx.fillText("Años",w-R-32,h-18)}
function getInvestmentAmount(){const op=selectedOption(),ret=n("retiroDeseado");let inv=n("invertirDeseado");return inv===0?Math.max(0,op.retiro-ret):inv}
function gestion(){const op=selectedOption(),b=base(),inv=getInvestmentAmount(),r=pct("rendInv"),infl=pct("inflacionInv"),tipo=document.getElementById("tipoGestion").value,edadFin=Number(document.getElementById("edadAdministrar").value||85),mes=Math.max(1,(edadFin-b.edadRet)*12),rM=Math.pow(1+r,1/12)-1;let retiro=0;if(tipo==="patrimonio")retiro=inv*Math.max(0,r-infl)*.5/12;else if(tipo==="equilibrio")retiro=inv*Math.max(0,r-infl)/12;else retiro=rM>0?inv*(rM/(1-Math.pow(1+rM,-mes))):inv/mes;let futuro=inv;for(let i=0;i<mes;i++)futuro=Math.max(0,futuro*(1+rM)-retiro);const inflAcum=Math.pow(1+infl,Math.max(0,months(new Date(),b.ret)/12)),pension=op.pension,pensionGrav=Math.max(0,pension-n("exencionPension")),baseGrav=pensionGrav+retiro,li=n("limiteInferior"),cuota=n("cuotaFija"),tasa=Number(document.getElementById("porcentajeExcedente").value||0)/100,isr=baseGrav>li?cuota+(baseGrav-li)*tasa:0,bruto=pension+retiro,neto=bruto-isr;return{invertir:inv,retiroMens:retiro,futuro,valorActualFuturo:futuro/Math.pow(1+infl,mes/12),pension,pensionGrav,rendGrav:retiro,baseGrav,isr,bruto,neto,real:neto/inflAcum,tipo}}
function render(){renderChildrenInputs();document.querySelectorAll(".conyugeBox").forEach(x=>x.classList.toggle("hidden",document.getElementById("tieneConyuge").value!=="si"));const hasImss=document.getElementById("tieneImss").value==="si";document.querySelectorAll(".imssBox").forEach(x=>x.classList.toggle("hidden",!hasImss));document.getElementById("subcuentasImss").classList.toggle("hidden",!hasImss);const b=base(),s=saldos(),p=proyeccion(),e=escenario(),rp=retiroProgramado();document.getElementById("resumenDatos").innerHTML=`<b>Edad al retiro:</b> ${b.edadRet} años · <b>Años de servicio ISSSTE:</b> ${b.servicio} · <b>Cónyuge:</b> ${b.conyuge?"sí, edad al retiro "+b.edadConyuge:"no"} · <b>Hijos con derecho al retiro:</b> ${b.hijosDerecho}`;const tipoBono=document.getElementById("tipoBono").value==="udis"?"UDIs: se convierte con valor UDI actual y crece hasta la redención estimada.":"Nominal MXN.";document.getElementById("resumenSubcuentas").innerHTML=`<b>Total ISSSTE:</b> ${money(s.issste)} · <b>Total IMSS actual:</b> ${money(s.imss)}<br><b>Bono considerado:</b> ${money(bonoValor())} (${tipoBono})<br><b>Tratamiento IMSS:</b> ${p.im.nota}`;document.getElementById("resumenAcumulacion").innerHTML=`<b>Aportación obligatoria 11.3%:</b> ${money(p.oblig)} · <b>Solidario trabajador:</b> ${money(p.solidTrab)} · <b>Solidario dependencia:</b> ${money(p.solidDep)} · <b>Voluntarias:</b> ${money(p.vol)}<br><b>Aportación mensual total:</b> ${money(p.aportMens)}<br><b>Saldo proyectado para pensión:</b> ${money(p.saldo)} · <b>Aportaciones futuras:</b> ${money(p.aport)} · <b>Rendimientos futuros:</b> ${money(p.rend)}`;drawAccum();let tipo="Retiro anticipado";if(b.edadRet>=60&&b.edadRet<65)tipo=b.servicio>=25?"Cesantía en edad avanzada":"Posible negativa ISSSTE por años de servicio";if(b.edadRet>=65)tipo=b.servicio>=25?"Vejez":"Posible negativa ISSSTE por años de servicio";document.getElementById("elegibilidad").innerHTML=`<b>Tipo de pensión:</b> ${tipo}<br>
<b>1.3× pensión garantizada:</b> ${money(e.pensionMin)} · 
<b>Costo estimado mínimo:</b> ${money(e.costoMin)}<br>
<b>Factor por edad/sexo:</b> ${e.factorBase.toFixed(2)} · 
<b>Ajuste familiar:</b> +${e.ajusteFam.toFixed(2)} · 
<b>Ajuste prudente:</b> ${(e.prudencia*100).toFixed(1)}% · 
<b>Factor final:</b> ${e.factor.toFixed(2)}<br>
<span class="muted">${e.detalleFam}</span>`;const infl=pct("inflacion"),yrs=Math.max(0,months(new Date(),b.ret)/12),inflAcum=Math.pow(1+infl,yrs);document.getElementById("tablaOferta").innerHTML=e.opciones.map(o=>`<div class="offerCard option-${o.key}"><div class="offerTitle">${o.nombre}</div><div class="offerValue"><small>Pensión nominal</small><div class="big">${money(o.pension)}</div></div><div class="offerValue"><small>Poder adquisitivo actual</small><div class="big">${money(o.pension/inflAcum)}</div></div><div class="offerValue"><small>Costo de la renta</small><div class="big">${money(o.costo)}</div></div><div class="offerValue"><small>Monto a retirar</small><div class="big">${o.key==="max"?"—":money(o.retiro)}</div></div><div class="offerValue"><small>${o.tag}</small></div></div>`).join("");document.getElementById("retiroProgramado").innerHTML=`<b>Pago mensual estimado:</b> ${money(rp.pago)} · <b>Calculado hasta edad:</b> ${rp.edadFinal} · <b>Horizonte:</b> ${Math.round(rp.meses/12)} años.`;const edadFall=Number(document.getElementById("edadFallecimiento").value||0),mesCobro=Math.max(0,(edadFall-b.edadRet)*12),rMens=Math.pow(1+pct("rendimiento"),1/12)-1;let saldoRP=e.saldo;for(let i=0;i<mesCobro;i++)saldoRP=Math.max(0,saldoRP*(1+rMens)-rp.pago);document.getElementById("fallecimiento").innerHTML=`En <b>retiro programado</b>, si fallece a los ${edadFall} años, el saldo ilustrativo remanente sería ${money(saldoRP)}.<br><span class="muted">En renta vitalicia no se hereda el saldo no usado; operan derechos de beneficiarios y seguro de sobrevivencia.</span>`;const op=selectedOption(),ret=n("retiroDeseado");let inv=n("invertirDeseado");if(inv===0&&op.retiro>0){inv=Math.max(0,op.retiro-ret);document.getElementById("invertirDeseado").value=inv?inv.toLocaleString("es-MX",{maximumFractionDigits:0}):"0"}const theme=`theme-${op.key}`;document.getElementById("modulo5").className=`card ${theme}`;document.getElementById("modulo6").className=`card ${theme}`;document.getElementById("decisionExcedente").innerHTML=`<b>Escenario elegido:</b> ${op.nombre}<br><b>Retiro disponible estimado:</b> ${op.key==="max"?"—":money(op.retiro)}<br><b>Retiro elegido:</b> ${money(ret)}<br><b>Monto a invertir:</b> ${money(getInvestmentAmount())}`;const g=gestion();document.getElementById("montoInvertido").innerHTML=`<b>Monto que se estará invirtiendo:</b> ${money(g.invertir)}`;document.getElementById("propuestaGestion").className=g.tipo==="liquidez"?"taxGrid":"taxGrid twoCols";document.getElementById("propuestaGestion").innerHTML=g.tipo==="liquidez"?`<div class="taxCard ${theme}"><div class="taxTitle">Retiro mensual de inversión</div><div class="taxValue big">${money(g.retiroMens)}</div></div>`:`<div class="taxCard ${theme}"><div class="taxTitle">Retiro mensual de inversión</div><div class="taxValue big">${money(g.retiroMens)}</div></div><div class="taxCard ${theme}"><div class="taxTitle">Valor futuro estimado</div><div class="taxValue"><div class="big">${money(g.futuro)}</div><small>Valor actual: ${money(g.valorActualFuturo)}</small></div></div>`;document.getElementById("baseFiscal").innerHTML=`<div class="taxCard"><div class="taxTitle">Ingreso por pensión</div><div class="taxValue big">${money(g.pension)}</div></div><div class="taxCard"><div class="taxTitle">Ingreso gravable por pensión</div><div class="taxValue big">${money(g.pensionGrav)}</div></div><div class="taxCard"><div class="taxTitle">Ingreso gravable por rendimientos</div><div class="taxValue big">${money(g.rendGrav)}</div></div><div class="taxCard"><div class="taxTitle">Total ingresos gravables</div><div class="taxValue big">${money(g.baseGrav)}</div></div>`;document.getElementById("resultadoFiscal").innerHTML=`<div class="taxCard"><div class="taxTitle">Ingreso renta vitalicia</div><div class="taxValue big">${money(g.pension)}</div></div><div class="taxCard"><div class="taxTitle">Ingreso rendimientos</div><div class="taxValue big">${money(g.retiroMens)}</div></div><div class="taxCard"><div class="taxTitle">Impuestos estimados</div><div class="taxValue big">${money(g.isr)}</div></div><div class="taxCard ${theme}"><div class="taxTitle">Ingreso neto</div><div class="taxValue"><div class="big">${money(g.neto)}</div><small>Poder adquisitivo actual: ${money(g.real)}</small></div></div>`}
moneyIds.forEach(id=>document.addEventListener("blur",e=>{if(e.target.id===id){fmt(e.target);render()}},true));document.addEventListener("input",render);document.addEventListener("change",render);window.addEventListener("load",()=>{const today=new Date();if(!document.getElementById("fechaRetiro").value)document.getElementById("fechaRetiro").value=`${today.getFullYear()+6}-01-01`;moneyIds.forEach(id=>{const el=document.getElementById(id);if(el)fmt(el)});render()});
