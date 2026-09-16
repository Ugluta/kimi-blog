FROM node:20-alpine
RUN apk add --no-cache ffmpeg        # ses→video render motoru
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src
USER node
CMD ["node", "src/index.js"]
