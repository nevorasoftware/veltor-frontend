# ------------------------------------------------------------------------------
# VELTOR Frontend — Dockerfile Multistage de Producción (Vite + Nginx)
# Desarrollado por Nevora Software
# ------------------------------------------------------------------------------

# Etapa 1: Compilación de la aplicación React
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Construcción de la aplicación Vite
RUN npm run build

# Etapa 2: Servidor web ultraligero Nginx
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
