FROM node:slim

# 这些占位符将在 GitHub Action 中被真实值替换
# action 环境变量未定义的此处会赋予空值，从而回退到index.js中的默认值
ENV UUID="__UUID__"
ENV NEZHA_SERVER="__NEZHA_SERVER__"
ENV NEZHA_PORT="__NEZHA_PORT__"
ENV NEZHA_KEY="__NEZHA_KEY__"
ENV ARGO_DOMAIN="__ARGO_DOMAIN__"
ENV ARGO_AUTH="__ARGO_AUTH__"
ENV CFIP="__CFIP__"
ENV CFPORT="__CFPORT__"
ENV NAME="__NAME__"

WORKDIR /app

COPY . .

EXPOSE 3000

RUN apt-get update -y && \
    chmod +x index.js && \
    npm install

CMD ["node", "index.js"]
