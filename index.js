const express = require("express");
const crypto = require("crypto");
const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));

const app = express();
app.use(express.json());

const PIXEL_ID = "2000845004161849";
const ACCESS_TOKEN = "EAA51UoE82scBRG3csnZCvDs47npJEngQatAfjEhITZCPlxu8XHgbXktjSIZAI16xY7AEaRbrE66GFL5KhwDoyay1OUFFRKCq1rpawZBd3tFZCVmEr3BqgHnUa9mYMjZAQB3JMDrkmMo56edA0WrOTZADpZBrN2UK57EWy9uF2v2CUF72ulcgzwZBWn1dQXDL3ivRiFwZDZD";

const ETAPA_LEAD = "continuou a conversa";
const ETAPA_COMPRA = "agendado";

function hashSHA256(value) {
  if (!value) return null;
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

async function enviarEventoMeta(eventName, phone, email, value = 0) {
  const userData = {};
  if (phone) userData.ph = hashSHA256(phone.replace(/\D/g, ""));
  if (email) userData.em = hashSHA256(email);

  const payload = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: "other",
      user_data: userData,
      custom_data: { value: value, currency: "BRL" },
    }],
    access_token: ACCESS_TOKEN,
  };

  const res = await fetch(`https://graph.facebook.com/v19.0/${PIXEL_ID}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  console.log(`Evento "${eventName}" enviado:`, JSON.stringify(data));
  return data;
}

app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;
    console.log("Webhook recebido:", JSON.stringify(body));
    const leads = body?.leads?.update || [];
    const contacts = body?.contacts?.update || body?.contacts?.add || [];

    for (const lead of leads) {
      const etapaNome = (lead.status || "").toLowerCase();
      let phone = null, email = null;
      const value = lead.price || 0;

      if (contacts.length > 0) {
        const customFields = contacts[0].custom_fields || [];
        for (const field of customFields) {
          if (field.code === "PHONE") phone = field.values?.[0]?.value;
          if (field.code === "EMAIL") email = field.values?.[0]?.value;
        }
      }

      if (etapaNome.includes(ETAPA_LEAD)) {
        await enviarEventoMeta("Lead", phone, email, value);
      } else if (etapaNome.includes(ETAPA_COMPRA)) {
        await enviarEventoMeta("Purchase", phone, email, value);
      }
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erro:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => res.send("Kommo → Meta CAPI rodando ✅"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
