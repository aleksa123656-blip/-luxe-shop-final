module.exports = {
  apps : [{
    name   : "luxe-shop",
    script : "./server.js",
    env: {
      PORT: 3000,
      // Вставь свои токены сюда один раз:
      SHOP_BOT_TOKEN: "8529167440:AAGHOPEtGMm0XwaiRqCaidZCCQk0wt1fGA0",
      MANAGER_BOT_TOKEN: "8568906363:AAFv72tYv8sIx19kUfDBgHetseombNcHbJ0"
    }
  }]
}