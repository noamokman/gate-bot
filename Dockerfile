FROM node:22-alpine as base
WORKDIR /service

FROM base as dependencies
COPY package.json yarn.lock tsconfig.json ./
RUN yarn --pure-lockfile --production true

FROM dependencies as build
RUN yarn --pure-lockfile --production false
COPY src ./src

RUN yarn build

FROM base as release
COPY --from=dependencies /service/node_modules ./node_modules
COPY --from=dependencies /service/package.json ./package.json
COPY --from=build /service/dist ./dist

ARG BUILD_VERSION=0.0.0
ENV NODE_ENV=production
ENV BUILD_VERSION=$BUILD_VERSION

CMD [ "node", "dist/index.js" ]