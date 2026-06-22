import { createMemo, createSignal, Show } from "solid-js"

const id = "sidebar-usage"

const fmt = (n) => Number(n || 0).toLocaleString("en-US")
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

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
