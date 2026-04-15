# CLAUDE.md — 3 Street Food · Food Truck App

> Guía de diseño y arquitectura para desarrollo con Claude Code.
> Proyecto: App de pedidos para food truck, Next.js 15 + Tailwind CSS v4 + shadcn/ui.

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript 5.7 |
| Estilos | Tailwind CSS v4 |
| Componentes | shadcn/ui + Radix UI |
| Formularios | React Hook Form + Zod |
| Animaciones | tw-animate-css |
| Iconos | Lucide React |
| Notificaciones | Sonner |
| Temas | next-themes (light/dark) |
| Analytics | @vercel/analytics |

---

## Sistema de Colores (OKLch)

> El proyecto usa **OKLch** como espacio de color (más uniforme perceptualmente que RGB/HSL).
> Los tokens se definen como CSS variables en dos archivos:
> - `styles/globals.css` → modo claro
> - `app/globals.css` → modo oscuro

### Modo Claro (`styles/globals.css`)

```css
--background:           oklch(1 0 0)           /* Blanco puro #FFFFFF */
--foreground:           oklch(0.145 0 0)        /* Gris muy oscuro #242424 */
--card:                 oklch(1 0 0)            /* Blanco #FFFFFF */
--primary:              oklch(0.205 0 0)        /* Gris oscuro #343434 */
--primary-foreground:   oklch(0.985 0 0)        /* Casi blanco #F9F9F9 */
--secondary:            oklch(0.97 0 0)         /* Gris muy claro #F7F7F7 */
--muted-foreground:     oklch(0.556 0 0)        /* Gris medio #8D8D8D */
--accent:               oklch(0.97 0 0)         /* Gris muy claro #F7F7F7 */
--destructive:          oklch(0.577 0.245 27.325) /* Rojo #C42E1A */
--border:               oklch(0.922 0 0)        /* Gris claro #EBEBEB */
--ring:                 oklch(0.708 0 0)        /* Gris #B4B4B4 */
--radius:               0.625rem               /* 10px */
```

**Colores de gráficos (modo claro):**
```css
--chart-1: oklch(0.646 0.222 41.116)   /* Naranja #D4672B */
--chart-2: oklch(0.6 0.118 184.704)    /* Teal #4FA5A8 */
--chart-3: oklch(0.398 0.07 227.392)   /* Azul #325E7F */
--chart-4: oklch(0.828 0.189 84.429)   /* Amarillo #E4C449 */
--chart-5: oklch(0.769 0.188 70.08)    /* Verde #A4D65E */
```

### Modo Oscuro (`app/globals.css`)

```css
--background:           oklch(0.13 0 0)         /* Casi negro #1F1F1F */
--foreground:           oklch(0.98 0 0)          /* Casi blanco #FAFAFA */
--card:                 oklch(0.17 0 0)          /* Oscuro #2B2B2B */
--primary:              oklch(0.7 0.18 45)       /* Dorado/Amarillo #E8C547 ← color de marca */
--primary-foreground:   oklch(0.13 0 0)          /* Casi negro #1F1F1F */
--secondary:            oklch(0.22 0 0)          /* Gris oscuro #363636 */
--muted-foreground:     oklch(0.65 0 0)          /* Gris claro #A8A8A8 */
--accent:               oklch(0.7 0.18 45)       /* Dorado #E8C547 */
--destructive:          oklch(0.396 0.141 25.723) /* Rojo oscuro #B73626 */
--border:               oklch(0.28 0 0)          /* Gris oscuro #464646 */
--input:                oklch(0.22 0 0)          /* Gris oscuro #363636 */
--ring:                 oklch(0.7 0.18 45)       /* Dorado #E8C547 */
--radius:               0.5rem                  /* 8px */
```

> **Color de marca principal:** `oklch(0.7 0.18 45)` ≈ `#E8C547` (dorado/amarillo) — predomina en dark mode.

---

## Tipografía

| Rol | Fuente | Variable CSS | Uso |
|---|---|---|---|
| Display | **Space Grotesk** | `var(--font-space-grotesk)` | Títulos, headings, nombre de marca |
| Cuerpo | **Inter** | `var(--font-inter)` | Párrafos, UI general |
| Fallback | system-ui, sans-serif | — | Respaldo |

```css
--font-sans:    var(--font-inter), system-ui, sans-serif;
--font-display: var(--font-space-grotesk), system-ui, sans-serif;
```

