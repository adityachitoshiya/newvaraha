"""Daily stock update from the supplier's Excel sheet (admin only).

Flow: upload the sheet -> /preview (changes nothing, shows what would change)
-> /apply (writes the stock). Products are matched by the supplier's SKU
through the SupplierSku table; products without a SKU link are never touched.
"""
import csv
import io
import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from dependencies import get_current_admin
from models import Product, SupplierSku, SystemSetting

router = APIRouter()

MAX_FILE_BYTES = 5 * 1024 * 1024
MAX_STOCK_LIMIT = 1000
STATUS_KEY = "last_stock_sync"


def _to_int(value) -> Optional[int]:
    try:
        return max(0, int(float(str(value).strip())))
    except (TypeError, ValueError):
        return None


def _to_float(value) -> Optional[float]:
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return None


def parse_supplier_sheet(filename: str, data: bytes) -> dict:
    """Read the sheet into {SKU: (quantity, price, name)}. .xlsx and .csv are accepted."""
    name = (filename or "").lower()
    if name.endswith(".csv"):
        rows = list(csv.reader(io.StringIO(data.decode("utf-8-sig", errors="replace"))))
    elif name.endswith(".xlsx") or name.endswith(".xlsm"):
        try:
            from openpyxl import load_workbook
            ws = load_workbook(io.BytesIO(data), read_only=True, data_only=True).active
            rows = [list(r) for r in ws.iter_rows(values_only=True)]
        except Exception:
            raise HTTPException(status_code=400, detail="Could not read this Excel file. Save it as .xlsx and try again.")
    else:
        raise HTTPException(status_code=400, detail="Upload the supplier's .xlsx (or .csv) file.")

    if not rows:
        raise HTTPException(status_code=400, detail="The file is empty.")
    header = [str(c or "").strip().lower() for c in rows[0]]

    def col(*names):
        for i, h in enumerate(header):
            if h in names:
                return i
        return None

    i_sku, i_qty = col("sku", "sku code", "product code"), col("quantity", "qty", "stock")
    i_price, i_name = col("price", "supplier price", "cost"), col("product name", "name", "title")
    if i_sku is None or i_qty is None:
        raise HTTPException(status_code=400, detail="The first row must have 'SKU' and 'Quantity' columns.")

    out = {}
    for r in rows[1:]:
        if i_sku >= len(r) or not r[i_sku]:
            continue
        sku = str(r[i_sku]).strip().upper()
        qty = _to_int(r[i_qty]) if i_qty < len(r) else None
        if not sku or qty is None:
            continue
        price = _to_float(r[i_price]) if i_price is not None and i_price < len(r) else None
        pname = str(r[i_name]).strip() if i_name is not None and i_name < len(r) and r[i_name] else ""
        out[sku] = (qty, price, pname)
    if not out:
        raise HTTPException(status_code=400, detail="No rows with a SKU and Quantity were found.")
    return out


