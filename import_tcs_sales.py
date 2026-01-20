import pandas as pd
from database import engine
from models import Order
from sqlmodel import Session, select
from datetime import datetime

STATE_MAPPING = {
    'ANDAMAN AND NICOBAR ISLANDS': 'Andaman and Nicobar Islands',
    'ANDHRA PRADESH': 'Andhra Pradesh',
    'ARUNACHAL PRADESH': 'Arunachal Pradesh',
    'ASSAM': 'Assam',
    'BIHAR': 'Bihar',
    'CHANDIGARH': 'Chandigarh',
    'CHHATTISGARH': 'Chhattisgarh',
    'DADRA AND NAGAR HAVELI AND DAMAN AND DIU': 'Dadra and Nagar Haveli and Daman and Diu',
    'DELHI': 'Delhi',
    'GOA': 'Goa',
    'GUJARAT': 'Gujarat',
    'HARYANA': 'Haryana',
    'HIMACHAL PRADESH': 'Himachal Pradesh',
    'JAMMU AND KASHMIR': 'Jammu and Kashmir',
    'JHARKHAND': 'Jharkhand',
    'KARNATAKA': 'Karnataka',
    'KERALA': 'Kerala',
    'LADAKH': 'Ladakh',
    'LAKSHADWEEP': 'Lakshadweep',
    'MADHYA PRADESH': 'Madhya Pradesh',
    'MAHARASHTRA': 'Maharashtra',
    'MANIPUR': 'Manipur',
    'MEGHALAYA': 'Meghalaya',
    'MIZORAM': 'Mizoram',
    'NAGALAND': 'Nagaland',
    'ODISHA': 'Odisha',
    'PUDUCHERRY': 'Puducherry',
    'PUNJAB': 'Punjab',
    'RAJASTHAN': 'Rajasthan',
    'SIKKIM': 'Sikkim',
    'TAMIL NADU': 'Tamil Nadu',
    'TELANGANA': 'Telangana',
    'TRIPURA': 'Tripura',
    'UTTAR PRADESH': 'Uttar Pradesh',
    'UTTARAKHAND': 'Uttarakhand',
    'WEST BENGAL': 'West Bengal'
}

def import_sales():
    print("Reading Excel...")
    try:
        df = pd.read_excel('tcs_sales.xlsx')
    except Exception as e:
        print(f"Failed to read Excel: {e}")
        return

    print(f"Found {len(df)} rows. Starting import into DB...")
    
    with Session(engine) as session:
        count = 0
        skipped = 0
        
        for _, row in df.iterrows():
            order_id = str(row['sub_order_num'])
            
            # Check if exists
            existing = session.exec(select(Order).where(Order.order_id == order_id)).first()
            if existing:
                skipped += 1
                continue
                
            # Parse Date
            try:
                date_str = str(row['order_date']) # likely datetime or YYYY-MM-DD
                if isinstance(row['order_date'], datetime):
                    created_at = row['order_date']
                else:
                    created_at = pd.to_datetime(date_str).to_pydatetime()
            except:
                created_at = datetime.now()

            # State Logic
            raw_state = str(row.get('end_customer_state_new', '')).upper().strip()
            state = STATE_MAPPING.get(raw_state, raw_state.title())
            
            # Tax Logic
            taxable = float(row.get('total_taxable_sale_value', 0))
            tax_amt = float(row.get('tax_amount', 0))
            total = float(row.get('total_invoice_value', 0))
            
            is_intra = 'RAJASTHAN' in raw_state or 'RAJASTHAN' in state.upper()
            
            cgst = 0.0
            sgst = 0.0
            igst = 0.0
            
            if is_intra:
                cgst = round(tax_amt / 2, 2)
                sgst = round(tax_amt / 2, 2)
            else:
                igst = tax_amt

            new_order = Order(
                order_id=order_id,
                customer_name="Marketplace Customer",
                email="marketplace@example.com",
                phone="0000000000",
                address="Marketplace Order",
                city="Unknown",
                state=state,
                country="India",
                pincode="000000",
                total_amount=total,
                status="delivered", # Assume delivered for historic
                payment_method="online",
                created_at=created_at,
                taxable_value=taxable,
                cgst_amount=cgst,
                sgst_amount=sgst,
                igst_amount=igst,
                hsn_code="7117",
                items_json="[]"
            )
            session.add(new_order)
            count += 1
            
            if count % 100 == 0:
                print(f"Processed {count}...")
                session.commit()
        
        session.commit()
        print(f"Import Finished. Added: {count}, Skipped: {skipped}")

if __name__ == "__main__":
    import_sales()
