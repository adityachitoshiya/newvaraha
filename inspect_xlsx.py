import pandas as pd
import os

files = ['tcs_sales.xlsx', 'tcs_sales_return.xlsx']

for f in files:
    if os.path.exists(f):
        try:
            df = pd.read_excel(f)
            print(f"--- {f} ---")
            print("Columns:", list(df.columns))
            print("First row:", df.iloc[0].to_dict() if not df.empty else "Empty")
        except Exception as e:
            print(f"Error reading {f}: {e}")
    else:
        print(f"{f} not found")
