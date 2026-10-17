# 实际测试记录 — Alpha 0.7.1

日期：2026-10-17。Windows，Node.js 24，Edge，本地 Matter.js 0.20.0。没有物理降级模式。

## 最终全量结果

`npm run check`：**41/41 核心测试、13/13 Edge 浏览器场景通过**。浏览器部分约 1.4 分钟。全部结果来自本次最终代码；远端 CI 是否成功不包含在此结论中。

核心覆盖：完整材质像素与孔洞碰撞、方形弹药停稳、无支撑建筑及后墙固定、玻璃接触整片破碎及连续穿越、四秒 TNT 引信和全程加速闪白、爆炸唤醒睡眠圆石并炸飞其他 TNT、独立引信、珍珠薄厚墙、黑洞预算和引力、怪物直接命中击杀与受力、怪物互穿/停步/观望/抬手、自由方向与小力度、五关完整初始化和攻击获胜回放、服务器资源和私有路径隔离。

## 浏览器实测

- 正常启动、必需资源无 404、无脚本异常，五关切换；故意缺失 Matter 或损坏入口时显示启动错误。
- 实际鼠标拉弓、松手、弹药脱离、扣弹、重开和暂停；不是向游戏注入测试弹药。
- 四种弹药、真实圆石停稳、TNT 延迟像素爆炸、珍珠穿墙、黑洞引力。
- 五关初始和 TNT 后画面；重复重开无刚体泄漏。
- 九格滚轮首尾循环、选中框和图标边界、空格不发射、静态云。
- 向后瞄准时速度为负；WebAudio 上下文实际 running 且输出 RMS 非零；右键取消不扣弹且停止拉伸声。
- 2 像素小力度和反向拖动真正发射物理弹药。
- 真实操作先后落下两颗 TNT，第一颗爆炸后第二颗速度超过 200 画面像素/秒，保持自身引信。
- 透明 PNG 四角 alpha 为零，怪物实际停步并抬手，声音解码/播放失败数为零。
- 实际鼠标完成木屋及哨塔挑战，记录每次发射与存活怪物位置。通关截图已更新。

声音测试可确认播放、解码和拉伸音输出，不等同于跨设备听感保证。

## 截图与数据

- [当前画面](../evidence/ai-sling-overview.png)、[弹弓细节](../evidence/slingshot-detail.png)、[反向拉弓](../evidence/backward-aim.png)。
- [固定建筑爆炸后](../evidence/static-building.png)、[TNT 相互作用](../evidence/tnt-interaction.png)、[怪物停步动作](../evidence/idle-gesture.png)。
- `evidence/level-1..5-initial.png`、`level-1..5-tnt.png` 为五关前后画面，`ammo-*.png` 为四种武器，`level-1..2-victory.png` 为浏览器获胜。
- [九秒实际操作画面](../evidence/feedback-preview.webm)：真实游戏画布录制，不包含音轨；不是单独开发的视频渲染器。
- `evidence/levels.json`、`weapons.json`、`feedback.json`、`tnt-interaction.json`、`idle-gesture.json` 与 `browser-victories.json` 保存正常 Matter 模式的状态、性能和声效诊断。性能仅代表本机。
- `baseline.*` 保留接手前历史证据。旧版坍塌截图已移除；旧手绘弹弓截图与演示片段已替换。

## 五关可获胜复现

`tests/playability.test.mjs` 使用生产 SiegeWorld 和完整 Matter 世界回放 [攻击序列](../evidence/playability-search.json)，五关分别使用 1、2、2、5、5 发，不超过各关弹药数。此数据仅用于开发测试，没有加入游戏自动瞄准或固定剧情。可运行 `node scripts/check-playability.mjs` 重新搜索。

0.7 阶段的独立只读审查复核了新规则及关键实现，未发现 Critical / Important 问题，并独立通过 41 项核心测试。Windows Playwright trace 曾发生 EBUSY，当前关闭 trace，保留截图和 JSON。便捷启动器在前一阶段已使用独立端口实际启动验收；本版打包后另做解压文件和服务响应检查。

当前玩法边界见 README。人物没有主动攻击和复杂寻路；建筑不坍塌是用户最新指定的规则。
