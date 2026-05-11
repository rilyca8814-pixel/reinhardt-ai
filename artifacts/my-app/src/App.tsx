import { useState, useEffect, useRef, useCallback } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
  LineChart, Line,
} from "recharts";

// ─── Theme ───────────────────────────────────────────────────────────────────
const DARK_BG = "#060a12";
const BLUE = "#4f8ef7";
const GREEN = "#00d4a1";
const RED = "#ff4d6d";
const CARD_BG = "#0d1525";
const BORDER = "#1a2540";
const TEXT = "#e2e8f0";
const MUTED = "#64748b";
const TABS = ["Dashboard", "Análise", "Mercado", "Aportes", "Renda", "Metas", "AI Chat", "Alertas"];
const USD_BRL = 5.85;

// ─── Portfolio base ───────────────────────────────────────────────────────────
const BASE = {
  VTI:  { price: 246.89, pct: 60, color: BLUE,     yield: 1.4 },
  QQQM: { price: 90.42,  pct: 22, color: "#a78bfa", yield: 0.6 },
  IBIT: { price: 52.79,  pct: 13, color: "#fbbf24", yield: 0   },
  Cash: { price: 21.57,  pct: 5,  color: GREEN,     yield: 4.5 },
};
type Ticker = keyof typeof BASE;
const TICKERS = Object.keys(BASE) as Ticker[];
const TOTAL_BASE = Object.values(BASE).reduce((s, v) => s + v.price, 0);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v: number, decimals = 2) {
  return v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtCurrency(v: number, brl: boolean) {
  return brl ? `R$ ${fmt(v * USD_BRL)}` : `$ ${fmt(v)}`;
}
function randomWalk(base: number, pct = 0.008): number {
  return base * (1 + (Math.random() - 0.5) * pct);
}

// ─── Generate history ─────────────────────────────────────────────────────────
function genHistory(days = 180) {
  const data = [];
  let val = TOTAL_BASE * 0.72;
  for (let i = days; i >= 0; i--) {
    val = val * (1 + (Math.random() - 0.46) * 0.012);
    const d = new Date();
    d.setDate(d.getDate() - i);
    data.push({ date: d.toLocaleDateString("pt-BR", { month: "short", day: "numeric" }), value: +val.toFixed(2) });
  }
  return data;
}
const HISTORY = genHistory();

function calcDrawdown(history: { value: number; date: string }[]) {
  let peak = 0;
  return history.map(p => {
    if (p.value > peak) peak = p.value;
    return { ...p, drawdown: peak > 0 ? +((p.value - peak) / peak * 100).toFixed(2) : 0 };
  });
}
const DRAWDOWN_DATA = calcDrawdown(HISTORY);

// ─── Transactions ─────────────────────────────────────────────────────────────
const INIT_TRANSACTIONS = [
  { id: 1, date: "2025-01-10", ticker: "VTI",  type: "Compra", qty: 0.5, price: 238.20, total: 119.10 },
  { id: 2, date: "2025-02-14", ticker: "QQQM", type: "Compra", qty: 0.3, price: 85.50,  total: 25.65  },
  { id: 3, date: "2025-03-05", ticker: "IBIT", type: "Compra", qty: 0.2, price: 49.90,  total: 9.98   },
  { id: 4, date: "2025-04-20", ticker: "VTI",  type: "Compra", qty: 0.2, price: 242.00, total: 48.40  },
  { id: 5, date: "2025-05-01", ticker: "QQQM", type: "Compra", qty: 0.5, price: 88.00,  total: 44.00  },
];

// ─── Dividend projection ──────────────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function genDividends(prices: Record<Ticker, number>) {
  return MONTHS.map(month => {
    const vti  = prices.VTI  * BASE.VTI.yield  / 100 / 4;
    const qqqm = prices.QQQM * BASE.QQQM.yield / 100 / 4;
    const cash = prices.Cash * BASE.Cash.yield  / 100 / 12;
    return { month, VTI: +vti.toFixed(2), QQQM: +qqqm.toFixed(2), Cash: +cash.toFixed(2), total: +(vti + qqqm + cash).toFixed(2) };
  });
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [darkMode,  setDarkMode]  = useState(true);
  const [brl,       setBrl]       = useState(false);
  const [prices, setPrices] = useState<Record<Ticker, number>>({
    VTI: BASE.VTI.price, QQQM: BASE.QQQM.price, IBIT: BASE.IBIT.price, Cash: BASE.Cash.price,
  });
  const [prevPrices, setPrevPrices] = useState<Record<Ticker, number>>({ ...prices });
  const [flash, setFlash] = useState<Record<Ticker, "up" | "down" | null>>({ VTI: null, QQQM: null, IBIT: null, Cash: null });

  useEffect(() => {
    const id = setInterval(() => {
      setPrevPrices(p => ({ ...p }));
      setPrices(prev => {
        const next = { ...prev };
        const newFlash: Record<Ticker, "up" | "down" | null> = { VTI: null, QQQM: null, IBIT: null, Cash: null };
        TICKERS.forEach(t => {
          if (t === "Cash") return;
          const n = randomWalk(prev[t]);
          newFlash[t] = n > prev[t] ? "up" : "down";
          next[t] = +n.toFixed(2);
        });
        setFlash(newFlash);
        setTimeout(() => setFlash({ VTI: null, QQQM: null, IBIT: null, Cash: null }), 600);
        return next;
      });
    }, 12000);
    return () => clearInterval(id);
  }, []);

  const total = TICKERS.reduce((s, t) => s + prices[t], 0);

  const pieData = TICKERS.map(t => ({
    name: t, value: prices[t], color: BASE[t].color,
    pct: +((prices[t] / total) * 100).toFixed(1),
  }));

  const bg       = darkMode ? DARK_BG  : "#f0f4f8";
  const cardBgL  = darkMode ? CARD_BG  : "#ffffff";
  const borderL  = darkMode ? BORDER   : "#d1dde8";
  const textL    = darkMode ? TEXT     : "#1e2d3d";
  const mutedL   = darkMode ? MUTED    : "#64748b";

  return (
    <div style={{ background: bg, color: textL, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header style={{ background: cardBgL, borderBottom: `1px solid ${borderL}`, padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22, fontWeight: 800, background: `linear-gradient(135deg,${BLUE},${GREEN})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Reinhardt AI
          </span>
          <span style={{ fontSize: 11, color: mutedL, border: `1px solid ${borderL}`, borderRadius: 4, padding: "1px 6px" }}>BETA</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <ToggleBtn label={brl ? "R$" : "US$"} active={brl} onClick={() => setBrl(b => !b)} />
          <ToggleBtn label={darkMode ? "🌙" : "☀️"} active={false} onClick={() => setDarkMode(d => !d)} />
        </div>
      </header>

      {/* Nav tabs */}
      <nav style={{ background: cardBgL, borderBottom: `1px solid ${borderL}`, display: "flex", overflowX: "auto", padding: "0 12px" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            background: "none", border: "none", cursor: "pointer", padding: "14px 16px",
            fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
            color: activeTab === t ? BLUE : mutedL,
            borderBottom: activeTab === t ? `2px solid ${BLUE}` : "2px solid transparent",
            transition: "all 0.2s",
          }}>{t}</button>
        ))}
      </nav>

      {/* Content */}
      <main style={{ padding: "20px", maxWidth: 1200, margin: "0 auto" }}>
        {activeTab === "Dashboard" && <Dashboard prices={prices} prevPrices={prevPrices} flash={flash} total={total} pieData={pieData} brl={brl} darkMode={darkMode} mutedColor={mutedL} border={borderL} cardBg={cardBgL} textColor={textL} />}
        {activeTab === "Análise"   && <Analise   darkMode={darkMode} brl={brl} cardBg={cardBgL} border={borderL} textColor={textL} mutedColor={mutedL} />}
        {activeTab === "Mercado"   && <Mercado   prices={prices} darkMode={darkMode} brl={brl} cardBg={cardBgL} border={borderL} textColor={textL} mutedColor={mutedL} />}
        {activeTab === "Aportes"   && <Aportes   prices={prices} darkMode={darkMode} brl={brl} cardBg={cardBgL} border={borderL} textColor={textL} mutedColor={mutedL} />}
        {activeTab === "Renda"     && <Renda     prices={prices} darkMode={darkMode} brl={brl} cardBg={cardBgL} border={borderL} textColor={textL} mutedColor={mutedL} />}
        {activeTab === "Metas"     && <Metas     total={total}   darkMode={darkMode} brl={brl} cardBg={cardBgL} border={borderL} textColor={textL} mutedColor={mutedL} />}
        {activeTab === "AI Chat"   && <AIChat    darkMode={darkMode} brl={brl} cardBg={cardBgL} border={borderL} textColor={textL} mutedColor={mutedL} />}
        {activeTab === "Alertas"   && <Alertas   prices={prices} darkMode={darkMode} brl={brl} cardBg={cardBgL} border={borderL} textColor={textL} mutedColor={mutedL} />}
      </main>
    </div>
  );
}

// ─── useMobile ────────────────────────────────────────────────────────────────
function useMobile(bp = 600) {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < bp);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < bp);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, [bp]);
  return mobile;
}

// ─── ToggleBtn ────────────────────────────────────────────────────────────────
function ToggleBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: active ? BLUE : "transparent", color: active ? "#fff" : MUTED,
      border: `1px solid ${active ? BLUE : BORDER}`, borderRadius: 6,
      padding: "4px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600,
    }}>{label}</button>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, flash, color }: { label: string; value: string; sub?: string; flash?: "up" | "down" | null; color?: string }) {
  const bg = flash === "up" ? "rgba(0,212,161,0.12)" : flash === "down" ? "rgba(255,77,109,0.12)" : CARD_BG;
  return (
    <div style={{ background: bg, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 16px", transition: "background 0.4s" }}>
      <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || TEXT }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── Shared tooltip style (larger text for touch) ─────────────────────────────
const TT: React.CSSProperties = {
  background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10,
  fontSize: 14, padding: "8px 14px", color: TEXT,
};

// ─── ChartModal ───────────────────────────────────────────────────────────────
function ChartModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(6,10,18,0.97)", backdropFilter: "blur(6px)", display: "flex", flexDirection: "column" }}
      onClick={onClose}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <span style={{ fontWeight: 700, fontSize: 16, color: TEXT }}>{title}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 26, color: MUTED, lineHeight: 1, padding: "0 4px" }}>✕</button>
      </div>
      <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// ─── PinchZoom ────────────────────────────────────────────────────────────────
function PinchZoom({ children }: { children: React.ReactNode }) {
  const [scale, setScale]       = useState(1);
  const lastDist                = useRef<number | null>(null);

  function dist(t: React.TouchList) {
    const dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  return (
    <div
      onTouchStart={e => { if (e.touches.length === 2) lastDist.current = dist(e.touches); }}
      onTouchMove={e => {
        if (e.touches.length !== 2 || lastDist.current === null) return;
        const d = dist(e.touches);
        setScale(s => Math.min(3, Math.max(1, s * (d / lastDist.current!))));
        lastDist.current = d;
      }}
      onTouchEnd={e => { if (e.touches.length < 2) { lastDist.current = null; } }}
      style={{ touchAction: "pan-y", overflow: "hidden" }}
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: "center top", transition: scale === 1 ? "transform 0.25s" : "none" }}>
        {children}
      </div>
    </div>
  );
}

// ─── ChartCard ────────────────────────────────────────────────────────────────
function ChartCard({
  title, defaultHeight = 260, extra, render, style = {},
}: {
  title: string; defaultHeight?: number; extra?: React.ReactNode;
  render: (height: number, fullscreen: boolean) => React.ReactNode;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const modalH = typeof window !== "undefined" ? Math.max(Math.floor(window.innerHeight * 0.68), 400) : 500;

  return (
    <>
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, ...style }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{title}</span>
          <button
            onClick={() => setOpen(true)}
            title="Tela cheia"
            style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 6, cursor: "pointer", fontSize: 16, color: MUTED, padding: "2px 7px", lineHeight: 1.2 }}
          >⛶</button>
        </div>
        <PinchZoom>{render(defaultHeight, false)}</PinchZoom>
        {extra}
      </div>
      {open && (
        <ChartModal title={title} onClose={() => setOpen(false)}>
          {render(modalH, true)}
        </ChartModal>
      )}
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ──────────────────────────────────────────────────────────────────────────────
type DashProps = {
  prices: Record<Ticker, number>; prevPrices: Record<Ticker, number>;
  flash: Record<Ticker, "up" | "down" | null>; total: number;
  pieData: { name: string; value: number; color: string; pct: number }[];
  brl: boolean; cardBg: string; border: string; textColor: string; mutedColor: string; darkMode: boolean;
};

function Dashboard({ prices, prevPrices, flash, total, pieData, brl, mutedColor: _m, darkMode }: DashProps) {
  const mobile = useMobile();
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 20 }}>
        <StatCard label="Portfolio Total" value={fmtCurrency(total, brl)} sub={`${TICKERS.length} ativos`} color={GREEN} />
        {TICKERS.map(t => {
          const chg = prices[t] - prevPrices[t];
          const chgPct = prevPrices[t] > 0 ? (chg / prevPrices[t] * 100) : 0;
          return (
            <StatCard key={t} label={t} value={fmtCurrency(prices[t], brl)}
              sub={`${chg >= 0 ? "+" : ""}${fmt(chgPct, 2)}%`} flash={flash[t]}
              color={flash[t] === "up" ? GREEN : flash[t] === "down" ? RED : TEXT}
            />
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1.6fr", gap: 16, marginBottom: 20 }}>
        <ChartCard
          title="Alocação"
          defaultHeight={260}
          extra={
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
              {pieData.map(e => (
                <div key={e.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: e.color, display: "inline-block" }} />
                  <span style={{ color: MUTED }}>{e.name}</span>
                  <span style={{ marginLeft: "auto", fontWeight: 600 }}>{e.pct}%</span>
                </div>
              ))}
            </div>
          }
          render={h => (
            <ResponsiveContainer width="100%" height={h}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={Math.floor(h * 0.35)} innerRadius={Math.floor(h * 0.19)}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmtCurrency(v, brl)} contentStyle={TT} />
                <Legend iconType="circle" iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          )}
        />

        <ChartCard
          title="Evolução 180 dias"
          defaultHeight={270}
          render={h => (
            <ResponsiveContainer width="100%" height={h}>
              <AreaChart data={HISTORY}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={BLUE} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#1a2540" : "#e2e8f0"} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: MUTED }} interval={29} />
                <YAxis tick={{ fontSize: 11, fill: MUTED }} width={58} tickFormatter={v => `$${fmt(v, 0)}`} />
                <Tooltip formatter={(v: number) => fmtCurrency(v, brl)} contentStyle={TT} />
                <Area type="monotone" dataKey="value" stroke={BLUE} fill="url(#grad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        />
      </div>

      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Holdings</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {["Ativo","Preço","Valor","Alocação","Target","Desvio"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: MUTED, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TICKERS.map(t => {
              const val = prices[t];
              const pct = (val / total) * 100;
              const target = BASE[t].pct;
              const dev = pct - target;
              return (
                <tr key={t} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: "8px", fontWeight: 700 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: BASE[t].color, display: "inline-block", marginRight: 8 }} />
                    {t}
                  </td>
                  <td style={{ padding: "8px" }}>{fmtCurrency(val, brl)}</td>
                  <td style={{ padding: "8px" }}>{fmtCurrency(val, brl)}</td>
                  <td style={{ padding: "8px" }}>{pct.toFixed(1)}%</td>
                  <td style={{ padding: "8px" }}>{target}%</td>
                  <td style={{ padding: "8px", color: Math.abs(dev) > 5 ? RED : GREEN, fontWeight: 600 }}>
                    {dev > 0 ? "+" : ""}{dev.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// ANÁLISE
// ──────────────────────────────────────────────────────────────────────────────
type BaseTabProps = { darkMode: boolean; cardBg: string; border: string; textColor: string; mutedColor: string; brl: boolean };

function Analise({ darkMode, brl }: BaseTabProps) {
  const barData = HISTORY.filter((_, i) => i % 30 === 0);
  const mobile = useMobile();
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <ChartCard
        title="Drawdown Máximo"
        defaultHeight={260}
        render={h => (
          <ResponsiveContainer width="100%" height={h}>
            <AreaChart data={DRAWDOWN_DATA}>
              <defs>
                <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={RED} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={RED} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#1a2540" : "#e2e8f0"} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: MUTED }} interval={29} />
              <YAxis tick={{ fontSize: 11, fill: MUTED }} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v: number) => `${v}%`} contentStyle={TT} />
              <Area type="monotone" dataKey="drawdown" stroke={RED} fill="url(#ddGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      />

      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 16 }}>
        <ChartCard
          title="Evolução Mensal"
          defaultHeight={260}
          render={h => (
            <ResponsiveContainer width="100%" height={h}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#1a2540" : "#e2e8f0"} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: MUTED }} />
                <YAxis tick={{ fontSize: 11, fill: MUTED }} tickFormatter={v => `$${fmt(v, 0)}`} />
                <Tooltip formatter={(v: number) => fmtCurrency(v, brl)} contentStyle={TT} />
                <Bar dataKey="value" fill={BLUE} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        />
        <ChartCard
          title="Retorno Acumulado"
          defaultHeight={260}
          render={h => (
            <ResponsiveContainer width="100%" height={h}>
              <LineChart data={HISTORY.filter((_, i) => i % 6 === 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#1a2540" : "#e2e8f0"} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: MUTED }} interval={4} />
                <YAxis tick={{ fontSize: 11, fill: MUTED }} tickFormatter={v => `$${fmt(v, 0)}`} />
                <Tooltip formatter={(v: number) => fmtCurrency(v, brl)} contentStyle={TT} />
                <Line type="monotone" dataKey="value" stroke={GREEN} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        />
      </div>

      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Métricas de Risco</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 12 }}>
          {[
            { label: "Sharpe Ratio",      value: "1.42" },
            { label: "Max Drawdown",      value: "-9.3%" },
            { label: "Volatilidade (1y)", value: "14.2%" },
            { label: "Beta",              value: "0.87" },
            { label: "Alpha",             value: "+2.1%" },
            { label: "Sortino Ratio",     value: "1.87" },
          ].map(m => (
            <div key={m.label} style={{ background: DARK_BG, borderRadius: 8, padding: "12px", border: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 11, color: MUTED }}>{m.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: GREEN, marginTop: 4 }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// APORTES
// ──────────────────────────────────────────────────────────────────────────────
function Aportes({ prices, brl, darkMode }: BaseTabProps & { prices: Record<Ticker, number> }) {
  const [txs,  setTxs]  = useState(INIT_TRANSACTIONS);
  const [form, setForm] = useState({ date: "", ticker: "VTI", type: "Compra", qty: "", price: "" });

  function addTx() {
    if (!form.date || !form.qty || !form.price) return;
    const qty = parseFloat(form.qty), price = parseFloat(form.price);
    setTxs(prev => [...prev, { id: prev.length + 1, date: form.date, ticker: form.ticker, type: form.type, qty, price, total: +(qty * price).toFixed(2) }]);
    setForm({ date: "", ticker: "VTI", type: "Compra", qty: "", price: "" });
  }

  const totalAportado = txs.reduce((s, t) => s + t.total, 0);
  const totalAtual    = TICKERS.reduce((s, t) => s + prices[t], 0);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        <StatCard label="Total Aportado"  value={fmtCurrency(totalAportado, brl)} color={BLUE} />
        <StatCard label="Valor Atual"     value={fmtCurrency(totalAtual, brl)} color={GREEN} />
        <StatCard label="Lucro/Prejuízo"  value={fmtCurrency(totalAtual - totalAportado, brl)} color={totalAtual >= totalAportado ? GREEN : RED} />
        <StatCard label="Retorno (%)"     value={`${totalAportado > 0 ? fmt((totalAtual - totalAportado) / totalAportado * 100, 2) : "0.00"}%`} color={GREEN} />
      </div>

      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Novo Aporte</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
            style={{ background: DARK_BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "7px 12px", color: TEXT, fontSize: 13 }} />
          <input type="number" placeholder="Qtd" value={form.qty} onChange={e => setForm(p => ({ ...p, qty: e.target.value }))}
            style={{ background: DARK_BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "7px 12px", color: TEXT, fontSize: 13, width: 90 }} />
          <input type="number" placeholder="Preço" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
            style={{ background: DARK_BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "7px 12px", color: TEXT, fontSize: 13, width: 110 }} />
          <select value={form.ticker} onChange={e => setForm(p => ({ ...p, ticker: e.target.value }))}
            style={{ background: DARK_BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "7px 12px", color: TEXT, fontSize: 13 }}>
            {TICKERS.map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
            style={{ background: DARK_BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "7px 12px", color: TEXT, fontSize: 13 }}>
            <option>Compra</option><option>Venda</option>
          </select>
          <button onClick={addTx} style={{ background: BLUE, color: "#fff", border: "none", borderRadius: 6, padding: "7px 18px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
            + Adicionar
          </button>
        </div>
      </div>

      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Histórico de Transações</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Data","Ativo","Tipo","Qtd","Preço","Total"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: MUTED, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...txs].reverse().map(tx => (
                <tr key={tx.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: "8px" }}>{tx.date}</td>
                  <td style={{ padding: "8px", fontWeight: 700 }}>{tx.ticker}</td>
                  <td style={{ padding: "8px", color: tx.type === "Compra" ? GREEN : RED }}>{tx.type}</td>
                  <td style={{ padding: "8px" }}>{tx.qty}</td>
                  <td style={{ padding: "8px" }}>{fmtCurrency(tx.price, brl)}</td>
                  <td style={{ padding: "8px", fontWeight: 600 }}>{fmtCurrency(tx.total, brl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ChartCard
        title="Aportes por Transação"
        defaultHeight={260}
        render={h => (
          <ResponsiveContainer width="100%" height={h}>
            <BarChart data={txs.map(t => ({ label: `${t.ticker} ${t.date.slice(5)}`, value: t.total }))}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#1a2540" : "#e2e8f0"} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: MUTED }} />
              <YAxis tick={{ fontSize: 11, fill: MUTED }} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={(v: number) => fmtCurrency(v, brl)} contentStyle={TT} />
              <Bar dataKey="value" fill={BLUE} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// RENDA
// ──────────────────────────────────────────────────────────────────────────────
function Renda({ prices, brl, darkMode }: BaseTabProps & { prices: Record<Ticker, number> }) {
  const divData   = genDividends(prices);
  const totalAnual = divData.reduce((s, m) => s + m.total, 0);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        <StatCard label="Dividendos Anuais (est.)"  value={fmtCurrency(totalAnual, brl)}      color={GREEN} />
        <StatCard label="Dividendos Mensais (est.)" value={fmtCurrency(totalAnual / 12, brl)} color={BLUE} />
        <StatCard label="Yield on Cost"             value={`${fmt(totalAnual / TOTAL_BASE * 100, 2)}%`} color={GREEN} />
      </div>

      <ChartCard
        title="Projeção de Dividendos (12m)"
        defaultHeight={260}
        render={h => (
          <ResponsiveContainer width="100%" height={h}>
            <BarChart data={divData}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#1a2540" : "#e2e8f0"} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: MUTED }} />
              <YAxis tick={{ fontSize: 11, fill: MUTED }} tickFormatter={v => `$${v}`} />
              <Tooltip contentStyle={TT} />
              <Legend iconType="circle" iconSize={10} />
              <Bar dataKey="VTI"  stackId="a" fill={BLUE}    />
              <Bar dataKey="QQQM" stackId="a" fill="#a78bfa" />
              <Bar dataKey="Cash" stackId="a" fill={GREEN} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      />

      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Detalhamento Mensal</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {["Mês","VTI","QQQM","Cash","Total"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: MUTED, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {divData.map(m => (
              <tr key={m.month} style={{ borderBottom: `1px solid ${BORDER}` }}>
                <td style={{ padding: "8px" }}>{m.month}</td>
                <td style={{ padding: "8px" }}>{fmtCurrency(m.VTI, brl)}</td>
                <td style={{ padding: "8px" }}>{fmtCurrency(m.QQQM, brl)}</td>
                <td style={{ padding: "8px" }}>{fmtCurrency(m.Cash, brl)}</td>
                <td style={{ padding: "8px", fontWeight: 700, color: GREEN }}>{fmtCurrency(m.total, brl)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// METAS – FIRE Calculator
// ──────────────────────────────────────────────────────────────────────────────
function Metas({ total, brl, darkMode }: BaseTabProps & { total: number }) {
  const mobile = useMobile();
  const [monthly,  setMonthly]  = useState(500);
  const [target,   setTarget]   = useState(1000000);
  const [rate,     setRate]     = useState(8);
  const [expenses, setExpenses] = useState(3000);

  const fireNum  = expenses * 12 * 25;
  const safeRate = rate / 100 / 12;
  const years    = safeRate > 0 ? Math.log(1 + (target * safeRate) / monthly) / Math.log(1 + safeRate) / 12 : target / monthly / 12;
  const fireYears = safeRate > 0 ? Math.log(1 + (fireNum * safeRate) / monthly) / Math.log(1 + safeRate) / 12 : fireNum / monthly / 12;

  const cap = Math.min(Math.ceil(Math.max(years, fireYears)) + 2, 40);
  const projectionData = Array.from({ length: cap }, (_, i) => {
    const pv = safeRate > 0
      ? monthly * ((Math.pow(1 + safeRate, i * 12) - 1) / safeRate)
      : monthly * i * 12;
    return { year: `Ano ${i}`, value: +pv.toFixed(2) };
  });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 16 }}>
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 14 }}>Calculadora FIRE</div>
          <div style={{ display: "grid", gap: 12 }}>
            {[
              { label: "Aporte Mensal (US$)",       val: monthly,  set: setMonthly  },
              { label: "Meta de Patrimônio (US$)",   val: target,   set: setTarget   },
              { label: "Taxa de Retorno Anual (%)",  val: rate,     set: setRate     },
              { label: "Gastos Mensais (US$)",       val: expenses, set: setExpenses },
            ].map(f => (
              <label key={f.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: MUTED }}>{f.label}</span>
                <input type="number" value={f.val} onChange={e => f.set(+e.target.value)}
                  style={{ background: DARK_BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "7px 12px", color: TEXT, fontSize: 13 }} />
              </label>
            ))}
          </div>
          <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
            {[
              { label: "FIRE Number (25× gastos anuais)", val: fmtCurrency(fireNum, brl), color: GREEN },
              { label: "Anos para FIRE", val: isFinite(fireYears) && fireYears > 0 ? `${fireYears.toFixed(1)} anos` : "∞", color: BLUE },
              { label: "Anos para Meta", val: isFinite(years) && years > 0 ? `${years.toFixed(1)} anos` : "∞", color: "#fbbf24" },
            ].map(r => (
              <div key={r.label} style={{ background: DARK_BG, borderRadius: 8, padding: "12px", border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11, color: MUTED }}>{r.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: r.color }}>{r.val}</div>
              </div>
            ))}
          </div>
        </div>

        <ChartCard
          title="Progresso FIRE"
          defaultHeight={260}
          extra={
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: MUTED, marginBottom: 6 }}>
                <span>Atual: {fmtCurrency(total, brl)}</span>
                <span>FIRE: {fmtCurrency(fireNum, brl)}</span>
              </div>
              <div style={{ background: DARK_BG, borderRadius: 100, height: 10 }}>
                <div style={{ background: `linear-gradient(90deg,${BLUE},${GREEN})`, borderRadius: 100, height: "100%", width: `${Math.min(100, (total / fireNum) * 100).toFixed(1)}%`, transition: "width 0.5s" }} />
              </div>
              <div style={{ fontSize: 12, color: GREEN, marginTop: 6, textAlign: "right" }}>
                {((total / fireNum) * 100).toFixed(2)}% completo
              </div>
            </div>
          }
          render={h => (
            <ResponsiveContainer width="100%" height={h}>
              <AreaChart data={projectionData}>
                <defs>
                  <linearGradient id="fireGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={GREEN} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#1a2540" : "#e2e8f0"} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: MUTED }} interval={4} />
                <YAxis tick={{ fontSize: 11, fill: MUTED }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmtCurrency(v, brl)} contentStyle={TT} />
                <Area type="monotone" dataKey="value" stroke={GREEN} fill="url(#fireGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MERCADO
// ──────────────────────────────────────────────────────────────────────────────
type MktTicker = "VTI" | "QQQM" | "IBIT";
type TrendDir  = "↑" | "↓" | "→";

type MktData = {
  name: string; sector: string;
  analysts: { buy: number; hold: number; sell: number };
  consensusScore: number; targetPrice: number;
  pe: number | null; pb: number | null;
  dy: number; beta: number;
  high52: number; low52: number;
  rsi: number; trend: TrendDir;
};

const MARKET_DATA: Record<MktTicker, MktData> = {
  VTI:  { name: "Vanguard Total Market ETF",  sector: "Diversificado", analysts: { buy: 78, hold: 18, sell: 4  }, consensusScore: 4.3, targetPrice: 268.00, pe: 22.4, pb: 4.1,  dy: 1.42, beta: 1.00, high52: 263.45, low52: 198.32, rsi: 58, trend: "↑" },
  QQQM: { name: "Invesco Nasdaq 100 ETF",     sector: "Tecnologia",    analysts: { buy: 82, hold: 14, sell: 4  }, consensusScore: 4.5, targetPrice: 98.50,  pe: 31.2, pb: 7.8,  dy: 0.62, beta: 1.18, high52: 96.20,  low52: 68.40,  rsi: 63, trend: "↑" },
  IBIT: { name: "iShares Bitcoin Trust ETF",  sector: "Cripto",        analysts: { buy: 65, hold: 25, sell: 10 }, consensusScore: 3.8, targetPrice: 55.00,  pe: null, pb: null, dy: 0.00, beta: 1.62, high52: 58.10,  low52: 24.52,  rsi: 52, trend: "→" },
};
const MKT_TICKERS: MktTicker[] = ["VTI", "QQQM", "IBIT"];

function scoreLabel(s: number) {
  if (s >= 4.5) return "Comprar Forte";
  if (s >= 3.5) return "Comprar";
  if (s >= 2.5) return "Manter";
  if (s >= 1.5) return "Vender";
  return "Vender Forte";
}
function scoreColor(s: number) { return s >= 4 ? GREEN : s >= 3 ? "#fbbf24" : RED; }
function rsiColor(r: number)    { return r < 30 ? GREEN : r < 50 ? "#fbbf24" : r < 70 ? BLUE : RED; }
function rsiLabel(r: number)    { return r < 30 ? "Sobrevendido" : r < 50 ? "Neutro Baixo" : r < 70 ? "Neutro Alto" : "Sobrecomprado"; }
function trendColor(t: TrendDir){ return t === "↑" ? GREEN : t === "↓" ? RED : "#fbbf24"; }
function trendLabel(t: TrendDir){ return t === "↑" ? "Alta" : t === "↓" ? "Baixa" : "Lateral"; }

function Mercado({ prices, brl }: BaseTabProps & { prices: Record<Ticker, number> }) {
  const mobile = useMobile();

  const valRows: { label: string; vals: (number | null)[]; fmt: (v: number | null) => string; col: (v: number | null) => string }[] = [
    { label: "P/L (P/E)",      vals: MKT_TICKERS.map(t => MARKET_DATA[t].pe),   fmt: v => v != null ? `${v.toFixed(1)}×` : "—", col: v => v == null ? MUTED : v < 20 ? GREEN : v < 35 ? "#fbbf24" : RED },
    { label: "P/VP (P/B)",     vals: MKT_TICKERS.map(t => MARKET_DATA[t].pb),   fmt: v => v != null ? `${v.toFixed(1)}×` : "—", col: v => v == null ? MUTED : v < 3 ? GREEN : v < 6 ? "#fbbf24" : RED },
    { label: "Dividend Yield", vals: MKT_TICKERS.map(t => MARKET_DATA[t].dy),   fmt: v => v != null ? `${v.toFixed(2)}%` : "—", col: v => v != null && v > 1 ? GREEN : "#fbbf24" },
    { label: "Beta",           vals: MKT_TICKERS.map(t => MARKET_DATA[t].beta), fmt: v => v != null ? v.toFixed(2) : "—",       col: v => v == null ? MUTED : v < 1 ? GREEN : v < 1.3 ? "#fbbf24" : RED },
  ];

  return (
    <div style={{ display: "grid", gap: 24 }}>

      {/* ── 1 · Consenso dos Analistas ─────────────────────────────────────── */}
      <section>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Consenso dos Analistas</span>
          <span style={{ fontSize: 11, color: MUTED }}>dados simulados · atualizado agora</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3,1fr)", gap: 14 }}>
          {MKT_TICKERS.map(ticker => {
            const d      = MARKET_DATA[ticker];
            const cur    = prices[ticker as Ticker] ?? BASE[ticker as Ticker].price;
            const upside = ((d.targetPrice - cur) / cur) * 100;
            const badge  = upside > 3 ? { label: "COMPRAR", color: GREEN, bg: "rgba(0,212,161,0.13)" }
                         : upside < -3 ? { label: "ATENÇÃO",  color: RED,   bg: "rgba(255,77,109,0.13)" }
                         : { label: "AGUARDAR", color: "#fbbf24", bg: "rgba(251,191,36,0.13)" };

            return (
              <div key={ticker} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>

                {/* header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: BASE[ticker as Ticker].color, display: "inline-block" }} />
                      <span style={{ fontWeight: 800, fontSize: 16 }}>{ticker}</span>
                    </div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 3, paddingLeft: 17 }}>{d.name}</div>
                  </div>
                  <span style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.color}`, borderRadius: 6, fontSize: 10, fontWeight: 800, padding: "4px 9px", letterSpacing: 0.8, whiteSpace: "nowrap" }}>
                    {badge.label}
                  </span>
                </div>

                {/* buy / hold / sell bar */}
                <div style={{ marginBottom: 13 }}>
                  <div style={{ display: "flex", height: 8, borderRadius: 100, overflow: "hidden", gap: 2, marginBottom: 7 }}>
                    <div style={{ flex: d.analysts.buy,  background: GREEN }} />
                    <div style={{ flex: d.analysts.hold, background: "#fbbf24" }} />
                    <div style={{ flex: d.analysts.sell, background: RED }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ color: GREEN }}>{d.analysts.buy}% Comprar</span>
                    <span style={{ color: "#fbbf24" }}>{d.analysts.hold}% Manter</span>
                    <span style={{ color: RED }}>{d.analysts.sell}% Vender</span>
                  </div>
                </div>

                {/* consensus score bar */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                    <span style={{ fontSize: 11, color: MUTED }}>Score de Consenso</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(d.consensusScore) }}>
                      {d.consensusScore.toFixed(1)}/5 · {scoreLabel(d.consensusScore)}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {([RED, "#f97316", "#fbbf24", "#84cc16", GREEN] as const).map((segColor, i) => {
                      const filled = d.consensusScore >= i + 1;
                      const half   = !filled && d.consensusScore > i + 0.5;
                      return (
                        <div key={i} style={{ flex: 1, height: 7, borderRadius: 100, background: filled ? segColor : half ? segColor : BORDER, opacity: half ? 0.45 : 1, transition: "background 0.3s" }} />
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: MUTED, marginTop: 4 }}>
                    <span>Vender Forte</span><span>Neutro</span><span>Comprar Forte</span>
                  </div>
                </div>

                {/* target price box */}
                <div style={{ background: DARK_BG, borderRadius: 10, padding: "11px 13px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, color: MUTED, marginBottom: 2 }}>Preço Atual</div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{fmtCurrency(cur, brl)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: MUTED, marginBottom: 2 }}>Preço-Alvo</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: scoreColor(d.consensusScore) }}>{fmtCurrency(d.targetPrice, brl)}</div>
                    </div>
                  </div>
                  <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
                    <span style={{ fontSize: 11, color: MUTED }}>Upside potencial: </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: upside >= 0 ? GREEN : RED }}>
                      {upside >= 0 ? "+" : ""}{upside.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 2 · Métricas de Valuation ──────────────────────────────────────── */}
      <section>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Métricas de Valuation</div>
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: DARK_BG }}>
                  <th style={{ textAlign: "left", padding: "12px 18px", color: MUTED, fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>Métrica</th>
                  {MKT_TICKERS.map(t => (
                    <th key={t} style={{ textAlign: "center", padding: "12px 18px", fontWeight: 700, fontSize: 13 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: BASE[t as Ticker].color, display: "inline-block" }} />
                        {t}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {valRows.map(row => (
                  <tr key={row.label} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td style={{ padding: "12px 18px", color: MUTED, fontWeight: 500, whiteSpace: "nowrap" }}>{row.label}</td>
                    {row.vals.map((v, i) => (
                      <td key={i} style={{ padding: "12px 18px", textAlign: "center", fontWeight: 700, color: row.col(v) }}>{row.fmt(v)}</td>
                    ))}
                  </tr>
                ))}

                {/* 52-week range with position dot */}
                <tr style={{ borderTop: `1px solid ${BORDER}` }}>
                  <td style={{ padding: "12px 18px", color: MUTED, fontWeight: 500, whiteSpace: "nowrap" }}>Máx./Mín. 52s</td>
                  {MKT_TICKERS.map(t => {
                    const d   = MARKET_DATA[t];
                    const cur = prices[t as Ticker] ?? BASE[t as Ticker].price;
                    const pos = Math.max(0, Math.min(100, ((cur - d.low52) / (d.high52 - d.low52)) * 100));
                    const dotColor = pos > 70 ? GREEN : pos > 35 ? BLUE : "#fbbf24";
                    return (
                      <td key={t} style={{ padding: "10px 18px", textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: MUTED, marginBottom: 6 }}>
                          ${fmt(d.low52, 2)} – ${fmt(d.high52, 2)}
                        </div>
                        <div style={{ position: "relative", height: 6, background: BORDER, borderRadius: 100, margin: "0 6px" }}>
                          <div style={{ height: "100%", width: `${pos}%`, background: `linear-gradient(90deg,#fbbf24,${GREEN})`, borderRadius: 100 }} />
                          <div style={{ position: "absolute", left: `${pos}%`, top: "50%", transform: "translate(-50%,-50%)", width: 12, height: 12, borderRadius: "50%", background: dotColor, border: `2px solid ${DARK_BG}`, boxShadow: `0 0 5px ${dotColor}` }} />
                        </div>
                        <div style={{ fontSize: 11, marginTop: 6, fontWeight: 700, color: dotColor }}>{pos.toFixed(0)}% do range</div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 3 · Momentum & Tendência ───────────────────────────────────────── */}
      <section>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Momentum & Tendência</div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3,1fr)", gap: 14 }}>
          {MKT_TICKERS.map(ticker => {
            const d  = MARKET_DATA[ticker];
            const rc = rsiColor(d.rsi);
            const tc = trendColor(d.trend);

            return (
              <div key={ticker} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>

                {/* header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: BASE[ticker as Ticker].color, display: "inline-block" }} />
                    <span style={{ fontWeight: 800, fontSize: 15 }}>{ticker}</span>
                  </div>
                  <span style={{ fontSize: 26, color: tc, fontWeight: 900, lineHeight: 1 }}>{d.trend}</span>
                </div>

                {/* RSI track */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: MUTED }}>RSI (14)</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: rc }}>{d.rsi}</span>
                  </div>
                  <div style={{ position: "relative", height: 8, borderRadius: 100, background: `linear-gradient(90deg, ${GREEN} 0%, ${GREEN} 29%, #fbbf24 30%, #fbbf24 49%, ${BLUE} 50%, ${BLUE} 69%, ${RED} 70%, ${RED} 100%)` }}>
                    <div style={{ position: "absolute", left: `${d.rsi}%`, top: "50%", transform: "translate(-50%,-50%)", width: 16, height: 16, borderRadius: "50%", background: rc, border: `2px solid ${DARK_BG}`, boxShadow: `0 0 8px ${rc}80` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: MUTED, marginTop: 5 }}>
                    <span>0</span><span>30</span><span>50</span><span>70</span><span>100</span>
                  </div>
                </div>

                {/* signal + trend summary */}
                <div style={{ background: DARK_BG, borderRadius: 10, padding: "11px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: MUTED, marginBottom: 3 }}>Sinal RSI</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: rc }}>{rsiLabel(d.rsi)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: MUTED, marginBottom: 3 }}>Tendência</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: tc }}>{trendLabel(d.trend)}</div>
                  </div>
                </div>

                {/* sector chip */}
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontSize: 10, color: MUTED, background: DARK_BG, borderRadius: 100, padding: "3px 12px", border: `1px solid ${BORDER}` }}>{d.sector}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// AI CHAT
// ──────────────────────────────────────────────────────────────────────────────
type Message = { role: "user" | "assistant"; content: string };

function AIChat(_props: BaseTabProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Olá! Sou o assistente AI do Reinhardt AI. Posso te ajudar a analisar seu portfólio, responder dúvidas sobre investimentos e muito mais. Como posso ajudar hoje?" }
  ]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const endRef      = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    setError("");
    const userMsg: Message = { role: "user", content: input.trim() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json() as Record<string, any>;
      if (!res.ok) {
        setError(data.error ?? "Erro ao processar resposta.");
        setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${data.error ?? "Erro desconhecido."}` }]);
      } else {
        const text = data.content?.[0]?.text ?? "Sem resposta.";
        setMessages(prev => [...prev, { role: "assistant", content: text }]);
      }
    } catch {
      const msg = "Erro de conexão com o servidor. Tente novamente.";
      setError(msg);
      setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${msg}` }]);
    }
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "calc(100vh - 200px)", minHeight: 500 }}>
      {/* Status bar */}
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: GREEN, display: "inline-block", boxShadow: `0 0 6px ${GREEN}` }} />
        <span style={{ fontSize: 12, color: MUTED }}>Conectado via proxy seguro · modelo <span style={{ color: TEXT, fontWeight: 600 }}>claude-sonnet-4-20250514</span></span>
        {error && <span style={{ marginLeft: "auto", fontSize: 11, color: RED }}>⚠ {error}</span>}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: m.role === "user" ? "row-reverse" : "row", gap: 8, alignItems: "flex-start" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: m.role === "user" ? BLUE : GREEN, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
              {m.role === "user" ? "👤" : "🤖"}
            </div>
            <div style={{ maxWidth: "75%", background: m.role === "user" ? `${BLUE}22` : DARK_BG, borderRadius: 10, padding: "10px 14px", border: `1px solid ${m.role === "user" ? BLUE + "44" : BORDER}`, fontSize: 13, lineHeight: 1.6, color: TEXT, whiteSpace: "pre-wrap" }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: GREEN, display: "flex", alignItems: "center", justifyContent: "center" }}>🤖</div>
            <div style={{ background: DARK_BG, borderRadius: 10, padding: "10px 14px", border: `1px solid ${BORDER}`, fontSize: 13, color: MUTED }}>Pensando...</div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 10 }}>
        <input
          ref={chatInputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Pergunte sobre seu portfólio..."
          disabled={loading}
          style={{ flex: 1, background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 16px", color: TEXT, fontSize: 13, opacity: loading ? 0.6 : 1 }} />
        <button onClick={send} disabled={loading || !input.trim()}
          style={{ background: BLUE, color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", cursor: "pointer", fontWeight: 600, opacity: loading ? 0.5 : 1 }}>
          {loading ? "..." : "Enviar"}
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// ALERTAS
// ──────────────────────────────────────────────────────────────────────────────
const ALERT_RULES_INIT = [
  { id: 1, label: "VTI cai 3%",                ticker: "VTI",  threshold: -3, active: true },
  { id: 2, label: "QQQM cai 5%",               ticker: "QQQM", threshold: -5, active: true },
  { id: 3, label: "IBIT cai 8%",               ticker: "IBIT", threshold: -8, active: true },
  { id: 4, label: "Rebalanceamento 5% desvio", ticker: "ALL",  threshold: -5, active: true },
];

// ─── Service-worker notification helper ───────────────────────────────────────
// Uses ServiceWorkerRegistration.showNotification() which works on both desktop
// and mobile Chrome. Falls back gracefully when SW is unavailable.
async function showNotification(title: string, body: string) {
  if (typeof Notification === "undefined") return;
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, { body, icon: "/favicon.ico" });
      return;
    } catch {
      // fall through to legacy path
    }
  }
  // Desktop browsers that still support the constructor directly
  try { new Notification(title, { body, icon: "/favicon.ico" }); } catch { /* no-op */ }
}

function Alertas({ brl: _b }: BaseTabProps & { prices: Record<Ticker, number> }) {
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [swReady,   setSwReady]   = useState(false);
  const ls = (k: string) => localStorage.getItem(k) ?? "";
  const [tgToken,   setTgTokenRaw]   = useState(() => ls("reinhardt_tg_token"));
  const [tgChatId,  setTgChatIdRaw]  = useState(() => ls("reinhardt_tg_chat"));
  const [tgStatus,  setTgStatus]     = useState("");
  const [ntfyTopic, setNtfyTopicRaw] = useState(() => ls("reinhardt_ntfy_topic"));
  const [emailAddr, setEmailAddrRaw] = useState(() => ls("reinhardt_email"));
  const [waPhone,   setWaPhoneRaw]   = useState(() => ls("reinhardt_phone"));

  const persist = (key: string, val: string) => localStorage.setItem(key, val);
  const setTgToken   = (v: string) => { setTgTokenRaw(v);   persist("reinhardt_tg_token",   v); };
  const setTgChatId  = (v: string) => { setTgChatIdRaw(v);  persist("reinhardt_tg_chat",    v); };
  const setNtfyTopic = (v: string) => { setNtfyTopicRaw(v); persist("reinhardt_ntfy_topic", v); };
  const setEmailAddr = (v: string) => { setEmailAddrRaw(v); persist("reinhardt_email",      v); };
  const setWaPhone   = (v: string) => { setWaPhoneRaw(v);   persist("reinhardt_phone",      v); };
  const [rules,     setRules]     = useState(ALERT_RULES_INIT);
  const [log,       setLog]       = useState<string[]>([]);

  const addLog = useCallback((msg: string) => setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]), []);

  // Register service worker once on mount and track when it is active + controlling
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").then(reg => {
      // Already active from a previous visit — mark ready immediately
      if (reg.active) { setSwReady(true); return; }

      // Still installing or waiting — listen for the state transition
      const sw = reg.installing ?? reg.waiting;
      if (sw) {
        sw.addEventListener("statechange", function handler() {
          if (sw.state === "activated") {
            setSwReady(true);
            sw.removeEventListener("statechange", handler);
          }
        });
      }
    }).catch(() => setSwReady(false));

    // clients.claim() fires controllerchange; catch it as a fallback
    navigator.serviceWorker.addEventListener("controllerchange", () => setSwReady(true));
  }, []);

  async function requestNotif() {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === "granted") {
      await showNotification("Reinhardt AI", "Notificações ativadas com sucesso! 🎉");
      addLog("Permissão concedida. Notificação de teste enviada.");
    } else {
      addLog("Permissão negada.");
    }
  }

  async function testBrowserNotif() {
    if (notifPerm === "granted") {
      await showNotification("Reinhardt AI – Teste", "Alerta de teste disparado! VTI -3% simulado.");
      addLog("Notificação browser disparada.");
    }
  }

  async function fetchTelegramId() {
    if (!tgToken) return;
    setTgStatus("Buscando...");
    try {
      const res  = await fetch(`https://api.telegram.org/bot${tgToken}/getUpdates`);
      const data = await res.json();
      const chats = (data.result ?? []).map((u: any) => u.message?.chat?.id).filter(Boolean);
      if (chats.length > 0) {
        setTgChatId(String(chats[0]));
        setTgStatus(`ID encontrado: ${chats[0]}`);
        addLog(`Telegram chat ID encontrado: ${chats[0]}`);
      } else {
        setTgStatus("Nenhuma mensagem. Envie /start ao bot primeiro.");
      }
    } catch {
      setTgStatus("Erro. Verifique o token.");
    }
  }

  async function sendTelegram(msg: string) {
    if (!tgToken || !tgChatId) { addLog("Telegram: token/chatId ausente."); return; }
    try {
      await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: tgChatId, text: msg }),
      });
      addLog("Telegram: mensagem enviada.");
    } catch { addLog("Telegram: erro ao enviar."); }
  }

  async function sendNtfy(msg: string) {
    if (!ntfyTopic) { addLog("ntfy: tópico não configurado."); return; }
    try {
      await fetch(`https://ntfy.sh/${ntfyTopic}`, { method: "POST", body: msg });
      addLog(`ntfy (${ntfyTopic}): notificação enviada.`);
    } catch { addLog("ntfy: erro ao enviar."); }
  }

  async function testAll() {
    const msg = "🔔 Reinhardt AI – Alerta de teste!";
    if (notifPerm === "granted") {
      await showNotification("Reinhardt AI", msg);
      addLog("Browser notification disparada.");
    }
    sendTelegram(msg);
    sendNtfy(msg);
    addLog("Teste de todos os canais enviado.");
  }

  const inputStyle: React.CSSProperties = { background: DARK_BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "7px 12px", color: TEXT, fontSize: 12 };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Rules */}
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Regras de Alerta</div>
        <div style={{ display: "grid", gap: 8 }}>
          {rules.map(rule => (
            <div key={rule.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: DARK_BG, borderRadius: 8, border: `1px solid ${BORDER}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{rule.label}</div>
                <div style={{ fontSize: 11, color: MUTED }}>Ticker: {rule.ticker} | Limite: {rule.threshold}%</div>
              </div>
              <span style={{ fontSize: 11, color: rule.active ? GREEN : MUTED }}>{rule.active ? "Ativo" : "Inativo"}</span>
              <button onClick={() => setRules(r => r.map(x => x.id === rule.id ? { ...x, active: !x.active } : x))} style={{
                background: rule.active ? GREEN + "22" : DARK_BG, border: `1px solid ${rule.active ? GREEN : BORDER}`,
                color: rule.active ? GREEN : MUTED, borderRadius: 20, padding: "3px 12px", cursor: "pointer", fontSize: 11, fontWeight: 600,
              }}>{rule.active ? "Desativar" : "Ativar"}</button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Browser */}
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>🔔 Notificações Browser</div>
          <div style={{ display: "grid", gap: 4, marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: MUTED }}>
              Permissão: <span style={{ color: notifPerm === "granted" ? GREEN : notifPerm === "denied" ? RED : MUTED, fontWeight: 600 }}>
                {notifPerm === "granted" ? "Permitido" : notifPerm === "denied" ? "Bloqueado" : "Não solicitado"}
              </span>
            </div>
            <div style={{ fontSize: 12, color: MUTED }}>
              Service Worker: <span style={{ color: swReady ? GREEN : MUTED, fontWeight: 600 }}>
                {swReady ? "Registrado ✓" : "Aguardando..."}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={requestNotif} disabled={notifPerm === "granted"} style={{ background: BLUE, color: "#fff", border: "none", borderRadius: 6, padding: "7px 14px", cursor: notifPerm === "granted" ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600, opacity: notifPerm === "granted" ? 0.5 : 1 }}>
              Solicitar Permissão
            </button>
            <button onClick={testBrowserNotif} disabled={notifPerm !== "granted"} style={{ background: "transparent", color: BLUE, border: `1px solid ${BLUE}`, borderRadius: 6, padding: "7px 14px", cursor: notifPerm !== "granted" ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600, opacity: notifPerm !== "granted" ? 0.4 : 1 }}>
              Testar
            </button>
          </div>
        </div>

        {/* Telegram */}
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>✈️ Telegram Bot</div>
          <div style={{ display: "grid", gap: 8 }}>
            <input value={tgToken} onChange={e => setTgToken(e.target.value)} placeholder="Bot Token (de @BotFather)" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <input value={tgChatId} onChange={e => setTgChatId(e.target.value)} placeholder="Chat ID" style={{ ...inputStyle, flex: 1 }} />
              <button onClick={fetchTelegramId} style={{ background: BLUE, color: "#fff", border: "none", borderRadius: 6, padding: "7px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>Buscar ID</button>
            </div>
            {tgStatus && <div style={{ fontSize: 11, color: tgStatus.startsWith("ID") ? GREEN : RED }}>{tgStatus}</div>}
            <button onClick={() => sendTelegram("🔔 Reinhardt AI – Teste Telegram!")} style={{ background: "transparent", color: BLUE, border: `1px solid ${BLUE}`, borderRadius: 6, padding: "7px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Enviar Teste</button>
          </div>
        </div>

        {/* ntfy */}
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>📡 ntfy.sh Push</div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>Instale o app ntfy no celular e crie um tópico único.</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={ntfyTopic} onChange={e => setNtfyTopic(e.target.value)} placeholder="meu-topico-unico" style={{ ...inputStyle, flex: 1 }} />
            <button onClick={() => sendNtfy("🔔 Reinhardt AI – Teste ntfy!")} style={{ background: GREEN + "22", color: GREEN, border: `1px solid ${GREEN}`, borderRadius: 6, padding: "7px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Testar</button>
          </div>
        </div>

        {/* Email + WhatsApp */}
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>📧 Email / WhatsApp</div>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={emailAddr} onChange={e => setEmailAddr(e.target.value)} placeholder="seu@email.com" style={{ ...inputStyle, flex: 1 }} />
              <a href={`mailto:${emailAddr}?subject=Reinhardt%20AI%20Alerta&body=Alerta%20do%20portf%C3%B3lio%20disparado.`}
                style={{ background: BLUE + "22", color: BLUE, border: `1px solid ${BLUE}`, borderRadius: 6, padding: "7px 12px", fontSize: 12, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap", display: "flex", alignItems: "center" }}>
                Enviar Email
              </a>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={waPhone} onChange={e => setWaPhone(e.target.value)} placeholder="5511999999999 (DDI+DDD)" style={{ ...inputStyle, flex: 1 }} />
              <a href={`https://wa.me/${waPhone}?text=%F0%9F%94%94%20Reinhardt%20AI%20Alerta!`} target="_blank" rel="noreferrer"
                style={{ background: "#25d36622", color: "#25d366", border: "1px solid #25d366", borderRadius: 6, padding: "7px 12px", fontSize: 12, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap", display: "flex", alignItems: "center" }}>
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>

      <button onClick={testAll} style={{ background: `linear-gradient(135deg,${BLUE},${GREEN})`, color: "#fff", border: "none", borderRadius: 10, padding: "12px", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
        🚀 Testar Todos os Canais
      </button>

      {log.length > 0 && (
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>Log de Alertas</div>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: GREEN, display: "grid", gap: 2 }}>
            {log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}
