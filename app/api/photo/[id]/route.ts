import { getPhoto } from "@/lib/photos";

/**
 * Serves an uploaded portrait.
 *
 * Public on purpose: candidate faces and the union roster are things voters
 * are meant to see before voting, and neither reveals how anyone voted.
 *
 * The content type is the one decided by inspecting the file's bytes at upload,
 * never the one the browser claimed. `nosniff` stops a browser second-guessing
 * it, which is what turns a mislabelled upload into stored XSS.
 */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/photo/[id]">,
) {
  const { id } = await context.params;

  const photo = await getPhoto(id);
  if (!photo) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(photo.bytes), {
    headers: {
      "Content-Type": photo.contentType,
      "Content-Length": String(photo.bytes.byteLength),
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      // Content is immutable once uploaded: a new upload gets a new id.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
