/* ================= script.js VERSIÓN PRO ACTUALIZADA ================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  update,
  push,
  set,
  get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/* ================= FIREBASE ================= */
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

/* registrar jugador */
window.registrarJugadorFirebase = function (jugador) {
  const jugadorRef = push(ref(db, "jugadores"));
  const jugadorId = jugadorRef.key;
  
  set(jugadorRef, {
    ...jugador,
    estado: "activo",
    id: jugadorId
  });
  
  localStorage.setItem("jugadorId", jugadorId);
  return jugadorId;
};

window.addEventListener("DOMContentLoaded", () => {
  /* ================= ESTADO LOCAL ================= */
  let rondaActual = 0;
  let turno = { equipo: 1, jugadorId: null };
  let pausado = false;

  let scores = { 1: 0, 2: 0 };
  let scoresGlobal = { 1: 0, 2: 0 };
  let erroresPorEquipo = { 1: 0, 2: 0 };

  let respuestasMostradas = [];
  let ultimoReset = null;
  
  let estadoJugador = "activo";
  let cooldown = false;
  let miId = localStorage.getItem("jugadorId");
  
  /* ===== VARIABLE PARA JUGADORES GLOBAL ===== */
  let jugadoresGlobal = {};

  /* ================= RONDAS ================= */
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

  /* ================= ELEMENTOS ================= */
  const startScreen = document.getElementById("startScreen");
  const playerScreen = document.getElementById("playerScreen");
  const gameOverScreen = document.getElementById("gameOverScreen");
  const blockedModal = document.getElementById("blockedModal");
  const expulsadoModal = document.getElementById("expulsadoModal");
  const gameWrapper = document.querySelector(".game-wrapper");

  const btnStart = document.getElementById("btnStart");
  const btnJoin = document.getElementById("btnJoin");
  const btnEnviar = document.getElementById("btnEnviar");
  const btnNext = document.getElementById("btnNext");

  const inputRespuesta = document.getElementById("respuesta");
  const turnoTxt = document.getElementById("turno");
  const questionText = document.getElementById("questionText");
  const globalScoreEl = document.getElementById("globalScore");
  const inputLabel = document.getElementById("inputLabel");

  const answers = document.querySelectorAll(".answer");
  const errorsWrap = document.querySelector(".errors");
  let errorXs = errorsWrap ? errorsWrap.querySelectorAll("span") : [];

  const score1 = document.getElementById("score1");
  const score2 = document.getElementById("score2");
  const gameOverText = document.getElementById("gameOverText");

  /* ===== FIX: asegurar X ===== */
  if (errorsWrap) {
    if (errorXs.length === 0) {
      errorsWrap.innerHTML = "<span>X</span><span>X</span><span>X</span>";
    }
    errorsWrap.querySelectorAll("span").forEach(s => {
      if (!s.textContent.trim()) s.textContent = "X";
    });
    errorXs = errorsWrap.querySelectorAll("span");
  }

  /* ================= UTIL ================= */
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

  function actualizarScoresUI() {
    score1.textContent = scores[1] ?? 0;
    score2.textContent = scores[2] ?? 0;
    if (globalScoreEl) {
      globalScoreEl.textContent = `🌍 GLOBAL: ${scoresGlobal[1] ?? 0} - ${scoresGlobal[2] ?? 0}`;
    }
  }

  function pintarErroresUI() {
    if (!errorXs || errorXs.length === 0) return;
    const e = erroresPorEquipo[turno.equipo] ?? 0;
    errorXs.forEach(x => x.classList.remove("active"));
    for (let i = 0; i < Math.min(e, 3); i++) {
      errorXs[i].classList.add("active");
    }
  }

  /* ===== NUEVA FUNCIÓN: ACTUALIZAR TURNO CON NOMBRE DEL JUGADOR ===== */
  function actualizarTurnoConNombre() {
    if (!turnoTxt) return;
    
    if (turno.jugadorId && jugadoresGlobal && jugadoresGlobal[turno.jugadorId]) {
      const jugador = jugadoresGlobal[turno.jugadorId];
      turnoTxt.innerHTML = `🎯 TURNO DE: ${jugador.nombre}<br><span style="font-size: 10px; color: #ffcc00;">(EQUIPO ${turno.equipo})</span>`;
      
      // Actualizar placeholder del input si es su turno
      if (inputRespuesta && jugador.id === miId && estadoJugador !== "bloqueado" && estadoJugador !== "expulsado" && !pausado) {
        inputRespuesta.placeholder = `✍️ ${jugador.nombre}, escribe tu respuesta...`;
      } else if (inputRespuesta && jugador.id === miId) {
        inputRespuesta.placeholder = "⏳ Espera tu turno...";
      }
    } else {
      turnoTxt.innerHTML = `🎮 TURNO DEL EQUIPO ${turno.equipo}`;
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
    } else if (turno.jugadorId === miId && !pausado) {
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
    
    // Remover clases previas
    inputRespuesta.classList.remove("turno-activo", "no-turno", "bloqueado");
    
    // Verificar estado del jugador
    const estaInhabilitado = estadoJugador === "bloqueado" || estadoJugador === "expulsado";
    
    if (estaInhabilitado) {
      inputRespuesta.disabled = true;
      inputRespuesta.classList.add("bloqueado");
      inputRespuesta.placeholder = estadoJugador === "bloqueado" ? "🚫 Bloqueado" : "❌ Expulsado";
      if (btnEnviar) btnEnviar.disabled = true;
      return;
    }
    
    // Verificar si es su turno
    const esMiTurno = turno.jugadorId === miId;
    
    if (esMiTurno && !pausado) {
      inputRespuesta.disabled = false;
      inputRespuesta.classList.add("turno-activo");
      const jugador = jugadoresGlobal[miId];
      if (jugador) {
        inputRespuesta.placeholder = `✍️ ${jugador.nombre}, escribe tu respuesta...`;
      } else {
        inputRespuesta.placeholder = "✍️ Escribe tu respuesta...";
      }
      if (btnEnviar) btnEnviar.disabled = false;
    } else {
      inputRespuesta.disabled = true;
      inputRespuesta.classList.add("no-turno");
      if (turno.jugadorId && jugadoresGlobal[turno.jugadorId]) {
        inputRespuesta.placeholder = `⏳ Turno de ${jugadoresGlobal[turno.jugadorId].nombre}`;
      } else {
        inputRespuesta.placeholder = "⏳ Espera tu turno";
      }
      if (btnEnviar) btnEnviar.disabled = true;
    }
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

  function mostrarGameOver() {
    if (inputRespuesta) inputRespuesta.disabled = true;
    if (btnEnviar) btnEnviar.disabled = true;
    
    // Calcular ganador basado en scores globales
    const ganador = scoresGlobal[1] > scoresGlobal[2] ? 1 : 2;
    const perdedor = ganador === 1 ? 2 : 1;
    
    gameOverText.innerHTML = `🏆 ¡GANADOR: EQUIPO ${ganador}! 🏆<br><span>Puntos: ${scoresGlobal[ganador]} - ${scoresGlobal[perdedor]}</span>`;
    
    gameWrapper.classList.add("hidden");
    gameOverScreen.classList.remove("hidden");
  }

  /* ================= ESCUCHAR JUGADORES GLOBAL ================= */
  onValue(ref(db, "jugadores"), (snapshot) => {
    if (snapshot.exists()) {
      jugadoresGlobal = snapshot.val();
    } else {
      jugadoresGlobal = {};
    }
    actualizarTurnoConNombre();
    actualizarEstadoInputYBoton();
    actualizarLabelDinamico();
  });

  /* ================= ESCUCHAR ESTADO DEL JUGADOR ================= */
  if (miId) {
    onValue(ref(db, "jugadores/" + miId), (snap) => {
      if (!snap.exists()) return;

      const data = snap.val();
      estadoJugador = data.estado || "activo";
      
      // Guardar equipo del jugador
      if (data.equipo) {
        localStorage.setItem("equipo", data.equipo);
      }
      
      // Mostrar modales según estado
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

  /* ================= START / REGISTRO CON LÍMITE ================= */
  btnStart?.addEventListener("click", () => {
    startScreen.classList.add("hidden");
    playerScreen.classList.remove("hidden");
  });

  btnJoin?.addEventListener("click", async () => {
    const nombre = document.getElementById("playerName").value.trim();
    const equipo = Number(document.getElementById("playerTeam").value);
    
    if (!nombre) return alert("✍️ Escribe tu nombre");
    
    // Límite de 5 jugadores
    const snapshot = await get(ref(db, "jugadores"));
    const jugadores = snapshot.val() || {};
    const jugadoresActivos = Object.values(jugadores).filter(j => j.estado !== "expulsado");
    
    if (jugadoresActivos.length >= 5) {
      alert("🚫 Máximo 5 jugadores permitidos");
      return;
    }

    const jugadorId = window.registrarJugadorFirebase({ nombre, equipo, fecha: Date.now() });
    miId = jugadorId;
    localStorage.setItem("jugadorId", jugadorId);
    localStorage.setItem("equipo", equipo);

    playerScreen.classList.add("hidden");
    gameWrapper.classList.remove("hidden");
    iniciarRondaUI();
  });

  /* ================= GAME OVER ================= */
  btnNext?.addEventListener("click", () => {
    gameOverScreen.classList.add("hidden");
    gameWrapper.classList.remove("hidden");
    iniciarRondaUI();
  });

  /* ================= RESPUESTA ================= */
  async function marcarErrorFirebase() {
    const actual = (erroresPorEquipo[turno.equipo] ?? 0) + 1;
    erroresPorEquipo[turno.equipo] = actual;

    await update(ref(db, "estadoJuego"), {
      [`errores/${turno.equipo}`]: actual
    });

    pintarErroresUI();
    if (actual >= 3) mostrarGameOver();
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
    
    if (cooldown) return;
    if (pausado) {
      alert("⏸️ Juego pausado");
      return;
    }

    // Verificar que sea su turno específico
    if (turno.jugadorId !== miId) {
      const jugadorActivo = jugadoresGlobal[turno.jugadorId];
      if (jugadorActivo) {
        alert(`⏳ No es tu turno. Está participando: ${jugadorActivo.nombre}`);
      } else {
        alert("⏳ No es tu turno");
      }
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
      resp.claves.forEach(clave => {
        if (texto.includes(normalizar(clave))) {
          acerto = true;
          respuestaAcertada = resp.texto;
          
          // Actualizar scores y scoresGlobal
          const nuevoScore = (scores[turno.equipo] ?? 0) + resp.puntos;
          const nuevoGlobal = (scoresGlobal[turno.equipo] ?? 0) + resp.puntos;
          
          update(ref(db, "estadoJuego"), {
            [`respuestasReveladas/${index}`]: true,
            [`scores/${turno.equipo}`]: nuevoScore,
            [`scoresGlobal/${turno.equipo}`]: nuevoGlobal
          });
        }
      });
    });

    inputRespuesta.value = "";
    
    if (!acerto) {
      marcarErrorFirebase();
      // Feedback visual de error
      inputRespuesta.style.background = "#ffe0e0";
      setTimeout(() => {
        if (inputRespuesta) inputRespuesta.style.background = "";
      }, 500);
    } else {
      // Feedback visual de acierto
      inputRespuesta.style.background = "#eaffea";
      setTimeout(() => {
        if (inputRespuesta) inputRespuesta.style.background = "";
      }, 500);
      console.log(`✅ Acierto: ${respuestaAcertada}`);
    }
    
    cooldown = true;
    setTimeout(() => cooldown = false, 1500);
  }

  btnEnviar?.addEventListener("click", verificarRespuesta);
  inputRespuesta?.addEventListener("keydown", e => {
    if (e.key === "Enter") verificarRespuesta();
  });

  /* ================= SYNC DESDE PRESENTADOR ================= */
  onValue(ref(db, "estadoJuego"), (snapshot) => {
    if (!snapshot.exists()) return;

    const e = snapshot.val();

    // Manejar turno correctamente (objeto o número)
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
      answers.forEach(a => a.classList.remove("revealed"));
      
      iniciarRondaUI();
      return;
    }

    // Actualizar otros valores
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

    // Actualizar respuestas reveladas
    if (e.respuestasReveladas) {
      respuestasMostradas = [];
      answers.forEach(a => a.classList.remove("revealed"));
      Object.keys(e.respuestasReveladas).forEach(i => {
        const idx = Number(i);
        if (!Number.isNaN(idx) && answers[idx]) {
          answers[idx].classList.add("revealed");
          respuestasMostradas.push(idx);
        }
      });
    }

    questionText.textContent = rondas[rondaActual]?.pregunta ?? "";
    actualizarTurnoConNombre();
    actualizarScoresUI();
    pintarErroresUI();
    actualizarEstadoInputYBoton();
    actualizarLabelDinamico();
  });

  /* ================= BOOTSTRAP ================= */
  get(ref(db, "estadoJuego")).then((snap) => {
    if (snap.exists()) return;

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
  });
});