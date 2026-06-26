const express = require("express");
const crypto = require("crypto");
const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PIXEL_ID = process.env.PIXEL_ID;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PAGE_ID = process.env.PAGE_ID;

function hashSHA256(value) {
  if (!value) return null;
  return crypto.createHash("sha256").update(String(value).trim().toLowerCase()).digest("hex");
}

async function enviarEventoMeta(eventName, contactData, value, ctwaClid) {
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

  if (PAGE_
