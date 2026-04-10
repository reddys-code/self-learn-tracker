FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client ./
RUN npm run build

FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev
COPY server ./

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000
COPY --from=server-builder /app/server ./server
COPY --from=client-builder /app/client/dist ./client/dist
EXPOSE 5000
CMD ["node", "server/src/server.js"]
