# Base oficial Node.js (Debian slim)
FROM node:20-slim

# Variables de entorno
ENV NODE_ENV=production \
    PORT=8080

# Instalar dependencias necesarias para Chromium + Chromium mismo
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    wget \
    chromium \
    --no-install-recommends && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Definir ruta de Chromium (necesario para Puppeteer)
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Crear directorio app y establecerlo
WORKDIR /app

# Copiar package.json e instalar dependencias (sin ignorar peer deps)
COPY package*.json ./
RUN npm install

# Copiar resto del código
COPY . .

# Construir la app (Next.js o la que sea)
RUN npm run build

# Exponer puerto
EXPOSE 8080

# Comando para iniciar (debes usar flags en Puppeteer en tu código)
CMD ["npm", "start"]