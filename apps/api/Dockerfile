FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm install
COPY . .
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pos_saas?schema=public
RUN npm run db:generate --workspace @pos/api && npm run build --workspace @pos/api

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/api/dist ./apps/api/dist
COPY --from=base /app/apps/api/package.json ./apps/api/package.json
COPY --from=base /app/apps/api/prisma ./apps/api/prisma
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
