import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const R2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  // 1. Security Check
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { filename, contentType } = await request.json();

  // 2. Create the Direct Upload Link
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: filename,
    ContentType: contentType,
  });

  // 3. Sign it (valid for 1 minute)
  const signedUrl = await getSignedUrl(R2, command, { expiresIn: 60 });

  // 4. Return the public URL for viewing later
  // Note: Ensure your R2 bucket allows public access or you have a custom domain setup
  const publicUrl = `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET_NAME}/${filename}`; 
  // Better yet, if you have a custom domain mapped in Cloudflare:
  // const publicUrl = `https://your-custom-domain.com/${filename}`;

  return Response.json({ url: signedUrl, publicUrl });
}
