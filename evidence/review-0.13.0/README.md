# 0.13.0 三世界试玩版证据

- `deployment.json`：私有旧分备份、身份保留、8770 发布及 8771 隔离检查。仅记录摘要和哈希，不包含玩家身份令牌或备份内容。
- `public-files.json`：167 个公开文件与本地源文件逐一比对的 SHA-256。
- `live-browser.json` 与 `live-*.png`：已部署站点的桌面／Android 模拟只读检查，读取三个空榜、取消瞄准、播放音乐；不创建玩家或提交成绩。
- `toy-preview.json`：新作预览包、官方自检及待处理发布状态；不表示旧作删除、正式提交或平台在线验收。
- `tests.json`：最终 266 项单元和 75 项完整浏览器回归的结果摘要；`overworld/` 保存本版本主世界实机截图和十关完成记录。
- `../dimension-playability-report.json`：三十关生产物理路线及源文件哈希；`../nether-playability.json`、`../end-playability.json` 和 `../playability-search.json` 为有限库存合法操作路线。
- `../dimension-browser-{nether,end}.json` 与逐关截图：新增二十关真实 Edge 操作、本地／云恢复与原生榜测试宿主路由。
- `../integration-review/`：四种视口的菜单、公告、道具提示，以及五种新道具真实发射检查。

“浏览器测试”不等于真实手机 WebView 或 B站线上原生榜验收。所有平台排名与云存档浏览器回归使用本地测试宿主，正式平台仍需在取得新 Toy ID 后验收。
