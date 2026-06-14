import { useState, useReducer } from "react";

const C = {
  bg: "#0F1523", surface: "#18212F", card: "#1E2B3C", border: "#2A3A50",
  amber: "#F5A623", coral: "#E05A4E", emerald: "#34C77B", blue: "#4A9EE0",
  purple: "#9B7FE8", textPrimary: "#F0F4F8", textSecondary: "#7A92AB", textMuted: "#3D5166",
};

const fmt = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const todayISO = () => new Date().toISOString().split("T")[0];
const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const currentYM = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
const fmtMonth = (ym) => { const [y,m] = ym.split("-"); return new Date(y, m-1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" }); };

const EXPENSE_CATS = ["Food", "Travel", "Utilities", "Shopping", "Health", "Entertainment", "Other"];

function getWeekRange(date = new Date()) {
  const d = new Date(date), day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff));
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return [mon.toISOString().split("T")[0], sun.toISOString().split("T")[0]];
}
function getMonthRange(ym = currentYM()) {
  const [y, m] = ym.split("-").map(Number);
  return [new Date(y, m-1, 1).toISOString().split("T")[0], new Date(y, m, 0).toISOString().split("T")[0]];
}
function inRange(d, [s, e]) { return d >= s && d <= e; }
function groupByDay(entries) {
  const map = {};
  entries.forEach(e => { if (!map[e.date]) map[e.date] = []; map[e.date].push(e); });
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
}

// ── Reducer ──────────────────────────────────────────────────────
const init = {
  expenses: [],
  monthlyOpening: {}, // { "YYYY-MM": number }
  view: "home",
};
function reducer(state, action) {
  switch (action.type) {
    case "NAV": return { ...state, view: action.view };
    case "ADD_EXPENSE": return { ...state, expenses: [action.entry, ...state.expenses], view: "home" };
    case "DEL_EXPENSE": return { ...state, expenses: state.expenses.filter(e => e.id !== action.id) };
    case "SET_OPENING": return { ...state, monthlyOpening: { ...state.monthlyOpening, [action.ym]: action.value }, view: "home" };
    default: return state;
  }
}

// ── Bottom Nav ────────────────────────────────────────────────────
function BottomNav({ view, dispatch }) {
  const tabs = [
    { id: "home",    label: "Home",    icon: "⊞" },
    { id: "summary", label: "Summary", icon: "◑" },
    { id: "history", label: "History", icon: "≡" },
  ];
  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, background:C.surface, borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-around", padding:"10px 0 20px", zIndex:100 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => dispatch({ type:"NAV", view:t.id })}
          style={{ background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4, color:view===t.id?C.amber:C.textSecondary, fontSize:12, fontWeight:view===t.id?700:400 }}>
          <span style={{ fontSize:20 }}>{t.icon}</span>{t.label}
        </button>
      ))}
    </div>
  );
}

