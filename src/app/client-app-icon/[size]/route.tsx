import { ImageResponse } from "next/og";

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  if (size !== "192" && size !== "512") return new Response(null, { status: 404 });

  const dimension = Number(size);
  return new ImageResponse(
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      width: "100%", height: "100%", background: "#2b2622", color: "#f4eee3", fontSize: dimension * 0.27,
    }}>
      <div style={{ display: "flex", gap: dimension * 0.04, height: dimension * 0.29, alignItems: "flex-end" }}>
        <div style={{ width: dimension * 0.08, height: dimension * 0.16, background: "#b39a78" }} />
        <div style={{ width: dimension * 0.08, height: dimension * 0.27, background: "#f4eee3" }} />
        <div style={{ width: dimension * 0.08, height: dimension * 0.2, background: "#b39a78" }} />
      </div>
      <div style={{ display: "flex", lineHeight: 1.1 }}>SB</div>
    </div>,
    { width: dimension, height: dimension },
  );
}
