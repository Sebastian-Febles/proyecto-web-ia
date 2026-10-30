"use strict";

const API = "https://rickandmortyapi.com/api";
const CLAVES = {
  favoritos: "ciudadela:favoritos",
  historial: "ciudadela:historial"
};
const MAX_HISTORIAL = 6;
const MAX_COMPARAR = 2;
const VISTAS = ["catalogo", "favoritos", "comparar"];

const TEXTOS = {
  estado: { Alive: "Vivo", Dead: "Muerto", unknown: "Desconocido" },
  genero: { Male: "Masculino", Female: "Femenino", Genderless: "Sin género", unknown: "Desconocido" },
  especie: {
    Human: "Humano",
    Alien: "Alienígena",
    Humanoid: "Humanoide",
    Robot: "Robot",
    Animal: "Animal",
    Cronenberg: "Cronenberg",
    Disease: "Enfermedad",
    "Mythological Creature": "Criatura mitológica",
    Poopybutthole: "Poopybutthole",
    unknown: "Desconocida"
  }
};

const traducir = (tipo, valor) => TEXTOS[tipo][valor] ?? valor;

const $ = (selector) => document.querySelector(selector);

const dom = {
  buscador: $("#buscador"),
  genero: $("#filtroGenero"),
  especie: $("#filtroEspecie"),
  orden: $("#orden"),
  limpiar: $("#limpiar"),
  form: $("#formFiltros"),
  lateral: $("#lateral"),
  alternarFiltros: $("#alternarFiltros"),
  historial: $("#historial"),
  historialChips: $("#historialChips"),
  borrarHistorial: $("#borrarHistorial"),
  stats: $("#stats"),
  mensaje: $("#mensaje"),
  lista: $("#lista"),
  cargarMas: $("#cargarMas"),
  totalGlobal: $("#totalGlobal"),
  cuentaFav: $("#cuentaFav"),
  cuentaCmp: $("#cuentaCmp"),
  listaFav: $("#listaFav"),
  mensajeFav: $("#mensajeFav"),
  vaciarFav: $("#vaciarFav"),
  zonaComparar: $("#zonaComparar"),
  mensajeCmp: $("#mensajeCmp"),
  vaciarCmp: $("#vaciarCmp"),
  aviso: $("#aviso")
};

const estado = {
  pagina: 0,
  totalPaginas: 1,
  total: 0,
  lista: [],
  cargando: false,
  controlador: null,
  vista: "catalogo",
  favoritos: leerJSON(CLAVES.favoritos, []).filter((p) => p && typeof p.id === "number"),
  historial: leerJSON(CLAVES.historial, []).filter((t) => typeof t === "string"),
  comparar: []
};

const episodios = new Map();
const episodiosPendientes = new Set();

function crear(etiqueta, clase, texto) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

function crearBoton(clase, texto, tipo = "button") {
  const boton = crear("button", clase, texto);
  boton.type = tipo;
  return boton;
}

function retrasar(funcion, ms) {
  let temporizador;
  return (...args) => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => funcion(...args), ms);
  };
}

function formatearId(id) {
  return `#${String(id).padStart(3, "0")}`;
}

function lugar(nombre) {
  return !nombre || nombre === "unknown" ? "un lugar sin identificar" : nombre;
}

function textoEpisodio(id) {
  if (!id) return "Sin datos";
  const dato = episodios.get(id);
  return dato ? `${dato.codigo}: ${dato.nombre}` : "Consultando…";
}

let temporizadorAviso;
function avisar(texto) {
  dom.aviso.textContent = texto;
  dom.aviso.classList.add("aviso--visible");
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => dom.aviso.classList.remove("aviso--visible"), 3200);
}

function normalizar(p) {
  const primero = Array.isArray(p.episode) && p.episode.length ? p.episode[0] : "";
  return {
    id: p.id,
    nombre: p.name,
    estado: p.status,
    especie: p.species,
    tipo: p.type || "",
    genero: p.gender,
    origen: p.origin?.name ?? "unknown",
    ubicacion: p.location?.name ?? "unknown",
    imagen: p.image,
    apariciones: Array.isArray(p.episode) ? p.episode.length : 0,
    primerEpisodio: Number(primero.split("/").pop()) || null
  };
}

