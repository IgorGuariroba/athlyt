FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY src ./src
COPY scripts ./scripts
COPY drizzle ./drizzle
COPY tsconfig.json ./tsconfig.json
ENV NODE_ENV=production
CMD ["sh", "-c", "while true; do npm run storage:retencao || echo '[retencao] falhou; nova tentativa amanhã'; sleep 86400; done"]
