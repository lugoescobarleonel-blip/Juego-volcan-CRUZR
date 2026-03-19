/* ================= script.js ================= */
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

/* registrar jugador (si lo usas) */
window.registrarJugadorFirebase = function (jugador) {
  const jugadorRef = push(ref(db, "jugadores"));
  const jugadorId = jugadorRef.key;
  
  set(jugadorRef, {
    ...jugador,
    estado: "activo",
    id: jugadorId
  });
  
  localStorage.setItem("jugadorId", jugadorId);
};

window.addEventListener("DOMContentLoaded", () => {
  /* ================= ESTADO LOCAL ================= */
  let rondaActual = 0;
  let turno = 1;
  let pausado = false;

  let scores = { 1: 0, 2: 0 };
  let erroresPorEquipo = { 1: 0, 2: 0 };

  let respuestasMostradas = [];
  let ultimoReset = null;
  
  /* ===== MEJORAS PRO ===== */
  let estadoJugador = "activo";
  let cooldown = false;

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
  const gameWrapper = document.querySelector(".game-wrapper");

  const btnStart = document.getElementById("btnStart");
  const btnJoin = document.getElementById("btnJoin");
  const btnEnviar = document.getElementById("btnEnviar");
  const btnNext = document.getElementById("btnNext");

  const inputRespuesta = document.getElementById("respuesta");
  const turnoTxt = document.getElementById("turno");
  const questionText = document.getElementById("questionText");

  const answers = document.querySelectorAll(".answer");
  const errorsWrap = document.querySelector(".errors");
  let errorXs = errorsWrap ? errorsWrap.querySelectorAll("span") : [];

  const score1 = document.getElementById("score1");
  const score2 = document.getElementById("score2");
  const gameOverText = document.getElementById("gameOverText");

  const miId = localStorage.getItem("jugadorId");

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
  }

  function pintarErroresUI() {
    if (!errorXs || errorXs.length === 0) return;
    const e = erroresPorEquipo[turno] ?? 0;
    errorXs.forEach(x => x.classList.remove("active"));
    for (let i = 0; i < Math.min(e, 3); i++) {
      errorXs[i].classList.add("active");
    }
  }

  function iniciarRondaUI() {
    respuestasMostradas = [];
    inputRespuesta.value = "";
    inputRespuesta.disabled = pausado;

    answers.forEach((a, index) => {
      a.classList.remove("revealed");
      const resp = rondas[rondaActual]?.respuestas?.[index];
      if (resp) a.setAttribute("data-text", `${resp.texto} (${resp.puntos})`);
    });

    questionText.textContent = rondas[rondaActual]?.pregunta ?? "";
    turnoTxt.textContent = `TURNO DEL EQUIPO ${turno}`;
    actualizarScoresUI();
    pintarErroresUI();
  }

  /* ================= ESCUCHAR ESTADO DEL JUGADOR ================= */
  if (miId) {
    onValue(ref(db, "jugadores/" + miId), (snap) => {
      if (!snap.exists()) return;

      const data = snap.val();
      estadoJugador = data.estado || "activo";
      
      // Si está expulsado o bloqueado, deshabilitar input
      if (estadoJugador === "bloqueado" || estadoJugador === "expulsado") {
        inputRespuesta.disabled = true;
        inputRespuesta.placeholder = estadoJugador === "bloqueado" ? "🚫 Bloqueado" : "❌ Expulsado";
      } else {
        inputRespuesta.disabled = pausado;
        inputRespuesta.placeholder = "Escribe tu respuesta...";
      }
    });
  }

  /* ================= START / REGISTRO ================= */
  btnStart?.addEventListener("click", () => {
    startScreen.classList.add("hidden");
    playerScreen.classList.remove("hidden");
  });

  btnJoin?.addEventListener("click", () => {
    const nombre = document.getElementById("playerName").value.trim();
    const equipo = Number(document.getElementById("playerTeam").value);
    if (!nombre) return alert("Escribe tu nombre");

    window.registrarJugadorFirebase?.({ nombre, equipo, fecha: Date.now() });

    playerScreen.classList.add("hidden");
    gameWrapper.classList.remove("hidden");
    iniciarRondaUI();
  });

  /* ================= GAME OVER ================= */
  function mostrarGameOver() {
    inputRespuesta.disabled = true;
    gameOverText.textContent = `EL EQUIPO ${turno} PERDIÓ`;
    gameWrapper.classList.add("hidden");
    gameOverScreen.classList.remove("hidden");
  }

  btnNext?.addEventListener("click", () => {
    gameOverScreen.classList.add("hidden");
    gameWrapper.classList.remove("hidden");
    iniciarRondaUI();
  });

  /* ================= RESPUESTA ================= */
  async function marcarErrorFirebase() {
    const actual = (erroresPorEquipo[turno] ?? 0) + 1;
    erroresPorEquipo[turno] = actual;

    await update(ref(db, "estadoJuego"), {
      [`errores/${turno}`]: actual
    });

    pintarErroresUI();
    if (actual >= 3) mostrarGameOver();
  }

  function verificarRespuesta() {
    // MEJORA: Verificar estado del jugador
    if (estadoJugador === "bloqueado") {
      alert("Estás bloqueado 🚫");
      return;
    }

    if (estadoJugador === "expulsado") {
      alert("Estás expulsado ❌");
      return;
    }
    
    // MEJORA: Anti-spam
    if (cooldown) return;
    
    // ✅ FIX: Quitamos sincronizando, solo verificamos pausado
    if (pausado) return;

    // ✅ MEJORA: Validar que sea el turno correcto (opcional)
    if (miId && typeof turno === "object" && turno.jugadorId && turno.jugadorId !== miId) {
      alert("No es tu turno 😤");
      return;
    }

    const texto = normalizar(inputRespuesta.value);
    if (!texto) return;

    const ronda = rondas[rondaActual];
    let acerto = false;

    ronda.respuestas.forEach((resp, index) => {
      if (respuestasMostradas.includes(index) || acerto) return;
      resp.claves.forEach(clave => {
        if (texto.includes(normalizar(clave))) {
          acerto = true;
          update(ref(db, "estadoJuego"), {
            [`respuestasReveladas/${index}`]: true,
            [`scores/${turno}`]: (scores[turno] ?? 0) + resp.puntos
          });
        }
      });
    });

    inputRespuesta.value = "";
    if (!acerto) marcarErrorFirebase();
    
    // MEJORA: Activar cooldown
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

    // ✅ FIX 1: Manejar turno correctamente (objeto o número)
    if (e.turno !== undefined) {
      turno = extraerTurnoNumero(e.turno);
    }

    if (e.reset && e.reset !== ultimoReset) {
      ultimoReset = e.reset;
      rondaActual = e.rondaActual ?? 0;
      
      // ✅ FIX 2: También en el reset
      turno = extraerTurnoNumero(e.turno ?? 1);
      
      pausado = !!e.pausado;
      scores = e.scores ?? { 1: 0, 2: 0 };
      erroresPorEquipo = e.errores ?? { 1: 0, 2: 0 };
      
      // Reiniciar respuestas reveladas
      respuestasMostradas = [];
      answers.forEach(a => a.classList.remove("revealed"));
      
      iniciarRondaUI();
      return;
    }

    // Actualizar otros valores
    if (e.rondaActual !== undefined) rondaActual = e.rondaActual;
    if (e.pausado !== undefined) pausado = !!e.pausado;
    if (e.scores) scores = e.scores;
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
    turnoTxt.textContent = `TURNO DEL EQUIPO ${turno}`;
    inputRespuesta.disabled = pausado || estadoJugador === "bloqueado" || estadoJugador === "expulsado";
    actualizarScoresUI();
    pintarErroresUI();
  });

  /* ================= BOOTSTRAP (MEJORADO con get) ================= */
  get(ref(db, "estadoJuego")).then((snap) => {
    if (snap.exists()) return;

    set(ref(db, "estadoJuego"), {
      rondaActual: 0,
      turno: 1,  // ✅ Guardamos como número, no objeto
      pausado: false,
      respuestasReveladas: {},
      scores: { 1: 0, 2: 0 },
      errores: { 1: 0, 2: 0 },
      reset: Date.now()
    });
  });
});