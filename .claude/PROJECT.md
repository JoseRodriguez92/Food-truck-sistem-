# TRES — Visión de Proyecto

> Contexto de negocio detrás de "3 Street Food". No es guía de diseño (ver `CLAUDE.md` para eso) — esto es el *por qué* del proyecto.

## Quiénes somos

TRES nace de la unión de 3 amigos emprendiendo juntos un food truck.

## Misión de contenido / storytelling

El proyecto no es solo vender comida — es documentar la experiencia real de emprender:

- Desmentir mitos del emprendimiento
- Contar cómo es la experiencia real, sin filtro
- Mostrar los stoppers (obstáculos reales) que uno enfrenta en el camino

El food truck es el vehículo de una historia de emprendimiento real, no solo un negocio de comida.

## Modelo de negocio: el fabricante de trucks

Encontraron un fabricante de food trucks muy bueno pero poco conocido en el mercado. Parte del modelo de negocio es actuar de vitrina/showroom para ese fabricante: llevarle clientes, pero siempre pasando por TRES (TRES como intermediario/referidor — el cliente no va directo al fabricante).

**Implicación de producto:** la landing page debería tener una sección dedicada a mostrar el proceso de construcción del truck / el fabricante, con TRES como punto de contacto para quien quiera su propio food truck.

## El sistema como diferencial

Quieren exhibir públicamente el sistema operativo que construyeron: atención al cliente, gestión de ingredientes, pagos. El software interno (admin panel, inventario de ingredientes, flujo de pedidos y pagos — este mismo repo) no es solo herramienta interna: es parte de lo que quieren mostrar como prueba de profesionalismo y transparencia del negocio.

## Gap actual (detectado 2026-07-14)

La landing page actual (`components/history-section.tsx`, `hero-slider.tsx`, etc.) solo habla de comida (Dorilocos, Crazy Fries, Boom Fries, Mindoggys) y no menciona:

- Que son 3 amigos / la historia de emprendimiento (mitos, stoppers)
- El fabricante de trucks / cómo se construye uno / cómo conseguir el tuyo vía TRES
- El sistema de gestión (ingredientes, pagos, atención) como algo mostrable

## Ideas de próximos pasos

- [x] Sección "Arma Tu Truck" (`components/build-your-truck-section.tsx`, id `#truck`) — problema/solución centrado tipo `OrderCTA`. TRES es quien construye el trailer (no un fabricante externo nombrado): cocina personalizada, buenos acabados, levantamiento de requerimientos. CTA "Arma El Tuyo Ya" abre modal placeholder ("Próximamente") — el flujo real de levantamiento de requerimientos se construye en otra pasada. Agregada a `app/page.tsx` entre `HistorySection` y `LocationsSection`, con anchor en nav de `header.tsx` y `footer.tsx`.
- [x] Stats inventados en `HistorySection` (+5 años, 50K+ clientes, 4.9 rating) — removidos por decisión del usuario (2026-07-14), no había data real detrás.
- [ ] Sección "Nuestra historia" real — los 3 amigos, mitos del emprendimiento, stoppers reales. Pendiente: necesita texto real de los fundadores, no se puede inventar.
- [ ] Sección o página mostrando el sistema (demo/screenshots del panel: ingredientes, pagos, pedidos) como vitrina de profesionalismo.
- [ ] Definir a dónde debe llevar el CTA "Arma El Tuyo Ya" cuando el flujo de requerimientos esté listo (hoy es un modal placeholder).
