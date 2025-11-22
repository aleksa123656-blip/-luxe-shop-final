const TelegramBot = require('node-telegram-bot-api');

const BOT_TOKEN = '8529167440:AAGHOPEtGMm0XwaiRqCaidZCCQk0wt1fGA0';
const SHOP_URL = 'https://luxe-shop-final-alinas-projects-89ac56dc.vercel.app';

// 🆕 УЛУЧШЕННАЯ НАСТРОЙКА БОТА С ОБРАБОТКОЙ ОШИБОК
const bot = new TelegramBot(BOT_TOKEN, { 
    polling: {
        interval: 300,
        autoStart: true,
        params: {
            timeout: 10
        }
    }
});

console.log('🤖 Запуск бота...');

// 🆕 ОБРАБОТКА ОШИБОК POLLING
bot.on('polling_error', (error) => {
    console.log('❌ Ошибка polling:', error.code);
    
    if (error.code === 'ETELEGRAM' && error.message.includes('409 Conflict')) {
        console.log('⚠️  Другой экземпляр бота уже запущен. Останавливаю этот...');
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
});

bot.on('webhook_error', (error) => {
    console.log('❌ Ошибка webhook:', error);
});

// 📨 ОБРАБОТКА СООБЩЕНИЙ О ЗАКАЗАХ
bot.on('message', (msg) => {
    const text = msg.text;

    if (text && text.includes('🛍️ Заказ оформлен')) {
        sendOrderNotification(msg);
    }
});

// 📦 УВЕДОМЛЕНИЯ О ЗАКАЗАХ
function sendOrderNotification(msg) {
    const orderInfo = `📦 *НОВЫЙ ЗАКАЗ ИЗ МАГАЗИНА!*

${msg.text}

👤 *Информация о клиенте:*
ID: ${msg.from.id}
Имя: ${msg.from.first_name} ${msg.from.last_name || ''}
Username: @${msg.from.username || 'не указан'}

⏰ *Время:* ${new Date().toLocaleString('ru-RU')}

⚠️ *Срочно свяжитесь с клиентом!*`;

    bot.sendMessage('207347486', orderInfo, { parse_mode: 'Markdown' })
        .then(() => {
            console.log('✅ Уведомление о заказе отправлено');
        })
        .catch(err => console.error('❌ Ошибка отправки:', err));
}

// 🎯 КОМАНДА /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    
    bot.sendMessage(chatId, `✨ *Luxe Cosmetics*\n\n🛍️ Откройте магазин чтобы сделать заказ\n📞 Менеджер: @perlperpl`, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🛍️ Открыть магазин', web_app: { url: SHOP_URL } }],
                [{ text: '📞 Написать менеджеру', url: 'https://t.me/perlperpl' }]
            ]
        }
    });
});

// 🚀 УСПЕШНЫЙ ЗАПУСК
bot.on('polling_error', (error) => {
    // Игнорируем если это не конфликт
    if (!error.message.includes('409 Conflict')) {
        console.log('✅ Бот успешно запущен и работает!');
    }
});

console.log('🔄 Бот инициализирован...');