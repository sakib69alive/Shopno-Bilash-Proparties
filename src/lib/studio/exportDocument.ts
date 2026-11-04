"use client";

import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

const SCALE = 2; // 2× the A4 CSS size: sharp enough to print, small enough to share on WhatsApp

async function renderPage(el: HTMLElement): Promise<string> {
  return toPng(el, { pixelRatio: SCALE, cacheBust: true, backgroundColor: "#ffffff", skipFonts: false });
}

function save(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function safeFileName(title: string): string {
  return (
    title
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "document"
  );
}

/** One PDF, one A4 page per sheet. */
export async function downloadPdf(pages: HTMLElement[], baseName: string): Promise<void> {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  for (let i = 0; i < pages.length; i++) {
    const png = await renderPage(pages[i]);
    if (i > 0) pdf.addPage();
    pdf.addImage(png, "PNG", 0, 0, 210, 297, undefined, "FAST");
  }
  pdf.save(`${baseName}.pdf`);
}

/** One PNG per page (a single page downloads as just the name; more as -page-1, -page-2…). */
export async function downloadPng(pages: HTMLElement[], baseName: string): Promise<void> {
  for (let i = 0; i < pages.length; i++) {
    const png = await renderPage(pages[i]);
    save(png, pages.length === 1 ? `${baseName}.png` : `${baseName}-page-${i + 1}.png`);
    // Browsers ask before allowing many downloads in a row; a short gap keeps them all.
    if (i < pages.length - 1) await new Promise((r) => setTimeout(r, 350));
  }
}

/** First page as an image on the clipboard, ready to paste into WhatsApp Web, email, etc. */
export async function copyFirstPageImage(pages: HTMLElement[]): Promise<boolean> {
  if (!pages[0] || typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) return false;
  const png = await renderPage(pages[0]);
  const blob = await (await fetch(png)).blob();
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  return true;
}
