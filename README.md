# Yappy Dashboard

Panel personal móvil para visualizar transacciones Yappy desde Gmail → Notion.

## Stack
- **Next.js 14** (App Router)
- **Notion** como base de datos
- **Vercel** para deploy
- **PWA** para instalarlo en el celular

## Setup

### 1. Clonar e instalar
```bash
git clone https://github.com/tu-usuario/yappy-dashboard.git
cd yappy-dashboard
npm install
```

### 2. Variables de entorno
Copia `.env.local.example` a `.env.local` y llena los valores:
```bash
cp .env.local.example .env.local
```

Necesitas:
- `NOTION_TOKEN`: En notion.so → Settings → Connections → Develop or manage integrations
- `NOTION_DATABASE_ID`: El ID de la DB "Yappy Transacciones" (ya creada)

### 3. Correr localmente
```bash
npm run dev
# Abre http://localhost:3000
```

### 4. Deploy en Vercel
```bash
# Instala Vercel CLI
npm i -g vercel

# Deploy
vercel

# Agrega las env vars en vercel.com → tu proyecto → Settings → Environment Variables
```

## Módulos planeados
- [ ] `/dashboard` — Resumen Yappy ✅
- [ ] `/gastos` — Categorías y presupuesto
- [ ] `/sync` — Sincronización manual con Gmail
- [ ] `/reportes` — Gráficas mensuales

## Uso desde Claude
Para sincronizar tus correos de Yappy, abre Claude y dile:
> "Busca en mi Gmail los correos de Yappy de esta semana y guárdalos en Notion usando el endpoint `/api/sync`"

## Estructura del proyecto
```
src/
  app/
    _components/    # Componentes UI
    api/
      transactions/ # GET resumen
      sync/         # POST guardar transacciones
    dashboard/      # Pantalla principal
  lib/
    notion.ts       # Cliente Notion
    queries.ts      # Todas las queries a la DB
  types/
    yappy.ts        # Tipos TypeScript
```
