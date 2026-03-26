import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  update,
  set,
  onValue,
  get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

console.log("✅ presentador.js cargado correctamente - Modo Profesional");

const firebaseConfig = {
  apiKey: "AIzaSyDHVuYAt6FN0UfhfaitRsZ0JST_DFNm7W8",
  authDomain: "mexicanos-volcan.firebaseapp.com",
  databaseURL: "https://mexicanos-volcan-default-rtdb.firebaseio.com",
  projectId: "mexicanos-volcan",
  storageBucket: "mexicanos-volcan.appspot.com",
  messagingSenderId: "53156079573",
  appId: "1:53156079573:web:adc8e510fb4062ab593f5c"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ===== PANTALLA DE INICIO DEL PRESENTADOR ===== */
// Esperar a que el DOM esté completamente cargado
document.addEventListener("DOMContentLoaded", () => {
  const presentadorStartScreen = document.getElementById("presentadorStartScreen");
  const presentadorMainContent = document.getElementById("presentadorMainContent");
  const btnIniciarPresentador = document.getElementById("btnIniciarPresentador");
  
  console.log("🔍 Buscando elementos de pantalla de inicio:", {
    startScreen: presentadorStartScreen ? "✅ Encontrado" : "❌ No encontrado",
    mainContent: presentadorMainContent ? "✅ Encontrado" : "❌ No encontrado",
    btn: btnIniciarPresentador ? "✅ Encontrado" : "❌ No encontrado"
  });
  
  if (btnIniciarPresentador) {
    // Remover cualquier evento anterior
    const nuevoBtn = btnIniciarPresentador.cloneNode(true);
    btnIniciarPresentador.parentNode.replaceChild(nuevoBtn, btnIniciarPresentador);
    const btnFinal = document.getElementById("btnIniciarPresentador");
    
    btnFinal.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("🎮 Botón START presionado - Iniciando presentador");
      
      // Ocultar pantalla de inicio con animación
      if (presentadorStartScreen) {
        presentadorStartScreen.style.opacity = "0";
        presentadorStartScreen.style.transition = "opacity 0.5s ease";
        setTimeout(() => {
          presentadorStartScreen.style.display = "none";
        }, 500);
      }
      
      // Mostrar contenido principal
      if (presentadorMainContent) {
        presentadorMainContent.classList.remove("hidden");
        presentadorMainContent.style.opacity = "0";
        presentadorMainContent.style.transition = "opacity 0.5s ease";
        setTimeout(() => {
          presentadorMainContent.style.opacity = "1";
        }, 50);
      }
      
      console.log("✅ Presentador iniciado correctamente");
    });
    
    console.log("✅ Evento click asignado al botón START");
  } else {
    console.error("❌ Error: No se encontró el botón 'btnIniciarPresentador'");
    // Intentar buscar por otros métodos
    const botonPorQuery = document.querySelector(".btn-iniciar-presentador");
    if (botonPorQuery) {
      console.log("🔍 Botón encontrado por clase, asignando evento...");
      botonPorQuery.id = "btnIniciarPresentador";
      botonPorQuery.addEventListener("click", () => {
        const startScreen = document.getElementById("presentadorStartScreen");
        const mainContent = document.getElementById("presentadorMainContent");
        if (startScreen) startScreen.style.display = "none";
        if (mainContent) mainContent.classList.remove("hidden");
        console.log("✅ Presentador iniciado (fallback)");
      });
    }
  }
  
  // Asegurar que el contenido principal está oculto al inicio
  if (presentadorMainContent) {
    presentadorMainContent.classList.add("hidden");
    presentadorMainContent.style.opacity = "1";
  }
  
  // Si por algún error la pantalla de inicio no existe, mostrar el contenido directamente
  if (!presentadorStartScreen && presentadorMainContent) {
    console.warn("⚠️ Pantalla de inicio no encontrada, mostrando contenido directamente");
    presentadorMainContent.classList.remove("hidden");
  }
});

