# Discord Bot API Documentation

## Authentication
All requests must include the header `x-bot-secret` with your Bot API Key options.
You can find and regenerate this key in the **Admin Dashboard > Discord Bot** tab.

## Base URL
Your API is hosted at: `http://localhost:3000` (or your domain)

---

## Endpoints

### 1. Claim Reward Code
Call this when a user attempts to claim a reward for their invites.

**POST** `/api/bot/claim`

**Headers:**
- `Content-Type: application/json`
- `x-bot-secret: <YOUR_BOT_KEY>`

**Body:**
```json
{
  "discordId": "123456789012345678",
  "inviteCount": 5
}
```

**Response (Success):**
```json
{
  "success": true,
  "code": "INV-1234-XYS821",
  "amount": 100,
  "tierInvites": 5,
  "message": "Reward claimed for 5 invites!"
}
```

**Response (Error - Already Claimed or Not Eligible):**
```json
{
  "message": "No new rewards available for this invite count"
}
```

---

### 2. Get Reward Tiers
Fetch the configured invite tiers.

**GET** `/api/bot/tiers`

**Headers:**
- `x-bot-secret: <YOUR_BOT_KEY>`

**Response:**
```json
[
  { "invites": 5, "coins": 100 },
  { "invites": 10, "coins": 250 }
]
```
