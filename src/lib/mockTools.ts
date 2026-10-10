import type { PlanStep } from "./types";

/**
 * All tools are simulated. Nothing has real side effects.
 * Returns a fake result string shown in the trace.
 */
export function executeMockTool(tool: string, args: Record<string, unknown>): string {
  switch (tool) {
    case "web_search":
      return `Search results for "${args.query}":\n1. "Comprehensive Guide to Vector Databases" — dbguide.io\n2. "Top 10 Vector DBs Compared" — techreview.com\n3. "pgvector vs Pinecone: 2025 Benchmark" — hackernews.io`;

    case "send_email":
      return `Email draft created:\nTo: ${args.to}\nSubject: ${args.subject}\nBody: ${(args.body as string)?.slice(0, 120)}...\n(Draft saved — not sent)`;

    case "create_calendar_event":
      return `Calendar event created: "${args.title}" starting ${args.start}, attendees: ${(args.attendees as string[])?.join(", ")}`;

    case "delete_file": {
      const path = args.path;
      return `File deleted: ${path}`;
    }

    case "transfer_money": {
      const acct = args.to_account;
      const amt = args.amount_usd;
      return `Transfer initiated: $${amt} to ${acct}\n(Simulated — no real money moved)`;
    }

    case "db_write": {
      const table = args.table;
      const row = args.row;
      return `Row written to table "${table}": ${JSON.stringify(row)}`;
    }

    default:
      return `Unknown tool: ${tool}`;
  }
}
