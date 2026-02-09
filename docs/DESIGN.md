# ERMate — Design Aesthetics

## Direction: Industrial Precision

The visual language draws from professional database IDEs (DataGrip, DBeaver) and code editors — information-dense, utilitarian, and unapologetically technical. The interface should feel like a tool built by developers for developers, not a consumer product.

## Typography

- **Monospace throughout** table nodes — reinforces the "code/data" context and ensures column names align naturally
- **11px base** for node content — compact enough for dense schemas, readable at normal zoom
- **9px** for badges and metadata — secondary information stays visible without competing
- **System font stack** for UI chrome (toolbar, panels) — fast rendering, native feel

## Color System

### Table Node Type Badges

Each column type gets a distinct, syntax-highlighter-inspired color:

| Type | Color | Rationale |
|---|---|---|
| `INTEGER` | Blue (`blue-500/15`) | Numbers = cool/logical |
| `VARCHAR` | Amber (`amber-500/15`) | Strings = warm/textual |
| `TEXT` | Emerald (`emerald-500/15`) | Long text = organic/expansive |
| `BOOLEAN` | Violet (`violet-500/15`) | Binary = abstract/special |
| `TIMESTAMP` | Rose (`rose-500/15`) | Time = urgency/importance |

Colors are applied at 15% opacity over the card background, keeping them scannable without being garish. Dark mode uses the 400-weight variant for better contrast on dark surfaces.

### Constraint Badges

| Constraint | Label | Color |
|---|---|---|
| `PRIMARY KEY` | PK | Amber (matches the key icon) |
| `NOT NULL` | NN | Muted (common, shouldn't dominate) |
| `UNIQUE` | UQ | Sky blue (distinct but calm) |

### Selection State

- Selected nodes get `border-primary` + `ring-2 ring-primary/25` — visible without being heavy
- Subtle background tint on the header: `bg-primary/10`

## Node Layout

```
┌─────────────────────────────┐
│ 🔑 users          3 cols    │  ← Header: name + PK icon + column count
├─────────────────────────────┤
│ ○ 🔑 id    INTEGER  PK  NN ○│  ← Column row: handles on both sides
│ ○    email  VARCHAR  NN  UQ ○│     type badge + constraint badges
│ ○    name   VARCHAR         ○│     PK rows get subtle amber background
└─────────────────────────────┘
```

- **Handles** are 10px circles positioned at the vertical center of each column row
- On hover, handles transition from muted gray to the primary color
- Handles sit slightly outside the node border (`-left-[5px]`, `-right-[5px]`)

## Canvas

- **Dot grid background** at 16px intervals — provides spatial reference without visual noise
- **Snap to grid** at 16px — keeps layouts tidy
- React Flow controls and minimap inherit card styling (bg-card, border, shadow)
- Connections use `smoothstep` edges with monospace labels showing relationship type

## Toolbar

- Floating, centered at top — stays accessible without obscuring the canvas
- Glass-morphism: `bg-card/95 backdrop-blur-sm` — subtle transparency hints at the canvas behind
- Compact height — single row of small buttons with icon + text

## Principles

1. **Density over decoration** — every pixel earns its place
2. **Color has meaning** — badges are color-coded by function, not for aesthetics
3. **Monospace is honest** — database content should look like database content
4. **Quiet until needed** — handles, selections, and hover states reveal themselves contextually
5. **Dark mode is native** — shadcn CSS variables ensure seamless theme switching
