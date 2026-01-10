from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlmodel import Session
from sqlalchemy import text
from database import get_session
from monitoring import monitor
from routes.web import check_admin_cookie
import time

router = APIRouter()

@router.get("/dashboard", response_class=HTMLResponse)
async def dashboard_ui(request: Request, session: Session = Depends(get_session)):
    # 1. Security Check
    if not check_admin_cookie(request):
        return RedirectResponse(url="/login?next=/dashboard", status_code=status.HTTP_303_SEE_OTHER)

    # 2. Gather Stats
    ram_usage = monitor.get_ram_usage()
    uptime = monitor.get_uptime()
    
    # 3. Check DB Status
    try:
        session.exec(text("SELECT 1"))
        db_status = "CONNECTED"
        db_color = "#2ecc71" # Green
        code_health = "HEALTHY"
        health_color = "#2ecc71"
    except Exception:
        db_status = "DISCONNECTED"
        db_color = "#e74c3c" # Red
        code_health = "CRITICAL"
        health_color = "#e74c3c"

    # 4. Render HTML (Server Side Rendering)
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Varaha Server Monitor 🛡️</title>
        <meta http-equiv="refresh" content="3"> 
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
        <style>
            :root {{
                --bg-color: #1a1a2d;
                --card-bg: #252540;
                --text-color: #F4E6D8; /* Warm Sand */
                --accent-copper: #A3562A;
                --heritage-brown: #7A3B23;
            }}
            body {{ 
                font-family: 'Inter', sans-serif; 
                background-color: var(--bg-color); 
                color: var(--text-color); 
                padding: 20px; 
                margin: 0;
            }}
            .container {{ max-width: 1200px; margin: 0 auto; }}
            
            header {{
                text-align: center;
                border-bottom: 2px solid var(--accent-copper);
                padding-bottom: 20px;
                margin-bottom: 30px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }}
            
            h1 {{ 
                font-family: 'Cormorant Garamond', serif; 
                color: var(--text-color);
                margin: 0;
            }}
            
            .badge {{
                background: var(--heritage-brown);
                padding: 5px 15px;
                border-radius: 20px;
                font-size: 0.9rem;
                display: flex;
                align-items: center;
                gap: 8px;
            }}
            
            /* Grid Layout */
            .stats-grid {{ 
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); 
                gap: 20px; 
                margin-bottom: 40px; 
            }}
            
            .card {{ 
                background: var(--card-bg); 
                padding: 25px; 
                border-radius: 12px; 
                border: 1px solid rgba(163, 86, 42, 0.2); 
                text-align: center; 
                transition: transform 0.2s;
            }}
            
            .card:hover {{ transform: translateY(-3px); border-color: var(--accent-copper); }}
            
            .card h3 {{ 
                margin: 0; 
                font-size: 14px; 
                color: #a0a0c0; 
                text-transform: uppercase; 
                letter-spacing: 1px;
            }}
            
            .card .value {{ font-size: 32px; font-weight: bold; margin: 15px 0; font-family: 'Cormorant Garamond', serif; }}
            
            .status-ok {{ color: #2ecc71; }} 
            .status-bad {{ color: #e74c3c; }} 
            .status-warn {{ color: #f1c40f; }} 

            .section-title {{
                font-family: 'Cormorant Garamond', serif;
                font-size: 1.5rem;
                margin-bottom: 15px;
                color: var(--accent-copper);
                border-left: 4px solid var(--accent-copper);
                padding-left: 10px;
            }}

            .logs-section {{ 
                background: var(--card-bg); 
                padding: 20px; 
                border-radius: 12px; 
                margin-bottom: 30px;
                border: 1px solid rgba(163, 86, 42, 0.1);
            }}
            
            table {{ width: 100%; border-collapse: collapse; }}
            th, td {{ 
                text-align: left; 
                padding: 12px; 
                border-bottom: 1px solid rgba(255,255,255,0.05); 
                font-size: 0.95rem;
            }}
            th {{ color: #a0a0c0; font-weight: 500; }}
            tr:last-child td {{ border-bottom: none; }}
            
            .method-tag {{
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: bold;
                background: #444;
            }}
            
        </style>
    </head>
    <body>
        <div class="container">
            <header>
                <div style="display:flex; align-items:center; gap:15px;">
                     <img src="https://newvaraha-nwbd.vercel.app/varaha-assets/logo.png" height="40" style="filter: brightness(2);">
                     <h1>System Dashboard</h1>
                </div>
                <div class="badge">
                    <span style="width:10px; height:10px; border-radius:50%; background-color:{health_color}; box-shadow: 0 0 10px {health_color};"></span>
                    System: {code_health}
                </div>
            </header>
            
            <div class="stats-grid">
                <div class="card">
                    <h3>RAM Usage</h3>
                    <div class="value" style="color: #3498db;">{ram_usage} MB</div>
                </div>

                <div class="card">
                    <h3>Database</h3>
                    <div class="value" style="color: {db_color};">{db_status}</div>
                </div>

                <div class="card">
                    <h3>Uptime</h3>
                    <div class="value" style="color: var(--text-color);">{uptime}</div>
                </div>

                <div class="card">
                    <h3>Total Requests</h3>
                    <div class="value">{monitor.total_requests}</div>
                </div>
                
                 <div class="card">
                    <h3>Errors (500)</h3>
                    <div class="value { 'status-bad' if monitor.status_codes['500'] > 0 else 'status-ok' }">{monitor.status_codes['500']}</div>
                </div>
            </div>

            <h2 class="section-title">⚠️ Recent Crashes</h2>
            <div class="logs-section">
                <table>
                    <thead>
                        <tr>
                            <th width="15%">Time</th>
                            <th width="10%">Method</th>
                            <th width="35%">Path</th>
                            <th>Error</th>
                        </tr>
                    </thead>
                    <tbody>
                        {"".join([f'''
                            <tr>
                                <td>{log['timestamp']}</td>
                                <td><span class="method-tag" style="color:#ffcccc;">{log['method']}</span></td>
                                <td style="font-family:monospace;">{log['path']}</td>
                                <td style="color:#e74c3c;">{log['error_type']}</td>
                            </tr>
                        ''' for log in monitor.recent_crashes])}
                        
                        {'<tr><td colspan="4" style="text-align:center; color:#2ecc71; padding: 20px;">All Systems Operational. No recent crashes.</td></tr>' if not monitor.recent_crashes else ''}
                    </tbody>
                </table>
            </div>
            
            <h2 class="section-title">🐢 Slow Routes (>500ms)</h2>
            <div class="logs-section">
                <table>
                    <thead>
                        <tr>
                            <th width="20%">Time</th>
                            <th width="60%">Path</th>
                            <th>Duration</th>
                        </tr>
                    </thead>
                    <tbody>
                         {"".join([f'''
                            <tr>
                                <td>{log['timestamp']}</td>
                                <td style="font-family:monospace;">{log['path']}</td>
                                <td style="color:#f1c40f;">{log['time_taken']}</td>
                            </tr>
                        ''' for log in monitor.slow_routes])}
                        
                        {'<tr><td colspan="3" style="text-align:center; color:#2ecc71; padding: 20px;">Performance Optimal. No slow routes detected.</td></tr>' if not monitor.slow_routes else ''}
                    </tbody>
                </table>
            </div>

        </div>
    </body>
    </html>
    """
    
    return html_content
