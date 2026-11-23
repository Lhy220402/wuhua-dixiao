/**
 * 「关于」弹层内容（docs/40 §5.12）。
 * 玩家可见文案统一放 content/；仓库地址只在这里维护，UI 不写死 URL。
 */
export interface AboutLink {
  label: string;
  url: string;
  note: string;
}

export interface AboutContent {
  kicker: string;
  title: string;
  subtitle: string;
  intro: string;
  bullets: string[];
  links: AboutLink[];
  footer: string;
}

export const ABOUT: AboutContent = {
  kicker: "关于",
  title: "物化帝笑传",
  subtitle: "物化帝 · 校园篇",
  intro:
    "iwanna 式校园梗平台跳跃：跳过尖刺与坑，躲开笑长的扇形视线，在礼堂小卖部买下「子弹枪」，再去第二关消耗学生 Boss。",
  bullets: [
    "第一关：被笑长看见 2.5 秒会失败；商店 45 秒后开门，10 金币买枪。",
    "第二关：躲开六种攻击，把 Boss 打到 40 血后，碰它翘在地上的皮鞋就赢。",
    "手机横屏触控，PC 键鼠；进度自动保存在本机。",
  ],
  links: [
    {
      label: "GitHub 源码",
      url: "https://github.com/idealismo10/WUHUADIxiaozhuan",
      note: "github.com/idealismo10/WUHUADIxiaozhuan",
    },
    {
      label: "Gitee 镜像",
      url: "https://gitee.com/idealismo10/WUHUADIxiaozhuan",
      note: "gitee.com/idealismo10/WUHUADIxiaozhuan",
    },
  ],
  footer: "v0.1 · 手机横屏 / PC 键鼠",
};
