FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install --production
COPY server ./server
COPY frontend ./frontend
EXPOSE 3000
CMD ["node", "server/index.js"]