// ── Home ──────────────────────────────────────────────────────────
function HomeView({ state, dispatch }) {
  const today = todayISO();
  const ym = currentYM();
  const [mStart, mEnd] = getMonthRange(ym);
  const [wStart, wEnd] = getWeekRange();

  const opening = state.monthlyOpening[ym];
  const monthExp = state.expenses.filter(e => inRange(e.date, [mStart, mEnd])).reduce((s,e)=>s+e.amount, 0);
  const weekExp  = state.expenses.filter(e => inRange(e.date, [wStart, wEnd])).reduce((s,e)=>s+e.amount, 0);
  const dayExp   = state.expenses.filter(e => e.date === today).reduce((s,e)=>s+e.amount, 0);

  // Current balance = opening - expenses this month
  const currentBal = opening != null ? opening - monthExp : null;

  const todayEntries = state.expenses.filter(e => e.date === today);

  return (
    <div style={{ padding:"24px 16px 100px" }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ color:C.textSecondary, fontSize:13 }}>{fmtDate(today)}</div>
        <div style={{ color:C.textPrimary, fontSize:26, fontWeight:800, marginTop:2 }}>Daily Tracker</div>
      </div>

      {/* Opening Balance card */}
      <div style={{ background:C.card, borderRadius:16, padding:"16px 18px", marginBottom:16, border:`1px solid ${C.border}` }}>
        {/* Current Balance — prominent */}
        {currentBal != null && (
          <div style={{ marginBottom:12 }}>
            <div style={{ color:C.textSecondary, fontSize:10, letterSpacing:1, marginBottom:4 }}>CURRENT BALANCE</div>
            <div style={{ color:currentBal>=0?C.emerald:C.coral, fontSize:34, fontWeight:800 }}>{fmt(currentBal)}</div>
          </div>
        )}
        {/* Opening balance + edit — small */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderTop: currentBal != null ? `1px solid ${C.border}` : "none", paddingTop: currentBal != null ? 10 : 0 }}>
          <div>
            <div style={{ color:C.textMuted, fontSize:10, marginBottom:2 }}>Opening · {fmtMonth(ym)}</div>
            <div style={{ display:"flex", gap:16, alignItems:"center" }}>
              <span style={{ color:C.blue, fontSize:13, fontWeight:600 }}>{opening != null ? fmt(opening) : "—"}</span>
              {currentBal != null && <span style={{ color:C.textMuted, fontSize:12 }}>−Expenses {fmt(monthExp)}</span>}
            </div>
          </div>
          <button onClick={() => dispatch({ type:"NAV", view:"setOpening" })}
            style={{ background:C.border, border:"none", borderRadius:10, padding:"6px 12px", color:C.textSecondary, cursor:"pointer", fontSize:12 }}>
            ✏️ Edit
          </button>
        </div>
      </div>

      {/* Expense stats — day / week / month */}
      <div style={{ color:C.textSecondary, fontSize:11, letterSpacing:1, marginBottom:10 }}>EXPENSES</div>
      <div style={{ display:"flex", gap:10, marginBottom:24 }}>
        {[
          { label:"TODAY",      value:dayExp,   color:C.coral  },
          { label:"THIS WEEK",  value:weekExp,  color:C.amber  },
          { label:"THIS MONTH", value:monthExp, color:C.purple },
        ].map(card => (
          <div key={card.label} style={{ flex:1, background:C.card, borderRadius:14, padding:"12px 10px", border:`1px solid ${C.border}`, textAlign:"center" }}>
            <div style={{ color:C.textSecondary, fontSize:9, letterSpacing:0.8, marginBottom:6 }}>{card.label}</div>
            <div style={{ color:card.color, fontSize:14, fontWeight:700 }}>{fmt(card.value)}</div>
          </div>
        ))}
      </div>

      {/* Quick add */}
      <button onClick={() => dispatch({ type:"NAV", view:"addExpense" })}
        style={{ width:"100%", background:`${C.coral}22`, border:`1px solid ${C.coral}66`, borderRadius:14, padding:"16px", color:C.textPrimary, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:24 }}>
        <span style={{ fontSize:20 }}>💸</span>
        <span style={{ fontWeight:700, fontSize:15 }}>Add Expense</span>
      </button>

      {/* Today's entries */}
      {todayEntries.length > 0 && (
        <>
          <div style={{ color:C.textSecondary, fontSize:11, letterSpacing:1, marginBottom:10 }}>TODAY'S ENTRIES</div>
          {todayEntries.map(e => (
            <div key={e.id} style={{ background:C.card, borderRadius:12, padding:"12px 16px", marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center", border:`1px solid ${C.border}` }}>
              <div>
                <div style={{ color:C.textPrimary, fontWeight:600, fontSize:14 }}>{e.category}</div>
                {e.note && <div style={{ color:C.textSecondary, fontSize:12, marginTop:2 }}>{e.note}</div>}
              </div>
              <div style={{ color:C.coral, fontWeight:700, fontSize:15 }}>-{fmt(e.amount)}</div>
            </div>
          ))}
        </>
      )}
      {todayEntries.length === 0 && (
        <div style={{ textAlign:"center", padding:"24px 0", color:C.textMuted, fontSize:14 }}>No entries today</div>
      )}
    </div>
  );
}

