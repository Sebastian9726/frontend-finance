# frontend-finance

Cliente web de la aplicación de finanzas personales: ingresos, gastos, activos y
deudas, para responder **¿cómo voy financieramente en el tiempo?**

**Vite** · **React 19** · **TypeScript** · **Tailwind** · **shadcn/ui** · **pnpm**

La API vive en un repo aparte:
[backend-finance](https://github.com/Sebastian9726/backend-finance).

---

## Arranque

Requisitos: Node 20+ y pnpm. **pnpm, no npm.**

```bash
pnpm install
pnpm dev      # http://localhost:5173
```

Necesitas la API corriendo en el puerto 8000: en desarrollo `vite.config.ts`
hace proxy de `/api` y `/health` hacia `http://127.0.0.1:8000`, así que todo
parece mismo origen y no hace falta configurar nada.

> **Usa `localhost:5173`, no `127.0.0.1:5173`.** Vite se enlaza a `localhost`,
> que en Windows resuelve a IPv6 (`::1`); el `127.0.0.1` queda sin escuchar y el
> navegador responde `ERR_CONNECTION_REFUSED`. (Si necesitas IPv4 explícito,
> añade `host: '127.0.0.1'` a `server` en `vite.config.ts`.)

```bash
pnpm test     # 21 pruebas de money.ts
pnpm build    # tsc -b && vite build
```

La configuración de pnpm 11 vive en `pnpm-workspace.yaml` (clave `allowBuilds`),
no en el campo `pnpm` del `package.json`, que dejó de leerse.

---

## Decisiones que conviene conocer antes de tocar el código

### El dinero es un entero de centavos, nunca un `float`

La API envía y recibe los montos como **string** (`"1234567.89"`), no como
número: `JSON.parse` convertiría un número a `double` antes de que podamos
intervenir. `src/lib/money.ts` es **el único archivo que conoce el ×100** y
encapsula el tipo `Money`.

Tres reglas:

1. Ningún componente lee `.units` ni multiplica por 100 por su cuenta.
2. La moneda viaja pegada al monto; `add()` **lanza** si se mezclan monedas.
3. La división es solo para mostrar (`percentOf()` devuelve `number`); ese
   resultado jamás vuelve a ser `Money` ni se envía al backend.

`parseFloat` sobre un monto es un bug. Los agregados se calculan **en SQL**, no
sumando filas en JavaScript.

### El `monto` va con signo

Positivo en un ingreso, negativo en un gasto — así el saldo es literalmente
`saldo_inicial + SUM(monto)`. La API recibe y devuelve el mismo signo; los
formularios reciben cantidades positivas y **ponen el signo justo antes de
enviar**.

### Las fechas se manipulan como texto

`new Date(iso)` lee la cadena como UTC medianoche, y en Colombia (UTC-5)
retrocede un día: un gasto del 1 de junio se mostraba el 31 de mayo. Por eso
`src/lib/dates.ts` trabaja sobre la cadena, sin construir un `Date`.

### Autenticación

- El *access token* vive **en memoria**, no en `localStorage`, y viaja como
  header `Bearer`.
- El *refresh token* va en una cookie `httpOnly` que el JS nunca ve.
- **Cola de refresco de una sola petición** (`src/lib/api.ts`). Sin ella, un
  tablero que dispara cinco consultas con el token vencido lanzaría cinco
  refrescos; como la rotación revoca el anterior en cada canje, los rezagados
  presentarían un token ya revocado, el backend lo leería como reuso y
  **cerraría la sesión del usuario**.
- **`VITE_API_URL` es build-time**: cambiar de ambiente exige recompilar. En
  desarrollo se deja vacía para usar el proxy.

---

## Datos de prueba

Con el backend arriba y su `scripts/seed_demo.py` ejecutado, entra con
`demo@ejemplo.com` / `demo-finanzas-2026`.

---

## Estado

- [x] **Fase 0** — Andamiaje: Vite, Tailwind, `money.ts`
- [x] **Fase 1** — Auth, cuentas, categorías, movimientos y tablero
- [ ] **Fase 2** — Activos, deudas y patrimonio neto en el tiempo
- [ ] **Fase 3** — Presupuestos y metas
- [ ] **Fase 4** — Transacciones recurrentes e importación CSV
- [ ] **Fase 5** — Autocategorización y asistente conversacional
- [ ] **Fase 6** — Despliegue