/* ===== RONDAS PREDETERMINADAS ===== */
const rondas = [
  {
    pregunta: "¿Qué debes hacer ANTES de una erupción volcánica?",
    respuestas: [
      { texto: "Conocer rutas de evacuación", puntos: 50, claves: ["ruta", "evacua"] },
      { texto: "Preparar mochila de emergencia", puntos: 35, claves: ["mochila"] },
      { texto: "Mantenerse informado", puntos: 25, claves: ["informado"] },
      { texto: "Proteger documentos importantes", puntos: 15, claves: ["documentos"] },
      { texto: "Identificar refugios", puntos: 5, claves: ["refugio"] }
    ]
  },
  {
    pregunta: "¿Qué hacer DURANTE una erupción volcánica?",
    respuestas: [
      { texto: "Evacuar inmediatamente", puntos: 50, claves: ["evacuar"] },
      { texto: "Cubrir nariz y boca", puntos: 35, claves: ["cubrir"] },
      { texto: "Seguir instrucciones oficiales", puntos: 25, claves: ["autoridades", "instrucciones"] },
      { texto: "Alejarse del volcán", puntos: 15, claves: ["alejar"] },
      { texto: "Buscar refugio seguro", puntos: 5, claves: ["refugio"] }
    ]
  }
];

let rondaActual = 0;
let turnoActual = {
  equipo: 1,
  jugadorId: null
};

/* ===== VARIABLES GLOBALES ===== */
let jugadoresGlobal = {};

/* ===== PUNTOS PREDETERMINADOS ===== */
const puntosPorPosicion = [50, 35, 25, 15, 5];

/* ===== HTML ELEMENTOS ===== */
// Botones existentes
const btnNuevaRonda = document.getElementById("btnNuevaRonda");
const btnCambiarTurno = document.getElementById("btnCambiarTurno");
const btnResetRespuestas = document.getElementById("btnResetRespuestas");
const btnResetScores = document.getElementById("btnResetScores");
const btnResetErrores = document.getElementById("btnResetErrores");
const btnPausarJuego = document.getElementById("btnPausarJuego");
const btnReanudarJuego = document.getElementById("btnReanudarJuego");
const btnReiniciarTodo = document.getElementById("btnReiniciarTodo");

// Nuevos elementos
const btnEnviarPregunta = document.getElementById("btnEnviarPregunta");
const preguntaInput = document.getElementById("preguntaInput");
const respuestasInputs = document.querySelectorAll(".respuestaInput");
const btnTurnoEquipo1 = document.getElementById("btnTurnoEquipo1");
const btnTurnoEquipo2 = document.getElementById("btnTurnoEquipo2");
const turnoDisplay = document.getElementById("turnoDisplay");
const btnPuntosEquipo1 = document.getElementById("btnPuntosEquipo1");
const btnPuntosEquipo2 = document.getElementById("btnPuntosEquipo2");
const btnRevelar = document.querySelectorAll(".btn-revelar");
const listaJugadoresDetallada = document.getElementById("listaJugadoresDetallada");
const contadorJugadoresDetallado = document.getElementById("contadorJugadoresDetallado");

// Elementos existentes
const selectRonda = document.getElementById("selectRonda");
const btnCargarRonda = document.getElementById("btnCargarRonda");
const preguntaEl = document.getElementById("pregunta");
const respuestasEl = document.getElementById("respuestas");
const turnoActualBox = document.getElementById("turnoActual");
const scoresBox = document.getElementById("scores");
const scoresGlobalBox = document.getElementById("scoresGlobal");
const erroresBox = document.getElementById("errores");
const contenedorJugadores = document.getElementById("jugadoresConectados");

