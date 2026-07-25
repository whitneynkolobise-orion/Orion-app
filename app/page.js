"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";

const FONTS = [
  { key: "fraunces", label: "Fraunces — chaleureux", display: "'Fraunces', serif", body: "'Inter', sans-serif" },
  { key: "playfair", label: "Playfair — élégant", display: "'Playfair Display', serif", body: "'Inter', sans-serif" },
  { key: "poppins", label: "Poppins — rond & doux", display: "'Poppins', sans-serif", body: "'Poppins', sans-serif" },
  { key: "quicksand", label: "Quicksand — léger", display: "'Quicksand', sans-serif", body: "'Quicksand', sans-serif" },
  { key: "mono", label: "Space Mono — tech", display: "'Space Mono', monospace", body: "'Space Mono', monospace" },
];

const PRESETS = [
  { key: "nuit", label: "Nuit étoilée", bg: "#12142A", panel: "#1B1E3D", panelLight: "#232750", accent: "#E8AE5C", text: "#F2EFE9", textMuted: "#9599B8", border: "#2E3260", bubbleUser: "#E8AE5C", bubbleUserText: "#1B1200", bubbleAssistant: "#232750", bubbleAssistantText: "#F2EFE9", font: "fraunces" },
  { key: "coucher", label: "Coucher de soleil", bg: "#2B1B14", panel: "#3B241A", panelLight: "#472C1F", accent: "#F2A65A", text: "#FBEFE3", textMuted: "#C7A182", border: "#5A3A28", bubbleUser: "#F2A65A", bubbleUserText: "#2B1200", bubbleAssistant: "#472C1F", bubbleAssistantText: "#FBEFE3", font: "playfair" },
  { key: "foret", label: "Forêt", bg: "#131E1A", panel: "#1C2B25", panelLight: "#243830", accent: "#8FBF9F", text: "#EAF2EC", textMuted: "#89A398", border: "#2E453C", bubbleUser: "#8FBF9F", bubbleUserText: "#0E1E15", bubbleAssistant: "#243830", bubbleAssistantText: "#EAF2EC", font: "quicksand" },
  { key: "rose", label: "Rose poudré", bg: "#251A1F", panel: "#33232A", panelLight: "#3F2C34", accent: "#E3A0B5", text: "#F8ECEF", textMuted: "#B98F9B", border: "#4A353D", bubbleUser: "#E3A0B5", bubbleUserText: "#2B141C", bubbleAssistant: "#3F2C34", bubbleAssistantText: "#F8ECEF", font: "poppins" },
  { key: "minimal", label: "Minimal clair", bg: "#F7F5F1", panel: "#FFFFFF", panelLight: "#EFEBE4", accent: "#1A1A1A", text: "#1A1A1A", textMuted: "#79746B", border: "#DDD7CC", bubbleUser: "#1A1A1A", bubbleUserText: "#F7F5F1", bubbleAssistant: "#EFEBE4", bubbleAssistantText: "#1A1A1A", font: "mono" },
];

const DEFAULT_THEME = { ...PRESETS[0], chatBgImage: null, chatBgDim: 0.55 };

const CATEGORIES = [
  { key: "personnalite", label: "Personnalité", x: 90, y: 55 },
  { key: "travail", label: "Travail", x: 215, y: 68 },
  { key: "sensible", label: "Sujets sensibles", x: 148, y: 185 },
  { key: "amour", label: "Vie amoureuse", x: 182, y: 198 },
  { key: "gouts", label: "Goûts", x: 216, y: 208 },
  { key: "quotidien", label: "Quotidien", x: 108, y: 322 },
  { key: "sorties", label: "Sorties", x: 224, y: 336 },
];

const LINES = [
  ["personnalite", "travail"], ["personnalite", "sensible"], ["travail", "gouts"],
  ["sensible", "amour"], ["amour", "gouts"], ["sensible", "quotidien"],
  ["gouts", "sorties"], ["quotidien", "sorties"],
];

