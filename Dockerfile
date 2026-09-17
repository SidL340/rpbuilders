# Multi-stage Docker build for R.P. Builders ERP
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY rp-builders-client/package*.json ./rp-builders-client/
RUN cd rp-builders-client && npm install

COPY rp-builders-server/package*.json ./rp-builders-server/
RUN cd rp-builders-server && npm install

# Copy source code and build client
COPY rp-builders-client/ ./rp-builders-client/
COPY rp-builders-server/ ./rp-builders-server/
COPY scripts/ ./scripts/
COPY package.json ./

RUN node scripts/build-cloud.js

# Production container
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy built server with synced static frontend
COPY --from=builder /app/rp-builders-server ./rp-builders-server
COPY --from=builder /app/package.json ./

EXPOSE 5000

CMD ["node", "rp-builders-server/server.js"]
