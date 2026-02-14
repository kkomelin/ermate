# Import from SQL

## Overview

Add the ability to import a `.sql` file into ERMate and reconstruct the schema (tables, columns, constraints, relationships) from DDL statements. Only **structure** is imported — all data manipulation (`INSERT`, `UPDATE`, `DELETE`, etc.) is ignored. This makes it easy to onboard an existing database into ERMate by dumping its schema and loading it directly.

## Scope

### In scope

- Parse `CREATE TABLE` → tables + columns (name, type, constraints)
- Parse inline `PRIMARY KEY`, `NOT NULL`, `UNIQUE` constraints
- Parse inline `REFERENCES` (foreign key) → relationships
- Parse `ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY … REFERENCES` → relationships
- Infer relationship type: unique FK → `1:1`, otherwise → `1:N`
- Map SQL types to the app's `ColumnType` enum (best-effort, fallback to `VARCHAR`)
- Handle quoted and unquoted identifiers, `IF NOT EXISTS`, schema-qualified names
- Auto-layout imported tables on the canvas

### Out of scope / ignored

- `INSERT`, `UPDATE`, `DELETE`, `COPY`, `MERGE` (data manipulation)
- `CREATE INDEX`, `CREATE VIEW`, `CREATE FUNCTION/PROCEDURE`, `GRANT`, `SET`, comments
- Multi-column primary keys, `CHECK` constraints, `DEFAULT` values
- Dialect-specific syntax beyond standard SQL (e.g. MySQL backtick quoting can be supported as a best-effort)

## SQL Parser Library Research

Rather than writing a custom regex-based parser, we evaluated existing open-source SQL parsers available on npm:

| Library | Bundle size | Dialects | DDL support | TS types | Weekly downloads | Notes |
| ------- | ----------- | -------- | ----------- | -------- | ---------------- | ----- |
| **`node-sql-parser`** | ~150 KB (single dialect) | MySQL, PostgreSQL, MariaDB, SQLite, MSSQL, and more | ✅ `CREATE TABLE`, `ALTER TABLE`, FK, constraints | ✅ Built-in | ~580k | Full AST for DDL + DML. Per-dialect builds keep bundle small. Active maintenance (v5.3+, 2025). |
| `sql-ddl-to-json-schema` | ~300 KB (nearley grammar) | MySQL (primary), partial PostgreSQL | ✅ DDL-only by design | ⚠️ Partial | ~2k | Outputs JSON Schema, not a generic AST. Extra conversion step needed to map to our `Schema` type. 221 GitHub stars. Less actively maintained. |
| `@funktechno/sqlsimpleparser` | ~294 KB | MySQL, PostgreSQL, SQLite, MSSQL | ✅ `CREATE TABLE` | ✅ Built-in | Low | Built for Draw.io SQL plugin. Very small community. |
| `pgsql-ast-parser` | ~100 KB | PostgreSQL only | ✅ Full PostgreSQL DDL | ✅ Strong typing | ~10k | Excellent for PG-only projects. No MySQL/SQLite support rules it out for a general import tool. |
| `dt-sql-parser` | ~2 MB+ (ANTLR4) | MySQL, PG, Spark, Hive, Flink, etc. | ✅ Full DDL | ✅ Built-in | ~15k | Aimed at Big Data use cases. Very large bundle due to ANTLR4 runtime. Overkill for our needs. |

### Recommendation: `node-sql-parser`

**Why:**


1. **Multi-dialect** — supports MySQL, PostgreSQL, SQLite, MariaDB, MSSQL out of the box. Users can import dumps from any common database.
2. **Per-dialect build** — import only the dialect you need (~150 KB) instead of the full 750 KB bundle. We can start with a general import or let users pick.
3. **Well-maintained** — ~580k weekly downloads, active releases in 2025, large community.
4. **Complete AST** — returns a structured AST with column definitions, types, constraints, and FK references from both `CREATE TABLE` and `ALTER TABLE` statements — exactly what we need.
5. **Handles DML gracefully** — DML statements (`INSERT`, `UPDATE`, etc.) parse into their own AST node types, so we simply skip any node that isn't `create` or `alter`.

**Usage sketch:**

```typescript
import { Parser } from 'node-sql-parser'

const parser = new Parser()
const ast = parser.astify(sqlString, { database: 'PostgreSQL' })
// ast is an array of statement nodes
// Filter for type === 'create' and type === 'alter'
// Extract table name, columns, types, constraints, foreign keys
```

## Architecture

