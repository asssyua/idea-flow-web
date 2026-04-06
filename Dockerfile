
FROM node:18-alpine AS development

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 3001

CMD ["npm", "run", "start:safe"]

