# Используем Node.js
FROM node:18-alpine

# Папка внутри
WORKDIR /app

# Сначала копируем только файлы настроек
COPY package.json ./

# Устанавливаем библиотеки
RUN npm install

# И ТОЛЬКО ПОТОМ копируем весь остальной код
COPY . .

# Открываем стандартный порт 80
EXPOSE 80

# Запускаем
CMD ["node", "server.js"]