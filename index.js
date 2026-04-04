const express = require("express");
const crypto = require("crypto");
const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PIXEL_ID = "2000845004161849";
const ACCESS_TOKEN = "EAA51UoE82scBRBNFpaoDAJ3LXlgYcVdKZC27ndZBMuwOWLZB3cg3PnFXE8XakpbO9qxBqZCPgeZBCbm3wDUuYtymLeczz6HyMR9exZCEAJZCMbZBY3iNefJUnZCZClJShfZAIrIxmwRtXgoO6vtE4MixI5KVD7WZAPO2jyf0RcfgJo2kwk4EKS1BSQKFUdnKbL1t7PDuBAZDZD";

const ID_LEAD = "142";
const ID_COMPRA = "93105455";

function hashSHA256(value) {
  if (!value) return null;
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

async function enviarEventoMeta(eventName, phone, value) {
  const userData = {};
  if (phone) userData.ph = hashSHA256(String(phone).replace(/\D/g, ""));

  const payload = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: "other",
      user_data: userData,
      custom_data: { value: value || 0, currency: "BRL" },
    }],
    access_token: ACCESS_TOKEN,
  };

  const res = await fetch("https://graph.facebook.com/v19.0/" + PIXEL_ID + "/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  console.log("Evento " + eventName + " enviado:", JSON.stringify(data));
  return data;
}

function extrairTelefone(raw) {
  try {
    const contacts = raw.contacts && raw.contacts.update ? raw.contacts.update : [];
    for (const contact of contacts) {
      if (contact.custom_fields) {
        for (const field of contact.custom_fields) {
          if (field.code === "PHONE" && field.values && field.values[0]) {
            return field.values[0].value;
          }
        }
      }
    }
    // tenta pegar do nome do lead (WhatsApp às vezes coloca o número)
    const leads = raw.leads && raw.leads.status ? raw.leads.status : [];
    for (const lead of leads) {
      if (lead.name && lead.name.match(/\d{8,}/)) return lead.name;
    }
  } catch(e) {}
  return null;
}

app.post("/webhook", async (req, res) => {
  try {
    const raw = Object.assign({}, req.query, req.body);
    console.log("RAW:", JSON.stringify(raw));

    const leadsArray = (raw.leads && raw.leads.status) ? raw.leads.status : [];
    const phone = extrairTelefone(raw);

    console.log("leadsArray:", JSON.stringify(leadsArray));
    console.log("phone extraido:", phone);

    for (const lead of leadsArray) {
      const statusId = String(lead.status_id || "");
      const price = lead.price || 0;

      console.log("statusId:", statusId);

      if (statusId === ID_LEAD) {
        console.log("Disparando Lead");
        await enviarEventoMeta("Lead", phone, price);
      } else if (statusId === ID_COMPRA) {
        console.log("Disparando Purchase");
        await enviarEventoMeta("Purchase", phone, price);
      }
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erro:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => res.send("Kommo Meta CAPI rodando"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando na porta " + PORT));
