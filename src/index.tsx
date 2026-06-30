import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js"

const id = "sidebar-usage"

const fmt = (n) => Number(n || 0).toLocaleString("en-US")
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

function progressBar(pct, width = 12) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0))
  const filled = Math.round((p / 100) * width)
  return "█".repeat(filled) + "░".repeat(width - filled)
}

function pctColor(pct, theme) {
  const p = Number(pct) || 0
  if (p < 20) return theme.success
  if (p < 50) return theme.warning ?? theme.text
  return theme.error
}

function Row(props) {
  return (
    <box flexDirection="row" justifyContent="space-between">
      <text fg={props.theme.textMuted}>{props.label}</text>
      <text fg={props.accent ?? props.theme.text} wrapMode="none">
        {props.bold ? <b>{String(props.value)}</b> : String(props.value)}
      </text>
    </box>
  )
}

function View(props) {
  const api = props.api
  const sessionID = props.session_id
  const [open, setOpen] = createSignal(true)
  const theme = () => api.theme.current

  const messages = createMemo(() => api.state.session.messages(sessionID) ?? [])
  const session = createMemo(() => api.state.session.get?.(sessionID))

  const last = createMemo(() => {
    const list = messages()
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i]
      if (m.role === "assistant" && m.tokens?.output > 0) return m
    }
    return undefined
  })

  const total = createMemo(() => {
    const acc = { input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0 }
    for (const m of messages()) {
      if (m.role !== "assistant") continue
      const t = m.tokens
      if (!t) continue
      acc.input += t.input ?? 0
      acc.output += t.output ?? 0
      acc.reasoning += t.reasoning ?? 0
      acc.cacheRead += t.cache?.read ?? 0
      acc.cacheWrite += t.cache?.write ?? 0
    }
    return acc
  })

  const lastTokens = createMemo(() => {
    const m = last()
    if (!m?.tokens) return 0
    return (
      (m.tokens.input ?? 0) +
      (m.tokens.output ?? 0) +
      (m.tokens.reasoning ?? 0) +
      (m.tokens.cache?.read ?? 0) +
      (m.tokens.cache?.write ?? 0)
    )
  })

  const lastPct = createMemo(() => {
    const m = last()
    if (!m) return undefined
    const p = api.state.provider.find((p) => p.id === m.providerID)
    const limit = p?.models?.[m.modelID]?.limit?.context
    if (!limit) return undefined
    return Math.round((lastTokens() / limit) * 100)
  })

  const lastCacheHit = createMemo(() => {
    const m = last()
    if (!m?.tokens) return undefined
    const read = m.tokens.cache?.read ?? 0
    const input = m.tokens.input ?? 0
    const sum = input + read
    if (sum <= 0) return undefined
    return Math.round((read / sum) * 100)
  })

  const totalCacheHit = createMemo(() => {
    const t = total()
    const sum = t.input + t.cacheRead
    if (sum <= 0) return undefined
    return Math.round((t.cacheRead / sum) * 100)
  })

  const show = createMemo(() => !!last() || total().input + total().output > 0)

  const minimaxProvider = createMemo(() => {
    const m = last()
    if (!m) return undefined
    return api.state.provider.find((p) =>
      p.id === m.providerID &&
      p.key &&
      (p.id.toLowerCase().includes("minimax") || p.name.toLowerCase().includes("minimax"))
    )
  })

  const [tpOpen, setTpOpen] = createSignal(true)
  const [tpData, setTpData] = createSignal()
  const [tpLoading, setTpLoading] = createSignal(false)
  const [tpError, setTpError] = createSignal()
  const [tpRefreshKey, setTpRefreshKey] = createSignal(0)

  const fetchTokenPlan = async () => {
    const key = minimaxProvider()?.key
    if (!key) return
    setTpLoading(true)
    setTpError(null)
    try {
      const res = await fetch("https://www.minimaxi.com/v1/token_plan/remains", {
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
      })
      const data = await res.json()
      setTpData(data)
    } catch (e) {
      setTpError(String(e))
    } finally {
      setTpLoading(false)
    }
  }

  createEffect(() => {
    sessionID
    tpRefreshKey()
    if (minimaxProvider()) fetchTokenPlan()
  })

  createEffect(() => {
    if (!minimaxProvider()) return
    const timer = setInterval(() => fetchTokenPlan(), 600_000)
    onCleanup(() => clearInterval(timer))
  })

  return (
    <Show when={show()}>
      <box flexDirection="column">
        <box flexDirection="row" gap={1} onMouseDown={() => setOpen((v) => !v)}>
          <text fg={theme().text}>{open() ? "▼" : "▶"}</text>
          <text fg={theme().text}>
            <b>Usage</b>
          </text>
        </box>
        <Show when={open()}>
          <Show when={last()}>
            {(m) => (
              <box flexDirection="column">
                <text fg={theme().textMuted}>Last turn</text>
                <Row theme={theme()} label="input" value={fmt(m().tokens.input)} />
                <Row theme={theme()} label="output" value={fmt(m().tokens.output)} />
                <Row theme={theme()} label="reasoning" value={fmt(m().tokens.reasoning)} />
                <Row theme={theme()} label="cache r" value={fmt(m().tokens.cache?.read)} />
                <Row theme={theme()} label="cache w" value={fmt(m().tokens.cache?.write)} />
                <Show when={lastCacheHit() !== undefined}>
                  <Row
                    theme={theme()}
                    label="cache hit"
                    value={`${lastCacheHit()}%`}
                    accent={theme().success}
                  />
                </Show>
                <Row
                  theme={theme()}
                  label="context"
                  bold
                  value={lastPct() !== undefined ? `${fmt(lastTokens())} (${lastPct()}%)` : fmt(lastTokens())}
                />
              </box>
            )}
          </Show>
          <box flexDirection="column" paddingTop={1}>
            <text fg={theme().textMuted}>Session total</text>
            <Row theme={theme()} label="input" value={fmt(total().input)} />
            <Row theme={theme()} label="output" value={fmt(total().output)} />
            <Row theme={theme()} label="reasoning" value={fmt(total().reasoning)} />
            <Row theme={theme()} label="cache r" value={fmt(total().cacheRead)} />
            <Row theme={theme()} label="cache w" value={fmt(total().cacheWrite)} />
            <Show when={totalCacheHit() !== undefined}>
              <Row
                theme={theme()}
                label="cache hit"
                value={`${totalCacheHit()}%`}
                accent={theme().success}
              />
            </Show>
            <Show when={(session()?.cost ?? 0) > 0}>
              <Row theme={theme()} label="cost" bold value={money.format(session()!.cost)} />
            </Show>
          </box>
        </Show>
      </box>
      <Show when={minimaxProvider()}>
        <box flexDirection="column" paddingTop={1}>
          <box flexDirection="row" gap={1} onMouseDown={() => setTpOpen((v) => !v)}>
            <text fg={theme().text}>{tpOpen() ? "▼" : "▶"}</text>
            <text fg={theme().text}>
              <b>Minimax TokenPlan</b>
            </text>
            <text
              fg={theme().textMuted}
              onMouseDown={(e) => {
                e.stopPropagation()
                setTpRefreshKey((v) => v + 1)
              }}
            >
              {" "}↻
            </text>
          </box>
          <Show when={tpOpen()}>
            <Show when={tpLoading() && !tpData()}>
              <text fg={theme().textMuted}>loading...</text>
            </Show>
            <Show when={tpError() && !tpLoading()}>
              <text fg={theme().error}>{tpError()}</text>
            </Show>
            <Show when={tpData()}>
              <For each={((tpData() as any)?.model_remains ?? []).filter((m: any) => m?.model_name === "general")}>
                {(item: any) => (
                  <box flexDirection="column" paddingTop={1}>
                    <text fg={theme().text}>
                      <b>{item.model_name}</b>
                    </text>
                    <Row
                      theme={theme()}
                      label="5h窗口"
                      accent={pctColor(100 - item.current_interval_remaining_percent, theme())}
                      value={`${progressBar(100 - item.current_interval_remaining_percent)} ${100 - item.current_interval_remaining_percent}%`}
                    />
                  </box>
                )}
              </For>
            </Show>
          </Show>
        </box>
      </Show>
    </Show>
  )
}

export const SidebarUsagePlugin = {
  id,
  async tui(api) {
    api.slots.register({
      order: 300,
      slots: {
        sidebar_content(_ctx, props) {
          return <View api={api} session_id={props.session_id} />
        },
      },
    })
  },
}

export default SidebarUsagePlugin
