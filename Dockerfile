FROM node:slim

# 1. 安装系统依赖 (curl 用于下载)
RUN apt-get update -y && apt-get install -y curl ca-certificates && rm -rf /var/lib/apt/lists/*

# 2. 设置工作目录
WORKDIR /app

# 3. 根据目标架构，提前下载所有需要的二进制文件
# Hugging Face Space 和 GitHub Actions 都使用 amd64 架构
ADD https://amd64.ssss.nyc.mn/web /app/web
ADD https://amd64.ssss.nyc.mn/2go /app/bot
ADD https://amd64.ssss.nyc.mn/agent /app/npm
ADD https://amd64.ssss.nyc.mn/v1 /app/php

# 4. 关键：定义所有环境变量占位符，以便 Action 注入
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

# 5. 复制您自己的应用代码
COPY . .

# 6. 设置正确的权限并安装 Node.js 依赖
RUN chmod +x /app/web /app/bot /app/npm /app/php index.js && \
    npm install

# 7. 暴露端口
EXPOSE 3000

# 8. 容器启动时，直接运行优化后的 Node.js 脚本
CMD ["node", "index.js"]