**Escala tipográfica usada:**
- Titulares hero: `text-4xl sm:text-5xl lg:text-7xl` (36px → 72px → 112px)
- Títulos de sección: `text-2xl sm:text-3xl lg:text-4xl`
- Subtítulos: `text-lg sm:text-xl`
- Cuerpo: `text-sm` / `text-base` (14px / 16px)
- Labels/captions: `text-xs` (12px)

---

## Efectos Glass & Blur

### Glass Morphism (Header)
```tsx
// Header fijo con efecto cristal
<header className="fixed top-0 left-0 right-0 z-50
                   bg-background/80 backdrop-blur-md
                   border-b border-border">
```

### Círculos decorativos blur (Hero, CTA)
```tsx
// Blur decorativo — fondo
<div className="absolute top-1/4 right-0
                w-48 sm:w-72 lg:w-96
                h-48 sm:h-72 lg:h-96
                bg-primary/5 rounded-full blur-3xl" />

<div className="absolute bottom-1/4 left-0
                w-40 sm:w-60 lg:w-80
                h-40 sm:h-60 lg:h-80
                bg-primary/10 rounded-full blur-3xl" />
```

**Valores de blur en uso:**
| Clase | Valor real | Uso |
|---|---|---|
| `backdrop-blur-md` | 12px | Navegación glass |
| `blur-3xl` | 48px | Elementos decorativos de fondo |

**Patrones de opacidad:**
| Clase | Opacidad | Uso |
|---|---|---|
| `bg-background/80` | 80% | Glass nav |
| `bg-primary/10` | 10% | Orbs decorativos |
| `bg-primary/5` | 5% | Orbs decorativos suaves |
| `bg-input/30` | 30% | Inputs modo oscuro |

---

## Border Radius

```css
--radius-sm: 4px   (0.25rem)   → rounded-sm
--radius-md: 6px   (0.375rem)  → rounded-md    ← botones, inputs
--radius-lg: 8px   (0.5rem)    → rounded-lg    ← base
--radius-xl: 12px  (0.75rem)   → rounded-xl    ← cards pequeñas
            16px  (1rem)       → rounded-2xl   ← cards grandes
            24px  (1.5rem)     → rounded-3xl   ← contenedores hero
            50%                → rounded-full  ← badges, avatares, pills
```

---

## Sombras

```css
shadow-xs                      /* Sutil: 0 1px 2px rgba(0,0,0,0.05) — cards, inputs */
shadow-sm                      /* Pequeña — elementos flotantes */
shadow-lg                      /* Grande — modales, dropdowns */
hover:shadow-lg hover:shadow-primary/5  /* Glow dorado en hover de cards */
```

---

## Gradientes

**Fondo del Hero Slider** (cambia entre slides):
```tsx
bg-gradient-to-br from-background via-background to-card
bg-gradient-to-br from-card via-background to-background
bg-gradient-to-br from-background via-card to-background
```

---

## Animaciones

```tsx
// Entrada de texto (Hero)
className="animate-in fade-in slide-in-from-left-4 duration-500"

// Transición de fondo del slider
className="transition-all duration-700"

// Hover general
className="transition-all duration-300"
className="transition-colors"

// Indicador de estado activo
className="animate-pulse"  // Punto verde en locations
```

---

## Variantes de Botones (shadcn/ui)

```tsx
variant="default"     // bg-primary text-primary-foreground hover:bg-primary/90
variant="destructive" // bg-destructive text-white
variant="outline"     // border bg-background hover:bg-accent dark:bg-input/30
variant="secondary"   // bg-secondary hover:bg-secondary/80
variant="ghost"       // hover:bg-accent dark:hover:bg-accent/50
variant="link"        // text-primary underline

size="default"  // h-9 px-4 py-2
size="sm"       // h-8 px-3
size="lg"       // h-10 px-6
size="icon"     // size-9 (cuadrado)
```

---

## Layout & Espaciado

**Contenedor base:**
```tsx
<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
```

**Secciones:**
```tsx
<section className="py-16 sm:py-20 lg:py-24">
```

**Grillas:**
```tsx
grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6   // Productos
grid lg:grid-cols-2 gap-8 lg:gap-16 items-center           // Historia/CTA
grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6          // Locaciones
```

**Max widths:**
| Clase | Valor |
|---|---|
| `max-w-sm` | 384px |
| `max-w-2xl` | 672px |
| `max-w-4xl` | 896px |
| `max-w-7xl` | 1280px |

