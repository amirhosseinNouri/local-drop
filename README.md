# LocalDrop

Temporary file and text sharing on your local network. Anyone on the same Wi-Fi opens a URL and can drop files or paste text — instantly visible to everyone else.

No accounts. No cloud. No external services. Data lives in a SQLite file and a local uploads folder until you delete it.

## Features

- Drag-and-drop file upload (up to 1 GB per file)
- Paste-text snippets with one-click copy
- Per-item delete button (file or text)
- Live list refresh every 3 seconds
- Auto-prints LAN-reachable URLs on start
- Dark mode aware

## Stack

- Next.js 16 (App Router) + Turbopack
- React 19, TypeScript, Tailwind CSS v4
- `better-sqlite3` for metadata, filesystem for blobs
- `nanoid` for item IDs

## Getting Started

```bash
npm install
npm run dev
```

The dev script binds to `0.0.0.0` and prints every reachable LAN URL, e.g.:

```
LocalDrop will be reachable at:
  http://localhost:3000
  http://192.168.1.42:3000
```

Share the LAN URL with anyone on the same network.

### Production

```bash
npm run build
npm start
```

### macOS firewall

First run may prompt to allow incoming connections — accept, otherwise other devices on the LAN cannot reach the server.

## Project Layout

```
src/
  lib/
    db.ts                   # SQLite schema + prepared statements
  app/
    layout.tsx
    page.tsx                # server entry, renders HomeClient
    HomeClient.tsx          # client UI: upload, paste, list, delete
    api/
      items/route.ts        # POST upload (multipart) / POST text (JSON) / GET list
      items/[id]/route.ts   # DELETE item (also unlinks file)
      files/[id]/route.ts   # GET — streams file with Content-Disposition
scripts/
  print-lan-url.mjs         # prints LAN URLs before next start/dev
.localdrop/                 # git-ignored runtime data
  data.db                   # SQLite database
  uploads/                  # uploaded blobs as `<id>__<safe-name>`
```

## Data Model

Single `items` table:

| column     | type    | notes                                  |
| ---------- | ------- | -------------------------------------- |
| id         | TEXT PK | nanoid(12)                             |
| kind       | TEXT    | `'file'` or `'text'`                   |
| name       | TEXT    | original filename or `'Text snippet'`  |
| content    | TEXT    | text body (null for files)             |
| mime       | TEXT    | MIME type                              |
| size       | INTEGER | bytes                                  |
| created_at | INTEGER | epoch ms                               |

## API

| Method | Path                | Body                                   | Returns                |
| ------ | ------------------- | -------------------------------------- | ---------------------- |
| GET    | `/api/items`        | —                                      | `{ items: Item[] }`    |
| POST   | `/api/items`        | `multipart/form-data` with `file` field | `{ item }` (201)       |
| POST   | `/api/items`        | `application/json` `{ text: string }`   | `{ item }` (201)       |
| DELETE | `/api/items/:id`    | —                                      | `{ ok: true }`         |
| GET    | `/api/files/:id`    | optional `?download=1`                 | streamed file response |

## Configuration

| Variable | Default | Purpose                          |
| -------- | ------- | -------------------------------- |
| `PORT`   | `3000`  | Server port (also used by banner) |

Data directory is hard-coded to `./.localdrop`. Delete the directory to wipe everything.

## Security

LocalDrop has **no authentication**. Anyone who can reach the host on the LAN can upload, download, and delete. Use only on trusted networks (home, office). Do not expose to the public internet.

If you need to restrict access, put it behind a reverse proxy with basic auth or run it only while needed.

## Limits

- Max upload size: 1 GB per file (enforced in `src/app/api/items/route.ts`)
- No automatic expiry — items persist until manually deleted or the `.localdrop` directory is removed
- No streaming/chunked upload; full file is buffered before write

## License

MIT
