"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function createClientMessagingStore({ filePath, now = () => new Date().toISOString() }) {
  const read = () => fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : { conversations: [], messages: [] };
  function write(data) { fs.mkdirSync(path.dirname(filePath), { recursive: true }); const tmp = `${filePath}.${process.pid}.tmp`; fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 }); fs.renameSync(tmp, filePath); }
  function conversationFor(clientUserId, staffUserId, create = false) { const data = read(); let value = data.conversations.find(c => c.clientUserId === clientUserId && c.participantStaffIds.includes(staffUserId)); if (!value && create) { const at = now(); value = { id: crypto.randomUUID(), clientUserId, participantStaffIds: [staffUserId], createdAt: at, updatedAt: at }; data.conversations.push(value); write(data); } return value || null; }
  const getConversation = id => read().conversations.find(c => c.id === id) || null;
  const listForUser = userId => read().conversations.filter(c => c.clientUserId === userId || c.participantStaffIds.includes(userId));
  function listMessages(conversationId) { return read().messages.filter(m => m.conversationId === conversationId).sort((a,b) => a.createdAt.localeCompare(b.createdAt)); }
  function addMessage(conversationId, senderUserId, body) { const data = read(), at = now(); const message = { id: crypto.randomUUID(), conversationId, senderUserId, body, createdAt: at, readAt: null }; data.messages.push(message); const conversation = data.conversations.find(c => c.id === conversationId); conversation.updatedAt = at; write(data); return message; }
  function markRead(conversationId, readerUserId) { const data = read(); let count = 0; for (const m of data.messages) if (m.conversationId === conversationId && m.senderUserId !== readerUserId && !m.readAt) { m.readAt = now(); count++; } if (count) write(data); return count; }
  return { conversationFor, getConversation, listForUser, listMessages, addMessage, markRead };
}
module.exports = { createClientMessagingStore };
