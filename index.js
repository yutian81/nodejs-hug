const express = require("express");
const app = express();
const axios = require("axios");
const os = require('os');
const fs = require("fs");
const path = require("path");
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const { execSync } = require('child_process');

// --- 环境变量 ---
const UPLOAD_URL = process.env.UPLOAD_URL || '';
const PROJECT_URL = process.env.PROJECT_URL || '';
const AUTO_ACCESS = process.env.AUTO_ACCESS || false;
const FILE_PATH = process.env.FILE_PATH || './tmp';
const SUB_PATH = process.env.SUB_PATH || 'sub';
const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;
const UUID = process.env.UUID || '9afd1229-b893-40c1-84dd-51e7ce204913';
const NEZHA_SERVER = process.env.NEZHA_SERVER || '';
const NEZHA_PORT = process.env.NEZHA_PORT || '';
const NEZHA_KEY = process.env.NEZHA_KEY || '';
const ARGO_DOMAIN = process.env.ARGO_DOMAIN || '';
const ARGO_AUTH = process.env.ARGO_AUTH || '';
const ARGO_PORT = process.env.ARGO_PORT || 8001;
const CFIP = process.env.CFIP || 'time.is';
const CFPORT = process.env.CFPORT || 443;
const NAME = process.env.NAME || 'Hug';

// --- 文件路径常量 ---
const subPath = path.join(FILE_PATH, 'sub.txt');
const bootLogPath = path.join(FILE_PATH, 'boot.log');
const configPath = path.join(FILE_PATH, 'config.json');

// --- 异步工具函数 ---
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- 核心业务逻辑 ---

function initialCleanup() {
    console.log("[INIT] 正在执行初始化清理...");
    const filesToClean = [bootLogPath, subPath];
    filesToClean.forEach(file => {
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
            console.log(`[INIT] 已删除旧文件: ${file}`);
        }
    });
}

function prepareXrayConfig() {
    console.log("[XRAY] 正在准备配置文件...");
    const config = {
        log: { access: '/dev/null', error: '/dev/null', loglevel: 'none' },
        inbounds: [
            { port: ARGO_PORT, protocol: 'vless', settings: { clients: [{ id: UUID, flow: 'xtls-rprx-vision' }], decryption: 'none', fallbacks: [{ dest: 3001 }, { path: "/vless-argo", dest: 3002 }, { path: "/vmess-argo", dest: 3003 }, { path: "/trojan-argo", dest: 3004 }] }, streamSettings: { network: 'tcp' } },
            { port: 3001, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: UUID }], decryption: "none" }, streamSettings: { network: "tcp", security: "none" } },
            { port: 3002, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: UUID, level: 0 }], decryption: "none" }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/vless-argo" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
            { port: 3003, listen: "127.0.0.1", protocol: "vmess", settings: { clients: [{ id: UUID, alterId: 0 }] }, streamSettings: { network: "ws", wsSettings: { path: "/vmess-argo" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
            { port: 3004, listen: "127.0.0.1", protocol: "trojan", settings: { clients: [{ password: UUID }] }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/trojan-argo" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
        ],
        dns: { servers: ["https+local://8.8.8.8/dns-query"] },
        outbounds: [{ protocol: "freedom", tag: "direct" }, { protocol: "blackhole", tag: "block" }]
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`[XRAY] 配置文件已成功写入: ${configPath}`);
}

function prepareArgoConfig() {
    if (!ARGO_AUTH || !ARGO_DOMAIN || !ARGO_AUTH.includes('TunnelSecret')) {
        console.log("[ARGO] 未提供固定隧道密钥或域名，将使用临时隧道。");
        return;
    }
    console.log("[ARGO] 检测到固定隧道密钥，正在生成配置文件...");
    fs.writeFileSync(path.join(FILE_PATH, 'tunnel.json'), ARGO_AUTH);
    const tunnelIdMatch = ARGO_AUTH.match(/"TunnelID":"([^"]+)"/);
    if (!tunnelIdMatch) {
        console.error("[ARGO] 无法从密钥中解析 TunnelID！");
        return;
    }
    const tunnelYaml = `
tunnel: ${tunnelIdMatch[1]}
credentials-file: ${path.join(FILE_PATH, 'tunnel.json')}
protocol: http2
ingress:
  - hostname: ${ARGO_DOMAIN}
    service: http://localhost:${ARGO_PORT}
    originRequest:
      noTLSVerify: true
  - service: http_status:404
`;
    fs.writeFileSync(path.join(FILE_PATH, 'tunnel.yml'), tunnelYaml);
    console.log("[ARGO] 固定隧道配置文件 tunnel.yml 已生成。");
}