// ── Set Opening Balance ───────────────────────────────────────────
function SetOpeningView({ state, dispatch }) {
  const ym0 = currentYM();
  const [ym, setYm]       = useState(ym0);
  const [value, setValue] = useState(state.monthlyOpening[ym0] != null ? String(state.monthlyOpening[ym0]) : "");

  const save = () => {
    const p = parseFloat(value);
    if (isNaN(p)) return;
    dispatch({ type:"SET_OPENING", ym, value: p });
  };

  return (
    <div style={{ padding:"24px 16px 100px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:28 }}>
        <button onClick={() => dispatch({ type:"NAV", view:"home" })}
          style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"8px 12px", color:C.textPrimary, cursor:"pointer", fontSize:16 }}>←</button>
        <div style={{ color:C.textPrimary, fontSize:22, fontWeight:800 }}>Opening Balance</div>
      </div>

      <Label>Month</Label>
      <input type="month" value={ym} onChange={e => { setYm(e.target.value); setValue(state.monthlyOpening[e.target.value] != null ? String(state.monthlyOpening[e.target.value]) : ""); }} style={inp()} />

      <Label>Opening Balance (₹)</Label>
      <input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="e.g. 25000" style={inp()} />

      <div style={{ color:C.textMuted, fontSize:12, marginBottom:20, lineHeight:1.6 }}>
        This is your bank/cash balance at the start of the month. Current balance will be auto-calculated as Opening + Income − Expenses.
      </div>

      <button onClick={save} style={{ width:"100%", background:C.blue, border:"none", borderRadius:14, padding:16, color:"#fff", fontSize:16, fontWeight:700, cursor:"pointer" }}>
        Save Opening Balance
      </button>
    </div>
  );
}

// ── Add Expense / Income forms ────────────────────────────────────
function EntryForm({ title, cats, category, setCategory, amount, setAmount, note, setNote, date, setDate, onSave, btnColor, btnLabel, onBack }) {
  return (
    <div style={{ padding:"24px 16px 100px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:28 }}>
        <button onClick={onBack} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"8px 12px", color:C.textPrimary, cursor:"pointer", fontSize:16 }}>←</button>
        <div style={{ color:C.textPrimary, fontSize:22, fontWeight:800 }}>{title}</div>
      </div>
      <Label>Amount (₹)</Label>
      <input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="0" style={inp()} />
      <Label>Category</Label>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:20 }}>
        {cats.map(c => (
          <button key={c} onClick={() => setCategory(c)} style={{ padding:"8px 14px", borderRadius:20, fontSize:13, cursor:"pointer", background:category===c?C.amber:C.card, color:category===c?"#000":C.textSecondary, border:`1px solid ${category===c?C.amber:C.border}`, fontWeight:category===c?700:400 }}>{c}</button>
        ))}
      </div>
      <Label>Note (optional)</Label>
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Lunch" style={inp()} />
      <Label>Date</Label>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp()} />
      <button onClick={onSave} style={{ width:"100%", background:btnColor, border:"none", borderRadius:14, padding:16, color:"#fff", fontSize:16, fontWeight:700, cursor:"pointer", marginTop:8 }}>{btnLabel}</button>
    </div>
  );
}

