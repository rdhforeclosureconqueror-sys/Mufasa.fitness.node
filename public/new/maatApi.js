// maatApi.js — connector between front-end and Ma’at FastAPI backend
const MAAT_API = "https://YOUR-MAAT-SERVER.onrender.com"; // ← replace with your Render URL

export async function getProfile(userId) {
  const res = await fetch(`${MAAT_API}/users/profile/get?user_id=${userId}`);
  return res.json();
}

export async function saveProfile(profileData) {
  const res = await fetch(`${MAAT_API}/users/profile/upsert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profileData),
  });
  return res.json();
}

export async function generateProgram(req) {
  const res = await fetch(`${MAAT_API}/coach/program/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return res.json();
}

export async function listPrograms(userId) {
  const res = await fetch(`${MAAT_API}/coach/program/list?user_id=${userId}`);
  return res.json();
}

export async function askMaat(question, userId) {
  const res = await fetch(`${MAAT_API}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, user_id: userId }),
  });
  return res.json();
}
