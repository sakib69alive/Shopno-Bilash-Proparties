"use client";

import {
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { paginate, type Measured } from "@/lib/studio/paginate";
import {
  PAGE_H,
  PAGE_W,
  type StudioBlock,
  type StudioDocument,
  type StudioLetterhead,
} from "@/lib/studio/types";

// A document is printed paper, so its colours are fixed — it must look the same whatever theme the admin panel is in.
const C = {
  forest: "#1f3d33",
  champagne: "#b9a278",
  ink: "#1c1b19",
  muted: "#6b6660",
  subtle: "#8f897f",
  line: "#e3ddd1",
  sheet: "#f6f2e9",
  positive: "#2f6b4f",
  negative: "#a83c2e",
};
const PAD = 56;

/** Draws **bold** and *italic* marks (as pasted from an AI chat or Markdown); everything else is plain text. */
function Rich({ text }: { text: string }) {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+?\*\*|__[^_]+?__|\*[^*\s][^*]*?\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**") || tok.startsWith("__"))
      out.push(
        <strong key={key++} style={{ fontWeight: 700 }}>
          {tok.slice(2, -2)}
        </strong>,
      );
    else out.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

function Rule({ thick = false }: { thick?: boolean }) {
  return (
    <div
      style={{
        position: "relative",
        height: 1,
        background: C.line,
        margin: "0",
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 0,
          top: thick ? -1 : 0,
          width: 64,
          height: thick ? 3 : 1,
          background: thick ? C.forest : C.champagne,
        }}
      />
    </div>
  );
}

function Brand({
  letterhead,
  compact,
}: {
  letterhead: StudioLetterhead;
  compact?: boolean;
}) {
  const showImage = letterhead.logoMode !== "name";
  const logo = letterhead.logo || "/logo.webp";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 10 : 16,
        minWidth: 0,
      }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- exported to PNG/PDF, so a plain same-origin <img> is what the exporter needs
        <img
          src={logo}
          alt=""
          style={{ height: compact ? 30 : 66, width: "auto" }}
          crossOrigin="anonymous"
        />
      ) : null}
      <div style={{ minWidth: 0 }}>
        <div
          className="font-serif-display"
          style={{
            fontSize: compact ? 17 : 27,
            lineHeight: 1.05,
            color: C.ink,
          }}
        >
          {letterhead.name}
        </div>
        {!compact && (
          <div
            style={{
              marginTop: 5,
              fontSize: 9.5,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: C.champagne,
              fontWeight: 600,
            }}
          >
            Real estate · Construction
          </div>
        )}
      </div>
    </div>
  );
}

function Contact({ letterhead }: { letterhead: StudioLetterhead }) {
  const lines = [
    letterhead.address,
    letterhead.phone,
    letterhead.email,
    letterhead.website,
  ].filter(Boolean) as string[];
  if (lines.length === 0) return null;
  return (
    <div
      style={{
        textAlign: "right",
        fontSize: 10.5,
        lineHeight: 1.65,
        color: C.muted,
        maxWidth: 230,
      }}
    >
      {lines.map((l) => (
        <div key={l}>{l}</div>
      ))}
    </div>
  );
}