function AddExpenseView({ dispatch }) {
  const [amount, setAmount] = useState(""); const [category, setCategory] = useState("Food");
  const [note, setNote] = useState(""); const [date, setDate] = useState(todayISO());
  const save = () => { const p=parseFloat(amount); if(!p||p<=0) return; dispatch({ type:"ADD_EXPENSE", entry:{id:Date.now(),date,amount:p,category,note} }); };
  return <EntryForm title="Add Expense" cats={EXPENSE_CATS} category={category} setCategory={setCategory} amount={amount} setAmount={setAmount} note={note} setNote={setNote} date={date} setDate={setDate} onSave={save} btnColor={C.coral} btnLabel="Save Expense" onBack={() => dispatch({ type:"NAV", view:"home" })} />;
}



// ── Summary ───────────────────────────────────────────────────────
function SummaryView({ state }) {
  const [period, setPeriod] = useState("month");
  const today = todayISO();
  const [wStart, wEnd] = getWeekRange();
  const [mStart, mEnd] = getMonthRange();
  const ranges = { day:[today,today], week:[wStart,wEnd], month:[mStart,mEnd] };
  const range  = ranges[period];

  const expenses = state.expenses.filter(e => inRange(e.date, range));
  const totalExp = expenses.reduce((s,e)=>s+e.amount, 0);

  const catMap = {};
  expenses.forEach(e => { catMap[e.category] = (catMap[e.category]||0) + e.amount; });
  const cats = Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
  const dayGroups = groupByDay(expenses);
  const colors = [C.coral, C.amber, C.blue, C.purple, C.emerald, "#E88C4A", "#5BC4C0"];

  return (
    <div style={{ padding:"24px 16px 100px" }}>
      <div style={{ color:C.textPrimary, fontSize:22, fontWeight:800, marginBottom:20 }}>Summary</div>
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {["day","week","month"].map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{ flex:1, padding:"10px 0", borderRadius:20, fontSize:13, cursor:"pointer", background:period===p?C.amber:C.card, color:period===p?"#000":C.textSecondary, border:`1px solid ${period===p?C.amber:C.border}`, fontWeight:period===p?700:400 }}>
            {p==="day"?"Today":p==="week"?"Week":"Month"}
          </button>
        ))}
      </div>

      {/* Total spent */}
      <div style={{ background:C.card, borderRadius:16, padding:"18px", marginBottom:14, border:`1px solid ${C.border}`, textAlign:"center" }}>
        <div style={{ color:C.textSecondary, fontSize:10, letterSpacing:1, marginBottom:6 }}>TOTAL SPENT</div>
        <div style={{ color:C.coral, fontSize:28, fontWeight:800 }}>{fmt(totalExp)}</div>
        <div style={{ color:C.textMuted, fontSize:12, marginTop:4 }}>{expenses.length} transactions</div>
      </div>

      {/* Category breakdown */}
      {cats.length > 0 && (
        <>
          <div style={{ color:C.textSecondary, fontSize:11, letterSpacing:1, marginBottom:12 }}>EXPENSES BY CATEGORY</div>
          {cats.map(([cat,amt],i) => {
            const pct = totalExp>0 ? (amt/totalExp*100).toFixed(0) : 0;
            return (
              <div key={cat} style={{ background:C.card, borderRadius:12, padding:"12px 16px", marginBottom:8, border:`1px solid ${C.border}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ color:C.textPrimary, fontWeight:600, fontSize:14 }}>{cat}</span>
                  <span style={{ color:colors[i%colors.length], fontWeight:700 }}>{fmt(amt)}</span>
                </div>
                <div style={{ background:C.border, borderRadius:4, height:6 }}>
                  <div style={{ width:`${pct}%`, height:6, borderRadius:4, background:colors[i%colors.length] }} />
                </div>
                <div style={{ color:C.textMuted, fontSize:11, marginTop:4 }}>{pct}% of expenses</div>
              </div>
            );
          })}
        </>
      )}

      {/* Day-wise */}
      {period !== "day" && dayGroups.length > 0 && (
        <>
          <div style={{ color:C.textSecondary, fontSize:11, letterSpacing:1, margin:"20px 0 12px" }}>DAY-WISE BREAKDOWN</div>
          {dayGroups.map(([date, entries]) => {
            const exp = entries.reduce((s,e)=>s+e.amount,0);
            return (
              <div key={date} style={{ background:C.card, borderRadius:12, padding:"12px 16px", marginBottom:8, border:`1px solid ${C.border}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ color:C.textSecondary, fontSize:13 }}>{fmtDate(date)}</span>
                  <span style={{ color:C.coral, fontWeight:700, fontSize:13 }}>-{fmt(exp)}</span>
                </div>
                <div style={{ color:C.textMuted, fontSize:11, marginTop:3 }}>{entries.length} transactions</div>
              </div>
            );
          })}
        </>
      )}

      {expenses.length===0 && (
        <div style={{ textAlign:"center", color:C.textMuted, fontSize:14, padding:"32px 0" }}>No entries for this period.</div>
      )}
    </div>
  );
}

