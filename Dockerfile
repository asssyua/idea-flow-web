# Development stage
FROM node:18-alpine AS development

WORKDIR /app

# Копируем package.json
COPY package.json package-lock.json ./

# Устанавливаем зависимости
RUN npm install --legacy-peer-deps

# Копируем остальные файлы
COPY . .

# Открываем порт
EXPOSE 3001

# Запускаем приложение с безопасными настройками
CMD ["npm", "run", "start:safe"]

