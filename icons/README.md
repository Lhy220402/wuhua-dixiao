# 网站图标 / 主屏图标（物化帝）

`icon.svg` 是唯一矢量源文件，纯手写 SVG（无外部图片素材），配色取自
`src/config/theme.ts` 的物化帝色板（龙袍金 `#C9A227`、冕冠 `#E0B341`、
皮肤 `#F2C9A0`、玉珠 `#3E8E7E`、凝视红 `#FF3B30`）。

生成物（已提交，静态站直接可用）：

| 文件 | 用途 |
|---|---|
| `public/icons/icon.svg` | 现代浏览器 favicon（矢量，任意缩放） |
| `public/icons/favicon.ico` / `public/favicon.ico` | 旧浏览器 / 直接请求 `/favicon.ico` 兜底（16/32/48） |
| `public/icons/apple-touch-icon-180.png` | iOS 添加到主屏幕 |
| `public/icons/icon-192.png` / `icon-512.png` | PWA manifest / Android 主屏图标 |
| `public/site.webmanifest` | Web App Manifest（名称、横屏、主题色） |

重新生成（本机工具，不进入运行时依赖）：

```bash
cd /root/workspace/wuhua-dixiao
rsvg-convert -w 512 -h 512 public/icons/icon.svg -o public/icons/icon-512.png
rsvg-convert -w 192 -h 192 public/icons/icon.svg -o public/icons/icon-192.png
rsvg-convert -w 180 -h 180 public/icons/icon.svg -o public/icons/apple-touch-icon-180.png
python3 - <<'PY'
from PIL import Image
base = Image.open('public/icons/icon-512.png').convert('RGBA')
small = base.resize((32, 32), Image.LANCZOS)
small.save('public/icons/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)],
           append_images=[base.resize((16, 16), Image.LANCZOS), base.resize((48, 48), Image.LANCZOS)])
PY
cp public/icons/favicon.ico public/favicon.ico
```

> 修改图标只动 `icon.svg` 后重跑以上命令；`index.html` / manifest 里的路径不要改成绝对 `/`，
> 否则 GitHub Pages / Gitee Pages 子路径会 404。
