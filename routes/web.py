from fastapi import APIRouter, Request, Response, Form, Depends
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.openapi.utils import get_openapi
from fastapi import status, HTTPException
import secrets
from sqlmodel import Session, select
from database import get_session
from models import Product

router = APIRouter()

# --- Products Gallery UI ---
@router.get("/products", response_class=HTMLResponse)
def products_gallery(request: Request, session: Session = Depends(get_session)):
    products = session.exec(select(Product)).all()
    
    product_cards = ""
    for p in products:
        image_url = p.image if p.image else "https://newvaraha-nwbd.vercel.app/varaha-assets/logo.png"
        price = f"₹{p.price:,.2f}" if p.price else "Price on Request"
        product_cards += f"""
            <div class="card">
                <div class="card-image">
                    <img src="{image_url}" alt="{p.name}" onerror="this.src='https://newvaraha-nwbd.vercel.app/varaha-assets/logo.png'">
                    {f'<span class="tag">{p.tag}</span>' if p.tag else ''}
                </div>
                <div class="card-content">
                    <h3>{p.name}</h3>
                    <p class="category">{p.category} | {p.metal}</p>
                    <div class="price">{price}</div>
                </div>
            </div>
        """

    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Products Gallery - Varaha Jewels</title>
        <link rel="icon" type="image/png" href="https://newvaraha-nwbd.vercel.app/varaha-assets/og.jpg">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Inter:wght@400;500&display=swap');
            
            :root {{
                --heritage-brown: #7A3B23;
                --warm-sand: #F4E6D8;
                --copper-brown: #A3562A;
            }}

            body {{
                margin: 0;
                padding: 0;
                background-color: var(--warm-sand);
                color: var(--heritage-brown);
                font-family: 'Inter', sans-serif;
            }}
            
            header {{
                background-color: var(--heritage-brown);
                padding: 1rem 2rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }}
            
            header .logo-text {{
                color: var(--warm-sand);
                font-family: 'Cormorant Garamond', serif;
                font-size: 1.5rem;
                font-weight: 700;
                text-decoration: none;
                display: flex;
                align-items: center;
                gap: 10px;
            }}
            
            header .logo-text img {{
                height: 40px;
            }}

            .container {{
                max-width: 1200px;
                margin: 2rem auto;
                padding: 0 20px;
            }}

            h1 {{
                font-family: 'Cormorant Garamond', serif;
                font-size: 2.5rem;
                color: var(--heritage-brown);
                text-align: center;
                margin-bottom: 3rem;
                position: relative;
            }}
            
            h1::after {{
                content: "";
                display: block;
                width: 60px;
                height: 3px;
                background: var(--copper-brown);
                margin: 10px auto 0;
            }}

            .grid {{
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 2rem;
            }}

            .card {{
                background: rgba(255, 255, 255, 0.6);
                border: 1px solid rgba(163, 86, 42, 0.1);
                border-radius: 12px;
                overflow: hidden;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }}

            .card:hover {{
                transform: translateY(-5px);
                box-shadow: 0 10px 25px rgba(122, 59, 35, 0.15);
                background: rgba(255, 255, 255, 0.9);
            }}

            .card-image {{
                height: 320px;
                width: 100%;
                position: relative;
                overflow: hidden;
            }}

            .card-image img {{
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform 0.5s ease;
            }}
            
            .card:hover .card-image img {{
                transform: scale(1.05);
            }}

            .tag {{
                position: absolute;
                top: 10px;
                right: 10px;
                background: rgba(255, 255, 255, 0.9);
                color: var(--heritage-brown);
                padding: 4px 12px;
                font-size: 0.75rem;
                font-weight: 600;
                text-transform: uppercase;
                border-radius: 4px;
                backdrop-filter: blur(4px);
            }}

            .card-content {{
                padding: 1.5rem;
                text-align: center;
            }}

            .card-content h3 {{
                font-family: 'Cormorant Garamond', serif;
                font-size: 1.25rem;
                margin: 0 0 0.5rem;
                color: var(--heritage-brown);
            }}

            .card-content .category {{
                font-size: 0.85rem;
                color: var(--copper-brown);
                margin-bottom: 1rem;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }}

            .card-content .price {{
                font-size: 1.1rem;
                font-weight: 600;
                color: var(--heritage-brown);
            }}
            
            .empty-state {{
                text-align: center;
                padding: 4rem;
                color: var(--copper-brown);
                font-size: 1.2rem;
            }}
        </style>
    </head>
    <body>
        <header>
            <a href="/" class="logo-text">
                <img src="https://newvaraha-nwbd.vercel.app/varaha-assets/logo.png" alt="Logo">
                Varaha Jewels
            </a>
            <a href="/login" style="color: var(--warm-sand); text-decoration: none;">Admin Login</a>
        </header>

        <div class="container">
            <h1>Our Collection</h1>
            
            {f'<div class="grid">{product_cards}</div>' if products else '<div class="empty-state">No products found. Start adding some from the Admin Panel.</div>'}
        
        </div>
    </body>
    </html>
    """

# --- Security for Docs (Cookie Based) ---

def check_admin_cookie(request: Request):
    token = request.cookies.get("admin_docs_token")
    if not token or token != "varaha_secure_session_token":
        return None
    return token

# --- HTML Endpoints ---

@router.get("/", response_class=HTMLResponse)
def read_root():
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Varaha Jewels Backend</title>
        <link rel="icon" type="image/png" href="https://newvaraha-nwbd.vercel.app/varaha-assets/og.jpg">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Inter:wght@400;500&display=swap');
            
            :root {
                --heritage-brown: #7A3B23;
                --warm-sand: #F4E6D8;
                --copper-brown: #A3562A;
                --royal-orange: #E07A24;
            }

            body {
                margin: 0;
                padding: 0;
                background-color: var(--warm-sand);
                color: var(--heritage-brown);
                font-family: 'Inter', sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                text-align: center;
            }

            .container {
                max-width: 600px;
                padding: 3rem;
                /* Subtle glass effect */
                background: rgba(255, 255, 255, 0.4);
                border: 1px solid rgba(163, 86, 42, 0.2);
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(122, 59, 35, 0.1);
                backdrop-filter: blur(8px);
            }

            .logo {
                width: 120px;
                height: auto;
                margin-bottom: 2rem;
                filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
            }

            h1 {
                font-family: 'Cormorant Garamond', serif;
                font-size: 3.5rem;
                font-weight: 700;
                color: var(--heritage-brown);
                margin: 0 0 1rem 0;
                letter-spacing: -0.02em;
                line-height: 1.1;
            }

            p {
                font-size: 1.125rem;
                color: var(--copper-brown);
                margin-bottom: 2.5rem;
                line-height: 1.6;
                font-weight: 500;
            }

            .btn {
                display: inline-block;
                padding: 14px 36px;
                background: linear-gradient(135deg, var(--copper-brown), var(--heritage-brown));
                color: #fff;
                text-decoration: none;
                font-weight: 500;
                border-radius: 50px; /* Pill shape */
                transition: all 0.3s ease;
                font-family: 'Inter', sans-serif;
                font-size: 1rem;
                box-shadow: 0 4px 15px rgba(122, 59, 35, 0.3);
            }

            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(122, 59, 35, 0.4);
                filter: brightness(1.1);
            }

            .footer {
                margin-top: 3.5rem;
                font-size: 0.875rem;
                color: var(--heritage-brown);
                opacity: 0.7;
                font-family: 'Cormorant Garamond', serif;
                font-style: italic;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <img src="https://newvaraha-nwbd.vercel.app/varaha-assets/logo.png" alt="Varaha Jewels Logo" class="logo">
            <h1>Varaha Jewels</h1>
            <p>Secure Backend Service<br>Powering Timeless Elegance</p>
            <a href="/docs" class="btn">Explore API Access</a>
            <a href="/products" class="btn" style="background: transparent; border: 2px solid var(--heritage-brown); color: var(--heritage-brown); margin-left: 10px;">View Collection</a>
            
            <div class="footer">
                &copy; 2025 Varaha Jewels. System Secure.
            </div>
        </div>
    </body>
    </html>
    """

