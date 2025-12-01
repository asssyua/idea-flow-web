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

# Запускаем приложение
CMD ["npm", "start"]

# Production build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine AS production
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]