function describir(p) {
  const especie = traducir("especie", p.especie);
  const tipo = p.tipo ? `, tipo ${p.tipo}` : "";
  const genero = traducir("genero", p.genero).toLowerCase();
  return `Especie ${especie.toLowerCase()}${tipo}, género ${genero}. ` +
    `Viene de ${lugar(p.origen)} y la última vez se le vio en ${lugar(p.ubicacion)}.`;
}

function ordenar(lista, criterio) {
  const copia = [...lista];
  if (criterio === "az") return copia.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  if (criterio === "za") return copia.sort((a, b) => b.nombre.localeCompare(a.nombre, "es"));
  if (criterio === "apariciones") return copia.sort((a, b) => b.apariciones - a.apariciones);
  return copia;
}

function mostrarMensaje(contenedor, { titulo, texto, accion, error = false }) {
  contenedor.className = `mensaje${error ? " mensaje--error" : ""}`;
  const piezas = [crear("h3", "mensaje__titulo", titulo), crear("p", "mensaje__texto", texto)];
  if (accion) {
    const boton = crearBoton("boton boton--primario", accion.texto);
    boton.addEventListener("click", accion.alPulsar);
    piezas.push(boton);
  }
  contenedor.replaceChildren(...piezas);
  contenedor.hidden = false;
}

const ocultar = (contenedor) => { contenedor.hidden = true; };

function leerJSON(clave, defecto) {
  try {
    const valor = JSON.parse(localStorage.getItem(clave));
    return Array.isArray(valor) ? valor : defecto;
  } catch {
    return defecto;
  }
}

