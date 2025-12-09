FROM node:25-alpine
COPY . /app
WORKDIR /app
RUN npm install
RUN npx playwright install
RUN apk add --no-cache curl
RUN mkdir -p /usr/local/bin
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
RUN chmod a+rx /usr/local/bin/yt-dlp
CMD ["node", "index.js"]