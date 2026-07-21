-- updateManualOrder() hacía DELETE + INSERT como 2 llamadas separadas desde el
-- cliente. Si 2 guardados del mismo pedido se solapan (doble click, red lenta,
-- 2 pestañas editando), se intercalan y las líneas quedan duplicadas.
-- Esta función corre delete+insert en una sola transacción — no queda hueco
-- para que otro guardado se meta en el medio. security invoker (default):
-- respeta las mismas policies de RLS que ya aplicaban a las 2 llamadas sueltas.
create or replace function replace_order_detail(
  p_profile_order_id uuid,
  p_items jsonb
)
returns void
language plpgsql
set search_path = public
as $$
begin
  delete from order_detail where profile_order_id = p_profile_order_id;

  insert into order_detail (profile_order_id, product_id, combo_id, quantity, unit_price, line_total)
  select
    p_profile_order_id,
    (item->>'product_id')::int,
    (item->>'combo_id')::int,
    (item->>'quantity')::int,
    (item->>'unit_price')::numeric,
    (item->>'line_total')::numeric
  from jsonb_array_elements(p_items) as item;
end;
$$;

grant execute on function replace_order_detail(uuid, jsonb) to authenticated;
