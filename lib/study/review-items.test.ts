import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  getDueReviewItems,
  gradeReviewItem,
  registerPackReviewItems,
  reviewContentHash,
} from "@/lib/study/review-items";

function chainable(result: unknown) {
  // select().eq().lte().order().limit() -> { data, error }
  const limit = vi.fn().mockResolvedValue(result);
  const order = vi.fn().mockReturnValue({ limit });
  const lte = vi.fn().mockReturnValue({ order });
  const eq = vi.fn().mockReturnValue({ lte });
  const select = vi.fn().mockReturnValue({ eq });
  return { select, eq, lte, order, limit };
}

describe("reviewContentHash", () => {
  it("es determinista e insensible a mayúsculas/espacios", () => {
    const a = reviewContentHash("Biología", "La Célula", "¿Qué es la célula?");
    const b = reviewContentHash("  biología ", "la célula", "¿Qué es la célula?");
    expect(a).toBe(b);
    expect(a).toHaveLength(32);
  });

  it("cambia si cambia el frente", () => {
    expect(reviewContentHash("Bio", "T", "A")).not.toBe(reviewContentHash("Bio", "T", "B"));
  });
});

describe("getDueReviewItems", () => {
  it("devuelve las tarjetas vencidas ordenadas", async () => {
    const rows = [
      { id: "1", subject: "Bio", topic: "Bio", front: "Q1", back: "A1" },
      { id: "2", subject: "Bio", topic: "Bio", front: "Q2", back: "A2" },
    ];
    const c = chainable({ data: rows, error: null });
    const client = { from: vi.fn().mockReturnValue(c) } as unknown as SupabaseClient;

    const items = await getDueReviewItems(client, "user-1");
    expect(items).toHaveLength(2);
    expect(items[0]!.front).toBe("Q1");
    expect(c.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("degrada a vacío si la tabla no existe", async () => {
    const c = chainable({ data: null, error: { message: "relation does not exist" } });
    const client = { from: vi.fn().mockReturnValue(c) } as unknown as SupabaseClient;
    expect(await getDueReviewItems(client, "user-1")).toEqual([]);
  });
});

describe("gradeReviewItem", () => {
  it("aplica SM-2 y persiste el nuevo estado", async () => {
    const updates: unknown[] = [];
    const row = { id: "abc", easiness: 2.5, interval_days: 0, reps: 0, lapses: 0 };
    const client = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
            }),
          }),
        }),
        update: vi.fn().mockImplementation((u: unknown) => {
          updates.push(u);
          return {
            eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          };
        }),
      }),
    } as unknown as SupabaseClient;

    const graded = await gradeReviewItem(client, "user-1", "abc", 5);
    expect(graded).not.toBeNull();
    expect(graded!.intervalDays).toBe(1);
    expect(updates).toHaveLength(1);
    const u = updates[0] as Record<string, unknown>;
    expect(u.reps).toBe(1);
    expect(u.interval_days).toBe(1);
    expect(typeof u.next_due).toBe("string");
    expect(typeof u.last_reviewed_at).toBe("string");
  });

  it("devuelve null si la tarjeta no existe", async () => {
    const client = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;
    expect(await gradeReviewItem(client, "user-1", "nope", 5)).toBeNull();
  });
});

describe("registerPackReviewItems", () => {
  it("hace upsert con dedupe por (user_id, content_hash)", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = { from: vi.fn().mockReturnValue({ upsert }) } as unknown as SupabaseClient;

    const n = await registerPackReviewItems(client, "user-1", {
      subject: "Biología",
      cards: [
        { front: "Q1", back: "A1" },
        { front: "Q1", back: "A1" }, // duplicada: mismo hash
        { front: "  ", back: "A2" }, // vacía: se descarta
      ],
    });
    expect(n).toBe(2);
    expect(upsert).toHaveBeenCalledTimes(1);
    const [rows, opts] = upsert.mock.calls[0] as [Array<Record<string, unknown>>, Record<string, unknown>];
    expect(rows).toHaveLength(2);
    expect(opts.onConflict).toBe("user_id,content_hash");
    expect(opts.ignoreDuplicates).toBe(true);
    expect(rows[0]!.topic).toBe("Biología");
  });

  it("no lanza si la tabla no existe", async () => {
    const client = {
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: { message: "relation does not exist" } }),
      }),
    } as unknown as SupabaseClient;
    const n = await registerPackReviewItems(client, "user-1", {
      subject: "Bio",
      cards: [{ front: "Q", back: "A" }],
    });
    expect(n).toBe(0);
  });
});
