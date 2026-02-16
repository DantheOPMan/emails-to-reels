import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

const R2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function GET(
  request: Request,
  { params }: { params: { filename: string } }
) {
  // Await params for Next.js 15
  const { filename } = await (params as any);

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: filename,
    });

    const response = await R2.send(command);
    
    // This returns a Uint8Array
    const uint8Array = await response.Body?.transformToByteArray();

    if (!uint8Array) {
      return NextResponse.json({ error: "Asset is empty" }, { status: 404 });
    }

    /**
     * FIX: The "Nuclear Option" Type Assertion
     * 
     * Because COOP/COEP headers are enabled, TS thinks this might be a 
     * SharedArrayBuffer, which it considers incompatible with the standard 
     * Blob/Response types. 
     * 
     * We cast to 'any' because at runtime, the browser and Node.js 
     * handle Uint8Arrays (even those backed by SharedArrayBuffers) 
     * perfectly fine as Response bodies.
     */
    return new NextResponse(uint8Array as any, {
      headers: {
        "Content-Type": filename.endsWith(".mp4") ? "video/mp4" : "font/ttf",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Cross-Origin-Resource-Policy": "cross-origin",
      },
    });
  } catch (error) {
    console.error("R2 Fetch Error:", error);
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
}
