from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from database import get_session
from models import BlogPost
from dependencies import get_current_admin
from datetime import datetime
from typing import Optional
import re
import json

router = APIRouter()


# ─── Helper: Generate Slug ───
def generate_slug(title: str) -> str:
    """Generate a URL-friendly slug from the title."""
    slug = title.lower().strip()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug.strip('-')


# ══════════════════════════════════════
# PUBLIC ENDPOINTS
# ══════════════════════════════════════

@router.get("/api/blogs")
def get_published_blogs(
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
    tag: Optional[str] = None,
    session: Session = Depends(get_session)
):
    """Get all published blog posts (paginated)."""
    query = select(BlogPost).where(BlogPost.is_published == True)
    
    # Tag filter
    if tag:
        query = query.where(BlogPost.tags.contains(tag))
    
    # Count total
    all_posts = session.exec(query).all()
    total = len(all_posts)
    
    # Sort by date desc + paginate
    query = query.order_by(BlogPost.created_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)
    posts = session.exec(query).all()
    
    # Parse tags for response
    result = []
    for post in posts:
        post_dict = post.dict()
        try:
            post_dict['tags'] = json.loads(post.tags) if post.tags else []
        except:
            post_dict['tags'] = []
        result.append(post_dict)
    
    return {
        "posts": result,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }


@router.get("/api/blogs/{slug}")
def get_blog_by_slug(slug: str, session: Session = Depends(get_session)):
    """Get a single published blog post by slug."""
    post = session.exec(
        select(BlogPost).where(BlogPost.slug == slug, BlogPost.is_published == True)
    ).first()
    
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    
    post_dict = post.dict()
    try:
        post_dict['tags'] = json.loads(post.tags) if post.tags else []
    except:
        post_dict['tags'] = []
    
    return post_dict


# ══════════════════════════════════════
# ADMIN ENDPOINTS
# ══════════════════════════════════════

@router.get("/api/admin/blogs")
def admin_list_blogs(
    admin=Depends(get_current_admin),
    session: Session = Depends(get_session)
):
    """Admin: List all blog posts (including drafts)."""
    posts = session.exec(
        select(BlogPost).order_by(BlogPost.created_at.desc())
    ).all()
    
    result = []
    for post in posts:
        post_dict = post.dict()
        try:
            post_dict['tags'] = json.loads(post.tags) if post.tags else []
        except:
            post_dict['tags'] = []
        result.append(post_dict)
    
    return result


@router.post("/api/admin/blogs")
def create_blog(
    data: dict,
    admin=Depends(get_current_admin),
    session: Session = Depends(get_session)
):
    """Admin: Create a new blog post."""
    title = data.get('title', '').strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")
    
    # Generate unique slug
    base_slug = generate_slug(title)
    slug = base_slug
    counter = 1
    while session.exec(select(BlogPost).where(BlogPost.slug == slug)).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    # Parse tags
    tags = data.get('tags', [])
    if isinstance(tags, list):
        tags_json = json.dumps(tags)
    else:
        tags_json = tags if tags else "[]"
    
    post = BlogPost(
        title=title,
        slug=slug,
        content=data.get('content', ''),
        excerpt=data.get('excerpt', ''),
        cover_image=data.get('cover_image', ''),
        author=data.get('author', 'Varaha Jewels'),
        tags=tags_json,
        is_published=data.get('is_published', False),
    )
    
    session.add(post)
    session.commit()
    session.refresh(post)
    
    return {"ok": True, "id": post.id, "slug": post.slug}


@router.put("/api/admin/blogs/{blog_id}")
def update_blog(
    blog_id: int,
    data: dict,
    admin=Depends(get_current_admin),
    session: Session = Depends(get_session)
):
    """Admin: Update a blog post."""
    post = session.get(BlogPost, blog_id)
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    
    if 'title' in data:
        post.title = data['title'].strip()
        # Regenerate slug if title changed
        new_slug = generate_slug(post.title)
        if new_slug != post.slug:
            base_slug = new_slug
            slug = base_slug
            counter = 1
            while True:
                existing = session.exec(
                    select(BlogPost).where(BlogPost.slug == slug, BlogPost.id != blog_id)
                ).first()
                if not existing:
                    break
                slug = f"{base_slug}-{counter}"
                counter += 1
            post.slug = slug
    
    if 'content' in data:
        post.content = data['content']
    if 'excerpt' in data:
        post.excerpt = data['excerpt']
    if 'cover_image' in data:
        post.cover_image = data['cover_image']
    if 'author' in data:
        post.author = data['author']
    if 'is_published' in data:
        post.is_published = data['is_published']
    
    if 'tags' in data:
        tags = data['tags']
        if isinstance(tags, list):
            post.tags = json.dumps(tags)
        else:
            post.tags = tags if tags else "[]"
    
    post.updated_at = datetime.utcnow()
    
    session.add(post)
    session.commit()
    session.refresh(post)
    
    return {"ok": True, "id": post.id, "slug": post.slug}


@router.delete("/api/admin/blogs/{blog_id}")
def delete_blog(
    blog_id: int,
    admin=Depends(get_current_admin),
    session: Session = Depends(get_session)
):
    """Admin: Delete a blog post."""
    post = session.get(BlogPost, blog_id)
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    
    session.delete(post)
    session.commit()
    
    return {"ok": True, "message": "Blog post deleted"}
