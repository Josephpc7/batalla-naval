# ⚓ Batalla Naval — Multijugador

Juego de Batalla Naval en tiempo real con WebSockets.

---

## Estructura

```
battleship-server/   ← Backend Node.js  → despliega en Render
battleship-client/   ← Frontend HTML    → despliega en Vercel
```

---

## 1. Despliegue del servidor en Render

1. Sube la carpeta `battleship-server/` a un repositorio GitHub (puede ser privado).
2. Ve a [render.com](https://render.com) → **New → Web Service**
3. Conecta tu repositorio
4. Configura:
   - **Name:** `batalla-naval-server`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
5. Haz clic en **Create Web Service**
6. Render te dará una URL como: `https://batalla-naval-server.onrender.com`
   - **Guarda esta URL** — la necesitas para el siguiente paso

---

## 2. Configurar la URL del servidor en el frontend

Abre `battleship-client/index.html` y busca esta línea cerca del final:

```js
const SERVER_URL = window.BATTLESHIP_SERVER || 'wss://TU-SERVIDOR.onrender.com';
```

Reemplaza `TU-SERVIDOR.onrender.com` con la URL real de tu servidor Render:

```js
const SERVER_URL = window.BATTLESHIP_SERVER || 'wss://batalla-naval-server.onrender.com';
```

> **Importante:** usa `wss://` (WebSocket Secure), no `ws://` ni `https://`

---

## 3. Despliegue del frontend en Vercel

### Opción A — Drag & Drop (más fácil)
1. Ve a [vercel.com](https://vercel.com)
2. Haz clic en **New Project → Browse** y sube la carpeta `battleship-client/`
3. Vercel detectará automáticamente que es un sitio estático
4. Clic en **Deploy**

### Opción B — CLI
```bash
npm i -g vercel
cd battleship-client
vercel --prod
```

---

## 4. ¡A jugar!

- Comparte la URL de Vercel con tu rival
- Uno crea sala → copia el código de 4 letras → lo comparte
- El otro pega el código y se une
- O ambos usan **Partida Rápida** para emparejarse automáticamente

---

## Características

- 🎮 **Multijugador en tiempo real** via WebSockets
- 🔑 **Sala privada** con código de 4 letras
- 🎲 **Matchmaking aleatorio**
- 💬 **Chat en tiempo real** durante toda la partida
- ♟ **Colocación manual o aleatoria** de barcos
- 📊 **Estadísticas** de precisión, impactos, hundidos
- ⚔ **Validación server-side** de todos los movimientos
- 🔄 **Revancha** sin salir de la sala
- 💀 **Detección de desconexión** del rival

---

## Desarrollo local

```bash
# Servidor
cd battleship-server
npm install
npm start   # Puerto 3001

# Cliente — abre directamente en el navegador
# Cambia SERVER_URL a: ws://localhost:3001
```

---

## Notas sobre Render Free

- El servidor se "duerme" tras 15 min de inactividad
- Primera conexión puede tardar 30-60 segundos en despertar
- Para producción seria considera el plan Starter ($7/mes)