---

## Estructura de Componentes Actual

```
components/
├── header.tsx           # Navegación fija con glass morphism
├── hero-slider.tsx      # Carrusel hero con auto-rotación
├── products-section.tsx # Grilla de productos
├── history-section.tsx  # Historia de la marca
├── locations-section.tsx# Ubicaciones del food truck
├── contact-section.tsx  # Formulario de contacto
├── order-cta.tsx        # Call-to-action para pedidos
├── footer.tsx           # Pie de página
├── theme-provider.tsx   # Proveedor de tema dark/light
└── ui/                  # 60+ componentes shadcn/ui
```

---

## Estructura Recomendada para App de Pedidos

Para construir la funcionalidad de pedidos sobre este proyecto, seguir esta estructura:

```
app/
├── (marketing)/         # Grupo: páginas públicas actuales
│   ├── page.tsx         # Landing page (actual)
│   └── layout.tsx
│
├── menu/                # Menú completo del food truck
│   ├── page.tsx         # Listado de categorías y productos
│   └── [categoria]/
│       └── page.tsx     # Productos por categoría
│
├── order/               # Flujo de pedido
│   ├── page.tsx         # Resumen del carrito
│   ├── checkout/
│   │   └── page.tsx     # Datos del cliente + método de pago
│   └── confirmation/
│       └── page.tsx     # Confirmación con número de pedido
│
├── track/               # Seguimiento en tiempo real
│   └── [orderId]/
│       └── page.tsx     # Estado del pedido
│
└── admin/               # Panel de administración (protegido)
    ├── layout.tsx        # Layout con auth check
    ├── page.tsx          # Dashboard de pedidos
    ├── menu/
    │   └── page.tsx      # CRUD del menú
    └── locations/
        └── page.tsx      # Gestión de ubicaciones

components/
├── menu/
│   ├── product-card.tsx       # Tarjeta de producto con add-to-cart
│   ├── category-filter.tsx    # Filtros de categoría
│   └── product-modal.tsx      # Modal detalle del producto
│
├── cart/
│   ├── cart-drawer.tsx        # Carrito lateral (Vaul drawer)
│   ├── cart-item.tsx          # Item individual del carrito
│   └── cart-summary.tsx       # Resumen de precios
│
├── order/
│   ├── checkout-form.tsx      # Formulario de checkout (RHF + Zod)
│   ├── order-tracker.tsx      # Seguimiento en tiempo real
│   └── order-status-badge.tsx # Badge de estado del pedido
│
└── admin/
    ├── orders-table.tsx       # Tabla de pedidos activos
    └── product-form.tsx       # Formulario CRUD de productos

lib/
├── utils.ts             # Ya existe — cn() helper
├── validations/
│   ├── order.ts         # Schemas Zod para pedidos
│   └── product.ts       # Schemas Zod para productos
├── store/
│   └── cart.ts          # Estado del carrito (Zustand o Context)
└── types/
    ├── menu.ts           # Types: Product, Category, etc.
    └── order.ts          # Types: Order, OrderStatus, etc.
```

### Tipos esenciales a definir primero (`lib/types/`)

```typescript
// menu.ts
interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  image?: string
  available: boolean
  extras?: Extra[]
}

// order.ts
interface Order {
  id: string
  items: OrderItem[]
  customer: { name: string; phone: string }
  total: number
  status: 'pending' | 'preparing' | 'ready' | 'delivered'
  pickupLocation?: string
  createdAt: Date
}
```

---

## Convenciones de Código

- **Funciones utilitarias:** usar `cn()` de `lib/utils.ts` para combinar clases
- **Componentes:** nombrar en PascalCase, archivos en kebab-case
- **Imports:** usar alias `@/` (configurado en tsconfig)
- **Formularios:** siempre React Hook Form + Zod (no validación manual)
- **Modales:** usar `Dialog` de shadcn/ui o `Vaul` para drawer en móvil
- **Notificaciones:** usar `sonner` toast (ya instalado)
- **Íconos:** solo Lucide React (no instalar otras librerías de íconos)
- **Imágenes:** siempre `next/image` con `width`/`height` o `fill`

---

## Breakpoints Responsive

```
mobile:   < 640px   (base)
sm:       ≥ 640px
md:       ≥ 768px
lg:       ≥ 1024px
xl:       ≥ 1280px
```

> El proyecto es **mobile-first**. Diseñar primero para móvil, luego escalar.
