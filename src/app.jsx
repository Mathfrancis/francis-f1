import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot, collection } from "firebase/firestore";

// ─── FIREBASE ─────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDYce0uDbGvRPbufNJXkT1mRKK92kdK6EY",
  authDomain: "francis-f1-predictions.firebaseapp.com",
  projectId: "francis-f1-predictions",
  storageBucket: "francis-f1-predictions.firebasestorage.app",
  messagingSenderId: "444467983302",
  appId: "1:444467983302:web:8cb335c5d90968de2ff8c7"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const SCORING = {
  quali:  { exact: 5,  featured: 2 },
  sprint: { exact: 8,  featured: 3 },
  race:   { exact: 12, featured: 5 },
};
const PLAYERS = ["Matt", "Stu", "Jim", "Harry"];
const ADMIN_PASSWORD = "lights0ut";
const F1_API = "https://api.openf1.org/v1";

// ─── 2026 DRIVERS ─────────────────────────────────────────────────────────────
const DRIVERS = [
  { number: 1,  acronym: "NOR", name: "Lando Norris",          team: "McLaren" },
  { number: 81, acronym: "PIA", name: "Oscar Piastri",          team: "McLaren" },
  { number: 63, acronym: "RUS", name: "George Russell",         team: "Mercedes" },
  { number: 12, acronym: "ANT", name: "Kimi Antonelli",         team: "Mercedes" },
  { number: 3,  acronym: "VER", name: "Max Verstappen",         team: "Red Bull Racing" },
  { number: 6,  acronym: "HAD", name: "Isack Hadjar",           team: "Red Bull Racing" },
  { number: 16, acronym: "LEC", name: "Charles Leclerc",        team: "Ferrari" },
  { number: 44, acronym: "HAM", name: "Lewis Hamilton",         team: "Ferrari" },
  { number: 23, acronym: "ALB", name: "Alexander Albon",        team: "Williams" },
  { number: 55, acronym: "SAI", name: "Carlos Sainz",           team: "Williams" },
  { number: 41, acronym: "LIN", name: "Arvid Lindblad",         team: "Racing Bulls" },
  { number: 30, acronym: "LAW", name: "Liam Lawson",            team: "Racing Bulls" },
  { number: 18, acronym: "STR", name: "Lance Stroll",           team: "Aston Martin" },
  { number: 14, acronym: "ALO", name: "Fernando Alonso",        team: "Aston Martin" },
  { number: 31, acronym: "OCO", name: "Esteban Ocon",           team: "Haas" },
  { number: 87, acronym: "BEA", name: "Oliver Bearman",         team: "Haas" },
  { number: 27, acronym: "HUL", name: "Nico Hulkenberg",        team: "Audi" },
  { number: 5,  acronym: "BOR", name: "Gabriel Bortoleto",      team: "Audi" },
  { number: 10, acronym: "GAS", name: "Pierre Gasly",           team: "Alpine" },
  { number: 43, acronym: "COL", name: "Franco Colapinto",       team: "Alpine" },
  { number: 11, acronym: "PER", name: "Sergio Perez",           team: "Cadillac" },
  { number: 77, acronym: "BOT", name: "Valtteri Bottas",        team: "Cadillac" },
];

// ─── 2026 CALENDAR ────────────────────────────────────────────────────────────
const CALENDAR = [
  { round: 1,  key: "2026_AUS", name: "Australian GP",     location: "Melbourne",   sprint: false },
  { round: 2,  key: "2026_CHN", name: "Chinese GP",        location: "Shanghai",    sprint: true  },
  { round: 3,  key: "2026_JPN", name: "Japanese GP",       location: "Suzuka",      sprint: false },
  { round: 4,  key: "2026_BHR", name: "Bahrain GP",        location: "Sakhir",      sprint: false },
  { round: 5,  key: "2026_SAU", name: "Saudi Arabian GP",  location: "Jeddah",      sprint: false },
  { round: 6,  key: "2026_MIA", name: "Miami GP",          location: "Miami",       sprint: true  },
  { round: 7,  key: "2026_EMI", name: "Emilia Romagna GP", location: "Imola",       sprint: false },
  { round: 8,  key: "2026_MON", name: "Monaco GP",         location: "Monaco",      sprint: false },
  { round: 9,  key: "2026_ESP", name: "Spanish GP",        location: "Barcelona",   sprint: false },
  { round: 10, key: "2026_CAN", name: "Canadian GP",       location: "Montreal",    sprint: false },
  { round: 11, key: "2026_AUT", name: "Austrian GP",       location: "Spielberg",   sprint: true  },
  { round: 12, key: "2026_GBR", name: "British GP",        location: "Silverstone", sprint: false },
  { round: 13, key: "2026_BEL", name: "Belgian GP",        location: "Spa",         sprint: false },
  { round: 14, key: "2026_HUN", name: "Hungarian GP",      location: "Budapest",    sprint: false },
  { round: 15, key: "2026_NED", name: "Dutch GP",          location: "Zandvoort",   sprint: false },
  { round: 16, key: "2026_ITA", name: "Italian GP",        location: "Monza",       sprint: false },
  { round: 17, key: "2026_AZE", name: "Azerbaijan GP",     location: "Baku",        sprint: true  },
  { round: 18, key: "2026_SIN", name: "Singapore GP",      location: "Singapore",   sprint: false },
  { round: 19, key: "2026_USA", name: "US GP",             location: "Austin",      sprint: true  },
  { round: 20, key: "2026_MEX", name: "Mexico City GP",    location: "Mexico City", sprint: false },
  { round: 21, key: "2026_BRA", name: "São Paulo GP",      location: "São Paulo",   sprint: true  },
  { round: 22, key: "2026_LAS", name: "Las Vegas GP",      location: "Las Vegas",   sprint: false },
  { round: 23, key: "2026_QAT", name: "Qatar GP",          location: "Lusail",      sprint: true  },
  { round: 24, key: "2026_ABU", name: "Abu Dhabi GP",      location: "Yas Marina",  sprint: false },
];

