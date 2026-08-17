// dsh-quota-hub — client half: sidebar quota button (live health dot) +
// collapsible glass panel listing every provider's quota snapshot.
import { useCallback, useEffect, useState } from "react";
import { TYPERT_REMOTE } from "../../lib/typert.remote-client.js";

const inject = ["slots", "remote"];
const POLL_MS = 120000; // host caches for refreshMs; just re-ask

// Adapter percents are USED shares; health is judged on the REMAINING share.
const healthOf = (providers) => {
  let worst;
  for (const provider of providers) {
    for (const item of provider.items ?? []) {
      if (item.percent === undefined) continue;
      const remaining = 100 - item.percent;
      if (worst === undefined || remaining < worst) worst = remaining;
    }
  }
  return worst;
};

const healthColor = (remaining) => {
  if (remaining === undefined) return "var(--dsw-alias-label-secondary,#8a93a3)";
  if (remaining >= 50) return "#3ecf8e";
  if (remaining >= 20) return "#f0b429";
  return "#f2574b";
};

function formatValue(item) {
  if (item.value === undefined) return "—";
  const value = typeof item.value === "number" ? item.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : item.value;
  return item.unit ? `${value} ${item.unit}` : value;
}

function ProviderCard({ provider, collapsed, onToggle }) {
  const items = provider.items ?? [];
  return (
    <div className={`dqh_card ${provider.status}`}>
      <button className="dqh_cardHead" onClick={onToggle}>
        <span className="dqh_chevron">{collapsed ? "▸" : "▾"}</span>
        <span className="dqh_cardTitle">{provider.label}</span>
        <span className="dqh_cardRight">
          {provider.status === "ok" && provider.updatedAt ? (
            <span className="dqh_updated">{new Date(provider.updatedAt).toLocaleTimeString()}</span>
          ) : null}
          <span className={`dqh_status ${provider.status}`}>
            {provider.status === "ok" ? "●" : provider.status === "error" ? "⚠" : "○"}
          </span>
        </span>
      </button>
      {collapsed ? null : (
        <div className="dqh_cardBody">
          {provider.status === "no-key" || provider.status === "error" ? (
            <div className="dqh_message">{provider.message ?? "未知错误"}</div>
          ) : null}
          {items.map((item) => (
            <div className="dqh_item" key={item.key}>
              <div className="dqh_itemTop">
                <span className="dqh_itemLabel">{item.label}</span>
                <span className="dqh_itemValue">{formatValue(item)}</span>
              </div>
              {item.percent !== undefined ? (
                <div className="dqh_bar">
                  <div
                    className="dqh_barFill"
                    style={{ width: `${Math.max(2, Math.min(100, item.percent))}%`, background: healthColor(100 - item.percent) }}
                  />
                  <span className="dqh_barText">{item.percent}% 已用 · 剩余 {100 - item.percent}%</span>
                </div>
              ) : null}
              {item.resetsAt ? <div className="dqh_reset">重置时间 {new Date(item.resetsAt).toLocaleString()}</div> : null}
            </div>
          ))}
          {items.length === 0 && provider.status === "ok" ? <div className="dqh_message">暂无数据</div> : null}
        </div>
      )}
    </div>
  );
}

