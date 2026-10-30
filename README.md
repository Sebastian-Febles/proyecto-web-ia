# Registro de la Ciudadela

Aplicación web que consulta personajes de [The Rick and Morty API](https://rickandmortyapi.com/documentation) y permite buscarlos, filtrarlos, guardarlos como favoritos y compararlos de dos en dos.

- **Aplicación publicada:** https://sebastian-febles.github.io/proyecto-web-ia/
- **Repositorio:** https://github.com/Sebastian-Febles/proyecto-web-ia

## Integrantes

| Integrante | Contribución principal |
|---|---|
| Sebastian Febles Magaña | Lógica en JavaScript: fetch, filtros, favoritos, comparador e historial |
| Ana Gómez | Diseño responsive y estilo visual |
| Luis Pérez | Validación UX y documentación final |

## Descripción

Cada página de resultados trae 20 personajes con foto y ficha: estado, especie, género, origen, última ubicación, número de apariciones y la primera aparición (nombre y código del episodio, obtenidos con una segunda consulta a `/episode`). La foto va dentro de un anillo cuyo color cambia según el estado del personaje (verde vivo, rojo muerto, gris desconocido).

### Requisitos de la tarea

- [x] Interfaz con HTML, CSS y JavaScript en archivos separados.
- [x] Conexión a la API con `fetch()` y `async/await`.
- [x] 20 personajes por carga, cada uno con imagen y descripción.
- [x] Buscador por nombre.
- [x] Filtros por estado, género y especie, más orden alfabético y por apariciones.
- [x] Sección de favoritos.
- [x] Favoritos guardados en `localStorage`.
- [x] Mensajes para «sin resultados» y «falló la conexión».
- [x] Diseño adaptable: filtros fijos a la izquierda en computadora y plegables en celular.
- [x] Publicación con GitHub Pages.
- [x] **Reto extra:** comparar dos personajes, más estadísticas dinámicas e historial de búsquedas.

## Instrucciones de uso

1. Abre la página: los primeros 20 personajes cargan solos.
2. Escribe un nombre en **Nombre del personaje** o usa **Estado**, **Género** y **Especie**. En celular, pulsa **Mostrar filtros**.
3. Las **búsquedas recientes** aparecen debajo del buscador; pulsa una para repetirla.
4. Cambia **Ordenar los resultados cargados** para ver A a Z, Z a A o más apariciones primero.
5. Pulsa **Cargar 20 personajes más** para seguir explorando.
6. Pulsa **Guardar** en una ficha y revísala en la pestaña **Favoritos**.
7. Pulsa **Comparar** en dos fichas y abre la pestaña **Comparar**: las diferencias quedan resaltadas.

## Si algo falla

- **Aparece "No pudimos conectar con la API":** revisa tu conexión a internet y pulsa **Reintentar**. Si sigue igual, recarga la página.
- **Aparece "No encontramos a nadie con esos datos":** no es un error; ningún personaje coincide. Pulsa **Quitar filtros** o revisa la ortografía.
- **Los favoritos no se guardan:** el navegador pudo bloquear el almacenamiento local (modo privado). Prueba en una ventana normal.
- **Los cambios no se ven en GitHub Pages:** espera 1 o 2 minutos y recarga con Ctrl + F5.

## Estructura

```text
proyecto-web-ia/
├── index.html   # estructura: barra, filtros laterales y tres vistas
├── style.css    # diseño, anillos de portal y adaptabilidad
├── script.js    # fetch, filtros, favoritos, comparador e historial
└── README.md
```

## ¿Cómo funciona?

- **`fetch()`**: `construirUrl()` arma la dirección con los filtros activos (`?page=1&name=rick&status=alive`) y `cargar()` la pide a la API y convierte la respuesta con `.json()`.
- **Buscador**: al escribir se espera 450 ms para evitar sobrecargar la API. El filtrado se hace en la consulta a la API.
- **Cuando la API no responde**: el bloque `catch` muestra «No pudimos conectar con la API» con un botón **Reintentar**. Si la API responde 404 significa que no hay coincidencias y se muestra «No encontramos a nadie con esos datos».
- **Peticiones viejas**: un `AbortController` cancela la consulta anterior si se lanza una nueva.
- **Favoritos**: se guarda una copia reducida de cada personaje en `localStorage`.
- **Comparador**: guarda hasta dos personajes y resalta las diferencias en una tabla.
- **Historial**: guarda las últimas 6 búsquedas que devolvieron resultados sin duplicados.
- **Estadísticas dinámicas**: se recalculan con cada lista de personajes cargados.

## Publicación en GitHub Pages

En GitHub, ir a Settings → Pages → Source: Deploy from a branch → Branch: `main` / `(root)` → Save.

## Documentación del uso de IA

Herramienta utilizada: **Claude (Anthropic)**.

### Prompts clave

1. **Versión inicial**: crear una página con API, buscador, filtros y favoritos.
2. **Entender el código**: explicar cómo funciona `cargar()` y por qué `async/await`.
3. **Mejora concreta**: mostrar la primera aparición del personaje sin repetir decenas de peticiones.

### Error corregido

Un caso común fue tratar la respuesta de `/episode/id` y de `/episode/1,2,3` como si fueran iguales. La solución fue normalizar con `Array.isArray(datos) ? datos : [datos]`.

### Reflexión

La IA aceleró el primer borrador, pero fue necesario probar y ajustar el comportamiento real con la documentación de la API y con la carga en el navegador.
