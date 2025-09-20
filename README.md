# LinkedIn AI Agent — Complete CommonJS Implementation

A complete LinkedIn AI Agent that generates Hinglish conversation-style posts, sends them via WhatsApp for approval, and auto-posts to LinkedIn after 10 minutes if no response.

## Features

- **AI-Powered Content Generation**: Uses LangChain + OpenAI to generate Hinglish LinkedIn posts
- **WhatsApp Integration**: Sends drafts via Twilio WhatsApp for user approval
- **LinkedIn Auto-Posting**: Posts approved content to LinkedIn using OAuth
- **Smart Scheduling**: Daily automated posting at 23:00 IST
- **Vector Search**: Learns from past posts using embeddings
- **Queue Management**: BullMQ + Redis for reliable job processing

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set up Environment
```bash
cp env.example .env
# Edit .env with your API keys
```

### 3. Start Services
```bash
# Start MongoDB
brew services start mongodb-community
# or
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Start Redis
brew services start redis
# or
docker run -d -p 6379:6379 --name redis redis:alpine
```

### 4. Run the Application
```bash
npm run dev
```

## Environment Variables

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/linkedin-agent
REDIS_URL=redis://127.0.0.1:6379
OPENAI_API_KEY=your_openai_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_WHATSAPP_TO=whatsapp:+919999999999
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:3000/linkedin/callback
BASE_URL=http://localhost:3000
OPENAI_MODEL=gpt-4o-mini
```

## API Endpoints

### Web Interface
- `GET /` - Login page with phone number input

### LinkedIn OAuth
- `GET /linkedin/auth?state={phone}` - Start LinkedIn OAuth flow
- `GET /linkedin/callback` - LinkedIn OAuth callback

### Content Generation
- `POST /generate/manual` - Generate a draft manually
  ```json
  { "userId": "user_id_here" }
  ```

### WhatsApp Webhook
- `POST /whatsapp/webhook` - Twilio webhook for WhatsApp responses

### Admin
- `GET /admin/users` - List all users
- `GET /admin/drafts` - List all drafts

## Usage Flow

1. **Sign Up**: Visit `http://localhost:3000` and enter your phone number
2. **Connect LinkedIn**: Complete OAuth flow to connect your LinkedIn account
3. **Generate Content**: Use `/generate/manual` endpoint or wait for daily schedule
4. **Approve via WhatsApp**: Reply with `A` (Accept), `R` (Reject), or `E: your text` (Edit)
5. **Auto-Post**: If no response within 10 minutes, content auto-posts to LinkedIn

## WhatsApp Commands

- `A` or `ACCEPT` or `YES` - Accept and post immediately
- `R` or `REJECT` or `NO` - Reject and discard
- `E: your edited text` - Edit the content and post

## Daily Schedule

The system automatically generates and sends drafts to all connected users at 23:00 IST daily.

## Architecture

- **Express.js** - Web server and API
- **MongoDB** - User and draft storage
- **Redis + BullMQ** - Job queue for approval timeouts
- **LangChain** - AI content generation
- **OpenAI** - Language model and embeddings
- **Twilio** - WhatsApp messaging
- **LinkedIn API** - Social media posting

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**: Make sure Redis is running on port 6379
2. **MongoDB Connection Failed**: Ensure MongoDB is running on port 27017
3. **OpenAI API Error**: Check your API key and credits
4. **Twilio Error**: Verify Account SID and Auth Token
5. **LinkedIn OAuth Error**: Check Client ID and Secret

### Debug Mode

Check logs for detailed error messages. The system logs all major operations and errors.

## Development

The codebase uses CommonJS modules (`require`/`module.exports`) for maximum compatibility. All external services have simulation modes when credentials are not provided.