/* ===== FUNCIÓN: ENVIAR PREGUNTA PERSONALIZADA ===== */
function enviarPreguntaPersonalizada() {
  const pregunta = preguntaInput?.value.trim();
  if (!pregunta) {
    alert("⚠️ Escribe una pregunta");
    return;
  }
  
  const respuestas = [];
  let respuestasValidas = true;
  
  respuestasInputs.forEach((input, index) => {
    const texto = input.value.trim();
    if (!texto) {
      alert(`⚠️ La respuesta ${index + 1} está vacía`);
      respuestasValidas = false;
    }
    respuestas.push({
      texto: texto,
      puntos: puntosPorPosicion[index],
      claves: [texto.toLowerCase().split(" ")[0]]
    });
  });
  
  if (!respuestasValidas) return;
  
  // Actualizar estadoJuego con nueva pregunta
  set(ref(db, "estadoJuego"), {
    rondaActual: 0,
    turno: { equipo: 1, jugadorId: null },
    pausado: false,
    respuestasReveladas: {},
    scores: { 1: 0, 2: 0 },
    scoresGlobal: { 1: 0, 2: 0 },
    errores: { 1: 0, 2: 0 },
    preguntaActual: pregunta,
    respuestasActuales: respuestas,
    reset: Date.now()
  });
  
  // También guardar en game para compatibilidad
  set(ref(db, "game"), {
    pregunta: pregunta,
    respuestas: respuestas.map(r => r.texto),
    reveladas: [false, false, false, false, false],
    turno: 1,
    errores: 0
  });
  
  console.log("✅ Pregunta personalizada enviada:", pregunta);
  alert("✅ Pregunta enviada correctamente");
  
  // Limpiar inputs
  if (preguntaInput) preguntaInput.value = "";
  respuestasInputs.forEach(input => { if (input) input.value = ""; });
}

/* ===== FUNCIÓN: CAMBIAR TURNO MEJORADA ===== */
function cambiarTurno(equipo) {
  turnoActual = {
    equipo: equipo,
    jugadorId: null
  };
  update(ref(db, "estadoJuego/turno"), turnoActual);
  update(ref(db, "game"), { turno: equipo });
  
  // Actualizar display con el nombre del jugador si hay uno seleccionado
  actualizarDisplayTurnoConNombre();
  console.log(`🔄 Turno cambiado a EQUIPO ${equipo}`);
}

/* ===== NUEVA FUNCIÓN: ACTUALIZAR DISPLAY DE TURNO CON NOMBRE ===== */
function actualizarDisplayTurnoConNombre() {
  if (turnoDisplay) {
    if (turnoActual.jugadorId && jugadoresGlobal[turnoActual.jugadorId]) {
      const jugador = jugadoresGlobal[turnoActual.jugadorId];
      turnoDisplay.textContent = `EQUIPO ${turnoActual.equipo} - ${jugador.nombre}`;
    } else {
      turnoDisplay.textContent = `EQUIPO ${turnoActual.equipo}`;
    }
  }
}

/* ===== FUNCIÓN: SUMAR PUNTOS MANUAL ===== */
function sumarPuntosManual(equipo) {
  get(ref(db, "estadoJuego")).then((snap) => {
    if (snap.exists()) {
      const data = snap.val();
      const puntosActuales = data.scores?.[equipo] || 0;
      const globalActuales = data.scoresGlobal?.[equipo] || 0;
      
      update(ref(db, "estadoJuego"), {
        [`scores/${equipo}`]: puntosActuales + 50,
        [`scoresGlobal/${equipo}`]: globalActuales + 50
      });
      console.log(`➕ +50 puntos al EQUIPO ${equipo}`);
    }
  });
}

/* ===== FUNCIÓN: REVELAR RESPUESTA ===== */
function revelarRespuesta(index) {
  update(ref(db, "estadoJuego/respuestasReveladas"), {
    [index]: true
  });
  console.log(`🔓 Respuesta ${index + 1} revelada`);
}

/* ===== FUNCIÓN: RESET ERRORES ===== */
function resetErrores() {
  update(ref(db, "estadoJuego"), {
    errores: { 1: 0, 2: 0 }
  });
  console.log("🔄 Errores reiniciados");
}

