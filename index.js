const express = require("express");
const crypto = require("crypto");
const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));

const app = express();
app.use(express.json());

const PIXEL_ID = process.env.PIXEL_ID;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "veigaproducoes2024";

function hashSHA256(value) {
  if (!value) return null;
  return crypto.createHash("sha256").update(String(value).trim().toLowerCase()).digest("hex");
}

// Verificação do webhook pela Meta
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificado com sucesso");
    res.status(200).send(challenge);
  } else {
    res.status(403).send("Token inválido");
  }
});

// Recebe mensagens da Meta Cloud API
app.post("/webhook", async (req, res) => {
  try {
    res.status(200).send("OK");

    const body = req.body;
    if (body.object !== "whatsapp_business_account") return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value || !value.messages) continue;

        for (const message of value.messages) {
          const phone = message.from;
          const ctwa_clid = message.referral?.ctwa_clid;
          const sourceUrl = message.referral?.source_url;

          // Só processa mensagens que vieram de anúncio
          if (!ctwa_clid) {
            console.log("Mensagem sem ctwa_clid, ignorando.");
            continue;
          }

          const contact = (value.contacts || [])[0];
          const fullName = contact?.profile?.name || "";
          const nameParts = fullName.trim().split(" ");
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";

          const userData = {
            ph: hashSHA256(phone),
            ctwa_clid: ctwa_clid,
          };

          if (firstName) userData.fn = hashSHA256(firstName);
          if (lastName) userData.ln = hashSHA256(lastName);

          const payload = {
            data: [{
              event_name: "Lead",
              event_time: Math.floor(Date.now() / 1000),
              event_id: "lead_" + phone + "_" + Date.now(),
              action_source: "business_messaging",
              messaging_channel: "whatsapp",
              user_data: userData,
            }],
            access_token: ACCESS_TOKEN,
          };

          console.log("Enviando Lead para Meta CAPI:", JSON.stringify(payload, null, 2));

          const apiRes = await fetch(
            "https://graph.facebook.com/v19.0/" + PIXEL_ID + "/events",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }
          );

          const data = await apiRes.json();
          console.log("Resposta Meta CAPI:", JSON.stringify(data));
        }
      }
    }
  } catch (err) {
    console.error("Erro:", err);
  }
});

app.get("/", (req, res) => res.send("Veiga Produções Meta CAPI rodando"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando na porta " + PORT));
