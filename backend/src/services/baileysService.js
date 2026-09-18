const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const bus = require('../events');
const { evaluateTriggers, resumeAutomation } = require('../engine/automationEngine');
const agentRouter = require('./agentRouter');

// In-memory store for active Baileys sockets
const activeSockets = new Map();
// Emit QR codes to a temporary variable so the frontend can poll it
const qrCodes = new Map();

/**
 * Ensures the data directory exists
 */
function getSessionDir(displayPhoneNumber) {
  const baseDir = process.env.RIDEMITR_WA_DATA_DIR || path.join(__dirname, '../../data');
  const sessionDir = path.join(baseDir, `baileys_session_${displayPhoneNumber}`);
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
  return sessionDir;
}

/**
 * Initializes a Baileys WhatsApp Web socket for a given account.
 * `displayPhoneNumber` is used as the unique ID for the session folder.
 */
async function startBaileys(displayPhoneNumber, accountId) {
  const sessionDir = getSessionDir(displayPhoneNumber);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }), // change to info for debugging
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      qrCodes.set(displayPhoneNumber, qr);
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(`[Baileys] Connection closed for ${displayPhoneNumber}. Reconnect: ${shouldReconnect}`);
      if (shouldReconnect) {
        startBaileys(displayPhoneNumber, accountId);
      } else {
        // User logged out from their phone
        fs.rmSync(sessionDir, { recursive: true, force: true });
        qrCodes.delete(displayPhoneNumber);
        activeSockets.delete(displayPhoneNumber);
        
        try {
          await pool.query(
            `UPDATE coexistence.whatsapp_accounts SET health_status = 'invalid_token', last_error_message = 'Logged out from device', last_error_at = NOW() WHERE id = $1`,
            [accountId]
          );
        } catch(e) {
          console.error('[Baileys] Error updating DB on logout', e);
        }
      }
    } else if (connection === 'open') {
      console.log(`[Baileys] Opened connection for ${displayPhoneNumber}`);
      qrCodes.delete(displayPhoneNumber);
      // Wait until connection is open before storing
      activeSockets.set(displayPhoneNumber, sock);
      
      try {
        await pool.query(
          `UPDATE coexistence.whatsapp_accounts SET health_status = 'healthy', last_success_at = NOW(), last_error_message = NULL, is_active = true WHERE id = $1`,
          [accountId]
        );
      } catch(e) {
        console.error('[Baileys] Error updating DB on connection open', e);
      }
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    if (m.type !== 'notify') return;
    for (const msg of m.messages) {
      if (!msg.message) continue; // system message or stub
      if (msg.key.fromMe) continue; // Outgoing message

      const remoteJid = msg.key.remoteJid;
      // Skip group messages for now
      if (remoteJid.endsWith('@g.us')) continue;
      
      const contactNum = remoteJid.split('@')[0];
      const messageId = msg.key.id;
      const pushName = msg.pushName || 'WhatsApp User';
      
      let messageType = 'unknown';
      let messageBody = null;
      
      if (msg.message.conversation) {
        messageType = 'text';
        messageBody = msg.message.conversation;
      } else if (msg.message.extendedTextMessage) {
        messageType = 'text';
        messageBody = msg.message.extendedTextMessage.text;
      } else if (msg.message.imageMessage) {
        messageType = 'image';
        messageBody = msg.message.imageMessage.caption || '';
      } else if (msg.message.videoMessage) {
        messageType = 'video';
        messageBody = msg.message.videoMessage.caption || '';
      }

      // Save to database
      try {
        await pool.query(
          `INSERT INTO coexistence.chat_history
            (message_id, phone_number_id, wa_number, contact_number, to_number,
             direction, message_type, message_body, raw_payload, status, timestamp)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
           ON CONFLICT (message_id) DO NOTHING`,
          [
            messageId, displayPhoneNumber, displayPhoneNumber, contactNum, displayPhoneNumber,
            'incoming', messageType, messageBody, JSON.stringify(msg), 'received'
          ]
        );

        // Upsert contact profile name
        await pool.query(
          `INSERT INTO coexistence.contacts (wa_number, contact_number, profile_name)
           VALUES ($1, $2, $3)
           ON CONFLICT (wa_number, contact_number)
           DO UPDATE SET profile_name = EXCLUDED.profile_name`,
          [displayPhoneNumber, contactNum, pushName]
        );
        
        // Let the system know about the incoming message
        bus.emit('message_received', { waNumber: displayPhoneNumber, contactNumber: contactNum, messageId });

        // Trigger engine
        const triggerCtx = {
          waNumber: displayPhoneNumber,
          contactNumber: contactNum,
          messageId: messageId,
          messageType: messageType,
          messageBody: messageBody,
          mediaUrl: null
        };
        const automationHandled = await evaluateTriggers(triggerCtx);
        if (automationHandled) continue;
        
        await resumeAutomation(displayPhoneNumber, contactNum, messageBody);
        
        // Evaluate AI Agents
        await agentRouter.processIncomingMessage({
          waNumber: displayPhoneNumber,
          contactNumber: contactNum,
          messageType,
          messageBody,
          mediaUrl: null,
          mediaMime: null,
          mediaFilename: null
        });

      } catch (err) {
        console.error('[Baileys] DB insert failed', err);
      }
    }
  });

  return sock;
}

/**
 * Returns the currently active socket if it exists and is open
 */
function getSocket(displayPhoneNumber) {
  return activeSockets.get(displayPhoneNumber);
}

/**
 * Fetch the latest QR code to display in the frontend
 */
function getQrCode(displayPhoneNumber) {
  return qrCodes.get(displayPhoneNumber);
}

module.exports = {
  startBaileys,
  getSocket,
  getQrCode
};
