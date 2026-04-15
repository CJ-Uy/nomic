import express from 'express';
import { client, botJoin, botLeave } from './bot.js';
const app = express();
app.use(express.json());
const BOT_SECRET = process.env.BOT_SECRET ?? '';
const DISCORD_TOKEN = process.env.DISCORD_TOKEN ?? '';
// Auth middleware — all routes require the shared secret
app.use((req, res, next) => {
    if (req.headers['x-bot-secret'] !== BOT_SECRET) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    next();
});
// Keepalive — called by session-store every 10 min to reset Container sleepAfter timer
app.get('/ping', (_req, res) => {
    res.json({ ok: true });
});
// Join a voice channel
app.post('/join', (req, res) => {
    const { guildId, userId, interactionToken, appId } = req.body;
    // ACK immediately — Discord deferred response requires followup within 15 min
    res.json({ ok: true });
    botJoin(guildId, userId, interactionToken, appId).catch((err) => {
        console.error('[index] botJoin error:', err);
    });
});
// Leave a voice channel
app.post('/leave', (req, res) => {
    const { guildId, interactionToken, appId } = req.body;
    res.json({ ok: true });
    botLeave(guildId, interactionToken, appId).catch((err) => {
        console.error('[index] botLeave error:', err);
    });
});
const PORT = parseInt(process.env.PORT ?? '3000', 10);
app.listen(PORT, () => {
    console.log(`[nomic] Express listening on :${PORT}`);
});
client.login(DISCORD_TOKEN).catch((err) => {
    console.error('[nomic] Discord login failed:', err);
    process.exit(1);
});
