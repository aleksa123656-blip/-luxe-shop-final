// --- START OF FILE server.js (CommonJS Version) ---

console.log("🚀 ЗАПУСК СЕРВЕРА (CommonJS)...");

const express = require('express');
const path = require('path');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
const helmet = require('helmet');

// --- ⚙️ НАСТРОЙКИ ---
const app = express();
// Порт: берем из настроек сервера или ставим 3001
const PORT = process.env.PORT || 3001; 

// 🔥 ОПРЕДЕЛЯЕМ СРЕДУ (AMVERA)
const IS_AMVERA = process.env.AMVERA === 'true';

// Настраиваем пути
// __dirname в CommonJS работает сразу, шаманить не надо
const DATA_DIR = IS_AMVERA ? '/data' : __dirname;
const UPLOADS_DIR = IS_AMVERA ? path.join(DATA_DIR, 'uploads') : path.join(__dirname, 'public', 'uploads');
const DB_PATH = path.join(DATA_DIR, 'db.json');

// Создаем папки, если их нет
if (!fs.existsSync(UPLOADS_DIR)) {
    console.log(`📂 Создаю папку для фото: ${UPLOADS_DIR}`);
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// 🔑 ТОКЕНЫ
const SHOP_BOT_TOKEN = process.env.SHOP_BOT_TOKEN;
const MANAGER_BOT_TOKEN = process.env.MANAGER_BOT_TOKEN;
const ADMIN_ID = 207347486; 
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`; 

// --- 📦 БАЗА ДАННЫХ ---
const readDb = () => {
    try {
        if (fs.existsSync(DB_PATH)) {
            return JSON.parse(fs.readFileSync(DB_PATH));
        }
    } catch (error) { console.error("Ошибка чтения БД:", error); }
    return { products: [], orders: [], nextProductId: 1 };
};

const writeDb = (data) => {
    try { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); } 
    catch (error) { console.error("Ошибка записи БД:", error); }
};

// --- 🤖 ИНИЦИАЛИЗАЦИЯ БОТОВ ---
// Внимание: polling: false, так как используем вебхуки
const shopBot = new TelegramBot(SHOP_BOT_TOKEN, { polling: false });
const managerBot = new TelegramBot(MANAGER_BOT_TOKEN, { polling: false });

// --- 🔒 MIDDLEWARE ---
app.use(helmet({ contentSecurityPolicy: false })); 
app.use(cors());
app.use(express.json());

// Раздача сайта
app.use(express.static('public'));
// Раздача фото
app.use('/uploads', express.static(UPLOADS_DIR));

// --- 🎯 API ---

// Вебхуки
app.post(`/api/bot/${SHOP_BOT_TOKEN}`, (req, res) => { shopBot.processUpdate(req.body); res.sendStatus(200); });
app.post(`/api/bot/${MANAGER_BOT_TOKEN}`, (req, res) => { managerBot.processUpdate(req.body); res.sendStatus(200); });

// Настройка связи
app.get('/api/setup', async (req, res) => {
    try {
        const shopUrl = `${APP_URL}/api/bot/${SHOP_BOT_TOKEN}`;
        const managerUrl = `${APP_URL}/api/bot/${MANAGER_BOT_TOKEN}`;
        await shopBot.setWebHook(shopUrl);
        await managerBot.setWebHook(managerUrl);
        res.json({ message: `✅ Вебхуки настроены на: ${APP_URL}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Товары
app.get('/api/products', (req, res) => {
    const db = readDb();
    const products = db.products.filter(p => p.is_active).map(p => ({
        ...p,
        // Если картинка локальная, добавляем домен
        image: p.image.startsWith('http') ? p.image : `${APP_URL}${p.image}`
    }));
    res.json({ success: true, products });
});

// Заказы
app.post('/api/orders', (req, res) => {
    const db = readDb();
    const order = { id: Date.now(), ...req.body, status: 'new', created_at: new Date() };
    db.orders.push(order);
    writeDb(db);
    
    const msg = `📦 *Новый заказ!*\n👤 ${order.customerInfo.name}\n💰 ${order.cart.total}₽\n📞 ${order.customerInfo.phone}`;
    shopBot.sendMessage(ADMIN_ID, msg, { parse_mode: 'Markdown' });
    
    res.json({ success: true, orderId: order.id });
});

// --- 🤖 ЛОГИКА БОТОВ ---

// Магазин
shopBot.onText(/\/start/, (msg) => {
    shopBot.sendMessage(msg.chat.id, `✨ *Luxe Cosmetics*\n🛍️ Откройте магазин:`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '🛍️ Открыть', web_app: { url: APP_URL } }]] }
    });
});