function Block({ block }: { block: StudioBlock }) {
  switch (block.type) {
    case "heading":
      return (
        <div style={{ borderBottom: `1px solid ${C.line}`, paddingBottom: 8 }}>
          <span
            style={{
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: C.forest,
              fontWeight: 700,
            }}
          >
            {block.text}
          </span>
        </div>
      );
    case "subheading":
      return (
        <div
          className="font-serif-display"
          style={{ fontSize: 19, lineHeight: 1.2, color: C.forest }}
        >
          <Rich text={block.text} />
        </div>
      );
    case "paragraph":
      return (
        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: "23px",
            color: C.ink,
            whiteSpace: "pre-wrap",
          }}
        >
          <Rich text={block.text} />
        </p>
      );
    case "list":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {block.items.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 12,
                fontSize: 14,
                lineHeight: "23px",
                color: C.ink,
              }}
            >
              <span
                style={{
                  width: 20,
                  flexShrink: 0,
                  textAlign: "right",
                  color: C.champagne,
                  fontWeight: 700,
                }}
              >
                {block.ordered ? `${i + 1}.` : "•"}
              </span>
              <span style={{ minWidth: 0, whiteSpace: "pre-wrap" }}>
                <Rich text={item} />
              </span>
            </div>
          ))}
        </div>
      );
    case "note":
      return (
        <div
          style={{
            borderLeft: `3px solid ${C.champagne}`,
            padding: "2px 0 2px 14px",
            fontSize: 12.5,
            lineHeight: "23px",
            color: C.muted,
            whiteSpace: "pre-wrap",
          }}
        >
          <Rich text={block.text} />
        </div>
      );
    case "stats":
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${block.items.length}, 1fr)`,
            gap: 12,
          }}
        >
          {block.items.map((s) => (
            <div
              key={s.label}
              style={{
                background: C.sheet,
                borderRadius: 10,
                padding: "14px 16px",
                minHeight: 82,
              }}
            >
              <div
                style={{
                  fontSize: 9.5,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: C.subtle,
                  fontWeight: 600,
                }}
              >
                {s.label}
              </div>
              <div
                className="font-serif-display"
                style={{
                  marginTop: 6,
                  fontSize: 25,
                  lineHeight: 1.05,
                  color:
                    s.tone === "positive"
                      ? C.positive
                      : s.tone === "negative"
                        ? C.negative
                        : C.ink,
                }}
              >
                {s.value}
              </div>
              {s.note && (
                <div style={{ marginTop: 4, fontSize: 10.5, color: C.muted }}>
                  {s.note}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    case "keyvalue":
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            columnGap: 28,
            rowGap: 14,
          }}
        >
          {block.items.map((kv) => (
            <div key={kv.label}>
              <div
                style={{
                  fontSize: 9.5,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: C.subtle,
                  fontWeight: 600,
                }}
              >
                {kv.label}
              </div>
              <div style={{ marginTop: 3, fontSize: 13.5, color: C.ink }}>
                {kv.value}
              </div>
            </div>
          ))}
        </div>
      );
    case "table": {
      if (block.rows.length === 0) {
        return (
          <div
            style={{
              border: `1px dashed ${C.line}`,
              borderRadius: 8,
              padding: "20px 16px",
              fontSize: 12.5,
              color: C.muted,
            }}
          >
            {block.emptyText ?? "Nothing to show."}
          </div>
        );
      }
      const total = block.columns.reduce((s, c) => s + (c.weight ?? 1), 0);
      const widths = block.columns.map(
        (c) => `${((c.weight ?? 1) / total) * 100}%`,
      );
      return (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
          }}
        >
          <thead>
            <tr style={{ background: C.forest }}>
              {block.columns.map((c, i) => (
                <th
                  key={c.key}
                  style={{
                    width: widths[i],
                    height: 38,
                    padding: "0 10px",
                    textAlign: c.align === "right" ? "right" : "left",
                    color: "#fff",
                    fontSize: 9.5,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, ri) => (
              <tr
                key={ri}
                style={{ background: ri % 2 === 1 ? "#fbf9f4" : "#fff" }}
              >
                {block.columns.map((c) => (
                  <td
                    key={c.key}
                    style={{
                      height: block.wrap ? undefined : 36,
                      textAlign: c.align === "right" ? "right" : "left",
                      padding: block.wrap ? "8px 10px" : "0 10px",
                      fontSize: 12,
                      color: C.ink,
                      borderBottom: `1px solid ${C.line}`,
                      ...(block.wrap
                        ? {
                            lineHeight: "19px",
                            whiteSpace: "pre-wrap",
                            verticalAlign: "top",
                          }
                        : {
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                          }),
                    }}
                  >
                    {row[c.key] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {block.footer && (
            <tfoot>
              <tr>
                {block.columns.map((c) => (
                  <td
                    key={c.key}
                    style={{
                      height: 42,
                      padding: "0 10px",
                      textAlign: c.align === "right" ? "right" : "left",
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: C.ink,
                      borderTop: `2px solid ${C.champagne}`,
                    }}
                  >
                    {block.footer?.[c.key] ?? ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      );
    }
    case "signature":
      return (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            paddingTop: 36,
          }}
        >
          <div style={{ width: 220, textAlign: "center" }}>
            <div
              style={{
                borderTop: `1px solid ${C.ink}`,
                paddingTop: 8,
                fontSize: 13,
                color: C.ink,
                fontWeight: 600,
              }}
            >
              {block.name || "Authorised signatory"}
            </div>
            {block.role && (
              <div style={{ marginTop: 2, fontSize: 11, color: C.muted }}>
                {block.role}
              </div>
            )}
          </div>
        </div>
      );
  }
}

/**
 * (With `pad`, the blank letterhead only: header, rule and footer, an empty body and no title block or page number.)
 * The branded A4 letterhead: a forest-green top band, logo and company name on
 * the left with the contact lines on the right, a champagne rule, then the
 * title block and the body. Later pages carry a slim running header. Every
 * page ends with the company line and "Page n of N". Each page is exactly
 * 794 × 1123 px (A4 at 96 dpi) so the PNG / PDF export is a faithful copy.
 */
export const LetterheadPages = forwardRef<
  HTMLDivElement,
  { doc: StudioDocument; letterhead: StudioLetterhead; pad?: boolean }
>(function LetterheadPages({ doc, letterhead, pad = false }, ref) {
  // Page breaks use the blocks' real heights: an off-screen copy of every block (same width as the page's
  // text column) is measured, then the pages are laid out from those numbers.
  const measureRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<Measured | null>(null);

  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return;
    const read = () => {
      const m: Measured = { heights: [], head: [], rows: [], foot: [] };
      doc.blocks.forEach((_, i) => {
        const el = root.querySelector<HTMLElement>(`[data-m="${i}"]`);
        m.heights[i] = el?.offsetHeight ?? 0;
        m.head[i] = el?.querySelector<HTMLElement>("thead")?.offsetHeight ?? 0;
        m.foot[i] = el?.querySelector<HTMLElement>("tfoot")?.offsetHeight ?? 0;
        m.rows[i] = Array.from(
          el?.querySelectorAll<HTMLElement>("tbody tr") ?? [],
        ).map((r) => r.offsetHeight);
      });
      setMeasured((prev) =>
        prev && JSON.stringify(prev) === JSON.stringify(m) ? prev : m,
      );
    };
    read();
    // Web fonts arriving later change line heights a little; measure again once they are in.
    let alive = true;
    document.fonts?.ready.then(() => alive && read());
    return () => {
      alive = false;
    };
  }, [doc.blocks]);

  const pages = paginate(
    doc.blocks,
    measured && measured.heights.length === doc.blocks.length
      ? measured
      : undefined,
  );
  const total = pages.length;

  return (
    <div
      ref={ref}
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      <div
        ref={measureRef}
        aria-hidden
        style={{
          position: "absolute",
          left: -10000,
          top: 0,
          width: PAGE_W - PAD * 2,
          visibility: "hidden",
          pointerEvents: "none",
        }}
      >
        {doc.blocks.map((b, i) => (
          <div key={i} data-m={i}>
            <Block block={b} />
          </div>
        ))}
      </div>
      {pages.map((blocks, index) => (
        <div
          key={index}
          data-studio-page
          style={{
            position: "relative",
            width: PAGE_W,
            height: PAGE_H,
            background: "#fff",
            overflow: "hidden",
            color: C.ink,
            boxSizing: "border-box",
          }}
        >
          <div style={{ height: 8, background: C.forest }}>
            <div style={{ width: 140, height: 8, background: C.champagne }} />
          </div>

          {index === 0 ? (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 24,
                  padding: `36px ${PAD}px 24px`,
                }}
              >
                <Brand letterhead={letterhead} />
                <Contact letterhead={letterhead} />
              </div>
              <div style={{ padding: `0 ${PAD}px` }}>
                <Rule thick />
              </div>
              {!pad && (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-end",
                      gap: 24,
                      padding: `30px ${PAD}px 26px`,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 10.5,
                          letterSpacing: "0.3em",
                          textTransform: "uppercase",
                          color: C.champagne,
                          fontWeight: 700,
                        }}
                      >
                        {doc.kind}
                      </div>
                      <h1
                        className="font-serif-display"
                        style={{
                          margin: "8px 0 0",
                          fontSize: 36,
                          lineHeight: 1.06,
                          fontWeight: 400,
                          color: C.ink,
                        }}
                      >
                        {doc.title}
                      </h1>
                      {doc.subtitle && (
                        <div
                          style={{ marginTop: 8, fontSize: 13, color: C.muted }}
                        >
                          {doc.subtitle}
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        textAlign: "right",
                        fontSize: 11,
                        lineHeight: 1.7,
                        color: C.muted,
                        flexShrink: 0,
                      }}
                    >
                      <div>
                        <span style={{ color: C.subtle }}>Date </span>
                        <span style={{ color: C.ink, fontWeight: 600 }}>
                          {doc.date}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: C.subtle }}>Ref </span>
                        <span style={{ color: C.ink, fontWeight: 600 }}>
                          {doc.reference}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: `0 ${PAD}px` }}>
                    <div style={{ height: 1, background: C.line }} />
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 20,
                  padding: `24px ${PAD}px 16px`,
                }}
              >
                <Brand letterhead={letterhead} compact />
                <div
                  style={{
                    fontSize: 11,
                    color: C.muted,
                    textAlign: "right",
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {doc.title} · {doc.reference}
                </div>
              </div>
              <div style={{ padding: `0 ${PAD}px` }}>
                <Rule />
              </div>
            </>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 22,
              padding: `${index === 0 ? 26 : 28}px ${PAD}px 0`,
            }}
          >
            {blocks.map((b, i) => (
              <Block key={i} block={b} />
            ))}
          </div>

          <div
            style={{ position: "absolute", left: PAD, right: PAD, bottom: 30 }}
          >
            <Rule />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 10,
                fontSize: 10,
                color: C.subtle,
              }}
            >
              <span>
                {letterhead.name}
                {letterhead.website ? ` · ${letterhead.website}` : ""}
              </span>
              {!pad && (
                <span>
                  Page {index + 1} of {total}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});