async function startBackgroundServices() {
    console.log("\n--- 正在启动后台服务 ---");

    // 注意：这里的路径是相对于 /app 的，因为二进制文件都在那里
    const npmPath = './npm';
    const phpPath = './php';
    const webPath = './web';
    const botPath = './bot';

    if (NEZHA_SERVER && NEZHA_KEY) {
        let nezhaCommand;
        if (NEZHA_PORT) {
            const tlsPorts = ['443', '8443', '2096', '2087', '2083', '2053'];
            const nezhaTls = tlsPorts.includes(NEZHA_PORT) ? '--tls' : '';
            nezhaCommand = `nohup ${npmPath} -s ${NEZHA_SERVER}:${NEZHA_PORT} -p ${NEZHA_KEY} ${nezhaTls} >/dev/null 2>&1 &`;
        } else {
            const port = NEZHA_SERVER.includes(':') ? NEZHA_SERVER.split(':').pop() : '';
            const tlsPorts = new Set(['443', '8443', '2096', '2087', '2083', '2053']);
            const nezhaTls = tlsPorts.has(port) ? 'true' : 'false';
            const configYaml = `
client_secret: ${NEZHA_KEY}
debug: false
disable_auto_update: true
server: ${NEZHA_SERVER}
tls: ${nezhaTls}
uuid: ${UUID}`;
            fs.writeFileSync(path.join(FILE_PATH, 'config.yaml'), configYaml);
            nezhaCommand = `nohup ${phpPath} -c "${path.join(FILE_PATH, 'config.yaml')}" >/dev/null 2>&1 &`;
        }
        try {
            await exec(nezhaCommand);
            console.log("[NEZHA] Agent 进程已启动。");
        } catch (error) {
            console.error(`[NEZHA] Agent 启动失败: ${error}`);
        }
    } else {
        console.log("[NEZHA] 未配置相关变量，跳过启动 Agent。");
    }

    try {
        await exec(`nohup ${webPath} -c ${configPath} >/dev/null 2>&1 &`);
        console.log("[XRAY] Xray 进程已启动。");
    } catch (error) {
        console.error(`[XRAY] Xray 启动失败: ${error}`);
    }
    
    let argoCommand;
    if (ARGO_AUTH && ARGO_DOMAIN) {
        if (ARGO_AUTH.match(/^[A-Z0-9a-z=]{120,250}$/)) {
            argoCommand = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${ARGO_AUTH}`;
        } else if (ARGO_AUTH.includes('TunnelSecret')) {
            argoCommand = `tunnel --edge-ip-version auto --config ${path.join(FILE_PATH, 'tunnel.yml')} run`;
        }
    }
    if (!argoCommand) {
        argoCommand = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile ${bootLogPath} --loglevel info --url http://localhost:${ARGO_PORT}`;
    }
    
    try {
        await exec(`nohup ${botPath} ${argoCommand} >/dev/null 2>&1 &`);
        console.log("[ARGO] Argo Tunnel 进程已启动。");
    } catch (error) {
        console.error(`[ARGO] Argo Tunnel 启动失败: ${error}`);
    }
}

async function getArgoDomain() {
    console.log("\n--- 正在获取 Argo Tunnel 域名 ---");
    if (ARGO_DOMAIN) {
        console.log(`[ARGO] 使用配置的固定域名: ${ARGO_DOMAIN}`);
        return ARGO_DOMAIN;
    }
    const maxRetries = 15;
    const retryDelay = 2000;
    for (let i = 0; i < maxRetries; i++) {
        console.log(`[ARGO] 正在尝试读取日志... (第 ${i + 1} 次)`);
        if (fs.existsSync(bootLogPath)) {
            const logContent = fs.readFileSync(bootLogPath, 'utf-8');
            const domainMatch = logContent.match(/https?:\/\/([^ ]*trycloudflare\.com)/);
            if (domainMatch) {
                const domain = domainMatch[1];
                console.log(`[ARGO] 成功从日志中获取临时域名: ${domain}`);
                return domain;
            }
        }
        await delay(retryDelay);
    }
    console.error("[ARGO] 错误：在 30 秒内未能获取到 Argo 临时域名！");
    return null;
}

async function generateAndServeLinks(argoDomain) {
    if (!argoDomain) {
        console.error("无法生成节点链接，因为没有获取到 Argo 域名。");
        return;
    }
    console.log("\n--- 正在生成节点和订阅链接 ---");
    
    const metaInfo = execSync(
        'curl -s https://speed.cloudflare.com/meta | awk -F\\" \'{print $26"-"$18}\' | sed -e \'s/ /_/g\'',
        { encoding: 'utf-8' }
    ).trim();
    const ISP = metaInfo || "Cloudflare";

    const vmessConfig = { v: '2', ps: `${NAME}-${ISP}`, add: CFIP, port: CFPORT, id: UUID, aid: '0', scy: 'none', net: 'ws', type: 'none', host: argoDomain, path: '/vmess-argo?ed=2560', tls: 'tls', sni: argoDomain, alpn: '' };
    
    const subContent = `
vless://${UUID}@${CFIP}:${CFPORT}?encryption=none&security=tls&sni=${argoDomain}&type=ws&host=${argoDomain}&path=%2Fvless-argo%3Fed%3D2560#${NAME}-${ISP}
vmess://${Buffer.from(JSON.stringify(vmessConfig)).toString('base64')}
trojan://${UUID}@${CFIP}:${CFPORT}?security=tls&sni=${argoDomain}&type=ws&host=${argoDomain}&path=%2Ftrojan-argo%3Fed%3D2560#${NAME}-${ISP}
    `.trim();

    const base64Sub = Buffer.from(subContent).toString('base64');
    fs.writeFileSync(subPath, base64Sub);
    console.log(`[SUB] 订阅文件已保存到 ${subPath}`);
    console.log(`[SUB] 您的 Base64 订阅内容:\n${base64Sub}`);

    app.get(`/${SUB_PATH}`, (req, res) => {
        res.set('Content-Type', 'text/plain; charset=utf-8');
        res.send(base64Sub);
    });
    console.log(`[HTTP] 订阅服务已在路径 /${SUB_PATH} 上启动。`);

    return subContent.split('\n').filter(Boolean);
}

async function uploadData(nodes) {
    if (!UPLOAD_URL || !nodes || nodes.length === 0) {
        return;
    }
    console.log("\n--- 正在上传数据到订阅器 ---");
    try {
        if (PROJECT_URL) {
            console.log("[UPLOAD] 正在上传订阅地址...");
            const subscriptionUrl = `${PROJECT_URL.replace(/\/$/, '')}/${SUB_PATH}`;
            await axios.post(`${UPLOAD_URL}/api/add-subscriptions`, { subscription: [subscriptionUrl] }, { headers: { 'Content-Type': 'application/json' } });
            console.log(`[UPLOAD] 订阅地址 ${subscriptionUrl} 上传成功。`);
        } else {
            console.log("[UPLOAD] 正在上传节点列表...");
            await axios.post(`${UPLOAD_URL}/api/add-nodes`, { nodes }, { headers: { 'Content-Type': 'application/json' } });
            console.log(`[UPLOAD] ${nodes.length} 个节点上传成功。`);
        }
    } catch (error) {
        const status = error.response ? error.response.status : 'N/A';
        if (status === 400) {
            console.log(`[UPLOAD] 上传失败 (状态码 400)，数据可能已存在。`);
        } else {
            console.error(`[UPLOAD] 上传时发生错误 (状态码 ${status}): ${error.message}`);
        }
    }
}

async function addKeepAliveTask() {
    if (!AUTO_ACCESS || !PROJECT_URL) {
        return;
    }
    console.log("\n--- 正在添加自动保活任务 ---");
    try {
        await axios.post('https://oooo.serv00.net/add-url', { url: PROJECT_URL }, { headers: { 'Content-Type': 'application/json' } });
        console.log(`[KEEPALIVE] 自动保活任务已成功为 ${PROJECT_URL} 添加。`);
    } catch (error) {
        console.error(`[KEEPALIVE] 添加保活任务失败: ${error.message}`);
    }
}

// --- 主函数 ---
async function main() {
    // 确保运行目录存在
    if (!fs.existsSync(FILE_PATH)) {
        fs.mkdirSync(FILE_PATH, { recursive: true });
    }
    
    // 关键修复：移除了错误的 `process.chdir()` 调用

    initialCleanup();
    prepareXrayConfig();
    prepareArgoConfig();
    await startBackgroundServices();
    const argoDomain = await getArgoDomain();
    const nodes = await generateAndServeLinks(argoDomain);
    await uploadData(nodes);
    await addKeepAliveTask();

    console.log("\n=============================================");
    console.log("     所有服务已启动，应用正在运行！");
    console.log(`     HTTP 服务监听于端口: ${PORT}`);
    console.log("=============================================");
}

// --- 程序入口 ---
app.get("/", (req, res) => res.send("Hello, this is the application index."));
app.listen(PORT, () => {
    console.log(`HTTP 服务器已在端口 ${PORT} 上启动。`);
    main().catch(err => {
        console.error("应用主程序发生致命错误:", err);
        process.exit(1);
    });
});
