# Video Monitor Bot

A Discord bot to monitor YouTube, TikTok, Instagram, and Facebook for new videos.

Instagram and Facebook monitoring are currently not working in the docker container

## Configuration
Create a `.env` file:
```env
DISCORD_TOKEN=your_token
CLIENT_ID=your_client_id
```

## Deployment

### Method 1: Docker (Recommended)
**Image:** `ghcr.io/emmaknijn/video-monitor:latest`

**Docker Run:**
```bash
docker run -d \
  --name video-monitor \
  -v $(pwd)/data:/app/data \
  -e DISCORD_TOKEN=your_token \
  -e CLIENT_ID=your_client_id \
  ghcr.io/emmaknijn/video-monitor:latest
```

**Docker Compose:**
```yaml
services:
  video-monitor:
    image: ghcr.io/emmaknijn/video-monitor:latest
    restart: unless-stopped
    volumes:
      - ./data:/app/data
    environment:
      - DISCORD_TOKEN=your_token
      - CLIENT_ID=your_client_id
```
Run with: `docker compose up -d`

**NOTE** You will need to run the deploy command within the container to make the commands show up, to do this, use the following command: `docker compose exec video-monitor npm run deploy`

### Method 2: Node.js (Local)
1. **Install:** `npm install`
2. **Register Commands:** `npm run deploy`
3. **Start:** `npm start`

