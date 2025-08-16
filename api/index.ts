import "dotenv/config";
import { Hono } from "hono";
import { handle } from "hono/vercel";
import { Client, Users } from "node-appwrite";

// * Validate required environment variables
const RIOT_API_URL = process.env.RIOT_API_URL;
const RIOT_API_KEY = process.env.RIOT_API_KEY;
const APPWRITE_ENDPOINT_URL = process.env.APPWRITE_ENDPOINT_URL;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const API_SECRET_KEY = process.env.API_SECRET_KEY;

if (!RIOT_API_URL || !RIOT_API_KEY) {
  throw new Error("Missing required environment variables: RIOT_API_URL and RIOT_API_KEY");
}

if (!APPWRITE_ENDPOINT_URL || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
  throw new Error(
    "Missing required Appwrite environment variables: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, and APPWRITE_API_KEY"
  );
}

if (!API_SECRET_KEY) {
  throw new Error("Missing required environment variable: API_SECRET_KEY");
}

// * Initialize Appwrite client
const appwriteClient = new Client()
  .setEndpoint(APPWRITE_ENDPOINT_URL)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const appwriteUsers = new Users(appwriteClient);

const app = new Hono().basePath("/api");

// * Authentication middleware
const authenticateRequest = async (c: any, next: any) => {
  const authHeader = c.req.header("Authorization");
  const apiKey = c.req.header("X-API-Key");

  // Check for either Authorization header (Bearer token) or X-API-Key header
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (apiKey) {
    token = apiKey;
  }

  if (!token) {
    return c.json(
      createErrorResponse(401, "Authentication required. Provide Authorization: Bearer <token> or X-API-Key header"),
      401
    );
  }

  // Validate the token against the API_SECRET_KEY
  if (token !== API_SECRET_KEY) {
    return c.json(createErrorResponse(401, "Invalid authentication token"), 401);
  }

  // Add authenticated flag to context for potential future use
  c.set("authenticated", true);
  c.set("authToken", token);

  await next();
};

// * Common error handler
const createErrorResponse = (status: number, message: string) => ({
  error: true,
  status,
  message,
  timestamp: new Date().toISOString(),
});

/**
 * * Root endpoint
 * * Output: message
 */
