import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { stmts, UPLOADS_DIR, type Item } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const item = stmts.get.get(id) as Item | undefined;
  if (!item || item.kind !== "file") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(UPLOADS_DIR, `${item.id}__${item.name}`);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Missing file" }, { status: 404 });
  }

  const url = new URL(req.url);
  const download = url.searchParams.get("download") === "1";

  const stream = fs.createReadStream(filePath);
  // Convert Node Readable to Web ReadableStream
  const webStream = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) =>
        controller.enqueue(
          chunk instanceof Buffer ? new Uint8Array(chunk) : chunk,
        ),
      );
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
    },
  });

  const headers = new Headers({
    "Content-Type": item.mime ?? "application/octet-stream",
    "Content-Length": String(item.size),
    "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(item.name)}"`,
    "Cache-Control": "no-store",
  });

  return new Response(webStream, { headers });
}