/* ===== FUNCIÓN: RENDERIZADO DE JUGADORES (CON DESBLOQUEAR) ===== */
function renderJugadores(jugadores) {
  if (!jugadores || Object.keys(jugadores).length === 0) {
    const mensaje = '<div class="sin-jugadores">👾 NO HAY JUGADORES CONECTADOS 👾</div>';
    if (contenedorJugadores) contenedorJugadores.innerHTML = mensaje;
    if (listaJugadoresDetallada) listaJugadoresDetallada.innerHTML = mensaje;
    if (contadorJugadoresDetallado) contadorJugadoresDetallado.textContent = "Total: 0/5 jugadores activos";
    return;
  }

  const jugadoresArray = Object.entries(jugadores);
  // Filtrar jugadores expulsados (los que ya no existen o tienen estado expulsado)
  const jugadoresActivos = jugadoresArray.filter(([_, j]) => j !== null && j.estado !== "expulsado");
  
  if (contadorJugadoresDetallado) {
    contadorJugadoresDetallado.textContent = `Total: ${jugadoresActivos.length}/5 jugadores activos`;
  }
  
  // Contador para el panel de estado
  if (document.getElementById("contadorJugadores")) {
    document.getElementById("contadorJugadores").textContent = `Total: ${jugadoresActivos.length}/5 jugadores`;
  }
  
  // Renderizar en contenedor original
  if (contenedorJugadores) {
    contenedorJugadores.innerHTML = "";
    jugadoresArray.forEach(([id, jugador]) => {
      // Saltar jugadores expulsados o nulos
      if (jugador === null || jugador.estado === "expulsado") return;
      
      const div = document.createElement("div");
      div.classList.add("jugador-item");
      if (jugador.equipo === 1) div.classList.add("equipo1");
      else div.classList.add("equipo2");
      if (turnoActual.jugadorId === id) div.classList.add("turno-activo");
      
      const estaBloqueado = jugador.estado === "bloqueado";
      const deshabilitado = estaBloqueado;
      
      div.innerHTML = `
        <div class="jugador-header">
          <strong>${jugador.nombre}</strong>
          <span class="jugador-equipo">EQ${jugador.equipo}</span>
        </div>
        <div class="jugador-estado">
          <span class="estado-indicador estado-${jugador.estado === 'bloqueado' ? 'bloqueado' : 'activo'}"></span>
          <span class="estado-texto">${jugador.estado === 'bloqueado' ? '🚫 BLOQUEADO' : '✅ ACTIVO'}</span>
        </div>
        <div class="jugador-acciones">
          <button class="btn-seleccionar" ${deshabilitado ? "disabled" : ""} onclick="seleccionarJugador('${id}', ${jugador.equipo})">
            🎯 SELECCIONAR
          </button>
          ${estaBloqueado ? 
            `<button class="btn-desbloquear" onclick="desbloquearJugador('${id}')">
              🔓 DESBLOQUEAR
            </button>` :
            `<button class="btn-bloquear" onclick="bloquearJugador('${id}')">
              🚫 BLOQUEAR
            </button>`
          }
          <button class="btn-expulsar" onclick="expulsarJugador('${id}')">
            ❌ EXPULSAR
          </button>
        </div>
      `;
      contenedorJugadores.appendChild(div);
    });
  }
  
  // Renderizar en contenedor detallado
  if (listaJugadoresDetallada) {
    listaJugadoresDetallada.innerHTML = "";
    jugadoresArray.forEach(([id, jugador]) => {
      // Saltar jugadores expulsados o nulos
      if (jugador === null || jugador.estado === "expulsado") return;
      
      const div = document.createElement("div");
      div.classList.add("jugador-card");
      if (jugador.equipo === 1) div.classList.add("equipo1");
      else div.classList.add("equipo2");
      
      const estaBloqueado = jugador.estado === "bloqueado";
      const estadoClass = estaBloqueado ? "bloqueado" : "activo";
      const estadoText = estaBloqueado ? "🚫 BLOQUEADO" : "✅ ACTIVO";
      
      div.innerHTML = `
        <div class="jugador-info">
          <span class="jugador-nombre">${jugador.nombre}</span>
          <span class="jugador-equipo">🎯 EQUIPO ${jugador.equipo || 1}</span>
          <span class="jugador-estado ${estadoClass}">${estadoText}</span>
        </div>
        <div class="jugador-acciones">
          <button class="btn-seleccionar" ${estaBloqueado ? "disabled" : ""} onclick="seleccionarJugador('${id}', ${jugador.equipo || 1})">
            🎯 SELECCIONAR
          </button>
          ${estaBloqueado ? 
            `<button class="btn-desbloquear" onclick="desbloquearJugador('${id}')">
              🔓 DESBLOQUEAR
            </button>` :
            `<button class="btn-bloquear" onclick="bloquearJugador('${id}')">
              🚫 BLOQUEAR
            </button>`
          }
          <button class="btn-expulsar" onclick="expulsarJugador('${id}')">
            ❌ EXPULSAR
          </button>
        </div>
      `;
      listaJugadoresDetallada.appendChild(div);
    });
  }
  
  // Actualizar display de turno con nombre después de renderizar
  actualizarDisplayTurnoConNombre();
}

