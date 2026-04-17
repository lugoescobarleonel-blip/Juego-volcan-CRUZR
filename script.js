/* ================= script.js VERSIÓN PRO ACTUALIZADA ================= */

/* ================= IMPORTS ================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  update,
  push,
  set,
  get,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/* ================= FIREBASE CONFIGURATION ================= */
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
console.log("🔥 Firebase inicializado correctamente");

/* ================= GLOBAL VARIABLES ================= */
let jugadoresGlobal = {};
let rondaActual = 0;
let turno = { equipo: 1, jugadorId: null };
let pausado = false;
let ultimoJugadorTurno = null;
let scores = { 1: 0, 2: 0 };
let scoresGlobal = { 1: 0, 2: 0 };
let erroresPorEquipo = { 1: 0, 2: 0 };
let respuestasMostradas = [];
let ultimoReset = null;
let estadoJugador = "activo";
let cooldown = false;
let miId = sessionStorage.getItem("jugadorId");
let faseActual = "esperando";
let tabInstanceId = null;
const TAB_CLAIM_EXPIRY_MS = 10000;

/* ================= RONDAS ================= */
const rondas = [
  {
    pregunta: "¿Qué debes hacer ANTES de una erupción volcánica?",
    respuestas: [
      { texto: "Conocer rutas de evacuación", puntos: 50, claves: ["conocer", "ruta", "evacua", "evacuacion", "rutas", "evacuar"] },
      { texto: "Preparar mochila de emergencia", puntos: 35, claves: ["preparar", "mochila", "emergencia"] },
      { texto: "Mantenerse informado", puntos: 25, claves: ["mantenerse", "informado", "informacion"] },
      { texto: "Proteger documentos importantes", puntos: 15, claves: ["proteger", "documentos", "importantes"] },
      { texto: "Identificar refugios", puntos: 5, claves: ["identificar", "refugios", "refugio"] }
    ]
  },
  {
    pregunta: "¿Qué hacer DURANTE una erupción volcánica?",
    respuestas: [
      { texto: "Evacuar inmediatamente", puntos: 50, claves: ["evacuar", "inmediatamente"] },
      { texto: "Cubrir nariz y boca", puntos: 35, claves: ["cubrir", "nariz", "boca"] },
      { texto: "Seguir instrucciones oficiales", puntos: 25, claves: ["seguir", "instrucciones", "oficiales", "autoridades"] },
      { texto: "Alejarse del volcán", puntos: 15, claves: ["alejarse", "volcan"] },
      { texto: "Buscar refugio seguro", puntos: 5, claves: ["buscar", "refugio", "seguro"] }
    ]
  },
  {
    pregunta: "¿Qué hacer DESPUÉS de una erupción volcánica?",
    respuestas: [
      { texto: "Esperar autorización para regresar", puntos: 50, claves: ["esperar", "autorizacion", "regresar"] },
      { texto: "Verificar daños en la vivienda", puntos: 35, claves: ["verificar", "daños", "vivienda"] },
      { texto: "Buscar personas desaparecidas", puntos: 25, claves: ["buscar", "personas", "desaparecidas"] },
      { texto: "Reportar a las autoridades", puntos: 15, claves: ["reportar", "autoridades"] },
      { texto: "Recibir atención médica si es necesario", puntos: 5, claves: ["recibir", "atencion", "medica", "necesario"] }
    ]
  }
];

/* ================= DOM ELEMENTS ================= */
let startScreen, playerScreen, gameOverScreen, blockedModal, expulsadoModal, rondaTransicionScreen, gameWrapper;
let btnStart, btnJoin, btnEnviar, btnNext, btnRegresarInicio, currentTurnBadge, currentTurnPlayerName;
let inputRespuesta, turnoTxt, questionText, globalScoreEl, inputLabel;
let answers, errorsWrap, errorXs, score1, score2, gameOverText;

