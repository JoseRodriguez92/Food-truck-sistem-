-- El pago es 100% manual (MercadoPago desactivado) — el staff confirma en
-- persona y debe registrar con qué medio se pagó. Se captura recién cuando
-- el pedido pasa a estado "confirmed" (ver app/admin/actions.ts).
alter table profile_has_order
  add column payment_method text
  check (payment_method in ('efectivo', 'nequi', 'datafono', 'transferencia', 'bre_b'));
