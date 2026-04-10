FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serveur Nginx léger pour les fichiers statiques
FROM nginx:alpine

# Config Nginx avec proxy API vers le backend
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && chown appuser:appuser /var/run/nginx.pid
USER appuser

CMD ["nginx", "-g", "daemon off;"]