function QuotaPanel({ providers, loading, onRefresh, onClose }) {
  const [collapsed, setCollapsed] = useState(() => new Set());
  const toggle = (id) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const collapseAll = () => setCollapsed(new Set(providers.map((p) => p.id)));
  const expandAll = () => setCollapsed(new Set());
  const allCollapsed = collapsed.size >= providers.length;

  return (
    <div className="dqh_veil" onClick={onClose}>
      <div className="dqh_panel" onClick={(event) => event.stopPropagation()}>
        <div className="dqh_head">
          <b>💰 额度总览</b>
          <span className="dqh_actions">
            <button className="dqh_btn" onClick={allCollapsed ? expandAll : collapseAll}>
              {allCollapsed ? "全部展开" : "全部收起"}
            </button>
            <button className="dqh_btn" onClick={onRefresh} disabled={loading}>
              {loading ? "刷新中…" : "刷新"}
            </button>
            <button className="dqh_close" onClick={onClose}>✕</button>
          </span>
        </div>
        {loading && providers.length === 0 ? <div className="dqh_message">正在拉取各服务商额度…</div> : null}
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            collapsed={collapsed.has(provider.id)}
            onToggle={() => toggle(provider.id)}
          />
        ))}
        <div className="dqh_foot">密钥只留在主机侧，浏览器不接触 · 自动刷新</div>
      </div>
      <style>{`
        .dqh_veil{position:fixed;inset:0;z-index:900;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center}
        .dqh_panel{width:min(440px,92vw);max-height:78vh;overflow:auto;border-radius:16px;padding:14px 16px;box-sizing:border-box;
          background:linear-gradient(160deg,rgba(255,255,255,.08),rgba(255,255,255,.03));backdrop-filter:blur(18px);
          color:var(--dsw-alias-label-primary,#e8eaed);border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.14));
          box-shadow:0 18px 60px rgba(0,0,0,.5)}
        .dqh_head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-size:15px}
        .dqh_actions{display:flex;gap:6px;align-items:center}
        .dqh_btn{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);color:inherit;border-radius:8px;padding:3px 10px;font-size:12px;cursor:pointer}
        .dqh_btn:hover{background:rgba(255,255,255,.16)}
        .dqh_btn:disabled{opacity:.5;cursor:default}
        .dqh_close{background:transparent;border:none;color:inherit;cursor:pointer;font-size:16px}
        .dqh_card{border:1px solid rgba(255,255,255,.1);border-radius:12px;margin-bottom:8px;background:rgba(255,255,255,.04);overflow:hidden}
        .dqh_cardHead{width:100%;display:flex;align-items:center;gap:8px;background:transparent;border:none;color:inherit;padding:9px 12px;font-size:13.5px;cursor:pointer;text-align:left}
        .dqh_cardHead:hover{background:rgba(255,255,255,.06)}
        .dqh_chevron{opacity:.6;font-size:11px;width:12px}
        .dqh_cardTitle{font-weight:600;flex:1}
        .dqh_cardRight{display:flex;gap:8px;align-items:center;font-size:11px;opacity:.75}
        .dqh_updated{font-variant-numeric:tabular-nums}
        .dqh_status.ok{color:#3ecf8e}.dqh_status.error{color:#f2574b}.dqh_status.no-key{color:var(--dsw-alias-label-secondary,#8a93a3)}
        .dqh_cardBody{padding:2px 12px 10px;font-size:12.5px}
        .dqh_item{padding:5px 0}
        .dqh_itemTop{display:flex;justify-content:space-between;gap:10px}
        .dqh_itemLabel{opacity:.8}
        .dqh_itemValue{font-variant-numeric:tabular-nums;font-family:ui-monospace,Consolas,monospace}
        .dqh_bar{position:relative;height:14px;border-radius:7px;background:rgba(255,255,255,.08);margin-top:4px;overflow:hidden}
        .dqh_barFill{height:100%;border-radius:7px;transition:width .4s ease}
        .dqh_barText{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10.5px;color:var(--dsw-alias-label-primary,#e8eaed);text-shadow:0 1px 2px rgba(0,0,0,.6)}
        .dqh_reset{opacity:.55;font-size:11px;margin-top:2px}
        .dqh_message{opacity:.7;font-size:12px;padding:6px 0}
        .dqh_foot{opacity:.5;font-size:11px;text-align:center;margin-top:8px}
      `}</style>
    </div>
  );
}

async function apply(ctx) {
  await ctx.remote.$mount(TYPERT_REMOTE);

  let open = false;
  const listeners = new Set();
  const notify = () => {
    for (const listener of listeners) listener();
  };

  let cache = { at: 0, providers: [] };
  const fetchSnapshot = async () => {
    const remote = ctx.get("remote.quotaHub");
    const carried = await remote.snapshot();
    const result = carried?.ok ? carried.value : null;
    if (result?.ok) {
      cache = { at: Date.now(), providers: result.value?.providers ?? [] };
      notify();
    }
    return cache;
  };
  void fetchSnapshot();
  setInterval(() => void fetchSnapshot(), POLL_MS);

  ctx.slots.inject("shell.overlay", () => {
    const dispose = ctx.slots.register(
      { name: "shell.overlay", id: "quota-hub-panel", order: 30, inject: () => ({}) },
      () => {
        const [tick, force] = useState(0);
        void tick;
        useEffect(() => {
          const listener = () => force((value) => value + 1);
          listeners.add(listener);
          return () => listeners.delete(listener);
        }, []);
        if (!open) return null;
        const health = healthOf(cache.providers);
        return (
          <QuotaPanel
            providers={cache.providers}
            loading={Date.now() - cache.at > 5000 && cache.providers.length === 0}
            onRefresh={() => void fetchSnapshot()}
            onClose={() => { open = false; notify(); }}
          />
        );
      },
    );
    return () => dispose();
  });

  ctx.slots.inject("sidebar.footer.action", () => {
    const dispose = ctx.slots.register(
      { name: "sidebar.footer.action", id: "quota-hub", order: 35, inject: () => ({}) },
      () => {
        const [, force] = useState(0);
        useEffect(() => {
          const listener = () => force((value) => value + 1);
          listeners.add(listener);
          return () => listeners.delete(listener);
        }, []);
        const health = healthOf(cache.providers);
        return (
          <>
            <style>{`
              .dqh_toggle{display:inline-flex;align-items:center;gap:6px;background:transparent;border:none;color:inherit;cursor:pointer;font-size:13px;padding:6px 8px;border-radius:8px}
              .dqh_toggle:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06))}
              .dqh_toggleDot{width:8px;height:8px;border-radius:50%;display:inline-block}
            `}</style>
            <button className="dqh_toggle" onClick={() => { open = true; notify(); }} title="服务商额度总览">
              <span className="dqh_toggleDot" style={{ background: healthColor(health) }} />
              💰 额度
            </button>
          </>
        );
      },
    );
    return () => dispose();
  });
}

export { apply, inject };