app.get("/", (c) => {
  return c.json({
    message: "Hello Riot Middleware API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

/**
 * * Fetch account by riot-id
 * * Input: region, summonerName
 * * Output: account
 */
app.post("/account/fetch", async (c) => {
  try {
    const body = await c.req.json();
    const { region, summonerName } = body;

    // Input validation
    if (!region || !summonerName) {
      return c.json(createErrorResponse(400, "Missing required parameters: region and summonerName"));
    }

    if (typeof region !== "string" || typeof summonerName !== "string") {
      return c.json(createErrorResponse(400, "Invalid parameter types: region and summonerName must be strings"));
    }

    const res = await fetch(`${RIOT_API_URL}/riot/account/v1/accounts/by-riot-id/${summonerName}/${region}`, {
      headers: {
        "X-Riot-Token": RIOT_API_KEY,
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return c.json(createErrorResponse(res.status, errorData.status?.message || "Failed to fetch account"));
    }

    const data = await res.json();
    return c.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Account fetch error:", error);
    return c.json(createErrorResponse(500, "Internal server error"));
  }
});

/**
 * * Get match details by matchId
 * * Input: game, matchId
 * * Output: match details
 */
app.get("/:game/match/:matchId", async (c) => {
  try {
    const game = c.req.param("game");
    const matchId = c.req.param("matchId");

    // Input validation
    if (!game || !matchId) {
      return c.json(createErrorResponse(400, "Missing required parameters: game and matchId"));
    }

    // Validate game parameter (common Riot games)
    const validGames = ["lol", "tft", "lor", "val"];
    if (!validGames.includes(game)) {
      return c.json(createErrorResponse(400, `Invalid game parameter. Must be one of: ${validGames.join(", ")}`));
    }

    const res = await fetch(`${RIOT_API_URL}/${game}/match/v5/matches/${matchId}`, {
      headers: {
        "X-Riot-Token": RIOT_API_KEY,
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return c.json(createErrorResponse(res.status, errorData.status?.message || "Failed to fetch match details"));
    }

    const data = await res.json();
    return c.json({
      success: true,
      matchId,
      game,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Match fetch error:", error);
    return c.json(createErrorResponse(500, "Internal server error"));
  }
});

/**
 * * Get match IDs by PUUID
 * * Input: game, puuid, start (optional), count (optional)
 * * Output: list of match IDs
 */
app.get("/:game/matches/by-puuid/:puuid", async (c) => {
  try {
    const game = c.req.param("game");
    const puuid = c.req.param("puuid");
    const start = c.req.query("start") || "0";
    const count = c.req.query("count") || "20";
    const type = c.req.query("type") || "";

    // Input validation
    if (!game || !puuid) {
      return c.json(createErrorResponse(400, "Missing required parameters: game and puuid"));
    }

    // Validate game parameter (common Riot games)
    const validGames = ["lol", "tft", "lor", "val"];
    if (!validGames.includes(game)) {
      return c.json(createErrorResponse(400, `Invalid game parameter. Must be one of: ${validGames.join(", ")}`));
    }

    // Validate start and count parameters
    const startNum = parseInt(start);
    const countNum = parseInt(count);

    if (isNaN(startNum) || startNum < 0) {
      return c.json(createErrorResponse(400, "Invalid start parameter. Must be a non-negative integer"));
    }

    if (isNaN(countNum) || countNum < 1 || countNum > 100) {
      return c.json(createErrorResponse(400, "Invalid count parameter. Must be between 1 and 100"));
    }

    const res = await fetch(
      `${RIOT_API_URL}/${game}/match/v5/matches/by-puuid/${puuid}/ids?start=${startNum}&count=${countNum}&type=${type}`,
      {
        headers: {
          "X-Riot-Token": RIOT_API_KEY,
        },
      }
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return c.json(createErrorResponse(res.status, errorData.status?.message || "Failed to fetch match IDs"));
    }

    const data = await res.json();
    return c.json({
      success: true,
      game,
      puuid,
      start: startNum,
      count: countNum,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Match IDs fetch error:", error);
    return c.json(createErrorResponse(500, "Internal server error"));
  }
});

/**
 * * Update user preferences
 * * Input: userId (path parameter), preferences (body)
 * * Output: updated preferences
 */
app.put("/users/:userId/prefs", authenticateRequest, async (c) => {
  try {
    const userId = c.req.param("userId");
    const body = await c.req.json();
    const { preferences } = body;

    if (!userId) {
      return c.json(createErrorResponse(400, "Missing required parameter: userId"));
    }

    if (!preferences || typeof preferences !== "object") {
      return c.json(createErrorResponse(400, "Missing or invalid preferences object"));
    }

    // Validate preferences structure
    const validPreferences = {
      theme: preferences.theme,
      language: preferences.language,
      notifications: preferences.notifications,
      privacy: preferences.privacy,
      gameSettings: preferences.gameSettings,
      customSettings: preferences.customSettings,
    };

    // Update user with preferences
    const updatedUser = await appwriteUsers.updatePrefs(userId, {
      prefs: JSON.stringify(validPreferences),
    });

    return c.json({
      success: true,
      message: "User preferences updated successfully",
      data: {
        id: updatedUser.$id,
        preferences: validPreferences,
        updatedAt: updatedUser.$updatedAt,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Preferences update error:", error);
    if (error instanceof Error && "code" in error && error.code === 404) {
      return c.json(createErrorResponse(404, "User not found"));
    }
    return c.json(createErrorResponse(500, "Failed to update preferences"));
  }
});

/**
 * * Get user preferences
 * * Input: userId (path parameter)
 * * Output: user preferences
 */
app.get("/users/:userId/prefs", authenticateRequest, async (c) => {
  try {
    const userId = c.req.param("userId");

    if (!userId) {
      return c.json(createErrorResponse(400, "Missing required parameter: userId"));
    }

    const user = await appwriteUsers.get(userId);

    // Parse preferences from user data
    let preferences = {};
    try {
      if (user.prefs && typeof user.prefs === "string") {
        preferences = JSON.parse(user.prefs);
      }
    } catch (parseError) {
      console.warn("Failed to parse user preferences:", parseError);
    }

    return c.json({
      success: true,
      data: {
        id: user.$id,
        preferences,
        updatedAt: user.$updatedAt,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Preferences fetch error:", error);
    if (error instanceof Error && "code" in error && error.code === 404) {
      return c.json(createErrorResponse(404, "User not found"));
    }
    return c.json(createErrorResponse(500, "Failed to fetch preferences"));
  }
});

// * Global error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json(createErrorResponse(500, "Internal server error"));
});

// * 404 handler
app.notFound((c) => {
  return c.json(createErrorResponse(404, "Endpoint not found"));
});

const handler = handle(app);

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const OPTIONS = handler;
