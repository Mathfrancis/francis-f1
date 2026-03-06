import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot, collection } from "firebase/firestore";

// ─── FIREBASE CONFIG ──────────────────────────────────────────────────────────
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

// ─── SCORING CONFIG ───────────────────────────────────────────────────────────
const SCORING = {
  quali:  { exact: 5,  featured: 2 },
  sprint: { exact: 8,  featured: 3 },
  race:   { exact: 12, featured: 5 },
};

const PLAYERS = ["Matt", "Stu", "Jim", "Harry"];

// ─── OPENF1 API HELPERS ───────────────────────────────────────────────────────
const F1_API = "https://api.openf1.org/v1";

async function fetchJSON(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

async function getLatestSession(type) {
  const data = await fetchJSON(`${F1_API}/sessions?session_type=${type}&year=2026`);
  if (!data || !data.length) return null;
  return data[data.length - 1];
}

const FALLBACK_DRIVERS = [
  { driver_number: 1,  name_acronym: "NOR", full_name: "Lando Norris",           team_name: "McLaren" },
  { driver_number: 81, name_acronym: "PIA", full_name: "Oscar Piastri",           team_name: "McLaren" },
  { driver_number: 63, name_acronym: "RUS", full_name: "George Russell",          team_name: "Mercedes" },
  { driver_number: 12, name_acronym: "ANT", full_name: "Kimi Antonelli",          team_name: "Mercedes" },
  { driver_number: 3,  name_acronym: "VER", full_name: "Max Verstappen",          team_name: "Red Bull Racing" },
  { driver_number: 6,  name_acronym: "HAD", full_name: "Isack Hadjar",            team_name: "Red Bull Racing" },
  { driver_number: 16, name_acronym: "LEC", full_name: "Charles Leclerc",         team_name: "Ferrari" },
  { driver_number: 44, name_acronym: "HAM", full_name: "Lewis Hamilton",          team_name: "Ferrari" },
  { driver_number: 23, name_acronym: "ALB", full_name: "Alexander Albon",         team_name: "Williams" },
  { driver_number: 55, name_acronym: "SAI", full_name: "Carlos Sainz",            team_name: "Williams" },
  { driver_number: 41, name_acronym: "LIN", full_name: "Arvid Lindblad",          team_name: "Racing Bulls" },
  { driver_number: 30, name_acronym: "LAW", full_name: "Liam Lawson",             team_name: "Racing Bulls" },
  { driver_number: 18, name_acronym: "STR", full_name: "Lance Stroll",            team_name: "Aston Martin" },
  { driver_number: 14, name_acronym: "ALO", full_name: "Fernando Alonso",         team_name: "Aston Martin" },
  { driver_number: 31, name_acronym: "OCO", full_name: "Esteban Ocon",            team_name: "Haas" },
  { driver_number: 87, name_acronym: "BEA", full_name: "Oliver Bearman",          team_name: "Haas" },
  { driver_number: 27, name_acronym: "HUL", full_name: "Nico Hulkenberg",         team_name: "Audi" },
  { driver_number: 5,  name_acronym: "BOR", full_name: "Gabriel Bortoleto",       team_name: "Audi" },
  { driver_number: 10, name_acronym: "GAS", full_name: "Pierre Gasly",            team_name: "Alpine" },
  { driver_number: 43, name_acronym: "COL", full_name: "Franco Colapinto",        team_name: "Alpine" },
  { driver_number: 11, name_acronym: "PER", full_name: "Sergio Perez",            team_name: "Cadillac" },
  { driver_number: 77, name_acronym: "BOT", full_name: "Valtteri Bottas",         team_name: "Cadillac" },
];

async function getDrivers(sessionKey) {
  const data = await fetchJSON(`${F1_API}/drivers?session_key=${sessionKey}`);
  if (data && data.length) {
    return data.sort((a, b) => (a.driver_number || 99) - (b.driver_number || 99));
  }
  return FALLBACK_DRIVERS;
}

async function getPositions(sessionKey) {
  const data = await fetchJSON(`${F1_API}/position?session_key=${sessionKey}`);
  if (!data || !data.length) return [];
  const latest = {};
  for (const p of data) {
    if (!latest[p.driver_number] || p.date > latest[p.driver_number].date) {
      latest[p.driver_number] = p;
    }
  }
  return Object.values(latest).sort((a, b) => a.position - b.position);
}

// ─── SCORING LOGIC ────────────────────────────────────────────────────────────
function calcPoints(predictions = [], results = [], type) {
  const cfg = SCORING[type];
  if (!cfg) return 0;
  let pts = 0;
  const top3 = results.slice(0, 3).map(r => (r.name_acronym || r.full_name || "").toUpperCase());
  for (let i = 0; i < 3; i++) {
    const pred = (predictions[i] || "").toUpperCase();
    if (!pred) continue;
    const exactIdx = top3.indexOf(pred);
    if (exactIdx === i) pts += cfg.exact;
    else if (exactIdx !== -1) pts += cfg.featured;
  }
  return pts;
}

// ─── TEAM COLORS ─────────────────────────────────────────────────────────────
const TEAM_COLORS = {
  red_bull: "#3671C6", ferrari: "#E8002D", mercedes: "#27F4D2",
  mclaren: "#FF8000", aston_martin: "#229971", alpine: "#FF87BC",
  williams: "#64C4FF", haas: "#B6BABD", rb: "#6692FF", kick_sauber: "#52E252",
};

function teamColor(teamName = "") {
  const t = teamName.toLowerCase().replace(/\s/g, "_");
  for (const [k, v] of Object.entries(TEAM_COLORS)) {
    if (t.includes(k.replace("_", ""))) return v;
  }
  return "#ffffff";
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function F1Predictions() {
  const [tab, setTab] = useState("predict");
  const [activePlayer, setActivePlayer] = useState(null);
  const [allPredictions, setAllPredictions] = useState({});

  const [qualiSession,    setQualiSession]    = useState(null);
  const [raceSession,     setRaceSession]     = useState(null);
  const [sprintSession,   setSprintSession]   = useState(null);
  const [isSprintWeekend, setIsSprintWeekend] = useState(false);
  const [allDrivers,      setAllDrivers]      = useState([]);
  const [qualiResults,    setQualiResults]    = useState([]);
  const [raceResults,     setRaceResults]     = useState([]);
  const [sprintResults,   setSprintResults]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [liveEvent, setLiveEvent] = useState("race");

  const [qualiPicks,  setQualiPicks]  = useState(["", "", ""]);
  const [sprintPicks, setSprintPicks] = useState(["", "", ""]);
  const [racePicks,   setRacePicks]   = useState(["", "", ""]);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [dbError, setDbError] = useState(null);

  const pollRef = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "predictions"),
      (snapshot) => {
        const preds = {};
        snapshot.forEach(d => { preds[d.id] = d.data(); });
        setAllPredictions(preds);
        setDbError(null);
      },
      (err) => {
        console.error("Firestore:", err);
        setDbError("Could not connect to database — check Firestore is in test mode.");
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => { bootstrap(); }, []);

  async function bootstrap() {
    setLoading(true);
    const [qSess, rSess, sSess] = await Promise.all([
      getLatestSession("Qualifying"),
      getLatestSession("Race"),
      getLatestSession("Sprint"),
    ]);
    setQualiSession(qSess);
    setRaceSession(rSess);

    const sprintWeekend = !!(sSess && rSess && sSess.meeting_key === rSess.meeting_key);
    setIsSprintWeekend(sprintWeekend);
    if (sprintWeekend) setSprintSession(sSess);

    const drivers = qSess ? await getDrivers(qSess.session_key) : [];
    if (drivers.length) setAllDrivers(drivers);

    if (qSess) setQualiResults(enrichResults(await getPositions(qSess.session_key), drivers));
    if (rSess) {
      const dr = drivers.length ? drivers : await getDrivers(rSess.session_key);
      setRaceResults(enrichResults(await getPositions(rSess.session_key), dr));
    }
    if (sprintWeekend && sSess) {
      const dr = drivers.length ? drivers : await getDrivers(sSess.session_key);
      setSprintResults(enrichResults(await getPositions(sSess.session_key), dr));
    }
    setLoading(false);
    startPolling(qSess, rSess, sprintWeekend ? sSess : null);
  }

  function enrichResults(positions, drivers) {
    return positions.map(p => {
      const d = drivers.find(d => d.driver_number === p.driver_number);
      return { ...p, ...(d || {}), name_acronym: d?.name_acronym || `#${p.driver_number}` };
    });
  }

  function startPolling(qSess, rSess, sSess) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      if (qSess) { const dr = await getDrivers(qSess.session_key); setQualiResults(enrichResults(await getPositions(qSess.session_key), dr)); }
      if (rSess) { const dr = await getDrivers(rSess.session_key); setRaceResults(enrichResults(await getPositions(rSess.session_key), dr)); }
      if (sSess) { const dr = await getDrivers(sSess.session_key); setSprintResults(enrichResults(await getPositions(sSess.session_key), dr)); }
    }, 15000);
  }

  useEffect(() => () => clearInterval(pollRef.current), []);

  function selectPlayer(name) {
    setActivePlayer(name);
    const ek = currentEventKey();
    const existing = allPredictions[`${ek}_${name}`];
    if (existing) {
      setQualiPicks(existing.qualiPicks   || ["", "", ""]);
      setSprintPicks(existing.sprintPicks || ["", "", ""]);
      setRacePicks(existing.racePicks     || ["", "", ""]);
    } else {
      setQualiPicks(["", "", ""]);
      setSprintPicks(["", "", ""]);
      setRacePicks(["", "", ""]);
    }
  }

  function currentEventKey() {
    return String(raceSession?.session_key || qualiSession?.session_key || "unknown");
  }

  async function handleSave() {
    if (!activePlayer) return;
    setSaving(true);
    try {
      const ek = currentEventKey();
      await setDoc(doc(db, "predictions", `${ek}_${activePlayer}`), {
        qualiPicks:  [...qualiPicks],
        sprintPicks: [...sprintPicks],
        racePicks:   [...racePicks],
        isSprint:    isSprintWeekend,
        meetingName: raceSession?.meeting_name || qualiSession?.meeting_name || "Unknown GP",
        player:      activePlayer,
        eventKey:    ek,
        updatedAt:   Date.now(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error(e);
      setDbError("Save failed — make sure Firestore is in test mode.");
    }
    setSaving(false);
  }

  function computeLeaderboard() {
    const totals = {};
    const byEvent = {};
    for (const [, pred] of Object.entries(allPredictions)) {
      const ek = pred.eventKey;
      if (!byEvent[ek]) byEvent[ek] = {};
      byEvent[ek][pred.player] = pred;
    }
    for (const eventPreds of Object.values(byEvent)) {
      for (const [player, preds] of Object.entries(eventPreds)) {
        if (!totals[player]) totals[player] = { name: player, total: 0, events: [] };
        const qPts = qualiResults.length  ? calcPoints(preds.qualiPicks,  qualiResults,  "quali")  : 0;
        const sPts = (preds.isSprint && sprintResults.length) ? calcPoints(preds.sprintPicks, sprintResults, "sprint") : 0;
        const rPts = raceResults.length   ? calcPoints(preds.racePicks,   raceResults,   "race")   : 0;
        totals[player].total += qPts + sPts + rPts;
        totals[player].events.push({ name: preds.meetingName, qPts, sPts, rPts, isSprint: preds.isSprint });
      }
    }
    for (const p of PLAYERS) {
      if (!totals[p]) totals[p] = { name: p, total: 0, events: [] };
    }
    return Object.values(totals).sort((a, b) => b.total - a.total || PLAYERS.indexOf(a.name) - PLAYERS.indexOf(b.name));
  }

  const leaderboard    = computeLeaderboard();
  const currentResults = liveEvent === "race" ? raceResults : liveEvent === "sprint" ? sprintResults : qualiResults;
  const currentSession = liveEvent === "race" ? raceSession : liveEvent === "sprint" ? sprintSession : qualiSession;
  const ek             = currentEventKey();
  const eventPreds     = Object.fromEntries(
    Object.entries(allPredictions)
      .filter(([id]) => id.startsWith(ek + "_"))
      .map(([, v]) => [v.player, v])
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", fontFamily: "'Barlow Condensed','Arial Narrow',sans-serif", color: "#fff", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#111}::-webkit-scrollbar-thumb{background:#e10600}
        .f1-bg{position:fixed;inset:0;z-index:0;background:radial-gradient(ellipse at 20% 0%,#1a0a0a,transparent 50%),radial-gradient(ellipse at 80% 100%,#0a0a1a,transparent 50%),#0a0a0f}
        .f1-grid{position:fixed;inset:0;z-index:0;opacity:.04;background-image:linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px);background-size:40px 40px}
        .stripe{position:fixed;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#e10600,#ff6b00,#e10600);z-index:100}
        .tab-btn{background:none;border:none;color:#666;cursor:pointer;font-family:inherit;font-size:13px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;padding:8px 20px;transition:color .2s;position:relative}
        .tab-btn:hover{color:#fff}.tab-btn.active{color:#e10600}
        .tab-btn.active::after{content:'';position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:4px;height:4px;background:#e10600;border-radius:50%}
        .pick-slot{background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.15);border-radius:6px;padding:10px 14px;min-height:48px;display:flex;align-items:center;gap:10px;cursor:pointer;transition:all .2s}
        .pick-slot:hover{border-color:rgba(225,6,0,.5);background:rgba(225,6,0,.05)}
        .pick-slot.filled{border-style:solid;border-color:rgba(255,255,255,.2);background:rgba(255,255,255,.05)}
        .live-row{display:flex;align-items:center;padding:8px 12px;border-radius:6px;gap:12px}
        .live-row:nth-child(odd){background:rgba(255,255,255,.02)}
        .live-row.top3{background:rgba(225,6,0,.08);border-left:2px solid #e10600;padding-left:10px}
        .lb-row{display:flex;align-items:center;padding:12px 16px;border-radius:8px;gap:12px}
        .lb-row:nth-child(odd){background:rgba(255,255,255,.02)}
        .lb-row.first-place{background:linear-gradient(90deg,rgba(225,6,0,.15),transparent);border-left:3px solid #e10600}
        .pulse{animation:pulse 2s ease-in-out infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .slide-in{animation:slideIn .4s ease both}
        @keyframes slideIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .team-bar{width:3px;border-radius:2px;height:20px;flex-shrink:0}
        .section-label{font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#e10600;margin-bottom:10px}
        .pts-badge{background:#e10600;color:#fff;font-size:11px;font-weight:800;padding:3px 8px;border-radius:3px;letter-spacing:.05em;white-space:nowrap}
        .btn-primary{background:#e10600;color:#fff;border:none;cursor:pointer;font-family:inherit;font-size:13px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;padding:12px 28px;border-radius:4px;transition:all .2s}
        .btn-primary:hover{background:#ff1a0f;transform:translateY(-1px);box-shadow:0 4px 16px rgba(225,6,0,.4)}
        .btn-primary:disabled{background:#333;cursor:not-allowed;transform:none;box-shadow:none}
        .toggle-btn{background:none;border:1px solid rgba(255,255,255,.12);color:#888;font-family:inherit;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:7px 18px;border-radius:4px;cursor:pointer;transition:all .15s}
        .toggle-btn.active{background:rgba(225,6,0,.2);border-color:#e10600;color:#fff}
        .toggle-btn:hover:not(.active){border-color:rgba(255,255,255,.3);color:#fff}
        .f1-input{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:#fff;font-family:inherit;font-size:12px;font-weight:600;letter-spacing:.05em;padding:6px 10px;border-radius:4px;outline:none;width:100%}
        .f1-input:focus{border-color:#e10600}
        .f1-input::placeholder{color:#444;font-weight:400}
        .error-bar{background:rgba(255,50,50,.1);border:1px solid rgba(255,50,50,.3);color:#ff8080;font-size:12px;padding:10px 16px;border-radius:6px;margin-bottom:16px}
      `}</style>

      <div className="f1-bg"/><div className="f1-grid"/><div className="stripe"/>

      <div style={{ position:"relative", zIndex:1, maxWidth:900, margin:"0 auto", padding:"0 16px" }}>

        <header style={{ padding:"28px 0 0", display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
              <div style={{ width:28, height:28, background:"#e10600", borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:900 }}>F</div>
              <span style={{ fontSize:24, fontWeight:900, letterSpacing:"0.1em", textTransform:"uppercase" }}>rancis Family F1 Predictions</span>
            </div>
            <div style={{ fontSize:11, color:"#555", letterSpacing:"0.2em", fontWeight:600 }}>
              {raceSession ? `▸ ${raceSession.meeting_name} · ${raceSession.location}` : loading ? "LOADING SEASON DATA…" : "NO ACTIVE SESSION"}
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#00ff87", animation:"pulse 2s ease infinite" }}/>
              <span style={{ fontSize:10, color:"#00ff87", letterSpacing:"0.15em", fontWeight:700 }}>F1 LIVE</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background: dbError ? "#ff4444" : "#00ff87" }}/>
              <span style={{ fontSize:10, color: dbError ? "#ff4444" : "#00ff87", letterSpacing:"0.12em", fontWeight:700 }}>
                {dbError ? "DB OFFLINE" : "DB SYNCED"}
              </span>
            </div>
          </div>
        </header>

        <nav style={{ display:"flex", borderBottom:"1px solid rgba(255,255,255,.08)", margin:"20px 0 0", gap:4 }}>
          {[["predict","⬡ Predict"],["live","◎ Live Timing"],["leaderboard","▲ Leaderboard"]].map(([id,label]) => (
            <button key={id} className={`tab-btn${tab===id?" active":""}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </nav>

        {/* ═════════ PREDICT ═════════ */}
        {tab === "predict" && (
          <div className="slide-in" style={{ padding:"24px 0 60px" }}>
            {dbError && <div className="error-bar">⚠ {dbError}</div>}

            <div style={{ marginBottom:28 }}>
              <div className="section-label">Who are you?</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {PLAYERS.map(name => (
                  <button key={name} onClick={() => selectPlayer(name)} style={{
                    background: activePlayer===name ? "#e10600" : "rgba(255,255,255,.04)",
                    border: `1px solid ${activePlayer===name ? "#e10600" : "rgba(255,255,255,.12)"}`,
                    color: activePlayer===name ? "#fff" : "#888",
                    fontFamily:"inherit", fontSize:16, fontWeight:800, letterSpacing:"0.12em",
                    textTransform:"uppercase", padding:"12px 28px", borderRadius:6, cursor:"pointer",
                    transition:"all .15s",
                    boxShadow: activePlayer===name ? "0 4px 16px rgba(225,6,0,.35)" : "none",
                  }}>
                    {activePlayer===name ? `✓ ${name}` : name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:8, padding:"14px 16px", marginBottom:28, display:"flex", gap:24, flexWrap:"wrap", alignItems:"center" }}>
              <div>
                <div className="section-label" style={{ marginBottom:4 }}>Qualifying</div>
                <div style={{ fontSize:13, color:"#bbb" }}><span style={{ color:"#fff", fontWeight:700 }}>+5</span> exact · <span style={{ color:"#fff", fontWeight:700 }}>+2</span> featured</div>
              </div>
              {isSprintWeekend && <>
                <div style={{ borderLeft:"1px solid rgba(255,255,255,.08)", paddingLeft:24 }}>
                  <div className="section-label" style={{ marginBottom:4, color:"#ff8c00" }}>Sprint</div>
                  <div style={{ fontSize:13, color:"#bbb" }}><span style={{ color:"#fff", fontWeight:700 }}>+8</span> exact · <span style={{ color:"#fff", fontWeight:700 }}>+3</span> featured</div>
                </div>
                <div style={{ marginLeft:"auto", background:"rgba(255,140,0,.1)", border:"1px solid rgba(255,140,0,.25)", borderRadius:4, padding:"4px 12px" }}>
                  <span style={{ fontSize:10, color:"#ff8c00", fontWeight:800, letterSpacing:"0.15em" }}>⚡ SPRINT WEEKEND</span>
                </div>
              </>}
              <div style={{ borderLeft:"1px solid rgba(255,255,255,.08)", paddingLeft:24 }}>
                <div className="section-label" style={{ marginBottom:4 }}>Race</div>
                <div style={{ fontSize:13, color:"#bbb" }}><span style={{ color:"#fff", fontWeight:700 }}>+12</span> exact · <span style={{ color:"#fff", fontWeight:700 }}>+5</span> featured</div>
              </div>
            </div>

            {isSprintWeekend ? (<>
              <DaySection day="FRIDAY"   dayColor="#6c8ebf" session={qualiSession}  label="Qualifying Top 3" hint="predict before Friday's qualifying session">
                {[0,1,2].map(i => <PickRow key={i} pos={i} picks={qualiPicks}  setPicks={setQualiPicks}  drivers={allDrivers}/>)}
              </DaySection>
              <DaySection day="SATURDAY" dayColor="#ff8c00" session={sprintSession} label="Sprint Top 3"     hint="predict after qualifying, before Saturday's sprint">
                {[0,1,2].map(i => <PickRow key={i} pos={i} picks={sprintPicks} setPicks={setSprintPicks} drivers={allDrivers}/>)}
              </DaySection>
              <DaySection day="SUNDAY"   dayColor="#e10600" session={raceSession}   label="Race Top 3"       hint="predict after the sprint, before lights out" last>
                {[0,1,2].map(i => <PickRow key={i} pos={i} picks={racePicks}   setPicks={setRacePicks}   drivers={allDrivers}/>)}
              </DaySection>
            </>) : (<>
              <DaySection day="SATURDAY" dayColor="#ff8c00" session={qualiSession}  label="Qualifying Top 3" hint="predict before Saturday's session">
                {[0,1,2].map(i => <PickRow key={i} pos={i} picks={qualiPicks}  setPicks={setQualiPicks}  drivers={allDrivers}/>)}
              </DaySection>
              <DaySection day="SUNDAY"   dayColor="#e10600" session={raceSession}   label="Race Top 3"       hint="predict after qualifying, before lights out" last>
                {[0,1,2].map(i => <PickRow key={i} pos={i} picks={racePicks}   setPicks={setRacePicks}   drivers={allDrivers}/>)}
              </DaySection>
            </>)}

            <button className="btn-primary" disabled={!activePlayer || saving} onClick={handleSave}
              style={{ width:"100%", boxShadow: activePlayer ? "0 0 20px rgba(225,6,0,.3)" : "none" }}>
              {saving ? "Saving…" : saved ? "✓ Saved to cloud!" : activePlayer ? `Save Predictions for ${activePlayer}` : "Select your name first"}
            </button>

            {Object.keys(eventPreds).length > 0 && (
              <div style={{ marginTop:32 }}>
                <div className="section-label">All Predictions This Round</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {PLAYERS.filter(p => eventPreds[p]).map(player => {
                    const preds = eventPreds[player];
                    const qPts = qualiResults.length ? calcPoints(preds.qualiPicks, qualiResults, "quali") : null;
                    const sPts = (preds.isSprint && sprintResults.length) ? calcPoints(preds.sprintPicks, sprintResults, "sprint") : null;
                    const rPts = raceResults.length ? calcPoints(preds.racePicks, raceResults, "race") : null;
                    const total = (qPts||0)+(sPts||0)+(rPts||0);
                    return (
                      <div key={player} style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:8, padding:"12px 16px", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                        <div style={{ fontWeight:800, fontSize:15, flex:1 }}>{player}</div>
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                          <div style={{ fontSize:12, color:"#888" }}>Q: <span style={{ color:"#fff", fontWeight:700 }}>{(preds.qualiPicks||[]).filter(Boolean).join(" · ")||"—"}</span></div>
                          {preds.isSprint && <div style={{ fontSize:12, color:"#ff8c00" }}>S: <span style={{ color:"#fff", fontWeight:700 }}>{(preds.sprintPicks||[]).filter(Boolean).join(" · ")||"—"}</span></div>}
                          <div style={{ fontSize:12, color:"#888" }}>R: <span style={{ color:"#fff", fontWeight:700 }}>{(preds.racePicks||[]).filter(Boolean).join(" · ")||"—"}</span></div>
                        </div>
                        {(qPts!==null||rPts!==null) && <div className="pts-badge">{total} PTS</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═════════ LIVE TIMING ═════════ */}
        {tab === "live" && (
          <div className="slide-in" style={{ padding:"24px 0 60px" }}>
            <div style={{ display:"flex", gap:8, marginBottom:20, alignItems:"center", flexWrap:"wrap" }}>
              <button className={`toggle-btn${liveEvent==="quali"?" active":""}`} onClick={() => setLiveEvent("quali")}>Qualifying</button>
              {isSprintWeekend && (
                <button className={`toggle-btn${liveEvent==="sprint"?" active":""}`} onClick={() => setLiveEvent("sprint")}
                  style={{ borderColor:liveEvent==="sprint"?"#ff8c00":undefined, color:liveEvent==="sprint"?"#ff8c00":undefined }}>⚡ Sprint</button>
              )}
              <button className={`toggle-btn${liveEvent==="race"?" active":""}`} onClick={() => setLiveEvent("race")}>Race</button>
              <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:"#00ff87" }} className="pulse"/>
                <span style={{ fontSize:10, color:"#00ff87", letterSpacing:"0.12em", fontWeight:700 }}>UPDATES EVERY 15s</span>
              </div>
            </div>

            {currentSession && (
              <div style={{ background:"rgba(225,6,0,.08)", border:"1px solid rgba(225,6,0,.2)", borderRadius:8, padding:"12px 16px", marginBottom:20, display:"flex", gap:16, alignItems:"center", flexWrap:"wrap" }}>
                <div>
                  <div style={{ fontSize:18, fontWeight:800 }}>{currentSession.meeting_name}</div>
                  <div style={{ fontSize:12, color:"#888" }}>{currentSession.location} · {currentSession.country_name}</div>
                </div>
                <div style={{ marginLeft:"auto", fontSize:12, color:"#666" }}>
                  {currentSession.date_start ? new Date(currentSession.date_start).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : ""}
                </div>
              </div>
            )}

            {loading ? (
              <div style={{ textAlign:"center", padding:60, color:"#555" }}>
                <div className="pulse" style={{ fontSize:40 }}>◎</div>
                <div style={{ marginTop:12, letterSpacing:"0.2em", fontSize:12 }}>LOADING TELEMETRY…</div>
              </div>
            ) : currentResults.length === 0 ? (
              <div style={{ textAlign:"center", padding:60, color:"#555" }}>
                <div style={{ fontSize:40 }}>◌</div>
                <div style={{ marginTop:12, letterSpacing:"0.2em", fontSize:12 }}>NO POSITION DATA YET</div>
              </div>
            ) : (<>
              {currentResults.slice(0,20).map((r, idx) => {
                const color = teamColor(r.team_name||"");
                const isTop3 = idx < 3;
                const predictors = PLAYERS.filter(player => {
                  const p = eventPreds[player];
                  if (!p) return false;
                  const picks = liveEvent==="race" ? p.racePicks : liveEvent==="sprint" ? p.sprintPicks : p.qualiPicks;
                  return (picks||[]).some(pk => pk && pk.toUpperCase()===(r.name_acronym||"").toUpperCase());
                });
                return (
                  <div key={r.driver_number} className={`live-row${isTop3?" top3":""}`}>
                    <div style={{ width:32, fontWeight:800, fontSize:isTop3?20:16, color:isTop3?"#fff":"#666" }}>{r.position||idx+1}</div>
                    <div className="team-bar" style={{ background:color }}/>
                    <div style={{ width:48, fontWeight:800, fontSize:14, color }}>{r.name_acronym||`#${r.driver_number}`}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:14 }}>{r.full_name||"—"}</div>
                      {predictors.length>0 && <div style={{ fontSize:10, color:"#e10600", fontWeight:700, marginTop:2 }}>⬡ {predictors.join(", ")}</div>}
                    </div>
                    <div style={{ fontSize:11, color:"#555", maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.team_name||""}</div>
                  </div>
                );
              })}

              {Object.keys(eventPreds).length>0 && (
                <div style={{ marginTop:32 }}>
                  <div className="section-label">Live Scores — {liveEvent==="race"?"Race":liveEvent==="sprint"?"Sprint":"Qualifying"}</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {PLAYERS.filter(p => eventPreds[p]).map(player => {
                      const preds = eventPreds[player];
                      const picks = liveEvent==="race" ? preds.racePicks : liveEvent==="sprint" ? preds.sprintPicks : preds.qualiPicks;
                      const type  = liveEvent==="sprint" ? "sprint" : liveEvent==="race" ? "race" : "quali";
                      const pts   = calcPoints(picks, currentResults, type);
                      const top3  = currentResults.slice(0,3);
                      return (
                        <div key={player} style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", borderRadius:8, padding:"10px 16px", display:"flex", alignItems:"center", gap:12 }}>
                          <div style={{ fontWeight:700, fontSize:14, flex:1 }}>{player}</div>
                          <div style={{ display:"flex", gap:6 }}>
                            {(picks||[]).map((p,i) => {
                              const exact  = top3[i]?.name_acronym?.toUpperCase()===p?.toUpperCase();
                              const inTop3 = !exact && top3.some(r=>r.name_acronym?.toUpperCase()===p?.toUpperCase());
                              return p ? (
                                <span key={i} style={{ fontSize:11, fontWeight:700, padding:"2px 7px", borderRadius:3,
                                  background:exact?"rgba(0,255,135,.2)":inTop3?"rgba(255,140,0,.2)":"rgba(255,255,255,.05)",
                                  color:exact?"#00ff87":inTop3?"#ff8c00":"#666",
                                  border:`1px solid ${exact?"rgba(0,255,135,.4)":inTop3?"rgba(255,140,0,.4)":"rgba(255,255,255,.1)"}` }}>{p}</span>
                              ) : null;
                            })}
                          </div>
                          <div className="pts-badge">{pts} PTS</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize:10, color:"#444", marginTop:8 }}>Green = exact position · Orange = in top 3</div>
                </div>
              )}
            </>)}
          </div>
        )}

        {/* ═════════ LEADERBOARD ═════════ */}
        {tab === "leaderboard" && (
          <div className="slide-in" style={{ padding:"24px 0 60px" }}>
            <div style={{ marginBottom:32 }}>
              <div className="section-label">2025 Season Standings</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {leaderboard.map((entry, idx) => (
                  <div key={entry.name} className={`lb-row${idx===0?" first-place":""}`}>
                    <div style={{ fontSize:idx===0?28:idx===1?22:18, fontWeight:900, color:idx===0?"#e10600":idx===1?"#888":idx===2?"#7a6030":"#555", width:40, textAlign:"center" }}>{idx+1}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, fontSize:18 }}>{entry.name}</div>
                      <div style={{ fontSize:11, color:"#555", marginTop:2 }}>
                        {entry.events.length ? entry.events.map(e => `${e.name}: ${e.qPts+(e.sPts||0)+e.rPts}pts`).join(" · ") : "No predictions yet"}
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
              Object.values(allPredictions).reduce((acc, pred) => {
                if (!acc[pred.eventKey]) acc[pred.eventKey] = {};
                acc[pred.eventKey][pred.player] = pred;
                return acc;
              }, {})
            ).map(([evKey, preds]) => {
              const eventName = Object.values(preds)[0]?.meetingName || "Unknown GP";
              const scores = PLAYERS.filter(p => preds[p]).map(player => {
                const p = preds[player];
                const qPts = qualiResults.length  ? calcPoints(p.qualiPicks,  qualiResults,  "quali")  : "?";
                const sPts = (p.isSprint && sprintResults.length) ? calcPoints(p.sprintPicks, sprintResults, "sprint") : null;
                const rPts = raceResults.length   ? calcPoints(p.racePicks,   raceResults,   "race")   : "?";
                const total = (qPts==="?"?0:qPts)+(sPts||0)+(rPts==="?"?0:rPts);
                return { player, qPts, sPts, rPts, total, isSprint: p.isSprint };
              }).sort((a,b) => b.total-a.total);
              return (
                <div key={evKey} style={{ marginBottom:24, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)", borderRadius:10, overflow:"hidden" }}>
                  <div style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", justifyContent:"space-between" }}>
                    <div style={{ fontWeight:800, fontSize:16 }}>{eventName}</div>
                    <div style={{ fontSize:10, color:"#555", letterSpacing:"0.1em" }}>ROUND RESULTS</div>
                  </div>
                  <div style={{ padding:"8px 0" }}>
                    {scores.map(({ player, qPts, sPts, rPts, total, isSprint }, i) => (
                      <div key={player} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 16px" }}>
                        <div style={{ width:20, fontSize:12, fontWeight:700, color:"#555" }}>{i+1}</div>
                        <div style={{ flex:1, fontWeight:600, fontSize:14 }}>{player}</div>
                        <div style={{ fontSize:12, color:"#888" }}>Q: <span style={{ color:"#fff", fontWeight:700 }}>{qPts}</span></div>
                        {isSprint && sPts!==null && <div style={{ fontSize:12, color:"#ff8c00" }}>S: <span style={{ color:"#fff", fontWeight:700 }}>{sPts}</span></div>}
                        <div style={{ fontSize:12, color:"#888" }}>R: <span style={{ color:"#fff", fontWeight:700 }}>{rPts}</span></div>
                        <div className="pts-badge">{total}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

function DaySection({ day, dayColor, session, label, hint, last, children }) {
  return (
    <div style={{ marginBottom: last ? 28 : 16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
        <div style={{ background:`${dayColor}22`, border:`1px solid ${dayColor}55`, borderRadius:4, padding:"3px 10px", fontSize:10, fontWeight:800, letterSpacing:"0.18em", color:dayColor }}>{day}</div>
        <div style={{ flex:1, height:1, background:"rgba(255,255,255,.06)" }}/>
        {session && <div style={{ fontSize:10, color:"#555" }}>{session.meeting_name}</div>}
      </div>
      <div style={{ background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.07)", borderRadius:10, padding:16 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.15em", color:dayColor, marginBottom:4 }}>{label}</div>
        <div style={{ fontSize:11, color:"#555", marginBottom:14 }}>{hint}</div>
        {children}
      </div>
    </div>
  );
}

function PickRow({ pos, picks, setPicks, drivers }) {
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ fontSize:10, color:"#555", letterSpacing:"0.15em", marginBottom:4, fontWeight:700 }}>P{pos+1}</div>
      <DriverSelect drivers={drivers} value={picks[pos]} onChange={v => { const n=[...picks]; n[pos]=v; setPicks(n); }} placeholder={`Pick P${pos+1}…`}/>
    </div>
  );
}

function DriverSelect({ drivers, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState("");
  const ref             = useRef(null);

  const selected = drivers.find(d => d.name_acronym === value);
  const filtered  = drivers.filter(d => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (d.name_acronym||"").toLowerCase().includes(s)||(d.full_name||"").toLowerCase().includes(s);
  });

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <div className={`pick-slot${value?" filled":""}`} onClick={() => setOpen(o=>!o)}>
        {selected ? (<>
          <div className="team-bar" style={{ background:teamColor(selected.team_name||""), height:28 }}/>
          <div style={{ fontWeight:800, fontSize:13, color:teamColor(selected.team_name||"") }}>{selected.name_acronym}</div>
          <div style={{ fontSize:12, color:"#bbb", flex:1 }}>{selected.full_name}</div>
          <div style={{ fontSize:11, color:"#555" }}>{selected.team_name}</div>
        </>) : <span style={{ color:"#444", fontSize:13 }}>{placeholder}</span>}
        {value && <button onClick={e=>{e.stopPropagation();onChange("");}} style={{ background:"none", border:"none", color:"#555", cursor:"pointer", fontSize:14, marginLeft:"auto" }}>✕</button>}
      </div>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:100, background:"#111", border:"1px solid rgba(255,255,255,.12)", borderRadius:6, maxHeight:220, overflow:"auto", boxShadow:"0 8px 32px rgba(0,0,0,.6)" }}>
          <div style={{ padding:8, borderBottom:"1px solid rgba(255,255,255,.08)" }}>
            <input className="f1-input" placeholder="Search driver..." value={q} onChange={e=>setQ(e.target.value)} autoFocus/>
          </div>
          {filtered.length===0
            ? <div style={{ padding:"12px 16px", color:"#555", fontSize:12 }}>No drivers found</div>
            : filtered.map(d => (
              <div key={d.driver_number} onClick={()=>{onChange(d.name_acronym);setOpen(false);setQ("");}}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", cursor:"pointer", background:d.name_acronym===value?"rgba(225,6,0,.1)":"transparent" }}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.05)"}
                onMouseLeave={e=>e.currentTarget.style.background=d.name_acronym===value?"rgba(225,6,0,.1)":"transparent"}>
                <div className="team-bar" style={{ background:teamColor(d.team_name||"") }}/>
                <div style={{ fontWeight:800, fontSize:12, width:40, color:teamColor(d.team_name||"") }}>{d.name_acronym}</div>
                <div style={{ flex:1, fontSize:13 }}>{d.full_name}</div>
                <div style={{ fontSize:11, color:"#555" }}>{d.team_name}</div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}
