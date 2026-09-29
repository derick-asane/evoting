import { env } from "@/lib/env";
import { findElection } from "@/lib/elections";
import {
  buildResultSheet,
  resultFileName,
  resultSheetToCsv,
  resultSheetToPdf,
} from "@/lib/result-sheet";
import { findUniversityById } from "@/lib/universities";

/**
 * Downloads an election's result as a spreadsheet or a filed document.
 *
 * Public, deliberately: the tallies are already readable by anyone with the
 * contract address, so putting them behind a login would protect nothing and
 * would stop a candidate or a student paper checking the count.
 *
 * Every figure is read from the chain when the request arrives, so a stale
 * result cannot be served.
 */
export async function GET(
  request: Request,
  context: RouteContext<"/api/election/[id]/result">,
) {
  const { id } = await context.params;

  const format = new URL(request.url).searchParams.get("format") ?? "csv";
  if (format !== "csv" && format !== "pdf") {
    return new Response("Unsupported format. Use csv or pdf.", { status: 400 });
  }

  const election = await findElection(id);
  if (!election) return new Response("Not found", { status: 404 });

  const university = await findUniversityById(election.universityId);
  if (!university) return new Response("Not found", { status: 404 });

  let sheet;
  try {
    sheet = await buildResultSheet(university, election, env.chainId);
  } catch (error) {
    // Usually the chain being unreachable. Say so rather than serving a
    // document with missing numbers that looks official.
    console.error("Could not build result sheet", error);
    return new Response(
      "The election chain is unreachable, so no result can be produced.",
      { status: 503 },
    );
  }

  const name = resultFileName(sheet);

  if (format === "csv") {
    return new Response(resultSheetToCsv(sheet), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}.csv"`,
        // A provisional result changes with every vote.
        "Cache-Control": "no-store",
      },
    });
  }

  const pdf = await resultSheetToPdf(sheet);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}.pdf"`,
      "Content-Length": String(pdf.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
