import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MenuView } from "@/components/client/menu-view";
import { LocationSwitcher } from "@/components/client/location-switcher";
import { MapPin, UtensilsCrossed } from "lucide-react";
import type { DirectionItem } from "@/components/client/directions-sheet";

// ── Estados vacíos ──────────────────────────────────────────────────────────────

type LocationOption = { location_id: number; name: string; city: string | null };

function EmptyState({
  icon: Icon,
  title,
  description,
  allLocations,
  currentLocationId,
  currentLabel,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  allLocations?: LocationOption[];
  currentLocationId?: number | null;
  currentLabel?: string;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden bg-background px-6">
      {/* Blur orbs decorativos */}
      <div className="absolute top-1/4 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-56 h-56 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {allLocations && allLocations.length > 0 && (
        <div className="absolute top-4 left-4 z-10">
          <LocationSwitcher
            locations={allLocations}
            currentLocationId={currentLocationId}
            currentLabel={currentLabel}
          />
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center text-center max-w-xs gap-5">
        {/* Ícono con glow */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl scale-150" />
          <div className="relative w-20 h-20 rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
            <Icon className="w-9 h-9 text-primary" />
          </div>
        </div>

        {/* Texto */}
        <div className="space-y-2">
          <h2
            className="text-xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            {title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>

        {/* Branding */}
        <p className="text-xs text-muted-foreground/50 mt-4 font-medium tracking-widest uppercase">
          3 Street Food
        </p>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default async function ClientMenuPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; id?: string }>;
}) {
  const { location: locationParam, id: menuParam } = await searchParams;
  const locationId   = locationParam ? Number(locationParam) : null;
  const directMenuId = menuParam ? Number(menuParam) : null;

  const supabase = await createClient();

  // ── Ubicaciones activas (para el dropdown del header) ──────────────────────
  const { data: allLocations } = await supabase
    .from("location")
    .select("location_id, name, city")
    .eq("estatus", true)
    .order("name");

  // ── Directions del usuario autenticado ────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser();
  let directions: DirectionItem[] = [];
  if (user) {
    const { data } = await supabase
      .from("profile_has_direction")
      .select(`
        profile_direction_id, is_default,
        direction(direction_id, label, address_line, city, state, country, postal_code, additional_info)
      `)
      .eq("profile_id", user.id)
      .order("profile_direction_id");
    directions = (data ?? []) as unknown as DirectionItem[];
  }

  // ── Modo directo por menu_id ───────────────────────────────────────────────
  if (directMenuId && !locationId) {
    return fetchAndRenderMenu(supabase, directMenuId, undefined, directions, allLocations ?? []);
  }

  // ── Sin ubicación en la URL: reusar la detección automática de /client ──────
  if (!locationId) {
    redirect("/client");
  }

  // ── Obtener ubicación y sus menús ──────────────────────────────────────────
  const { data: location } = await supabase
    .from("location")
    .select(`
      location_id, name,
      location_has_menu(
        location_menu_id, menu_id,
        menu(menu_id, name)
      )
    `)
    .eq("location_id", locationId)
    .eq("estatus", true)
    .single();

  if (!location) {
    return (
      <EmptyState
        icon={MapPin}
        title="Ubicación no encontrada"
        description="El código QR que escaneaste no corresponde a ninguna ubicación activa."
        allLocations={allLocations ?? []}
      />
    );
  }

  const assignedMenus = (location.location_has_menu ?? []).map((lm: any) => {
    const menu = Array.isArray(lm.menu) ? lm.menu[0] : lm.menu;
    return { location_menu_id: lm.location_menu_id, menu_id: lm.menu_id, name: menu?.name ?? "Menú" };
  });

  if (assignedMenus.length === 0) {
    return (
      <EmptyState
        icon={UtensilsCrossed}
        title="Sin menú disponible"
        description={`La ubicación "${location.name}" no tiene menús activos en este momento. Vuelve pronto.`}
        allLocations={allLocations ?? []}
        currentLocationId={locationId}
        currentLabel={location.name}
      />
    );
  }

  const targetMenuId = directMenuId && assignedMenus.some((m: any) => m.menu_id === directMenuId)
    ? directMenuId
    : assignedMenus[0].menu_id;

  return fetchAndRenderMenu(supabase, targetMenuId, {
    locationName: location.name,
    locationId,
    menus: assignedMenus,
    activeMenuId: targetMenuId,
  }, directions, allLocations ?? []);
}

// ── Helper ─────────────────────────────────────────────────────────────────────

async function fetchAndRenderMenu(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  menuId: number,
  locationCtx: {
    locationName: string;
    locationId: number;
    menus: { menu_id: number; name: string }[];
    activeMenuId: number;
  } | undefined,
  directions: DirectionItem[],
  allLocations: { location_id: number; name: string; city: string | null }[]
) {
  const [{ data: menuBase }, { data: menuProducts }, { data: menuCombos }] = await Promise.all([
    supabase
      .from("menu")
      .select("menu_id, name, description")
      .eq("menu_id", menuId)
      .single(),

    supabase
      .from("menu_has_product")
      .select(`
        menu_product_id, product_id,
        product(
          product_id, name, description, price,
          product_has_type(product_type_id, type),
          product_has_image(product_image_id, image_url),
          category(category_id, name)
        )
      `)
      .eq("menu_id", menuId),

    supabase
      .from("menu_has_combo")
      .select(`
        menu_combo_id, combo_id,
        combo(
          combo_id, name, description, price,
          combo_has_product(
            combo_product_id,
            product(product_id, name, product_has_image(product_image_id, image_url))
          )
        )
      `)
      .eq("menu_id", menuId),
  ]);

  if (!menuBase) {
    return (
      <EmptyState
        icon={UtensilsCrossed}
        title="Menú no encontrado"
        description="Este menú no existe o fue desactivado. Escanea el QR nuevamente."
        allLocations={allLocations}
        currentLocationId={locationCtx?.locationId}
        currentLabel={locationCtx?.locationName}
      />
    );
  }

  const menu = {
    ...menuBase,
    menu_has_product: menuProducts ?? [],
    menu_has_combo:   menuCombos   ?? [],
  };

  return <MenuView menu={menu as never} locationCtx={locationCtx} directions={directions} allLocations={allLocations} />;
}
