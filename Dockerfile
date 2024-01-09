FROM node:16-alpine
WORKDIR /app
COPY . .
WORKDIR /app/src
RUN npm install .
ENTRYPOINT [ "node","cli.js" ]