# Imagen oficial de Node.js (mínimo Debian 12 para compatibilidad con Chromium ARM64 y x86_64)
FROM node:18-slim

# Variables necesarias para Puppeteer y Chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    NODE_ENV=production \
    PORT=8080

# Instalar dependencias necesarias para Chromium
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
    --no-install-recommends && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Crear y usar directorio de app
WORKDIR /app

# Copiar dependencias e instalar
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copiar el resto de los archivos
COPY . .

# Build de la app (Next.js, etc.)
RUN npm run build

# Exponer puerto y definir comando de inicio
EXPOSE 8080
CMD ["npm", "start"]