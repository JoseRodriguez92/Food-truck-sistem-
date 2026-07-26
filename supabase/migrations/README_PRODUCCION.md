# Inventario y producción — decisiones tomadas

> Fecha: 2026-07-26 · Migración: `production_runs_and_sales.sql`

## La regla

Qué descuenta qué cuando un pedido pasa a **"En preparación"**:

| Producto | Marca | Al venderse |
| --- | --- | --- |
| Bebidas y venta directa | `product.production_batch_id` = `NULL` | Descuenta ingredientes por receta (`product_has_ingredient`) |
| Arepas | `product.production_batch_id` → lote | **NO** toca ingredientes. Suma 1 al conteo de la corrida abierta (`production_run_output`) |

Ejemplo — pedido de **soberana + cocacola**:

```
Soberana (arepa) → +1 al conteo de la corrida abierta del lote
                   NO toca ingredientes
Cocacola         → −1 del inventario del truck
                   NO toca ningún lote
```

## Por qué

En la preparación se pierde materia prima real (parte de la cebolla, el cartílago
del pollo) que una receta por unidad no modela bien. **Lo que pasa por cocina se
mide por LOTE** — lo que realmente entró a la olla — no por unidad vendida.

El planteo original (descontar la receta del producto en cada venta) estaba mal
para las arepas: la materia prima ya se consumió al producir el lote, y volver a
descontarla en la venta cuenta doble.

El vínculo es **por producto**, no por categoría, para que la arepa de pollo salga
del lote de pollo y la de chicharrón del suyo.

## Cancelaciones

Revierte las dos puntas: borra la fila del conteo del lote y devuelve la bebida al
inventario. Solo aplica si el pedido **ya había pasado por "En preparación"** — lo
controla el flag `stock_deducted`, así que no se devuelve stock fantasma.

## Guardas contra el doble conteo

Dos triggers en la migración impiden que el problema original vuelva a entrar por
la UI:

- No se le puede cargar receta a un producto que tiene lote asignado.
- No se le puede asignar lote a un producto que ya tiene receta.

Ambos fallan con un mensaje que explica por qué.

---

## Pendientes de este subsistema

### Combos — HOY NO SE USAN

Decisión del usuario (2026-07-26): quedan para después. Cuando se retomen, revisar
dos cosas en `deduct_order_stock`:

1. **`combo_has_product` no tiene columna de cantidad** — asume 1 unidad de cada
   producto. Un combo con 2 arepas hoy contaría 1.
2. Verificar que la separación producción/inventario funcione con **combos mixtos**
   (arepa + bebida dentro del mismo combo). El código ya contempla el caso, pero no
   está probado contra datos reales.

### Hueco del estado `preparing`

El trigger `on_order_status_stock` escucha **solo** el código `preparing`. Si el
staff va `pending → confirmed → delivered` —que es el flujo natural para una bebida,
porque nadie "prepara" una coca— **no se descuenta ni se cuenta nada**.

Fix propuesto: que `confirmed` y `delivered` también disparen el descuento.
`stock_deducted` ya garantiza que no se duplique, así que lo que pase primero gana.

### Falta la UI

- Server actions de abrir / cerrar corrida (`abrir_produccion`, `cerrar_produccion`).
- Selector "Sale del lote" en el panel de Productos.
- Vista de corridas + unidades vendidas en el panel de Lotes
  (la vista SQL `v_production_run_summary` ya está lista).