# --- Custom Login Page ---
@router.get("/login", response_class=HTMLResponse)
def login_page(request: Request):
    error = request.query_params.get("error")
    error_msg = f'<p style="color: #ff6b6b; margin-top: 10px;">{error}</p>' if error else ""
    
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login - Varaha Jewels Backend</title>
        <link rel="icon" type="image/png" href="https://newvaraha-nwbd.vercel.app/varaha-assets/og.jpg">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Inter:wght@400;500&display=swap');
            
            :root {{
                --heritage-brown: #7A3B23;
                --warm-sand: #F4E6D8;
                --copper-brown: #A3562A;
            }}

            body {{
                margin: 0;
                padding: 0;
                background-color: var(--warm-sand);
                color: var(--heritage-brown);
                font-family: 'Inter', sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
            }}

            .login-container {{
                width: 100%;
                max-width: 400px;
                padding: 3rem;
                background: rgba(255, 255, 255, 0.4);
                border: 1px solid rgba(163, 86, 42, 0.2);
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(122, 59, 35, 0.1);
                backdrop-filter: blur(8px);
                text-align: center;
            }}

            .logo {{
                width: 80px;
                margin-bottom: 1.5rem;
            }}

            h2 {{
                font-family: 'Cormorant Garamond', serif;
                font-size: 2rem;
                margin-bottom: 2rem;
                color: var(--heritage-brown);
            }}

            input {{
                width: 100%;
                padding: 12px;
                margin-bottom: 1rem;
                border: 1px solid rgba(122, 59, 35, 0.2);
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.6);
                font-family: 'Inter', sans-serif;
                box-sizing: border-box; 
            }}
            
            input:focus {{
                outline: none;
                border-color: var(--copper-brown);
                box-shadow: 0 0 0 2px rgba(163, 86, 42, 0.1);
            }}

            button {{
                width: 100%;
                padding: 12px;
                background: linear-gradient(135deg, var(--copper-brown), var(--heritage-brown));
                color: white;
                border: none;
                border-radius: 8px;
                font-weight: 500;
                cursor: pointer;
                transition: transform 0.2s;
                font-size: 1rem;
            }}

            button:hover {{
                transform: translateY(-2px);
            }}
        </style>
    </head>
    <body>
        <div class="login-container">
            <img src="https://newvaraha-nwbd.vercel.app/varaha-assets/logo.png" alt="Logo" class="logo">
            <h2>Admin Access</h2>
            <script>
                // Pass URL parameters to form action
                const urlParams = new URLSearchParams(window.location.search);
                const next = urlParams.get('next') || '/docs';
                document.write(`<form action="/login?next=${next}" method="post">`);
            </script>
                <input type="text" name="username" placeholder="Username" required>
                <input type="password" name="password" placeholder="Password" required>
                <button type="submit">Sign In</button>
            </form>
            {{error_msg}}
        </div>
    </body>
    </html>
    """

@router.post("/login")
def login(response: Response, username: str = Form(...), password: str = Form(...), next: str = "/docs"):
    if secrets.compare_digest(username, "aditya") and secrets.compare_digest(password, "chitoshiya"):
        # Set a cookie
        response = RedirectResponse(url=next, status_code=status.HTTP_303_SEE_OTHER)
        response.set_cookie(key="admin_docs_token", value="varaha_secure_session_token", httponly=True)
        return response
    else:
        return RedirectResponse(url=f"/login?error=Invalid Credentials&next={next}", status_code=status.HTTP_303_SEE_OTHER)

@router.get("/logout")
def logout():
    response = RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)
    response.delete_cookie("admin_docs_token")
    return response

# --- Protected Docs Endpoints ---

@router.get("/docs", include_in_schema=False)
async def get_documentation(request: Request):
    if not check_admin_cookie(request):
        return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)
    
    response = get_swagger_ui_html(
        openapi_url="/openapi.json",
        title="Docs",
        swagger_favicon_url="https://newvaraha-nwbd.vercel.app/varaha-assets/og.jpg"
    )
    
    # Inject Custom CSS for Varaha Theme
    custom_css = """
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Inter:wght@400;500&display=swap');
        
        body {
            background-color: #F4E6D8 !important; /* warm-sand */
            font-family: 'Inter', sans-serif !important;
        }
        
        .swagger-ui .topbar {
            background-color: #7A3B23 !important; /* heritage-brown */
            border-bottom: 2px solid #A3562A; /* copper-brown */
        }
        
        /* Hide Default Logo */
        .swagger-ui .topbar .link img {
            display: none;
        }

        /* Add Custom Logo via Pseudo-element */
        .swagger-ui .topbar .link::before {
            content: "";
            background-image: url('https://newvaraha-nwbd.vercel.app/varaha-assets/logo.png');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            width: 50px;
            height: 50px;
            display: inline-block;
            margin-right: 15px;
        }
        
        .swagger-ui .topbar .link {
            display: flex;
            align-items: center;
        }
        
        .swagger-ui .topbar .link::after {
            content: "Varaha Jewels API";
            color: #F4E6D8;
            font-family: 'Cormorant Garamond', serif;
            font-size: 1.5rem;
            font-weight: 700;
        }

        .swagger-ui .info .title {
            font-family: 'Cormorant Garamond', serif !important;
            color: #7A3B23 !important;
        }
        
        .swagger-ui .info p {
             color: #A3562A !important;
        }

        .swagger-ui .scheme-container {
            background-color: rgba(255,255,255,0.5) !important;
            box-shadow: none !important;
            border-radius: 8px;
        }

        .swagger-ui .opblock-tag {
            color: #7A3B23 !important;
            border-bottom-color: #A3562A !important;
            font-family: 'Cormorant Garamond', serif;
            font-size: 1.5rem;
        }

        .swagger-ui .opblock .opblock-summary-method {
            background-color: #7A3B23 !important;
        }
        
        .swagger-ui .btn.authorize {
            background-color: #fff !important;
            color: #7A3B23 !important;
            border-color: #7A3B23 !important;
        }
        
        .swagger-ui .btn.authorize svg {
            fill: #7A3B23 !important;
        }
    </style>
    """
    
    html_content = response.body.decode("utf-8")
    new_html_content = html_content.replace("</head>", f"{custom_css}</head>")
    
    return HTMLResponse(content=new_html_content)

@router.get("/redoc", include_in_schema=False)
async def get_redoc_documentation(request: Request):
    if not check_admin_cookie(request):
         return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)
    return get_redoc_html(openapi_url="/openapi.json", title="ReDoc")

@router.get("/openapi.json", include_in_schema=False)
async def get_open_api_endpoint(request: Request):
    if not check_admin_cookie(request):
        # Return 401 for JSON endpoint rather than redirect
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    return get_openapi(title="Varaha Jewels API", version="1.0.0", routes=request.app.routes)
