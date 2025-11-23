console.log("🚀 [DOCKER] ЗАПУСК СЕРВЕРА...");

const express = require('express');
const cors = require('cors');

const app = express();
// ВАЖНО: Слушаем порт 80
const PORT = 80;

app.use(cors());

app.get('/', (req, res) => {
    res.send('SERVER IS WORKING ON PORT 80!');
});

app.get('/api/setup', (req, res) => {
    res.json({ message: "СЕРВЕР РАБОТАЕТ! УРА!" });
});

// Слушаем 0.0.0.0 (обязательно для Докера)
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ СЕРВЕР ЗАПУЩЕН НА ПОРТУ ${PORT}`);
});

// Ловушка ошибок
process.on('uncaughtException', (err) => {
    console.error('🔥 CRASH:', err);
});