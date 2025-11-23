// --- START OF FILE server.js (DIAGNOSTIC MODE) ---

console.log("🔥 [1/5] Скрипт начал работу...");

// 1. Проверяем переменные
const SHOP_TOKEN = process.env.SHOP_BOT_TOKEN;
const MANAGER_TOKEN = process.env.MANAGER_BOT_TOKEN;

console.log(`🔥 [2/5] Проверка токенов: Магазин=${SHOP_TOKEN ? 'Есть' : 'НЕТ ❌'}, Менеджер=${MANAGER_TOKEN ? 'Есть' : 'НЕТ ❌'}`);

// 2. Подключаем библиотеки в безопасном режиме
let express, TelegramBot, cors, helmet;

try {
    express = require('express');
    console.log("✅ Express подключен");
    TelegramBot = require('node-telegram-bot-api');
    console.log("✅ TelegramBot подключен");
    cors = require('cors');
    helmet = require('helmet');
} catch (e) {
    console.error("🔥 [КРИТИЧЕСКИЙ СБОЙ] Ошибка подключения библиотек:", e.message);
    console.error("Попробуйте переустановить: npm install");
    // Не выходим, чтобы увидеть лог
}

const app = express ? express() : null;
const PORT = process.env.PORT || 3001;

// 3. Запускаем сервер (если Express жив)
if (app) {
    app.use(cors());
    app.get('/', (req, res) => res.send('Диагностика: Сервер работает!'));
    
    // Пытаемся запустить сервер
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🔥 [3/5] HTTP Сервер успешно запущен на порту ${PORT}`);
    });
}

// 4. Пытаемся запустить ботов (только если есть токены)
if (TelegramBot && SHOP_TOKEN && MANAGER_TOKEN) {
    try {
        console.log("🔥 [4/5] Инициализация ботов...");
        const shopBot = new TelegramBot(SHOP_TOKEN, { polling: false });
        const managerBot = new TelegramBot(MANAGER_TOKEN, { polling: false });
        console.log("🔥 [5/5] ✅ Боты успешно инициализированы (Вебхуки ждут настройки)");
    } catch (e) {
        console.error("🔥 Ошибка при создании ботов:", e);
    }
} else {
    console.error("⚠️ Боты НЕ запущены, так как нет Токенов или Библиотек.");
}

// Держим процесс живым вечно
setInterval(() => {}, 1000);