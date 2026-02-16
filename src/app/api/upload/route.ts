import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const R2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  
  if (!file) return Response.json({ error: "No file" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${uuidv4()}.mp4`;

  await R2.send(new PutObjectCommand({
    Bucket: "your-bucket-name",
    Key: filename,
    Body: buffer,
    ContentType: "video/mp4",
  }));

  // Setup a custom domain in Cloudflare for public access
  return Response.json({ url: `https://your-custom-domain.com/${filename}` });
}
