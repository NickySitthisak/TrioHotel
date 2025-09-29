# Dockerfile
# build stage: install dependencies
FROM node:22-alpine AS deps
WORKDIR /app
# copy only dependency manifests first (cache)
COPY package*.json ./
# install production deps only
RUN npm ci --production

# final stage
FROM node:22-alpine
WORKDIR /app

# copy installed deps from deps stage
COPY --from=deps /app/node_modules ./node_modules

# copy source
COPY . .

# set env
ENV NODE_ENV=production
ENV PORT=4000

# create logs dir and give permission (optional)
RUN mkdir -p /app/logs && chown -R node:node /app

# use non-root user
USER node

EXPOSE 4000

# start app
CMD ["node", "src/index.js"]
