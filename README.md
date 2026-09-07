# BAD CHILDREN SHOP

[打开线上商店](https://didiisliuzhihan.github.io/bad-children-shop/) · [GitHub 源代码](https://github.com/didiisliuzhihan/bad-children-shop)

React、Three.js、Blender 和 Supabase 实现的 3D 扭蛋商店。网址直接进入主界面；拖动旋钮或点击抽取，亲手开蛋，收留角色、听故事和保存收藏卡。

## V2 更新

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
| blender/ | V1、V2 可编辑 .blend 工程及建模脚本 |
| assets/source/models/ | 未压缩 GLB 与建模检查渲染 |
| assets/source/references/ | 用户提供的原始图片与故事、语音素材 |
| assets/source/audio/ | 未压缩背景音乐 WAV |
| assets/delivery/ | 压缩 GLB、图片、音频和字体发布副本 |
| supabase/ | 建表、RLS 与 V2 文案迁移 |
| scripts/ | 本地预览、构建验证及发布辅助脚本 |
| archive/v1-ui/ | 本地保留的 V1 界面源代码备份 |

所有源文件均保留在本地项目，没有进行构建后清理。GitHub 不上传本地环境私有文件、旧签名 URL、原始需求 PDF、运行日志和自动备份文件；生产用素材在 Supabase Storage。

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
```

建模脚本会重新生成对应模型；手动雕刻前请另存为自己的版本。V2 使用原始机器工程为基础，保留旋钮和出蛋动画。网页按阶段加载模型，首次用户操作后才播放声音。

## 云端与安全

Supabase 项目 kbyobdydythovyagrfgv 已启用匿名登录。toys 对访客只读；user_capsules 通过 RLS 限制为本人收藏。bad-children-assets 公共桶含 14 个发布文件，普通访客没有上传、覆盖或删除权限。原来的 private shop 桶未更改。

可先执行 supabase/bootstrap.sql，再执行 supabase/content-v2.sql 以更新已有资料。已有项目不必重复执行。

## 验证

- build-report.json：单 HTML、没有外部 JS/CSS、没有内联大型二进制。
- v2-check.json：直接进入、抽取、开蛋、中文重点句、收藏、故事与 PNG 保存。
- assets/storage-check.json：14 个线上素材均 HTTP 200，SHA-256 与本地一致。
- cloud-check.json：本人读写、跨用户隔离和伪造归属拦截。
- deploy-check.json：线上版本验证结果（发布后生成）。

实际验证环境是 Windows Chrome 与 390×844 窄屏模拟；没有声称完成真实 iPhone Safari 测试。匿名收藏不是账号找回系统。字体许可位于 assets/source/licenses/。
