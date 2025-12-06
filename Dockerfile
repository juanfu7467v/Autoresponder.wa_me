# ✔ Imagen oficial Node.js
FROM node:20

# ✔ Crear carpeta
WORKDIR /app

# ✔ Copiar package.json
COPY package*.json ./

# ✔ Instalar dependencias
RUN npm install --production

# ✔ Copiar todo el proyecto
COPY . .

# ✔ Variables para autenticación GitHub
ARG GITHUB_TOKEN
ARG GITHUB_REPO

# ✔ Fly.io pasa los secrets automáticamente al build
ENV GITHUB_TOKEN=$GITHUB_TOKEN
ENV GITHUB_REPO=$GITHUB_REPO

# ✔ Exponer puerto
EXPOSE 3000

# ✔ Comando final
CMD ["npm", "start"]
