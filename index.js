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

function hashSHA256(value) {
  if (!value) return null;
  return crypto.createHash("sha256").update(String(value).trim().toLowerCase()).digest("hex");
}

function gerarFbp(leadId) {
  const version = "fb";
  const subdomainIndex = 1;
  const creationTime = Math.floor(Date.now() / 1000);
  const randomNumber = parseInt(String(leadId).slice(-8)) || Math.floor(Math.random() * 1e10);
  return `${version}.${subdomainIndex}.${creationTime}.${randomNumber}`;
}

function gerarFbc(fbclid, leadId) {
  if (!fbclid) return null;
  const version = "fb";
  const subdomainIndex = 1;
  const creationTime = Math.floor(Date.now() / 1000);
  return `${version}.${subdomainIndex}.${creationTime}.${fbclid}`;
}

async function buscarContatoKommo(leadId) {​​​​​​​​​​​​​​​​
