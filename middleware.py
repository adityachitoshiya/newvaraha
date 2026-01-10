from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
import time
from monitoring import monitor
import traceback

class MonitoringMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
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
