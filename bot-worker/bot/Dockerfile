FROM node:20-slim

# ffmpeg required by @discordjs/voice for audio transcoding
RUN apt-get update && apt-get install -y ffmpeg python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]