// ── History ───────────────────────────────────────────────────────
function HistoryView({ state, dispatch }) {
  const days = groupByDay(state.expenses);
  return (
    <div style={{ padding:"24px 16px 100px" }}>
      <div style={{ color:C.textPrimary, fontSize:22, fontWeight:800, marginBottom:20 }}>History</div>
      {days.length===0 && <div style={{ textAlign:"center", color:C.textMuted, fontSize:14, padding:"48px 0" }}>No expenses logged yet.</div>}
      {days.map(([date, entries]) => {
        const dayTotal = entries.reduce((s,e)=>s+e.amount,0);
        return (
          <div key={date} style={{ marginBottom:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <div style={{ color:C.textSecondary, fontSize:12 }}>{fmtDate(date)}</div>
              <div style={{ color:C.coral, fontWeight:700, fontSize:13 }}>-{fmt(dayTotal)}</div>
            </div>
            {entries.map(e => (
              <div key={e.id} style={{ background:C.card, borderRadius:12, padding:"12px 16px", marginBottom:6, display:"flex", justifyContent:"space-between", alignItems:"center", border:`1px solid ${C.border}` }}>
                <div>
                  <div style={{ color:C.textPrimary, fontWeight:600, fontSize:14 }}>{e.category}</div>
                  {e.note && <div style={{ color:C.textSecondary, fontSize:12, marginTop:2 }}>{e.note}</div>}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ color:C.coral, fontWeight:700 }}>{fmt(e.amount)}</div>
                  <button onClick={() => dispatch({ type:"DEL_EXPENSE", id:e.id })}
                    style={{ background:"none", border:"none", cursor:"pointer", color:C.textMuted, fontSize:18 }}>×</button>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────
function Label({ children }) {
  return <div style={{ color:C.textSecondary, fontSize:12, marginBottom:8, marginTop:4, letterSpacing:0.8 }}>{children}</div>;
}
function inp() {
  return { width:"100%", background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", color:C.textPrimary, fontSize:16, marginBottom:20, boxSizing:"border-box", outline:"none" };
}

// ── Root ──────────────────────────────────────────────────────────
export default function App() {
  const [state, dispatch] = useReducer(reducer, init);
  const mainViews = ["home","summary","history"];
  const views = {
    home:       <HomeView       state={state} dispatch={dispatch} />,
    addExpense: <AddExpenseView dispatch={dispatch} />,

    setOpening: <SetOpeningView state={state} dispatch={dispatch} />,
    summary:    <SummaryView    state={state} />,
    history:    <HistoryView    state={state} dispatch={dispatch} />,
  };
  return (
    <div style={{ background:C.bg, minHeight:"100vh", fontFamily:"'Inter', -apple-system, sans-serif", color:C.textPrimary, maxWidth:430, margin:"0 auto" }}>
      {views[state.view]}
      {mainViews.includes(state.view) && <BottomNav view={state.view} dispatch={dispatch} />}
    </div>
  );
}