// ─── TEAM COLOURS ─────────────────────────────────────────────────────────────
const TEAM_COLORS = {
  mclaren: "#FF8000", mercedes: "#27F4D2", "red bull": "#3671C6",
  ferrari: "#E8002D", williams: "#64C4FF", "racing bulls": "#6692FF",
  "aston martin": "#229971", haas: "#B6BABD", audi: "#C9B84C",
  alpine: "#FF87BC", cadillac: "#BA0AF0",
};
function teamColor(team = "") {
  const t = team.toLowerCase();
  for (const [k, v] of Object.entries(TEAM_COLORS)) if (t.includes(k)) return v;
  return "#ffffff";
}

// ─── SCORING ──────────────────────────────────────────────────────────────────
function calcPoints(picks = [], results = [], type) {
  const cfg = SCORING[type];
  if (!cfg || !results.filter(Boolean).length) return 0;
  let pts = 0;
  const top3 = results.map(r => (r||"").toUpperCase());
  for (let i = 0; i < 3; i++) {
    const p = (picks[i]||"").toUpperCase();
    if (!p) continue;
    if (top3[i] === p) pts += cfg.exact;
    else if (top3.includes(p)) pts += cfg.featured;
  }
  return pts;
}

// ─── OPENF1 HELPERS ───────────────────────────────────────────────────────────
async function fetchJSON(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const data = await r.json();
    // Check for OpenF1 live session lock error
    if (data && data.detail && data.detail.includes("Live F1 session")) return null;
    return data;
  } catch { return null; }
}

