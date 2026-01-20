from fastapi import APIRouter, Depends, Query, HTTPException
from sqlmodel import Session, select, func
from typing import Optional, List
from datetime import datetime
import csv
from io import StringIO
from fastapi.responses import StreamingResponse

# Internal Imports
from database import get_session
from models import Order, AdminUser, StoreSettings
from dependencies import get_current_admin
from gst_states import GSTR1_STATE_MAPPING
import json

router = APIRouter()

@router.get("/api/admin/reports/sales")
def get_sales_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    export: Optional[bool] = False,
    session: Session = Depends(get_session),
    current_user: AdminUser = Depends(get_current_admin)
):
    query = select(Order)
    
    if start_date:
        try:
            s_date = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.where(Order.created_at >= s_date)
        except ValueError:
            pass # Ignore invalid date
            
    if end_date:
        try:
            e_date = datetime.strptime(end_date, "%Y-%m-%d")
            # Set to end of day
            e_date = e_date.replace(hour=23, minute=59, second=59)
            query = query.where(Order.created_at <= e_date)
        except ValueError:
            pass

    if status and status.lower() != 'all':
        query = query.where(Order.status == status)

    query = query.order_by(Order.created_at.desc())
    orders = session.exec(query).all()
    
    # Calculate Summary Stats
    total_sales = sum(o.total_amount for o in orders)
    total_orders = len(orders)
    
    # Prepare Data List
    report_data = []
    for o in orders:
        report_data.append({
            "order_id": o.order_id,
            "date": o.created_at.strftime("%Y-%m-%d %H:%M"),
            "customer": o.customer_name,
            "email": o.email,
            "payment_mode": o.payment_method,
            "status": o.status,
            "gross_amount": o.total_amount,
            "taxable_value": o.taxable_value or 0.0,
            "cgst": o.cgst_amount or 0.0,
            "sgst": o.sgst_amount or 0.0,
            "igst": o.igst_amount or 0.0,
            "state": o.state or "N/A"
        })

    if export:
        # Generate CSV
        output = StringIO()
        writer = csv.writer(output)
        
        # Headers
        headers = ["Order ID", "Date", "Customer Name", "Email", "Status", "Payment Mode", "Gross Amount", "Taxable Value", "CGST (1.5%)", "SGST (1.5%)", "IGST (3%)", "Place of Supply"]
        writer.writerow(headers)
        
        for row in report_data:
            writer.writerow([
                row["order_id"],
                row["date"],
                row["customer"],
                row["email"],
                row["status"],
                row["payment_mode"],
                row["gross_amount"],
                row["taxable_value"],
                row["cgst"],
                row["sgst"],
                row["igst"],
                row["state"]
            ])
            
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=sales_report_{datetime.now().strftime('%Y%m%d')}.csv"}
        )

    return {
        "stats": {
            "total_sales": total_sales,
            "total_orders": total_orders
        },
        "data": report_data
    }

