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

# Argumentos y variables para el build de Vite
ARG VITE_API_URL=https://veltor-backend-production.up.railway.app/api/v1
ARG VITE_CONTACT_PHONE=""
ARG VITE_CONTACT_EMAIL=""
ARG VITE_CONTACT_HOURS=""
ARG VITE_PAYMENTS_EMAIL=""
ARG VITE_PAYMENTS_WHATSAPP=""
ARG VITE_BANK_ACCOUNTS=""
ARG VITE_BANK_ACCOUNT_HOLDER=""
ENV VITE_API_URL=$VITE_API_URL \
    VITE_CONTACT_PHONE=$VITE_CONTACT_PHONE \
    VITE_CONTACT_EMAIL=$VITE_CONTACT_EMAIL \
    VITE_CONTACT_HOURS=$VITE_CONTACT_HOURS \
    VITE_PAYMENTS_EMAIL=$VITE_PAYMENTS_EMAIL \
    VITE_PAYMENTS_WHATSAPP=$VITE_PAYMENTS_WHATSAPP \
    VITE_BANK_ACCOUNTS=$VITE_BANK_ACCOUNTS \
    VITE_BANK_ACCOUNT_HOLDER=$VITE_BANK_ACCOUNT_HOLDER

# Construcción de la aplicación Vite
RUN npm run build

# Etapa 2: Servidor web ultraligero Nginx
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
EXPOSE 8080

# Arranque dinámico compatible con cualquier puerto asignado por Railway ($PORT, 8080 u 80)
CMD ["/bin/sh", "-c", "if [ -n \"$PORT\" ] && [ \"$PORT\" != \"80\" ] && [ \"$PORT\" != \"8080\" ]; then sed -i \"/listen 80;/a \\    listen $PORT;\" /etc/nginx/conf.d/default.conf; fi; exec nginx -g 'daemon off;'"]