/* ===== RENDER RONDA MEJORADO ===== */
function renderRonda() {
  // Usar pregunta personalizada si existe, sino usar rondas predefinidas
  get(ref(db, "estadoJuego")).then((snap) => {
    if (snap.exists()) {
      const data = snap.val();
      if (data.preguntaActual && data.respuestasActuales) {
        if (preguntaEl) preguntaEl.textContent = data.preguntaActual;
        if (respuestasEl) {
          respuestasEl.innerHTML = "";
          data.respuestasActuales.forEach((resp, index) => {
            const div = document.createElement("div");
            div.className = "respuesta";
            div.textContent = `${resp.texto} (${resp.puntos})`;
            div.addEventListener("click", () => {
              update(ref(db, "estadoJuego/respuestasReveladas"), { [index]: true });
            });
            respuestasEl.appendChild(div);
          });
        }
        return;
      }
    }
    
    // Fallback a rondas predefinidas
    if (preguntaEl) preguntaEl.textContent = rondas[rondaActual]?.pregunta || "";
    if (respuestasEl) {
      respuestasEl.innerHTML = "";
      rondas[rondaActual]?.respuestas.forEach((resp, index) => {
        const div = document.createElement("div");
        div.className = "respuesta";
        div.textContent = `${resp.texto} (${resp.puntos})`;
        div.addEventListener("click", () => {
          update(ref(db, "estadoJuego/respuestasReveladas"), { [index]: true });
        });
        respuestasEl.appendChild(div);
      });
    }
  });
}

/* ===== PINTAR ESTADO EN UI MEJORADO ===== */
function pintarTurnoUI(turno) {
  const valor = turnoActualBox?.querySelector(".estado-valor");
  if (valor) {
    const equipo = turno?.equipo ?? turno ?? 1;
    const jugadorId = turno?.jugadorId;
    
    if (jugadorId && jugadoresGlobal[jugadorId]) {
      const nombreJugador = jugadoresGlobal[jugadorId].nombre;
      valor.textContent = `EQ${equipo} - ${nombreJugador}`;
      if (turnoDisplay) turnoDisplay.textContent = `EQUIPO ${equipo} - ${nombreJugador}`;
    } else {
      valor.textContent = `EQUIPO ${equipo}`;
      if (turnoDisplay) turnoDisplay.textContent = `EQUIPO ${equipo}`;
    }
  }
}

function pintarScoresUI(sc) {
  if (!scoresBox) return;
  const s1 = sc?.[1] ?? sc?.["1"] ?? 0;
  const s2 = sc?.[2] ?? sc?.["2"] ?? 0;
  scoresBox.innerHTML = `Equipo 1: ${s1}<br>Equipo 2: ${s2}`;
}

function pintarScoresGlobalUI(scGlobal) {
  if (!scoresGlobalBox) return;
  const s1 = scGlobal?.[1] ?? scGlobal?.["1"] ?? 0;
  const s2 = scGlobal?.[2] ?? scGlobal?.["2"] ?? 0;
  scoresGlobalBox.innerHTML = `🌍 GLOBAL: ${s1} - ${s2}`;
}

function pintarErroresUI(err) {
  if (!erroresBox) return;
  const e1 = err?.[1] ?? err?.["1"] ?? 0;
  const e2 = err?.[2] ?? err?.["2"] ?? 0;
  erroresBox.innerHTML = `Equipo 1: ${e1}/3<br>Equipo 2: ${e2}/3`;
}

function actualizarBotonesRevelar(respuestasReveladas) {
  btnRevelar.forEach((btn, idx) => {
    const revelada = respuestasReveladas?.[idx] || false;
    if (revelada) {
      btn.classList.add("revelado");
      btn.disabled = true;
    } else {
      btn.classList.remove("revelado");
      btn.disabled = false;
    }
  });
}