```
.sql file (string)
    │
    ▼
node-sql-parser.astify(sql)
    │
    ▼
AST (array of statement nodes)
    │
    ▼
filter & transform
    │  type: 'create'  →  extractTable()
    │  type: 'alter'   →  extractFK()
    │  anything else   →  skip
    │
    ▼
buildSchema()  →  Schema { tables, relationships }
    │   - generate IDs (nanoid)
    │   - map SQL types → ColumnType
    │   - resolve FK references → Relationship[]
    │   - assign grid positions
    │
    ▼
Schema ready for useSchemaStore.setSchema()
```

## Type Mapping

| SQL type (case-insensitive, prefix match)         | `ColumnType` |
| ------------------------------------------------- | ------------ |
| `INT`, `INTEGER`, `BIGINT`, `SMALLINT`, `SERIAL`  | `INTEGER`    |
| `BOOL`, `BOOLEAN`                                 | `BOOLEAN`    |
| `TEXT`, `CLOB`                                     | `TEXT`       |
| `TIMESTAMP`, `DATETIME`, `DATE`, `TIME`           | `TIMESTAMP`  |
| Everything else (`VARCHAR`, `CHAR`, `DECIMAL`…)   | `VARCHAR`    |

## Proposed Changes

### Parser module

#### [NEW] `src/services/sql-parser.ts`

Core parsing logic, isolated and testable with no DOM or store dependencies. Uses `node-sql-parser` for the heavy lifting.

**Exports:**

- `fromSQL(sql: string): Schema` — main entry point

**Parsing strategy:**

Use `node-sql-parser` to parse the SQL string into an AST. Walk the AST array, extracting `create` nodes into table/column definitions and `alter` nodes into FK records. All other statement types (DML, `CREATE INDEX`, etc.) are silently skipped. The extracted data is then assembled into our `Schema` type with generated IDs, mapped column types, resolved relationships, and auto-layout positions.

---

### Export-import service

#### [MODIFY] `src/services/export-import.ts`

- Import and re-export `fromSQL` from `sql-parser.ts`
- Update `importFromFile()` to detect `.sql` extension and route to `fromSQL()` instead of `fromJSON()`

```diff
+import { fromSQL } from './sql-parser'

 export async function importFromFile(file: File): Promise<Schema> {
   const text = await file.text()
-  return fromJSON(text)
+  const ext = file.name.split('.').pop()?.toLowerCase()
+  if (ext === 'sql') return fromSQL(text)
+  return fromJSON(text)
 }
```

---

### Toolbar

#### [MODIFY] `src/components/canvas/Toolbar.tsx`

Update the hidden file input to accept both `.json` and `.sql`:

```diff
-accept=".json"
+accept=".json,.sql"
```

No other UI changes needed — the existing import button and flow handles both formats transparently once `importFromFile` supports SQL.

---

### Tests

#### [NEW] `src/services/__tests__/sql-parser.test.ts`

Unit tests for the parser covering:

- Single `CREATE TABLE` with various column types and constraints
- Multiple tables with `ALTER TABLE … FOREIGN KEY`
- Inline `REFERENCES` foreign keys
- `INSERT` / `UPDATE` / other DML statements are ignored
- Quoted identifiers, `IF NOT EXISTS`, schema-prefixed names
- Empty / malformed input (graceful error)
- Type mapping (all SQL types → correct `ColumnType`)
- Relationship type inference (`1:1` vs `1:N`)

## Implementation Phases

### Phase 1: Parser

1. Create `src/services/sql-parser.ts` with `fromSQL()`
2. Implement statement splitting, `CREATE TABLE` parsing, `ALTER TABLE` FK parsing
3. Implement type mapping and constraint extraction
4. Implement `buildSchema()` with ID generation, FK resolution, and auto-layout

### Phase 2: Integration

1. Update `importFromFile()` in `export-import.ts` to route `.sql` files
2. Update the file input `accept` attribute in `Toolbar.tsx`

### Phase 3: Testing

1. Write unit tests for the parser
2. Test with real-world SQL dumps (PostgreSQL `pg_dump --schema-only`, MySQL `mysqldump --no-data`)
3. Manual end-to-end test: import `.sql` → verify tables/relationships on canvas → export back to SQL and compare

## Verification Plan

### Automated tests

```bash
pnpm test -- sql-parser
```

### Manual verification

1. Import a multi-table `.sql` dump with foreign keys → verify all tables, columns, constraints, and relationships appear correctly on the canvas
2. Import a file containing `INSERT` statements mixed with `CREATE TABLE` → verify data statements are silently ignored
3. Re-export the imported schema as SQL → compare structure (should be semantically equivalent)
