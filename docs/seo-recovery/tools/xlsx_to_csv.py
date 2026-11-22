import sys, openpyxl, csv, os, re, warnings
warnings.filterwarnings("ignore")
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
for path in sys.argv[2:]:
    base = os.path.basename(path)
    base = re.sub(r'^[0-9a-f]+-rehablookup\.com-', '', base).replace('.xlsx','')
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    for ws in wb.worksheets:
        fn = os.path.join(out, f"{base}__{ws.title.replace(' ','_')}.csv")
        with open(fn, 'w', newline='') as f:
            w = csv.writer(f)
            for r in ws.iter_rows(values_only=True):
                w.writerow(r)
        print(fn)
