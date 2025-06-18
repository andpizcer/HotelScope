# Usa la imagen oficial de Puppeteer con Node.js y Chromium listos
FROM ghcr.io/puppeteer/puppeteer:latest

# Establece el directorio de trabajo
WORKDIR /app

# Copia solo los archivos de dependencias para aprovechar cache
COPY package*.json ./

# Instala las dependencias (usa legacy-peer-deps si lo necesitas)
RUN npm install --legacy-peer-deps

# Copia el resto del código de la aplicación
COPY . .

# Construye el proyecto Next.js
RUN npm run build

# Define el puerto que usa la app
ENV PORT 8080
EXPOSE 8080

# Comando para iniciar la aplicación en producción
CMD ["npx", "next", "start", "-p", "8080"]
