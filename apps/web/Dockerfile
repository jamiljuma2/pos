FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
RUN npm install
COPY . .
ENV NEXT_PUBLIC_API_URL=http://api:4000/api/v1
RUN npm run build --workspace @pos/web

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/web/.next/standalone ./
COPY --from=base /app/apps/web/.next/static ./.next/static
COPY --from=base /app/apps/web/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