// Fetch top 3 finishing positions from OpenF1 for a given session type + country + year
async function fetchResultsFromAPI(year, country, sessionType) {
  // Get sessions for this meeting
  const sessions = await fetchJSON(`${F1_API}/sessions?year=${year}&country_name=${country}&session_type=${sessionType}`);
  if (!sessions || !sessions.length) return null;
  const session = sessions[sessions.length - 1];

  // Get drivers for name mapping
  const drivers = await fetchJSON(`${F1_API}/drivers?session_key=${session.session_key}`);
  if (!drivers || !drivers.length) return null;

  // Get positions
  const positions = await fetchJSON(`${F1_API}/position?session_key=${session.session_key}`);
  if (!positions || !positions.length) return null;

  // Get latest position per driver
  const latest = {};
  for (const p of positions) {
    if (!latest[p.driver_number] || p.date > latest[p.driver_number].date) {
      latest[p.driver_number] = p;
    }
  }
  const sorted = Object.values(latest).sort((a, b) => a.position - b.position).slice(0, 3);
  return sorted.map(p => {
    const d = drivers.find(d => d.driver_number === p.driver_number);
    return d?.name_acronym || `#${p.driver_number}`;
  });
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("predict");
  const [activePlayer, setActivePlayer] = useState(null);
  const [allPredictions, setAllPredictions] = useState({});
  const [eventData, setEventData] = useState({});
  const [dbError, setDbError] = useState(null);

  // Current player picks
  const [qualiPicks,  setQualiPicks]  = useState(["","",""]);
  const [sprintPicks, setSprintPicks] = useState(["","",""]);
  const [racePicks,   setRacePicks]   = useState(["","",""]);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  // Admin
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPw, setAdminPw]             = useState("");
  const [adminPwError, setAdminPwError]   = useState(false);
  const [selectedRound, setSelectedRound] = useState(1);
  const [adminResults, setAdminResults]   = useState({ quali:["","",""], sprint:["","",""], race:["","",""] });
  const [adminSaving,  setAdminSaving]    = useState(false);
  const [adminSaved,   setAdminSaved]     = useState(false);

  // API fetch status
  const [apiFetching,  setApiFetching]  = useState(false);
  const [apiStatus,    setApiStatus]    = useState(null); // null | "ok" | "locked" | "error"

  // ── Firestore listeners ───────────────────────────────────────────────────
  useEffect(() => {
    const u1 = onSnapshot(collection(db, "predictions"), snap => {
      const p = {};
      snap.forEach(d => { p[d.id] = d.data(); });
      setAllPredictions(p);
      setDbError(null);
    }, err => { console.error(err); setDbError("DB connection failed"); });

    const u2 = onSnapshot(doc(db, "config", "event"), snap => {
      if (snap.exists()) {
        const data = snap.data();
        setEventData(data);
        setSelectedRound(data.activeRound || 1);
        setAdminResults(data.results || { quali:["","",""], sprint:["","",""], race:["","",""] });
      }
    }, err => console.error(err));

    return () => { u1(); u2(); };
  }, []);

  // ── Seed existing predictions for Matt & Stu AUS R1 if not already in Firestore ──
  useEffect(() => {
    async function seedPredictions() {
      const key = "2026_AUS";
      // Only seed if these docs don't exist yet
      const mattKey = `${key}_Matt`;
      const stuKey  = `${key}_Stu`;
      // We seed on first load if allPredictions has loaded and these are missing
      if (Object.keys(allPredictions).length === 0) return; // wait for Firestore load
      if (!allPredictions[mattKey]) {
        await setDoc(doc(db, "predictions", mattKey), {
          qualiPicks:  ["RUS","HAM","VER"], sprintPicks: ["","",""], racePicks: ["","",""],
          isSprint: false, meetingName: "Australian GP", player: "Matt",
          eventKey: key, round: 1, updatedAt: Date.now(),
        });
      }
      if (!allPredictions[stuKey]) {
        await setDoc(doc(db, "predictions", stuKey), {
          qualiPicks:  ["RUS","HAM","LEC"], sprintPicks: ["","",""], racePicks: ["","",""],
          isSprint: false, meetingName: "Australian GP", player: "Stu",
          eventKey: key, round: 1, updatedAt: Date.now(),
        });
      }
    }
    seedPredictions();
  }, [allPredictions]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const activeRound = eventData.activeRound || 1;
  const activeRace  = CALENDAR.find(r => r.round === activeRound) || CALENDAR[0];
  const results     = eventData.results || { quali:[], sprint:[], race:[] };
  const eventKey    = activeRace.key;
  const isSprint    = activeRace.sprint;

  const eventPreds = Object.fromEntries(
    Object.entries(allPredictions)
      .filter(([id]) => id.startsWith(eventKey + "_"))
      .map(([, v]) => [v.player, v])
  );

  // ── Player select ─────────────────────────────────────────────────────────
  function selectPlayer(name) {
    setActivePlayer(name);
    const ex = allPredictions[`${eventKey}_${name}`];
    if (ex) {
      setQualiPicks(ex.qualiPicks   || ["","",""]);
      setSprintPicks(ex.sprintPicks || ["","",""]);
      setRacePicks(ex.racePicks     || ["","",""]);
    } else {
      setQualiPicks(["","",""]);
      setSprintPicks(["","",""]);
      setRacePicks(["","",""]);
    }
  }

  // ── Save predictions ──────────────────────────────────────────────────────
  async function handleSave() {
    if (!activePlayer) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "predictions", `${eventKey}_${activePlayer}`), {
        qualiPicks: [...qualiPicks], sprintPicks: [...sprintPicks], racePicks: [...racePicks],
        isSprint, meetingName: activeRace.name, player: activePlayer,
        eventKey, round: activeRound, updatedAt: Date.now(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch(e) { console.error(e); setDbError("Save failed"); }
    setSaving(false);
  }

  // ── Fetch results from OpenF1 API ─────────────────────────────────────────
  async function handleApiFetch() {
    setApiFetching(true);
    setApiStatus(null);
    const race = CALENDAR.find(r => r.round === selectedRound);
    // Map our location to OpenF1 country_name
    const countryMap = {
      "Melbourne":"Australia","Shanghai":"China","Suzuka":"Japan","Sakhir":"Bahrain",
      "Jeddah":"Saudi Arabia","Miami":"United States","Imola":"Italy","Monaco":"Monaco",
      "Barcelona":"Spain","Montreal":"Canada","Spielberg":"Austria","Silverstone":"Great Britain",
      "Spa":"Belgium","Budapest":"Hungary","Zandvoort":"Netherlands","Monza":"Italy",
      "Baku":"Azerbaijan","Singapore":"Singapore","Austin":"United States",
      "Mexico City":"Mexico","São Paulo":"Brazil","Las Vegas":"United States",
      "Lusail":"Qatar","Yas Marina":"United Arab Emirates",
    };
    const country = countryMap[race.location] || race.location;
    const year    = 2026;

    try {
      const [qualiTop3, raceTop3, sprintTop3] = await Promise.all([
        fetchResultsFromAPI(year, country, "Qualifying"),
        fetchResultsFromAPI(year, country, "Race"),
        race.sprint ? fetchResultsFromAPI(year, country, "Sprint") : Promise.resolve(null),
      ]);

      if (!qualiTop3 && !raceTop3) {
        setApiStatus("locked");
        setApiFetching(false);
        return;
      }

      const newResults = {
        quali:  qualiTop3  || adminResults.quali,
        sprint: sprintTop3 || adminResults.sprint,
        race:   raceTop3   || adminResults.race,
      };
      setAdminResults(newResults);
      setApiStatus("ok");
    } catch(e) {
      console.error(e);
      setApiStatus("error");
    }
    setApiFetching(false);
  }

  // ── Save admin config ─────────────────────────────────────────────────────
  async function handleAdminSave() {
    setAdminSaving(true);
    try {
      await setDoc(doc(db, "config", "event"), {
        activeRound: selectedRound,
        results: adminResults,
        updatedAt: Date.now(),
      });
      setAdminSaved(true);
      setTimeout(() => setAdminSaved(false), 2500);
    } catch(e) { console.error(e); }
    setAdminSaving(false);
  }

  // ── Leaderboard ───────────────────────────────────────────────────────────
  function computeLeaderboard() {
    const totals = {};
    for (const p of PLAYERS) totals[p] = { name: p, total: 0, events: [] };

    const byEvent = {};
    for (const [, pred] of Object.entries(allPredictions)) {
      if (!byEvent[pred.eventKey]) byEvent[pred.eventKey] = {};
      byEvent[pred.eventKey][pred.player] = pred;
    }

    for (const [ek, preds] of Object.entries(byEvent)) {
      const evResults = ek === eventKey ? results : (eventData.pastResults?.[ek] || {});
      const qRes = evResults.quali  || [];
      const sRes = evResults.sprint || [];
      const rRes = evResults.race   || [];
      for (const [player, pred] of Object.entries(preds)) {
        if (!totals[player]) continue;
        const qPts = calcPoints(pred.qualiPicks,  qRes, "quali");
        const sPts = pred.isSprint ? calcPoints(pred.sprintPicks, sRes, "sprint") : 0;
        const rPts = calcPoints(pred.racePicks,   rRes, "race");
        totals[player].total += qPts + sPts + rPts;
        totals[player].events.push({ name: pred.meetingName, round: pred.round||0, qPts, sPts, rPts, isSprint: pred.isSprint });
      }
    }
    return Object.values(totals).sort((a, b) => b.total - a.total || PLAYERS.indexOf(a.name) - PLAYERS.indexOf(b.name));
  }

  const leaderboard = computeLeaderboard();

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0f", fontFamily:"'Barlow Condensed','Arial Narrow',sans-serif", color:"#fff", overflowX:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#111}::-webkit-scrollbar-thumb{background:#e10600}
        .bg{position:fixed;inset:0;z-index:0;background:radial-gradient(ellipse at 20% 0%,#1a0a0a,transparent 50%),radial-gradient(ellipse at 80% 100%,#0a0a1a,transparent 50%),#0a0a0f}
        .grid{position:fixed;inset:0;z-index:0;opacity:.04;background-image:linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px);background-size:40px 40px}
        .stripe{position:fixed;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#e10600,#ff6b00,#e10600);z-index:100}
        .tab-btn{background:none;border:none;color:#666;cursor:pointer;font-family:inherit;font-size:13px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;padding:8px 16px;transition:color .2s;position:relative}
        .tab-btn:hover{color:#fff}.tab-btn.active{color:#e10600}
        .tab-btn.active::after{content:'';position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:4px;height:4px;background:#e10600;border-radius:50%}
        .pick-slot{background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.15);border-radius:6px;padding:10px 14px;min-height:48px;display:flex;align-items:center;gap:10px;cursor:pointer;transition:all .2s}
        .pick-slot:hover{border-color:rgba(225,6,0,.5);background:rgba(225,6,0,.05)}
        .pick-slot.filled{border-style:solid;border-color:rgba(255,255,255,.2);background:rgba(255,255,255,.05)}
        .lb-row{display:flex;align-items:center;padding:12px 16px;border-radius:8px;gap:12px}
        .lb-row:nth-child(odd){background:rgba(255,255,255,.02)}
        .lb-row.first-place{background:linear-gradient(90deg,rgba(225,6,0,.15),transparent);border-left:3px solid #e10600}
        .slide-in{animation:slideIn .4s ease both}
        @keyframes slideIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .slabel{font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#e10600;margin-bottom:8px}
        .pts-badge{background:#e10600;color:#fff;font-size:11px;font-weight:800;padding:3px 8px;border-radius:3px;white-space:nowrap}
        .btn{background:#e10600;color:#fff;border:none;cursor:pointer;font-family:inherit;font-size:13px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;padding:12px 28px;border-radius:4px;transition:all .2s}
        .btn:hover{background:#ff1a0f;transform:translateY(-1px);box-shadow:0 4px 16px rgba(225,6,0,.4)}
        .btn:disabled{background:#333;cursor:not-allowed;transform:none;box-shadow:none}
        .btn-sm{background:rgba(255,255,255,.05);color:#888;border:1px solid rgba(255,255,255,.12);cursor:pointer;font-family:inherit;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:6px 14px;border-radius:4px;transition:all .15s}
        .btn-sm:hover{border-color:rgba(255,255,255,.3);color:#fff}
        .btn-sm.active{background:rgba(225,6,0,.2);border-color:#e10600;color:#fff}
        .btn-api{background:rgba(0,180,255,.1);color:#00b4ff;border:1px solid rgba(0,180,255,.3);cursor:pointer;font-family:inherit;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:9px 20px;border-radius:4px;transition:all .15s}
        .btn-api:hover{background:rgba(0,180,255,.2)}
        .btn-api:disabled{opacity:.4;cursor:not-allowed}
        .f1-input{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:#fff;font-family:inherit;font-size:13px;padding:8px 12px;border-radius:4px;outline:none;width:100%}
        .f1-input:focus{border-color:#e10600}
        .f1-input::placeholder{color:#444}
        .card{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:16px}
        .result-pill{border-radius:4px;padding:3px 10px;font-size:12px;font-weight:700;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15)}
      `}</style>

      <div className="bg"/><div className="grid"/><div className="stripe"/>

      <div style={{ position:"relative", zIndex:1, maxWidth:860, margin:"0 auto", padding:"0 16px" }}>

        {/* HEADER */}
        <header style={{ padding:"28px 0 0", display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
              <div style={{ width:28, height:28, background:"#e10600", borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:900 }}>F</div>
              <span style={{ fontSize:22, fontWeight:900, letterSpacing:"0.08em", textTransform:"uppercase" }}>rancis Family F1 Predictions</span>
            </div>
            <div style={{ fontSize:11, color:"#555", letterSpacing:"0.18em", fontWeight:600 }}>
              ▸ Round {activeRace.round} · {activeRace.name} · {activeRace.location}
              {isSprint && <span style={{ marginLeft:8, color:"#ff8c00", fontSize:10, fontWeight:800 }}>⚡ SPRINT</span>}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background: dbError ? "#ff4444" : "#00ff87" }}/>
            <span style={{ fontSize:10, color: dbError ? "#ff4444" : "#00ff87", letterSpacing:"0.12em", fontWeight:700 }}>
              {dbError ? "DB OFFLINE" : "DB SYNCED"}
            </span>
          </div>
        </header>

        {/* TABS */}
        <nav style={{ display:"flex", borderBottom:"1px solid rgba(255,255,255,.08)", margin:"20px 0 0", gap:2, flexWrap:"wrap" }}>
          {[["predict","⬡ Predict"],["results","◎ Results"],["leaderboard","▲ Leaderboard"],["admin","⚙ Admin"]].map(([id,label]) => (
            <button key={id} className={`tab-btn${tab===id?" active":""}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </nav>

        {/* ══════ PREDICT ══════ */}
        {tab === "predict" && (
          <div className="slide-in" style={{ padding:"24px 0 60px" }}>
            {/* Race banner */}
            <div style={{ background:"rgba(225,6,0,.08)", border:"1px solid rgba(225,6,0,.2)", borderRadius:8, padding:"12px 16px", marginBottom:24, display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
              <div>
                <div style={{ fontSize:18, fontWeight:800 }}>Round {activeRace.round} — {activeRace.name}</div>
                <div style={{ fontSize:12, color:"#888", marginTop:2 }}>{activeRace.location}{isSprint?" · Sprint Weekend":""}</div>
              </div>
              <div style={{ marginLeft:"auto", display:"flex", gap:8, flexWrap:"wrap" }}>
                {(results.quali||[]).filter(Boolean).length>0 && <span className="result-pill">Q: {results.quali.join(" · ")}</span>}
                {isSprint&&(results.sprint||[]).filter(Boolean).length>0 && <span className="result-pill" style={{ color:"#ff8c00" }}>S: {results.sprint.join(" · ")}</span>}
                {(results.race||[]).filter(Boolean).length>0 && <span className="result-pill" style={{ color:"#e10600" }}>R: {results.race.join(" · ")}</span>}
              </div>
            </div>

            {/* Scoring key */}
            <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:8, padding:"12px 16px", marginBottom:24, display:"flex", gap:20, flexWrap:"wrap", alignItems:"center" }}>
              <div><div className="slabel" style={{ marginBottom:3 }}>Qualifying</div><div style={{ fontSize:12, color:"#bbb" }}><b style={{ color:"#fff" }}>+5</b> exact · <b style={{ color:"#fff" }}>+2</b> featured</div></div>
              {isSprint&&<div style={{ borderLeft:"1px solid rgba(255,255,255,.08)", paddingLeft:20 }}><div className="slabel" style={{ marginBottom:3, color:"#ff8c00" }}>Sprint</div><div style={{ fontSize:12, color:"#bbb" }}><b style={{ color:"#fff" }}>+8</b> exact · <b style={{ color:"#fff" }}>+3</b> featured</div></div>}
              <div style={{ borderLeft:"1px solid rgba(255,255,255,.08)", paddingLeft:20 }}><div className="slabel" style={{ marginBottom:3 }}>Race</div><div style={{ fontSize:12, color:"#bbb" }}><b style={{ color:"#fff" }}>+12</b> exact · <b style={{ color:"#fff" }}>+5</b> featured</div></div>
            </div>

            {/* Player buttons */}
            <div style={{ marginBottom:24 }}>
              <div className="slabel">Who are you?</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {PLAYERS.map(name => (
                  <button key={name} onClick={() => selectPlayer(name)} style={{
                    background: activePlayer===name?"#e10600":"rgba(255,255,255,.04)",
                    border:`1px solid ${activePlayer===name?"#e10600":"rgba(255,255,255,.12)"}`,
                    color: activePlayer===name?"#fff":"#888",
                    fontFamily:"inherit", fontSize:16, fontWeight:800, letterSpacing:"0.1em",
                    textTransform:"uppercase", padding:"11px 26px", borderRadius:6, cursor:"pointer",
                    transition:"all .15s", boxShadow:activePlayer===name?"0 4px 16px rgba(225,6,0,.35)":"none",
                  }}>{activePlayer===name?`✓ ${name}`:name}</button>
                ))}
              </div>
            </div>

            {/* Picks */}
            {isSprint?(<>
              <DaySection day="FRIDAY"   color="#6c8ebf" label="Qualifying Top 3" hint="predict before Friday's qualifying">
                {[0,1,2].map(i=><PickRow key={i} pos={i} picks={qualiPicks}  set={setQualiPicks}/>)}
              </DaySection>
              <DaySection day="SATURDAY" color="#ff8c00" label="Sprint Top 3"     hint="predict after qualifying, before the sprint">
                {[0,1,2].map(i=><PickRow key={i} pos={i} picks={sprintPicks} set={setSprintPicks}/>)}
              </DaySection>
              <DaySection day="SUNDAY"   color="#e10600" label="Race Top 3"       hint="predict after the sprint, before lights out" last>
                {[0,1,2].map(i=><PickRow key={i} pos={i} picks={racePicks}   set={setRacePicks}/>)}
              </DaySection>
            </>):(<>
              <DaySection day="SATURDAY" color="#ff8c00" label="Qualifying Top 3" hint="predict before Saturday's qualifying">
                {[0,1,2].map(i=><PickRow key={i} pos={i} picks={qualiPicks}  set={setQualiPicks}/>)}
              </DaySection>
              <DaySection day="SUNDAY"   color="#e10600" label="Race Top 3"       hint="predict after qualifying, before lights out" last>
                {[0,1,2].map(i=><PickRow key={i} pos={i} picks={racePicks}   set={setRacePicks}/>)}
              </DaySection>
            </>)}

            <button className="btn" disabled={!activePlayer||saving} onClick={handleSave}
              style={{ width:"100%", boxShadow:activePlayer?"0 0 20px rgba(225,6,0,.25)":"none" }}>
              {saving?"Saving…":saved?"✓ Saved!":activePlayer?`Save Predictions for ${activePlayer}`:"Select your name first"}
            </button>

            {/* All picks this round */}
            {Object.keys(eventPreds).length>0&&(
              <div style={{ marginTop:32 }}>
                <div className="slabel">All Predictions This Round</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {PLAYERS.filter(p=>eventPreds[p]).map(player=>{
                    const pr=eventPreds[player];
                    const qPts=calcPoints(pr.qualiPicks,results.quali||[],"quali");
                    const sPts=isSprint?calcPoints(pr.sprintPicks,results.sprint||[],"sprint"):0;
                    const rPts=calcPoints(pr.racePicks,results.race||[],"race");
                    const hasResults=(results.quali||[]).filter(Boolean).length||(results.race||[]).filter(Boolean).length;
                    return(
                      <div key={player} style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:8, padding:"12px 16px", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                        <div style={{ fontWeight:800, fontSize:15, flex:1 }}>{player}</div>
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                          <span style={{ fontSize:12, color:"#888" }}>Q: <b style={{ color:"#fff" }}>{(pr.qualiPicks||[]).filter(Boolean).join(" · ")||"—"}</b></span>
                          {isSprint&&<span style={{ fontSize:12, color:"#ff8c00" }}>S: <b style={{ color:"#fff" }}>{(pr.sprintPicks||[]).filter(Boolean).join(" · ")||"—"}</b></span>}
                          <span style={{ fontSize:12, color:"#888" }}>R: <b style={{ color:"#fff" }}>{(pr.racePicks||[]).filter(Boolean).join(" · ")||"—"}</b></span>
                        </div>
                        {hasResults>0&&<div className="pts-badge">{qPts+sPts+rPts} PTS</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════ RESULTS ══════ */}
        {tab==="results"&&(
          <div className="slide-in" style={{ padding:"24px 0 60px" }}>
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:20, fontWeight:800 }}>Round {activeRace.round} — {activeRace.name}</div>
              <div style={{ fontSize:12, color:"#888", marginTop:4 }}>{activeRace.location}</div>
            </div>

            {[
              {key:"quali",label:"Qualifying",color:"#ff8c00"},
              ...(isSprint?[{key:"sprint",label:"Sprint",color:"#ff8c00"}]:[]),
              {key:"race",label:"Race",color:"#e10600"},
            ].map(({key,label,color})=>{
              const res=results[key]||[];
              return(
                <div key={key} className="card" style={{ marginBottom:12 }}>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.15em", color, marginBottom:10 }}>{label} Top 3</div>
                  {res.filter(Boolean).length===0?(
                    <div style={{ fontSize:13, color:"#555" }}>Not yet available</div>
                  ):(
                    <div style={{ display:"flex", gap:8 }}>
                      {res.map((r,i)=>(
                        <div key={i} style={{ background:i===0?"rgba(255,215,0,.12)":i===1?"rgba(200,200,200,.1)":"rgba(180,100,30,.1)", border:`1px solid ${i===0?"rgba(255,215,0,.3)":i===1?"rgba(200,200,200,.25)":"rgba(180,100,30,.3)"}`, borderRadius:4, padding:"4px 12px", display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{ fontSize:10, color:"#666", fontWeight:700 }}>P{i+1}</span>
                          <span style={{ fontWeight:800, fontSize:14, color:i===0?"#ffd700":i===1?"#c0c0c0":"#cd7f32" }}>{r}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Scores */}
            {Object.keys(eventPreds).length>0&&(results.quali||[]).filter(Boolean).length>0&&(
              <div style={{ marginTop:32 }}>
                <div className="slabel">Scores This Round</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {PLAYERS.filter(p=>eventPreds[p]).map(player=>{
                    const pr=eventPreds[player];
                    const qPts=calcPoints(pr.qualiPicks,results.quali||[],"quali");
                    const sPts=isSprint?calcPoints(pr.sprintPicks,results.sprint||[],"sprint"):0;
                    const rPts=calcPoints(pr.racePicks,results.race||[],"race");
                    const renderPicks=(picks,res)=>(picks||[]).map((p,i)=>{
                      if(!p)return null;
                      const exact=(res||[])[i]?.toUpperCase()===p.toUpperCase();
                      const inTop3=!exact&&(res||[]).some(r=>r?.toUpperCase()===p.toUpperCase());
                      return<span key={i} style={{ fontSize:11, fontWeight:700, padding:"2px 7px", borderRadius:3,
                        background:exact?"rgba(0,255,135,.2)":inTop3?"rgba(255,140,0,.2)":"rgba(255,255,255,.05)",
                        color:exact?"#00ff87":inTop3?"#ff8c00":"#555",
                        border:`1px solid ${exact?"rgba(0,255,135,.4)":inTop3?"rgba(255,140,0,.4)":"rgba(255,255,255,.1)"}`}}>{p}</span>;
                    });
                    return(
                      <div key={player} style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", borderRadius:8, padding:"12px 16px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
                          <div style={{ fontWeight:800, fontSize:15, flex:1 }}>{player}</div>
                          <div className="pts-badge">{qPts+sPts+rPts} PTS</div>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                          <div style={{ display:"flex", gap:6, alignItems:"center" }}><span style={{ fontSize:10, color:"#666", width:12 }}>Q</span>{renderPicks(pr.qualiPicks,results.quali)}</div>
                          {isSprint&&<div style={{ display:"flex", gap:6, alignItems:"center" }}><span style={{ fontSize:10, color:"#ff8c00", width:12 }}>S</span>{renderPicks(pr.sprintPicks,results.sprint)}</div>}
                          <div style={{ display:"flex", gap:6, alignItems:"center" }}><span style={{ fontSize:10, color:"#e10600", width:12 }}>R</span>{renderPicks(pr.racePicks,results.race)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize:10, color:"#444", marginTop:8 }}>Green = exact · Orange = in top 3</div>
              </div>
            )}
          </div>
        )}

        {/* ══════ LEADERBOARD ══════ */}
        {tab==="leaderboard"&&(
          <div className="slide-in" style={{ padding:"24px 0 60px" }}>
            <div style={{ marginBottom:32 }}>
              <div className="slabel">2026 Season Standings</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {leaderboard.map((entry,idx)=>(
                  <div key={entry.name} className={`lb-row${idx===0?" first-place":""}`}>
                    <div style={{ fontSize:idx===0?28:idx===1?22:18, fontWeight:900, color:idx===0?"#e10600":idx===1?"#aaa":idx===2?"#7a6030":"#555", width:40, textAlign:"center" }}>{idx+1}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, fontSize:18 }}>{entry.name}</div>
                      <div style={{ fontSize:11, color:"#555", marginTop:2 }}>
                        {entry.events.length
                          ?entry.events.sort((a,b)=>(a.round||0)-(b.round||0)).map(e=>`R${e.round||"?"}: ${e.qPts+(e.sPts||0)+e.rPts}pts`).join(" · ")
                          :"No predictions yet"}
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:32, fontWeight:900, color:idx===0?"#fff":"#999" }}>{entry.total}</div>
                      <div style={{ fontSize:10, color:"#555", letterSpacing:"0.15em" }}>PTS</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {Object.entries(
              Object.values(allPredictions).reduce((acc,pred)=>{
                const rnd=pred.round||pred.eventKey;
                if(!acc[rnd])acc[rnd]={name:pred.meetingName,preds:{}};
                acc[rnd].preds[pred.player]=pred;
                return acc;
              },{})
            ).sort(([a],[b])=>Number(a)-Number(b)).map(([rnd,{name:evName,preds}])=>{
              const isCurrent=Object.values(preds)[0]?.eventKey===eventKey;
              const qRes=isCurrent?(results.quali||[]):[];
              const sRes=isCurrent?(results.sprint||[]):[];
              const rRes=isCurrent?(results.race||[]):[];
              const scores=PLAYERS.filter(p=>preds[p]).map(player=>{
                const pr=preds[player];
                const qPts=calcPoints(pr.qualiPicks,qRes,"quali");
                const sPts=pr.isSprint?calcPoints(pr.sprintPicks,sRes,"sprint"):null;
                const rPts=calcPoints(pr.racePicks,rRes,"race");
                return{player,qPts,sPts,rPts,total:qPts+(sPts||0)+rPts,isSprint:pr.isSprint};
              }).sort((a,b)=>b.total-a.total);
              return(
                <div key={rnd} style={{ marginBottom:20, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)", borderRadius:10, overflow:"hidden" }}>
                  <div style={{ padding:"10px 16px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ fontWeight:800, fontSize:15 }}>{evName}</div>
                    {!isCurrent&&<div style={{ fontSize:10, color:"#555" }}>RESULTS PENDING</div>}
                  </div>
                  <div style={{ padding:"6px 0" }}>
                    {scores.map(({player,qPts,sPts,rPts,total,isSprint:isSpr},i)=>(
                      <div key={player} style={{ display:"flex", alignItems:"center", gap:12, padding:"7px 16px" }}>
                        <div style={{ width:20, fontSize:12, fontWeight:700, color:"#555" }}>{i+1}</div>
                        <div style={{ flex:1, fontWeight:600, fontSize:14 }}>{player}</div>
                        <div style={{ fontSize:12, color:"#888" }}>Q:<b style={{ color:"#fff", marginLeft:4 }}>{qPts}</b></div>
                        {isSpr&&sPts!==null&&<div style={{ fontSize:12, color:"#ff8c00" }}>S:<b style={{ color:"#fff", marginLeft:4 }}>{sPts}</b></div>}
                        <div style={{ fontSize:12, color:"#888" }}>R:<b style={{ color:"#fff", marginLeft:4 }}>{rPts}</b></div>
                        <div className="pts-badge">{total}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══════ ADMIN ══════ */}
        {tab==="admin"&&(
          <div className="slide-in" style={{ padding:"24px 0 60px" }}>
            {!adminUnlocked?(
              <div style={{ maxWidth:320 }}>
                <div className="slabel">Admin Password</div>
                <div style={{ display:"flex", gap:8 }}>
                  <input className="f1-input" type="password" placeholder="Enter password…"
                    value={adminPw} onChange={e=>{setAdminPw(e.target.value);setAdminPwError(false);}}
                    onKeyDown={e=>{if(e.key==="Enter"){if(adminPw===ADMIN_PASSWORD)setAdminUnlocked(true);else setAdminPwError(true);}}}
                  />
                  <button className="btn" style={{ padding:"8px 20px", fontSize:12 }}
                    onClick={()=>{if(adminPw===ADMIN_PASSWORD)setAdminUnlocked(true);else setAdminPwError(true);}}>
                    Unlock
                  </button>
                </div>
                {adminPwError&&<div style={{ fontSize:12, color:"#ff6b6b", marginTop:8 }}>Incorrect password</div>}
              </div>
            ):(<>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
                <div className="slabel" style={{ marginBottom:0 }}>Admin Panel</div>
                <button className="btn-sm" onClick={()=>setAdminUnlocked(false)}>Lock</button>
              </div>

              {/* Round selector */}
              <div style={{ marginBottom:24 }}>
                <div className="slabel">Active Round</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {CALENDAR.map(race=>(
                    <button key={race.key} className={`btn-sm${selectedRound===race.round?" active":""}`}
                      onClick={()=>{
                        setSelectedRound(race.round);
                        setAdminResults({quali:["","",""],sprint:["","",""],race:["","",""]});
                        setApiStatus(null);
                      }}
                      style={{ fontSize:10, padding:"5px 10px" }}>
                      R{race.round} {race.location}{race.sprint?" ⚡":""}
                    </button>
                  ))}
                </div>
              </div>

              {/* API fetch */}
              {(()=>{
                const race=CALENDAR.find(r=>r.round===selectedRound);
                return(
                  <div className="card" style={{ marginBottom:20 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:14 }}>Auto-fetch from OpenF1</div>
                        <div style={{ fontSize:11, color:"#555", marginTop:3 }}>Works once sessions have finished (not during live sessions)</div>
                      </div>
                      <button className="btn-api" disabled={apiFetching} onClick={handleApiFetch}>
                        {apiFetching?"Fetching…":"⟳ Fetch Results"}
                      </button>
                    </div>
                    {apiStatus==="ok"&&<div style={{ marginTop:10, fontSize:12, color:"#00ff87" }}>✓ Results fetched — check below and save to publish</div>}
                    {apiStatus==="locked"&&<div style={{ marginTop:10, fontSize:12, color:"#ff8c00" }}>⚠ Session is live or not yet available — enter results manually below</div>}
                    {apiStatus==="error"&&<div style={{ marginTop:10, fontSize:12, color:"#ff6b6b" }}>✕ API error — enter results manually below</div>}
                  </div>
                );
              })()}

              {/* Manual results entry */}
              {(()=>{
                const race=CALENDAR.find(r=>r.round===selectedRound);
                return(
                  <div style={{ marginBottom:24 }}>
                    <div className="slabel">Results for {race.name} — enter manually if needed</div>
                    {[
                      {key:"quali",label:"Qualifying Top 3",color:"#ff8c00"},
                      ...(race.sprint?[{key:"sprint",label:"Sprint Top 3",color:"#ff8c00"}]:[]),
                      {key:"race",label:"Race Top 3",color:"#e10600"},
                    ].map(({key,label,color})=>(
                      <div key={key} className="card" style={{ marginBottom:12 }}>
                        <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.15em", color, marginBottom:12 }}>{label}</div>
                        <div style={{ display:"flex", gap:8 }}>
                          {[0,1,2].map(i=>(
                            <div key={i} style={{ flex:1 }}>
                              <div style={{ fontSize:9, color:"#555", letterSpacing:"0.15em", fontWeight:700, marginBottom:4 }}>P{i+1}</div>
                              <ResultSelect
                                value={adminResults[key]?.[i]||""}
                                onChange={v=>setAdminResults(prev=>({...prev,[key]:prev[key].map((x,j)=>j===i?v:x)}))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <button className="btn" disabled={adminSaving} onClick={handleAdminSave}
                style={{ width:"100%", boxShadow:"0 0 20px rgba(225,6,0,.25)" }}>
                {adminSaving?"Saving…":adminSaved?"✓ Saved & Live!":"Save & Publish"}
              </button>
            </>)}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── DAY SECTION ─────────────────────────────────────────────────────────────
function DaySection({day,color,label,hint,last,children}){
  return(
    <div style={{ marginBottom:last?28:14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
        <div style={{ background:`${color}22`, border:`1px solid ${color}55`, borderRadius:4, padding:"3px 10px", fontSize:10, fontWeight:800, letterSpacing:"0.18em", color }}>{day}</div>
        <div style={{ flex:1, height:1, background:"rgba(255,255,255,.06)" }}/>
      </div>
      <div style={{ background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.07)", borderRadius:10, padding:16 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.15em", color, marginBottom:3 }}>{label}</div>
        <div style={{ fontSize:11, color:"#555", marginBottom:14 }}>{hint}</div>
        {children}
      </div>
    </div>
  );
}

// ─── PICK ROW ─────────────────────────────────────────────────────────────────
function PickRow({pos,picks,set}){
  return(
    <div style={{ marginBottom:8 }}>
      <div style={{ fontSize:10, color:"#555", letterSpacing:"0.15em", marginBottom:4, fontWeight:700 }}>P{pos+1}</div>
      <DriverSelect value={picks[pos]} onChange={v=>{const n=[...picks];n[pos]=v;set(n);}} placeholder={`Pick P${pos+1}…`}/>
    </div>
  );
}

// ─── DRIVER SELECT ────────────────────────────────────────────────────────────
function DriverSelect({value,onChange,placeholder}){
  const [open,setOpen]=useState(false);
  const [q,setQ]=useState("");
  const ref=useRef(null);
  const selected=DRIVERS.find(d=>d.acronym===value);
  const filtered=DRIVERS.filter(d=>{
    if(!q)return true;
    const s=q.toLowerCase();
    return d.acronym.toLowerCase().includes(s)||d.name.toLowerCase().includes(s)||d.team.toLowerCase().includes(s);
  });
  useEffect(()=>{
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);
  return(
    <div ref={ref} style={{ position:"relative" }}>
      <div className={`pick-slot${value?" filled":""}`} onClick={()=>setOpen(o=>!o)}>
        {selected?(<>
          <div style={{ width:3, borderRadius:2, height:28, background:teamColor(selected.team), flexShrink:0 }}/>
          <div style={{ fontWeight:800, fontSize:13, color:teamColor(selected.team), width:40 }}>{selected.acronym}</div>
          <div style={{ fontSize:12, color:"#bbb", flex:1 }}>{selected.name}</div>
          <div style={{ fontSize:11, color:"#555" }}>{selected.team}</div>
        </>):<span style={{ color:"#444", fontSize:13 }}>{placeholder}</span>}
        {value&&<button onClick={e=>{e.stopPropagation();onChange("");}} style={{ background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:14,marginLeft:"auto" }}>✕</button>}
      </div>
      {open&&(
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:100, background:"#111", border:"1px solid rgba(255,255,255,.12)", borderRadius:6, maxHeight:220, overflow:"auto", boxShadow:"0 8px 32px rgba(0,0,0,.6)" }}>
          <div style={{ padding:8, borderBottom:"1px solid rgba(255,255,255,.08)" }}>
            <input className="f1-input" placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)} autoFocus style={{ fontSize:12, padding:"6px 10px" }}/>
          </div>
          {filtered.length===0?<div style={{ padding:"12px 16px", color:"#555", fontSize:12 }}>No drivers found</div>
            :filtered.map(d=>(
              <div key={d.number} onClick={()=>{onChange(d.acronym);setOpen(false);setQ("");}}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", cursor:"pointer", background:d.acronym===value?"rgba(225,6,0,.1)":"transparent" }}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.05)"}
                onMouseLeave={e=>e.currentTarget.style.background=d.acronym===value?"rgba(225,6,0,.1)":"transparent"}>
                <div style={{ width:3, borderRadius:2, height:20, background:teamColor(d.team), flexShrink:0 }}/>
                <div style={{ fontWeight:800, fontSize:12, width:38, color:teamColor(d.team) }}>{d.acronym}</div>
                <div style={{ flex:1, fontSize:13 }}>{d.name}</div>
                <div style={{ fontSize:11, color:"#555" }}>{d.team}</div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

// ─── RESULT SELECT ────────────────────────────────────────────────────────────
function ResultSelect({value,onChange}){
  const [open,setOpen]=useState(false);
  const [q,setQ]=useState("");
  const ref=useRef(null);
  const selected=DRIVERS.find(d=>d.acronym===value);
  const filtered=DRIVERS.filter(d=>{
    if(!q)return true;
    const s=q.toLowerCase();
    return d.acronym.toLowerCase().includes(s)||d.name.toLowerCase().includes(s);
  });
  useEffect(()=>{
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);
  return(
    <div ref={ref} style={{ position:"relative" }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.12)", borderRadius:4, padding:"7px 10px", cursor:"pointer", display:"flex", alignItems:"center", gap:6, minHeight:36 }}>
        {selected?(<>
          <div style={{ width:3, height:16, borderRadius:2, background:teamColor(selected.team), flexShrink:0 }}/>
          <span style={{ fontWeight:800, fontSize:12, color:teamColor(selected.team) }}>{selected.acronym}</span>
        </>):<span style={{ fontSize:12, color:"#444" }}>—</span>}
        {value&&<button onClick={e=>{e.stopPropagation();onChange("");}} style={{ background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:12,marginLeft:"auto" }}>✕</button>}
      </div>
      {open&&(
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:200, background:"#111", border:"1px solid rgba(255,255,255,.12)", borderRadius:6, maxHeight:180, overflow:"auto", boxShadow:"0 8px 32px rgba(0,0,0,.8)" }}>
          <div style={{ padding:6, borderBottom:"1px solid rgba(255,255,255,.08)" }}>
            <input className="f1-input" placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)} autoFocus style={{ fontSize:11, padding:"5px 8px" }}/>
          </div>
          {filtered.map(d=>(
            <div key={d.number} onClick={()=>{onChange(d.acronym);setOpen(false);setQ("");}}
              style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", cursor:"pointer" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.05)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ width:3, height:16, borderRadius:2, background:teamColor(d.team) }}/>
              <span style={{ fontWeight:800, fontSize:11, color:teamColor(d.team), width:34 }}>{d.acronym}</span>
              <span style={{ fontSize:12 }}>{d.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
