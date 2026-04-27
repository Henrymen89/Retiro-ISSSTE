function money(n) {
  if (!isFinite(n)) return "$0";
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
}

function num(id) {
  return parseFloat(document.getElementById(id).value) || 0;
}

function val(id) {
  return document.getElementById(id).value;
}

function saldoInicial() {
  return num("saldoRcv") + num("sar92") + num("fovissste") + num("avActual");
}

function aportacionMensualTotal() {
  return num("aportObligatoria") + num("aportSolidario") + num("aportComplementaria") + num("aportVoluntaria");
}

function proyectarSaldo() {
  const edad = num("edad");
  const edadRetiro = num("edadRetiro");
  const anios = Math.max(0, edadRetiro - edad);
  const meses = anios * 12;
  const rMensual = Math.pow(1 + num("rendimiento") / 100, 1 / 12) - 1;
  const inflacionMensual = Math.pow(1 + num("inflacion") / 100, 1 / 12) - 1;
  let saldo = saldoInicial();
  let aportacion = aportacionMensualTotal();

  const serie = [{ anio: 0, nominal: saldo, real: saldo }];

  for (let m = 1; m <= meses; m++) {
    saldo = saldo * (1 + rMensual) + aportacion;
    if (m % 12 === 0 || m === meses) {
      const anio = m / 12;
      const real = saldo / Math.pow(1 + inflacionMensual, m);
      serie.push({ anio, nominal: saldo, real });
    }
  }

  return { saldo, serie, anios };
}

function factorSeguroSobrevivencia() {
  const estadoCivil = val("estadoCivil");
  const hijos = num("hijos");
  const edad = num("edad");
  const edadConyuge = num("edadConyuge");

  if (estadoCivil === "sin" && hijos === 0) return { min: 0.00, max: 0.03, texto: "sin beneficiarios relevantes" };

  let min = 0.03, max = 0.08, texto = "beneficiarios de impacto medio";
  if (estadoCivil === "con" && edadConyuge < edad) {
    min = 0.08; max = 0.15; texto = "cónyuge menor que el titular";
  }
  if (estadoCivil === "con" && hijos > 0) {
    min = 0.15; max = 0.25; texto = "cónyuge e hijos con derecho";
  }
  return { min, max, texto };
}

function escenarioPension(saldoProyectado) {
  const edadRetiro = num("edadRetiro");
  const pmgMensual = num("pmgMensual");
  const pmgAnual = pmgMensual * 12;
  const ss = factorSeguroSobrevivencia();
  const costoPmgBase = pmgAnual * 16; // aproximación inicial editable después con tabla CONSAR
  const costoPmgMin = costoPmgBase * (1 + ss.min);
  const costoPmgMax = costoPmgBase * (1 + ss.max);
  const excedenteMin = Math.max(0, saldoProyectado - costoPmgMax);
  const excedenteMax = Math.max(0, saldoProyectado - costoPmgMin);

  // Factor actuarial simplificado: años estimados * 12, ajustado por edad.
  const esperanza = val("sexo") === "mujer" ? 88 : 84;
  const mesesEsperados = Math.max(120, (esperanza - edadRetiro) * 12);
  const costoSeguroMin = saldoProyectado * ss.min;
  const costoSeguroMax = saldoProyectado * ss.max;

  const rvMensualMin = Math.max(0, (saldoProyectado - costoSeguroMax) / mesesEsperados);
  const rvMensualMax = Math.max(0, (saldoProyectado - costoSeguroMin) / mesesEsperados);

  const rpMensual = saldoProyectado / mesesEsperados;

  let elegibilidad = [];
  if (edadRetiro < 60) {
    const umbralRetiroAnticipado = pmgMensual * 1.3;
    elegibilidad.push(rvMensualMin > umbralRetiroAnticipado ? 
      ["Retiro anticipado: probable, sujeto a oferta oficial", false] :
      ["Retiro anticipado: revisar, puede no alcanzar 30% sobre PMG", true]);
  } else if (edadRetiro >= 60 && edadRetiro < 65) {
    elegibilidad.push(["Cesantía en edad avanzada", false]);
  } else {
    elegibilidad.push(["Vejez", false]);
  }

  if (num("aniosCotizados") < 25) elegibilidad.push(["Posible negativa o revisión de requisitos", true]);
  if (val("tieneImss") === "si") elegibilidad.push(["Módulo avanzado: revisar portabilidad IMSS-ISSSTE", false]);

  return {
    pmgMensual, costoPmgMin, costoPmgMax, excedenteMin, excedenteMax,
    costoSeguroMin, costoSeguroMax, rvMensualMin, rvMensualMax, rpMensual,
    elegibilidad, ss
  };
}

