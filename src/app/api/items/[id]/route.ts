import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { stmts, UPLOADS_DIR, type Item } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const item = stmts.get.get(id) as Item | undefined;
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (item.kind === "file") {
    const filePath = path.join(UPLOADS_DIR, `${item.id}__${item.name}`);
    await fs.unlink(filePath).catch(() => {});
  }

  stmts.remove.run(id);
  return NextResponse.json({ ok: true });
}
