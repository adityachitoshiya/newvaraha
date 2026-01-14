from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, Response
import time
from monitoring import monitor
import traceback

class MonitoringMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Security: Block direct browser navigation to /api endpoints
        # Frontend fetch requests usually send Sec-Fetch-Mode: cors
        # Direct browser navigation sends Sec-Fetch-Mode: navigate
        if request.url.path.startswith("/api/") and request.headers.get("sec-fetch-mode") == "navigate":
             return Response(content="Direct access to API is restricted.", status_code=403)

        try:
            response = await call_next(request)
            
            # Record metrics
            process_time_ms = (time.time() - start_time) * 1000
            
            # Log Request
            monitor.log_request(response.status_code)
            
            # Log Slow Request (> 500ms)
            if process_time_ms > 500:
                monitor.log_slow_route(request.method, request.url.path, process_time_ms)
                
            return response
            
        except Exception as e:
            # Log Crash
            monitor.log_request(500)
            monitor.log_crash(request.method, request.url.path, str(e))
            traceback.print_exc()
            raise e
