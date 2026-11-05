# Category is defined once in models.py. Defining the same table twice made
# SQLAlchemy create the "ix_category_name" index twice (crash on a fresh DB).
from models import Category, CategoryBase  # noqa: F401
