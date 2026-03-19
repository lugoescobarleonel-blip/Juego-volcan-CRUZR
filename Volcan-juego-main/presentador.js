import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  update,
  set,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

console.log("✅ presentador.js cargado correctamente");

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

/* ===== RONDAS (IGUAL QUE EL JUEGO) ===== */
const rondas = [
  {
    pregunta: "¿Qué debes hacer ANTES de una erupción volcánica?",
    respuestas: [
      { texto: "Conocer rutas de evacuación", puntos: 50 },
      { texto: "Preparar mochila de emergencia", puntos: 35 },
      { texto: "Mantenerse informado", puntos: 25 },
      { texto: "Proteger documentos importantes", puntos: 15 },
      { texto: "Identificar refugios", puntos: 5 }
    ]
  },
  {
    pregunta: "¿Qué hacer DURANTE una erupción volcánica?",
    respuestas: [
      { texto: "Evacuar inmediatamente", puntos: 50 },
      { texto: "Cubrir nariz y boca", puntos: 35 },
      { texto: "Seguir instrucciones oficiales", puntos: 25 },
      { texto: "Alejarse del volcán", puntos: 15 },
      { texto: "Buscar refugio seguro", puntos: 5 }
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

/* ===== HTML ===== */
const btnNuevaRonda = document.getElementById("btnNuevaRonda");
const btnCambiarTurno = document.getElementById("btnCambiarTurno");
const btnResetRespuestas = document.getElementById("btnResetRespuestas");
const btnResetScores = document.getElementById("btnResetScores");
const btnPausarJuego = document.getElementById("btnPausarJuego");
const btnReanudarJuego = document.getElementById("btnReanudarJuego");
const btnReiniciarTodo = document.getElementById("btnReiniciarTodo");

const selectRonda = document.getElementById("selectRonda");
const btnCargarRonda = document.getElementById("btnCargarRonda");

const preguntaEl = document.getElementById("pregunta");
const respuestasEl = document.getElementById("respuestas");

/* Panel estado */
const turnoActualBox = document.getElementById("turnoActual"); // contiene .estado-valor
const scoresBox = document.getElementById("scores");
const erroresBox = document.getElementById("errores");
const contenedorJugadores = document.getElementById("jugadoresConectados");

/* ===== FUNCIÓN DE RENDERIZADO DE JUGADORES ===== */
function renderJugadores(jugadores) {
  if (!jugadores || Object.keys(jugadores).length === 0) {
    contenedorJugadores.innerHTML = '<div class="sin-jugadores">👾 NO HAY JUGADORES CONECTADOS 👾</div>';
    return;
  }

  contenedorJugadores.innerHTML = "";

  Object.entries(jugadores).forEach(([id, jugador]) => {
    const div = document.createElement("div");
    div.classList.add("jugador-item");

    // Color por equipo
    if (jugador.equipo === 1) {
      div.classList.add("equipo1");
    } else {
      div.classList.add("equipo2");
    }

    // Resaltar si es el jugador del turno actual
    if (turnoActual.jugadorId === id) {
      div.classList.add("turno-activo");
    }

    // Verificar si el jugador está deshabilitado
    const deshabilitado = jugador.estado === "bloqueado" || jugador.estado === "expulsado";

    div.innerHTML = `
      <div class="jugador-header">
        <strong>${jugador.nombre}</strong>
        <span class="jugador-equipo">EQ${jugador.equipo}</span>
      </div>
      <div class="jugador-estado">
        <span class="estado-indicador estado-${jugador.estado || 'activo'}"></span>
        <span class="estado-texto">${jugador.estado || 'activo'}</span>
      </div>
      <div class="jugador-acciones">
        <button class="btn-seleccionar" ${deshabilitado ? "disabled" : ""} onclick="seleccionarJugador('${id}', ${jugador.equipo})">
          <span class="btn-icono">🎯</span>
          <span class="btn-texto">SELECCIONAR</span>
        </button>
        <button class="btn-bloquear" onclick="bloquearJugador('${id}')">
          <span class="btn-icono">🚫</span>
          <span class="btn-texto">BLOQUEAR</span>
        </button>
        <button class="btn-expulsar" onclick="expulsarJugador('${id}')">
          <span class="btn-icono">❌</span>
          <span class="btn-texto">EXPULSAR</span>
        </button>
      </div>
    `;

    contenedorJugadores.appendChild(div);
  });
}

/* ===== RENDER RONDA ===== */
function renderRonda() {
  preguntaEl.textContent = rondas[rondaActual].pregunta;
  respuestasEl.innerHTML = "";

  rondas[rondaActual].respuestas.forEach((resp, index) => {
    const div = document.createElement("div");
    div.className = "respuesta";
    div.textContent = `${resp.texto} (${resp.puntos})`;

    // click -> revelar en el juego
    div.addEventListener("click", () => {
      update(ref(db, "estadoJuego/respuestasReveladas"), { [index]: true });
    });

    respuestasEl.appendChild(div);
  });
}

/* ===== PINTAR ESTADO EN UI ===== */
function pintarTurnoUI(turno) {
  const valor = turnoActualBox?.querySelector(".estado-valor");
  if (valor) {
    const equipo = turno?.equipo ?? turno ?? 1;
    const jugadorId = turno?.jugadorId;
    
    // 🟡 MICRO DETALLE VISUAL: Mostrar jugador activo si existe
    if (jugadorId && jugadoresGlobal[jugadorId]) {
      const nombreJugador = jugadoresGlobal[jugadorId].nombre;
      valor.textContent = `EQ${equipo} - ${nombreJugador}`;
    } else {
      valor.textContent = `EQUIPO ${equipo}`;
    }
  }
}

function pintarScoresUI(sc) {
  if (!scoresBox) return;
  const s1 = sc?.[1] ?? sc?.["1"] ?? 0;
  const s2 = sc?.[2] ?? sc?.["2"] ?? 0;
  scoresBox.innerHTML = `Equipo 1: ${s1}<br>Equipo 2: ${s2}`;
}

function pintarErroresUI(err) {
  if (!erroresBox) return;
  const e1 = err?.[1] ?? err?.["1"] ?? 0;
  const e2 = err?.[2] ?? err?.["2"] ?? 0;
  erroresBox.innerHTML = `Equipo 1: ${e1}/3<br>Equipo 2: ${e2}/3`;
}

/* ===== INIT estadoJuego si no existe ===== */
onValue(ref(db, "estadoJuego"), (snap) => {
  if (!snap.exists()) {
    // 🔥 CORREGIDO: Agregamos errores al estado inicial
    set(ref(db, "estadoJuego"), {
      rondaActual: 0,
      turno: {
        equipo: 1,
        jugadorId: null
      },
      pausado: false,
      respuestasReveladas: {},
      scores: { 1: 0, 2: 0 },
      errores: { 1: 0, 2: 0 }, // 🔥 AGREGADO
      reset: Date.now()
    });
    return;
  }

  const e = snap.val();
  rondaActual = e.rondaActual ?? 0;
  
  // Manejar tanto el formato antiguo como el nuevo
  if (typeof e.turno === 'object') {
    turnoActual = e.turno;
  } else {
    turnoActual = {
      equipo: e.turno ?? 1,
      jugadorId: null
    };
  }

  // actualizar select
  if (selectRonda) selectRonda.value = String(rondaActual);

  // pintar UI
  pintarTurnoUI(turnoActual);
  pintarScoresUI(e.scores);
  pintarErroresUI(e.errores); // Ahora sí existe errores

  // render ronda
  renderRonda();
  
  // 🔥 Re-renderizar jugadores con el nuevo turnoActual
  renderJugadores(jugadoresGlobal);
});

/* ===== JUGADORES EN TIEMPO REAL ===== */
const jugadoresRef = ref(db, "jugadores");

onValue(jugadoresRef, (snapshot) => {
  if (!snapshot.exists()) {
    jugadoresGlobal = {};
    contenedorJugadores.innerHTML = '<div class="sin-jugadores">👾 NO HAY JUGADORES CONECTADOS 👾</div>';
    return;
  }

  jugadoresGlobal = snapshot.val();
  renderJugadores(jugadoresGlobal);
  
  // También actualizar el turno UI por si cambió el nombre del jugador activo
  pintarTurnoUI(turnoActual);
});

/* ===== FUNCIONES DE CONTROL DE JUGADORES ===== */
window.bloquearJugador = function (id) {
  update(ref(db, "jugadores/" + id), {
    estado: "bloqueado"
  });
};

window.expulsarJugador = function (id) {
  update(ref(db, "jugadores/" + id), {
    estado: "expulsado"
  });
};

/* ===== FUNCIÓN PARA SELECCIONAR JUGADOR (CON SEGURIDAD) ===== */
window.seleccionarJugador = function (id, equipo) {
  const jugador = jugadoresGlobal[id];

  // 🟡 SEGURIDAD: Verificar que el jugador existe y no está bloqueado/expulsado
  if (!jugador) {
    alert("❌ Jugador no encontrado");
    return;
  }

  if (jugador.estado === "bloqueado") {
    alert("🚫 No puedes seleccionar un jugador bloqueado");
    return;
  }

  if (jugador.estado === "expulsado") {
    alert("❌ No puedes seleccionar un jugador expulsado");
    return;
  }

  // Verificar que el equipo coincide (por si acaso)
  if (jugador.equipo !== equipo) {
    console.warn("⚠️ El equipo no coincide, corrigiendo...");
    equipo = jugador.equipo;
  }

  turnoActual = {
    equipo: equipo,
    jugadorId: id
  };

  // 💡 MEJORA: Actualizar solo la ruta específica
  update(ref(db, "estadoJuego/turno"), turnoActual);
  
  // Feedback visual opcional
  console.log(`✅ Jugador ${jugador.nombre} seleccionado para el turno`);
};

/* ===== BOTONES ===== */
btnCargarRonda?.addEventListener("click", () => {
  rondaActual = Number(selectRonda?.value || 0);
  renderRonda();

  // 🔥 CORREGIDO: Al cargar ronda, reiniciamos respuestas Y ERRORES
  update(ref(db, "estadoJuego"), {
    rondaActual,
    respuestasReveladas: {},
    errores: { 1: 0, 2: 0 }, // 🔥 AGREGADO - CRÍTICO
    reset: Date.now()
  });
});

btnNuevaRonda?.addEventListener("click", () => {
  rondaActual = (rondaActual + 1) % rondas.length;
  turnoActual = {
    equipo: 1,
    jugadorId: null
  };
  renderRonda();

  // 🔥 CORREGIDO: Agregamos errores al iniciar nueva ronda
  set(ref(db, "estadoJuego"), {
    rondaActual,
    turno: turnoActual,
    pausado: false,
    respuestasReveladas: {},
    scores: { 1: 0, 2: 0 },
    errores: { 1: 0, 2: 0 }, // 🔥 AGREGADO
    reset: Date.now()
  });
});

btnCambiarTurno?.addEventListener("click", () => {
  const nuevoEquipo = turnoActual.equipo === 1 ? 2 : 1;
  turnoActual = {
    equipo: nuevoEquipo,
    jugadorId: null
  };

  // 💡 MEJORA: Actualizar solo la ruta específica
  update(ref(db, "estadoJuego/turno"), turnoActual);
});

btnResetRespuestas?.addEventListener("click", () => {
  update(ref(db, "estadoJuego"), { respuestasReveladas: {} });
});

btnResetScores?.addEventListener("click", () => {
  update(ref(db, "estadoJuego"), { scores: { 1: 0, 2: 0 } });
});

btnPausarJuego?.addEventListener("click", () => {
  update(ref(db, "estadoJuego"), { pausado: true });
});

btnReanudarJuego?.addEventListener("click", () => {
  update(ref(db, "estadoJuego"), { pausado: false });
});

btnReiniciarTodo?.addEventListener("click", () => {
  rondaActual = 0;
  turnoActual = {
    equipo: 1,
    jugadorId: null
  };
  renderRonda();

  // 🔥 CORREGIDO: Agregamos errores al reiniciar todo
  set(ref(db, "estadoJuego"), {
    rondaActual,
    turno: turnoActual,
    pausado: false,
    respuestasReveladas: {},
    scores: { 1: 0, 2: 0 },
    errores: { 1: 0, 2: 0 }, // 🔥 AGREGADO
    reset: Date.now()
  });
});