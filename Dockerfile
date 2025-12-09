FROM node:25-alpine
COPY . /app
WORKDIR /app
RUN npm install

RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ~/.local/bin/yt-dlp
RUN chmod a+rx ~/.local/bin/yt-dlp
CMD ["node", "index.js"]