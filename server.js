console.log("🚀 ЗАПУСК СЕРВЕРА...");

import express from 'express';
const app = express();

// ЖЕСТКО ЗАДАЕМ ПОРТ 3001 (как в настройках Amvera)
const PORT = 3001; 

app.get('/', (req, res) => {
    res.send('Привет! Я живой!');
});

app.get('/api/setup', (req, res) => {
    res.json({ message: "Бот временно отключен для проверки сервера" });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ СЕРВЕР СЛУШАЕТ ПОРТ ${PORT}`);
});

// Ловим ошибки, чтобы они попали в лог
process.on('uncaughtException', (err) => {
    console.error('🔥 ОШИБКА:', err);
});