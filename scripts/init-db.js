import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', 'database.sqlite');

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Пользователи
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id INTEGER UNIQUE,
        username TEXT,
        first_name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Товары
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price INTEGER NOT NULL,
        category TEXT,
        description TEXT,
        image TEXT,
        stock INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Корзины
    db.run(`CREATE TABLE IF NOT EXISTS carts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        session_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Элементы корзины
    db.run(`CREATE TABLE IF NOT EXISTS cart_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cart_id INTEGER,
        product_id INTEGER,
        quantity INTEGER DEFAULT 1,
        price INTEGER,
        FOREIGN KEY (cart_id) REFERENCES carts (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
    )`);

    // Заказы
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        total_amount INTEGER,
        status TEXT DEFAULT 'pending',
        customer_name TEXT,
        customer_phone TEXT,
        customer_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Элементы заказа
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        product_id INTEGER,
        product_name TEXT,
        quantity INTEGER,
        price INTEGER,
        FOREIGN KEY (order_id) REFERENCES orders (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
    )`);

    // Администраторы
    db.run(`CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Добавляем тестовые товары
    const products = [
        {
            name: "Крем La Mer",
            price: 42500,
            category: "Уход за кожей",
            description: "Роскошный крем для лица с увлажняющими свойствами",
            image: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400",
            stock: 10
        },
        {
            name: "Помада Chanel",
            price: 3200,
            category: "Макияж",
            description: "Стойкая матовая помада премиум-класса",
            image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400",
            stock: 25
        },
        {
            name: "Духи Dior",
            price: 8900,
            category: "Парфюмерия",
            description: "Изысканный аромат с нотками жасмина",
            image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400",
            stock: 15
        }
    ];

    const insertProduct = db.prepare(`INSERT INTO products (name, price, category, description, image, stock) 
                                     VALUES (?, ?, ?, ?, ?, ?)`);
    
    products.forEach(product => {
        insertProduct.run(
            product.name,
            product.price,
            product.category,
            product.description,
            product.image,
            product.stock
        );
    });
    insertProduct.finalize();

    // Создаем администратора по умолчанию
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    db.run(`INSERT OR IGNORE INTO admins (username, password) VALUES (?, ?)`, 
        ['admin', hashedPassword]);

    console.log('✅ База данных инициализирована');
    console.log('👤 Администратор: admin / admin123');
});

db.close();