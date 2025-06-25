FROM node:24.2.0-slim

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY src ./src
COPY tsconfig.json .

EXPOSE 3000

CMD ["sh", "-c", "npm run dev"]
