FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /app

# Copia package.json y package-lock.json
COPY package*.json ./

# Cambia a root para instalar dependencias y evitar problemas de permisos
USER root

RUN npm install --legacy-peer-deps

# Cambia de nuevo a pptruser por seguridad para ejecutar la app
USER pptruser

COPY --chown=pptruser:pptruser . .

RUN npm run build

ENV PORT=8080
EXPOSE 8080

CMD ["npx", "next", "start", "-p", "8080"]
