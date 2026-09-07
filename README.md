# BAD CHILDREN SHOP

[打开线上商店](https://didiisliuzhihan.github.io/bad-children-shop/) · [GitHub 源代码](https://github.com/didiisliuzhihan/bad-children-shop)

React、Three.js、Blender 和 Supabase 实现的 3D 扭蛋商店。网址直接进入主界面；拖动旋钮或点击抽取，亲手开蛋，收留角色、听故事和保存收藏卡。

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

Supabase 项目 kbyobdydythovyagrfgv 已启用匿名登录。toys 对访客只读；user_capsules 通过 RLS 限制为本人收藏。bad-children-assets 公共桶含 16 个发布文件，普通访客没有上传、覆盖或删除权限。原来的 private shop 桶未更改。

可先执行 supabase/bootstrap.sql，再执行 supabase/content-v2.sql 以更新已有资料。已有项目不必重复执行。

## 验证

- build-report.json：单 HTML、没有外部 JS/CSS、没有内联大型二进制。
- v2-check.json：直接进入、抽取、开蛋、中文重点句、收藏、故事与 PNG 保存。
- v3-check.json：透明模糊层、手机故事图完整展示、两款 3:4 卡片、冷缓存图片失败拦截、重试及分享点击有效性。
- v3-screen-check.json：320×568、375×667、430×932 竖屏与 844×390 横屏的图片适配、关闭和保存控件可用性。
- assets/storage-check.json：16 个线上素材均 HTTP 200，SHA-256 与本地一致。
- v4-check.json：任务专属字体、按需加载、故事仅弹窗显示、3:4 PNG 同字体、字体失败拦截与重试恢复。
- cloud-check.json：本人读写、跨用户隔离和伪造归属拦截。
- deploy-check.json：正式 HTTPS 站点已验证，HTML 与本地构建 SHA-256 一致；云端收藏、刷新保留、故事和 PNG 下载通过。
- v3-deploy-check.json：V3 正式网址与最终 HTML 校验一致，新模型、透明层、两张手机故事图及两款 1080×1440 PNG 下载通过。
- v3-repository-check.json：新版 Blender 工程、未压缩模型、检查渲染、参考素材备份及 HTML 与 GitHub 文件哈希一致。

实际验证环境是 Windows Chrome 与 390×844 窄屏模拟；没有声称完成真实 iPhone Safari 测试。匿名收藏不是账号找回系统。字体许可位于 assets/source/licenses/。
