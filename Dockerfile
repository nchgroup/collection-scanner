FROM node:16-alpine
WORKDIR /app
COPY . .
WORKDIR /app/src
RUN npm install . && chown -R node:node /app
USER node
ENTRYPOINT [ "node","cli.js" ]