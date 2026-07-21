import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/src/types/database.types";

import { DashboardView } from "@/components/admin/views/dashboard-view";
import { OrdersView } from "@/components/admin/views/orders-view";
import { FoodTrucksView } from "@/components/admin/views/food-trucks-view";
import { LocationsView, type Location } from "@/components/admin/views/locations-view";
import { CategoriesView, type Category } from "@/components/admin/views/categories-view";
import { ProductsView, type Product } from "@/components/admin/views/products-view";
import { MenusView } from "@/components/admin/views/menus-view";
import { IngredientsView } from "@/components/admin/views/ingredients-view";
import { BatchesView } from "@/components/admin/views/batches-view";
import { CombosView } from "@/components/admin/views/combos-view";
import { ExpensesView } from "@/components/admin/views/expenses-view";
import { UsersView } from "@/components/admin/views/users-view";
import { RolesView } from "@/components/admin/views/roles-view";
import { PermisosView } from "@/components/admin/views/permisos-view";

import { getTareas } from "@/lib/notion";
import { TareasViews } from "@/app/admin/tareas/tareas-views";
import { CheckpointButton } from "@/app/admin/tareas/checkpoint-button";
import { SectionHeader } from "@/components/admin/section-header";
import { getAccessibleLocations } from "@/app/dashboard/orders-actions";

type ExpenseWithCreator = Database["public"]["Views"]["v_expenses_with_creator"]["Row"];
type ExpensePayment = Database["public"]["Views"]["v_expense_payments_with_admin"]["Row"];

