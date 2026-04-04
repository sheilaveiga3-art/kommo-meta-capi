const express = require("express");
const crypto = require("crypto");
const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PIXEL_ID = "2000845004161849";
const ACCESS_TOKEN = "EAA51UoE82scBRBNFpaoDAJ3LXlgYcVdKZC27ndZBMuwOWLZB3cg3PnFXE8XakpbO9qxBqZCPgeZBCbm3wDUuYtymLeczz6HyMR9exZCEAJZCMbZBY3iNefJUnZCZClJShfZAIrIxmwRtXgoO6vtE4MixI5KVD7WZAPO2jyf0RcfgJo2kwk4EKS1BSQKFUdnKbL1t7PDuBAZDZD";
const KOMMO_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjhkYmMxNGUxZDM2OGQ1NDc5Njg1YzM0Mzc4Nzg5OWY2MDFlODViZGFkOWUzMDg0YTQwZGYzYjhkMzFkYmMyN2M4NjhhNDQ2M2RlMTcyZjBmIn0.eyJhdWQiOiJmNjk0OWUxOC1lMjBjLTRiZGQtYmRjOS1iNjdhMDI3OTQ1ODMiLCJqdGkiOiI4ZGJjMTRlMWQzNjhkNTQ3OTY4NWMzNDM3ODc4OTlmNjAxZTg1YmRhZDllMzA4NGE0MGRmM2I4ZDMxZGJjMjdjODY4YTQ0NjNkZTE3MmYwZiIsImlhdCI6MTc3NTMzNjgwMCwibmJmIjoxNzc1MzM2ODAwLCJleHAiOjE5Mjc2NzA0MDAsInN1YiI6IjEzNDEwNDYzIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjM0Nzg0NzQzLCJiYXNlX2RvbWFpbiI6ImtvbW1vLmNvbSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJwdXNoX25vdGlmaWNhdGlvbnMiLCJmaWxlcyIsImNybSIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiMTE3NjQxZGItMTc2Yi00ZDFiLTg5MmQtZWU0N2JmMTM4MGQyIiwiYXBpX2RvbWFpbiI6ImFwaS1nLmtvbW1vLmNvbSJ9.Nfl2Ibb0uj6cxOrVFCSYHNG85zBo9OM-lnZKtcj2DO-Y-QOrhVX-2mrzvlMoJ7Fjq5tADDTQwaDKMg46bNeytEDeTNg2PXi_SHwGXXeVi7HGVByJBpwB_gY9fgPem_Ndy6juPIjUn3RI3yGXtORQcKoejjH_3QJ4VGt_WZyq6BXXv8sG_OQj0JSmw0-9qLCQURXyE7BQj4GKdojJiz-QKEer2qK-xktvPAbrnWIhyhNNcJwh-lauOlbDLvwvcA4kEk6M78b5C6tbzaV8JMqwWNDNTug3C7NctV6OggssuzAGMQb6namDNceBDoV_-qmONCupJ2euAGIMvulFZJH12Q";

const IDS_LEAD = ["143", "93105455"];
const IDS_COMPRA = ["87758783"];

function hashSHA256(value) {
  if (!value) return null;
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

async function buscarContatoKommo(leadId) {
  try {
    const urlLead = "https://adrianoveiga3.kommo.com/api/v4/leads/" + leadId + "?with=contacts";
    const resLead = await fetch(urlLead, {
      headers: { "Authorization": "Bearer " + KOMMO_TOKEN }
    });
    const textLead = await resLead.text();
    const dataLead = JSON.parse(textLead);

    const contactId = dataLead._embedded && dataLead._embedded.contacts && dataLead._embedded.contacts[0]
      ? dataLead._embedded.contacts[0].id : null;

    if (!contactId) return {};

    const urlContact = "https://adrianoveiga3.kommo.com/api/v4/contacts/" + contactId;
    const resContact = await fetch(urlContact, {
      headers: { "Authorization": "Bearer " + KOMMO_TOKEN }
    });
    const textContact = await resContact.text();
    const contact = JSON.parse(textContact);

    let phone = null, email = null, firstName = null, lastName = null;
    firstName = contact.first_name || null;
    lastName = contact.last_name || null;

    const fields = contact.custom_fields_values || [];
    for (const field of fields) {
      if (field.field_code === "PHONE" && field.values && field.values[0]) {
        phone = field.values[0].value;
      }
      if (field.field_code === "EMAIL" && field.values && field.values[0]) {
        email = field.values[0].value;
      }
    }

    return { phone, email, firstName, lastName };
  } catch (err) {
    console.error("Erro ao buscar contato:", err.message);
    return {};
  }
}

async function enviarEventoMeta(eventName, contactData, value) {
  const userData = {};
  if (contactData.phone) userData.ph = hashSHA256(String(contactData.phone).replace(/\D/g, ""));
  if (contactData.email) userData.em = hashSHA256(contactData.email);
  if (contactData.firstName) userData.fn = hashSHA256(contactData.firstName);
  if (contactData.lastName) userData.ln = hashSHA256(contactData.lastName);

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

app.post("/webhook", async (req, res) => {
  try {
    const raw = Object.assign({}, req.query, req.body);
    const leadsArray = (raw.leads && raw.leads.status) ? raw.leads.status : [];
    const processados = new Set();

    for (const lead of leadsArray) {
      const statusId = String(lead.status_id || "");
      const leadId = lead.id;
      const price = lead.price || 0;

      if (processados.has(leadId)) continue;

      console.log("statusId:", statusId, "leadId:", leadId);

      if (IDS_LEAD.includes(statusId) || IDS_COMPRA.includes(statusId)) {
        processados.add(leadId);
        const contactData = await buscarContatoKommo(leadId);
        console.log("Dados contato:", JSON.stringify(contactData));

        if (IDS_LEAD.includes(statusId)) {
          console.log("Disparando Lead");
          await enviarEventoMeta("Lead", contactData, price);
        } else {
          console.log("Disparando Purchase");
          await enviarEventoMeta("Purchase", contactData, price);
        }
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
