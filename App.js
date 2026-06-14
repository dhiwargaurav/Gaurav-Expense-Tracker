import { useState, useReducer } from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  SafeAreaView, 
  Platform, 
  StatusBar 
} from "react-native";

const C = {
  bg: "#0F1523", surface: "#18212F", card: "#1E2B3C", border: "#2A3A50",
  amber: "#F5A623", coral: "#E05A4E", emerald: "#34C77B", blue: "#4A9EE0",
  purple: "#9B7FE8", textPrimary: "#F0F4F8", textSecondary: "#7A92AB", textMuted: "#3D5166",
};

// Formatting helpers
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
  monthlyOpening: {}, 
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
    <View style={styles.navBar}>
      {tabs.map(t => (
        <TouchableOpacity key={t.id} onPress={() => dispatch({ type:"NAV", view:t.id })} style={styles.navTab}>
          <Text style={[styles.navIcon, { color: view === t.id ? C.amber : C.textSecondary }]}>{t.icon}</Text>
          <Text style={[styles.navLabel, { color: view === t.id ? C.amber : C.textSecondary, fontWeight: view === t.id ? "700" : "400" }]}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
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
  const currentBal = opening != null ? opening - monthExp : null;
  const todayEntries = state.expenses.filter(e => e.date === today);

  return (
    <ScrollView contentContainerStyle={styles.viewContainer}>
      <View style={{ marginBottom: 20 }}>
        <Text style={{ color: C.textSecondary, fontSize: 13 }}>{fmtDate(today)}</Text>
        <Text style={{ color: C.textPrimary, fontSize: 26, fontWeight: "800", marginTop: 2 }}>Daily Tracker</Text>
      </View>

      {/* Opening Balance Card */}
      <View style={styles.card}>
        {currentBal != null && (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: C.textSecondary, fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>CURRENT BALANCE</Text>
            <Text style={{ color: currentBal >= 0 ? C.emerald : C.coral, fontSize: 34, fontWeight: "800" }}>{fmt(currentBal)}</Text>
          </View>
        )}
        <View style={[styles.flexRowBetween, { borderTopWidth: currentBal != null ? 1 : 0, borderColor: C.border, paddingTop: currentBal != null ? 10 : 0 }]}>
          <View>
            <Text style={{ color: C.textMuted, fontSize: 10, marginBottom: 2 }}>Opening · {fmtMonth(ym)}</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ color: C.blue, fontSize: 13, fontWeight: "600", marginRight: 10 }}>{opening != null ? fmt(opening) : "—"}</Text>
              {currentBal != null && <Text style={{ color: C.textMuted, fontSize: 12 }}>−Expenses {fmt(monthExp)}</Text>}
            </View>
          </View>
          <TouchableOpacity onPress={() => dispatch({ type:"NAV", view:"setOpening" })} style={styles.smallBtn}>
            <Text style={{ color: C.textSecondary, fontSize: 12 }}>✏️ Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Expense Stats */}
      <Text style={styles.sectionHeader}>EXPENSES</Text>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
        {[
          { label:"TODAY",      value:dayExp,   color:C.coral  },
          { label:"THIS WEEK",  value:weekExp,  color:C.amber  },
          { label:"THIS MONTH", value:monthExp, color:C.purple },
        ].map(card => (
          <View key={card.label} style={[styles.card, { flex: 1, padding: 12, alignItems: "center" }]}>
            <Text style={{ color: C.textSecondary, fontSize: 9, letterSpacing: 0.8, marginBottom: 6 }}>{card.label}</Text>
            <Text style={{ color: card.color, fontSize: 14, fontWeight: "700" }}>{fmt(card.value)}</Text>
          </View>
        ))}
      </View>

      {/* Quick Add Button */}
      <TouchableOpacity onPress={() => dispatch({ type:"NAV", view:"addExpense" })} style={styles.quickAddBtn}>
        <Text style={{ fontSize: 20 }}>💸</Text>
        <Text style={{ color: C.textPrimary, fontWeight: "700", fontSize: 15 }}>Add Expense</Text>
      </TouchableOpacity>

      {/* Today's Entries */}
      {todayEntries.length > 0 && (
        <View>
          <Text style={styles.sectionHeader}>TODAY'S ENTRIES</Text>
          {todayEntries.map(e => (
            <View key={e.id} style={[styles.card, styles.flexRowBetween, { marginBottom: 8, paddingVertical: 12 }]}>
              <View>
                <Text style={{ color: C.textPrimary, fontWeight: "600", fontSize: 14 }}>{e.category}</Text>
                {e.note ? <Text style={{ color: C.textSecondary, fontSize: 12, marginTop: 2 }}>{e.note}</Text> : null}
              </View>
              <Text style={{ color: C.coral, fontWeight: "700", fontSize: 15 }}>-{fmt(e.amount)}</Text>
            </View>
          ))}
        </View>
      )}
      {todayEntries.length === 0 && (
        <Text style={styles.emptyText}>No entries today</Text>
      )}
    </ScrollView>
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
    <ScrollView contentContainerStyle={styles.viewContainer}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <TouchableOpacity onPress={() => dispatch({ type:"NAV", view:"home" })} style={styles.backBtn}>
          <Text style={{ color: C.textPrimary, fontSize: 16 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: C.textPrimary, fontSize: 22, fontWeight: "800" }}>Opening Balance</Text>
      </View>

      <Text style={styles.label}>Month (YYYY-MM)</Text>
      <TextInput value={ym} onChangeText={setYm} placeholder="2026-06" placeholderTextColor={C.textMuted} style={styles.input} />

      <Text style={styles.label}>Opening Balance (₹)</Text>
      <TextInput keyboardType="numeric" value={value} onChangeText={setValue} placeholder="e.g. 25000" placeholderTextColor={C.textMuted} style={styles.input} />

      <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 20, lineHeight: 18 }}>
        This is your bank/cash balance at the start of the month. Current balance will be auto-calculated as Opening − Expenses.
      </Text>

      <TouchableOpacity onPress={save} style={[styles.submitBtn, { backgroundColor: C.blue }]}>
        <Text style={styles.submitBtnText}>Save Opening Balance</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Reusable Mobile Entry Form ────────────────────────────────────