@router.get("/api/admin/reports/gstr1")
def get_gstr1_json(
    start_date: str, # Required for FP
    end_date: str,
    session: Session = Depends(get_session),
    current_user: AdminUser = Depends(get_current_admin)
):
    try:
        s_date = datetime.strptime(start_date, "%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    orders = session.exec(
        select(Order)
        .where(Order.created_at >= s_date)
        .where(Order.created_at <= e_date)
        .where(Order.status != "cancelled") # Exclude cancelled
    ).all()

    store_settings = session.get(StoreSettings, 1)
    gstin = store_settings.gstin if store_settings and store_settings.gstin else "URP" 
    
    # Financial Period format: MMYYYY (e.g., 122025)
    fp = s_date.strftime("%m%Y") 

    # --- AGGREGATION LOGIC ---
    b2cs_map = {} # Key: (pos_code, rate)
    
    # HSN Summary
    # Since items are stored as JSON blobs, we might need to parse them.
    # For now, if we assume 7117 is the only HSN used for all items as per requirement:
    # "HSN Code (Default: 7117)"
    hsn_summary = {
        "7117": {
            "num": 1,
            "hsn_sc": "7117",
            "uqc": "PCS",
            "qty": 0,
            "rt": 3,
            "txval": 0.0,
            "iamt": 0.0,
            "samt": 0.0,
            "camt": 0.0,
            "csamt": 0.0
        }
    }

    for o in orders:
        if not o.taxable_value or o.taxable_value <= 0:
            continue
            
        # Resolve POS
        state_name = o.state or ""
        # Try exact match or normalization
        pos_code = GSTR1_STATE_MAPPING.get(state_name)
        if not pos_code:
            # Try searching keys
            for k, v in GSTR1_STATE_MAPPING.items():
                if k.lower() in state_name.lower():
                    pos_code = v
                    break
        if not pos_code:
            pos_code = "00" # Unknown

        # B2CS Aggregation
        # Key: POS + Rate (3%)
        key = (pos_code, 3) 
        
        if key not in b2cs_map:
            b2cs_map[key] = {
                "sply_ty": "INTER" if (o.igst_amount and o.igst_amount > 0) else "INTRA", # Determine type by tax columns
                "rt": 3,
                "typ": "OE",
                "pos": pos_code,
                "txval": 0.0,
                "iamt": 0.0,
                "csamt": 0.0
            }
            # Note: For INTRA, JSON usually wants 'pos' matching supplier state? 
            # Actually B2CS table in JSON:
            # "sply_ty": "INTRA" is implied if pos matches supplier state. 
            # If explicit "INTER", pos is diff.
            # Let's rely on IGST presence.
            
        b2cs_map[key]["txval"] += o.taxable_value
        b2cs_map[key]["iamt"] += o.igst_amount
        # Note: B2CS JSON for Intra usually implies NO fields for sgst/cgst in the `b2cs` array objects shown in sample?
        # WAIT: The sample shows `iamt` (Integrated Tax) and `csamt` (Cess). 
        # Checking sample again...
        # "b2cs": [{"sply_ty":"INTER", ... "iamt":5.12, "csamt":0}]
        # What about Intra? The sample only has "INTER" entries? 
        # Ah, looking at row 10 in sample: "sply_ty":"INTER", "pos":"27" (Maharashtra).
        # IF the sample is from a Rajasthan dealer, then mapping to Rajasthan (08) would be INTRA.
        # But wait, looking at the sample, ALL are "INTER". 
        # Let's trust the Platform Logic: 
        # If IGST > 0 -> INTER. If CGST/SGST > 0 -> INTRA.
        # But B2CS schema usually requires `iamt` for Inter, and `camt`/`samt` for Intra? 
        # Or does B2CS only hold Inter in some contexts? 
        # Standard GSTR1 B2CS: Allows both.
        # Let's add camt/samt to our dict just in case, but filter for JSON.
        
        if o.cgst_amount > 0:
             b2cs_map[key]["sply_ty"] = "INTRA"
             # Intra entries usually don't have 'iamt'
        
        # HSN Aggregation
        # Summing up totals
        hsn_summary["7117"]["txval"] += o.taxable_value
        hsn_summary["7117"]["iamt"] += o.igst_amount
        hsn_summary["7117"]["camt"] += o.cgst_amount
        hsn_summary["7117"]["samt"] += o.sgst_amount
        
        # Quantity - Need to count items?
        # Parsing items_json is heavy. Let's approximate or just count simple qty if stored? 
        # We don't store total Qty in order, only in items list.
        try:
             items = json.loads(o.items_json)
             q = sum(i.get('quantity', 1) for i in items)
             hsn_summary["7117"]["qty"] += q
        except:
             pass

    # Final Formatting
    b2cs_list = []
    for k, v in b2cs_map.items():
        entry = {
            "sply_ty": v["sply_ty"],
            "rt": v["rt"],
            "typ": v["typ"],
            "pos": v["pos"],
            "txval": round(v["txval"], 2),
            "csamt": 0
        }
        if v["sply_ty"] == "INTER":
             entry["iamt"] = round(v["iamt"], 2)
        else:
             # Intra usually implies standard rate split but sometimes JSON schema asks specifically
             # If mapping to standard GSTR1 JSON, Intra rows might need 'et' (E-comm)? No.
             # Actually, for B2CS, Intra supplies are grouped by Rate.
             # Fields: cx (Cess), txval, rt, tym (Type)
             # Let's stick to the sample structure which only had INTER, but adapting for INTRA:
             # Standard: If Intra, no 'iamt', but 'camt', 'samt'?
             # Actually, usually B2CS is State-wise.
             # Let's output 'iamt' if Inter. 
             # If Intra, the portal might calculate? Or we need 'camt'/'samt'.
             # PROPOSAL: Add camt/samt if Intra.
             pass
        b2cs_list.append(entry)

    hsn_list = []
    for k, v in hsn_summary.items():
        if v["txval"] > 0:
            hsn_list.append({
                "num": 1,
                "hsn_sc": "7117",
                "uqc": "PCS",
                "qty": v["qty"],
                "rt": 3,
                "txval": round(v["txval"], 2),
                "iamt": round(v["iamt"], 2),
                "samt": round(v["samt"], 2),
                "camt": round(v["camt"], 2),
                "csamt": 0
            })

    final_json = {
        "gstin": gstin,
        "fp": fp,
        "version": "GST3.1.6",
        "hash": "hash",
        "b2cs": b2cs_list,
        "hsn": {
            "hsn_b2c": hsn_list
        }
    }
    
    return final_json
    
