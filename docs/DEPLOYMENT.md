# 在线试玩部署

服务需要 Node.js 20+，无生产 npm 依赖。发布只需 index.html、game.js、style.css、package.json、src、assets、vendor，以及 scripts/serve.cjs、scripts/leaderboard.cjs。

| 环境变量 | 用途 |
|---|---|
| HOST | 默认 127.0.0.1，仅绑定可信代理可访问的地址 |
| PORT | 默认 8766 |
| MC_DATA_DIR | 游戏目录之外的持久数据目录 |
| MC_PUBLIC_ORIGIN | 代理对外的协议、域名、端口，不带路径 |
| MC_TRUST_PROXY=1 | 仅在可信代理前置、监听地址受限时启用，使用代理提供的客户端 IP 限流 |

执行 `node scripts/serve.cjs`。建议用独立低权限账户、systemd、内存上限、只读应用目录，只允许数据目录写入。每个数据目录只能运行一个进程。

排行榜文件 MC_DATA_DIR/leaderboard.json 原子保存，备份此文件可保留身份和成绩。不要清理、公开或提交它。替换代码版本时数据目录不变。

## 子路径代理

将下列 Caddy 规则加到已有站点，保留原先其他路由。Docker 代理需把回环地址改为可访问的宿主桥接地址：

```caddy
redir /mc-block-launch /mc-block-launch/ 308
handle_path /mc-block-launch/* {
    reverse_proxy 127.0.0.1:8770
}
```

脚本、素材与 API 使用相对路径；代理移除游戏路径前缀并传递真实 Host。没有第三方统计或登录服务。

发布检查：主页、模块、OGG、PNG 返回 200；api/health 返回版本；昵称、改名、上传、查询成功；私有目录返回 404；重启仍保留成绩；原站点仍可访问。公网验证还需核对公共 DNS、路由器映射，并用手机移动数据或其他外网测试，不能只依赖局域网 hosts 解析。

排行榜是客户端上报的朋友试玩榜，不承诺防作弊，不用于付费或有奖竞赛。

## 当前服务器

- 地址：https://qcya.fun:8443/mc-block-launch/ 。家庭宽带无 NAT 回环，局域网校验需指定服务器 LAN 地址并保留域名 SNI；外网由用户实际测试。
- 服务：mc-block-launch.service，DynamicUser，256 MB 内存上限，只读应用目录。
- 代码：/srv/mc-block-launch/current 符号链接指向 releases 中带版本与时间戳的发布目录，具体路径及文件哈希见 evidence/deployment.json。
- 数据：/var/lib/mc-block-launch/leaderboard.json。不要随发布目录覆盖或删除。
- Node 仅监听 Docker 桥接地址，防火墙只允许 Caddy 容器访问该端口；公网沿用 HTTPS 8443。
- Caddy 新增 qcya.fun 站点，根路径跳转到游戏；原站点配置已备份并保留。
- DDNS 改为 qcya.fun 及其对应域名编号，其他配置保留。证书使用 DNS-01，/etc/cron.d/mc-qcya-fun-cert 每日检查，在到期前 30 天续期。
- 连接凭据没有进入源码或公开目录。证据中的文件哈希可核对实际发布内容。
