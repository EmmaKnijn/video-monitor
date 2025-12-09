FROM node:25-alpine
ENV PYTHONUNBUFFERED=1
RUN apk add --update --no-cache python3 && ln -sf python3 /usr/bin/python
RUN python3 -m pip install --no-cache --upgrade --break-system-packages pip
RUN apk add --no-cache curl
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
RUN chmod a+rx /usr/local/bin/yt-dlp


COPY . /app
WORKDIR /app
RUN npm install
RUN npx playwright install

RUN mkdir -p /usr/local/bin
CMD ["node", "index.js"]