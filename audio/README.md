# 音频目录

首版只包含用户提供的失败音效，已做格式转换与降噪：

| 文件 | 编码 | 说明 |
|---|---|---|
| `fail.ogg` | Vorbis 48kHz mono | 首选；游戏内 `sfx.fail` |
| `fail.mp3` | MP3 48kHz mono | iOS/Safari 兜底 |
| `fail.m4a` | AAC 48kHz mono | 第二兜底 |

源文件 `标准录音 1.mp3`（3.04s / 48kHz / stereo / −12.9 LUFS / −0.5 dBTP）经
去首尾静音 → highpass 70Hz / lowpass 14kHz → afftdn 降噪 → 压缩 → loudnorm −16 LUFS →
淡入淡出 → mono 导出。运行时按 `ogg → mp3 → m4a` 顺序尝试；三份全缺时完全静默，
每个逻辑 ID 只 `console.warn` 一次。

其余音频逻辑 ID 首版缺失，放入同名文件即可自动生效，无需改代码：
`jump land coin hurt shop purchase gunshot laser warning dialogue buff phase`
以及 `title level1 boss1 level2 boss2`（BGM）。