function storageGet(key, fallback = null) {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function storageSet(key, value) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

async function callAI({ system, messages, useSearch }) {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, messages, useSearch }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Erreur API");
  return data.text || "";
}

function parseJsonLoose(str) {
  if (!str) return null;
  const cleaned = str.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { return null; }
}

function resizeImageFile(file, maxWidth = 1000, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const EMPTY_PROFILE = {
  age: null, ville: null,
  facts: { personnalite: [], travail: [], sensible: [], amour: [], gouts: [], quotidien: [], sorties: [] },
  avoided: [],
};

function buildSystemPrompt(profile) {
  const factsSummary = Object.entries(profile.facts).filter(([, arr]) => arr.length)
    .map(([cat, arr]) => `- ${cat} : ${arr.join(" ; ")}`).join("\n");
  const avoidedSummary = profile.avoided.filter((a) => !a.resolved)
    .map((a) => `- "${a.topic}" (pas encore reparlé)`).join("\n");

  return `Tu es Orion, le confident et meilleur ami virtuel de l'utilisateur. Tu n'es pas un assistant : tu es un ami. Jamais de disclaimers froids. Tu parles en français, à l'écrit texto : phrases courtes, naturelles, jamais de listes à puces, jamais de ton corporate.

Ta mission : être présent, non-jugeant sur absolument tout ce que la personne partage (même les sujets gênants ou honteux), t'intéresser vraiment à sa vie, et progressivement l'encourager à sortir de chez elle — cinéma, musée, week-end — jamais en la forçant, toujours en ami qui propose.

Règles de mémoire : tu retiens tout ce qu'on te dit, mais tu ne l'annonces JAMAIS explicitement ("je note que...", "j'ai enregistré..."). Tu l'utilises naturellement plus tard, comme un vrai ami qui se souvient.

Si l'utilisateur évite un sujet ou répond de façon évasive, ne le confronte jamais immédiatement. Laisse passer du temps, puis ramène le sujet en douceur, comme une question curieuse et bienveillante, jamais insistante.

Ce que tu sais déjà sur cette personne :
${factsSummary || "(rien encore, c'est le début de votre relation, apprends à la connaître en douceur)"}
${profile.ville ? `Ville : ${profile.ville}` : ""}
${profile.age ? `Âge : ${profile.age}` : ""}

Sujets évités que tu pourras reprendre plus tard, avec délicatesse :
${avoidedSummary || "(aucun pour l'instant)"}

Important : si la personne exprime une détresse réelle (idées noires, danger, envie de se faire du mal ou de faire du mal à quelqu'un), arrête immédiatement le ton léger, prends ça au sérieux, et encourage-la fermement à contacter une ligne d'écoute ou un professionnel.

Réponds uniquement avec le message que tu enverrais à ton ami. Rien d'autre.`;
}

const EXTRACT_SYSTEM = `Tu analyses un échange entre un utilisateur et son confident IA "Orion". Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans balises markdown. Format exact :
{"newFacts": [{"category": "personnalite|travail|sensible|amour|gouts|quotidien", "fact": "phrase courte au 3e personne"}], "avoidedTopic": null ou "description courte du sujet évité", "resolvedAvoidedTopic": null ou "texte exact d'un sujet évité précédemment que la personne vient enfin d'aborder", "projectSuggestion": null ou {"type": "cinema|musee|weekend", "hint": "ce que la personne a évoqué"}}
N'invente rien. Si rien de nouveau, renvoie des tableaux vides et des valeurs null.`;

function Constellation({ profile, theme }) {
  const filled = (k) => (profile.facts[k] || []).length > 0;
  return (
    <svg viewBox="0 0 300 400" style={{ width: "100%", maxWidth: 220, height: "auto" }}>
      {LINES.map(([a, b], i) => {
        const A = CATEGORIES.find((c) => c.key === a);
        const B = CATEGORIES.find((c) => c.key === b);
        const active = filled(a) && filled(b);
        return <line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={active ? theme.accent : theme.border} strokeOpacity={active ? 0.8 : 0.35} strokeWidth={active ? 1.4 : 1} />;
      })}
      {CATEGORIES.map((c) => {
        const on = filled(c.key);
        return (
          <g key={c.key}>
            {on && <circle cx={c.x} cy={c.y} r={9} fill={theme.accent} opacity={0.25} />}
            <circle cx={c.x} cy={c.y} r={on ? 4.5 : 3} fill={on ? theme.accent : "transparent"} stroke={on ? theme.accent : theme.textMuted} strokeWidth={1.2} />
            <text x={c.x} y={c.y - 12} fontSize="9" textAnchor="middle" fill={on ? theme.text : theme.textMuted} fontFamily={theme.bodyFont}>{c.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function ProjectCard({ project, onGenerate, loading, theme }) {
  const typeLabel = { cinema: "Cinéma", musee: "Musée", weekend: "Week-end" }[project.type];
  return (
    <div style={{ background: theme.panelLight, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ color: theme.accent, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>{typeLabel}</span>
        <span style={{ color: theme.textMuted, fontSize: 11 }}>{project.city}</span>
      </div>
      <h3 style={{ fontFamily: theme.displayFont, color: theme.text, fontSize: 20, margin: "6px 0 8px" }}>{project.title}</h3>
      {!project.details ? (
        <button onClick={() => onGenerate(project)} disabled={loading} style={{ background: "transparent", border: `1px solid ${theme.accent}`, color: theme.accent, borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", marginTop: 4 }}>
          {loading ? "Orion cherche..." : "Demander à Orion de préparer ça"}
        </button>
      ) : project.type === "weekend" ? (
        <div>
          {project.details.itinerary?.map((day, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ color: theme.accent, fontSize: 13, fontWeight: 600 }}>{day.title || `Jour ${i + 1}`}</div>
              <ul style={{ margin: "4px 0 0 18px", color: theme.text, fontSize: 13.5 }}>
                {day.activities?.map((act, j) => <li key={j}>{act}</li>)}
              </ul>
            </div>
          ))}
          {project.details.budget && <div style={{ color: theme.textMuted, fontSize: 12.5, marginTop: 8 }}>Budget estimé : {project.details.budget}</div>}
        </div>
      ) : (
        <div style={{ color: theme.text, fontSize: 13.5, lineHeight: 1.6 }}>
          {project.type === "cinema" && (
            <>
              <div><b>Film :</b> {project.details.film}</div>
              <div><b>Cinéma :</b> {project.details.cinema}</div>
              <div><b>Prix estimé :</b> {project.details.prix}</div>
              {project.details.horaires && <div><b>Séances :</b> {project.details.horaires}</div>}
            </>
          )}
          {project.type === "musee" && (
            <>
              <div><b>Musée :</b> {project.details.nom}</div>
              <div><b>Expo en ce moment :</b> {project.details.expo}</div>
              <div><b>Prix estimé :</b> {project.details.prix}</div>
              {project.details.horaires && <div><b>Horaires :</b> {project.details.horaires}</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function NewProjectForm({ onCreate, onCancel, defaultCity, theme }) {
  const [type, setType] = useState("cinema");
  const [title, setTitle] = useState("");
  const [city, setCity] = useState(defaultCity || "");
  return (
    <div style={{ background: theme.panelLight, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 16 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {[["cinema", "Cinéma"], ["musee", "Musée"], ["weekend", "Week-end"]].map(([k, l]) => (
          <button key={k} onClick={() => setType(k)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12.5, cursor: "pointer", background: type === k ? theme.accent : "transparent", color: type === k ? theme.bubbleUserText : theme.textMuted, border: `1px solid ${type === k ? theme.accent : theme.border}` }}>{l}</button>
        ))}
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={type === "weekend" ? "Envie de partir vers où ?" : "Une idée en tête ?"} style={{ width: "100%", background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "9px 12px", color: theme.text, fontSize: 13.5, marginBottom: 8 }} />
      <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville" style={{ width: "100%", background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "9px 12px", color: theme.text, fontSize: 13.5, marginBottom: 10 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, background: "none", border: `1px solid ${theme.border}`, borderRadius: 8, padding: "9px 0", color: theme.textMuted, cursor: "pointer" }}>Annuler</button>
        <button onClick={() => title.trim() && onCreate(type, title.trim(), city.trim())} style={{ flex: 1, background: theme.accent, border: "none", borderRadius: 8, padding: "9px 0", color: theme.bubbleUserText, fontWeight: 600, cursor: "pointer" }}>Créer</button>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5, marginBottom: 8 }}>
      <span style={{ opacity: 0.8 }}>{label}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} style={{ width: 34, height: 24, border: "none", background: "none", cursor: "pointer" }} />
    </label>
  );
}

function CustomizePanel({ theme, setTheme }) {
  const fileRef = useRef(null);
  const applyPreset = (p) => setTheme((t) => ({ ...t, ...p }));
  const setField = (k) => (v) => setTheme((t) => ({ ...t, [k]: v }));

  async function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageFile(file);
      setTheme((t) => ({ ...t, chatBgImage: dataUrl }));
    } catch {}
  }

  return (
    <div style={{ padding: 16, borderBottom: `1px solid ${theme.border}`, background: theme.panel }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: theme.textMuted, marginBottom: 8 }}>Thèmes rapides</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {PRESETS.map((p) => (
          <button key={p.key} onClick={() => applyPreset(p)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 20, border: `1px solid ${p.accent === theme.accent && p.bg === theme.bg ? theme.accent : theme.border}`, background: "transparent", color: theme.text, fontSize: 12, cursor: "pointer" }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: p.accent, display: "inline-block", border: `1px solid ${p.bg}` }} />
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
        <ColorField label="Fond" value={theme.bg} onChange={setField("bg")} />
        <ColorField label="Accent" value={theme.accent} onChange={setField("accent")} />
        <ColorField label="Texte" value={theme.text} onChange={setField("text")} />
        <ColorField label="Bulle Orion" value={theme.bubbleAssistant} onChange={setField("bubbleAssistant")} />
        <ColorField label="Bulle toi" value={theme.bubbleUser} onChange={setField("bubbleUser")} />
        <ColorField label="Texte bulle toi" value={theme.bubbleUserText} onChange={setField("bubbleUserText")} />
      </div>

      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: theme.textMuted, margin: "14px 0 8px" }}>Police</div>
      <select value={theme.font} onChange={(e) => setField("font")(e.target.value)} style={{ width: "100%", background: theme.panelLight, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "8px 10px", color: theme.text, fontSize: 13 }}>
        {FONTS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
      </select>

      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: theme.textMuted, margin: "14px 0 8px" }}>Fond de la conversation</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => fileRef.current?.click()} style={{ background: theme.panelLight, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "8px 12px", color: theme.text, fontSize: 12.5, cursor: "pointer" }}>Choisir une photo</button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
        {theme.chatBgImage && (
          <button onClick={() => setField("chatBgImage")(null)} style={{ background: "none", border: `1px solid ${theme.border}`, borderRadius: 8, padding: "8px 12px", color: theme.textMuted, fontSize: 12.5, cursor: "pointer" }}>Retirer</button>
        )}
      </div>
      {theme.chatBgImage && (
        <label style={{ display: "block", fontSize: 12, color: theme.textMuted, marginTop: 10 }}>
          Assombrir pour la lisibilité
          <input type="range" min="0" max="0.9" step="0.05" value={theme.chatBgDim} onChange={(e) => setField("chatBgDim")(parseFloat(e.target.value))} style={{ width: "100%" }} />
        </label>
      )}
    </div>
  );
}

export default function OrionApp() {
  const [tab, setTab] = useState("chat");
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [projects, setProjects] = useState([]);
  const [showNewProject, setShowNewProject] = useState(false);
  const [genLoadingId, setGenLoadingId] = useState(null);
  const [panel, setPanel] = useState(null);
  const [ready, setReady] = useState(false);
  const scrollRef = useRef(null);

  const fontDef = FONTS.find((f) => f.key === theme.font) || FONTS[0];
  const activeTheme = { ...theme, displayFont: fontDef.display, bodyFont: fontDef.body };

  useEffect(() => {
    setProfile(storageGet("orion-profile", EMPTY_PROFILE));
    setTheme((prev) => ({ ...prev, ...storageGet("orion-theme", {}) }));
    const savedMessages = storageGet("orion-messages", null);
    setMessages(savedMessages || [{
      role: "assistant",
      content: "Salut, moi c'est Orion 👋 Je vais être un peu ton confident, ton pote qui te relance de temps en temps. Pas d'interrogatoire, promis. Pour commencer tranquille : c'était comment ta journée ?",
    }]);
    setProjects(storageGet("orion-projects", []));
    setReady(true);
  }, []);

  useEffect(() => { if (ready) storageSet("orion-profile", profile); }, [profile, ready]);
  useEffect(() => { if (ready) storageSet("orion-theme", theme); }, [theme, ready]);
  useEffect(() => { if (ready) storageSet("orion-messages", messages.slice(-60)); }, [messages, ready]);
  useEffect(() => { if (ready) storageSet("orion-projects", projects); }, [projects, ready]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, sending]);

  const runExtraction = useCallback(async (userMsg, assistantMsg) => {
    try {
      const text = await callAI({ system: EXTRACT_SYSTEM, messages: [{ role: "user", content: `Utilisateur : ${userMsg}\nOrion : ${assistantMsg}` }], useSearch: false });
      const parsed = parseJsonLoose(text);
      if (!parsed) return;
      setProfile((prev) => {
        const next = { ...prev, facts: { ...prev.facts }, avoided: [...prev.avoided] };
        (parsed.newFacts || []).forEach((f) => {
          if (!next.facts[f.category]) next.facts[f.category] = [];
          if (!next.facts[f.category].includes(f.fact)) next.facts[f.category].push(f.fact);
        });
        if (parsed.avoidedTopic) next.avoided.push({ topic: parsed.avoidedTopic, resolved: false });
        if (parsed.resolvedAvoidedTopic) next.avoided = next.avoided.map((a) => a.topic === parsed.resolvedAvoidedTopic ? { ...a, resolved: true } : a);
        return next;
      });
      if (parsed.projectSuggestion) {
        setProjects((prev) => {
          const exists = prev.some((p) => p.type === parsed.projectSuggestion.type && !p.details);
          if (exists) return prev;
          return [...prev, { id: Date.now().toString(), type: parsed.projectSuggestion.type, title: parsed.projectSuggestion.hint || "Nouvelle sortie", city: profile.ville || "à préciser", details: null }];
        });
      }
    } catch {}
  }, [profile.ville]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;
    setErrorMsg(null);
    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setSending(true);
    try {
      const text2 = await callAI({
        system: buildSystemPrompt(profile),
        messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        useSearch: true,
      });
      const reply = text2 || "Hmm, j'ai eu un souci pour répondre, tu peux répéter ?";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      runExtraction(text, reply);
    } catch (e) {
      setErrorMsg(String(e.message || e));
      setMessages((prev) => [...prev, { role: "assistant", content: "Désolé, petit souci de connexion de mon côté — tu peux réessayer ?" }]);
    } finally {
      setSending(false);
    }
  }

  async function generateProjectDetails(project) {
    setGenLoadingId(project.id);
    const city = project.city && project.city !== "à préciser" ? project.city : (profile.ville || "Lille");
    let prompt;
    if (project.type === "cinema") {
      prompt = `Cherche un film actuellement à l'affiche qui correspondrait à : "${project.title}", et un cinéma proche de ${city}. Donne un prix de place estimé${profile.age ? ` pour une personne de ${profile.age} ans` : ""}. Réponds UNIQUEMENT avec ce JSON, sans texte autour : {"film":"...", "cinema":"...", "prix":"...", "horaires":"..."}`;
    } else if (project.type === "musee") {
      prompt = `Cherche un musée intéressant à ${city} en lien avec : "${project.title}", avec son exposition actuelle si possible. Donne un prix estimé${profile.age ? ` pour une personne de ${profile.age} ans` : ""}. Réponds UNIQUEMENT avec ce JSON, sans texte autour : {"nom":"...", "expo":"...", "prix":"...", "horaires":"..."}`;
    } else {
      prompt = `Propose un week-end (2 jours) à faire près de ${city}, en lien avec : "${project.title}". Réponds UNIQUEMENT avec ce JSON, sans texte autour : {"destination":"...", "itinerary":[{"title":"Jour 1 — ...","activities":["...","..."]},{"title":"Jour 2 — ...","activities":["...","..."]}], "budget":"..."}`;
    }
    try {
      const text3 = await callAI({
        system: "Tu es un assistant de recherche factuel. Utilise la recherche web si utile, puis réponds strictement au format JSON demandé, sans aucun texte autour, sans backticks.",
        messages: [{ role: "user", content: prompt }],
        useSearch: true,
      });
      const parsed = parseJsonLoose(text3);
      if (parsed) setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, details: parsed, city } : p)));
    } catch {}
    setGenLoadingId(null);
  }

  function createProject(type, title, city) {
    setProjects((prev) => [...prev, { id: Date.now().toString(), type, title, city: city || profile.ville || "à préciser", details: null }]);
    setShowNewProject(false);
  }

  if (!ready) {
    return <div style={{ background: DEFAULT_THEME.bg, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: DEFAULT_THEME.textMuted, fontFamily: "sans-serif" }}>Chargement...</div>;
  }

  const chatBgStyle = activeTheme.chatBgImage
    ? { backgroundImage: `linear-gradient(rgba(0,0,0,${activeTheme.chatBgDim}), rgba(0,0,0,${activeTheme.chatBgDim})), url(${activeTheme.chatBgImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : {};

  return (
    <div style={{ background: activeTheme.bg, minHeight: "100vh", color: activeTheme.text, fontFamily: activeTheme.bodyFont, display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Playfair+Display:wght@500;700&family=Poppins:wght@400;500;600&family=Quicksand:wght@400;500;600&family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::placeholder { color: ${activeTheme.textMuted}; }
        .orion-scroll::-webkit-scrollbar { width: 5px; }
        .orion-scroll::-webkit-scrollbar-thumb { background: ${activeTheme.border}; border-radius: 4px; }
      `}</style>

      <div style={{ padding: "18px 18px 12px", borderBottom: `1px solid ${activeTheme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: activeTheme.accent, boxShadow: `0 0 8px ${activeTheme.accent}` }} />
          <span style={{ fontFamily: activeTheme.displayFont, fontSize: 22, letterSpacing: 0.5 }}>Orion</span>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <button onClick={() => setPanel(panel === "customize" ? null : "customize")} style={{ background: "none", border: "none", color: activeTheme.accent, fontSize: 12.5, cursor: "pointer" }}>Personnaliser</button>
          <button onClick={() => setPanel(panel === "profile" ? null : "profile")} style={{ background: "none", border: "none", color: activeTheme.textMuted, fontSize: 12.5, cursor: "pointer" }}>Ce qu'Orion sait</button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ background: "#4a1f1f", color: "#f2c9c9", fontSize: 12.5, padding: "8px 16px" }}>
          Erreur : {errorMsg} — vérifie que GEMINI_API_KEY est bien configurée sur Vercel.
        </div>
      )}

      {panel === "customize" && <CustomizePanel theme={activeTheme} setTheme={setTheme} />}

      {panel === "profile" && (
        <div style={{ padding: 16, borderBottom: `1px solid ${activeTheme.border}`, background: activeTheme.panel, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Constellation profile={profile} theme={activeTheme} />
          <div style={{ display: "flex", gap: 10, marginTop: 8, width: "100%", maxWidth: 300 }}>
            <input placeholder="Ta ville" defaultValue={profile.ville || ""} onBlur={(e) => setProfile((p) => ({ ...p, ville: e.target.value }))} style={{ flex: 1, background: activeTheme.panelLight, border: `1px solid ${activeTheme.border}`, borderRadius: 8, padding: "7px 10px", color: activeTheme.text, fontSize: 12.5 }} />
            <input placeholder="Ton âge" type="number" defaultValue={profile.age || ""} onBlur={(e) => setProfile((p) => ({ ...p, age: e.target.value }))} style={{ width: 80, background: activeTheme.panelLight, border: `1px solid ${activeTheme.border}`, borderRadius: 8, padding: "7px 10px", color: activeTheme.text, fontSize: 12.5 }} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", borderBottom: `1px solid ${activeTheme.border}` }}>
        {[["chat", "Discussion"], ["projects", "Projets"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: "12px 0", background: "none", border: "none", cursor: "pointer", color: tab === key ? activeTheme.accent : activeTheme.textMuted, borderBottom: tab === key ? `2px solid ${activeTheme.accent}` : "2px solid transparent", fontSize: 14, fontWeight: 500 }}>
            {label}{key === "projects" && projects.length ? ` (${projects.length})` : ""}
          </button>
        ))}
      </div>

      {tab === "chat" ? (
        <>
          <div ref={scrollRef} className="orion-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", ...chatBgStyle }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                <div style={{
                  maxWidth: "78%", padding: "10px 14px", borderRadius: 16,
                  background: m.role === "user" ? activeTheme.bubbleUser : activeTheme.bubbleAssistant,
                  color: m.role === "user" ? activeTheme.bubbleUserText : activeTheme.bubbleAssistantText,
                  fontSize: 14.5, lineHeight: 1.5,
                  borderBottomRightRadius: m.role === "user" ? 4 : 16,
                  borderBottomLeftRadius: m.role === "user" ? 16 : 4,
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {sending && <div style={{ color: activeTheme.textMuted, fontSize: 13, fontStyle: "italic", padding: "0 6px" }}>Orion écrit...</div>}
          </div>
          <div style={{ display: "flex", gap: 8, padding: 14, borderTop: `1px solid ${activeTheme.border}` }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Écris à Orion..." style={{ flex: 1, background: activeTheme.panelLight, border: `1px solid ${activeTheme.border}`, borderRadius: 20, padding: "10px 16px", color: activeTheme.text, fontSize: 14.5, outline: "none" }} />
            <button onClick={sendMessage} disabled={sending} style={{ background: activeTheme.accent, border: "none", borderRadius: 20, padding: "0 20px", color: activeTheme.bubbleUserText, fontWeight: 600, cursor: "pointer" }}>↑</button>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {projects.length === 0 && !showNewProject && (
            <p style={{ color: activeTheme.textMuted, fontSize: 14, textAlign: "center", marginTop: 30 }}>Aucun projet pour l'instant. Parle d'une envie de sortie à Orion dans la discussion, ou crée-en un ici.</p>
          )}
          {projects.map((p) => <ProjectCard key={p.id} project={p} onGenerate={generateProjectDetails} loading={genLoadingId === p.id} theme={activeTheme} />)}
          {!showNewProject ? (
            <button onClick={() => setShowNewProject(true)} style={{ width: "100%", background: "none", border: `1px dashed ${activeTheme.border}`, borderRadius: 12, padding: 14, color: activeTheme.accent, cursor: "pointer", fontSize: 13.5 }}>+ Nouveau projet</button>
          ) : (
            <NewProjectForm onCreate={createProject} onCancel={() => setShowNewProject(false)} defaultCity={profile.ville} theme={activeTheme} />
          )}
        </div>
      )}
    </div>
  );
}
