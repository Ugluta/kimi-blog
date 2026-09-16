FROM node:20-alpine
WORKDIR /app
# bcrypt native derleme gerektirir; gerekirse: apk add --no-cache python3 make g++
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src
EXPOSE 3000
USER node
CMD ["node", "src/index.js"]
