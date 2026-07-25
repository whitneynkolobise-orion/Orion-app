export async function POST(req) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "GEMINI_API_KEY manquante sur le serveur." }, { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { system, messages, useSearch } = body || {};
  if (!messages) {
    return Response.json({ error: "Champ 'messages' manquant." }, { status: 400 });
  }

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const payload = {
    contents,
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    ...(useSearch ? { tools: [{ google_search: {} }] } : {}),
    generationConfig: { maxOutputTokens: 1000 },
  };

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      return Response.json({ error: data?.error?.message || "Erreur API Gemini." }, { status: res.status });
    }
    const text = (data.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || "")
      .join("\n")
      .trim();
    return Response.json({ text });
  } catch (e) {
    return Response.json({ error: "Impossible de contacter l'API Gemini." }, { status: 502 });
  }
}
