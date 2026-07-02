FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --chown=node:node server.js index.html admin.html ./
COPY --chown=node:node lib ./lib
COPY --chown=node:node data ./data
COPY --chown=node:node css/store.css ./css/store.css
COPY --chown=node:node css/admin.css ./css/admin.css
COPY --chown=node:node js/store.js ./js/store.js
COPY --chown=node:node js/admin.js ./js/admin.js
COPY --chown=node:node images ./images

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
