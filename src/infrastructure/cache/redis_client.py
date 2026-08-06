import os
import redis

# Create a single connection pool
pool = redis.ConnectionPool.from_url(
    os.getenv("REDIS_URL", "redis://localhost:6379"),
    decode_responses=True
)

# Provide a shared client instance
redis_client = redis.Redis(connection_pool=pool)
