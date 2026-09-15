# =============================================================================
# DOCKERFILE: WEB DASHBOARD (REACT JS)
# Multi-Stage Build: Build Vite statis -> disajikan oleh Nginx Alpine ringan
# =============================================================================

# --- TAHAP 1: BUILD STAGE ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# --- TAHAP 2: SERVE DENGAN NGINX ---
FROM nginx:alpine

# Copy hasil build Vite dari tahap builder ke folder html Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
