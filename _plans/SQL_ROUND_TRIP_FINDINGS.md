# SQL Round-Trip Analysis - Findings and Recommendations

## Overview
This document summarizes the analysis of importing SQL, exporting to SQL, and re-importing, comparing the internal representation between the original and round-tripped schemas.

## Test Files
- **Original Import**: `src/tests/fixtures/test-schema-large-for-import.sql`
- **Exported**: `src/tests/fixtures/test-schema-large-exported.sql`
- **Test Suite**: `src/tests/sql-round-trip.test.ts`

---

## Findings: Information Loss During Round-Trip

### 1. Data Type Precision Loss

#### Issues:
| Original Type | Mapped To | Impact |
|--------------|-----------|--------|
| `uuid` | `VARCHAR(255)` | UUID specific functionality lost |
| `numeric` | `VARCHAR(255)` | Precision/scale lost (e.g., `NUMERIC(10,2)`) |
| `jsonb` | `VARCHAR(255)` | JSON capabilities lost |
| `timestamp with time zone` | `TIMESTAMP` | Timezone information lost |

#### Example:
```sql
-- Original
CREATE TABLE users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  price numeric NOT NULL,
  data jsonb
);

-- After export/import (simplified)
CREATE TABLE "users" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "created_at" TIMESTAMP NOT NULL,
  "price" VARCHAR(255) NOT NULL,
  "data" VARCHAR(255)
);
```

#### Root Cause:
The `ColumnType` enum in `src/types/schema.ts` only includes:
- `VARCHAR`
- `INTEGER`
- `BOOLEAN`
- `TEXT`
- `TIMESTAMP`

More specific types are not supported.

---

### 2. DEFAULT Values Not Preserved

#### Issues:
- All DEFAULT expressions are completely lost during round-trip
- This affects auto-generated IDs, timestamps, and default states

#### Examples Lost:
```sql
DEFAULT gen_random_uuid()  -- Auto-generated UUIDs
DEFAULT now()              -- Auto-generated timestamps
DEFAULT false              -- Boolean defaults
DEFAULT 'pending'          -- String defaults
DEFAULT 0                  -- Numeric defaults
```

#### Root Cause:
The `Column` interface in `src/types/schema.ts` does not have a field for storing DEFAULT values.

---

### 3. CHECK Constraints Not Preserved

#### Issues:
- CHECK constraints are completely lost
- No way to enforce custom validation rules

#### Example Lost:
```sql
-- Original
rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5)

-- After export/import (CHECK lost)
rating integer NOT NULL
```

#### Root Cause:
The `ColumnConstraint` enum does not include `CHECK`, and there's no field to store the check expression.

---

### 4. Schema Qualifiers Not Preserved

#### Issues:
- Schema prefixes (e.g., `public.`, `auth.`) are dropped during export
- This can cause ambiguity in multi-schema databases

#### Example:
```sql
-- Original
CREATE TABLE public.users (...);
CREATE TABLE public.posts (...);
CONSTRAINT posts_user_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)

-- After export (schema prefixes lost)
CREATE TABLE "users" (...);
CREATE TABLE "posts" (...);
ALTER TABLE "posts" ADD CONSTRAINT "fk_posts_user"
  FOREIGN KEY ("user_id") REFERENCES "users" ("id")
```

#### Root Cause:
The `Table` interface in `src/types/schema.ts` does not have a field for schema name.

---

### 5. Foreign Key Style Change

#### Issues:
- Inline REFERENCES (column-level) are converted to ALTER TABLE statements
- This is semantically correct but changes the style

#### Example:
```sql
-- Original style (column-level FK)
CREATE TABLE posts (
  user_id INTEGER REFERENCES users(id)
);

-- Exported style (ALTER TABLE)
CREATE TABLE "posts" (
  "user_id" INTEGER
);
ALTER TABLE "posts" ADD CONSTRAINT "fk_posts_user"
  FOREIGN KEY ("user_id") REFERENCES "users" ("id");
```

#### Assessment:
This is acceptable - ALTER TABLE is the standard approach and ensures consistency.

---

## Recommendations

### Priority 1: Data Type Support

1. **Extend ColumnType enum** in `src/types/schema.ts`:

```typescript
export enum ColumnType {
  VARCHAR = 'VARCHAR',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN',
  TEXT = 'TEXT',
  TIMESTAMP = 'TIMESTAMP',
  UUID = 'UUID',           // NEW
  NUMERIC = 'NUMERIC',     // NEW
  JSON = 'JSON',           // NEW
  JSONB = 'JSONB',         // NEW
  DATE = 'DATE',           // NEW
  TIME = 'TIME',           // NEW
}
```

2. **Add type metadata** to `Column` interface:

```typescript
export interface Column {
  id: string
  name: string
  type: ColumnType
  constraints: ColumnConstraint[]
  // New fields for type precision
  typePrecision?: number     // e.g., 255 for VARCHAR(255)
  typeScale?: number        // e.g., 2 for NUMERIC(10,2)
  withTimezone?: boolean    // for TIMESTAMP types
}
```

