# Etapa base
FROM node:22-alpine AS base
WORKDIR /app

# Etapa de dependencias
FROM base AS deps
# Instalar dependencias necesarias para build (opcional, solo si llegas a necesitarlas)
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci

# Etapa de build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Genera el build de producción de Next.js
RUN npm run build

# Etapa de runtime
FROM base AS runner
ENV NODE_ENV=production

# Si quieres cambiar el puerto interno, ajusta aquí PORT
# Por defecto Next usa 3000
ENV PORT=3000

WORKDIR /app

# Copiamos solo lo necesario del build
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Expone el puerto interno del contenedor
EXPOSE 3000

# Comando de arranque (puede usar PORT si lo cambias por env externa)
CMD ["npm","run","start"]
