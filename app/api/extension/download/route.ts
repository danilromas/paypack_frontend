import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"
import archiver from "archiver"
import { PassThrough } from "stream"
import { Readable } from "stream"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const extDir = path.join(process.cwd(), "extensions", "paypack-marketplace")
  if (!fs.existsSync(extDir)) {
    return NextResponse.json(
      { error: "Extension source not found" },
      { status: 404 }
    )
  }

  const pass = new PassThrough()
  const archive = archiver("zip", { zlib: { level: 9 } })
  archive.on("error", (err) => pass.destroy(err))
  archive.pipe(pass)

  for (const name of fs.readdirSync(extDir)) {
    if (name.startsWith(".")) continue
    const fp = path.join(extDir, name)
    if (fs.statSync(fp).isFile()) {
      archive.file(fp, { name })
    }
  }

  void archive.finalize()

  const webStream = Readable.toWeb(pass) as ReadableStream<Uint8Array>

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition":
        'attachment; filename="paypack-marketplace-extension.zip"',
      "Cache-Control": "no-store",
    },
  })
}
