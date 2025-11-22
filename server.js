// --- START OF FILE server.js (ВЕРСИЯ ДЛЯ AMVERA) ---

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';
import cors from 'cors';
import helmet from 'helmet';

// --- ⚙️ ГЛАВНЫЕ НАСТРОЙКИ И ПУТИ ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3001;

// 🔥 ГЛАВНАЯ МАГИЯ AMVERA
// Если переменная AMVERA=true, мы используем вечную папку /data
const IS_AMVERA = process.env.AMVERA === 'true';

// Определяем пути
const DATA_DIR = IS_AMVERA ? '/data' : __dirname; // Корень данных
const UPLOADS_DIR = IS_AMVERA ? join(DATA_DIR, 'uploads') : join(__dirname, 'public', 'uploads'); // Папка фото
const DB_PATH = join(DATA_DIR, 'db.json'); // Файл базы данных

// Создаем папки, если их нет (чтобы не было ошибок)
if (!fs.existsSync(UPLOADS_DIR)) {
    console.log(`Создаю папку для фото: ${UPLOADS_DIR}`);
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// 🔑 ТОКЕНЫ И ID
const SHOP_BOT_TOKEN = process.env.SHOP_BOT_TOKEN;
const MANAGER_BOT_TOKEN = process.env.MANAGER_BOT_TOKEN;
const ADMIN_ID = 207347486; // Твой ID
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

// --- 📦 ФУНКЦИИ БАЗЫ ДАННЫХ ---
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
const shopBot = new TelegramBot(SHOP_BOT_TOKEN);
const managerBot = new TelegramBot(MANAGER_BOT_TOKEN);

// --- 🔒 НАСТРОЙКИ СЕРВЕРА ---
app.use(helmet({ contentSecurityPolicy: false })); // Разрешаем картинки
app.use(cors());
app.use(express.json());

// 1. Раздаем сайт (frontend)
app.use(express.static('public'));

// 2. Раздаем загруженные картинки по адресу /uploads
app.use('/uploads', express.static(UPLOADS_DIR));

// --- 🎯 API МАРШРУТЫ ---

// Вебхуки (сюда стучится Telegram)
app.post(`/api/bot/${SHOP_BOT_TOKEN}`, (req, res) => { shopBot.processUpdate(req.body); res.sendStatus(200); });
app.post(`/api/bot/${MANAGER_BOT_TOKEN}`, (req, res) => { managerBot.processUpdate(req.body); res.sendStatus(200); });

// Настройка связи (запустить 1 раз)
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

// Получение товаров для магазина
app.get('/api/products', (req, res) => {
    const db = readDb();
    // Превращаем локальные пути картинок в полные URL
    const products = db.products.filter(p => p.is_active).map(p => ({
        ...p,
        image: p.image.startsWith('http') ? p.image : `${APP_URL}${p.image}`
    }));
    res.json({ success: true, products });
});

// Оформление заказа
app.post('/api/orders', (req, res) => {
    const db = readDb();
    const order = { id: Date.now(), ...req.body, status: 'new', created_at: new Date() };
    db.orders.push(order);
    writeDb(db);
    
    // Уведомление админу в Телеграм
    const msg = `📦 *Новый заказ!*\n👤 ${order.customerInfo.name}\n💰 Сумма: ${order.cart.total}₽\n📞 ${order.customerInfo.phone}`;
    shopBot.sendMessage(ADMIN_ID, msg, { parse_mode: 'Markdown' });
    
    res.json({ success: true, orderId: order.id });
});

// --- 🛍️ ЛОГИКА МАГАЗИНА ---
shopBot.onText(/\/start/, (msg) => {
    shopBot.sendMessage(msg.chat.id, `✨ *Luxe Cosmetics*\n🛍️ Откройте магазин ниже:`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '🛍️ Открыть магазин', web_app: { url: APP_URL } }]] }
    });
});

// --- 👨‍💼 ЛОГИКА МЕНЕДЖЕРА (С ФОТО) ---
const userSteps = {}; 
const isAdmin = msg => msg.from.id === ADMIN_ID;

