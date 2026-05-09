import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import fs from "node:fs/promises";
import path from "node:path";
import { stmts, UPLOADS_DIR, type Item } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 1024 * 1024 * 1024; // 1 GB

export async function GET() {
  const rows = stmts.list.all() as Item[];
  return NextResponse.json({ items: rows });
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    const textField = form.get("text");

    if (file && file instanceof File) {
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: "File exceeds 1GB limit" },
          { status: 413 },
        );
      }
      const id = nanoid(12);
      const safeName = file.name.replace(/[^\w.\- ]+/g, "_") || "file";
      const filePath = path.join(UPLOADS_DIR, `${id}__${safeName}`);
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buffer);

      const item: Item = {
        id,
        kind: "file",
        name: safeName,
        content: null,
        mime: file.type || "application/octet-stream",
        size: buffer.length,
        created_at: Date.now(),
      };
      stmts.insert.run(item);
      return NextResponse.json({ item }, { status: 201 });
    }

    if (typeof textField === "string" && textField.trim().length > 0) {
      const id = nanoid(12);
      const item: Item = {
        id,
        kind: "text",
        name: "Text snippet",
        content: textField,
        mime: "text/plain",
        size: Buffer.byteLength(textField, "utf8"),
        created_at: Date.now(),
      };
      stmts.insert.run(item);
      return NextResponse.json({ item }, { status: 201 });
    }

    return NextResponse.json(
      { error: "No file or text provided" },
      { status: 400 },
    );
  }

  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => null)) as
      | { text?: string }
      | null;
    const text = body?.text?.trim();
    if (!text) {
      return NextResponse.json({ error: "Empty text" }, { status: 400 });
    }
    const id = nanoid(12);
    const item: Item = {
      id,
      kind: "text",
      name: "Text snippet",
      content: text,
      mime: "text/plain",
      size: Buffer.byteLength(text, "utf8"),
      created_at: Date.now(),
    };
    stmts.insert.run(item);
    return NextResponse.json({ item }, { status: 201 });
  }

  return NextResponse.json(
    { error: "Unsupported content-type" },
    { status: 415 },
  );
}
