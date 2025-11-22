// --- START OF FILE app.js (полностью заменить) ---

// Убираем жесткую привязку к localhost. Теперь код будет работать везде.
const API_BASE_URL = '';

// Глобальные переменные
let allProducts = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
const tg = window.Telegram.WebApp;

async function loadProductsFromDB() {
    try {
        showLoading(true);
        console.log(`[INFO] Загрузка товаров с ${API_BASE_URL}/api/products`);
        
        const response = await fetch(`${API_BASE_URL}/api/products`);
        if (!response.ok) throw new Error(`Ошибка сети: ${response.status}`);
        
        const data = await response.json();
        
        if (data.success && Array.isArray(data.products)) {
            allProducts = data.products.map(p => ({
                ...p,
                // Используем относительные пути. Браузер сам подставит нужный домен.
                image: p.image ? p.image : '/images/placeholder.jpg' 
            }));
            displayProducts(allProducts);
            console.log(`[SUCCESS] Загружено ${allProducts.length} товаров.`);
        } else {
            throw new Error(data.message || 'Сервер вернул некорректные данные');
        }
    } catch (error) {
        console.error('❌ ОШИБКА ЗАГРУЗКИ ТОВАРОВ:', error);
        showError(`Не удалось загрузить каталог. Убедитесь, что сервер запущен и доступен.\nДетали: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

function showLoading(show) {
    let loader = document.getElementById('products-container');
    if (show) {
        loader.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">🔄 Загрузка товаров...</div>';
    }
}

function showError(message) {
    document.getElementById('products-container').innerHTML = `<div style="background: #ffebee; color: #c62828; padding: 15px; border-radius: 10px; margin: 10px; text-align: center;">❌ ${message}</div>`;
}

function displayProducts(products) {
    const container = document.getElementById('products-container');
    container.innerHTML = '';
    if (!products.length) {
        container.innerHTML = '<div class="no-products">😔 Товары не найдены</div>';
        return;
    }
    container.innerHTML = products.map(p => `
        <div class="product-card">
            <div class="product-image"><img src="${p.image}" alt="${p.name}" onerror="this.onerror=null;this.src='/images/placeholder.jpg';"></div>
            <div class="product-info">
                <h3 class="product-name">${p.name}</h3>
                <p class="product-description">${p.description || 'Описание отсутствует'}</p>
                <div class="product-price">${p.price.toLocaleString()} ₽</div>
                <div class="product-category">${p.category}</div>
                <button class="add-to-cart-btn" onclick="addToCart(${p.id})">🛒 В корзину</button>
            </div>
        </div>
    `).join('');
}

function setupCategoryFilter() {
    document.querySelectorAll('.category-btn').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            const category = this.getAttribute('data-category');
            if (category === 'all') {
                displayProducts(allProducts);
            } else {
                displayProducts(allProducts.filter(p => p.category === category));
            }
        });
    });
}

// ... (остальной код без изменений)
function addToCart(productId){const product=allProducts.find(p=>p.id===productId);if(!product)return;const item=cart.find(i=>i.id===productId);item?item.quantity++:cart.push({...product,quantity:1});updateCart();showNotification(`✅ "${product.name}" добавлен в корзину`)}
function removeFromCart(productId){cart=cart.filter(item=>item.id!==productId);updateCart()}
function updateCart(){localStorage.setItem('cart',JSON.stringify(cart));updateCartUI()}
function updateCartUI(){const totalItems=cart.reduce((sum,item)=>sum+item.quantity,0);const totalPrice=cart.reduce((sum,item)=>sum+(item.price*item.quantity),0);document.getElementById('cart-count').textContent=totalItems;document.getElementById('cart-total-price').textContent=totalPrice.toLocaleString();const itemsContainer=document.getElementById('cart-items');if(!cart.length){itemsContainer.innerHTML='<div class="empty-cart">Корзина пуста</div>'}else{itemsContainer.innerHTML=cart.map(item=>`
<div class="cart-item"><div class="cart-item-info"><div class="cart-item-name">${item.name}</div><div class="cart-item-price">${item.price.toLocaleString()} ₽ × ${item.quantity}</div></div><div class="cart-item-actions"><button onclick="changeQuantity(${item.id},-1)">-</button><span>${item.quantity}</span><button onclick="changeQuantity(${item.id},1)">+</button><button class="remove-btn" onclick="removeFromCart(${item.id})">🗑️</button></div></div>`).join('')}}
function changeQuantity(productId,change){const item=cart.find(i=>i.id===productId);if(item){item.quantity+=change;if(item.quantity<=0)removeFromCart(productId);else updateCart()}}
async function checkout(){if(!cart.length)return showNotification('❌ Ваша корзина пуста!');const userData=tg.initDataUnsafe.user;const customerName=prompt("Введите ваше имя:",userData?.first_name||"");if(!customerName)return;const customerPhone=prompt("Введите ваш телефон:");if(!customerPhone)return;const customerAddress=prompt("Введите адрес доставки:");if(!customerAddress)return;const orderData={userId:userData?.id||'unregistered',cart:{items:cart,total:cart.reduce((sum,i)=>sum+(i.price*i.quantity),0)},customerInfo:{name:customerName,phone:customerPhone,address:customerAddress}};try{tg.MainButton.showProgress();const response=await fetch(`${API_BASE_URL}/api/orders`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(orderData)});const result=await response.json();if(result.success){tg.sendData(`🛍️ Заказ оформлен №${result.orderId}`);cart=[];updateCart();tg.close()}else{throw new Error(result.message)}}catch(error){showNotification(`Ошибка: ${error.message}`)}finally{tg.MainButton.hideProgress()}}
function showNotification(message){let n=document.querySelector('.notification');if(!n){n=document.createElement('div');n.className='notification';document.body.appendChild(n)}n.innerHTML=message;n.classList.add('show');setTimeout(()=>{n.classList.remove('show')},3000)}
document.addEventListener('DOMContentLoaded',()=>{tg.ready();tg.expand();loadProductsFromDB();setupCategoryFilter();updateCartUI();window.addEventListener('click',e=>{if(e.target===document.getElementById('cart-modal'))closeCartModal()})});function openCartModal(){document.getElementById('cart-modal').style.display='block'}function closeCartModal(){document.getElementById('cart-modal').style.display='none'}
const style=document.createElement('style');style.textContent=`.notification{position:fixed;top:-100px;left:50%;transform:translateX(-50%);background:#2c3e50;color:#fff;padding:15px 25px;border-radius:10px;z-index:10000;box-shadow:0 5px 15px rgba(0,0,0,.3);transition:top .5s ease}.notification.show{top:20px}`;document.head.appendChild(style);