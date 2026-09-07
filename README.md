# BAD CHILDREN SHOP

[打开线上商店](https://didiisliuzhihan.github.io/bad-children-shop/) · [GitHub 源代码](https://github.com/didiisliuzhihan/bad-children-shop)

React、Three.js、Blender 和 Supabase 实现的 3D 扭蛋商店。网址直接进入主界面；拖动旋钮或点击抽取，亲手开蛋，收留角色、听故事和保存收藏卡。

## V5.2 首次进入不再被音频卡住

- V5.1 的音量混合已被用户确认正常，本版保持 BGM 0.08、音效 0.55、语音 0.75、语音期间 BGM 0.025 不变。
- 修复 V5.1 回归：`spin()` 不再等待音频就绪，也不会反复提示“声音还没准备好”并阻止抽取。音频被永久拒绝时仍可完成开蛋、查看、收留或放弃。
- 页面加载会尝试启动声音；通过原生 document `touchstart` / `touchend` / `pointerup` / `click` / `keydown` 在真实操作中重试。普通轻点抽取按钮或 3D 旋钮即可开启声音并抽取，不用先开关喇叭。首次受限时按钮提示“轻点开始 · 开启声音”，不是登录/入口遮罩。
- iOS 的滑动松手不一定授予音频激活；[WebKit 212117](https://bugs.webkit.org/show_bug.cgi?id=212117) 和 [248265](https://bugs.webkit.org/show_bug.cgi?id=248265) 描述了该限制。若环境只允许普通轻点，则第一次纯滑动可能仍没有声音，但不会卡住；之后轻点“打开扭蛋”会继续尝试开启声音。网页无法保证绕过系统的零操作自动播放限制。
- 同时监听 AudioContext `statechange` 和 resume promise，避免 context 已经 running、旧 promise 却未完成时被误报失败。短暂恢复后只播放尚未过期的剩余音效，不把旧滚动声堆在下一次开蛋时一起播放。
- 音量按钮由自身 click 处理启动意图，排除全局捕获监听，修复捕获阶段先解锁、随后同一点击却被当作“静音”的竞争问题。未开启时点一次就尝试开启，不再要求开关两次。
- 回归测试脚本：`scripts/verify-startup-audio.mjs`（Playwright Chromium/Chrome；可用 `BC_PLAYWRIGHT_MODULE` 指定已安装模块）。默认验证本地 4173 预览，`--online` 验证正式 V5.2。`--baseline` 只用于发布前复现当时的 V5.1，并不把查询参数视为历史版本固定地址。
- 检查报告为 `v5.2-baseline-startup-check.json`、`v5.2-local-startup-check.json`、发布后的 `v5.2-online-startup-check.json`。覆盖严格仅点击解锁、原生 touchstart、resume 永久 pending、永久拒绝、首次喇叭单击和两种抽取入口。测试通过不等于实体 iPhone/微信已实测。
- 本次仅修改前端启动逻辑与测试，数据库、收藏、素材和 Blender 工程不变。

## V5.1 手机音频修复（历史记录；就绪阻塞由 V5.2 移除）

- 修复两条平台差异：旧 BGM 依赖 `HTMLMediaElement.volume`，iOS 可能忽略此设置；旧触屏拖动在 `pointermove` 即启动，而手机音频可能要到 `pointerup` / `touchend` 才解锁。V5 窄屏验证使用鼠标，未覆盖触屏激活限制。
- BGM、合成音效、故事语音现经同一个 AudioContext 与总音量节点输出；分别使用 GainNode 的 0.08、0.55、0.75，保持电脑已认可的配比。语音期间 BGM 降至 0.025。不再写 HTML 媒体的 volume；音源在设置 URL 前启用匿名跨域，避免跨域音频被 Web Audio 静默。
- 触屏滑条和真实 3D 旋钮均为拖到位后松手提交，鼠标仍在达到阈值时提交。动画开始前先确认音频 running；失败则不消耗抽取、不播放一轮无声动画，可重试或静音游玩。每次解锁有 1.2 秒上限，后续手势不会被未完成的旧请求卡住。
- 对支持 Audio Session API 的设备请求 playback 类型，避免 BGM 和效果分别受媒体音量与铃声静音模式影响；不请求麦克风权限。功能检测失败不影响基础播放。
- `tests/audio.test.mjs` 模拟无法设置媒体音量、首次解锁失败、永久 pending、恢复、静音、语音失败与旧语音回调；`tests/touch-audio.test.mjs` 检查触屏、触笔与鼠标的提交时机。`v5.1-baseline-audio-check.json` 记录旧版在模拟限制下漏掉滚动声；`v5.1-local-audio-check.json` 记录实际浏览器音频信号与受信任触摸事件测试。仍未完成实体 iPhone Safari 听感测试。
- Apple 平台依据：[iOS 音量限制](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/Using_HTML5_Audio_Video/Device-SpecificConsiderations/Device-SpecificConsiderations.html#//apple_ref/doc/uid/TP40009523-CH5-SW4)、[WebKit 触摸激活规则](https://webkit.org/blog/13862/the-user-activation-api/)、[Web Audio 与铃声静音](https://bugs.webkit.org/show_bug.cgi?id=237322)。前一个文档为归档说明，当前设备实际表现仍需真机回测。
- 只修改前端代码和测试，不改变 Supabase 记录、存储文件、收藏或访问权限。原素材与 Blender 工程保留。
- 线上验证记录：`v5.1-online-audio-check.json`、`v5.1-online-voices-check.json`、`v5.1-deploy-check.json`。发布 HTML 与本地 SHA-256 相同；手机滑条、3D 旋钮、桌面与三只故事语音均测到实际音频信号。用 `?v=5.1` 刷新即可，不需要清除匿名收藏数据。

## V5 更新：抗压鸡毛与双素材工作流

- 新增第 03 只「抗压鸡毛」。任务原文：这周帮小鸡毛做一件小事叭；照片附录：你看我还好吗？小故事采用已确认的第二稿，仅在故事弹窗显示。
- 从这只起，`card_image_url` 指向用户提供的完整背景渲染图，`model_url` 指向动画 GLB，`icon_url` 仅为透明模型预览/加载失败备用。收藏卡、收留飞卡与 PNG 都用卡面原图，前两只维持原样。
- 方形原图完整嵌入 1080×1440 PNG，不截取 DOM、不裁掉云朵或脚部。图片成功解码与任务字体就绪后才能保存。
- Blender 工程为 `blender/toy_stressed_jimao.blend`，脚本为 `blender/build_stressed_jimao.py`；45,110 个三角形、209,304 字节的压缩 GLB。模型为单张参考的三维近似，背面补全；原始卡面图直接保留，不用模型重新渲染替换。
- 首次音效等待 AudioContext 进入 running，再安排播放；解锁失败无未处理错误，后续 pointer-up / keyboard 手势可重试。机械滚动提高中频与效果总线电平。BGM 从 0.16 降至 0.08，语音时降至 0.025；语音本身保持 0.75。
- `supabase/toy03-stressed-jimao.sql` 只新增玩具记录，不改变表结构、已有玩具、用户收藏或 RLS。`card_image_url` 和 `story_note` 是前端可选字段，按 ID 与云端目录合并。
- `v5-source-media.zip` 含本次 Blender 工程、未压缩模型、参考原图、照片、语音与五项发布素材，按目录解压到项目根目录即可。所有本地源文件均保留。
- 验证：`v5-check.json`、`v5-online-check.json`、`v5-online-first-audio-check.json`；单元测试包含首次解锁失败、后续重试、静音、中断恢复、BGM 降低和语音避让。`v5-retry-check.json` 验证原图失败阻止空白导出、重试恢复与手机分享；`v5-legacy-check.json` 验证前两只功能不变。音效检测使用真实 Chrome 音频分析器，未声称完成实体 iPhone 听感测试。

### 今后新增玩具

1. 确认名字、标语、任务句、故事短文与完整卡面原图。
2. 保留原图为独立 `card_image_url`；Blender 模型只负责互动，透明预览单独保留。
3. 上传新的公开素材路径，保留原始素材，不覆盖已有玩具文件。任务句自动继承 BC Quest 字体。
4. 在 `src/assets.ts` 和云端 toys 目录新增同一个 ID。PNG 不含小故事。
5. 验证冷缓存、手机完整构图、PNG、语音及开蛋；构建单 HTML，更新 GitHub Pages。

## V4 更新：小故事与任务字体

- 恢复张鸡毛、哭哭葵的主题小故事，只显示在“读故事”弹窗，不添加到收藏卡或导出 PNG。原短句、照片和音频继续保留。这里是固定编辑的故事稿，不调用 AI 随机生成。
- 仅中文任务句采用站酷快乐体 ZCOOL KuaiLe（SIL OFL 1.1），标题、普通标语和故事正文不变。网页任务与导出图片使用相同字体，新玩具沿用共享的 Tagline 组件和导出模板。
- 完整字体包含 7053 个编码字符，WOFF2 约 851 KiB，未按当前两句裁字；从 Supabase 按需加载，不请求 Google Fonts 服务。导出会等待字体成功加载，网络失败时提供重试。
- 原 TTF 在 assets/source/fonts/，许可证在 assets/source/licenses/ZCOOL-KuaiLe-OFL.txt；转换脚本为 scripts/prepare-quest-font.py。GitHub 的 v4-font-sources.zip 按 assets/ 路径保存相同内容，解压到项目根目录即可。
- 小故事字段为 Toy.story_note，可选；已有两款放在 src/assets.ts，与云端目录合并后保留。新增玩具可在内容目录提供该字段。用户收藏、RLS 和数据库结构未更改。

## V3 更新

- 依照新增正面参考重建墨镜羊女孩：猫眼墨镜、细碎刘海、双辫、银色耳环、奶油羊帽与连帽衣。机器恢复 V1 浅蓝色塑料及柔亮高光。
- 开蛋页恢复可透见主场景的半透明模糊层，保留中文优先及任务句重点色。
- 手机故事图片使用完整适配，不再放大裁切；收藏布局缩短为常规卡片比例。
- 保存图片改为独立的 1080×1440（3:4）PNG 排版，不再截图手机页面。先下载并解码玩具图片，再生成卡片；失败时禁止空白导出并提供重试。
- 分享文件提前生成，保存点击直接唤起支持文件分享的手机浏览器；同时保留长按图片保存方式。
- 本次是依据正面图制作的可编辑三维近似；侧面、背面为补全，并非经尺寸验证的一比一复制。

### 保留的 V2 更新

- 中文标语大于英文，任务句使用品牌红色；收藏卡保留中文标语。
- 删除入口登录页及多余宣传文案，保留必要功能文字和原稿内容。
- 背景半透明文字改为 BAD CHILDREN。
- 羊女孩根据正面参考重建为完整可编辑几何：奶油色羊帽、深色发片与双辫、绿色眼睛、羊角、斗篷及骷髅吊饰。
- 单张图片无法确定侧面与背面的形状；这些部分为补全，并非经尺寸验证的一比一复制。

## 浏览与部署

线上地址不需要启动本地服务，也不依赖这次对话保持开启。收藏属于当前浏览器的匿名身份，不能自动跨设备迁移；清理浏览器数据会失去该匿名身份。

本地双击 **打开扭蛋商店.cmd**，打开 http://127.0.0.1:4173 。本地预览优先读取 assets/delivery，离线也能浏览已有素材。重启电脑后再次双击即可。

GitHub Pages 从 main 分支的 /docs 发布。docs/index.html 与 dist/index.html 是同一构建产物。JS、CSS、Draco 解码器源码统一压缩在 HTML 内；模型、音频、图片和字体通过 Supabase 公共 URL 外部加载，没有大型二进制 base64 内联。根目录 index.html 是开发入口，不要单独打开。

## 源文件保留

| 目录 | 内容 |
| --- | --- |
| src/ | React 组件、样式、3D 场景与交互逻辑 |
| blender/ | V1、V2、V3 可编辑 .blend 工程及建模脚本 |
| assets/source/models/ | 未压缩 GLB 与建模检查渲染 |
| assets/source/references/ | 用户提供的原始图片与故事、语音素材 |
| assets/source/audio/ | 未压缩背景音乐 WAV |
| assets/delivery/ | 压缩 GLB、图片、音频和字体发布副本 |
| supabase/ | 建表、RLS 与 V2 文案迁移 |
| scripts/ | 本地预览、构建验证及发布辅助脚本 |
| archive/ | 本地保留的 V1、V2 界面源代码备份 |

所有源文件均保留在本地项目，没有进行构建后清理。GitHub 不上传本地环境私有文件、旧签名 URL、原始需求 PDF、运行日志和自动备份文件；生产用素材在 Supabase Storage。

GitHub 同时保存 8 个 Blender 工程、6 个未压缩 GLB 和 V2/V3 检查渲染。较大的原始图片、音频、字体许可及发布副本集中保存在 source-media-backup.zip。需要从仓库重新建模或离线预览时，先解压该 ZIP：把 references、audio、licenses 三个目录放入 assets/source，把 delivery 放入 assets。再把 v3-source-media.zip 按其 assets/ 路径合并到项目根目录。完整的本地项目已经有这些文件，不需要重复解压。

## 开发

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
pnpm preview
```

build 会生成 dist/index.html 并同步到 docs/index.html。提交新的 docs/index.html 后，GitHub Pages 自动发布。生产环境配置只有公开客户端 URL 和 publishable 公钥；没有数据库密码或 service-role 私钥。

```sh
blender --background --python blender/build_assets.py
blender --background --python blender/rebuild_machine_v2.py
blender --background --python blender/rebuild_machine_v3.py
```

建模脚本会重新生成对应模型；手动雕刻前请另存为自己的版本。V2 使用原始机器工程为基础，保留旋钮和出蛋动画。网页按阶段加载模型，首次用户操作后才播放声音。

V3 的 gashapon_machine_v3.blend 保存完整机器，sheep_girl_v3.blend 保存独立女孩；未压缩 GLB 保留分件。仅网页发布 GLB 合并静态女孩网格来减少绘制开销，旋钮、出蛋等动态部件保持独立。

## 云端与安全

Supabase 项目 kbyobdydythovyagrfgv 已启用匿名登录。toys 对访客只读；user_capsules 通过 RLS 限制为本人收藏。bad-children-assets 公共桶含 21 个发布文件，普通访客没有上传、覆盖或删除权限。原来的 private shop 桶未更改。

可先执行 supabase/bootstrap.sql，再执行 supabase/content-v2.sql 以更新已有资料。已有项目不必重复执行。

## 验证

- build-report.json：单 HTML、没有外部 JS/CSS、没有内联大型二进制。
- v2-check.json：直接进入、抽取、开蛋、中文重点句、收藏、故事与 PNG 保存。
- v3-check.json：透明模糊层、手机故事图完整展示、两款 3:4 卡片、冷缓存图片失败拦截、重试及分享点击有效性。
- v3-screen-check.json：320×568、375×667、430×932 竖屏与 844×390 横屏的图片适配、关闭和保存控件可用性。
- assets/storage-check.json：21 个线上素材均 HTTP 200，SHA-256 与本地一致。
- v4-check.json：任务专属字体、按需加载、故事仅弹窗显示、3:4 PNG 同字体、字体失败拦截与重试恢复。
- v4-online-check.json：正式网址与最终 HTML 校验一致，两段小故事、专属任务字体和两款 PNG 下载均验证通过。
- v4-future-quest-check.json：用仅存在于测试浏览器的新增玩具验证任务自动继承字体和导出模板，未写入线上数据库。
- cloud-check.json：本人读写、跨用户隔离和伪造归属拦截。
- deploy-check.json：正式 HTTPS 站点已验证，HTML 与本地构建 SHA-256 一致；云端收藏、刷新保留、故事和 PNG 下载通过。
- v3-deploy-check.json：V3 正式网址与最终 HTML 校验一致，新模型、透明层、两张手机故事图及两款 1080×1440 PNG 下载通过。
- v3-repository-check.json：新版 Blender 工程、未压缩模型、检查渲染、参考素材备份及 HTML 与 GitHub 文件哈希一致。

实际验证环境是 Windows Chrome 与 390×844 窄屏模拟；没有声称完成真实 iPhone Safari 测试。匿名收藏不是账号找回系统。字体许可位于 assets/source/licenses/。
