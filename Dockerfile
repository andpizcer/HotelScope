# Usa imagen oficial Puppeteer con Chromium y dependencias listas
FROM ghcr.io/puppeteer/puppeteer:latest

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