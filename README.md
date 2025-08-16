# Riot Middleware with Hono

A lightweight API middleware for Riot Games APIs built with Hono and deployed on Vercel.

## Features

- **Riot Games API Integration**: Fetch account information, match details, and match history
- **User Management**: Store and retrieve user preferences using Appwrite
- **Authentication**: Secure API key-based authentication for protected endpoints
- **Rate Limiting**: Built-in rate limiting to prevent abuse
- **Security Headers**: Comprehensive security headers for production use
- **Error Handling**: Consistent error responses with proper HTTP status codes

## API Endpoints

### Public Endpoints (No Authentication Required)

- `GET /api/` - API information and status
- `GET /api/health` - Health check endpoint
- `POST /api/account/fetch` - Fetch Riot account by riot-id
- `GET /api/:game/match/:matchId` - Get match details by matchId
- `GET /api/:game/matches/by-puuid/:puuid` - Get match IDs by PUUID

### Protected Endpoints (Authentication Required)

- `PUT /api/users/:userId/prefs` - Update user preferences
- `GET /api/users/:userId/prefs` - Get user preferences

## Authentication

**Important**: All `/users/*` endpoints require authentication. See [AUTHENTICATION.md](./AUTHENTICATION.md) for complete setup instructions.

### Quick Setup

1. Add `API_SECRET_KEY=your_secure_key` to your environment variables
2. Include the key in requests using either:
   - `Authorization: Bearer your_key` header, or
   - `X-API-Key: your_key` header

## Environment Variables

```bash
# Riot API
RIOT_API_URL=https://americas.api.riotgames.com
RIOT_API_KEY=your_riot_api_key

# Appwrite
APPWRITE_ENDPOINT_URL=https://your-appwrite-endpoint.com
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_appwrite_api_key

# Authentication
API_SECRET_KEY=your_secure_api_secret_key
```

## Development

```bash
# Install dependencies
pnpm install

# Run locally
pnpm dev

# Build for production
pnpm build
```

## Deployment

This API is configured for Vercel deployment. The `vercel.json` file handles the serverless function configuration.

## Security Features

- API key authentication for protected endpoints
- Rate limiting (100 requests per 15 minutes per IP)
- Security headers (XSS protection, content sniffing prevention, etc.)
- Input validation and sanitization
- HTTPS enforcement

## License

MIT
