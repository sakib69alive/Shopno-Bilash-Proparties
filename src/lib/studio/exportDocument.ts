"use client";

import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

const SCALE = 2; // 2× the A4 CSS size: sharp enough to print, small enough to share on WhatsApp

async function renderPage(el: HTMLElement, scale = SCALE): Promise<string> {
  return toPng(el, { pixelRatio: scale, cacheBust: true, backgroundColor: "#ffffff", skipFonts: false });
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

async function buildPdf(pages: HTMLElement[]): Promise<jsPDF> {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  for (let i = 0; i < pages.length; i++) {
    const png = await renderPage(pages[i], 3); // 3× keeps text and the logo crisp when the PDF is zoomed in
    if (i > 0) pdf.addPage();
    pdf.addImage(png, "PNG", 0, 0, 210, 297, undefined, "FAST");
  }
  return pdf;
}

/** One PDF, one A4 page per sheet. */
export async function downloadPdf(pages: HTMLElement[], baseName: string): Promise<void> {
  (await buildPdf(pages)).save(`${baseName}.pdf`);
}

/** The same PDF as a `File`, for sending to the server instead of downloading. */
export async function makePdfFile(pages: HTMLElement[], baseName: string): Promise<File> {
  const blob = (await buildPdf(pages)).output("blob");
  return new File([blob], `${baseName}.pdf`, { type: "application/pdf" });
}

/** One PNG per page (a single page downloads as just the name; more as -page-1, -page-2…). */
export async function downloadPng(pages: HTMLElement[], baseName: string, scale = SCALE): Promise<void> {
  for (let i = 0; i < pages.length; i++) {
    const png = await renderPage(pages[i], scale);
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
