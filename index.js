const express = require("express");
const crypto = require("crypto");
const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PIXEL_ID = process.env.PIXEL_ID;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

function hashSHA256(value) {
  if (!value) return null;
  return crypto.createHash("sha256").update(String(value).trim().toLowerCase()).digest("hex");
}

async function enviarEventoMeta(eventName, contactData, value) {
  const userData = {};

  if (contactData.phone) {
    const phoneClean = String(contactData.phone).replace(/\D/g, "");
    userData.ph = hashSHA256(phoneClean);
  }

  if (contactData.email && contactData.email !== "null") {
    userData.em = hashSHA256(contactData.email);
  }

  if (contactData.firstName) {
    userData.fn = hashSHA256(contactData.firstName);
  }

  if (contactData.lastName) {
    userData.ln = hashSHA256(contactData.lastName);
  }

  if (contactData.id) {
    userData.external_id = hashSHA256(String(contactData.id));
  }

  const payload = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventName + "_" + contactData.id,
      action_source: "system_generated",
      user_data: userData,
      custom_data: {
        value: Number(value) || 0,
        currency: "BRL",
      },
    }],
    access_token: ACCESS_TOKEN,
  };

  console.log("Payload enviado:", JSON.stringify(payload, null, 2));

  const res = await fetch("https://graph.facebook.com/v19.0/" + PIXEL_ID + "/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  console.log("Evento " + eventName + " enviado:", JSON.stringify(data));
  return data;
}

app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    const eventName = body.event_name || "Lead";
    const value = body.value || 0;

    const contactData = {
      id: body.contact_id,
      phone: body.phone,
      email: body.email,
      firstName: body.first_name,
      lastName: body.last_name,
    };

    console.log("Dados recebidos no Servidor:", JSON.stringify(body));

    await enviarEventoMeta(eventName, contactData, value);

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erro:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => res.send("Respond.io Meta CAPI rodando"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando na porta " + PORT));