function calcularRetiroExcedente(excedente) {
  const r = num("rendimiento") / 100;
  const i = num("inflacion") / 100;
  const t = num("isr") / 100;
  const estrategia = val("estrategia");
  const edadRetiro = num("edadRetiro");
  const edadAgotar = num("edadAgotar");
  let retiroAnual = 0;

  if (estrategia === "conservador") {
    retiroAnual = excedente * Math.max(0, (r - i) * 0.60) * (1 - t);
  } else if (estrategia === "equilibrio") {
    retiroAnual = excedente * Math.max(0, (r - i)) * (1 - t);
  } else {
    const anios = Math.max(1, edadAgotar - edadRetiro);
    const rNetoMensual = Math.pow(1 + (r * (1 - t)), 1/12) - 1;
    const meses = anios * 12;
    const pagoMensual = rNetoMensual > 0
      ? excedente * (rNetoMensual / (1 - Math.pow(1 + rNetoMensual, -meses)))
      : excedente / meses;
    retiroAnual = pagoMensual * 12;
  }

  return {
    retiroAnual,
    retiroMensual: retiroAnual / 12,
    isrAnual: excedente * r * t,
    rendimientoBruto: excedente * r,
    rendimientoReal: excedente * Math.max(0, r - i)
  };
}

function serieExcedente(excedente, retiroMensual) {
  const rMensual = Math.pow(1 + num("rendimiento") / 100, 1 / 12) - 1;
  const t = num("isr") / 100;
  const edadRetiro = num("edadRetiro");
  const edadAgotar = num("edadAgotar");
  const meses = Math.max(12, (edadAgotar - edadRetiro) * 12);
  let saldo = excedente;
  const serie = [{ anio: 0, saldo }];

  for (let m = 1; m <= meses; m++) {
    const rendimiento = saldo * rMensual;
    const impuesto = rendimiento * t;
    saldo = Math.max(0, saldo + rendimiento - impuesto - retiroMensual);
    if (m % 12 === 0 || saldo <= 0) {
      serie.push({ anio: m / 12, saldo });
    }
    if (saldo <= 0) break;
  }
  return serie;
}

