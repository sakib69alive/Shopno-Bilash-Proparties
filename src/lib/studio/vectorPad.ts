"use client";

import { jsPDF } from "jspdf";
import type { StudioLetterhead } from "@/lib/studio/types";

/**
 * The blank letterhead as a REAL PDF — not a picture of one. Every line is drawn as a vector shape, every word is real, selectable
 * text (so it stays razor sharp at any zoom and an AI or a PDF editor can read and keep it), and the logo is placed at its full
 * original resolution instead of being shrunk to the screen size. It mirrors the layout of `LetterheadPages` in `pad` mode (all
 * measures are the same 794 × 1123 px page, converted to millimetres), so what is printed is the design the site already uses.
 */

const PX = 210 / 794; // one page pixel in millimetres
const PT = 0.75; // one pixel in points (font sizes)
const W = 794;
const H = 1123;
const PAD = 56;

const C = {
  forest: "#1f3d33",
  champagne: "#b9a278",
  ink: "#1c1b19",
  muted: "#6b6660",
  subtle: "#8f897f",
  line: "#e3ddd1",
};

const rgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const mm = (px: number) => px * PX;

/** The built-in PDF fonts only know Western letters. Anything else (বাংলা…) is drawn as a sharp, high-resolution picture of that line. */
const isLatin1 = (s: string) => /^[\u0000-ÿ–—‘’“”•…·]*$/.test(s);

function textPicture(text: string, sizePx: number, color: string, bold = false): { url: string; w: number; h: number } {
  const scale = 6;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const font = `${bold ? "700" : "400"} ${sizePx * scale}px "Noto Sans Bengali", "Hind Siliguri", "Segoe UI", Arial, sans-serif`;
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 4;
  const h = Math.ceil(sizePx * scale * 1.5);
  canvas.width = w;
  canvas.height = h;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, 2, sizePx * scale * 1.1);
  return { url: canvas.toDataURL("image/png"), w: w / scale, h: h / scale };
}

/** The logo at its own full resolution (never the 66 px it is shown at). */
async function loadLogo(src: string): Promise<{ url: string; w: number; h: number } | null> {
  try {
    const res = await fetch(src, { credentials: "same-origin" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const bmp = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    canvas.getContext("2d")!.drawImage(bmp, 0, 0);
    return { url: canvas.toDataURL("image/png"), w: bmp.width, h: bmp.height };
  } catch {
    return null;
  }
}

export async function makeVectorPadPdf(l: StudioLetterhead): Promise<jsPDF> {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  pdf.setProperties({
    title: `${l.name} — letterhead`,
    subject: "Blank company letterhead. Real text and vector lines: write inside the empty area, keep everything else as it is.",
    creator: l.name,
  });

  const fill = (hex: string) => pdf.setFillColor(...rgb(hex));
  const draw = (hex: string) => pdf.setDrawColor(...rgb(hex));
  const ink = (hex: string) => pdf.setTextColor(...rgb(hex));

  // Top band: forest green with a short champagne segment at the left.
  fill(C.forest);
  pdf.rect(0, 0, 210, mm(8), "F");
  fill(C.champagne);
  pdf.rect(0, 0, mm(140), mm(8), "F");

  // Brand: logo + company name + line.
  const headTop = 8 + 36;
  let textX = PAD;
  if (l.logoMode !== "name") {
    const logo = await loadLogo(l.logo || "/logo.webp");
    if (logo) {
      const h = 66;
      const w = (logo.w / logo.h) * h;
      pdf.addImage(logo.url, "PNG", mm(PAD), mm(headTop), mm(w), mm(h), undefined, "FAST");
      textX = PAD + w + 16;
    }
  }
  // Company name (serif) and the small caps line under it, centred on the 66 px logo height like the on-screen letterhead.
  const nameTop = headTop + 10.6;
  if (isLatin1(l.name)) {
    pdf.setFont("times", "normal");
    pdf.setFontSize(27 * PT);
    ink(C.ink);
    pdf.text(l.name, mm(textX), mm(nameTop + 22.7));
  } else {
    const pic = textPicture(l.name, 27, C.ink);
    pdf.addImage(pic.url, "PNG", mm(textX), mm(nameTop), mm(pic.w), mm(pic.h), undefined, "FAST");
  }
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.5 * PT);
  ink(C.champagne);
  pdf.setCharSpace(mm(9.5 * 0.3));
  pdf.text("REAL ESTATE · CONSTRUCTION", mm(textX), mm(nameTop + 28.35 + 5 + 8.1));
  pdf.setCharSpace(0);

  // Contact lines, right-aligned, wrapped at 230 px.
  const contact = [l.address, l.phone, l.email, l.website].filter(Boolean) as string[];
  const lineH = 10.5 * 1.65;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10.5 * PT);
  ink(C.muted);
  let rows = 0;
  for (const line of contact) {
    const parts = isLatin1(line) ? (pdf.splitTextToSize(line, mm(230)) as string[]) : [line];
    for (const part of parts) {
      const y = headTop + 3.4 + 8.4 + rows * lineH;
      if (isLatin1(part)) {
        pdf.text(part, mm(W - PAD), mm(y), { align: "right" });
      } else {
        const pic = textPicture(part, 10.5, C.muted);
        pdf.addImage(pic.url, "PNG", mm(W - PAD - pic.w), mm(y - 10.5 * 1.1), mm(pic.w), mm(pic.h), undefined, "FAST");
      }
      rows++;
    }
  }

  // The rule under the header: a hairline with a short, thick forest bar at the left.
  const headerH = Math.max(66, rows * lineH);
  const ruleY = headTop + headerH + 24;
  draw(C.line);
  pdf.setLineWidth(mm(1));
  pdf.line(mm(PAD), mm(ruleY + 0.5), mm(W - PAD), mm(ruleY + 0.5));
  fill(C.forest);
  pdf.rect(mm(PAD), mm(ruleY - 1), mm(64), mm(3), "F");

  // Footer: hairline with a short champagne bar, then the company line.
  const footY = H - 30 - 23;
  draw(C.line);
  pdf.line(mm(PAD), mm(footY + 0.5), mm(W - PAD), mm(footY + 0.5));
  fill(C.champagne);
  pdf.rect(mm(PAD), mm(footY), mm(64), mm(1), "F");
  const footText = `${l.name}${l.website ? ` · ${l.website}` : ""}`;
  if (isLatin1(footText)) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10 * PT);
    ink(C.subtle);
    pdf.text(footText, mm(PAD), mm(footY + 1 + 10 + 8.2));
  } else {
    const pic = textPicture(footText, 10, C.subtle);
    pdf.addImage(pic.url, "PNG", mm(PAD), mm(footY + 11 - 1), mm(pic.w), mm(pic.h), undefined, "FAST");
  }

  return pdf;
}

export async function downloadVectorPad(l: StudioLetterhead, baseName: string): Promise<void> {
  (await makeVectorPadPdf(l)).save(`${baseName}.pdf`);
}
