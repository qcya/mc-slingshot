# B 站 Toy 接入检查

2026-10-17，按用户提供的命令安装并阅读官方 `bilibili/toy` 的 `toy` 技能及内容检查表。当前游戏名为 **MC打弹弓 / MC Slingshot**，建议 slug 为 `mc-slingshot`。

## 已验证

- 对仅包含 `index.html`、`game.js`、`style.css`、`src/`、`assets/`、`vendor/` 的临时前端目录运行官方 `toy_doctor.py --slug mc-slingshot --json --require-root-index`，结果 `ok: true`、零 ERROR。
- 入口与素材使用相对路径，可放在 `/toy/<slug>/` 路径下；入口未超过 1 MB。报告见 [toy-preflight.json](../evidence/toy-preflight.json)。
- 唯一 WARN 是 24 个 JS/CSS 文件名未带内容指纹。这是缓存更新建议，不是平台拒收项。
- 桌面 Edge 与 Android 触屏模拟验证可游玩；真实手机浏览器和平台 WebView 仍需实际设备验收。

## 上架前仍需做

当前共享昵称和排行榜调用同站点 Node API（`api/profile`、`api/results`、`api/leaderboard`）。Toy 上传静态前端不会同时运行本项目的 Node 服务，**静态检查通过不代表平台排行榜已接入**。正式迁移时，应按平台实际 SDK 接口接入身份、云存档/排行榜，或核实平台允许的 HTTPS 后端方案；不能直接把现有静态目录上传后声称在线功能完整。

成绩仅全通十关时提交，按各关最佳用时之和排名，榜单手动刷新和缓存；接入平台 SDK 后继续保持事件触发、失败退避，避免逐帧或周期轮询消耗配额。需在平台预览中实测存档隔离、声音首次交互、触屏取消、横竖屏和安全区。

实际上传只应包含前端运行素材，排除 `.git`、依赖缓存、服务端数据、脚本和凭据。发布还需 4:3 封面及描述。官方流程要求先创建/更新预览，用户确认预览后才提交审核。本轮未上传、未提交审核，也未生成新的试玩 ZIP。