// Менеджер
const userSteps = {}; 
const isAdmin = msg => msg.from.id === ADMIN_ID;

managerBot.onText(/\/start/, (msg) => {
    if (!isAdmin(msg)) return;
    managerBot.sendMessage(msg.chat.id, "🤖 *Менеджер*\n/addproduct - Добавить\n/listproducts - Список\n/deleteproduct ID - Удалить");
});

managerBot.onText(/\/addproduct/, (msg) => {
    if (!isAdmin(msg)) return;
    userSteps[msg.chat.id] = { step: 'name' };
    managerBot.sendMessage(msg.chat.id, "Введите название:");
});

managerBot.onText(/\/listproducts/, (msg) => {
    if (!isAdmin(msg)) return;
    const db = readDb();
    const list = db.products.filter(p => p.is_active).slice(-20)
        .map(p => `🆔 ${p.id}: ${p.name} (${p.price}₽)`).join('\n');
    managerBot.sendMessage(msg.chat.id, list || "Пусто");
});

managerBot.onText(/\/deleteproduct (.+)/, (msg, match) => {
    if (!isAdmin(msg)) return;
    const db = readDb();
    const p = db.products.find(x => x.id == match[1]);
    if(p) { p.is_active = false; writeDb(db); managerBot.sendMessage(msg.chat.id, "Удалено"); }
});

// Диалог добавления товара
managerBot.on('message', async (msg) => {
    if (!isAdmin(msg) || !userSteps[msg.chat.id] || msg.text?.startsWith('/')) return;
    const chatId = msg.chat.id;
    const step = userSteps[chatId];

    try {
        if (step.step === 'name') {
            step.name = msg.text; step.step = 'price';
            managerBot.sendMessage(chatId, "Цена (число):");
        } else if (step.step === 'price') {
            step.price = parseInt(msg.text);
            if (isNaN(step.price)) throw new Error("Не число");
            step.step = 'category';
            managerBot.sendMessage(chatId, "Категория:");
        } else if (step.step === 'category') {
            step.category = msg.text; step.step = 'description';
            managerBot.sendMessage(chatId, "Описание:");
        } else if (step.step === 'description') {
            step.description = msg.text; step.step = 'photo';
            managerBot.sendMessage(chatId, "📸 Отправьте фото (как картинку):");
        }
    } catch (e) { managerBot.sendMessage(chatId, "❌ " + e.message); }
});

// Загрузка фото
managerBot.on('photo', async (msg) => {
    if (!isAdmin(msg) || userSteps[msg.chat.id]?.step !== 'photo') return;
    const chatId = msg.chat.id;
    const data = userSteps[chatId];

    try {
        managerBot.sendMessage(chatId, "⏳ Сохраняю...");
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        const fileStream = managerBot.getFileStream(fileId);
        
        const fileName = `img_${Date.now()}.jpg`;
        const filePath = path.join(UPLOADS_DIR, fileName);
        const writeStream = fs.createWriteStream(filePath);

        fileStream.pipe(writeStream);

        writeStream.on('finish', () => {
            const db = readDb();
            const newProduct = {
                id: db.nextProductId++,
                ...data,
                image: `/uploads/${fileName}`,
                is_active: true
            };
            db.products.push(newProduct);
            writeDb(db);
            managerBot.sendMessage(chatId, "✅ Товар добавлен!");
            delete userSteps[chatId];
        });
    } catch (e) {
        console.error(e);
        managerBot.sendMessage(chatId, "❌ Ошибка: " + e.message);
    }
});

// --- 🚀 ЗАПУСК ---
// Слушаем 0.0.0.0 для Amvera
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server is running on port ${PORT}`);
});

// Глобальный перехват ошибок (чтобы не падал молча)
process.on('uncaughtException', (err) => {
    console.error('🔥 CRITICAL ERROR:', err);
});