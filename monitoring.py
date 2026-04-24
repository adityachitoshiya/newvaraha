import time
import psutil
import os
from datetime import datetime
from collections import  deque

class ServerMonitor:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ServerMonitor, cls).__new__(cls)
            cls._instance.init_monitor()
        return cls._instance

    def init_monitor(self):
        self.start_time = time.time()
        self.total_requests = 0
        self.status_codes = {"200": 0, "400": 0, "404": 0, "500": 0}
        # Keep last 10 crashes
        self.recent_crashes = deque(maxlen=10)
        # Keep last 10 slow routes
        self.slow_routes = deque(maxlen=10)
        # Keep last 100 logs
        self.logs = deque(maxlen=100)
    
    def log_message(self, source, level, message):
        self.logs.appendleft({
            "timestamp": datetime.now().strftime("%I:%M:%S %p"),
            "source": source, # 'BACKEND' or 'FRONTEND'
            "level": level,   # 'INFO', 'ERROR', 'WARN'
            "message": str(message)
        })

    def get_uptime(self):
        uptime_seconds = time.time() - self.start_time
        hours = int(uptime_seconds // 3600)
        minutes = int((uptime_seconds % 3600) // 60)
        return f"{hours}h {minutes}m"

    def get_ram_usage(self):
        process = psutil.Process(os.getpid())
        mem_info = process.memory_info()
        return f"{mem_info.rss / 1024 / 1024:.2f}"

    def log_request(self, status_code):
        self.total_requests += 1
        code_str = str(status_code)
        
        # Simple grouping
        if code_str.startswith("2"):
            self.status_codes["200"] += 1
        elif code_str.startswith("4") and code_str != "404":
            self.status_codes["400"] += 1
        elif code_str == "404":
             self.status_codes["404"] += 1
        elif code_str.startswith("5"):
            self.status_codes["500"] += 1

    def log_crash(self, method, path, error):
        self.recent_crashes.appendleft({
            "timestamp": datetime.now().strftime("%I:%M:%S %p"),
            "method": method,
            "path": path,
            "error_type": str(error)
        })

    def log_slow_route(self, method, path, duration_ms):
        self.slow_routes.appendleft({
            "timestamp": datetime.now().strftime("%I:%M:%S %p"),
            "path": f"{method} {path}",
            "time_taken": f"{duration_ms:.2f}ms"
        })

monitor = ServerMonitor()