/* ===== INIT estadoJuego ===== */
onValue(ref(db, "estadoJuego"), (snap) => {
  if (!snap.exists()) {
    set(ref(db, "estadoJuego"), {
      rondaActual: 0,
      turno: { equipo: 1, jugadorId: null },
      pausado: false,
      respuestasReveladas: {},
      scores: { 1: 0, 2: 0 },
      scoresGlobal: { 1: 0, 2: 0 },
      errores: { 1: 0, 2: 0 },
      reset: Date.now()
    });
    return;
  }

  const e = snap.val();
  rondaActual = e.rondaActual ?? 0;
  
  if (typeof e.turno === 'object') {
    turnoActual = e.turno;
  } else {
    turnoActual = { equipo: e.turno ?? 1, jugadorId: null };
  }

  if (selectRonda) selectRonda.value = String(rondaActual);

  pintarTurnoUI(turnoActual);
  pintarScoresUI(e.scores);
  pintarScoresGlobalUI(e.scoresGlobal);
  pintarErroresUI(e.errores);
  actualizarBotonesRevelar(e.respuestasReveladas);

  renderRonda();
  renderJugadores(jugadoresGlobal);
});

/* ===== JUGADORES EN TIEMPO REAL ===== */
const jugadoresRef = ref(db, "jugadores");

onValue(jugadoresRef, (snapshot) => {
  if (!snapshot.exists()) {
    jugadoresGlobal = {};
    renderJugadores(jugadoresGlobal);
    return;
  }

  // Filtrar jugadores nulos y expulsados
  const jugadores = snapshot.val();
  const jugadoresFiltrados = {};
  
  Object.entries(jugadores).forEach(([id, jugador]) => {
    // Si el jugador no es null y no está expulsado, lo incluimos
    if (jugador !== null && jugador.estado !== "expulsado") {
      jugadoresFiltrados[id] = jugador;
    }
  });
  
  jugadoresGlobal = jugadoresFiltrados;
  renderJugadores(jugadoresGlobal);
  pintarTurnoUI(turnoActual);
  actualizarDisplayTurnoConNombre();
});

/* ===== FUNCIONES DE CONTROL DE JUGADORES MEJORADAS ===== */

// Bloquear jugador (cambia estado a bloqueado)
window.bloquearJugador = function (id) {
  if (confirm("🚫 ¿Bloquear a este jugador?")) {
    update(ref(db, "jugadores/" + id), { estado: "bloqueado" });
    console.log(`🚫 Jugador ${id} bloqueado`);
    alert("🚫 Jugador bloqueado");
  }
};

// Desbloquear jugador (cambia estado a activo)
window.desbloquearJugador = function (id) {
  if (confirm("🔓 ¿Desbloquear a este jugador?")) {
    update(ref(db, "jugadores/" + id), { estado: "activo" });
    console.log(`🔓 Jugador ${id} desbloqueado`);
    alert("🔓 Jugador desbloqueado");
  }
};

// Expulsar jugador (eliminar completamente de la base de datos)
window.expulsarJugador = function (id) {
  if (confirm("⚠️ ¿EXPULSAR a este jugador? Esta acción eliminará al jugador permanentemente y NO se puede deshacer")) {
    // Eliminar completamente el jugador de la base de datos
    const jugadorRef = ref(db, "jugadores/" + id);
    set(jugadorRef, null).then(() => {
      console.log(`❌ Jugador ${id} expulsado y eliminado de la base de datos`);
      alert("❌ Jugador expulsado y eliminado del sistema");
    }).catch((error) => {
      console.error("Error al expulsar jugador:", error);
      alert("❌ Error al expulsar jugador");
    });
  }
};

// Seleccionar jugador para el turno
window.seleccionarJugador = function (id, equipo) {
  const jugador = jugadoresGlobal[id];

  if (!jugador) {
    alert("❌ Jugador no encontrado");
    return;
  }

  if (jugador.estado === "bloqueado") {
    alert("🚫 No puedes seleccionar un jugador bloqueado. Desbloquéalo primero.");
    return;
  }

  if (jugador.estado === "expulsado" || !jugador.estado) {
    alert("❌ Este jugador ya no existe en el sistema");
    return;
  }

  if (jugador.equipo !== equipo) {
    equipo = jugador.equipo;
  }

  turnoActual = { equipo: equipo, jugadorId: id };
  update(ref(db, "estadoJuego/turno"), turnoActual);
  console.log(`✅ Jugador ${jugador.nombre} seleccionado para el turno`);
  
  // Feedback visual con nombre
  if (turnoDisplay) {
    turnoDisplay.textContent = `EQUIPO ${equipo} - ${jugador.nombre}`;
  }
  
  alert(`🎯 Turno asignado a: ${jugador.nombre} (Equipo ${equipo})`);
};

