import os
import re
import json

types_path = r"C:\Users\nahid\.gemini\antigravity\scratch\instapic-mvp\src\integrations\supabase\types.ts"
migrations_dir = r"C:\Users\nahid\.gemini\antigravity\scratch\instapic-mvp\supabase\migrations"
functions_dir = r"C:\Users\nahid\.gemini\antigravity\scratch\instapic-mvp\supabase\functions"

with open(types_path, 'r', encoding='utf-8') as f:
    types_content = f.read()

# Parse public Tables keys in types.ts
# In types.ts, `public: { Tables: { <TableName>: { Row: ... } } }`
tables_dict = {}
# Find `Tables: {` ... `Views:`
m_tables = re.search(r'public:\s*\{\s*Tables:\s*\{([\s\S]*?)\}\s*Views:', types_content)
if m_tables:
    tables_code = m_tables.group(1)
    # find top level table names (indented by 6 or 8 spaces)
    tbl_blocks = re.split(r'\n\s{6}([a-zA-Z0-9_]+):\s*\{', '\n' + tables_code)
    # idx 0 is prefix, then pairs of (tbl_name, tbl_body)
    for i in range(1, len(tbl_blocks), 2):
        tname = tbl_blocks[i]
        tbody = tbl_blocks[i+1]
        
        # Extract columns from Row
        row_match = re.search(r'Row:\s*\{([\s\S]*?)\}\s*Insert:', tbody)
        cols = []
        if row_match:
            row_code = row_match.group(1)
            col_lines = re.findall(r'^\s*([a-zA-Z0-9_]+):\s*(.*)$', row_code, re.MULTILINE)
            for cname, ctype in col_lines:
                cols.append({"name": cname, "type": ctype.strip()})
        tables_dict[tname] = cols

# Parse Views
views_dict = {}
m_views = re.search(r'Views:\s*\{([\s\S]*?)\}\s*Functions:', types_content)
if m_views:
    views_code = m_views.group(1)
    v_blocks = re.split(r'\n\s{6}([a-zA-Z0-9_]+):\s*\{', '\n' + views_code)
    for i in range(1, len(v_blocks), 2):
        vname = v_blocks[i]
        views_dict[vname] = True

# Parse Functions (RPCs)
funcs_dict = {}
m_funcs = re.search(r'Functions:\s*\{([\s\S]*?)\}\s*Enums:', types_content)
if m_funcs:
    funcs_code = m_funcs.group(1)
    f_blocks = re.split(r'\n\s{6}([a-zA-Z0-9_]+):\s*\{', '\n' + funcs_code)
    for i in range(1, len(f_blocks), 2):
        fname = f_blocks[i]
        fbody = f_blocks[i+1]
        # args
        args_match = re.search(r'Args:\s*\{([\s\S]*?)\}\s*Returns:', fbody)
        args = []
        if args_match:
            args_code = args_match.group(1)
            alines = re.findall(r'^\s*([a-zA-Z0-9_]+):\s*(.*)$', args_code, re.MULTILINE)
            for aname, atype in alines:
                args.append({"name": aname, "type": atype.strip()})
        funcs_dict[fname] = args

# Parse Enums
enums_dict = {}
m_enums = re.search(r'Enums:\s*\{([\s\S]*?)\}\s*CompositeTypes:', types_content)
if m_enums:
    enums_code = m_enums.group(1)
    e_blocks = re.split(r'\n\s{6}([a-zA-Z0-9_]+):\s*\{', '\n' + enums_code)
    for i in range(1, len(e_blocks), 2):
        ename = e_blocks[i]
        enums_dict[ename] = True

# Now parse all migrations for RLS, Triggers, RPC details
policies_by_table = {}
for t in tables_dict.keys():
    policies_by_table[t] = []

migration_files = sorted(os.listdir(migrations_dir)) if os.path.exists(migrations_dir) else []
all_migration_sqls = []

for mf in migration_files:
    mpath = os.path.join(migrations_dir, mf)
    with open(mpath, 'r', encoding='utf-8', errors='ignore') as f:
        mcontent = f.read()
        all_migration_sqls.append({"filename": mf, "size": len(mcontent)})
        
        pols = re.findall(r'CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+(?:public\.)?([a-zA-Z0-9_"]+)([\s\S]*?);', mcontent, re.IGNORECASE)
        for p_name, p_table, p_body in pols:
            tname = p_table.strip('"')
            if tname not in policies_by_table:
                policies_by_table[tname] = []
            policies_by_table[tname].append({
                "name": p_name,
                "file": mf,
                "for": "ALL" if "FOR ALL" in p_body.upper() else ("SELECT" if "FOR SELECT" in p_body.upper() else ("INSERT" if "FOR INSERT" in p_body.upper() else ("UPDATE" if "FOR UPDATE" in p_body.upper() else ("DELETE" if "FOR DELETE" in p_body.upper() else "OTHER"))))
            })

summary = {
    "tables": {t: len(cols) for t, cols in tables_dict.items()},
    "views": list(views_dict.keys()),
    "rpc_functions": funcs_dict,
    "enums": list(enums_dict.keys()),
    "policies_count_per_table": {t: len(pols) for t, pols in policies_by_table.items()},
    "total_tables": len(tables_dict),
    "total_views": len(views_dict),
    "total_rpcs": len(funcs_dict),
    "total_migrations": len(migration_files)
}

with open(r"C:\Users\nahid\.gemini\antigravity\scratch\instapic-mvp\.agents\teamwork_preview_explorer_m0_2\schema_summary.json", 'w', encoding='utf-8') as f:
    json.dump({"summary": summary, "tables_detail": tables_dict, "policies": policies_by_table}, f, indent=2)

print(f"Schema summary successfully written. Found {len(tables_dict)} tables, {len(views_dict)} views, {len(funcs_dict)} RPCs, {len(migration_files)} migrations.")
