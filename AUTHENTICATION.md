# API Authentication Setup

This API now requires authentication for all `/users/*` endpoints. Here's how to set it up and use it.

## Environment Variables

Add the following environment variable to your `.env` file:

```bash
API_SECRET_KEY=your_secure_api_secret_key_here
```

**Important**: Choose a strong, random secret key. You can generate one using:

```bash
openssl rand -base64 32
```

## Authentication Methods

The API supports two authentication methods:

### 1. Authorization Header (Bearer Token)

```bash
Authorization: Bearer your_api_secret_key_here
```

### 2. X-API-Key Header

```bash
X-API-Key: your_api_secret_key_here
```

## Protected Endpoints

The following endpoints now require authentication:

- `PUT /api/users/:userId/prefs` - Update user preferences
- `GET /api/users/:userId/prefs` - Get user preferences

## Example Usage

### Using cURL with Bearer Token:

```bash
curl -X PUT "https://your-api.com/api/users/123/prefs" \
  -H "Authorization: Bearer your_api_secret_key_here" \
  -H "Content-Type: application/json" \
  -d '{"preferences": {"theme": "dark"}}'
```

### Using cURL with X-API-Key:

```bash
curl -X GET "https://your-api.com/api/users/123/prefs" \
  -H "X-API-Key: your_api_secret_key_here"
```

### Using JavaScript/Fetch:

```javascript
const response = await fetch("/api/users/123/prefs", {
  method: "GET",
  headers: {
    Authorization: "Bearer your_api_secret_key_here",
    "Content-Type": "application/json",
  },
});
```

## Security Features

- **Rate Limiting**: 100 requests per 15-minute window per IP address
- **Security Headers**: XSS protection, content type sniffing prevention, frame options
- **HTTPS Enforcement**: Strict transport security headers
- **Input Validation**: All inputs are validated before processing

## Error Responses

### 401 Unauthorized

```json
{
  "error": true,
  "status": 401,
  "message": "Authentication required. Provide Authorization: Bearer <token> or X-API-Key header",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 429 Too Many Requests

```json
{
  "error": true,
  "status": 429,
  "message": "Rate limit exceeded. Try again later.",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Best Practices

1. **Keep your API secret key secure** - Never commit it to version control
2. **Use HTTPS** - Always use HTTPS in production
3. **Rotate keys regularly** - Change your API secret key periodically
4. **Monitor usage** - Keep track of API usage and rate limiting
5. **Use environment variables** - Store sensitive configuration in environment variables
