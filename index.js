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

const IDS_LEAD = ["93105455"];
const IDS_COMPRA = ["87758783"];

// ID do Pixel para gerar fbp consistente
const PIXEL_ID_SHORT = "2000845004161849";

function hashSHA256(value) {
  if (!value) return null;
  return crypto.createHash("sha256").update(String(value).trim().toLowerCase()).digest("hex");
}

// Gera um fbp sintético baseado no leadId (para leads via WhatsApp que não têm cookie)
function gerarFbp(leadId) {
  const version = "fb";
  const subdomainIndex = 1;
  const creationTime = Math.floor(Date.now() / 1000);
  const randomNumber = parseInt(String(leadId).slice(-8)) || Math.floor(Math.random() * 1e10);
  return `${version}.${subdomainIndex}.${creationTime}.${randomNumber}`;
}

// Gera fbc a partir do ad_id do Meta (se disponível nos campos do Kommo)
function gerarFbc(fbclid, leadId) {
  if (!fbclid) return null;
  const version = "fb";
  const subdomainIndex = 1;
  const creationTime = Math.floor(Date.now() / 1000);
  return `${version}.${subdomainIndex}.${creationTime}.${fbclid}`;
}

async function buscarContatoKommo(leadId) {
  try {
    const urlLead = "https://adrianoveiga3.kommo.com/api/v4/leads/" + leadId + "?with=contacts";
    const resLead = await fetch(urlLead, {
      headers: { "Authorization": "Bearer " + KOMMO_TOKEN }
    });
    const textLead = await resLead.text();
    const dataLead = JSON.parse(textLead);

    // Pega campos personalizados do lead (para buscar fbclid se você salvar lá)
    const leadCustomFields = dataLead.custom_fields_values || [];
    let fbclid = null;
    let utmSource = null;
    let utmCampaign = null;

    for (const field of leadCustomFields) {
      const name = (field.field_name || "").toLowerCase();
      if (name.includes("fbclid") && field.values && field.values[0]) {
        fbclid = field.values[0].value;
      }
      if (name.includes("utm_source") && field.values && field.values[0]) {
        utmSource = field.values[0].value;
      }
      if (name.includes("utm_campaign") && field.values && field.values[0]) {
        utmCampaign = field.values[0].value;
      }
    }

    const contactId = dataLead._embedded && dataLead._embedded.contacts && dataLead._embedded.contacts[0]
      ? dataLead._embedded.contacts[0].id : null;

    if (!contactId) return { fbclid, utmSource, utmCampaign };

    const urlContact = "https://adrianoveiga3.kommo.com/api/v4/contacts/" + contactId;
    const resContact = await fetch(urlContact, {
      headers: { "Authorization": "Bearer " + KOMMO_TOKEN }
    });
    const textContact = await resContact.text();
    const contact = JSON.parse(textContact);

    const nomeCompleto = contact.first_name || "";
    const partes = nomeCompleto.trim().split(" ");
    const firstName = partes[0] || null;
    const lastName = partes.length > 1 ? partes.slice(1).join(" ") : null;

    let phone = null, email = null;

    const fields = contact.custom_fields_values || [];
    for (const field of fields) {
      if (field.field_code === "PHONE" && field.values && field.values[0]) {
        phone = field.values[0].value;
      }
      if (field.field_code === "EMAIL" && field.values && field.values[0]) {
        email = field.values[0].value;
      }
    }

    return { phone, email, firstName, lastName, fbclid, utmSource, utmCampaign };
  } catch (err) {
    console.error("Erro ao buscar contato:", err.message);
    return {};
  }
}

async function enviarEventoMeta(eventName, contactData, leadId, value, reqData = {}) {
  const userData = {};

  // Telefone — já estava 100%, mantém
  if (contactData.phone) {
    const phoneClean = String(contactData.phone).replace(/\D/g, "");
    userData.ph = hashSHA256(phoneClean);
  }

  // Email
  if (contactData.email) {
    userData.em = hashSHA256(contactData.email);
  }

  // Nome e sobrenome
  if (contactData.firstName) {
    userData.fn = hashSHA256(contactData.firstName);
  }
  if (contactData.lastName) {
    userData.ln = hashSHA256(contactData.lastName);
  }

  // External ID
  userData.external_id = hashSHA256(String(leadId));

  // 🆕 fbp — identificador do navegador (gerado sinteticamente para WhatsApp)
  userData.fbp = gerarFbp(leadId);

  // 🆕 fbc — identificador de clique (usa fbclid se disponível no Kommo)
  const fbc = gerarFbc(contactData.fbclid, leadId);
  if (fbc) {
    userData.fbc = fbc;
  }

  // 🆕 IP do cliente (se vier via webhook com IP)
  if (reqData.ip) {
    userData.client_ip_address = reqData.ip;
  }

  // 🆕 User agent (se vier via webhook)
  if (reqData.userAgent) {
    userData.client_user_agent = reqData.userAgent;
  }

  const payload = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventName + "_" + leadId,
      action_source: "system_generated",
      user_data: userData,
      custom_data: {
        value: value || 0,
        currency: "BRL",
        // 🆕 UTMs se disponíveis
        ...(contactData.utmSource && { utm_source: contactData.utmSource }),
        ...(contactData.utmCampaign && { utm_campaign: contactData.utmCampaign }),
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
    const raw = Object.assign({}, req.query, req.body);
    const leadsArray = (raw.leads && raw.leads.status) ? raw.leads.status : [];
    const processados = new Set();

    // Captura IP e User-Agent do webhook
    const reqData = {
      ip: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || null,
      userAgent: req.headers["user-agent"] || null,
    };

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
          await enviarEventoMeta("Lead", contactData, leadId, price, reqData);
        } else {
          console.log("Disparando Purchase");
          await enviarEventoMeta("Purchase", contactData, leadId, price, reqData);
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
