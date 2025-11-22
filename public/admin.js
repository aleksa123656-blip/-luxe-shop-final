// --- START OF FILE admin.js ---

// Глобальная переменная для хранения токена аутентификации
let adminToken = localStorage.getItem('adminToken') || '';

// --- АУТЕНТИФИКАЦИЯ ---

// Асинхронная функция для входа администратора
async function adminLogin() {
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;

    try {
        // Отправляем запрос на сервер для получения токена
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (result.success) {
            // Сохраняем токен
            adminToken = result.token;
            localStorage.setItem('adminToken', adminToken);

            // Переключаемся на панель администратора
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('adminPanel').style.display = 'flex';
            
            // Загружаем актуальные данные
            loadDashboard();
            loadProducts();
            loadOrders();
        } else {
            alert('Ошибка входа: ' + result.message);
        }
    } catch (error) {
        console.error('Ошибка при входе:', error);
        alert('Произошла ошибка сети. Попробуйте снова.');
    }
}

function logout() {
    adminToken = '';
    localStorage.removeItem('adminToken');
    document.getElementById('loginPage').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
}


// --- УПРАВЛЕНИЕ ВКЛАДКАМИ ---

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
    
    // Загружаем данные для соответствующей вкладки
    if (tabName === 'dashboard') loadDashboard();
    if (tabName === 'orders') loadOrders();
    if (tabName === 'products') loadProducts();
}


// --- ЗАГРУЗКА ДАННЫХ С СЕРВЕРА ---

// Загрузка данных для дашборда (пока частично моковые, частично реальные)
async function loadDashboard() {
    // В будущем здесь можно сделать отдельные API запросы для каждой метрики
    try {
        const productsResponse = await fetch('/api/products');
        const productsResult = await productsResponse.json();
        const productsCount = productsResult.success ? productsResult.products.length : 0;

        const ordersResponse = await fetch('/api/orders', { headers: { 'Authorization': `Bearer ${adminToken}` }});
        const ordersResult = await ordersResponse.json();
        const ordersCount = ordersResult.success ? ordersResult.orders.length : 0;
        const totalRevenue = ordersResult.success ? ordersResult.orders.reduce((sum, order) => sum + order.total_amount, 0) : 0;

        document.getElementById('statsGrid').innerHTML = `
            <div class="stat-card">
                <h3>Всего пользователей</h3>
                <div class="value">N/A</div>
            </div>
            <div class="stat-card">
                <h3>Всего заказов</h3>
                <div class="value">${ordersCount}</div>
            </div>
            <div class="stat-card">
                <h3>Общий доход</h3>
                <div class="value">${totalRevenue.toLocaleString()}₽</div>
            </div>
            <div class="stat-card">
                <h3>Товаров в каталоге</h3>
                <div class="value">${productsCount}</div>
            </div>
        `;
    } catch(error) {
        document.getElementById('statsGrid').innerHTML = `<p style="color: red;">Ошибка загрузки статистики.</p>`;
    }
}

// Загрузка реальных заказов с сервера
async function loadOrders() {
    try {
        const response = await fetch('/api/orders', {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const result = await response.json();

        if (!result.success) throw new Error(result.message);

        const orders = result.orders;
        const ordersHtml = orders.map(order => `
            <tr>
                <td>#${order.id}</td>
                <td>${order.customer_name}</td>
                <td>${order.total_amount.toLocaleString()}₽</td>
                <td>
                    <select onchange="updateOrderStatus(${order.id}, this.value)">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Ожидает</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>В обработке</option>
                        <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Завершен</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Отменен</option>
                    </select>
                </td>
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
            </tr>
        `).join('');
        
        document.getElementById('ordersList').innerHTML = `
            <table>
                <thead> <tr> <th>ID</th> <th>Клиент</th> <th>Сумма</th> <th>Статус</th> <th>Дата</th> </tr> </thead>
                <tbody>${ordersHtml.length > 0 ? ordersHtml : '<tr><td colspan="5" style="text-align:center;">Заказов пока нет</td></tr>'}</tbody>
            </table>
        `;
    } catch (error) {
        console.error('Ошибка загрузки заказов:', error);
        document.getElementById('ordersList').innerHTML = `<p style="color: red;">Не удалось загрузить заказы.</p>`;
    }
}

// Загрузка реальных товаров с сервера
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const result = await response.json();
        
        if (!result.success) throw new Error(result.message);
        
        const products = result.products;
        const productsHtml = products.map(product => `
            <tr>
                <td><img src="${product.image}" alt="${product.name}" width="50" style="border-radius: 5px; margin-right: 10px;">${product.name}</td>
                <td>${product.price}₽</td>
                <td>${product.category}</td>
                <td>${product.stock}</td>
                <td>
                    <button class="btn btn-warning" onclick="editProduct(${product.id})">✏️</button>
                    <button class="btn btn-danger" onclick="deleteProduct(${product.id})">🗑️</button>
                </td>
            </tr>
        `).join('');
        
        document.getElementById('productsList').innerHTML = `
            <table>
                <thead> <tr> <th>Название</th> <th>Цена</th> <th>Категория</th> <th>Остаток</th> <th>Действия</th> </tr> </thead>
                <tbody>${productsHtml.length > 0 ? productsHtml : '<tr><td colspan="5" style="text-align:center;">Товаров пока нет</td></tr>'}</tbody>
            </table>
        `;
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        document.getElementById('productsList').innerHTML = `<p style="color: red;">Не удалось загрузить товары.</p>`;
    }
}


// --- ДЕЙСТВИЯ (ЗАГЛУШКИ) ---

function updateOrderStatus(orderId, status) {
    alert(`(ДЕМО) Статус заказа #${orderId} изменен на: ${status}`);
    // В реальном приложении здесь будет API запрос на обновление статуса
}

function showAddProductForm() {
    alert('(ДЕМО) Форма добавления товара - в разработке');
}

function editProduct(productId) {
    alert(`(ДЕМО) Редактирование товара #${productId} - в разработке`);
}

function deleteProduct(productId) {
    if (confirm('Вы уверены, что хотите удалить этот товар?')) {
        alert(`(ДЕМО) Товар #${productId} удален`);
        // В реальном приложении здесь будет API запрос на удаление
    }
}


// --- ИНИЦИАЛИЗАЦИЯ ---

// Проверяем, есть ли уже токен при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    if (adminToken) {
        console.log('Найден токен, выполнен автоматический вход.');
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'flex';
        showTab('dashboard');
    } else {
        console.log('Токен не найден, требуется вход.');
    }
});