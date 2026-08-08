"use client";

import { useEffect, useMemo, useState } from "react";

type SectionId =
  | "command"
  | "roster"
  | "player"
  | "readiness"
  | "backs"
  | "competencies"
  | "training"
  | "selection"
  | "welfare"
  | "safeguarding"
  | "coach"
  | "academy"
  | "movement"
  | "skills"
  | "tactics"
  | "testing"
  | "video";

type Player = {
  id: number;
  name: string;
  initials: string;
  position: string;
  secondary: string;
  unit: "Forwards" | "Backs";
  selection: "Starter" | "Competing" | "Bench" | "Developing";
  availability: "Game eligible" | "Limited" | "Medical hold";
  completion: number;
  missing: string[];
  starterScore: number;
  attendance: number;
  rugbyAge: string;
  verified: number;
  total: number;
  next: string;
  stage: string;
  trend: string;
  tone: string;
};

const initialPlayers: Player[] = [
  {
    id: 1,
    name: "Malik Thompson",
    initials: "MT",
    position: "Tighthead Prop",
    secondary: "Loosehead Prop",
    unit: "Forwards",
    selection: "Competing",
    availability: "Game eligible",
    completion: 82,
    missing: ["Primary physician", "Latest body weight"],
    starterScore: 78,
    attendance: 91,
    rugbyAge: "3 seasons",
    verified: 24,
    total: 31,
    next: "Verify scrum Stage 7 with second-row support",
    stage: "Scrum Stage 6 verified",
    trend: "+8% this block",
    tone: "olive",
  },
  {
    id: 2,
    name: "Andre Jackson",
    initials: "AJ",
    position: "Fly-half",
    secondary: "Fullback",
    unit: "Backs",
    selection: "Starter",
    availability: "Game eligible",
    completion: 96,
    missing: ["Secondary emergency contact"],
    starterScore: 92,
    attendance: 94,
    rugbyAge: "6 seasons",
    verified: 28,
    total: 31,
    next: "Improve exit accuracy under chase pressure",
    stage: "Game Ready",
    trend: "+3% this block",
    tone: "gold",
  },
  {
    id: 3,
    name: "Darius Green",
    initials: "DG",
    position: "Hooker",
    secondary: "Flanker",
    unit: "Forwards",
    selection: "Starter",
    availability: "Game eligible",
    completion: 91,
    missing: ["Updated medication review"],
    starterScore: 88,
    attendance: 89,
    rugbyAge: "5 seasons",
    verified: 27,
    total: 31,
    next: "Raise lineout throw accuracy to 80%+",
    stage: "Front-row review current",
    trend: "+5% this block",
    tone: "forest",
  },
  {
    id: 4,
    name: "Isaiah Cole",
    initials: "IC",
    position: "Lock",
    secondary: "No. 8",
    unit: "Forwards",
    selection: "Bench",
    availability: "Medical hold",
    completion: 88,
    missing: ["Provider clearance document"],
    starterScore: 69,
    attendance: 86,
    rugbyAge: "4 seasons",
    verified: 23,
    total: 31,
    next: "Medical clearance before contact progression",
    stage: "Concussion protocol — Stage 3",
    trend: "Safety hold",
    tone: "red",
  },
  {
    id: 5,
    name: "Kofi Mensah",
    initials: "KM",
    position: "Openside Flanker",
    secondary: "No. 8",
    unit: "Forwards",
    selection: "Bench",
    availability: "Game eligible",
    completion: 84,
    missing: ["Player goals", "Match video consent"],
    starterScore: 81,
    attendance: 97,
    rugbyAge: "2 seasons",
    verified: 25,
    total: 31,
    next: "Make tackle-to-feet speed repeatable",
    stage: "Contact Ready",
    trend: "+11% this block",
    tone: "teal",
  },
  {
    id: 6,
    name: "Jamal Reed",
    initials: "JR",
    position: "Left Wing",
    secondary: "Outside Center",
    unit: "Backs",
    selection: "Starter",
    availability: "Game eligible",
    completion: 87,
    missing: ["Dominant-foot confirmation"],
    starterScore: 89,
    attendance: 90,
    rugbyAge: "3 seasons",
    verified: 26,
    total: 31,
    next: "Improve high-ball decision speed",
    stage: "Game Ready",
    trend: "+4% this block",
    tone: "blue",
  },
  {
    id: 7,
    name: "Elijah Carter",
    initials: "EC",
    position: "Scrum-half",
    secondary: "Wing",
    unit: "Backs",
    selection: "Developing",
    availability: "Limited",
    completion: 74,
    missing: ["Emergency contact", "Allergy review", "Player goals"],
    starterScore: 63,
    attendance: 82,
    rugbyAge: "1 season",
    verified: 19,
    total: 31,
    next: "Complete contact confidence progression",
    stage: "Tackle Stage 4",
    trend: "+9% this block",
    tone: "plum",
  },
  {
    id: 8,
    name: "Noah Brooks",
    initials: "NB",
    position: "Inside Center",
    secondary: "Fly-half",
    unit: "Backs",
    selection: "Competing",
    availability: "Game eligible",
    completion: 93,
    missing: [],
    starterScore: 84,
    attendance: 93,
    rugbyAge: "4 seasons",
    verified: 26,
    total: 31,
    next: "Create two clean line breaks in live play",
    stage: "Game Ready",
    trend: "+6% this block",
    tone: "rust",
  },
];

const navGroups: { label: string; items: { id: SectionId; label: string; short: string }[] }[] = [
  {
    label: "Run the team",
    items: [
      { id: "command", label: "Command Center", short: "CC" },
      { id: "roster", label: "Team Roster", short: "TR" },
      { id: "training", label: "Training Planner", short: "TP" },
      { id: "selection", label: "Match & Selection", short: "MS" },
    ],
  },
  {
    label: "Develop players",
    items: [
      { id: "player", label: "Player Development", short: "PD" },
      { id: "movement", label: "Movement Intelligence", short: "MI" },
      { id: "testing", label: "Testing & Conditioning", short: "TC" },
      { id: "skills", label: "Technical Skills", short: "TS" },
      { id: "tactics", label: "Rugby IQ & Tactics", short: "IQ" },
      { id: "video", label: "Video Review", short: "VR" },
      { id: "readiness", label: "Rugby Readiness", short: "RR" },
      { id: "backs", label: "Backs Rugby Ready", short: "BR" },
      { id: "competencies", label: "Competency Graph", short: "CG" },
      { id: "coach", label: "Coach Ready", short: "CR" },
    ],
  },
  {
    label: "Protect players",
    items: [
      { id: "welfare", label: "Player Welfare", short: "PW" },
      { id: "safeguarding", label: "Safeguarding", short: "SG" },
    ],
  },
  {
    label: "Build the future",
    items: [{ id: "academy", label: "DFW Academy", short: "DA" }],
  },
];

const sectionNames: Record<SectionId, string> = {
  command: "Command Center",
  roster: "Team Roster",
  player: "Player Development",
  readiness: "Rugby Readiness",
  backs: "Backs Rugby Ready",
  competencies: "Competency Graph",
  training: "Training Planner",
  selection: "Match & Selection",
  welfare: "Player Welfare",
  safeguarding: "Safeguarding & Athlete Welfare",
  coach: "Coach Ready",
  academy: "DFW Development Academy",
  movement: "Movement Intelligence",
  skills: "Technical Skills",
  tactics: "Rugby IQ & Tactics",
  testing: "Testing & Conditioning",
  video: "Video Review",
};

function badgeClass(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("medical") || normalized.includes("urgent")) return "badge badge-red";
  if (normalized.includes("limited") || normalized.includes("competing") || normalized.includes("pending")) return "badge badge-amber";
  if (normalized.includes("starter") || normalized.includes("eligible") || normalized.includes("complete")) return "badge badge-green";
  return "badge badge-neutral";
}

