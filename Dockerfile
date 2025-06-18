# Usa una imagen base ligera con Node.js
FROM node:18-slim

# Instala librerías necesarias para Chromium (puppeteer)
RUN apt-get update && apt-get install -y \
    gconf-service \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    libdrm2 \
    libgbm1 \
    libxshmfence1 \
    ca-certificates \
    fonts-liberation \
    libnss3 \
    lsb-release \
    xdg-utils \
    wget \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Establece el directorio de trabajo
WORKDIR /app

# Copia solo package.json y package-lock.json primero (para mejor caching)
COPY package*.json ./

# Instala dependencias Node.js
RUN npm install --legacy-peer-deps

# Copia el resto de tu app
COPY . .

# Construye tu proyecto Next.js
RUN npm run build

# Expone el puerto esperado por Cloud Run
ENV PORT 8080
EXPOSE 8080

# Inicia la aplicación Next.js en modo producción
CMD ["npx", "next", "start", "-p", "8080"]