managerBot.onText(/\/start/, (msg) => {
    if (!isAdmin(msg)) return;
    managerBot.sendMessage(msg.chat.id, "🤖 *Меню Менеджера*\n\n/addproduct - Добавить товар\n/listproducts - Список\n/deleteproduct ID - Удалить");
});

managerBot.onText(/\/addproduct/, (msg) => {
    if (!isAdmin(msg)) return;
    userSteps[msg.chat.id] = { step: 'name' };
    managerBot.sendMessage(msg.chat.id, "Введите название товара:");
});

managerBot.onText(/\/listproducts/, (msg) => {
    if (!isAdmin(msg)) return;
    const db = readDb();
    const list = db.products.filter(p => p.is_active).slice(-20)
        .map(p => `🆔 ${p.id}: ${p.name} — ${p.price}₽`).join('\n');
    managerBot.sendMessage(msg.chat.id, list || "Список пуст.");
});

managerBot.onText(/\/deleteproduct (.+)/, (msg, match) => {
    if (!isAdmin(msg)) return;
    const db = readDb();
    const p = db.products.find(x => x.id == match[1]);
    if(p) { p.is_active = false; writeDb(db); managerBot.sendMessage(msg.chat.id, `Товар ${match[1]} удален.`); }
});

// Обработка ответов (Название -> Цена -> Категория -> Описание -> Фото)
managerBot.on('message', async (msg) => {
    if (!isAdmin(msg) || !userSteps[msg.chat.id] || msg.text?.startsWith('/')) return;
    const chatId = msg.chat.id;
    const step = userSteps[chatId];

    try {
        if (step.step === 'name') {
            step.name = msg.text; step.step = 'price';
            managerBot.sendMessage(chatId, "Цена (просто число):");
        } else if (step.step === 'price') {
            step.price = parseInt(msg.text);
            if (isNaN(step.price)) throw new Error("Это не число!");
            step.step = 'category';
            managerBot.sendMessage(chatId, "Категория:");
        } else if (step.step === 'category') {
            step.category = msg.text; step.step = 'description';
            managerBot.sendMessage(chatId, "Описание:");
        } else if (step.step === 'description') {
            step.description = msg.text; step.step = 'photo';
            managerBot.sendMessage(chatId, "📸 Теперь отправьте ФОТО товара (как картинку, не файлом):");
        }
    } catch (e) { managerBot.sendMessage(chatId, "❌ " + e.message); }
});

// 🔥 ЗАГРУЗКА ФОТО
managerBot.on('photo', async (msg) => {
    if (!isAdmin(msg) || userSteps[msg.chat.id]?.step !== 'photo') return;
    const chatId = msg.chat.id;
    const data = userSteps[chatId];

    try {
        managerBot.sendMessage(chatId, "⏳ Сохраняю фото...");
        
        // Берем самое качественное фото
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        const fileStream = managerBot.getFileStream(fileId);
        
        const fileName = `img_${Date.now()}.jpg`;
        const filePath = join(UPLOADS_DIR, fileName); 
        
        // Создаем поток записи в папку uploads
        const writeStream = fs.createWriteStream(filePath);
        fileStream.pipe(writeStream);

        writeStream.on('finish', () => {
            const db = readDb();
            const newProduct = {
                id: db.nextProductId++,
                name: data.name,
                price: data.price,
                category: data.category,
                description: data.description,
                image: `/uploads/${fileName}`, // Путь для сайта
                is_active: true
            };
            
            db.products.push(newProduct);
            writeDb(db);
            
            managerBot.sendMessage(chatId, `✅ Товар "${data.name}" успешно добавлен!`);
            delete userSteps[chatId];
        });
        
        writeStream.on('error', (err) => {
             throw err;
        });

    } catch (e) {
        console.error(e);
        managerBot.sendMessage(chatId, "❌ Ошибка сохранения фото. Попробуйте еще раз.");
    }
});

// --- 🚀 ЗАПУСК ---
app.get('*', (req, res) => res.sendFile(join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен. Порт: ${PORT}`);
    console.log(`Environment: ${IS_AMVERA ? 'Amvera Cloud' : 'Localhost'}`);
});

export default app;