import json

with open(r"C:\Users\nahid\.gemini\antigravity\scratch\instapic-mvp\.agents\teamwork_preview_explorer_m0_2\schema_summary.json", "r", encoding="utf-8") as f:
    data = json.load(f)

summary = data["summary"]
tables = data["tables_detail"]
policies = data["policies"]

print("=== ALL TABLES IN DB SCHEMA (65) ===")
for t, cols in sorted(tables.items()):
    p_cnt = len(policies.get(t, []))
    col_names = [c["name"] for c in cols]
    print(f"Table: {t:30s} | Cols: {len(cols):2d} | Policies: {p_cnt:2d} | Columns sample: {', '.join(col_names[:6])}")

print("\n=== ALL VIEWS IN DB SCHEMA ===")
print(summary["views"])

print("\n=== ALL RPC FUNCTIONS IN DB SCHEMA ===")
for f, args in summary["rpc_functions"].items():
    print(f"RPC: {f}({', '.join([a['name'] + ': ' + a['type'] for a in args])})")

print("\n=== TABLES WITH 0 RLS POLICIES ===")
zero_pol = [t for t, pols in policies.items() if len(pols) == 0]
print(zero_pol)
