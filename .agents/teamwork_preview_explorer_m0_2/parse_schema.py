import os
import re
import json

types_path = r"C:\Users\nahid\.gemini\antigravity\scratch\instapic-mvp\src\integrations\supabase\types.ts"
migrations_dir = r"C:\Users\nahid\.gemini\antigravity\scratch\instapic-mvp\supabase\migrations"
functions_dir = r"C:\Users\nahid\.gemini\antigravity\scratch\instapic-mvp\supabase\functions"

# 1. Parse types.ts
with open(types_path, 'r', encoding='utf-8') as f:
    types_content = f.read()

# Extract Table Names from types.ts
table_matches = re.findall(r'^\s{6}([a_z0-9_]+):\s*\{', types_content, re.MULTILINE)

# Find tables in public.Tables section specifically
tables_block_match = re.search(r'Tables:\s*\{([\s\S]*?)\}\s*Views:', types_content)
tables = []
if tables_block_match:
    tables_block = tables_block_match.group(1)
    # Table names are top level keys in Tables block (indented by 8 spaces)
    tables = re.findall(r'^\s{8}([a-zA-Z0-9_]+):\s*\{', tables_block, re.MULTILINE)

views_block_match = re.search(r'Views:\s*\{([\s\S]*?)\}\s*Functions:', types_content)
views = []
if views_block_match:
    views_block = views_block_match.group(1)
    views = re.findall(r'^\s{8}([a-zA-Z0-9_]+):\s*\{', views_block, re.MULTILINE)

functions_block_match = re.search(r'Functions:\s*\{([\s\S]*?)\}\s*Enums:', types_content)
functions = []
if functions_block_match:
    functions_block = functions_block_match.group(1)
    functions = re.findall(r'^\s{8}([a-zA-Z0-9_]+):\s*\{', functions_block, re.MULTILINE)

enums_block_match = re.search(r'Enums:\s*\{([\s\S]*?)\}\s*CompositeTypes:', types_content)
enums = []
if enums_block_match:
    enums_block = enums_block_match.group(1)
    enums = re.findall(r'^\s{8}([a-zA-Z0-9_]+):\s*\{', enums_block, re.MULTILINE)

# 2. Parse Migration files
migration_files = sorted(os.listdir(migrations_dir)) if os.path.exists(migrations_dir) else []

# Extract CREATE TABLE, CREATE POLICY, ALTER TABLE ENABLE ROW LEVEL SECURITY, CREATE FUNCTION/TRIGGER statements from migrations
created_tables = set()
created_policies = []
rls_enabled_tables = set()
created_functions = set()
created_triggers = set()
foreign_keys = []

for mf in migration_files:
    mpath = os.path.join(migrations_dir, mf)
    with open(mpath, 'r', encoding='utf-8', errors='ignore') as f:
        mcontent = f.read()
        
        # Tables
        ct = re.findall(r'CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:public\.)?([a-zA-Z0-9_"]+)', mcontent, re.IGNORECASE)
        for t in ct:
            created_tables.add(t.strip('"'))
            
        # RLS Enabled
        rls = re.findall(r'ALTER\s+TABLE\s+(?:ONLY\s+)?(?:public\.)?([a-zA-Z0-9_"]+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY', mcontent, re.IGNORECASE)
        for r in rls:
            rls_enabled_tables.add(r.strip('"'))
            
        # Policies
        pols = re.findall(r'CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+(?:public\.)?([a-zA-Z0-9_"]+)', mcontent, re.IGNORECASE)
        for p_name, p_table in pols:
            created_policies.append({"policy": p_name, "table": p_table.strip('"'), "file": mf})
            
        # Functions
        funcs = re.findall(r'CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?([a-zA-Z0-9_"]+)', mcontent, re.IGNORECASE)
        for fn in funcs:
            created_functions.add(fn.strip('"'))
            
        # Triggers
        trigs = re.findall(r'CREATE\s+TRIGGER\s+([a-zA-Z0-9_"]+)\s+ON\s+(?:public\.)?([a-zA-Z0-9_"]+)', mcontent, re.IGNORECASE)
        for tr, tt in trigs:
            tr_clean = tr.strip('"')
            tt_clean = tt.strip('"')
            created_triggers.add(f"{tr_clean} ON {tt_clean}")
            
        # Foreign Keys
        fks = re.findall(r'FOREIGN\s+KEY\s*\(([^\)]+)\)\s*REFERENCES\s+(?:public\.)?([a-zA-Z0-9_"]+)', mcontent, re.IGNORECASE)
        for fk_col, fk_ref in fks:
            foreign_keys.append({"col": fk_col.strip(), "ref": fk_ref.strip('"')})

# 3. Edge Functions
edge_funcs = os.listdir(functions_dir) if os.path.exists(functions_dir) else []

out = {
    "tables_in_types_ts": sorted(tables),
    "tables_count": len(tables),
    "views_in_types_ts": sorted(views),
    "functions_in_types_ts": sorted(functions),
    "enums_in_types_ts": sorted(enums),
    "migration_files_count": len(migration_files),
    "tables_in_migrations": sorted(list(created_tables)),
    "tables_with_rls_enabled": sorted(list(rls_enabled_tables)),
    "policy_count": len(created_policies),
    "functions_in_migrations": sorted(list(created_functions)),
    "triggers_in_migrations": sorted(list(created_triggers)),
    "edge_functions": sorted(edge_funcs)
}

print(json.dumps(out, indent=2))
