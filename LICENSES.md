# Third-party assets

- Physics: Matter.js 0.20.0, MIT License. See `vendor/matter.min.js` and https://github.com/liabru/matter-js.
- MC-style reference textures: Faithful-Pack/Default-Java repository used as source of Minecraft-default-style 16x16 assets for the prototype. Their terms are separate from this game's source code. No ownership claim is made over upstream textures.
- Audio: `dirt.ogg`, `grass.ogg`, `stone.ogg`, `deepslate.ogg`, `glass.ogg` are selected Minecraft block sounds from the user-supplied testing pack. These are distinct from the MIT-licensed game code.

## 2026-10-17 素材补齐

- 缺失方块及树木/门纹理：Faithful-Pack/Default-Java 的 `1.20.4` 分支，路径 `assets/minecraft/textures/block/`。这是 Minecraft 原版资源镜像，并非自创替代纹理：https://github.com/Faithful-Pack/Default-Java/tree/1.20.4
- `zombie.png`：将原工程内嵌的 Minecraft 僵尸皮肤还原为独立 PNG。
- `explode.ogg`：只读复用 `qcya/ball-rendering-studio` 的 `balls/tnt/assets/explode1.ogg`。
- `wood.ogg`、`portal.ogg`、`zombie_hurt.ogg`、`fuse.ogg`：依据 Mojang 1.20.4 官方版本元数据的 assetIndex，从 `resources.download.minecraft.net` 取得。对应原路径为 `dig/wood1.ogg`、`mob/endermen/portal.ogg`、`mob/zombie/hurt1.ogg`、`random/fuse.ogg`。
- `pillager_hurt.ogg`：同一官方 assetIndex，`mob/pillager/hurt1.ogg`，用于掠夺者而非僵尸。
- `assets/gui/hotbar*.png` 与 `crossbow_standby.png`：同一 Default-Java `1.20.4` 分支的 HUD sprites 与 item 资源。
- `assets/effects/explosion_*.png`：只读复用 `qcya/ball-rendering-studio` 的 MC 爆炸帧素材。
- 人物使用原皮肤的方块 UV，渲染代码通过正交投影绘制独立头、身体、双臂和双腿；未使用参考图中的第三方人物皮肤。

## Alpha 0.7 新素材

- `assets/textures/cherry_log.png`、`cherry_leaves.png`：上述 Default-Java `1.20.4` 分支的原版方块纹理。
- `assets/sfx/bow.ogg`、`zombie_idle.ogg`、`pillager_idle.ogg`：Mojang 1.20.4 官方 assetIndex 对应 `random/bow.ogg`、`mob/zombie/say1.ogg`、`mob/pillager/idle1.ogg`，来源为 `resources.download.minecraft.net`。
- `assets/sprites/slingshot-frame.png`：0.7.1 换为用户提供的透明 RGBA PNG，原样复制且保留 alpha，非 Minecraft 上游纹理。来源见同目录 `slingshot-frame.source.md`。皮筋拉伸声音由本项目 WebAudio 程序生成。

## Alpha 0.8 室内素材

- `crafting_table_front.png`、`furnace_front.png`、`bookshelf.png`：同一 Faithful-Pack/Default-Java `1.20.4` 分支的 `assets/minecraft/textures/block/` 原版资源。远景继续使用已有原版草、泥土、石头纹理，经过背景着色以降低对比度。

## Alpha 0.9 闯关素材

- `ladder.png`、`tnt_top.png`：同一 Default-Java `1.20.4` 分支方块纹理。
- `crossbow_pull.ogg`：Mojang 官方 1.20.4 assetIndex 中的 `minecraft/sounds/item/crossbow/loading_middle1.ogg`，SHA-1 `2f1f5a923c19c6864b3a63f2310b24586eafa7a5`，来源 `resources.download.minecraft.net`。替换此前程序生成的皮筋噪声。
- 物品栏方块图标由原版纹理按顶面、两个侧面组合，没有生成新的方块纹理。梯子后墙使用原版梯子透明纹理与木板后墙合成，并随同一后景像素数据破坏。

## Alpha 0.10 菜单素材

- `assets/gui/button.png`、`button_disabled.png`、`button_highlighted.png`：同一 Default-Java `1.20.4` 分支的 `assets/minecraft/textures/gui/sprites/widget/`，原始尺寸 200×20，按边框切片缩放。菜单背景复用项目已有原版泥土纹理。

## Alpha 0.10.1 Windows 运行环境

- 试玩包 `runtime/node.exe`：官方 Node.js v24.14.0 Windows x64，发布地址见 `scripts/windows-runtime.json`。分发前与官方 `SHASUMS256.txt` 中 `win-x64/node.exe` 的 SHA-256 核对一致；原文件 OpenJS Foundation 签名有效。
- 完整 Node.js 与其第三方组件许可证随包位于 `vendor/node-runtime-LICENSE.txt`，来源为官方 `nodejs/node` 的 `v24.14.0/LICENSE`。运行环境不加入源码 Git 历史，由构建脚本从经校验的官方本地文件打包。