@router.post("/api/admin/stock-sync/preview")
async def preview_stock_sync(
    file: UploadFile = File(...),
    max_stock: int = Form(3),
    zero_missing: bool = Form(False),
    current_user=Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Compare the sheet with our stock. Writes nothing."""
    data = await file.read()
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(status_code=400, detail="File is too large (5 MB max).")
    max_stock = max(0, min(int(max_stock), MAX_STOCK_LIMIT))
    sheet = parse_supplier_sheet(file.filename, data)

    links = session.exec(select(SupplierSku)).all()
    products = {p.id: p for p in session.exec(select(Product)).all()}

    rows, missing, matched = [], [], set()
    for link in links:
        p = products.get(link.product_id)
        if not p:
            continue
        if link.sku in sheet:
            matched.add(link.sku)
            qty, price, _ = sheet[link.sku]
            new_stock = min(qty, max_stock)
            old_price = link.supplier_price
            rows.append({
                "product_id": p.id, "sku": link.sku, "name": p.name, "section": p.category,
                "image": p.image, "current_stock": p.stock, "new_stock": new_stock,
                "supplier_qty": qty, "supplier_price": price, "old_supplier_price": old_price,
                "price_changed": bool(price is not None and old_price is not None and abs(price - old_price) > 0.5),
                "changes": p.stock != new_stock,
            })
        else:
            missing.append({
                "product_id": p.id, "sku": link.sku, "name": p.name, "section": p.category,
                "image": p.image, "current_stock": p.stock,
                "new_stock": 0 if zero_missing else p.stock,
                "changes": bool(zero_missing and p.stock != 0),
            })

    unmatched = [{"sku": k, "name": v[2], "qty": v[0], "price": v[1]} for k, v in sheet.items() if k not in matched
                 and k not in {l.sku for l in links}]
    return {
        "file": file.filename,
        "sheet_rows": len(sheet),
        "linked_products": len(links),
        "in_file": rows,
        "not_in_file": missing,
        "not_listed": unmatched[:50],
        "not_listed_count": len(unmatched),
        "summary": {
            "will_change": sum(1 for r in rows if r["changes"]) + sum(1 for m in missing if m["changes"]),
            "unchanged": sum(1 for r in rows if not r["changes"]) + sum(1 for m in missing if not m["changes"]),
            "price_changes": sum(1 for r in rows if r["price_changed"]),
            "not_in_file": len(missing),
        },
    }


class StockChange(BaseModel):
    product_id: str
    stock: int
    sku: Optional[str] = None
    supplier_price: Optional[float] = None
    supplier_qty: Optional[int] = None


class ApplyRequest(BaseModel):
    changes: List[StockChange]
    file: Optional[str] = None


@router.post("/api/admin/stock-sync/apply")
def apply_stock_sync(body: ApplyRequest, current_user=Depends(get_current_admin), session: Session = Depends(get_session)):
    """Write the stock chosen in the preview. Only products linked to a supplier SKU can change."""
    if not body.changes:
        raise HTTPException(status_code=400, detail="Nothing to apply.")
    linked = {l.product_id: l for l in session.exec(select(SupplierSku)).all()}
    updated = to_zero = back_in_stock = 0
    for ch in body.changes:
        link = linked.get(ch.product_id)
        product = session.get(Product, ch.product_id)
        if not link or not product:
            continue  # never touch products that are not linked to a supplier SKU
        new_stock = max(0, min(int(ch.stock), MAX_STOCK_LIMIT))
        if product.stock != new_stock:
            if new_stock == 0:
                to_zero += 1
            elif not product.stock:
                back_in_stock += 1
            product.stock = new_stock
            session.add(product)
            updated += 1
        if ch.supplier_price is not None:
            link.supplier_price = ch.supplier_price
        if ch.supplier_qty is not None:
            link.last_qty = ch.supplier_qty
        link.updated_at = datetime.utcnow()
        session.add(link)

    status = {"at": datetime.utcnow().isoformat() + "Z", "file": body.file, "updated": updated,
              "now_out_of_stock": to_zero, "back_in_stock": back_in_stock, "checked": len(body.changes)}
    row = session.get(SystemSetting, STATUS_KEY)
    if row:
        row.value, row.updated_at = json.dumps(status), datetime.utcnow()
    else:
        row = SystemSetting(key=STATUS_KEY, value=json.dumps(status), description="Last supplier stock sync")
    session.add(row)
    session.commit()
    return {"ok": True, **status}


@router.get("/api/admin/stock-sync/status")
def stock_sync_status(current_user=Depends(get_current_admin), session: Session = Depends(get_session)):
    row = session.get(SystemSetting, STATUS_KEY)
    linked = len(session.exec(select(SupplierSku)).all())
    total = len(session.exec(select(Product)).all())
    return {"last": json.loads(row.value) if row else None, "linked_products": linked, "total_products": total}