export const metadata = { title: "Panel — 3 Street Food" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    section?: string;
    status?: string;
    truck?: string;
    q?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const section = params.section || "dashboard";
  const supabase = await createClient();

  switch (section) {
    // ============ DASHBOARD (resumen de hoy) ============
    case "dashboard": {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: orders } = await supabase
        .from("profile_has_order")
        .select(
          `
          profile_order_id,
          order_number,
          total,
          subtotal,
          created_at,
          notes,
          status_order_id,
          profiles!profile_has_order_profile_id_fkey(first_name, last_name, email),
          status_order(status_order_id, name, code, sort_order)
        `,
        )
        .gte("created_at", todayStart.toISOString())
        .order("created_at", { ascending: false });

      const { data: allStatuses } = await supabase
        .from("status_order")
        .select("status_order_id, name, code, sort_order")
        .eq("is_active", true)
        .order("sort_order");

      return <DashboardView orders={(orders ?? []) as never} allStatuses={allStatuses ?? []} />;
    }

    // ============ PEDIDOS (historial completo, filtros, paginado) ============
    case "orders": {
      const PAGE_SIZE = 25;
      const page = Math.max(1, Number(params.page) || 1);
      const statusFilter = params.status || "all";
      const q = (params.q || "").trim().replace(/[,()]/g, " ").trim();
      const from = params.from || "";
      const to = params.to || "";

      const truckFilter = params.truck ? Number(params.truck) : null;

      const [{ data: allStatuses }, allLocations] = await Promise.all([
        supabase
          .from("status_order")
          .select("status_order_id, name, code, sort_order")
          .eq("is_active", true)
          .order("sort_order"),
        getAccessibleLocations(),
      ]);

      // Truck activo en el sidebar → limita los pedidos a las ubicaciones de ese truck.
      // Si el truck no tiene ninguna ubicación, debe mostrar 0 pedidos — no el listado sin filtrar.
      const truckLocationIds = truckFilter
        ? (allLocations ?? []).filter((l) => l.food_truck_id === truckFilter).map((l) => l.location_id)
        : null;
      const canApplyTruckFilter = !!truckFilter;

      let query = supabase
        .from("profile_has_order")
        .select(
          `
          profile_order_id, order_number, total, subtotal, discount_total, is_courtesy, courtesy_reason, created_at, notes, status_order_id, location_id, stock_deducted,
          profiles!profile_has_order_profile_id_fkey(first_name, last_name, email),
          status_order(status_order_id, name, code, sort_order),
          location(location_id, name, food_truck(name)),
          order_detail(
            order_detail_id, quantity, unit_price, line_total,
            product(product_id, name),
            combo(combo_id, name)
          )
        `,
          { count: "exact" },
        )
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") query = query.eq("status_order_id", statusFilter);
      if (canApplyTruckFilter) query = query.in("location_id", truckLocationIds ?? []);
      if (from) query = query.gte("created_at", new Date(`${from}T00:00:00`).toISOString());
      if (to) query = query.lte("created_at", new Date(`${to}T23:59:59`).toISOString());

      if (q) {
        const orderNumberMatch = /^\d+$/.test(q) ? Number(q) : null;
        const { data: matchedProfiles } = await supabase
          .from("profiles")
          .select("id")
          .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`);
        const matchingIds = (matchedProfiles ?? []).map((p) => p.id);

        const orConditions: string[] = [];
        if (matchingIds.length > 0) orConditions.push(`profile_id.in.(${matchingIds.join(",")})`);
        if (orderNumberMatch !== null) orConditions.push(`order_number.eq.${orderNumberMatch}`);

        query =
          orConditions.length > 0
            ? query.or(orConditions.join(","))
            : query.eq("profile_order_id", "00000000-0000-0000-0000-000000000000");
      }

      const rangeFrom = (page - 1) * PAGE_SIZE;
      const rangeTo = rangeFrom + PAGE_SIZE - 1;

      let orders: any[] | null = null;
      let count = 0;
      let loadError: string | null = null;

      const { data, count: queriedCount, error } = await query.range(rangeFrom, rangeTo);
      orders = data;
      count = queriedCount ?? 0;

      // Compatibilidad: si la migracion de cortesia aun no existe, volvemos a la consulta legacy.
      if (error) {
        const legacyQuery = supabase
          .from("profile_has_order")
          .select(
            `
            profile_order_id, order_number, total, subtotal, created_at, notes, status_order_id, location_id, stock_deducted,
            profiles!profile_has_order_profile_id_fkey(first_name, last_name, email),
            status_order(status_order_id, name, code, sort_order),
            location(location_id, name, food_truck(name)),
            order_detail(
              order_detail_id, quantity, unit_price, line_total,
              product(product_id, name),
              combo(combo_id, name)
            )
          `,
            { count: "exact" },
          )
          .order("created_at", { ascending: false });

        if (statusFilter !== "all") legacyQuery.eq("status_order_id", statusFilter);
        if (canApplyTruckFilter) legacyQuery.in("location_id", truckLocationIds ?? []);
        if (from) legacyQuery.gte("created_at", new Date(`${from}T00:00:00`).toISOString());
        if (to) legacyQuery.lte("created_at", new Date(`${to}T23:59:59`).toISOString());

        if (q) {
          const orderNumberMatch = /^\d+$/.test(q) ? Number(q) : null;
          const { data: matchedProfiles } = await supabase
            .from("profiles")
            .select("id")
            .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`);
          const matchingIds = (matchedProfiles ?? []).map((p) => p.id);

          const orConditions: string[] = [];
          if (matchingIds.length > 0) orConditions.push(`profile_id.in.(${matchingIds.join(",")})`);
          if (orderNumberMatch !== null) orConditions.push(`order_number.eq.${orderNumberMatch}`);

          if (orConditions.length > 0) legacyQuery.or(orConditions.join(","));
          else legacyQuery.eq("profile_order_id", "00000000-0000-0000-0000-000000000000");
        }

        const { data: legacyData, count: legacyCount, error: legacyError } = await legacyQuery.range(
          rangeFrom,
          rangeTo,
        );

        if (legacyError) {
          console.error("[orders] load error", {
            primary: error.message,
            legacy: legacyError.message,
          });
          loadError = `No se pudieron cargar los pedidos. Detalle: ${error.message} | fallback: ${legacyError.message}`;
        }

        orders = (legacyData ?? []).map((o) => ({
          ...o,
          discount_total: 0,
          is_courtesy: false,
          courtesy_reason: null,
        }));
        count = legacyCount ?? 0;
      }

      const totalCount = count ?? 0;
      const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

      return (
        <OrdersView
          orders={(orders ?? []) as never}
          allStatuses={allStatuses ?? []}
          filters={{ status: statusFilter, q: params.q || "", from, to }}
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          loadError={loadError}
        />
      );
    }

    // ============ TAREAS (Notion) ============
    case "tareas": {
      let tareas: Awaited<ReturnType<typeof getTareas>> = [];
      let error: string | null = null;
      try {
        tareas = await getTareas();
      } catch (e: any) {
        error = e.message;
      }

      return (
        <div className="flex flex-col gap-6 p-6">
          <SectionHeader
            title="Tareas"
            subtitle={
              tareas.length > 0 ? `${tareas.length} tareas desde Notion` : "Sincronizado con Notion"
            }
            actions={<CheckpointButton />}
          />

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Error al conectar con Notion: {error}
            </div>
          )}

          {tareas.length > 0 && <TareasViews tareas={tareas} />}

          {tareas.length === 0 && !error && (
            <div className="flex items-center justify-center h-48 rounded-xl border border-dashed border-border text-muted-foreground text-sm">
              No hay tareas en la base de datos.
            </div>
          )}
        </div>
      );
    }

    // ============ GASTOS ============
    case "expenses": {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: expenses } = await supabase
        .from("v_expenses_with_creator")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: payments } = await supabase.from("v_expense_payments_with_admin").select("*");

      const { data: summary } = await supabase
        .from("v_admin_expense_summary")
        .select("*")
        .eq("admin_id", user?.id || "")
        .single();

      return (
        <ExpensesView
          expenses={(expenses as ExpenseWithCreator[]) || []}
          payments={(payments as ExpensePayment[]) || []}
          currentUserId={user?.id || ""}
          currentUserSummary={summary}
        />
      );
    }

    // ============ FOOD TRUCKS ============
    case "trucks.food_trucks": {
      const { data: trucks } = await supabase
        .from("food_truck")
        .select("food_truck_id, name, registration, color")
        .order("food_truck_id");

      return <FoodTrucksView trucks={trucks ?? []} />;
    }

    // ============ UBICACIONES ============
    case "trucks.locations": {
      const [{ data: locations }, { data: trucks }, { data: menus }] = await Promise.all([
        supabase
          .from("location")
          .select(
            `
            location_id, name, address, city, country, estatus, latitude, longitude,
            food_truck_id,
            food_truck(food_truck_id, name, color),
            location_has_menu(
              location_menu_id, menu_id,
              menu(menu_id, name)
            )
          `,
          )
          .order("food_truck_id")
          .order("name"),
        supabase.from("food_truck").select("food_truck_id, name, color").order("name"),
        supabase.from("menu").select("menu_id, name").order("name"),
      ]);

      return (
        <LocationsView
          locations={(locations ?? []) as unknown as Location[]}
          trucks={trucks ?? []}
          menus={menus ?? []}
        />
      );
    }

    // ============ INGREDIENTES ============
    case "catalog.ingredients": {
      const { data: ingredients } = await supabase
        .from("ingredient")
        .select("ingredient_id, name, unit, description, created_at")
        .order("name");

      return <IngredientsView ingredients={ingredients ?? []} />;
    }

    // ============ LOTES DE PRODUCCIÓN ============
    case "catalog.lotes": {
      const [{ data: batches }, { data: allIngredients }] = await Promise.all([
        supabase
          .from("production_batch")
          .select(
            `
            production_batch_id, name, description, created_at,
            items:production_batch_item(
              production_batch_item_id, ingredient_id, quantity,
              ingredient(ingredient_id, name, unit)
            )
          `,
          )
          .order("name"),
        supabase.from("ingredient").select("ingredient_id, name, unit").order("name"),
      ]);

      return (
        <BatchesView
          batches={(batches ?? []) as unknown as import("@/components/admin/views/batches-view").Batch[]}
          allIngredients={allIngredients ?? []}
        />
      );
    }

    // ============ CATEGORÍAS ============
    case "catalog.categories": {
      const { data: categories } = await supabase
        .from("category")
        .select("category_id, name, description, created_at")
        .order("name");

      return <CategoriesView categories={(categories ?? []) as Category[]} />;
    }

    // ============ PRODUCTOS ============
    case "catalog.products": {
      const [{ data: products }, { data: ingredients }, { data: categories }] = await Promise.all([
        supabase
          .from("product")
          .select(
            `
            product_id, name, description, price, partner_price, category_id,
            category(category_id, name),
            product_has_image(product_image_id, image_url),
            product_has_type(product_type_id, type),
            product_has_ingredient(
              product_ingredient_id, quantity,
              ingredient(ingredient_id, name, unit)
            )
          `,
          )
          .order("product_id"),
        supabase.from("ingredient").select("ingredient_id, name, unit").order("name"),
        supabase.from("category").select("category_id, name").order("name"),
      ]);

      return (
        <ProductsView
          products={(products ?? []) as unknown as Product[]}
          allIngredients={ingredients ?? []}
          allCategories={categories ?? []}
        />
      );
    }

    // ============ COMBOS ============
    case "catalog.combos": {
      const [{ data: combos }, { data: products }] = await Promise.all([
        supabase
          .from("combo")
          .select(
            `
            combo_id, name, description, price, image_url, active,
            combo_has_product(
              combo_product_id,
              product_id,
              product(product_id, name, price, product_has_image(product_image_id, image_url))
            )
          `,
          )
          .eq("active", true)
          .order("combo_id"),
        supabase.from("product").select("product_id, name, price").order("name"),
      ]);

      return <CombosView combos={(combos ?? []) as never} allProducts={products ?? []} />;
    }

    // ============ MENÚS ============
    case "catalog.menus": {
      const [{ data: menus }, { data: trucks }, { data: products }, { data: combos }] = await Promise.all([
        supabase
          .from("menu")
          .select(
            `
            menu_id, name, description, food_truck_id,
            food_truck(name, color),
            menu_has_product(
              menu_product_id, product_id,
              product(product_id, name, price,
                product_has_image(product_image_id, image_url)
              )
            ),
            menu_has_combo(
              menu_combo_id, combo_id,
              combo(combo_id, name, price,
                combo_has_product(
                  product_id,
                  product(product_has_image(image_url))
                )
              )
            )
          `,
          )
          .order("menu_id"),
        supabase.from("food_truck").select("food_truck_id, name").order("name"),
        supabase.from("product").select("product_id, name, price").order("name"),
        supabase.from("combo").select("combo_id, name, price").order("name"),
      ]);

      return (
        <MenusView
          menus={(menus ?? []) as never}
          trucks={trucks ?? []}
          allProducts={products ?? []}
          allCombos={combos ?? []}
        />
      );
    }

    // ============ USUARIOS ============
    case "users.list": {
      const [{ data: users }, { data: roles }, { data: trucks }] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            `
            id, first_name, last_name, email,
            status, created_at,
            profile_has_role(
              profile_role_id, role_id,
              roles(role_id, name)
            ),
            profile_has_food_truck(
              profile_food_truck_id, food_truck_id,
              food_truck(food_truck_id, name)
            )
          `,
          )
          .order("created_at", { ascending: false }),
        supabase.from("roles").select("role_id, name").order("name"),
        supabase.from("food_truck").select("food_truck_id, name").order("name"),
      ]);

      return <UsersView users={(users ?? []) as never} roles={roles ?? []} trucks={trucks ?? []} />;
    }

    // ============ ROLES ============
    case "users.roles": {
      const { data: roles } = await supabase
        .from("roles")
        .select(
          `
          role_id, name, description, created_at,
          profile_has_role(count)
        `,
        )
        .order("created_at");

      return <RolesView roles={roles ?? []} />;
    }

    // ============ PERMISOS ============
    case "users.permissions":
      return <PermisosView />;

    // ============ FALLBACK ============
    default: {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: orders } = await supabase
        .from("profile_has_order")
        .select(
          `
          profile_order_id, order_number, total, subtotal, created_at, notes, status_order_id,
          profiles!profile_has_order_profile_id_fkey(first_name, last_name, email),
          status_order(status_order_id, name, code, sort_order)
        `,
        )
        .gte("created_at", todayStart.toISOString())
        .order("created_at", { ascending: false });

      const { data: allStatuses } = await supabase
        .from("status_order")
        .select("status_order_id, name, code, sort_order")
        .eq("is_active", true)
        .order("sort_order");

      return <DashboardView orders={(orders ?? []) as never} allStatuses={allStatuses ?? []} />;
    }
  }
}
