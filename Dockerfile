FROM node:slim

# 这些占位符将在 GitHub Action 中被真实值替换
# action 未设置的环境变量，此处会赋予空值，从而回退到index.js中的默认值
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

WORKDIR /app

COPY . .

EXPOSE 3000

RUN apt-get update -y && \
    chmod +x index.js && \
    npm install

CMD ["node", "index.js"]
