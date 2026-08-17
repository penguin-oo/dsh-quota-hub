# dsh-quota-hub

> [中文](README.zh.md) · [English](README.md)

**DeepSeek Harness 的统一实时额度面板。**

一个可收纳的玻璃面板，把你在意的服务商额度一次看全——OpenCodeGo 滚动/周/月
窗口、DeepSeek 官方余额、OpenRouter 额度、硅基流动与 Moonshot 余额——
定时自动刷新，侧边栏按钮带实时健康色点。**API 密钥只留在主机侧，浏览器
只拿到解析后的数字。**

## 特性

- **自动发现** — 凭据存在即出现（DSH credentials / 环境变量里的
  `OPENCODE_GO_API_KEY`、`DEEPSEEK_API_KEY`、`OPENROUTER_API_KEY`、
  `SILICONFLOW_API_KEY`、`MOONSHOT_API_KEY`）；未配置的服务商默认收起并标
  「未配置」
- **可收纳** — 每个服务商卡片可折叠成一行；一键「全部收起/展开」；自动
  刷新并显示每张卡片的更新时间
- **健康色** — 侧边栏圆点与进度条：剩余 >50% 绿、20–50% 黄、<20% 红
- **自定义服务商** — 任何带 JSON 额度字段的 HTTP 端点都能在
  `~/.dsh/dsh-quota-hub.json` 里加（点路径取字段）
- **密钥不出主机** — 所有请求都在主机侧服务里发起，密钥不越过浏览器边界

## 安装

```sh
dsh plugin --profile web add dsh-quota-hub
```

重启 DSH 后，侧边栏底部出现 **💰 额度** 按钮。

## 自定义服务商

`~/.dsh/dsh-quota-hub.json`：

```json
{
  "refreshMs": 120000,
  "providers": [
    {
      "id": "my-relay",
      "label": "我的中转",
      "url": "https://relay.example.com/v1/usage",
      "credential": "MY_RELAY_API_KEY",
      "fields": [
        { "key": "used", "label": "已用", "path": "usage.used", "unit": "USD" },
        { "key": "percent", "label": "用量", "path": "usage.percent", "percent": true }
      ]
    }
  ]
}
```

`credential` 指向一个 DSH 凭据/环境变量名（Bearer 认证）。也可以不写
`credential`，直接在条目上给 `headers` 放静态 token——注意那样明文存在
配置文件里。

## 工作原理

主机：顶层 `quotaHub` Remote 服务通过 `ctx.credentials` 解析各适配器的
密钥，拉取服务商端点（10 秒超时、`refreshMs` 缓存、并发请求合并），返回
归一化快照。客户端：面板与核心 `messageFeedback` remote 同款信封解包，
渲染服务商卡片。

## 许可证

MIT

## 致谢

为 DeepSeek Harness 插件生态而作——感谢 [LINUX DO](https://linux.do/)
社区的反馈与测试。
