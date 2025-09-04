FROM node:slim

RUN apt-get update -y && apt-get install -y curl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ADD https://amd64.ssss.nyc.mn/web /app/web
ADD https://amd64.ssss.nyc.mn/2go /app/bot
ADD https://amd64.ssss.nyc.mn/agent /app/npm
ADD https://amd64.ssss.nyc.mn/v1 /app/php

ENV UUID="__UUID__"
ENV NEZHA_SERVER="__NEZHA_SERVER__"
ENV NEZHA_PORT="__NEZHA_PORT__"
ENV NEZHA_KEY="__NEZHA_KEY__"
ENV ARGO_DOMAIN="__ARGO_DOMAIN__"
ENV ARGO_AUTH="__ARGO_AUTH__"
ENV CFIP="__CFIP__"
ENV CFPORT="__CFPORT__"
ENV NAME="__NAME__"
ENV UPLOAD_URL="__UPLOAD_URL__"
ENV PROJECT_URL="__PROJECT_URL__"
ENV AUTO_ACCESS="__AUTO_ACCESS__"
ENV FILE_PATH="__FILE_PATH__"
ENV SUB_PATH="__SUB_PATH__"
ENV PORT="__PORT__"
ENV ARGO_PORT="__ARGO_PORT__"

COPY . .

RUN chmod +x /app/web /app/bot /app/npm /app/php index.js && \
    npm install

RUN chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "index.js"]
