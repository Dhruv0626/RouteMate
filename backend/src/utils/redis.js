import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

/**
 * 🚀 CacheService: A centralized utility for Redis operations
 * Provides a clean API for getting, setting, and deleting cached data
 * with automatic JSON serialization and connection health monitoring.
 */
class CacheService {
    constructor() {
        this.client = null;
        this.isEnabled = process.env.CACHE_ENABLED === "true";

        if (this.isEnabled) {
            this.init();
        }
    }

    /**
     * Initialize the Redis connection
     */
    init() {
        try {
            this.client = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
                maxRetriesPerRequest: 3,
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                }
            });

            this.client.on("connect", () => {
                console.log("⚡ [Redis] Connecting to cache server...");
            });

            this.client.on("ready", () => {
                console.log("✅ [Redis] Cache server is ready and connected.");
            });

            this.client.on("error", (err) => {
                console.error("❌ [Redis] Cache Error:", err.message);
            });

        } catch (error) {
            console.error("❌ [Redis] Initialization failed:", error.message);
            this.isEnabled = false;
        }
    }

    /**
     * Set a value in the cache
     * @param {string} key - Cache key
     * @param {any} value - Data to store (will be JSON stringified)
     * @param {number} ttl - Time-to-live in seconds (default: 3600 / 1 hour)
     */
    async set(key, value, ttl = 3600) {
        if (!this.isEnabled || !this.client) return null;

        try {
            const stringValue = JSON.stringify(value);
            await this.client.set(key, stringValue, "EX", ttl);
            return true;
        } catch (error) {
            console.error(`[Redis] Failed to set key "${key}":`, error.message);
            return null;
        }
    }

    /**
     * Get a value from the cache
     * @param {string} key - Cache key
     * @returns {any|null} - Decoded data or null if miss
     */
    async get(key) {
        if (!this.isEnabled || !this.client) return null;

        try {
            const data = await this.client.get(key);
            if (!data) return null;

            return JSON.parse(data);
        } catch (error) {
            console.error(`[Redis] Failed to get key "${key}":`, error.message);
            return null;
        }
    }

    /**
     * Delete a specific key from cache
     * @param {string} key 
     */
    async del(key) {
        if (!this.isEnabled || !this.client) return null;

        try {
            await this.client.del(key);
            return true;
        } catch (error) {
            console.error(`[Redis] Failed to delete key "${key}":`, error.message);
            return null;
        }
    }

    /**
     * Delete multiple keys based on a pattern (e.g., "user:*")
     * @param {string} pattern 
     */
    async clearPattern(pattern) {
        if (!this.isEnabled || !this.client) return null;

        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(...keys);
            }
            return true;
        } catch (error) {
            console.error(`[Redis] Failed to clear pattern "${pattern}":`, error.message);
            return null;
        }
    }

    /**
     * Health check for Redis connection
     */
    async healthCheck() {
        if (!this.isEnabled) return { status: "Disabled" };
        if (!this.client) return { status: "Disconnected" };

        try {
            const pong = await this.client.ping();
            return { status: pong === "PONG" ? "Healthy" : "Degraded", latency: "N/A" };
        } catch (error) {
            return { status: "Error", message: error.message };
        }
    }
}

// Singleton instance
const cacheService = new CacheService();
export default cacheService;
