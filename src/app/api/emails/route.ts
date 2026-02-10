import { google } from 'googleapis';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: session.accessToken });

  const gmail = google.gmail({ version: 'v1', auth });
  const res = await gmail.users.messages.list({ userId: 'me', maxResults: 1 });
  
  const msgId = res.data.messages?.[0].id;
  const msg = await gmail.users.messages.get({ userId: 'me', id: msgId! });
  
  // Extracting the plain text body
  const body = msg.data.snippet || "No content"; 
  return Response.json({ body });
}
