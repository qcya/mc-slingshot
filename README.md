# MC方块弹射 | MC Block Launch

A Minecraft-style flat-map siege game: launch blocks and stones from the left to destroy villager houses and monster ruins on the right.  
一个 MC 方块画风的平面攻城游戏：在左侧发射方块和石块，击毁右侧的村民房屋与怪物遗迹。

**版本：Alpha 0.2（可玩技术预览）**。项目是独立的浏览器 2D 破坏游戏原型，不是已经完成的商业游戏。

## 试玩

下载仓库 ZIP 并解压，运行 `index.html`。浏览器如果限制本地文件资源，Windows 下双击 `START_GAME.bat` 启动本地服务器。推荐 Edge / Chrome。

**操作**：左侧发射架处向左拖动弹药，松开发射；键盘 `1`–`4` 切换弹药，`R` 重新开始，`N` 下一关，空格暂停。

## 首批四种弹药

| 编号 | MC 风格物件 | 能力 |
|---|---|---|
| 1 | 圆石方块 | 依据速度和质量撞碎一定范围的材质，撞到地面同样可能打出凹坑 |
| 2 | TNT 方块 | 命中后产生圆形不规则像素破坏，碎片飞散，并冲击旁边的残骸和怪物 |
| 3 | 末影珍珠 | 遇到薄墙时检测墙后是否有空间，在厚度限制内穿过去，继续击中室内目标 |
| 4 | 黑洞（测试弹药） | 撞击后粘在墙面，持续吸入周围像素、碎片与附近怪物 |

五关：草地小屋、石头哨塔、双子木楼、掠夺者前哨站、像素要塞。目标是击败掠夺者。

## 技术结构

- `index.html` / `style.css`：界面、关卡与控制器。
- `game.js`：固定步进主循环、发射、攻击逻辑、地形碰撞、材质耐久、结构连通性、碎屑、怪物受伤。
- `vendor/matter.min.js`：Matter.js 0.20.0，负责失去支撑后的大型建筑残骸的二维刚体运动与相互接触；如果无法加载，则自动进入基础物理降级模式。
- `assets/textures/`：来自 Minecraft 默认风格素材的 16×16 像素纹理和物品贴图，用于当前测试阶段。
- `assets/sfx/`：部分使用用户提供的 Minecraft 音效（石头、泥土、玻璃、深板岩等），部分为原创测试音效；音效按原始文件类别归档。

每个 16×16 方块纹理像素对应一个逻辑材质单元（5×5 显示像素）。打击只破坏实际覆盖的单元；材质硬度不同。建筑结构由连通性检测决定是否脱离支撑，脱离后会生成参与 Matter.js 碰撞的大型刚体，而小颗粒仅作为轻量粒子下落、弹跳并逐渐淡出。

此版本的**静态地图与发射物碰撞仍使用网格采样和高速子步检测**；Matter.js 主要管理大型掉落残骸，暂未实现一套完整的世界网格到多边形碰撞体的实时同步。复杂场景仍会有碰撞边缘误差。不要把它当成完全成熟的建筑力学引擎。

## 地图、关卡与视频

关卡可通过 `game.js` 中的 `LEVELS` 和 `stage*` 函数编辑。后续计划增加结构化地图 JSON 导入与生成，再做图片到关卡的 AI 解析。**创意工坊和 AI 读取图片都尚未实现**，本阶段先验证玩法、像素破坏和碰撞。

源码公开便于之后继续做游戏，并可直接用浏览器录制游戏开发日志作为视频。

## 资源来源与后续发布

- MC 默认风格贴图：测试阶段参考 [Faithful-Pack/Default-Java](https://github.com/Faithful-Pack/Default-Java) 的 16×16 资源文件。
- Matter.js 0.20.0：MIT License，参见 [matter-js](https://github.com/liabru/matter-js)。
- 本项目不是 Mojang / Microsoft 官方作品。游戏中的 MC 素材来自各自上游项目和用户测试音效包。

## 诊断

浏览器控制台：`MCBlockLaunch.getStatus()`、`MCBlockLaunch.testBlast(900,450)`、`MCBlockLaunch.testShot('cobble',720,-150)`。

两个旧仓库 `qcya/ball-rendering-studio` 与 `qcya/MC_Advertisement_game` 均保持原样。