function drawLineChart(canvasId, series, keys, labels) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 220 * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width, h = 220;
  ctx.clearRect(0, 0, w, h);

  const pad = 34;
  const maxY = Math.max(...series.flatMap(p => keys.map(k => p[k] || 0)), 1);
  const maxX = Math.max(...series.map(p => p.anio), 1);

  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, pad);
  ctx.lineTo(pad, h - pad);
  ctx.lineTo(w - pad, h - pad);
  ctx.stroke();

  keys.forEach((key, idx) => {
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = idx === 0 ? "#22c55e" : "#38bdf8";
    series.forEach((p, i) => {
      const x = pad + (p.anio / maxX) * (w - pad * 2);
      const y = h - pad - ((p[key] || 0) / maxY) * (h - pad * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillText(labels[idx], pad + 10, pad + 16 + idx * 16);
  });

  ctx.fillStyle = "#9ca3af";
  ctx.font = "12px Arial";
  ctx.fillText("Años", w - pad - 28, h - 10);
  ctx.fillText(money(maxY), pad, 18);
}

function calcularTodo() {
  const proy = proyectarSaldo();
  const pension = escenarioPension(proy.saldo);

  document.getElementById("resultadoProyeccion").innerHTML = `
    <b>Saldo inicial:</b> ${money(saldoInicial())}<br>
    <b>Aportación mensual total:</b> ${money(aportacionMensualTotal())}<br>
    <b>Saldo nominal proyectado:</b> ${money(proy.saldo)}<br>
    <b>Saldo real estimado:</b> ${money(proy.serie[proy.serie.length - 1].real)}<br>
    <b>Horizonte:</b> ${proy.anios} años.
  `;
  drawLineChart("graficaAcumulacion", proy.serie, ["nominal", "real"], ["Saldo nominal", "Saldo real"]);

  const pillbox = document.getElementById("escenarioLegal");
  pillbox.innerHTML = pension.elegibilidad.map(([txt, warn]) => 
    `<span class="pill ${warn ? "warn" : ""}">${txt}</span>`
  ).join("");

  document.getElementById("rvMax").innerHTML = `
    Renta vitalicia probable:<br>
    <b>${money(pension.rvMensualMin)} a ${money(pension.rvMensualMax)} mensuales</b><br><br>
    Seguro de sobrevivencia estimado:<br>
    <b>${money(pension.costoSeguroMin)} a ${money(pension.costoSeguroMax)}</b><br>
    Perfil: ${pension.ss.texto}.
  `;

  document.getElementById("pmgEscenario").innerHTML = `
    Pensión mensual garantizada capturada:<br>
    <b>${money(pension.pmgMensual)}</b><br><br>
    Costo estimado para financiarla:<br>
    <b>${money(pension.costoPmgMin)} a ${money(pension.costoPmgMax)}</b><br><br>
    Excedente probable:<br>
    <b>${money(pension.excedenteMin)} a ${money(pension.excedenteMax)}</b>
  `;

  document.getElementById("rpEscenario").innerHTML = `
    Retiro programado aproximado:<br>
    <b>${money(pension.rpMensual)} mensuales</b><br><br>
    Este monto depende de saldo, edad, tablas, rendimiento y actualización anual.
  `;

  const manual = num("excedenteManual");
  const excedente = manual > 0 ? manual : pension.excedenteMin;
  if (manual === 0) document.getElementById("excedenteManual").value = Math.round(excedente);

  const retiro = calcularRetiroExcedente(excedente);
  const serieInv = serieExcedente(excedente, retiro.retiroMensual);
  drawLineChart("graficaExcedente", serieInv, ["saldo"], ["Capital invertido"]);

  document.getElementById("resultadoExcedente").innerHTML = `
    <b>Excedente usado para simulación:</b> ${money(excedente)}<br>
    <b>Rendimiento bruto anual estimado:</b> ${money(retiro.rendimientoBruto)}<br>
    <b>ISR estimado anual sobre rendimiento:</b> ${money(retiro.isrAnual)}<br>
    <b>Retiro mensual sugerido:</b> ${money(retiro.retiroMensual)}<br>
    <b>Retiro anual sugerido:</b> ${money(retiro.retiroAnual)}
  `;

  document.getElementById("gestion").innerHTML = `
    <b>Lectura fiscal-administrativa:</b><br>
    Si se traduce con las variables capturadas, el rendimiento bruto anual sería ${money(retiro.rendimientoBruto)} 
    y el ISR estimado sería ${money(retiro.isrAnual)}. El flujo líquido depende de la estrategia de retiro,
    la constancia fiscal, deducciones personales aplicables y reglas vigentes del año.<br><br>
    <b>Checklist anual:</b><br>
    1) Actualizar pensión garantizada, UMA/INPC, rendimiento e ISR.<br>
    2) Revisar constancias fiscales de intereses/rendimientos.<br>
    3) Validar deducciones personales disponibles.<br>
    4) Recalcular retiro mensual para no perder poder adquisitivo.
  `;
}

window.addEventListener("load", calcularTodo);