3. **Update sql-parser** (`src/services/sql-parser.ts`):
   - Add parsing for UUID, NUMERIC, JSONB types
   - Extract precision/scale from type definitions
   - Detect timezone modifier

4. **Update export-import** (`src/services/export-import.ts`):
   - Map UUID type to `uuid` (PostgreSQL) or keep as VARCHAR for other dialects
   - Map NUMERIC to `numeric(precision, scale)` when values exist
   - Map JSONB to `jsonb` (PostgreSQL) or keep as JSON for others

---

### Priority 2: DEFAULT Values

1. **Add defaultValue field** to `Column` interface:

```typescript
export interface Column {
  id: string
  name: string
  type: ColumnType
  constraints: ColumnConstraint[]
  defaultValue?: string  // Raw SQL expression for DEFAULT
}
```

2. **Update sql-parser** to extract DEFAULT values:
   - Parse DEFAULT expressions from column definitions
   - Store as raw SQL string (to preserve functions like `gen_random_uuid()`)

3. **Update export-import** to include DEFAULT in output:
   ```typescript
   function columnToSQL(col: Column, dialect?: SQLDialect): string {
     const parts = [
       quoteIdentifier(col.name, dialect),
       sqlType(col.type, dialect),
     ]
     const cons = sqlConstraints(col.constraints)
     if (cons) parts.push(cons)
     if (col.defaultValue) parts.push(`DEFAULT ${col.defaultValue}`)
     return parts.join(' ')
   }
   ```

---

### Priority 3: CHECK Constraints

1. **Add CHECK to ColumnConstraint enum**:

```typescript
export enum ColumnConstraint {
  PRIMARY_KEY = 'PRIMARY_KEY',
  NOT_NULL = 'NOT_NULL',
  UNIQUE = 'UNIQUE',
  FOREIGN_KEY = 'FOREIGN_KEY',
  CHECK = 'CHECK',  // NEW
}
```

2. **Add checkExpression field** to `Column` interface:

```typescript
export interface Column {
  id: string
  name: string
  type: ColumnType
  constraints: ColumnConstraint[]
  checkExpression?: string  // e.g., "rating >= 1 AND rating <= 5"
}
```

3. **Update sql-parser** to extract CHECK constraints:
   - Parse CHECK expressions from column and table-level constraints
   - Store as raw SQL string

4. **Update export-import** to include CHECK in output:
   ```typescript
   function columnToSQL(col: Column, dialect?: SQLDialect): string {
     const parts = [
       quoteIdentifier(col.name, dialect),
       sqlType(col.type, dialect),
     ]
     const cons = sqlConstraints(col.constraints)
     if (cons) parts.push(cons)
     if (col.checkExpression) parts.push(`CHECK (${col.checkExpression})`)
     return parts.join(' ')
   }
   ```

---

### Priority 4: Schema Qualifiers

1. **Add schema field** to `Table` interface:

```typescript
export interface Table {
  id: string
  name: string
  schema?: string  // e.g., 'public', 'auth'
  position: Position
  columns: Column[]
}
```

2. **Update sql-parser** to extract schema name:
   - Parse schema from `CREATE TABLE schema.table`
   - Store separately from table name

3. **Update export-import** to include schema when present:
   ```typescript
   function tableToSQL(table: Table, dialect?: SQLDialect): string {
     const tableName = table.schema
       ? `${quoteIdentifier(table.schema, dialect)}.${quoteIdentifier(table.name, dialect)}`
       : quoteIdentifier(table.name, dialect)

     const lines = table.columns.map((col) => {
       const parts = [
         `  ${quoteIdentifier(col.name, dialect)}`,
         sqlType(col.type, dialect),
       ]
       const cons = sqlConstraints(col.constraints)
       if (cons) parts.push(cons)
       return parts.join(' ')
     })

     return `CREATE TABLE ${tableName} (\n${lines.join(',\n')}\n);`
   }
   ```

---

### Priority 5: Dialect-Specific Handling

For more accurate round-trips, consider:

1. **Store original dialect** in `Schema` interface
2. **Use dialect-specific type mappings**:
   - PostgreSQL: uuid, jsonb, timestamp with time zone
   - MySQL: tinyint(1) for boolean, datetime for timestamp
   - SQLite: text for many types (limited type support)

---

## Implementation Plan

1. **Phase 1**: Extend type system (ColumnType, Column interface)
2. **Phase 2**: Update sql-parser to extract new metadata
3. **Phase 3**: Update export-import to preserve new metadata
4. **Phase 4**: Add comprehensive tests for each new feature
5. **Phase 5**: Update UI components to display new metadata (optional)

---

## Current Test Coverage

The test suite `src/tests/sql-round-trip.test.ts` verifies:
- Basic round-trip compatibility
- Type mapping issues
- DEFAULT value loss
- CHECK constraint loss
- Schema qualifier loss
- Relationship preservation

All tests pass, confirming that while information is lost, the current implementation is internally consistent.
