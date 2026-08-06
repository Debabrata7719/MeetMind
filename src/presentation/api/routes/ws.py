import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from src.infrastructure.cache.redis_client import redis_client

router = APIRouter()

@router.websocket("/ws/{meeting_id}")
async def websocket_endpoint(websocket: WebSocket, meeting_id: str):
    await websocket.accept()
    pubsub = redis_client.pubsub()
    channel_name = f"job_updates:{meeting_id}"
    pubsub.subscribe(channel_name)
    
    try:
        while True:
            # Check for new messages from Redis pub/sub
            message = pubsub.get_message(ignore_subscribe_messages=True)
            if message:
                data = message['data']
                await websocket.send_text(data)
                
                # Close if done or failed
                parsed = json.loads(data)
                if parsed.get("status") in ["done", "failed"]:
                    break
            
            # Prevent blocking the event loop entirely
            await asyncio.sleep(0.1)
            
    except WebSocketDisconnect:
        print(f"Client disconnected from WS channel {channel_name}")
    finally:
        pubsub.unsubscribe(channel_name)
        pubsub.close()