/* ================= UTILITY FUNCTIONS ================= */
function normalizar(texto) {
  return texto.toLowerCase().trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function extraerTurnoNumero(turnoData) {
  if (turnoData === undefined || turnoData === null) return 1;
  return typeof turnoData === "object" 
    ? (turnoData.equipo || 1) 
    : turnoData;
}

function equiposCompletos() {
  const jugadoresActivos = Object.values(jugadoresGlobal).filter(j => j.estado !== "expulsado");
  const equipo1 = jugadoresActivos.filter(j => j.equipo === 1).length;
  const equipo2 = jugadoresActivos.filter(j => j.equipo === 2).length;
  return equipo1 >= 3 && equipo2 >= 3;
}

/* ================= UI UPDATE FUNCTIONS ================= */
function actualizarScoresUI() {
  score1.textContent = scores[1] ?? 0;
  score2.textContent = scores[2] ?? 0;
  if (globalScoreEl) {
    globalScoreEl.textContent = `🌍 GLOBAL: ${scoresGlobal[1] ?? 0} - ${scoresGlobal[2] ?? 0}`;
  }
}

function pintarErroresUI() {
  if (!errorXs || errorXs.length === 0) return;
  const miEquipo = jugadoresGlobal[miId]?.equipo;
  const e = miEquipo ? (erroresPorEquipo[miEquipo] ?? 0) : 0;
  errorXs.forEach(x => x.classList.remove("active"));
  for (let i = 0; i < Math.min(e, 3); i++) {
    errorXs[i].classList.add("active");
  }
}

function actualizarTurnoConNombre() {
  if (!turnoTxt) return;
  
  if (turno.jugadorId && jugadoresGlobal && jugadoresGlobal[turno.jugadorId]) {
    const jugador = jugadoresGlobal[turno.jugadorId];
    turnoTxt.innerHTML = `🎯 TURNO DE: ${jugador.nombre}<br><span style="font-size: 10px; color: #ffcc00;">(EQUIPO ${turno.equipo})</span>`;
    
    if (currentTurnBadge && currentTurnPlayerName) {
      if (faseActual === "jugando" && turno.jugadorId) {
        currentTurnPlayerName.textContent = `${jugador.nombre.toUpperCase()} (EQUIPO ${jugador.equipo})`;
        currentTurnBadge.classList.remove("hidden");
      } else {
        currentTurnBadge.classList.add("hidden");
      }
    }
    
    if (inputRespuesta && jugador.id === miId && estadoJugador !== "bloqueado" && estadoJugador !== "expulsado" && !pausado) {
      inputRespuesta.placeholder = `✍️ ${jugador.nombre}, escribe tu respuesta...`;
    } else if (inputRespuesta && jugador.id === miId) {
      inputRespuesta.placeholder = "⏳ Espera tu turno...";
    }
  } else {
    turnoTxt.innerHTML = `🎮 TURNO DEL EQUIPO ${turno.equipo}`;
    
    if (currentTurnBadge && currentTurnPlayerName) {
      if (faseActual === "jugando") {
        if (turno.jugadorId && jugadoresGlobal[turno.jugadorId]) {
          const jugador = jugadoresGlobal[turno.jugadorId];
          currentTurnPlayerName.textContent = `${jugador.nombre.toUpperCase()} (EQUIPO ${jugador.equipo})`;
          
          if (turno.jugadorId !== ultimoJugadorTurno) {
            ultimoJugadorTurno = turno.jugadorId;
            currentTurnBadge.classList.add("turno-animado");
            setTimeout(() => {
              currentTurnBadge.classList.remove("turno-animado");
            }, 500);
            
            const flash = document.createElement("div");
            flash.classList.add("flash-turno");
            document.body.appendChild(flash);
            setTimeout(() => {
              flash.remove();
            }, 400);
          }
        }
      } else {
        currentTurnBadge.classList.add("hidden");
      }
    }
  }
}

function actualizarLabelDinamico() {
  if (!inputLabel) return;
  
  inputLabel.classList.remove("bloqueado", "expulsado");
  
  if (estadoJugador === "bloqueado") {
    inputLabel.textContent = "🚫 BLOQUEADO";
    inputLabel.classList.add("bloqueado");
  } else if (estadoJugador === "expulsado") {
    inputLabel.textContent = "❌ EXPULSADO";
    inputLabel.classList.add("expulsado");
  } else if ((turno.jugadorId === miId || (turno.jugadorId === null && turno.equipo === jugadoresGlobal[miId]?.equipo)) && !pausado) {
    const jugador = jugadoresGlobal[miId];
    if (jugador) {
      inputLabel.textContent = `👉 ${jugador.nombre}, es tu turno`;
    } else {
      inputLabel.textContent = "👉 INTRODUCE TU RESPUESTA";
    }
  } else {
    inputLabel.textContent = "👉 INTRODUCE TU RESPUESTA";
  }
}

function actualizarEstadoInputYBoton() {
  if (!inputRespuesta) return;
  
  inputRespuesta.classList.remove("turno-activo", "no-turno", "bloqueado");
  
  const estaInhabilitado = estadoJugador === "bloqueado" || estadoJugador === "expulsado";
  
  if (estaInhabilitado) {
    inputRespuesta.disabled = true;
    inputRespuesta.classList.add("bloqueado");
    inputRespuesta.placeholder = estadoJugador === "bloqueado" ? "🚫 Bloqueado" : "❌ Expulsado";
    if (btnEnviar) btnEnviar.disabled = true;
    return;
  }
  
  if (faseActual === "esperando") {
    inputRespuesta.disabled = true;
    inputRespuesta.classList.add("no-turno");
    inputRespuesta.placeholder = "⏳ Esperando que inicie el juego...";
    if (btnEnviar) btnEnviar.disabled = true;
    return;
  }
  
  if (faseActual === "jugando" && !pausado) {
    const jugador = jugadoresGlobal[miId];
    
    if (!jugador) {
      inputRespuesta.disabled = true;
      return;
    }
    
    if (!turno.equipo || turno.equipo === jugador.equipo) {
      inputRespuesta.disabled = false;
      inputRespuesta.classList.add("turno-activo");
      inputRespuesta.placeholder = `⚡ Escribe tu respuesta - ${jugador.nombre}`;
      if (btnEnviar) btnEnviar.disabled = false;
    } else {
      inputRespuesta.disabled = true;
      inputRespuesta.classList.add("no-turno");
      inputRespuesta.placeholder = `⏳ Esperando turno del Equipo ${turno.equipo}`;
      if (btnEnviar) btnEnviar.disabled = false;
    }
    return;
  }
  
  inputRespuesta.disabled = true;
  inputRespuesta.classList.add("no-turno");
  inputRespuesta.placeholder = pausado ? "⏸️ Juego pausado" : "⏳ Esperando...";
  if (btnEnviar) btnEnviar.disabled = true;
}

function iniciarRondaUI() {
  respuestasMostradas = [];
  inputRespuesta.value = "";
  
  answers.forEach((a, index) => {
    a.classList.remove("revealed");
    const resp = rondas[rondaActual]?.respuestas?.[index];
    if (resp) a.setAttribute("data-text", `${resp.texto} (${resp.puntos})`);
  });
  
  questionText.textContent = rondas[rondaActual]?.pregunta ?? "";
  actualizarTurnoConNombre();
  actualizarScoresUI();
  pintarErroresUI();
  actualizarEstadoInputYBoton();
  actualizarLabelDinamico();
}

/* ================= GAME FLOW FUNCTIONS ================= */
window.registrarJugadorFirebase = function (jugador) {
  const jugadorRef = push(ref(db, "jugadores"));
  const jugadorId = jugadorRef.key;
  
  set(jugadorRef, {
    ...jugador,
    estado: "activo",
    id: jugadorId
  });
  
  sessionStorage.setItem("jugadorId", jugadorId);
  return jugadorId;
};

function configurarListenerEstadoJugador() {
  if (!miId) return;
  
  if (window.estadoJugadorListener) {
    window.estadoJugadorListener();
  }
  
  window.estadoJugadorListener = onValue(ref(db, "jugadores/" + miId), (snap) => {
    if (!snap.exists()) {
      estadoJugador = "expulsado";
      expulsadoModal?.classList.remove("hidden");
      blockedModal?.classList.add("hidden");
      actualizarEstadoInputYBoton();
      actualizarLabelDinamico();
      return;
    }
    
    const data = snap.val();
    estadoJugador = data.estado || "activo";
    
    if (data.equipo) {
      sessionStorage.setItem("equipo", data.equipo);
    }
    
    if (estadoJugador === "bloqueado") {
      blockedModal?.classList.remove("hidden");
      expulsadoModal?.classList.add("hidden");
    } else if (estadoJugador === "expulsado") {
      expulsadoModal?.classList.remove("hidden");
      blockedModal?.classList.add("hidden");
    } else {
      blockedModal?.classList.add("hidden");
      expulsadoModal?.classList.add("hidden");
    }
    
    actualizarEstadoInputYBoton();
    actualizarLabelDinamico();
  });
}

function generarTabInstanceId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getPlayerTabClaimKey(jugadorId) {
  return `playerTab_${jugadorId}`;
}

function reclamarTabActivo() {
  if (!miId || !tabInstanceId) return;
  localStorage.setItem(getPlayerTabClaimKey(miId), JSON.stringify({
    tabId: tabInstanceId,
    updatedAt: Date.now()
  }));
}

function limpiarReclamoTab() {
  if (!miId || !tabInstanceId) return;
  try {
    const stored = localStorage.getItem(getPlayerTabClaimKey(miId));
    if (!stored) return;
    const parsed = JSON.parse(stored);
    if (parsed.tabId === tabInstanceId) {
      localStorage.removeItem(getPlayerTabClaimKey(miId));
    }
  } catch {
    localStorage.removeItem(getPlayerTabClaimKey(miId));
  }
}

function estaSesionDuplicada() {
  if (!miId || !tabInstanceId) return false;
  const stored = localStorage.getItem(getPlayerTabClaimKey(miId));
  if (!stored) return false;
  try {
    const parsed = JSON.parse(stored);
    if (!parsed.tabId || parsed.tabId === tabInstanceId) return false;
    if (Date.now() - (parsed.updatedAt || 0) > TAB_CLAIM_EXPIRY_MS) return false;
    return true;
  } catch {
    return false;
  }
}

function intentarRestaurarSesionJugador() {
  if (!miId) return false;
  if (estaSesionDuplicada()) {
    console.warn("🛑 Sesión duplicada detectada, forzando nuevo registro de jugador:", miId);
    sessionStorage.removeItem("jugadorId");
    sessionStorage.removeItem("equipo");
    miId = null;
    return false;
  }
  reclamarTabActivo();
  return true;
}

function cambiarTurnoSiguienteJugador(equipo) {
  const jugadoresEquipo = Object.values(jugadoresGlobal).filter(j => 
    j.equipo === equipo && j.estado === "activo"
  );
  
  if (jugadoresEquipo.length === 0) return;
  
  if (!turno.jugadorId || !jugadoresEquipo.find(j => j.id === turno.jugadorId)) {
    update(ref(db, "estadoJuego"), {
      turno: { equipo: equipo, jugadorId: jugadoresEquipo[0].id }
    });
    return;
  }
  
  const indiceActual = jugadoresEquipo.findIndex(j => j.id === turno.jugadorId);
  const siguienteIndice = (indiceActual + 1) % jugadoresEquipo.length;
  
  update(ref(db, "estadoJuego"), {
    turno: { equipo: equipo, jugadorId: jugadoresEquipo[siguienteIndice].id }
  });
}

async function marcarErrorFirebase() {
  const miEquipo = jugadoresGlobal[miId]?.equipo;
  if (!miEquipo) return;
  
  const estadoRef = ref(db, "estadoJuego");
  const result = await runTransaction(estadoRef, (currentData) => {
    if (!currentData) return currentData;
    
    const currentErrores = currentData.errores?.[miEquipo] ?? 0;
    const newErrores = currentErrores + 1;
    
    let nuevoTurno = currentData.turno;
    if (newErrores >= 3) {
      // Cambiar turno al otro equipo
      const otroEquipo = miEquipo === 1 ? 2 : 1;
      nuevoTurno = { equipo: otroEquipo, jugadorId: null };
    }
    
    return {
      ...currentData,
      [`errores/${miEquipo}`]: newErrores,
      turno: nuevoTurno
    };
  });
  
  if (result.committed) {
    const actual = result.snapshot.val().errores[miEquipo];
    erroresPorEquipo[miEquipo] = actual;
    pintarErroresUI();
    cambiarTurnoSiguienteJugador(miEquipo);
    
    if (actual >= 3) {
      const updates = {};
      Object.entries(jugadoresGlobal).forEach(([id, jugador]) => {
        if (jugador.equipo === miEquipo && jugador.estado !== "expulsado") {
          updates[`jugadores/${id}/estado`] = "bloqueado";
        }
      });
      await update(ref(db), updates);
      
      const otroEquipo = miEquipo === 1 ? 2 : 1;
      if ((result.snapshot.val().errores?.[otroEquipo] ?? 0) < 3) {
        cambiarTurnoSiguienteJugador(otroEquipo);
      } else {
        await update(ref(db, "estadoJuego"), { fase: "final" });
      }
      
      if (jugadoresGlobal[miId]?.equipo === miEquipo) {
        blockedModal?.classList.remove("hidden");
        inputRespuesta.disabled = true;
        btnEnviar.disabled = true;
      }
      
      console.log(`🚫 Equipo ${miEquipo} bloqueado por 3 errores`);
    }
  }
}

function verificarRespuesta() {
  if (estadoJugador === "bloqueado") {
    alert("🚫 Estás bloqueado");
    return;
  }
  
  if (estadoJugador === "expulsado") {
    alert("❌ Estás expulsado");
    return;
  }
  
  if (miId && jugadoresGlobal[miId]?.ultimaRespuesta) {
    const tiempoTranscurrido = Date.now() - jugadoresGlobal[miId].ultimaRespuesta;
    if (tiempoTranscurrido < 1500) {
      alert("⏳ Espera un momento antes de enviar otra respuesta");
      return;
    }
  }
  
  if (cooldown) return;
  if (pausado) {
    alert("⏸️ Juego pausado");
    return;
  }
  
  if (faseActual !== "jugando") {
    alert("⏳ El juego no ha iniciado aún");
    return;
  }
  
  const miEquipo = jugadoresGlobal[miId]?.equipo;
  if (turno.equipo && turno.equipo !== miEquipo) {
    alert("⏳ No es el turno de tu equipo");
    return;
  }
  
  const texto = normalizar(inputRespuesta.value);
  if (!texto) {
    alert("✍️ Escribe una respuesta");
    return;
  }
  
  const ronda = rondas[rondaActual];
  let acerto = false;
  let respuestaAcertada = "";
  
  ronda.respuestas.forEach((resp, index) => {
    if (respuestasMostradas.includes(index) || acerto) return;
    if (respuestasReveladas[index]) return;
    resp.claves.forEach(clave => {
      if (texto.includes(normalizar(clave))) {
        acerto = true;
        respuestaAcertada = resp.texto;
        
        inputRespuesta.disabled = true;
        btnEnviar.disabled = true;
        
        const miEquipo = jugadoresGlobal[miId]?.equipo;
        if (!miEquipo) return;
        
        const estadoRef = ref(db, "estadoJuego");
        runTransaction(estadoRef, (currentData) => {
          if (!currentData) return currentData;
          
          if (currentData.respuestasReveladas && currentData.respuestasReveladas[index]) {
            return;
          }
          
          const nuevoScore = (currentData.scores?.[miEquipo] ?? 0) + resp.puntos;
          const nuevoGlobal = (currentData.scoresGlobal?.[miEquipo] ?? 0) + resp.puntos;
          
          return {
            ...currentData,
            [`respuestasReveladas/${index}`]: true,
            [`scores/${miEquipo}`]: nuevoScore,
            [`scoresGlobal/${miEquipo}`]: nuevoGlobal,
            turno: { equipo: miEquipo, jugadorId: null },
            [`jugadores/${miId}/ultimaRespuesta`]: Date.now()
          };
        }).then((result) => {
          if (result.committed) {
            const totalRespuestas = rondas[rondaActual]?.respuestas?.length ?? 0;
            const respuestasReveladasCount = Object.keys(respuestasReveladas).length + 1;
            
            if (respuestasReveladasCount >= totalRespuestas) {
              setTimeout(() => {
                const nuevaRonda = rondaActual + 1;
                if (nuevaRonda >= rondas.length) {
                  update(ref(db, "estadoJuego"), { fase: "final" });
                } else {
                  update(ref(db, "estadoJuego"), {
                    fase: "ronda",
                    rondaActual: nuevaRonda,
                    errores: { 1: 0, 2: 0 },
                    respuestasReveladas: {}
                  });
                }
              }, 2000);
            }
          } else {
            actualizarEstadoInputYBoton();
          }
        }).catch((error) => {
          console.error("Transaction failed: ", error);
          actualizarEstadoInputYBoton();
        });
      }
    });
  });
  
  inputRespuesta.value = "";
  
  if (!acerto) {
    marcarErrorFirebase();
    inputRespuesta.style.background = "#ffe0e0";
    setTimeout(() => {
      if (inputRespuesta) inputRespuesta.style.background = "";
    }, 500);
  } else {
    const miEquipo = jugadoresGlobal[miId]?.equipo;
    if (miEquipo) {
      update(ref(db, "estadoJuego"), {
        turno: { equipo: miEquipo, jugadorId: null }
      });
    }
    
    inputRespuesta.style.background = "#eaffea";
    setTimeout(() => {
      if (inputRespuesta) inputRespuesta.style.background = "";
    }, 500);
    console.log(`✅ Acierto: ${respuestaAcertada} - Turno permanece en ${jugadoresGlobal[miId]?.nombre}`);
  }
  
  cooldown = true;
  setTimeout(() => cooldown = false, 1500);
}

function mostrarGameOver() {
  if (inputRespuesta) inputRespuesta.disabled = true;
  if (btnEnviar) btnEnviar.disabled = true;
  
  const ganador = scoresGlobal[1] > scoresGlobal[2] ? 1 : (scoresGlobal[2] > scoresGlobal[1] ? 2 : 0);
  
  if (ganador === 0) {
    gameOverText.innerHTML = `🤝 ¡EMPATE! 🤝<br><span>Puntos: ${scoresGlobal[1]} - ${scoresGlobal[2]}</span>`;
  } else {
    const perdedor = ganador === 1 ? 2 : 1;
    gameOverText.innerHTML = `🏆 ¡GANADOR: EQUIPO ${ganador}! 🏆<br><span>Puntos: ${scoresGlobal[ganador]} - ${scoresGlobal[perdedor]}</span>`;
  }
  
  gameWrapper.classList.add("hidden");
  gameOverScreen.classList.remove("hidden");
  
  update(ref(db, "estadoJuego"), { fase: "final" });
  
  setTimeout(() => {
    finalizarJuego();
  }, 5000);
}

async function finalizarJuego() {
  try {
    const updates = {};
    Object.keys(jugadoresGlobal).forEach(id => {
      updates[`jugadores/${id}`] = null;
    });
    
    updates["estadoJuego"] = {
      rondaActual: 0,
      turno: { equipo: 1, jugadorId: null },
      pausado: false,
      respuestasReveladas: {},
      scores: { 1: 0, 2: 0 },
      scoresGlobal: { 1: 0, 2: 0 },
      errores: { 1: 0, 2: 0 },
      fase: "esperando",
      reset: Date.now()
    };
    
    await update(ref(db), updates);
    
    sessionStorage.removeItem("jugadorId");
    sessionStorage.removeItem("equipo");
    limpiarReclamoTab();
    gameOverScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
    
    console.log("✅ Juego finalizado y reseteado completamente");
  } catch (error) {
    console.error("❌ Error al finalizar juego:", error);
  }
}

/* ================= FIREBASE LISTENERS ================= */
let respuestasReveladas = {};

/* ================= EVENT LISTENERS ================= */
window.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 DOMContentLoaded - Iniciando script.js");
  
  // Inicializar elementos del DOM
  startScreen = document.getElementById("startScreen");
  playerScreen = document.getElementById("playerScreen");
  gameOverScreen = document.getElementById("gameOverScreen");
  blockedModal = document.getElementById("blockedModal");
  expulsadoModal = document.getElementById("expulsadoModal");
  rondaTransicionScreen = document.getElementById("rondaTransicionScreen");
  gameWrapper = document.querySelector(".game-wrapper");
  
  btnStart = document.getElementById("btnStart");
  btnJoin = document.getElementById("btnJoin");
  btnEnviar = document.getElementById("btnEnviar");
  btnNext = document.getElementById("btnNext");
  btnRegresarInicio = document.getElementById("btnRegresarInicio");
  currentTurnBadge = document.getElementById("currentTurnBadge");
  currentTurnPlayerName = document.getElementById("currentTurnPlayerName");
  
  inputRespuesta = document.getElementById("respuesta");
  turnoTxt = document.getElementById("turno");
  questionText = document.getElementById("questionText");
  globalScoreEl = document.getElementById("globalScore");
  inputLabel = document.getElementById("inputLabel");
  
  answers = document.querySelectorAll(".answer");
  errorsWrap = document.querySelector(".errors");
  score1 = document.getElementById("score1");
  score2 = document.getElementById("score2");
  gameOverText = document.getElementById("gameOverText");
  
  if (errorsWrap) {
    if (!errorXs || errorXs.length === 0) {
      errorsWrap.innerHTML = "<span>X</span><span>X</span><span>X</span>";
    }
    errorsWrap.querySelectorAll("span").forEach(s => {
      if (!s.textContent.trim()) s.textContent = "X";
    });
    errorXs = errorsWrap.querySelectorAll("span");
  }
  
  console.log("🔍 Elementos encontrados:", {
    startScreen: !!startScreen,
    playerScreen: !!playerScreen,
    btnStart: !!btnStart,
    btnJoin: !!btnJoin,
    currentTurnBadge: !!currentTurnBadge,
    answers: !!answers,
    answers_length: answers?.length ?? 0
  });
  
  onValue(ref(db, "jugadores"), (snapshot) => {
    jugadoresGlobal = snapshot.exists() ? snapshot.val() : {};
    actualizarTurnoConNombre();
    actualizarEstadoInputYBoton();
    actualizarLabelDinamico();
  });
  
  onValue(ref(db, "estadoJuego"), (snapshot) => {
    if (!snapshot.exists()) return;
    
    const e = snapshot.val();
    
    if (e.turno !== undefined) {
      if (typeof e.turno === 'object') {
        turno = e.turno;
      } else {
        turno = { equipo: e.turno, jugadorId: null };
      }
    }
    
    if (e.reset && e.reset !== ultimoReset) {
      ultimoReset = e.reset;
      rondaActual = e.rondaActual ?? 0;
      turno = e.turno ? (typeof e.turno === 'object' ? e.turno : { equipo: e.turno, jugadorId: null }) : { equipo: 1, jugadorId: null };
      pausado = !!e.pausado;
      scores = e.scores ?? { 1: 0, 2: 0 };
      scoresGlobal = e.scoresGlobal ?? { 1: 0, 2: 0 };
      erroresPorEquipo = e.errores ?? { 1: 0, 2: 0 };
      respuestasMostradas = [];
      if (answers && answers.length) {
        answers.forEach(a => a.classList.remove("revealed"));
      }
      iniciarRondaUI();
      return;
    }
    
    if (e.fase !== undefined) {
      faseActual = e.fase;
      console.log("📢 FASE ACTUALIZADA:", faseActual);
      
      // Forzar actualización inmediata del input
      actualizarEstadoInputYBoton();
      
      if (faseActual === "ronda") {
        gameWrapper.classList.add("hidden");
        rondaTransicionScreen.classList.remove("hidden");
        
        setTimeout(() => {
          rondaTransicionScreen.classList.add("hidden");
          gameWrapper.classList.remove("hidden");
        }, 3000);
      } else if (faseActual === "final") {
        mostrarGameOver();
      }
    }
    
    if (e.rondaActual !== undefined) rondaActual = e.rondaActual;
    if (e.pausado !== undefined) pausado = !!e.pausado;
    if (e.scores) scores = e.scores;
    if (e.scoresGlobal) {
      scoresGlobal = e.scoresGlobal;
      if (globalScoreEl) {
        globalScoreEl.textContent = `🌍 GLOBAL: ${scoresGlobal[1] ?? 0} - ${scoresGlobal[2] ?? 0}`;
      }
    }
    if (e.errores) erroresPorEquipo = e.errores;
    
    const miEquipo = jugadoresGlobal[miId]?.equipo;
    if (miEquipo && (e.errores?.[miEquipo] ?? 0) >= 3 && estadoJugador !== "expulsado") {
      blockedModal?.classList.remove("hidden");
      inputRespuesta.disabled = true;
      btnEnviar.disabled = true;
    }
    
    if (e.respuestasReveladas) {
      respuestasReveladas = e.respuestasReveladas;
      respuestasMostradas = [];
      if (answers && answers.length) {
        answers.forEach(a => a.classList.remove("revealed"));
        Object.keys(e.respuestasReveladas).forEach(i => {
          const idx = Number(i);
          if (!Number.isNaN(idx) && answers[idx]) {
            answers[idx].classList.add("revealed");
            respuestasMostradas.push(idx);
          }
        });
      }
    }
    
    questionText.textContent = rondas[rondaActual]?.pregunta ?? "";
    actualizarTurnoConNombre();
    actualizarScoresUI();
    pintarErroresUI();
    actualizarEstadoInputYBoton();
    actualizarLabelDinamico();
  });
  
  console.log("🔍 Elementos encontrados:", {
    startScreen: !!startScreen,
    playerScreen: !!playerScreen,
    btnStart: !!btnStart,
    btnJoin: !!btnJoin,
    currentTurnBadge: !!currentTurnBadge
  });
  
  tabInstanceId = generarTabInstanceId();
  setInterval(reclamarTabActivo, 5000);
  window.addEventListener("beforeunload", limpiarReclamoTab);
  
  /* Verificar si jugador ya está registrado */
  if (miId && intentarRestaurarSesionJugador()) {
    get(ref(db, "jugadores/" + miId)).then((snapshot) => {
      if (snapshot.exists()) {
        const jugador = snapshot.val();
        if (jugador.estado !== "expulsado") {
          startScreen.classList.add("hidden");
          playerScreen.classList.add("hidden");
          gameWrapper.classList.remove("hidden");
          configurarListenerEstadoJugador();
          iniciarRondaUI();
          console.log("🔄 Jugador existente detectado, mostrando pantalla de juego");
        } else {
          sessionStorage.removeItem("jugadorId");
          sessionStorage.removeItem("equipo");
          limpiarReclamoTab();
          miId = null;
        }
      } else {
        sessionStorage.removeItem("jugadorId");
        sessionStorage.removeItem("equipo");
        limpiarReclamoTab();
        miId = null;
      }
    }).catch(() => {
      sessionStorage.removeItem("jugadorId");
      sessionStorage.removeItem("equipo");
      limpiarReclamoTab();
      miId = null;
    });
  }
  
  /* Botón Start */
  btnStart?.addEventListener("click", () => {
    console.log("🎮 btnStart presionado - Cambiando a pantalla de registro");
    startScreen.classList.add("hidden");
    playerScreen.classList.remove("hidden");
  });
  
  /* Botón Join */
  btnJoin?.addEventListener("click", async () => {
    const nombre = document.getElementById("playerName").value.trim();
    const equipo = Number(document.getElementById("playerTeam").value);
    
    if (!nombre) return alert("✍️ Escribe tu nombre");
    
    const snapshot = await get(ref(db, "jugadores"));
    const jugadores = snapshot.val() || {};
    const jugadoresActivos = Object.values(jugadores).filter(j => j.estado !== "expulsado");
    
    const equipo1Count = jugadoresActivos.filter(j => j.equipo === 1).length;
    const equipo2Count = jugadoresActivos.filter(j => j.equipo === 2).length;
    
    if (equipo === 1 && equipo1Count >= 3) {
      alert("🚫 Equipo 1 está lleno (máximo 3 jugadores). Elige el Equipo 2.");
      return;
    }
    
    if (equipo === 2 && equipo2Count >= 3) {
      alert("🚫 Equipo 2 está lleno (máximo 3 jugadores). Elige el Equipo 1.");
      return;
    }
    
    const jugadorId = window.registrarJugadorFirebase({ nombre, equipo, fecha: Date.now() });
    miId = jugadorId;
    sessionStorage.setItem("jugadorId", jugadorId);
    sessionStorage.setItem("equipo", equipo);
    reclamarTabActivo();
    
    configurarListenerEstadoJugador();
    
    playerScreen.classList.add("hidden");
    gameWrapper.classList.remove("hidden");
    iniciarRondaUI();
  });
  
  /* Botón Next */
  btnNext?.addEventListener("click", () => {
    gameOverScreen.classList.add("hidden");
    gameWrapper.classList.remove("hidden");
    iniciarRondaUI();
  });
  
  /* Botón Regresar Inicio */
  btnRegresarInicio?.addEventListener("click", async () => {
    try {
      if (window.estadoJugadorListener) {
        window.estadoJugadorListener();
        window.estadoJugadorListener = null;
      }
      
      if (miId) {
        const jugadorRef = ref(db, "jugadores/" + miId);
        await set(jugadorRef, null);
        console.log(`🗑️ Jugador ${miId} eliminado de la base de datos`);
      }
      
      expulsadoModal?.classList.add("hidden");
      gameWrapper?.classList.add("hidden");
      startScreen?.classList.remove("hidden");
      
      sessionStorage.removeItem("jugadorId");
      sessionStorage.removeItem("equipo");
      limpiarReclamoTab();
      
      miId = null;
      estadoJugador = "activo";
      turno = { equipo: 1, jugadorId: null };
      faseActual = "esperando";
      
      if (inputRespuesta) {
        inputRespuesta.value = "";
        inputRespuesta.disabled = false;
      }
      
      console.log("✅ Jugador regresó al inicio después de expulsión");
    } catch (error) {
      console.error("❌ Error al regresar al inicio:", error);
    }
  });
  
  /* Botón Enviar */
  btnEnviar?.addEventListener("click", verificarRespuesta);
  inputRespuesta?.addEventListener("keydown", e => {
    if (e.key === "Enter") verificarRespuesta();
  });
  
  /* Inicializar estado del juego */
  get(ref(db, "estadoJuego")).then((snap) => {
    if (snap.exists()) return;
    
    set(ref(db, "estadoJuego"), {
      rondaActual: 0,
      turno: { equipo: null, jugadorId: null },
      pausado: false,
      respuestasReveladas: {},
      scores: { 1: 0, 2: 0 },
      scoresGlobal: { 1: 0, 2: 0 },
      errores: { 1: 0, 2: 0 },
      fase: "esperando",
      reset: Date.now()
    });
  });
});