function Progress({ value, compact = false }: { value: number; compact?: boolean }) {
  return (
    <div className={compact ? "progress compact" : "progress"} aria-label={`${value}% complete`}>
      <span style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

function ScoreRing({ value, label }: { value: number; label: string }) {
  return (
    <div className="score-ring" style={{ "--score": `${value * 3.6}deg` } as React.CSSProperties}>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function AppMark() {
  return (
    <div className="app-mark" aria-hidden="true">
      <span>P</span>
    </div>
  );
}

export default function Home() {
  const [section, setSection] = useState<SectionId>("command");
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [selectedPlayerId, setSelectedPlayerId] = useState(1);
  const [rosterFilter, setRosterFilter] = useState("All players");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [competencyModal, setCompetencyModal] = useState(false);
  const [headInjuryModal, setHeadInjuryModal] = useState(false);
  const [concernModal, setConcernModal] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("pocketpt-rugby-demo-players");
    if (saved) {
      try {
        setPlayers(JSON.parse(saved));
      } catch {
        window.localStorage.removeItem("pocketpt-rugby-demo-players");
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("pocketpt-rugby-demo-players", JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCompetencyModal(false);
        setHeadInjuryModal(false);
        setConcernModal(false);
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const selectedPlayer = players.find((player) => player.id === selectedPlayerId) ?? players[0];

  const visiblePlayers = useMemo(() => {
    return players.filter((player) => {
      const matchesSearch = `${player.name} ${player.position} ${player.secondary}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesFilter =
        rosterFilter === "All players" ||
        (rosterFilter === "Game eligible" && player.availability === "Game eligible") ||
        (rosterFilter === "Needs action" && (player.missing.length > 0 || player.availability !== "Game eligible")) ||
        (rosterFilter === "Forwards" && player.unit === "Forwards") ||
        (rosterFilter === "Backs" && player.unit === "Backs");
      return matchesSearch && matchesFilter;
    });
  }, [players, rosterFilter, search]);

  function navigate(next: SectionId) {
    setSection(next);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openPlayer(id: number) {
    setSelectedPlayerId(id);
    navigate("player");
  }

  function acknowledgeCompetency() {
    setPlayers((current) =>
      current.map((player) =>
        player.id === selectedPlayer.id
          ? {
              ...player,
              verified: Math.min(player.verified + 1, player.total),
              starterScore: Math.min(player.starterScore + 2, 100),
              trend: "+10% this block",
            }
          : player,
      ),
    );
    setCompetencyModal(false);
    setToast(`Coach observation added to ${selectedPlayer.name}'s record.`);
  }

  function completeProfileItem(playerId: number) {
    setPlayers((current) =>
      current.map((player) =>
        player.id === playerId
          ? { ...player, missing: [], completion: 100 }
          : player,
      ),
    );
    setToast("Profile updated. The development record stayed available throughout.");
  }

  const pageContent = (() => {
    switch (section) {
      case "roster":
        return (
          <Roster
            players={visiblePlayers}
            filter={rosterFilter}
            setFilter={setRosterFilter}
            search={search}
            setSearch={setSearch}
            openPlayer={openPlayer}
          />
        );
      case "player":
        return (
          <PlayerDevelopment
            player={selectedPlayer}
            players={players}
            selectPlayer={setSelectedPlayerId}
            openCompetency={() => setCompetencyModal(true)}
            completeProfile={() => completeProfileItem(selectedPlayer.id)}
            navigate={navigate}
          />
        );
      case "readiness":
        return <RugbyReadiness players={players} openPlayer={openPlayer} navigate={navigate} />;
      case "backs":
        return <BacksRugbyReady players={players} />;
      case "movement":
        return <MovementIntelligence player={selectedPlayer} />;
      case "testing":
        return <TestingConditioning player={selectedPlayer} />;
      case "skills":
        return <TechnicalSkills player={selectedPlayer} />;
      case "tactics":
        return <TacticalIntelligence player={selectedPlayer} />;
      case "video":
        return <VideoReview player={selectedPlayer} />;
      case "competencies":
        return (
          <CompetencyGraph
            player={selectedPlayer}
            players={players}
            selectPlayer={setSelectedPlayerId}
            openCompetency={() => setCompetencyModal(true)}
          />
        );
      case "training":
        return <TrainingPlanner navigate={navigate} setToast={setToast} />;
      case "selection":
        return <Selection players={players} openPlayer={openPlayer} />;
      case "welfare":
        return <Welfare openHeadInjury={() => setHeadInjuryModal(true)} />;
      case "safeguarding":
        return <Safeguarding openConcern={() => setConcernModal(true)} />;
      case "coach":
        return <CoachReady />;
      case "academy":
        return <Academy />;
      default:
        return <CommandCenter navigate={navigate} openPlayer={openPlayer} />;
    }
  })();

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="brand-row">
          <AppMark />
          <div>
            <strong>POCKET PT</strong>
            <span>Rugby Coaching OS</span>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation">
            ×
          </button>
        </div>

        <div className="team-switcher">
          <div className="team-crest">15</div>
          <div>
            <strong>DFW Academy</strong>
            <span>Men's 15s · Preseason</span>
          </div>
          <span className="chevron">⌄</span>
        </div>

        <nav aria-label="Main navigation">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  className={section === item.id ? "active" : ""}
                  onClick={() => navigate(item.id)}
                >
                  <span className="nav-icon">{item.short}</span>
                  {item.label}
                  {item.id === "welfare" && <span className="nav-count red">3</span>}
                  {item.id === "safeguarding" && <span className="nav-count amber">1</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="alignment-note">
            <span className="alignment-dot" />
            <div>
              <strong>Independent system</strong>
              <span>USA Rugby-aligned workflow</span>
            </div>
          </div>
          <div className="coach-mini">
            <div className="avatar avatar-dark">RH</div>
            <div>
              <strong>Coach Rashad</strong>
              <span>Level 1 · in-person pending</span>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && <button className="scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}

      <main className="main-panel">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
            <span />
            <span />
            <span />
          </button>
          <div className="breadcrumb">
            <span>Rugby Coaching</span>
            <b>/</b>
            <strong>{sectionNames[section]}</strong>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Search" onClick={() => navigate("roster")}>
              ⌕
            </button>
            <button className="notification-button" aria-label="Notifications">
              <span className="notification-dot" />
              3
            </button>
            <button className="quick-add" onClick={() => setCompetencyModal(true)}>
              <span>＋</span> Log observation
            </button>
          </div>
        </header>

        <div className="content-wrap">{pageContent}</div>
      </main>

      {competencyModal && (
        <Modal title="Coach competency acknowledgment" eyebrow="Internal team record" close={() => setCompetencyModal(false)}>
          <div className="modal-player">
            <div className={`avatar ${selectedPlayer.tone}`}>{selectedPlayer.initials}</div>
            <div>
              <strong>{selectedPlayer.name}</strong>
              <span>{selectedPlayer.position} · {selectedPlayer.stage}</span>
            </div>
          </div>
          <label className="field-label">
            Competency observed
            <select defaultValue="Scrum — second-row support">
              <option>Scrum — second-row support</option>
              <option>Tackle — safe head placement</option>
              <option>Ruck — legal gate entry</option>
              <option>Lineout — coordinated lift</option>
              <option>Game understanding — role execution</option>
            </select>
          </label>
          <div className="field-grid">
            <label className="field-label">
              Environment
              <select defaultValue="Camp assessment">
                <option>Camp assessment</option>
                <option>Controlled training</option>
                <option>Scrimmage</option>
                <option>Match</option>
              </select>
            </label>
            <label className="field-label">
              Result
              <select defaultValue="Demonstrated independently">
                <option>Demonstrated independently</option>
                <option>Demonstrated with prompts</option>
                <option>Needs another observation</option>
              </select>
            </label>
          </div>
          <label className="field-label">
            Factual coaching note
            <textarea defaultValue="Maintained a long spine, stable bind and square hips through three controlled repetitions." />
          </label>
          <div className="scope-note">
            This earns a Pocket PT coach acknowledgment. It is not a USA Rugby or World Rugby credential, medical clearance, or competition authorization.
          </div>
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setCompetencyModal(false)}>Cancel</button>
            <button className="button primary" onClick={acknowledgeCompetency}>Acknowledge competency</button>
          </div>
        </Modal>
      )}

      {headInjuryModal && (
        <Modal title="Possible head injury" eyebrow="Recognize · Remove · Refer" close={() => setHeadInjuryModal(false)} danger>
          <div className="emergency-rule">
            <strong>Any suspicion means removal.</strong>
            <span>The coach cannot override a concussion restriction.</span>
          </div>
          <label className="field-label">
            Player
            <select defaultValue="Isaiah Cole">
              <option disabled>Select player</option>
              {players.map((player) => <option key={player.id}>{player.name}</option>)}
            </select>
          </label>
          <div className="check-grid">
            {["Slow to get up", "Balance problem", "Confusion", "Blank stare", "Headache", "Neck pain"].map((item) => (
              <label key={item}><input type="checkbox" /> {item}</label>
            ))}
          </div>
          <label className="danger-check"><input type="checkbox" /> Red flag or immediate emergency concern</label>
          <div className="scope-note red-note">
            This workflow records recognition and removal; it does not diagnose concussion. Follow the approved emergency plan and qualified medical guidance.
          </div>
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setHeadInjuryModal(false)}>Cancel</button>
            <button className="button danger" onClick={() => { setHeadInjuryModal(false); setToast("Player status set to REMOVED — medical evaluation required."); }}>Record & remove player</button>
          </div>
        </Modal>
      )}

      {concernModal && (
        <Modal title="Report a safeguarding concern" eyebrow="Restricted record" close={() => setConcernModal(false)}>
          <div className="listen-rule">
            <strong>Record. Route. Do not investigate.</strong>
            <span>Write what you saw, heard, or were told. Separate facts from assumptions.</span>
          </div>
          <label className="danger-check"><input type="checkbox" /> Someone may be in immediate danger</label>
          <div className="field-grid">
            <label className="field-label">Source<select><option>Direct disclosure</option><option>Observed behavior</option><option>Parent concern</option><option>Welfare observation</option></select></label>
            <label className="field-label">Routing category<select><option>Unknown — officer review</option><option>Poor practice</option><option>Boundary concern</option><option>Health and safety</option><option>Possible abuse</option></select></label>
          </div>
          <label className="field-label">
            Factual record
            <textarea placeholder="Record exact words when relevant. Do not ask investigative questions." />
          </label>
          <div className="scope-note">
            The designated safeguarding officer receives this record. Normal team dashboards do not display its narrative.
          </div>
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setConcernModal(false)}>Cancel</button>
            <button className="button primary" onClick={() => { setConcernModal(false); setToast("Restricted concern recorded and safeguarding officer notification queued."); }}>Submit restricted report</button>
          </div>
        </Modal>
      )}

      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </div>
  );
}

function CommandCenter({ navigate, openPlayer }: { navigate: (section: SectionId) => void; openPlayer: (id: number) => void }) {
  return (
    <div className="page-stack">
      <section className="command-hero">
        <div className="hero-copy">
          <div className="eyebrow-row"><span className="live-dot" /> Friday, August 7 · Preseason Week 3</div>
          <h1>Every player knows where they stand—and what earns the next shirt.</h1>
          <p>One coaching record for readiness, development, selection, welfare and the next best action.</p>
          <div className="hero-actions">
            <button className="button light" onClick={() => navigate("selection")}>Review starting XV <span>→</span></button>
            <button className="text-button light-text" onClick={() => navigate("training")}>Open tonight's plan</button>
          </div>
        </div>
        <div className="coach-readiness-card">
          <div className="card-head-light">
            <span>YOUR COACH PATHWAY</span>
            <span className="micro-pill">5 / 5 online</span>
          </div>
          <div className="pathway-mark"><span>01</span><div><strong>World Rugby Level 1</strong><small>Online prerequisites complete</small></div></div>
          <div className="next-step-row">
            <div><span>Only remaining step</span><strong>In-person course</strong></div>
            <button onClick={() => navigate("coach")}>View readiness →</button>
          </div>
        </div>
      </section>

      <section className="priority-strip">
        <div className="priority-label"><span>COACH<br />PRIORITIES</span><strong>5 actions</strong></div>
        <button className="priority-item red-priority" onClick={() => navigate("welfare")}>
          <span className="priority-icon">!</span>
          <div><strong>1 medical hold</strong><small>Contact participation locked</small></div>
          <b>→</b>
        </button>
        <button className="priority-item amber-priority" onClick={() => navigate("safeguarding")}>
          <span className="priority-icon">24</span>
          <div><strong>Restricted organizational action</strong><small>Authorized role review due</small></div>
          <b>→</b>
        </button>
        <button className="priority-item" onClick={() => navigate("roster")}>
          <span className="priority-icon">7</span>
          <div><strong>Profiles need details</strong><small>Does not block app progress</small></div>
          <b>→</b>
        </button>
      </section>

      <section className="metrics-grid">
        <Metric label="Active players" value="22" detail="15 forwards · 7 backs" tone="green" />
        <Metric label="Game eligible" value="18" detail="82% of active roster" tone="gold" />
        <Metric label="Starter-ready" value="11" detail="4 positions contested" tone="blue" />
        <Metric label="Competencies this week" value="37" detail="↑ 12 from last week" tone="purple" />
      </section>

      <section className="dashboard-grid">
        <div className="panel span-two">
          <div className="panel-title-row">
            <div><span className="section-kicker">Selection clarity</span><h2>Starting XV readiness</h2></div>
            <button className="text-button" onClick={() => navigate("selection")}>Full depth chart →</button>
          </div>
          <div className="lineup-summary">
            <div className="lineup-score"><strong>11</strong><span>roles ready</span></div>
            <div className="lineup-progress"><div><span>15-player match unit</span><b>73%</b></div><Progress value={73} /></div>
            <div className="lineup-legend"><span><i className="dot ready" />Ready</span><span><i className="dot contested" />Contested</span><span><i className="dot hold" />Hold</span></div>
          </div>
          <div className="position-row">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"].map((position, index) => (
              <button key={position} className={`position-chip ${index === 3 ? "hold" : index === 2 || index === 6 || index === 11 || index === 13 ? "contested" : "ready"}`} aria-label={`Position ${position}`}>
                <span>{position}</span><small>{["PR", "HK", "PR", "LK", "LK", "FL", "FL", "N8", "SH", "FH", "WG", "CT", "CT", "WG", "FB"][index]}</small>
              </button>
            ))}
          </div>
          <div className="selection-callout"><span className="callout-mark">!</span><div><strong>Lock position requires a decision.</strong><p>Isaiah Cole remains on a medical hold. The next eligible player is Aaron Bell at 74% starter readiness.</p></div><button onClick={() => navigate("selection")}>Resolve</button></div>
        </div>

        <div className="panel">
          <div className="panel-title-row"><div><span className="section-kicker">Tonight · 6:30 PM</span><h2>Training focus</h2></div><span className="duration-pill">90 min</span></div>
          <div className="session-intent"><span>SESSION INTENT</span><strong>Win the first two phases</strong><p>Safe contact height, fast ruck arrival and clear exit roles.</p></div>
          <ol className="session-list">
            <li><span>12</span><div><strong>Activate & movement prep</strong><small>Team · RPE 3</small></div></li>
            <li><span>18</span><div><strong>Tackle technique groups</strong><small>3 competency stations</small></div></li>
            <li><span>24</span><div><strong>2-phase launch</strong><small>Forwards / backs split</small></div></li>
            <li><span>20</span><div><strong>Conditioned 8v8</strong><small>Contact load: moderate</small></div></li>
          </ol>
          <button className="button block secondary" onClick={() => navigate("training")}>Open session plan</button>
        </div>

        <div className="panel span-two">
          <div className="panel-title-row"><div><span className="section-kicker">Development movement</span><h2>Players closest to the next level</h2></div><button className="text-button" onClick={() => navigate("roster")}>View roster →</button></div>
          <div className="player-progress-list">
            <ProgressPlayer initials="MT" tone="olive" name="Malik Thompson" role="Tighthead Prop" target="Scrum Stage 7" value={78} detail="1 observation needed" onClick={() => openPlayer(1)} />
            <ProgressPlayer initials="KM" tone="teal" name="Kofi Mensah" role="Openside Flanker" target="Selection Evidence" value={81} detail="Live tackle repeat needed" onClick={() => openPlayer(5)} />
            <ProgressPlayer initials="NB" tone="rust" name="Noah Brooks" role="Inside Center" target="Selection Evidence" value={84} detail="Match evidence needed" onClick={() => openPlayer(8)} />
          </div>
        </div>

        <div className="panel rules-panel">
          <span className="section-kicker">System rule</span>
          <h2>Progress stays open. Safety locks participation.</h2>
          <div className="rule-comparison">
            <div><span className="rule-icon optional">○</span><p><strong>Incomplete profile detail</strong><small>Flag it. Keep coaching. Complete later.</small></p></div>
            <div><span className="rule-icon required">×</span><p><strong>Medical or safeguarding hold</strong><small>Lock the affected action. Never bypass it.</small></p></div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return <article className={`metric-card ${tone}`}><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><div className="mini-chart"><i /><i /><i /><i /><i /></div></article>;
}

function ProgressPlayer({ initials, tone, name, role, target, value, detail, onClick }: { initials: string; tone: string; name: string; role: string; target: string; value: number; detail: string; onClick: () => void }) {
  return <button className="progress-player" onClick={onClick}><div className={`avatar ${tone}`}>{initials}</div><div className="progress-person"><strong>{name}</strong><span>{role}</span></div><div className="progress-target"><span>NEXT</span><strong>{target}</strong></div><div className="progress-value"><div><b>{value}%</b><span>{detail}</span></div><Progress value={value} compact /></div><b className="row-arrow">→</b></button>;
}

function Roster({ players, filter, setFilter, search, setSearch, openPlayer }: { players: Player[]; filter: string; setFilter: (value: string) => void; search: string; setSearch: (value: string) => void; openPlayer: (id: number) => void }) {
  const filters = ["All players", "Game eligible", "Needs action", "Forwards", "Backs"];
  return <div className="page-stack">
    <PageHeading eyebrow="22 active players · 15s roster" title="Know the whole player—not just the shirt number." description="Search the roster, see availability and selection status, and open the exact development record behind every decision." action="＋ Add player" />
    <div className="roster-tools panel">
      <label className="search-field"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search player or position" /></label>
      <div className="filter-tabs">{filters.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>
    </div>
    <div className="roster-summary">
      <span><i className="dot ready" /> 18 game eligible</span><span><i className="dot contested" /> 3 limited</span><span><i className="dot hold" /> 1 medical hold</span><span className="summary-note">Profile gaps are visible but do not block coaching workflows.</span>
    </div>
    <section className="roster-table panel">
      <div className="table-head"><span>Player</span><span>Selection</span><span>Availability</span><span>Profile</span><span>Starter ready</span><span>Next action</span><span /></div>
      {players.length ? players.map((player) => <button className="table-row" key={player.id} onClick={() => openPlayer(player.id)}>
        <span className="player-cell"><span className={`avatar ${player.tone}`}>{player.initials}</span><span><strong>{player.name}</strong><small>{player.position} · {player.rugbyAge}</small></span></span>
        <span><i className={badgeClass(player.selection)}>{player.selection}</i></span>
        <span><i className={badgeClass(player.availability)}>{player.availability}</i></span>
        <span className="completion-cell"><b>{player.completion}%</b><Progress value={player.completion} compact />{player.missing.length > 0 && <small>{player.missing.length} needs completion</small>}</span>
        <span className="starter-cell"><b>{player.starterScore}</b><small>{player.trend}</small></span>
        <span className="next-cell">{player.next}</span>
        <span className="row-arrow">→</span>
      </button>) : <div className="empty-state"><strong>No players match that view.</strong><span>Try a different name or filter.</span></div>}
    </section>
  </div>;
}

function PlayerDevelopment({ player, players, selectPlayer, openCompetency, completeProfile, navigate }: { player: Player; players: Player[]; selectPlayer: (id: number) => void; openCompetency: () => void; completeProfile: () => void; navigate: (section: SectionId) => void }) {
  return <div className="page-stack">
    <div className="player-heading">
      <div className="player-identity"><div className={`avatar avatar-xl ${player.tone}`}>{player.initials}</div><div><div className="eyebrow-row">PLAYER DEVELOPMENT RECORD</div><h1>{player.name}</h1><p>{player.position} · Secondary: {player.secondary} · {player.rugbyAge}</p><div className="identity-badges"><i className={badgeClass(player.selection)}>{player.selection}</i><i className={badgeClass(player.availability)}>{player.availability}</i></div></div></div>
      <div className="player-switch"><label>Switch player<select value={player.id} onChange={(e) => selectPlayer(Number(e.target.value))}>{players.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><button className="button primary" onClick={openCompetency}>＋ Log observation</button></div>
    </div>

    <section className="status-banner">
      <ScoreRing value={player.starterScore} label="selection evidence" />
      <div className="status-copy"><span>CURRENT SELECTION STATUS</span><h2>{player.selection === "Starter" ? "Starter — role expectations met" : player.selection === "Competing" ? "Competing for the starting shirt" : `${player.selection} — development path active`}</h2><p>{player.availability === "Medical hold" ? "Health restriction overrides selection. No coach bypass is available." : `The coach has defined the evidence needed for the next status. ${player.next}.`}</p></div>
      <div className="status-reasons"><span>WHY THIS STATUS</span><ul><li className="met">{player.verified} of {player.total} competencies verified</li><li className="met">{player.attendance}% training availability</li><li className="open">1 live-pressure observation needed</li></ul></div>
    </section>

    <section className="player-layout">
      <div className="player-main">
        <div className="panel">
          <div className="panel-title-row"><div><span className="section-kicker">Transparent pathway</span><h2>What earns the next shirt</h2></div><span className="micro-pill dark">Updated today</span></div>
          <div className="next-actions">
            <div className="next-action primary-action"><span className="action-number">01</span><div><strong>{player.next}</strong><p>Coach observes in a controlled camp or scrimmage environment.</p></div><i>Highest impact</i></div>
            <div className="next-action"><span className="action-number">02</span><div><strong>Repeat skill under game-speed fatigue</strong><p>Maintain technique across three consecutive phases.</p></div><i>Evidence needed</i></div>
            <div className="next-action"><span className="action-number">03</span><div><strong>Own the communication call</strong><p>Make the correct call before the coach supplies it.</p></div><i>Developing</i></div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title-row"><div><span className="section-kicker">Readiness domains</span><h2>Independent, earned competencies</h2></div><button className="text-button" onClick={() => navigate("competencies")}>See dependency graph →</button></div>
          <div className="competency-grid">
            <Competency label="Movement Ready" value={92} state="Verified" detail="7 / 7" />
            <Competency label="Contact Ready" value={86} state="Verified" detail="6 / 6" />
            <Competency label="Tackle Ready" value={82} state="Verified" detail="5 / 5" />
            <Competency label="Ruck Ready" value={76} state="Verified" detail="4 / 4" />
            <Competency label="Scrum Ready" value={64} state="In progress" detail="6 / 10" />
            <Competency label="Game Ready" value={78} state="In progress" detail="3 / 5" />
          </div>
        </div>

        <div className="panel">
          <div className="panel-title-row"><div><span className="section-kicker">Evidence history</span><h2>Coach observation timeline</h2></div><button className="button small secondary" onClick={openCompetency}>Add evidence</button></div>
          <div className="timeline">
            <Timeline date="Aug 6" title="Scrum Stage 6 acknowledged" text="Stable long spine and square hips with prop support across three repetitions." meta="Coach Rashad · Camp assessment · Video attached" />
            <Timeline date="Aug 4" title="Tackle Ready renewed" text="Safe head placement, complete wrap and leg drive maintained in controlled live contact." meta="Coach Rashad · Training · 4 clips" />
            <Timeline date="Jul 30" title="Development plan updated" text="Scrum progression moved ahead of conditioning as the highest-impact readiness dependency." meta="System recommendation · Coach approved" />
          </div>
        </div>
      </div>

      <aside className="player-aside">
        <div className="panel profile-card">
          <div className="panel-title-row"><div><span className="section-kicker">Player record</span><h2>Profile completion</h2></div><strong>{player.completion}%</strong></div>
          <Progress value={player.completion} />
          {player.missing.length > 0 ? <><p>Keep using the system. These details remain visible until completed:</p><ul>{player.missing.map((item) => <li key={item}><span>○</span>{item}</li>)}</ul><button className="button block secondary" onClick={completeProfile}>Complete demo fields</button></> : <div className="complete-message">✓ All current profile fields are complete.</div>}
        </div>
        <div className="panel availability-card"><span className="section-kicker">Participation</span><h2>{player.availability}</h2><div className={`availability-light ${player.availability === "Medical hold" ? "stop" : player.availability === "Limited" ? "caution" : "go"}`}><span /><strong>{player.availability === "Medical hold" ? "No contact" : player.availability === "Limited" ? "Modified training" : "Full training"}</strong></div><dl><div><dt>Medical restriction</dt><dd>{player.availability === "Medical hold" ? "Active" : "None"}</dd></div><div><dt>Concussion status</dt><dd>{player.availability === "Medical hold" ? "Protocol" : "Clear"}</dd></div><div><dt>Front-row status</dt><dd>{player.position.includes("Prop") || player.position === "Hooker" ? "Coach review current" : "Not applicable"}</dd></div></dl></div>
        <div className="panel internal-note"><span className="section-kicker">Credential boundary</span><p>Pocket PT competencies are internal coach acknowledgments. Official registration, medical clearance, front-row eligibility and governing-body accreditation remain separate.</p></div>
      </aside>
    </section>
  </div>;
}

function Competency({ label, value, state, detail }: { label: string; value: number; state: string; detail: string }) {
  return <div className="competency-card"><div className="competency-top"><strong>{label}</strong><i className={state === "Verified" ? "badge badge-green" : "badge badge-amber"}>{state}</i></div><div className="competency-score"><span>{value}</span><small>/ 100</small><b>{detail}</b></div><Progress value={value} compact /></div>;
}

function RugbyReadiness({ players, openPlayer, navigate }: { players: Player[]; openPlayer: (id: number) => void; navigate: (section: SectionId) => void }) {
  const domains = [
    { name: "Movement Ready", ready: 19, total: 22, value: 86, tone: "green" },
    { name: "Conditioning Ready", ready: 16, total: 22, value: 73, tone: "blue" },
    { name: "Contact Ready", ready: 17, total: 22, value: 77, tone: "gold" },
    { name: "Tackle Ready", ready: 18, total: 22, value: 82, tone: "green" },
    { name: "Ruck Ready", ready: 16, total: 22, value: 73, tone: "blue" },
    { name: "Maul Ready", ready: 14, total: 22, value: 64, tone: "gold" },
    { name: "Lineout Ready", ready: 9, total: 13, value: 69, tone: "blue" },
    { name: "Scrum Ready", ready: 6, total: 8, value: 75, tone: "green" },
  ];

  return <div className="page-stack">
    <PageHeading eyebrow="Competency—not attendance" title="Readiness is earned one domain at a time." description="A player can be ready for movement, tackling or rucking without being cleared for every rugby demand. Each result shows its evidence, expiry and next prerequisite." action="Open competency graph" onAction={() => navigate("competencies")} />
    <section className="readiness-rule-bar"><div><span className="rule-shield">R</span><p><strong>No single magic readiness score</strong><small>Domains remain independent so one strength cannot hide one unsafe gap.</small></p></div><div><span className="rule-shield amber">!</span><p><strong>Safety restrictions win</strong><small>Concussion, medical, front-row and event-welfare holds lock the affected participation.</small></p></div><div><span className="rule-shield light">○</span><p><strong>Profile gaps stay visible</strong><small>Non-safety details can be completed later without trapping the coach or player.</small></p></div></section>
    <section className="readiness-domain-grid">
      {domains.map((domain) => <article className={`readiness-domain ${domain.tone}`} key={domain.name}><div className="readiness-domain-head"><span>{domain.name}</span><strong>{domain.ready}<small> / {domain.total}</small></strong></div><Progress value={domain.value} /><div><small>Team verified</small><b>{domain.value}%</b></div></article>)}
    </section>
    <section className="readiness-layout">
      <div className="panel readiness-matrix"><div className="panel-title-row"><div><span className="section-kicker">Coach decision view</span><h2>Who can safely do what today?</h2></div><span className="badge badge-neutral">Sample roster</span></div><div className="readiness-table-head"><span>Player</span><span>Move</span><span>Contact</span><span>Tackle</span><span>Ruck</span><span>Scrum</span><span>Game</span><span /></div>{players.slice(0, 7).map((player, index) => <button className="readiness-row" key={player.id} onClick={() => openPlayer(player.id)}><span className="player-cell"><span className={`avatar ${player.tone}`}>{player.initials}</span><span><strong>{player.name}</strong><small>{player.position}</small></span></span>{[0, 1, 2, 3, 4, 5].map((cell) => { const hold = player.availability === "Medical hold"; const pending = (index + cell) % 5 === 0 || (cell === 4 && !player.position.includes("Prop") && player.position !== "Hooker"); const label = hold && cell > 0 ? "×" : pending ? "·" : "✓"; return <span key={cell} className={`matrix-state ${hold && cell > 0 ? "hold" : pending ? "pending" : "ready"}`}>{label}</span>; })}<span className="row-arrow">→</span></button>)}</div>
      <aside className="readiness-aside">
        <div className="panel"><span className="section-kicker">Participation locks</span><h2>Four hard boundaries</h2><div className="hard-lock-list"><div><span>01</span><p><strong>Medical restriction</strong><small>Coach cannot override.</small></p></div><div><span>02</span><p><strong>Concussion protocol</strong><small>Removal and qualified clearance pathway.</small></p></div><div><span>03</span><p><strong>Front-row eligibility</strong><small>Competition and governing-body rules apply.</small></p></div><div><span>04</span><p><strong>Event safeguarding</strong><small>Required controls and escalation pathway.</small></p></div></div></div>
        <div className="panel readiness-boundary"><span className="section-kicker">Name protection</span><h3>Pocket PT Rugby Readiness</h3><p>This is an internal team-development record. World Rugby's RugbyReady course and all USA Rugby credentials remain official external requirements.</p></div>
      </aside>
    </section>
  </div>;
}


function BacksRugbyReady({ players }: { players: Player[] }) {
  const backs = players.filter((player) => player.unit === "Backs");
  const [playerId, setPlayerId] = useState(backs[0]?.id ?? players[0].id);
  const player = players.find((item) => item.id === playerId) ?? backs[0] ?? players[0];
  const [scores, setScores] = useState({ defense: 82, tackle: 76, attack: 85, ball: 88, movement: 84, role: 87 });
  const [athletic, setAthletic] = useState({ speed: 91, agility: 86, repeat: 82, endurance: 78, power: 81, strength: 72 });
  const [note, setNote] = useState("Holds defensive connection well. Reassess edge tackle tracking under game-speed pressure.");
  const [evidenceType, setEvidenceType] = useState("Scrimmage");
  const [evidenceCount, setEvidenceCount] = useState(7);
  const skillRating = Math.round(scores.defense * .20 + scores.tackle * .15 + scores.attack * .20 + scores.ball * .15 + scores.movement * .15 + scores.role * .15);
  const athleticIndex = Math.round(athletic.speed * .25 + athletic.agility * .25 + athletic.repeat * .20 + athletic.endurance * .15 + athletic.power * .10 + athletic.strength * .05);
  const gateFailed = scores.tackle < 70;
  const starterEligible = !gateFailed && skillRating >= 80 && player.availability === "Game eligible";
  const readinessLabel = gateFailed ? "Not starter eligible" : starterEligible ? "Starter eligible" : skillRating >= 70 ? "Match ready / rotation" : skillRating >= 60 ? "Developmental" : "Not yet backline ready";
  const band = skillRating >= 90 ? "Impact starter / elite" : skillRating >= 80 ? "Clear starter-ready" : skillRating >= 70 ? "Match-ready / rotation" : skillRating >= 60 ? "Developmental" : "Not yet rugby-ready";
  const updateScore = (key: keyof typeof scores, value: number) => setScores((current) => ({ ...current, [key]: Math.max(1, Math.min(99, value || 1)) }));
  const updateAthletic = (key: keyof typeof athletic, value: number) => setAthletic((current) => ({ ...current, [key]: Math.max(1, Math.min(99, value || 1)) }));
  const roleRows: Record<string, string[]> = {
    "Fly-half": ["Game management", "Passing range", "Tactical kicking", "Defensive bravery", "Backline communication"],
    "Inside Centre": ["Hard-line threat", "Second playmaker", "Defensive control", "Contact skill", "Pressure decisions"],
    "Outside Centre": ["Defensive reads", "Edge connection", "Outside break", "Wing distribution", "Transition speed"],
    "Wing": ["Finishing", "Touchline awareness", "High ball", "Kick chase", "Last-pass support"],
    "Fullback": ["Backfield organization", "High-ball security", "Counterattack", "Last-line tackling", "Communication"],
  };
  const roleKey = player.position.includes("Fly") ? "Fly-half" : player.position.includes("Inside") || player.position === "12" ? "Inside Centre" : player.position.includes("Outside") || player.position === "13" ? "Outside Centre" : player.position.includes("Wing") ? "Wing" : player.position.includes("Fullback") ? "Fullback" : "Fly-half";
  const roleSkills = roleRows[roleKey];
  const logEvidence = () => {
    setEvidenceCount((count) => count + 1);
    setNote("Evidence saved. Coach should reassess the same competency under equal or greater pressure before upgrading the pathway.");
  };
  return <div className="page-stack backs-ready-page">
    <PageHeading eyebrow="Space · decisions · tackle-in-space · role IQ" title="Backs Rugby Ready" description="The backline equivalent of pack readiness. Judge 10–15 players on how they defend space, attack with and without the ball, communicate, tackle safely in space and execute their role under pressure." action="＋ Log backs evidence" onAction={logEvidence} />
    <section className="readiness-rule-bar"><div><span className="rule-shield">B</span><p><strong>Skill/IQ and athleticism stay separate</strong><small>Speed cannot hide poor decisions or unsafe tackling.</small></p></div><div><span className="rule-shield amber">!</span><p><strong>Tackling in space is a hard gate</strong><small>Below 70 prevents starter eligibility regardless of total score.</small></p></div><div><span className="rule-shield light">○</span><p><strong>Evidence earns the rating</strong><small>Drill → scrimmage → match/video, with coach notes and confidence.</small></p></div></section>

    <section className="backs-hero-grid">
      <div className="panel backs-score-card">
        <div className="panel-title-row"><div><span className="section-kicker">Universal backs card</span><h2>{player.name}</h2><p>{player.position} · Secondary: {player.secondary}</p></div><label className="backs-player-select">Player<select value={player.id} onChange={(e) => setPlayerId(Number(e.target.value))}>{backs.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.position}</option>)}</select></label></div>
        <div className="backs-score-summary"><ScoreRing value={skillRating} label="Backline Skill / IQ" /><div><span className="section-kicker">Current band</span><h2>{band}</h2><p>{readinessLabel}</p><div className="identity-badges"><i className={starterEligible ? "badge badge-green" : gateFailed ? "badge badge-red" : "badge badge-amber"}>{starterEligible ? "Starter eligible" : gateFailed ? "Hard gate active" : "Development pathway"}</i><i className={badgeClass(player.availability)}>{player.availability}</i></div></div><div className="athletic-mini"><span>ATHLETIC INDEX</span><strong>{athleticIndex}</strong><small>Separate performance card</small></div></div>
        {gateFailed && <div className="boundary-note danger-note"><strong>Starter eligibility locked</strong><p>Tackling in space is {scores.tackle}/99. Safe tracking, connection, wrap, finish and recovery must reach the program minimum before starter status can be earned.</p></div>}
      </div>
      <aside className="panel backs-path-card"><span className="section-kicker">Backline readiness pathway</span><h2>What a back must prove</h2><div className="vertical-path compact-path"><PathStep n="01" title="Space & alignment" state="done"/><PathStep n="02" title="Track + tackle in space" state={scores.tackle >= 70 ? "done" : "current"}/><PathStep n="03" title="Attack without ball" state="done"/><PathStep n="04" title="Attack with ball" state="done"/><PathStep n="05" title="Role-specific execution" state="current"/><PathStep n="06" title="Repeat under live pressure" state="next"/><PathStep n="07" title="Match evidence" state="next"/></div></aside>
    </section>

    <section className="panel">
      <div className="panel-title-row"><div><span className="section-kicker">Backline Skill / IQ Rating</span><h2>Six visible categories · 1–99</h2></div><span className="badge badge-neutral">Weighted total {skillRating}</span></div>
      <div className="backs-rating-grid">
        {([
          ["defense", "Defensive IQ", "20%", "Alignment, spacing, numbering, drift/press, edge and backfield communication"],
          ["tackle", "Tackling in Space", "15%", "Tracking, footwork, head placement, shoulder connection, wrap, finish, recovery"],
          ["attack", "Attack IQ", "20%", "Scanning, depth, timing, decisions and exploitation of space"],
          ["ball", "Ball Skills", "15%", "Catch-pass, both hands, receive under pressure, offload and continuity decisions"],
          ["movement", "Movement & Evasion", "15%", "Footwork, acceleration, angle change and defender manipulation"],
          ["role", "Role-Specific Skill", "15%", `${roleKey}: ${roleSkills.join(", ")}`],
        ] as const).map(([key, label, weight, detail]) => <div className={`backs-rating-row ${key === "tackle" && scores.tackle < 70 ? "rating-alert" : ""}`} key={key}><div><strong>{label}</strong><small>{detail}</small></div><span>{weight}</span><input aria-label={`${label} score`} type="number" min="1" max="99" value={scores[key]} onChange={(e) => updateScore(key, Number(e.target.value))}/><Progress value={scores[key]} compact /></div>)}
      </div>
    </section>

    <section className="backs-three-grid">
      <div className="panel"><span className="section-kicker">Defense without compromise</span><h2>Defensive IQ</h2><ul className="data-list"><li><b>Alignment</b><span>Connected to ball position and threat</span></li><li><b>Numbering up</b><span>Identifies own, inside and outside threats</span></li><li><b>Spacing</b><span>No avoidable doglegs or soft seams</span></li><li><b>Inside shoulder</b><span>Protects inside before chasing width</span></li><li><b>Drift vs press</b><span>Decision matches numbers and space</span></li><li><b>Backfield</b><span>Wing / 15 rotation covers kick space</span></li><li><b>Reload</b><span>Reconnects immediately after tackle/ruck</span></li><li><b>Communication</b><span>Calls numbers, threats and reloads</span></li></ul></div>
      <div className="panel"><span className="section-kicker">Offense without the ball</span><h2>You are graded before the pass.</h2><ul className="data-list"><li><b>Depth</b><span>Creates time and attacking options</span></li><li><b>Width</b><span>Stretches defenders without disconnecting</span></li><li><b>Timing</b><span>Arrives onto ball at pace</span></li><li><b>Running lines</b><span>Straighten, unders, overs, arcs, switches</span></li><li><b>Decoy work</b><span>Sells a credible threat</span></li><li><b>Support</b><span>Tracks inside / outside shoulder</span></li><li><b>Reload</b><span>Returns to attacking shape</span></li><li><b>Communication</b><span>Calls ball, space and mismatch</span></li></ul></div>
      <div className="panel"><span className="section-kicker">Offense with the ball</span><h2>Decision + execution</h2><ul className="data-list"><li><b>Catch quality</b><span>Hands up, early catch, moves onto ball</span></li><li><b>Pass both ways</b><span>Short / long accuracy left and right</span></li><li><b>Commit defender</b><span>Squares and fixes before release</span></li><li><b>Decision</b><span>Pass, carry, kick, offload or reset</span></li><li><b>Evasion</b><span>Step, swerve, acceleration, angle</span></li><li><b>Contact choice</b><span>Avoids unnecessary collision</span></li><li><b>Presentation</b><span>Fast clean ball when tackled</span></li><li><b>Continuity</b><span>Keeps attack alive without forcing it</span></li></ul></div>
    </section>

    <section className="backs-two-grid">
      <div className="panel"><div className="panel-title-row"><div><span className="section-kicker">Position overlay</span><h2>{roleKey}</h2></div><span className="badge badge-blue">15% of Skill / IQ</span></div><div className="role-overlay-list">{roleSkills.map((skill, index) => <div key={skill}><span>{String(index + 1).padStart(2, "0")}</span><strong>{skill}</strong><small>{index < 3 ? "Observe in phase play + match film" : "Verify under live pressure"}</small></div>)}</div></div>
      <div className="panel"><div className="panel-title-row"><div><span className="section-kicker">Tackle in space</span><h2>Backline safety gate</h2></div><span className={scores.tackle >= 70 ? "badge badge-green" : "badge badge-red"}>{scores.tackle >= 70 ? "Gate met" : "Gate not met"}</span></div><ul className="data-list"><li><b>Tracking</b><span>Correct angle; does not overrun</span></li><li><b>Footwork</b><span>Shortens steps; no uncontrolled lunge</span></li><li><b>Head placement</b><span>Safe side/behind position</span></li><li><b>Connection</b><span>Meaningful shoulder contact</span></li><li><b>Wrap</b><span>Legal and complete</span></li><li><b>Finish</b><span>Safe drive / roll / bring down</span></li><li><b>Recovery</b><span>Release → feet → reload</span></li></ul></div>
    </section>

    <section className="panel">
      <div className="panel-title-row"><div><span className="section-kicker">Backline Athletic Index</span><h2>Fitness is a separate card.</h2><p>For backs: speed, agility and repeat effort carry the greatest weight.</p></div><span className="athletic-index-number">{athleticIndex}</span></div>
      <div className="athletic-grid">{([
        ["speed", "Speed", "25%", "10m / 20m acceleration + 40m top-end"],
        ["agility", "Agility", "25%", "5-10-5, T-test or reactive change-of-direction"],
        ["repeat", "Repeat effort", "20%", "Ground → get-up → 5yd sprint → down → return × 3"],
        ["endurance", "Endurance", "15%", "Bronco / beep or program-approved test"],
        ["power", "Power", "10%", "Broad jump, vertical or medicine-ball throw"],
        ["strength", "Strength", "5%", "Relevant safe strength standards"],
      ] as const).map(([key, label, weight, detail]) => <label className="athletic-input" key={key}><span><strong>{label}</strong><small>{weight} · {detail}</small></span><input type="number" min="1" max="99" value={athletic[key]} onChange={(e) => updateAthletic(key, Number(e.target.value))}/></label>)}</div>
    </section>

    <section className="backs-evidence-layout">
      <div className="panel"><div className="panel-title-row"><div><span className="section-kicker">Coach evidence</span><h2>Rate what you can prove.</h2></div><span className="badge badge-neutral">{evidenceCount} records</span></div><div className="evidence-standard"><div><strong>Drill</strong><span>Can execute the competency in a designed problem.</span></div><div><strong>Scrimmage</strong><span>Can choose and execute in controlled live rugby.</span></div><div><strong>Match / Video</strong><span>Can repeat it against genuine game pressure.</span></div></div><div className="form-row"><label>Evidence type<select value={evidenceType} onChange={(e) => setEvidenceType(e.target.value)}><option>Drill</option><option>Scrimmage</option><option>Match</option><option>Video</option></select></label><label>Confidence<select defaultValue="High"><option>Developing</option><option>Moderate</option><option>High</option></select></label></div><label className="full-label">Coach note<textarea value={note} onChange={(e) => setNote(e.target.value)} /></label><button className="button primary" onClick={logEvidence}>Save evidence record</button></div>
      <aside className="panel"><span className="section-kicker">Player-facing next actions</span><h2>Do not give a score without a path.</h2><div className="next-actions"><div className="next-action primary-action"><span className="action-number">01</span><div><strong>{scores.tackle < 80 ? "Improve tackle tracking in space" : "Repeat edge defense under pressure"}</strong><p>3v2 / 4v3 channel drill. Grade angle, feet, connection and reload.</p></div></div><div className="next-action"><span className="action-number">02</span><div><strong>Own one off-ball attacking behavior</strong><p>Choose depth, support line or decoy timing and capture live evidence.</p></div></div><div className="next-action"><span className="action-number">03</span><div><strong>Verify {roleSkills[0].toLowerCase()}</strong><p>Role-specific evidence must be observed in live phase play or match film.</p></div></div></div></aside>
    </section>
  </div>;
}

function Timeline({ date, title, text, meta }: { date: string; title: string; text: string; meta: string }) {
  return <div className="timeline-item"><div className="timeline-date">{date}</div><div className="timeline-dot" /><div><strong>{title}</strong><p>{text}</p><small>{meta}</small></div></div>;
}

function CompetencyGraph({ player, players, selectPlayer, openCompetency }: { player: Player; players: Player[]; selectPlayer: (id: number) => void; openCompetency: () => void }) {
  return <div className="page-stack">
    <PageHeading eyebrow="Prerequisites make progress explainable" title="See exactly what unlocks the next competency." description="Every node has evidence, prerequisites and a coach acknowledgment. The graph explains readiness; it never invents an official credential." action="＋ Log evidence" onAction={openCompetency} />
    <div className="graph-toolbar panel"><label>Player<select value={player.id} onChange={(e) => selectPlayer(Number(e.target.value))}>{players.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div><span className="graph-key verified"><i />Verified</span><span className="graph-key active"><i />In progress</span><span className="graph-key locked"><i />Locked</span></div></div>
    <section className="graph-layout">
      <div className="graph-canvas panel">
        <div className="graph-title"><div><span className="section-kicker">Selected pathway</span><h2>Front-row → Scrum Ready</h2></div><span className="badge badge-amber">6 of 10 stages</span></div>
        <div className="dependency-graph">
          <div className="graph-column"><span className="column-label">FOUNDATION</span><GraphNode state="verified" number="01" title="Solo kneeling" meta="Coach acknowledged" /><GraphNode state="verified" number="02" title="Solo standing" meta="Coach acknowledged" /><GraphNode state="verified" number="03" title="Machine" meta="Coach acknowledged" /></div>
          <div className="graph-arrow">→</div>
          <div className="graph-column"><span className="column-label">CONTROLLED</span><GraphNode state="verified" number="04" title="1 v 1" meta="Coach acknowledged" /><GraphNode state="verified" number="05" title="3 v 3" meta="Coach acknowledged" /><GraphNode state="verified" number="06" title="Prop + support" meta="Coach acknowledged" /></div>
          <div className="graph-arrow">→</div>
          <div className="graph-column"><span className="column-label">UNIT</span><GraphNode state="active" number="07" title="Second-row support" meta="Next observation" /><GraphNode state="locked" number="08" title="5-player machine" meta="Needs Stage 7" /><GraphNode state="locked" number="09" title="5 v 5" meta="Needs Stage 8" /></div>
          <div className="graph-arrow">→</div>
          <div className="graph-column final-column"><span className="column-label">LIVE</span><GraphNode state="locked" number="10" title="8 v 8" meta="Needs Stage 9" /><div className="final-node"><span>OUTCOME</span><strong>Scrum Ready</strong><small>Internal team competency</small></div></div>
        </div>
      </div>
      <aside className="graph-aside">
        <div className="panel why-card"><span className="section-kicker">Answer the player</span><h2>Why am I not Scrum Ready?</h2><p>{player.name} has the individual body shape and 1 v 1 foundation. The next missing dependency is coordinated pressure with second-row support.</p><div className="why-next"><span>NEXT BEST ACTION</span><strong>3 controlled reps at camp</strong><small>Observe spine, bind, hips and communication.</small></div><button className="button block primary" onClick={openCompetency}>Record Stage 7</button></div>
        <div className="panel unlock-card"><span className="section-kicker">Highest-leverage work</span><h3>One verified node unlocks:</h3><ul><li><strong>Stage 8</strong><span>5-player machine</span></li><li><strong>Stage 9</strong><span>5 v 5 progression</span></li><li><strong>Selection</strong><span>Front-row depth review</span></li></ul></div>
      </aside>
    </section>
  </div>;
}

function GraphNode({ state, number, title, meta }: { state: string; number: string; title: string; meta: string }) {
  return <div className={`graph-node ${state}`}><span>{state === "verified" ? "✓" : state === "active" ? number : "·"}</span><div><strong>{title}</strong><small>{meta}</small></div></div>;
}

function TrainingPlanner({ navigate, setToast }: { navigate: (section: SectionId) => void; setToast: (text: string) => void }) {
  return <div className="page-stack">
    <PageHeading eyebrow="Friday · Preseason Week 3" title="Plan from player needs, not habit." description="Build tonight's 90-minute session around the competencies that unlock the most team progress while controlling contact load." action="＋ New session" />
    <section className="planner-layout">
      <div className="panel plan-builder">
        <div className="panel-title-row"><div><span className="section-kicker">Tonight · 6:30–8:00 PM</span><h2>Win the first two phases</h2></div><div className="plan-status"><span>Draft</span><strong>90 min</strong></div></div>
        <div className="safety-ready"><div><span className="safety-check">✓</span><p><strong>Session safety check complete</strong><small>Field · weather · EAP · medical coverage · contact groups</small></p></div><button onClick={() => navigate("welfare")}>Review →</button></div>
        <div className="plan-timeline">
          <PlanBlock time="6:30" minutes="12 min" title="Activate & movement preparation" group="Whole team" load="Low" intent="Raise temperature, landing control, neck and trunk preparation." />
          <PlanBlock time="6:42" minutes="18 min" title="Safe tackle technique stations" group="3 ability groups" load="Moderate" intent="Head placement, shoulder target, complete wrap, controlled leg drive." competencies={3} />
          <PlanBlock time="7:00" minutes="16 min" title="Scrum progression groups" group="Forwards" load="Controlled" intent="Stage-matched units; no player works beyond current verified stage." competencies={4} />
          <PlanBlock time="7:16" minutes="18 min" title="Exit and chase connection" group="Backs + loose forwards" load="Moderate" intent="Decision, kick execution, connected chase spacing." competencies={2} />
          <PlanBlock time="7:34" minutes="20 min" title="Conditioned 8 v 8" group="Eligible players" load="Moderate" intent="Two-phase launch, ruck speed and role communication under pressure." competencies={5} />
          <PlanBlock time="7:54" minutes="6 min" title="Down-regulate & player check-out" group="Whole team" load="Low" intent="Breathing, soreness check and next-action review." />
        </div>
        <div className="publish-bar"><div><strong>14 competency observations planned</strong><span>3 coaches assigned · 1 athlete excluded from contact</span></div><button className="button primary" onClick={() => setToast("Session plan published to the team view.")}>Publish session</button></div>
      </div>
      <aside className="planner-aside">
        <div className="panel"><span className="section-kicker">Groups by readiness</span><h2>Contact groups</h2><div className="group-list"><div><span className="group-color green" /><p><strong>Group A · Live</strong><small>12 players · contact ready</small></p></div><div><span className="group-color amber" /><p><strong>Group B · Controlled</strong><small>5 players · stage matched</small></p></div><div><span className="group-color blue" /><p><strong>Group C · Technique</strong><small>4 players · no live collision</small></p></div><div><span className="group-color red" /><p><strong>Medical hold</strong><small>1 player · non-contact plan</small></p></div></div></div>
        <div className="panel"><span className="section-kicker">Coach reminders</span><h2>Before players arrive</h2><ul className="check-list"><li className="done">EAP visible</li><li className="done">Safeguarding lead confirmed</li><li className="done">Equipment inspected</li><li>Hydration station set</li><li>Attendance check open</li></ul></div>
      </aside>
    </section>
  </div>;
}

function PlanBlock({ time, minutes, title, group, load, intent, competencies }: { time: string; minutes: string; title: string; group: string; load: string; intent: string; competencies?: number }) {
  return <div className="plan-block"><div className="plan-time"><strong>{time}</strong><span>{minutes}</span></div><div className="plan-line"><i /></div><div className="plan-content"><div><strong>{title}</strong><p>{intent}</p></div><div className="plan-tags"><span>{group}</span><span>Load: {load}</span>{competencies && <span className="observation-tag">{competencies} observations</span>}</div></div><button aria-label={`Edit ${title}`}>•••</button></div>;
}

function Selection({ players, openPlayer }: { players: Player[]; openPlayer: (id: number) => void }) {
  const starters = players.filter((p) => p.selection === "Starter");
  return <div className="page-stack">
    <PageHeading eyebrow="Evidence behind every shirt" title="Selection players can understand." description="A coach still makes the decision. Pocket PT makes the current status, reasons and next actions visible—without turning a score into an automatic selector." action="Publish squad status" />
    <section className="selection-layout">
      <div className="panel depth-panel"><div className="panel-title-row"><div><span className="section-kicker">Match unit · 15s</span><h2>Starting XV board</h2></div><span className="badge badge-amber">4 contested roles</span></div><div className="pitch-board">
        <div className="pitch-line front-row"><Shirt n="1" name="T. Wells" status="ready" /><Shirt n="2" name="D. Green" status="ready" /><Shirt n="3" name="M. Thompson" status="contested" /></div>
        <div className="pitch-line second-row"><Shirt n="4" name="A. Bell" status="contested" /><Shirt n="5" name="L. King" status="ready" /></div>
        <div className="pitch-line back-row"><Shirt n="6" name="S. Moore" status="ready" /><Shirt n="8" name="C. Davis" status="ready" /><Shirt n="7" name="K. Mensah" status="contested" /></div>
        <div className="pitch-line halfbacks"><Shirt n="9" name="E. Carter" status="contested" /><Shirt n="10" name="A. Jackson" status="ready" /></div>
        <div className="pitch-line backs"><Shirt n="11" name="J. Reed" status="ready" /><Shirt n="12" name="N. Brooks" status="contested" /><Shirt n="13" name="R. Lewis" status="ready" /><Shirt n="14" name="M. Hill" status="ready" /><Shirt n="15" name="T. Young" status="ready" /></div>
      </div><div className="pitch-legend"><span><i className="dot ready" />Role met</span><span><i className="dot contested" />Coach decision</span><span><i className="dot hold" />Unavailable</span></div></div>
      <aside className="selection-aside">
        <div className="panel"><span className="section-kicker">Selection principles</span><h2>Coach-owned. Evidence-informed.</h2><ol className="principle-list"><li><span>1</span><p><strong>Safety first</strong><small>Medical and welfare holds override selection.</small></p></li><li><span>2</span><p><strong>Role competency</strong><small>Can the player execute this role safely?</small></p></li><li><span>3</span><p><strong>Current evidence</strong><small>Camp, training, scrimmage and match observations.</small></p></li><li><span>4</span><p><strong>Coach judgment</strong><small>Context matters; the system does not auto-select.</small></p></li></ol></div>
        <div className="panel decision-card"><span className="section-kicker">Open decision</span><h3>No. 3 · Tighthead Prop</h3><div className="decision-players"><button onClick={() => openPlayer(1)}><span className="avatar olive">MT</span><p><strong>Malik Thompson</strong><small>78% · Scrum Stage 6</small></p><b>→</b></button><button><span className="avatar forest">TW</span><p><strong>Tyrone Wells</strong><small>81% · Lower availability</small></p><b>→</b></button></div><p className="decision-note">Observe Stage 7 tonight before publishing the shirt.</p></div>
      </aside>
    </section>
    <div className="panel selection-table"><div className="panel-title-row"><div><span className="section-kicker">Published player status</span><h2>Current decisions</h2></div><span>{starters.length} starters in sample roster</span></div>{players.slice(0, 6).map((player) => <button key={player.id} onClick={() => openPlayer(player.id)}><span className={`avatar ${player.tone}`}>{player.initials}</span><span><strong>{player.name}</strong><small>{player.position}</small></span><i className={badgeClass(player.selection)}>{player.selection}</i><span className="selection-reason">{player.next}</span><b>→</b></button>)}</div>
  </div>;
}

function Shirt({ n, name, status }: { n: string; name: string; status: string }) { return <button className={`shirt ${status}`}><span>{n}</span><small>{name}</small></button>; }

function Welfare({ openHeadInjury }: { openHeadInjury: () => void }) {
  return <div className="page-stack">
    <PageHeading eyebrow="Player welfare overrides competition" title="Recognize. Remove. Recover. Return safely." description="The coach records and follows the pathway. Qualified healthcare professionals diagnose and clear. Safety restrictions cannot be bypassed." action="＋ Possible head injury" onAction={openHeadInjury} danger />
    <section className="welfare-alert"><div className="welfare-alert-icon">!</div><div><span>ACTIVE MEDICAL HOLD</span><h2>Isaiah Cole · concussion protocol Stage 3</h2><p>No contact. No competition. Medical clearance is not yet recorded.</p></div><div className="alert-timer"><span>NEXT CHECK</span><strong>Today · 5:00 PM</strong><button>Open record →</button></div></section>
    <section className="metrics-grid welfare-metrics"><Metric label="Available" value="18" detail="Full training" tone="green" /><Metric label="Limited" value="3" detail="Modified plan" tone="gold" /><Metric label="Medical holds" value="1" detail="Coach override disabled" tone="red" /><Metric label="Documents due" value="2" detail="Clearance / review" tone="blue" /></section>
    <section className="welfare-layout">
      <div className="panel"><div className="panel-title-row"><div><span className="section-kicker">Concussion return pathway</span><h2>Stage-by-stage control</h2></div><span className="micro-pill dark">Minimum 24h between stages</span></div><div className="return-path">
        <ReturnStage number="1" title="Relative rest" status="complete" />
        <ReturnStage number="2A" title="Light aerobic" status="complete" />
        <ReturnStage number="2B" title="Moderate aerobic" status="complete" />
        <ReturnStage number="3" title="Individual rugby" status="active" />
        <ReturnStage number="4" title="Non-contact" status="locked" />
        <ReturnStage number="5" title="Controlled contact" status="locked" />
        <ReturnStage number="6" title="Competition" status="locked" />
      </div><div className="return-rule"><span>↶</span><p><strong>If symptoms return</strong><small>Stop activity, record symptoms and return to the required earlier stage under the approved protocol.</small></p></div></div>
      <aside className="welfare-aside">
        <div className="panel eap-card"><div className="panel-title-row"><div><span className="section-kicker">Tonight's venue</span><h2>Emergency action plan</h2></div><span className="badge badge-green">Ready</span></div><dl><div><dt>Venue</dt><dd>North Field · Pitch 2</dd></div><div><dt>Medical lead</dt><dd>Jordan Lee, ATC</dd></div><div><dt>Emergency access</dt><dd>South gate</dd></div><div><dt>AED</dt><dd>Clubhouse lobby</dd></div><div><dt>Nearest hospital</dt><dd>4.2 miles</dd></div></dl><button className="button block secondary">Open full EAP</button></div>
        <div className="panel boundary-card"><span className="section-kicker">Clinical boundary</span><h3>Pocket PT does not diagnose.</h3><p>It recognizes possible injury, removes players, records facts, manages restrictions and tracks the documented return pathway.</p></div>
      </aside>
    </section>
  </div>;
}

function ReturnStage({ number, title, status }: { number: string; title: string; status: string }) { return <div className={`return-stage ${status}`}><span>{status === "complete" ? "✓" : number}</span><div><strong>{title}</strong><small>{status === "complete" ? "Completed" : status === "active" ? "Current stage" : "Locked"}</small></div></div>; }

function Safeguarding({ openConcern }: { openConcern: () => void }) {
  return <div className="page-stack">
    <div className="protected-heading"><div><span className="protected-kicker">RESTRICTED · LEAST-PRIVILEGE ACCESS</span><h1>Safeguarding & Athlete Welfare</h1><p>Prevention and response live here. Sensitive narratives never appear in normal coaching notes, team feeds or performance dashboards.</p></div><button className="button primary" onClick={openConcern}>＋ Report a concern</button></div>
    <section className="safeguarding-principles"><div><span>01</span><p><strong>Listen</strong><small>Receive the information calmly.</small></p></div><div><span>02</span><p><strong>Do not investigate</strong><small>Do not interrogate or test credibility.</small></p></div><div><span>03</span><p><strong>Record facts</strong><small>Capture what was seen, heard or disclosed.</small></p></div><div><span>04</span><p><strong>Report</strong><small>Route immediately or within 24 hours.</small></p></div></section>
    <section className="safeguarding-layout">
      <div className="safeguarding-main">
        <div className="panel safeguarding-status"><div className="panel-title-row"><div><span className="section-kicker">Program safeguarding status</span><h2>Preseason readiness</h2></div><span className="badge badge-amber">2 actions due</span></div><div className="safeguard-grid"><SafeguardStat label="Safeguarding officer" value="Configured" detail="Amina Brooks · backup assigned" state="green" /><SafeguardStat label="Codes acknowledged" value="91%" detail="2 player renewals due" state="amber" /><SafeguardStat label="Staff training" value="100%" detail="4 of 4 current" state="green" /><SafeguardStat label="Event risk checks" value="4 / 5" detail="Away scrimmage pending" state="amber" /></div></div>
        <div className="panel restricted-queue"><div className="panel-title-row"><div><span className="section-kicker">Restricted workflow</span><h2>Items requiring officer action</h2></div><span className="privacy-mark">Officer view · no case narratives</span></div><div className="queue-item urgent"><span className="queue-time">03:18</span><div><strong>Concern awaiting initial review</strong><p>Routing: lower-level / poor-practice review</p><small>Received today · designated officer notified</small></div><i className="badge badge-red">24h clock</i><button>Open →</button></div><div className="queue-item"><span className="queue-time neutral">AUG 12</span><div><strong>Away scrimmage risk assessment</strong><p>Transport and changing-area controls incomplete</p><small>Responsible: Team Manager</small></div><i className="badge badge-amber">Pending</i><button>Open →</button></div></div>
        <div className="panel"><div className="panel-title-row"><div><span className="section-kicker">Two response pathways</span><h2>Route—do not determine guilt</h2></div></div><div className="pathway-pair"><div><span>PATH A</span><h3>Poor practice / lower-level concern</h3><p>Officer review → appropriate internal ethics or misconduct process → documented action and monitoring.</p></div><div className="serious"><span>PATH B</span><h3>Possible abuse / possible crime</h3><p>Officer review → approved statutory or governing-body pathway → professional investigation.</p></div></div></div>
      </div>
      <aside className="safeguarding-aside">
        <div className="panel officer-card"><span className="section-kicker">Designated lead</span><div className="officer-name"><div className="avatar plum">AB</div><div><h3>Amina Brooks</h3><p>Safeguarding Officer</p></div></div><dl><div><dt>Backup</dt><dd>Marcus Hill</dd></div><div><dt>Internal procedure</dt><dd>Configured</dd></div><div><dt>Local pathway</dt><dd>Configured</dd></div><div><dt>Emergency instructions</dt><dd>Visible</dd></div></dl><button className="button block secondary">View approved procedure</button></div>
        <div className="panel confidentiality-card"><span className="lock-symbol">▣</span><h3>Protected data domain</h3><p>Administrative access does not automatically grant access to confidential safeguarding narratives. Every authorized view is logged.</p><ul><li>Role-based access</li><li>Restricted exports</li><li>Timestamped action log</li><li>Retention controls</li></ul></div>
      </aside>
    </section>
  </div>;
}

function SafeguardStat({ label, value, detail, state }: { label: string; value: string; detail: string; state: string }) { return <div className="safeguard-stat"><span className={`status-line ${state}`} /><div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div></div>; }


function MovementIntelligence({ player }: { player: Player }) {
  const movementRows = [
    ["Overhead squat", "Developing", "78", "Right heel rise · mild left knee valgus"],
    ["Single-leg balance", "Verified", "91", "Stable pelvis · symmetrical control"],
    ["Lunge pattern", "Verified", "88", "Good trunk control · retest under load"],
    ["Athletic tackle stance", "Developing", "81", "Raise eyes earlier · close foot distance"],
    ["Push-up / shoulder control", "Verified", "90", "Strong trunk line · stable scapulae"],
  ];
  return <div className="page-stack">
    <PageHeading eyebrow={`${player.name} · movement foundation`} title="Movement Intelligence" description="Turn movement quality into visible rugby prerequisites. Pose analysis supports the coach; it never replaces qualified clinical assessment." action="Start camera assessment" />
    <section className="movement-hero">
      <div className="movement-score"><ScoreRing value={84} label="movement evidence" /><div><span>FOUNDATION STATUS</span><h2>Ready to train. Two correctives remain.</h2><p>Movement competency is a prerequisite for higher-risk rugby progressions. Findings are coaching observations, not medical diagnoses.</p></div></div>
      <div className="ai-preview"><span className="ai-chip">POSE MODEL · PROTOTYPE</span><div className="pose-frame"><div className="pose-person">◯<br/>╱│╲<br/>╱ ╲</div><div className="angle angle-a">Knee 84°</div><div className="angle angle-b">Trunk 21°</div><div className="angle angle-c">Ankle 31°</div></div><small>Camera → landmarks → joint angles → coach review → evidence record</small></div>
    </section>
    <section className="two-col-grid">
      <div className="panel"><div className="panel-title-row"><div><span className="section-kicker">Assessment battery</span><h2>Movement prerequisites</h2></div><span className="badge badge-neutral">5 tracked</span></div><div className="assessment-list">{movementRows.map(([name,state,score,note]) => <div className="assessment-row" key={name}><div><strong>{name}</strong><small>{note}</small></div><span className={state === "Verified" ? "badge badge-green" : "badge badge-amber"}>{state}</span><b>{score}</b><button>Review →</button></div>)}</div></div>
      <aside className="panel"><span className="section-kicker">Corrective pathway</span><h2>Highest-impact work</h2><div className="corrective-stack"><div><span>01</span><div><strong>Ankle dorsiflexion</strong><p>Loaded ankle mobility · 2 × 8 each side</p></div></div><div><span>02</span><div><strong>Knee tracking control</strong><p>Split squat isometric · mini-band step-down</p></div></div><div><span>03</span><div><strong>Retest overhead squat</strong><p>Reassess after two exposure sessions.</p></div></div></div><div className="boundary-note"><strong>Clinical boundary</strong><p>Flag pain, neurological symptoms or suspected injury for qualified healthcare review instead of generating a corrective plan.</p></div></aside>
    </section>
  </div>;
}

function TestingConditioning({ player }: { player: Player }) {
  return <div className="page-stack">
    <PageHeading eyebrow={`${player.name} · longitudinal performance`} title="Testing & Conditioning" description="Build the physical qualities required by position, then periodize training around matches, recovery and development stage." action="Log test battery" />
    <section className="metric-strip"><PerformanceMetric label="10 m acceleration" value="1.78 s" note="↑ 0.06 this block" /><PerformanceMetric label="30 m sprint" value="4.31 s" note="Position target: 4.25" /><PerformanceMetric label="Bronco" value="5:08" note="Aerobic base" /><PerformanceMetric label="CMJ" value="47 cm" note="Power trend +4%" /><PerformanceMetric label="Attendance" value={`${player.attendance}%`} note="Last 8 weeks" /></section>
    <section className="two-col-grid"><div className="panel"><span className="section-kicker">Season structure</span><h2>Periodization</h2><div className="period-grid"><div className="active"><b>01</b><strong>Off-season</strong><small>General preparation</small></div><div><b>02</b><strong>Preseason</strong><small>Specific preparation</small></div><div><b>03</b><strong>In-season</strong><small>Maintain & perform</small></div><div><b>04</b><strong>Transition</strong><small>Recover & regenerate</small></div></div><div className="week-plan"><span>48-HOUR MATCH RULE</span><div><b>Day 0</b> Match</div><div><b>Day 1</b> Recovery</div><div><b>Day 2</b> S&C / recovery option</div><div><b>Day 3</b> High-intensity rugby</div><div><b>Day 4</b> S&C</div><div><b>Day 5</b> Medium/low rugby</div><div><b>Day 6</b> Rest</div></div></div><aside className="panel"><span className="section-kicker">Position needs analysis</span><h2>{player.position}</h2><SkillBar name="Strength" value={88}/><SkillBar name="Power" value={84}/><SkillBar name="Speed" value={72}/><SkillBar name="Speed endurance" value={77}/><SkillBar name="Mobility / stability" value={86}/><div className="boundary-note"><strong>Individuality first</strong><p>Programming considers training age, injury history, maturity, position and current test data rather than applying one team workout to everyone.</p></div></aside></section>
  </div>;
}

function TechnicalSkills({ player }: { player: Player }) {
  const skills = [["Pass & receive",92,"Match ready"],["High ball",79,"Developing"],["Ground pickup",88,"Verified"],["Tackle",82,"Verified"],["Ruck",76,"Verified"],["Maul",68,"Developing"],["Lineout",72,"Role-specific"],["Scrum",64,"Stage 6 / 10"]] as const;
  return <div className="page-stack">
    <PageHeading eyebrow={`${player.name} · technical curriculum`} title="Technical Skills Engine" description="Every skill has prerequisites, coaching cues, progressive pressure and evidence. Players advance when competency is demonstrated—not when a calendar says they should." action="Assess skill" />
    <section className="skill-matrix">{skills.map(([name,value,status]) => <div className="skill-tile" key={name}><div className="skill-tile-top"><strong>{name}</strong><span>{value}</span></div><Progress value={value} compact/><small>{status}</small><button>Open pathway →</button></div>)}</section>
    <section className="two-col-grid"><div className="panel"><div className="panel-title-row"><div><span className="section-kicker">Tackle Ready</span><h2>Progression, not a single score</h2></div><span className="badge badge-amber">Stage 6 of 8</span></div><div className="vertical-path"><PathStep n="01" title="Athletic stance" state="done"/><PathStep n="02" title="Track & close space" state="done"/><PathStep n="03" title="Eyes up / head to side" state="done"/><PathStep n="04" title="Static shoulder + wrap" state="done"/><PathStep n="05" title="Controlled moving tackle" state="done"/><PathStep n="06" title="Live movement" state="current"/><PathStep n="07" title="Game-speed fatigue" state="next"/><PathStep n="08" title="Match evidence" state="next"/></div></div><aside className="panel"><span className="section-kicker">Coach cues</span><h2>What the camera can support</h2><ul className="data-list"><li><b>Head safety</b><span>side / behind, never in front</span></li><li><b>Body height</b><span>strong, stable, low</span></li><li><b>Feet</b><span>close enough to make contact</span></li><li><b>Wrap</b><span>arms complete the tackle</span></li><li><b>Leg drive</b><span>continue through finish</span></li><li><b>Recovery</b><span>release → feet → contest</span></li></ul><div className="boundary-note"><strong>Safety rule</strong><p>Unsafe head position, high contact or no-wrap behavior is a hard technical failure and should trigger regression—not a lower average score.</p></div></aside></section>
  </div>;
}

function TacticalIntelligence({ player }: { player: Player }) {
  return <div className="page-stack">
    <PageHeading eyebrow={`${player.name} · game understanding`} title="Rugby IQ & Tactical Intelligence" description="Move beyond isolated technique. Track whether players scan, communicate, recognize space and select the right action under pressure." action="Log game-IQ observation" />
    <section className="metric-strip"><PerformanceMetric label="Scanning" value="84" note="Pre-receipt frequency"/><PerformanceMetric label="Decision quality" value="81" note="Run / pass / kick"/><PerformanceMetric label="Communication" value="77" note="Early + useful calls"/><PerformanceMetric label="Support" value="86" note="Next-action availability"/><PerformanceMetric label="Pressure execution" value="74" note="Primary growth area"/></section>
    <section className="tactic-board"><div className="pitch"><span className="half-line"/><span className="gain-line">GAIN LINE</span><i className="p1">10</i><i className="p2">12</i><i className="p3">13</i><i className="p4">11</i><i className="d1">D</i><i className="d2">D</i><i className="d3">D</i><i className="arrow-run">↗</i><i className="arrow-pass">⟶</i></div><div className="tactic-copy"><span className="section-kicker">Scenario lab</span><h2>Can the player solve the picture?</h2><p>Backline attack: identify defensive spacing, preserve width, commit the correct defender and select a run/pass option that attacks space instead of contact.</p><div className="decision-choices"><button>Run</button><button>Pass</button><button>Kick</button><button>Reset</button></div><small>Coach grades the decision and execution separately.</small></div></section>
    <section className="three-col-grid"><TacticCard title="Attack" items={["Gain-line understanding","Width / depth","Running lines","Continuity","Finish opportunities"]}/><TacticCard title="Defense" items={["Line integrity","Go-forward line speed","Space responsibility","Tackle selection","Backfield coverage"]}/><TacticCard title="Transition" items={["Counterattack","Turnover response","Kick return","Support race","Reorganization"]}/></section>
  </div>;
}

function VideoReview({ player }: { player: Player }) {
  return <div className="page-stack">
    <PageHeading eyebrow={`${player.name} · evidence room`} title="Video Review & Evidence" description="Tie every clip to a competency, decision or development objective so film becomes evidence—not just a highlight reel." action="Upload clip" />
    <section className="video-layout"><div className="video-stage"><div className="video-placeholder"><span>▶</span><strong>Training clip · tackle progression</strong><small>00:08 / 00:14</small><div className="video-timeline"><i style={{width:'57%'}}/></div></div><div className="video-tags"><span>Eyes up ✓</span><span>Head side ✓</span><span>Wrap ✓</span><span className="warn">Feet too far ✦</span></div></div><aside className="panel"><span className="section-kicker">Evidence annotation</span><h2>One clip, one purpose.</h2><textarea defaultValue="Good head placement and complete wrap. Close final step before contact; current distance reduces leg-drive effectiveness."/><div className="form-row"><label>Attach to<select defaultValue="Tackle Ready"><option>Tackle Ready</option><option>Movement Ready</option><option>Game IQ</option><option>Scrum Ready</option></select></label><label>Pressure level<select defaultValue="Controlled live"><option>Technical</option><option>Controlled live</option><option>Game speed</option><option>Match</option></select></label></div><button className="button block primary">Save evidence</button></aside></section>
    <section className="panel"><span className="section-kicker">Evidence library</span><h2>Recent tagged clips</h2><div className="clip-grid"><Clip title="Scrum Stage 6" meta="Aug 6 · 3 reps · verified"/><Clip title="Tackle live movement" meta="Aug 4 · corrective needed"/><Clip title="High-ball catch" meta="Aug 2 · developing"/><Clip title="Counterattack read" meta="Jul 30 · good decision"/></div></section>
  </div>;
}

function PerformanceMetric({ label, value, note }: { label: string; value: string; note: string }) { return <div className="metric-card"><small>{label}</small><strong>{value}</strong><span>{note}</span></div>; }
function SkillBar({ name, value }: { name: string; value: number }) { return <div className="skill-bar"><div><strong>{name}</strong><span>{value}</span></div><Progress value={value} compact/></div>; }
function PathStep({ n, title, state }: { n: string; title: string; state: string }) { return <div className={`path-step ${state}`}><span>{state === "done" ? "✓" : n}</span><strong>{title}</strong><small>{state === "done" ? "Verified" : state === "current" ? "Current focus" : "Locked by prerequisite"}</small></div>; }
function TacticCard({ title, items }: { title: string; items: string[] }) { return <div className="panel tactic-card"><span className="section-kicker">{title}</span><h2>{title} intelligence</h2><ul>{items.map(i=><li key={i}>{i}<span>→</span></li>)}</ul></div>; }
function Clip({ title, meta }: { title: string; meta: string }) { return <button className="clip-card"><div className="clip-thumb">▶</div><strong>{title}</strong><small>{meta}</small></button>; }

function CoachReady() {
  return <div className="page-stack">
    <PageHeading eyebrow="Coach Rashad Harbor · current pathway" title="One in-person course remains." description="Your five listed World Rugby Level 1 online prerequisites are recorded as complete. Pocket PT keeps governing-body credentials separate from internal coaching competencies." action="Upload certificate" />
    <section className="coach-hero">
      <div className="coach-hero-score"><ScoreRing value={83} label="pathway" /><div><span>WORLD RUGBY LEVEL 1</span><h2>Online work complete</h2><p>Attend the practical, in-person course and make sure the required certificates are recorded through USA Rugby's current learning pathway.</p></div></div>
      <div className="course-next"><span>NEXT REQUIRED STEP</span><strong>8-hour in-person Level 1 course</strong><small>Practical coaching · player welfare · skill progressions · collaborative coaching</small><a href="https://usa.rugby/courses" target="_blank" rel="noreferrer">Open official USA Rugby courses ↗</a></div>
    </section>
    <section className="coach-layout">
      <div className="panel"><div className="panel-title-row"><div><span className="section-kicker">World Rugby online prerequisites</span><h2>5 of 5 recorded complete</h2></div><span className="badge badge-green">Complete</span></div><div className="credential-list">
        <Credential name="RugbyReady" source="World Rugby Passport" status="Complete" />
        <Credential name="Concussion Management for the General Public" source="World Rugby Passport" status="Complete" />
        <Credential name="Introduction to Coaching" source="World Rugby Passport" status="Complete" />
        <Credential name="Key Factor Analysis" source="World Rugby Passport" status="Complete" />
        <Credential name="Safeguarding Essentials" source="World Rugby Passport" status="Complete" />
        <Credential name="Activate" source="Required only when the Level 1 course includes Activate" status="Conditional" />
      </div></div>
      <aside className="coach-aside">
        <div className="panel usa-check"><span className="section-kicker">USA Rugby operational checks</span><h2>Confirm before coaching</h2><p>These live outside Pocket PT's internal competency record and should be verified in the current USA Rugby systems.</p><ul className="credential-checks"><li><span className="check green">✓</span><p><strong>World Rugby PDFs</strong><small>Ready to upload / verify</small></p></li><li><span className="check amber">!</span><p><strong>USA Rugby membership</strong><small>Confirm current season</small></p></li><li><span className="check amber">!</span><p><strong>SafeSport status</strong><small>Confirm current requirement</small></p></li><li><span className="check amber">!</span><p><strong>Background screening</strong><small>Confirm current requirement</small></p></li><li><span className="check amber">!</span><p><strong>Club registration / compliance</strong><small>Confirm in Rugby Xplorer</small></p></li></ul></div>
        <div className="panel source-card"><span className="section-kicker">Standards boundary</span><h3>Aligned—not endorsed.</h3><p>This independent Pocket PT prototype translates official learning into coaching workflows. It does not issue or replace USA Rugby or World Rugby credentials.</p><small>Official requirements checked August 7, 2026.</small></div>
      </aside>
    </section>
    <section className="panel official-links"><div><span className="section-kicker">Official sources</span><h2>Keep requirements current</h2></div><a href="https://usa.rugby/coaching" target="_blank" rel="noreferrer">USA Rugby Coaching <span>↗</span></a><a href="https://usa.rugby/courses" target="_blank" rel="noreferrer">USA Rugby Courses <span>↗</span></a><a href="https://passport.world.rugby/coaching/face-to-face-courses-and-accreditations/" target="_blank" rel="noreferrer">World Rugby Prerequisites <span>↗</span></a></section>
  </div>;
}

function Credential({ name, source, status }: { name: string; source: string; status: string }) { return <div className="credential-row"><span className={status === "Complete" ? "credential-icon complete" : "credential-icon conditional"}>{status === "Complete" ? "✓" : "i"}</span><div><strong>{name}</strong><small>{source}</small></div><i className={status === "Complete" ? "badge badge-green" : "badge badge-neutral"}>{status}</i><button>•••</button></div>; }

function Academy() {
  return <div className="page-stack academy-page">
    <section className="academy-hero"><div className="eyebrow-row"><span className="live-dot" /> POCKET PT DFW RUGBY DEVELOPMENT ACADEMY</div><h1>Develop the player.<br />Prove the progress.<br />Build the game.</h1><p>A 15s-first development system that starts with individual competency, grows into live scrimmage, enters sevens competition, and builds toward a complete 15s program.</p><div className="hero-actions"><button className="button light">Create first camp</button><button className="text-button light-text">Open academy roster →</button></div><div className="academy-numbers"><div><strong>15–20</strong><span>players unlock<br />scrimmage phase</span></div><div><strong>7s</strong><span>first tournament<br />entry point</span></div><div><strong>15s</strong><span>primary long-term<br />development model</span></div></div></section>
    <section className="academy-path"><div className="path-line" /><AcademyPhase number="01" title="Open development camps" text="Pull players from across DFW. Establish profiles, baselines, welfare records and position pathways." status="NOW" /><AcademyPhase number="02" title="Controlled scrimmage" text="At 15–20 active players, create safe game situations matched to readiness and current competencies." status="NEXT" /><AcademyPhase number="03" title="Enter sevens" text="Use smaller squads and tournaments to expose decisions, conditioning and skills under pressure." status="BUILD" /><AcademyPhase number="04" title="Field a 15s program" text="Develop complete units, depth by position, a repeatable game model and transparent selection." status="VISION" /></section>
    <section className="academy-grid"><div className="panel"><span className="section-kicker">Camp operating model</span><h2>Every athlete leaves knowing:</h2><div className="academy-outcomes"><div><span>01</span><strong>Where they are now</strong><p>Profile, movement, skill, role, fitness and welfare status.</p></div><div><span>02</span><strong>What they must earn</strong><p>Visible prerequisites and coach-defined evidence.</p></div><div><span>03</span><strong>What comes next</strong><p>An individual plan connected to team opportunities.</p></div></div></div><div className="panel license-card"><span className="section-kicker">Future team license</span><h2>A mobile coaching department.</h2><p>Clubs could license the operating workflow—not governing-body credentials—to maintain player development, readiness, welfare, attendance, selection and coach records.</p><ul><li>Organization-controlled roles</li><li>Coach-verified competency records</li><li>Protected welfare data</li><li>15s and sevens squad views</li><li>Standards version tracking</li></ul><button className="button block primary">View license blueprint</button></div></section>
  </div>;
}

function AcademyPhase({ number, title, text, status }: { number: string; title: string; text: string; status: string }) { return <div className={`academy-phase ${status === "NOW" ? "current" : ""}`}><div className="phase-node">{number}</div><div><span>{status}</span><h2>{title}</h2><p>{text}</p></div></div>; }

function PageHeading({ eyebrow, title, description, action, onAction, danger = false }: { eyebrow: string; title: string; description: string; action: string; onAction?: () => void; danger?: boolean }) {
  return <div className="page-heading"><div><span className="page-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div><button className={`button ${danger ? "danger" : "primary"}`} onClick={onAction}>{action}</button></div>;
}

function Modal({ title, eyebrow, close, danger = false, children }: { title: string; eyebrow: string; close: () => void; danger?: boolean; children: React.ReactNode }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><section className={`modal ${danger ? "modal-danger" : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-head"><div><span>{eyebrow}</span><h2 id="modal-title">{title}</h2></div><button onClick={close} aria-label="Close dialog">×</button></div><div className="modal-body">{children}</div></section></div>;
}
