FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
COPY . .
RUN npm run build

# The compose file copies /app/dist into the shared nginx webroot volume.
CMD ["sh", "-c", "cp -r /app/dist/. /webroot/ 2>/dev/null || true"]
