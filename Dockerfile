FROM node:20-alpine

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=5173 \
    TRUST_PROXY=true \
    TSUMORI_DATA_DIR=/app/data

WORKDIR /app

COPY package.json server.js server-db.js index.html ./
COPY css ./css
COPY js ./js

RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5173/healthz >/dev/null || exit 1

CMD ["node", "server.js"]