function EntryForm({ title, cats, category, setCategory, amount, setAmount, note, setNote, date, setDate, onSave, btnColor, btnLabel, onBack }) {
  return (
    <ScrollView contentContainerStyle={styles.viewContainer}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={{ color: C.textPrimary, fontSize: 16 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: C.textPrimary, fontSize: 22, fontWeight: "800" }}>{title}</Text>
      </View>

      <Text style={styles.label}>Amount (₹)</Text>
      <TextInput keyboardType="numeric" value={amount} onChangeText={setAmount} placeholder="0" placeholderTextColor={C.textMuted} style={styles.input} />

      <Text style={styles.label}>Category</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {cats.map(c => {
          const isSelected = category === c;
          return (
            <TouchableOpacity key={c} onPress={() => setCategory(c)} style={[styles.catChip, { backgroundColor: isSelected ? C.amber : C.card, borderColor: isSelected ? C.amber : C.border }]}>
              <Text style={{ color: isSelected ? "#000" : C.textSecondary, fontWeight: isSelected ? "700" : "400", fontSize: 13 }}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Note (optional)</Text>
      <TextInput value={note} onChangeText={setNote} placeholder="e.g. Lunch" placeholderTextColor={C.textMuted} style={styles.input} />

      <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
      <TextInput value={date} onChangeText={setDate} style={styles.input} />

      <TouchableOpacity onPress={onSave} style={[styles.submitBtn, { backgroundColor: btnColor, marginTop: 8 }]}>
        <Text style={styles.submitBtnText}>{btnLabel}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function AddExpenseView({ dispatch }) {
  const [amount, setAmount] = useState(""); 
  const [category, setCategory] = useState("Food");
  const [note, setNote] = useState(""); 
  const [date, setDate] = useState(todayISO());

  const save = () => { 
    const p = parseFloat(amount); 
    if(!p || p <= 0) return; 
    dispatch({ type:"ADD_EXPENSE", entry:{ id: Date.now(), date, amount: p, category, note } }); 
  };

  return (
    <EntryForm 
      title="Add Expense" 
      cats={EXPENSE_CATS} 
      category={category} 
      setCategory={setCategory} 
      amount={amount} 
      setAmount={setAmount} 
      note={note} 
      setNote={setNote} 
      date={date} 
      setDate={setDate} 
      onSave={save} 
      btnColor={C.coral} 
      btnLabel="Save Expense" 
      onBack={() => dispatch({ type:"NAV", view:"home" })} 
    />
  );
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
    <ScrollView contentContainerStyle={styles.viewContainer}>
      <Text style={{ color: C.textPrimary, fontSize: 22, fontWeight: "800", marginBottom: 20 }}>Summary</Text>
      
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
        {["day","week","month"].map(p => {
          const isSelected = period === p;
          return (
            <TouchableOpacity key={p} onPress={() => setPeriod(p)} style={[styles.periodBtn, { backgroundColor: isSelected ? C.amber : C.card, borderColor: isSelected ? C.amber : C.border }]}>
              <Text style={{ color: isSelected ? "#000" : C.textSecondary, fontWeight: isSelected ? "700" : "400", fontSize: 13 }}>
                {p === "day" ? "Today" : p === "week" ? "Week" : "Month"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Total Spent Card */}
      <View style={[styles.card, { alignItems: "center", paddingVertical: 18 }]}>
        <Text style={{ color: C.textSecondary, fontSize: 10, letterSpacing: 1, marginBottom: 6 }}>TOTAL SPENT</Text>
        <Text style={{ color: C.coral, fontSize: 28, fontWeight: "800" }}>{fmt(totalExp)}</Text>
        <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>{expenses.length} transactions</Text>
      </View>

      {/* Category Breakdown */}
      {cats.length > 0 && (
        <View style={{ marginTop: 14 }}>
          <Text style={styles.sectionHeader}>EXPENSES BY CATEGORY</Text>
          {cats.map(([cat,amt], i) => {
            const pct = totalExp > 0 ? (amt / totalExp * 100).toFixed(0) : 0;
            return (
              <View key={cat} style={[styles.card, { marginBottom: 8 }]}>
                <View style={styles.flexRowBetween}>
                  <Text style={{ color: C.textPrimary, fontWeight: "600", fontSize: 14 }}>{cat}</Text>
                  <Text style={{ color: colors[i % colors.length], fontWeight: "700" }}>{fmt(amt)}</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${pct}%`, backgroundColor: colors[i % colors.length] }]} />
                </View>
                <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 4 }}>{pct}% of expenses</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Day-wise */}
      {period !== "day" && dayGroups.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Text style={styles.sectionHeader}>DAY-WISE BREAKDOWN</Text>
          {dayGroups.map(([date, entries]) => {
            const exp = entries.reduce((s,e)=>s+e.amount,0);
            return (
              <View key={date} style={[styles.card, { marginBottom: 8 }]}>
                <View style={styles.flexRowBetween}>
                  <Text style={{ color: C.textSecondary, fontSize: 13 }}>{fmtDate(date)}</Text>
                  <Text style={{ color: C.coral, fontWeight: "700", fontSize: 13 }}>-{fmt(exp)}</Text>
                </View>
                <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 3 }}>{entries.length} transactions</Text>
              </View>
            );
          })}
        </View>
      )}

      {expenses.length === 0 && (
        <Text style={styles.emptyText}>No entries for this period.</Text>
      )}
    </ScrollView>
  );
}

// ── History ───────────────────────────────────────────────────────
function HistoryView({ state, dispatch }) {
  const days = groupByDay(state.expenses);
  return (
    <ScrollView contentContainerStyle={styles.viewContainer}>
      <Text style={{ color: C.textPrimary, fontSize: 22, fontWeight: "800", marginBottom: 20 }}>History</Text>
      {days.length === 0 && <Text style={styles.emptyText}>No expenses logged yet.</Text>}
      {days.map(([date, entries]) => {
        const dayTotal = entries.reduce((s,e)=>s+e.amount,0);
        return (
          <View key={date} style={{ marginBottom: 20 }}>
            <View style={[styles.flexRowBetween, { marginBottom: 8 }]}>
              <Text style={{ color: C.textSecondary, fontSize: 12 }}>{fmtDate(date)}</Text>
              <Text style={{ color: C.coral, fontWeight: "700", fontSize: 13 }}>-{fmt(dayTotal)}</Text>
            </View>
            {entries.map(e => (
              <View key={e.id} style={[styles.card, styles.flexRowBetween, { marginBottom: 6, paddingVertical: 12 }]}>
                <View>
                  <Text style={{ color: C.textPrimary, fontWeight: "600", fontSize: 14 }}>{e.category}</Text>
                  {e.note ? <Text style={{ color: C.textSecondary, fontSize: 12, marginTop: 2 }}>{e.note}</Text> : null}
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Text style={{ color: C.coral, fontWeight: "700", marginRight: 10 }}>{fmt(e.amount)}</Text>
                  <TouchableOpacity onPress={() => dispatch({ type:"DEL_EXPENSE", id:e.id })}>
                    <Text style={{ color: C.textMuted, fontSize: 20, paddingHorizontal: 4 }}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

// ── Root / Styles ──────────────────────────────────────────────────
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={{ flex: 1 }}>
        {views[state.view]}
      </View>
      {mainViews.includes(state.view) && <BottomNav view={state.view} dispatch={dispatch} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  viewContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  flexRowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  smallBtn: {
    backgroundColor: C.border,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  sectionHeader: {
    color: C.textSecondary,
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 10,
  },
  quickAddBtn: {
    width: "100%",
    backgroundColor: `${C.coral}22`,
    borderWidth: 1,
    borderColor: `${C.coral}66`,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 24,
  },
  emptyText: {
    textAlign: "center",
    paddingVertical: 32,
    color: C.textMuted,
    fontSize: 14,
  },
  backBtn: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  label: {
    color: C.textSecondary,
    fontSize: 12,
    marginBottom: 8,
    marginTop: 4,
    letterSpacing: 0.8,
  },
  input: {
    width: "100%",
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    color: C.textPrimary,
    fontSize: 16,
    marginBottom: 20,
  },
  submitBtn: {
    width: "100%",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  catChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
  },
  progressBarBg: {
    backgroundColor: C.border,
    borderRadius: 4,
    height: 6,
    marginTop: 8,
  },
  progressBarFill: {
    height: 6,
    borderRadius: 4,
  },
  navBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 24 : 14,
  },
  navTab: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  navIcon: {
    fontSize: 20,
  },
  navLabel: {
    fontSize: 12,
  },
});
