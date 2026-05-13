FROM node:20-alpine
WORKDIR /app

# native add-ons (better-sqlite3) need build tools
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

RUN mkdir -p data

EXPOSE 3001
CMD ["node", "dist/index.js"]