function guardarJSON(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

function leerFiltros() {
  return {
    name: dom.buscador.value.trim(),
    status: dom.form.elements.estado.value,
    gender: dom.genero.value,
    species: dom.especie.value
  };
}

const hayFiltros = () => Object.values(leerFiltros()).some(Boolean);

function construirUrl(pagina) {
  const parametros = new URLSearchParams({ page: pagina });
  Object.entries(leerFiltros()).forEach(([clave, valor]) => {
    if (valor) parametros.set(clave, valor);
  });
  return `${API}/character?${parametros}`;
}

async function cargar(reiniciar) {
  estado.controlador?.abort();
  estado.controlador = new AbortController();
  const { signal } = estado.controlador;
  const pagina = reiniciar ? 1 : estado.pagina + 1;

  estado.cargando = true;
  ocultar(dom.mensaje);
  if (reiniciar) {
    estado.lista = [];
    estado.pagina = 0;
    mostrarEsqueletos();
  }
  actualizarBotonMas();

  try {
    const respuesta = await fetch(construirUrl(pagina), { signal });

    if (respuesta.status === 404) {
      if (reiniciar) {
        dom.lista.replaceChildren();
        pintarStats();
        mostrarMensaje(dom.mensaje, {
          titulo: "No encontramos a nadie con esos datos",
          texto: "Revisa la ortografía del nombre o quita algún filtro para ampliar la búsqueda.",
          accion: { texto: "Quitar filtros", alPulsar: limpiarFiltros }
        });
      }
      estado.totalPaginas = estado.pagina;
      return;
    }
    if (!respuesta.ok) throw new Error(`La API respondió con el código ${respuesta.status}`);

    const datos = await respuesta.json();
    const nuevos = datos.results.map(normalizar);

    estado.pagina = pagina;
    estado.totalPaginas = datos.info.pages;
    estado.total = datos.info.count;
    estado.lista.push(...nuevos);
    if (!hayFiltros()) dom.totalGlobal.textContent = datos.info.count;

    pintarCatalogo(new Set(nuevos.map((p) => p.id)));
    if (reiniciar) guardarBusqueda(dom.buscador.value);
    resolverEpisodios(nuevos.map((p) => p.primerEpisodio));
  } catch (error) {
    if (error.name === "AbortError") return;
    console.error("Error al consultar la API:", error);
    if (reiniciar) dom.lista.replaceChildren();
    pintarStats();
    mostrarMensaje(dom.mensaje, {
      titulo: "No pudimos conectar con la API",
      texto: "Revisa tu conexión a internet e inténtalo de nuevo. Los favoritos guardados siguen disponibles.",
      accion: { texto: "Reintentar", alPulsar: () => cargar(reiniciar) },
      error: true
    });
  } finally {
    if (!signal.aborted) {
      estado.cargando = false;
      actualizarBotonMas();
    }
  }
}

async function resolverEpisodios(ids) {
  const faltan = [...new Set(ids.filter(Boolean))]
    .filter((id) => !episodios.has(id) && !episodiosPendientes.has(id));
  if (!faltan.length) return;

  faltan.forEach((id) => episodiosPendientes.add(id));
  try {
    const respuesta = await fetch(`${API}/episode/${faltan.join(",")}`);
    if (!respuesta.ok) throw new Error(`Episodios: código ${respuesta.status}`);
    const datos = await respuesta.json();
    (Array.isArray(datos) ? datos : [datos]).forEach((ep) => {
      episodios.set(ep.id, { codigo: ep.episode, nombre: ep.name });
    });
  } catch (error) {
    console.error("No se pudieron cargar los episodios:", error);
    faltan.forEach((id) => {
      document.querySelectorAll(`[data-ep="${id}"]`).forEach((nodo) => {
        nodo.textContent = "No disponible";
      });
    });
  } finally {
    faltan.forEach((id) => episodiosPendientes.delete(id));
  }
  faltan.forEach((id) => {
    if (!episodios.has(id)) return;
    document.querySelectorAll(`[data-ep="${id}"]`).forEach((nodo) => {
      nodo.textContent = textoEpisodio(id);
    });
  });
}

function crearFicha(p, esNueva = false) {
  const ficha = crear("article", `ficha${esNueva ? " ficha--nueva" : ""}`);
  ficha.dataset.estado = p.estado;

  const foto = crear("div", "ficha__foto");
  const imagen = document.createElement("img");
  imagen.src = p.imagen;
  imagen.alt = `Retrato de ${p.nombre}`;
  imagen.width = 120;
  imagen.height = 120;
  imagen.loading = "lazy";
  foto.append(imagen);

  const encabezado = crear("div", "ficha__encabezado");
  encabezado.append(
    crear("h3", "ficha__nombre", p.nombre),
    crear("span", "ficha__id", formatearId(p.id))
  );

  const etiquetas = crear("div", "ficha__etiquetas");
  etiquetas.append(
    crear("span", "sello", traducir("estado", p.estado)),
    crear("span", "etiqueta", traducir("especie", p.especie))
  );

  const datos = crear("dl", "ficha__datos");
  const apariciones = crear("div");
  apariciones.append(
    crear("dt", "", "Apariciones"),
    crear("dd", "", `${p.apariciones} ${p.apariciones === 1 ? "episodio" : "episodios"}`)
  );
  const primera = crear("div");
  const valorPrimera = crear("dd", "", textoEpisodio(p.primerEpisodio));
  if (p.primerEpisodio) valorPrimera.dataset.ep = p.primerEpisodio;
  primera.append(crear("dt", "", "Primera aparición"), valorPrimera);
  datos.append(apariciones, primera);

  const acciones = crear("div", "ficha__acciones");
  const botonFav = crearBoton("accion accion--fav", "Guardar");
  botonFav.dataset.fav = p.id;
  const botonCmp = crearBoton("accion accion--cmp", "Comparar");
  botonCmp.dataset.cmp = p.id;
  acciones.append(botonFav, botonCmp);

  const cuerpo = crear("div", "ficha__cuerpo");
  cuerpo.append(encabezado, etiquetas, crear("p", "ficha__descripcion", describir(p)), datos, acciones);

  ficha.append(foto, cuerpo);
  return ficha;
}

function pintarCatalogo(nuevos = new Set()) {
  const ordenada = ordenar(estado.lista, dom.orden.value);
  dom.lista.replaceChildren(...ordenada.map((p) => crearFicha(p, nuevos.has(p.id))));
  pintarStats();
  sincronizarBotones();
}

function mostrarEsqueletos() {
  dom.lista.replaceChildren(...Array.from({ length: 6 }, () => crear("div", "ficha ficha--esqueleto")));
  dom.stats.replaceChildren();
}

function actualizarBotonMas() {
  const quedan = estado.pagina > 0 && estado.pagina < estado.totalPaginas;
  dom.cargarMas.hidden = !quedan;
  dom.cargarMas.disabled = estado.cargando;
  dom.cargarMas.textContent = estado.cargando ? "Cargando…" : "Cargar 20 personajes más";
}

function pintarStats() {
  const lista = estado.lista;
  if (!lista.length) {
    dom.stats.replaceChildren();
    return;
  }
  const contar = (valor) => lista.filter((p) => p.estado === valor).length;
  const promedio = Math.round(lista.reduce((suma, p) => suma + p.apariciones, 0) / lista.length);

  const dato = (numero, etiqueta, clase = "") => {
    const caja = crear("div", `stat ${clase}`.trim());
    caja.append(crear("strong", "stat__numero", String(numero)), crear("span", "stat__etiqueta", etiqueta));
    return caja;
  };
  dom.stats.replaceChildren(
    dato(`${lista.length} de ${estado.total}`, "personajes cargados"),
    dato(contar("Alive"), "vivos", "stat--vivo"),
    dato(contar("Dead"), "muertos", "stat--muerto"),
    dato(contar("unknown"), "de estado desconocido", "stat--desconocido"),
    dato(promedio, "apariciones en promedio")
  );
}

const esFavorito = (id) => estado.favoritos.some((p) => p.id === id);
const estaEnComparador = (id) => estado.comparar.some((p) => p.id === id);

function buscarPersonaje(id) {
  return estado.lista.find((p) => p.id === id) ??
    estado.favoritos.find((p) => p.id === id) ??
    estado.comparar.find((p) => p.id === id);
}

function alternarFavorito(p) {
  const quitar = esFavorito(p.id);
  estado.favoritos = quitar
    ? estado.favoritos.filter((f) => f.id !== p.id)
    : [...estado.favoritos, p];
  if (!guardarJSON(CLAVES.favoritos, estado.favoritos)) {
    avisar("Tu navegador bloqueó el guardado local. Los favoritos se perderán al cerrar la página.");
  } else {
    avisar(quitar ? `${p.nombre} salió de tus favoritos` : `${p.nombre} se guardó en favoritos`);
  }
  sincronizarBotones();
  if (estado.vista === "favoritos") pintarFavoritos();
}

function pintarFavoritos() {
  const hay = estado.favoritos.length > 0;
  dom.vaciarFav.hidden = !hay;
  if (!hay) {
    dom.listaFav.replaceChildren();
    mostrarMensaje(dom.mensajeFav, {
      titulo: "Todavía no guardas a nadie",
      texto: "Pulsa Guardar en cualquier ficha del catálogo y aparecerá aquí, incluso si recargas la página.",
      accion: { texto: "Ir al catálogo", alPulsar: () => { location.hash = "#catalogo"; } }
    });
    return;
  }
  ocultar(dom.mensajeFav);
  dom.listaFav.replaceChildren(...estado.favoritos.map((p) => crearFicha(p)));
  sincronizarBotones();
  resolverEpisodios(estado.favoritos.map((p) => p.primerEpisodio));
}

function sincronizarBotones() {
  dom.cuentaFav.textContent = estado.favoritos.length;
  dom.cuentaCmp.textContent = `${estado.comparar.length}/${MAX_COMPARAR}`;

  document.querySelectorAll("[data-fav]").forEach((boton) => {
    const activo = esFavorito(Number(boton.dataset.fav));
    boton.setAttribute("aria-pressed", String(activo));
    boton.textContent = activo ? "Guardado" : "Guardar";
  });
  document.querySelectorAll("[data-cmp]").forEach((boton) => {
    const activo = estaEnComparador(Number(boton.dataset.cmp));
    boton.setAttribute("aria-pressed", String(activo));
    boton.textContent = activo ? "En comparación" : "Comparar";
  });
}

function alternarComparador(p) {
  if (estaEnComparador(p.id)) {
    estado.comparar = estado.comparar.filter((c) => c.id !== p.id);
    avisar(`${p.nombre} salió de la comparación`);
  } else if (estado.comparar.length >= MAX_COMPARAR) {
    avisar("Solo se pueden comparar dos personajes. Quita uno en la pestaña Comparar.");
    return;
  } else {
    estado.comparar = [...estado.comparar, p];
    avisar(estado.comparar.length === 1
      ? `${p.nombre} está listo. Elige un segundo personaje.`
      : "Ya tienes a los dos. Abre la pestaña Comparar.");
  }
  sincronizarBotones();
  if (estado.vista === "comparar") pintarComparar();
}

const FILAS_COMPARACION = [
  { titulo: "Estado", valor: (p) => p.estado, mostrar: (p) => traducir("estado", p.estado) },
  { titulo: "Especie", valor: (p) => p.especie, mostrar: (p) => traducir("especie", p.especie) },
  { titulo: "Género", valor: (p) => p.genero, mostrar: (p) => traducir("genero", p.genero) },
  { titulo: "Origen", valor: (p) => p.origen, mostrar: (p) => lugar(p.origen) },
  { titulo: "Última ubicación", valor: (p) => p.ubicacion, mostrar: (p) => lugar(p.ubicacion) },
  { titulo: "Apariciones", valor: (p) => p.apariciones, mostrar: (p) => `${p.apariciones}`, numerica: true },
  { titulo: "Primera aparición", valor: (p) => p.primerEpisodio, episodio: true }
];

function pintarComparar() {
  const [a, b] = estado.comparar;
  dom.vaciarCmp.hidden = estado.comparar.length === 0;
  dom.zonaComparar.replaceChildren();

  if (!a) {
    mostrarMensaje(dom.mensajeCmp, {
      titulo: "Elige a dos personajes",
      texto: "En el catálogo o en favoritos pulsa Comparar en dos fichas y verás sus diferencias lado a lado.",
      accion: { texto: "Ir al catálogo", alPulsar: () => { location.hash = "#catalogo"; } }
    });
    return;
  }
  if (!b) {
    mostrarMensaje(dom.mensajeCmp, {
      titulo: `${a.nombre} espera rival`,
      texto: "Falta un segundo personaje. Vuelve al catálogo y pulsa Comparar en otra ficha.",
      accion: { texto: "Elegir al segundo", alPulsar: () => { location.hash = "#catalogo"; } }
    });
    dom.zonaComparar.append(crearTablaComparacion([a]));
    resolverEpisodios([a.primerEpisodio]);
    return;
  }

  ocultar(dom.mensajeCmp);
  const iguales = FILAS_COMPARACION.filter((f) => f.valor(a) === f.valor(b)).length;
  const resumen = crear("p", "versus__resumen",
    `${a.nombre} y ${b.nombre} coinciden en ${iguales} de ${FILAS_COMPARACION.length} datos.`);
  dom.zonaComparar.append(resumen, crearTablaComparacion([a, b]));
  resolverEpisodios([a.primerEpisodio, b.primerEpisodio]);
}

function crearTablaComparacion(personajes) {
  const envoltura = crear("div", "versus");
  const tabla = crear("table", "versus__tabla");
  tabla.append(crear("caption", "solo-lectores", "Comparación de datos entre personajes"));

  const cabeza = crear("thead");
  const filaCabeza = crear("tr");
  filaCabeza.append(crear("td"));
  personajes.forEach((p) => {
    const celda = crear("th", "versus__personaje");
    celda.scope = "col";
    celda.dataset.estado = p.estado;
    const foto = crear("div", "ficha__foto ficha__foto--grande");
    const imagen = document.createElement("img");
    imagen.src = p.imagen;
    imagen.alt = `Retrato de ${p.nombre}`;
    imagen.width = 140;
    imagen.height = 140;
    foto.append(imagen);
    const quitar = crearBoton("enlace-boton", "Quitar");
    quitar.dataset.cmp = p.id;
    celda.append(foto, crear("span", "versus__nombre", p.nombre), quitar);
    filaCabeza.append(celda);
  });
  cabeza.append(filaCabeza);

  const cuerpo = crear("tbody");
  FILAS_COMPARACION.forEach((fila) => {
    const tr = crear("tr");
    const valores = personajes.map((p) => fila.valor(p));
    const distinto = personajes.length === 2 && valores[0] !== valores[1];
    if (distinto) tr.className = "dif";
    const titulo = crear("th", "versus__campo", fila.titulo);
    titulo.scope = "row";
    tr.append(titulo);

    personajes.forEach((p, i) => {
      const td = crear("td");
      if (fila.episodio) {
        const span = crear("span", "", textoEpisodio(p.primerEpisodio));
        if (p.primerEpisodio) span.dataset.ep = p.primerEpisodio;
        td.append(span);
      } else {
        td.textContent = fila.mostrar(p);
      }
      if (fila.numerica && distinto && valores[i] === Math.max(...valores)) {
        td.classList.add("gana");
        td.append(crear("small", "gana__nota", " (más apariciones)"));
      }
      tr.append(td);
    });
    cuerpo.append(tr);
  });

  tabla.append(cabeza, cuerpo);
  envoltura.append(tabla);
  return envoltura;
}

function guardarBusqueda(texto) {
  const termino = texto.trim();
  if (termino.length < 2 || !estado.lista.length) return;
  estado.historial = [termino, ...estado.historial.filter((t) => t.toLowerCase() !== termino.toLowerCase())]
    .slice(0, MAX_HISTORIAL);
  guardarJSON(CLAVES.historial, estado.historial);
  pintarHistorial();
}

function pintarHistorial() {
  dom.historial.hidden = estado.historial.length === 0;
  dom.historialChips.replaceChildren(...estado.historial.map((termino) => {
    const chip = crearBoton("chip", termino);
    chip.addEventListener("click", () => {
      dom.buscador.value = termino;
      cargar(true);
      cerrarFiltrosMovil();
    });
    return chip;
  }));
}

function limpiarFiltros() {
  dom.buscador.value = "";
  dom.form.elements.estado.value = "";
  dom.genero.value = "";
  dom.especie.value = "";
  cargar(true);
}

function cerrarFiltrosMovil() {
  dom.lateral.classList.remove("lateral--abierto");
  dom.alternarFiltros.setAttribute("aria-expanded", "false");
  dom.alternarFiltros.textContent = "Mostrar filtros";
}

function mostrarVista(nombre) {
  estado.vista = nombre;
  VISTAS.forEach((v) => { $(`#vista-${v}`).hidden = v !== nombre; });
  document.querySelectorAll(".nav__enlace").forEach((enlace) => {
    if (enlace.dataset.vista === nombre) enlace.setAttribute("aria-current", "page");
    else enlace.removeAttribute("aria-current");
  });
  if (nombre === "favoritos") pintarFavoritos();
  if (nombre === "comparar") pintarComparar();
  if (nombre === "catalogo") sincronizarBotones();
  window.scrollTo({ top: 0 });
}

function vistaDesdeHash() {
  const nombre = location.hash.replace("#", "");
  return VISTAS.includes(nombre) ? nombre : "catalogo";
}

function configurarEventos() {
  const buscarConRetraso = retrasar(() => cargar(true), 450);
  dom.buscador.addEventListener("input", buscarConRetraso);
  dom.form.addEventListener("submit", (e) => e.preventDefault());
  [...dom.form.querySelectorAll('input[name="estado"]')]
    .forEach((radio) => radio.addEventListener("change", () => cargar(true)));
  dom.genero.addEventListener("change", () => cargar(true));
  dom.especie.addEventListener("change", () => cargar(true));
  dom.orden.addEventListener("change", () => pintarCatalogo());
  dom.limpiar.addEventListener("click", limpiarFiltros);
  dom.cargarMas.addEventListener("click", () => cargar(false));

  dom.alternarFiltros.addEventListener("click", () => {
    const abierto = dom.lateral.classList.toggle("lateral--abierto");
    dom.alternarFiltros.setAttribute("aria-expanded", String(abierto));
    dom.alternarFiltros.textContent = abierto ? "Ocultar filtros" : "Mostrar filtros";
  });

  dom.borrarHistorial.addEventListener("click", () => {
    estado.historial = [];
    guardarJSON(CLAVES.historial, estado.historial);
    pintarHistorial();
  });

  dom.vaciarFav.addEventListener("click", () => {
    if (!confirm("¿Quitar a todos tus favoritos?")) return;
    estado.favoritos = [];
    guardarJSON(CLAVES.favoritos, estado.favoritos);
    sincronizarBotones();
    pintarFavoritos();
  });

  dom.vaciarCmp.addEventListener("click", () => {
    estado.comparar = [];
    sincronizarBotones();
    pintarComparar();
  });

  document.addEventListener("click", (evento) => {
    const botonFav = evento.target.closest("[data-fav]");
    const botonCmp = evento.target.closest("[data-cmp]");
    const boton = botonFav || botonCmp;
    if (!boton) return;
    const personaje = buscarPersonaje(Number(boton.dataset.fav ?? boton.dataset.cmp));
    if (!personaje) return;
    if (botonFav) alternarFavorito(personaje);
    else alternarComparador(personaje);
  });

  window.addEventListener("hashchange", () => mostrarVista(vistaDesdeHash()));
}

configurarEventos();
pintarHistorial();
sincronizarBotones();
mostrarVista(vistaDesdeHash());
cargar(true);
