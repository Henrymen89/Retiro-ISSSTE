function proyectar() {
  let saldo = parseFloat(document.getElementById("saldo").value);
  let años = parseFloat(document.getElementById("años").value);
  let r = parseFloat(document.getElementById("rendimiento").value) / 100;

  let futuro = saldo * Math.pow((1 + r), años);

  document.getElementById("resultadoProyeccion").innerText =
    "Saldo proyectado: $" + futuro.toFixed(2);
}

function calcularRetiro() {
  let saldo = parseFloat(document.getElementById("saldo").value);
  let r = parseFloat(document.getElementById("rendimiento").value) / 100;
  let i = parseFloat(document.getElementById("inflacion").value) / 100;
  let t = parseFloat(document.getElementById("isr").value) / 100;

  let tipo = document.getElementById("tipoRetiro").value;

  let retiro;

  if (tipo === "conservador") {
    retiro = saldo * (r * 0.5);
  } else if (tipo === "equilibrio") {
    retiro = saldo * (r - i) * (1 - t);
  } else {
    retiro = saldo * (r * 1.2);
  }

  let mensual = retiro / 12;

  document.getElementById("resultadoRetiro").innerText =
    "Retiro mensual estimado: $" + mensual.toFixed(2);
}