/* ===== EVENT LISTENERS ===== */
// Botones nuevos
if (btnEnviarPregunta) btnEnviarPregunta.addEventListener("click", enviarPreguntaPersonalizada);
if (btnTurnoEquipo1) btnTurnoEquipo1.addEventListener("click", () => cambiarTurno(1));
if (btnTurnoEquipo2) btnTurnoEquipo2.addEventListener("click", () => cambiarTurno(2));
if (btnPuntosEquipo1) btnPuntosEquipo1.addEventListener("click", () => sumarPuntosManual(1));
if (btnPuntosEquipo2) btnPuntosEquipo2.addEventListener("click", () => sumarPuntosManual(2));
if (btnResetErrores) btnResetErrores.addEventListener("click", resetErrores);

// Botones revelar
btnRevelar.forEach(btn => {
  btn.addEventListener("click", () => {
    const index = parseInt(btn.dataset.index);
    if (!isNaN(index)) revelarRespuesta(index);
  });
});

// Botones existentes
if (btnCargarRonda) {
  btnCargarRonda.addEventListener("click", () => {
    rondaActual = Number(selectRonda?.value || 0);
    renderRonda();
    update(ref(db, "estadoJuego"), {
      rondaActual,
      respuestasReveladas: {},
      errores: { 1: 0, 2: 0 },
      reset: Date.now()
    });
  });
}

if (btnNuevaRonda) {
  btnNuevaRonda.addEventListener("click", () => {
    rondaActual = (rondaActual + 1) % rondas.length;
    turnoActual = { equipo: 1, jugadorId: null };
    renderRonda();
    set(ref(db, "estadoJuego"), {
      rondaActual,
      turno: turnoActual,
      pausado: false,
      respuestasReveladas: {},
      scores: { 1: 0, 2: 0 },
      scoresGlobal: { 1: 0, 2: 0 },
      errores: { 1: 0, 2: 0 },
      reset: Date.now()
    });
  });
}

if (btnCambiarTurno) {
  btnCambiarTurno.addEventListener("click", () => {
    const nuevoEquipo = turnoActual.equipo === 1 ? 2 : 1;
    cambiarTurno(nuevoEquipo);
  });
}

if (btnResetRespuestas) {
  btnResetRespuestas.addEventListener("click", () => {
    update(ref(db, "estadoJuego"), { respuestasReveladas: {} });
  });
}

if (btnResetScores) {
  btnResetScores.addEventListener("click", () => {
    update(ref(db, "estadoJuego"), { 
      scores: { 1: 0, 2: 0 },
      scoresGlobal: { 1: 0, 2: 0 }
    });
  });
}

if (btnPausarJuego) {
  btnPausarJuego.addEventListener("click", () => {
    update(ref(db, "estadoJuego"), { pausado: true });
  });
}

if (btnReanudarJuego) {
  btnReanudarJuego.addEventListener("click", () => {
    update(ref(db, "estadoJuego"), { pausado: false });
  });
}

if (btnReiniciarTodo) {
  btnReiniciarTodo.addEventListener("click", () => {
    if (confirm("⚠️ ¿REINICIAR TODO? Se perderán todos los datos")) {
      rondaActual = 0;
      turnoActual = { equipo: 1, jugadorId: null };
      renderRonda();
      set(ref(db, "estadoJuego"), {
        rondaActual,
        turno: turnoActual,
        pausado: false,
        respuestasReveladas: {},
        scores: { 1: 0, 2: 0 },
        scoresGlobal: { 1: 0, 2: 0 },
        errores: { 1: 0, 2: 0 },
        reset: Date.now()
      });
    }
  });
}

console.log("🎮 Presentador listo - Todas las funcionalidades activadas");
console.log("✨ Nueva funcionalidad: Bloquear/Desbloquear jugadores y Expulsar (eliminar de BD)");