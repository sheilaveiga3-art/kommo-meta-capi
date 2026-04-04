const express = require("express");
const crypto = require("crypto");
const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    const raw = req.body;
    console​​​​​​​​​​​​​​​​
