FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /app

COPY package*.json ./

USER root

# Instalar dependencias adicionales de Chromium/librerías básicas
RUN apt-get update && apt-get install -y \
    libnss3 \
    libgconf-2-4 \
    libasound2 \
    libxss1 \
    libgtk-3-0 \
    libnotify4 \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

RUN npm install --legacy-peer-deps

USER pptruser

COPY --chown=pptruser:pptruser . .

RUN npm run build

ENV PORT=8080
EXPOSE 8080

CMD ["npx", "next", "start", "-p", "8080"]