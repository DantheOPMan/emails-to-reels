import { google } from 'googleapis';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session: any = await getServerSession(authOptions);
    
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });

    const gmail = google.gmail({ version: 'v1', auth });
    
    // Fetch top 10 emails for the feed
    const res = await gmail.users.messages.list({ 
      userId: 'me', 
      q: 'category:primary', 
      maxResults: 10 
    });

    if (!res.data.messages || res.data.messages.length === 0) {
      return NextResponse.json({ messages: [] });
    }

    // Fetch details for all messages in parallel
    const emailPromises = res.data.messages.map(async (message) => {
      const msg = await gmail.users.messages.get({ 
        userId: 'me', 
        id: message.id!,
        format: 'full' 
      });
      
      const snippet = msg.data.snippet || "No content.";
      // Clean up snippets (remove HTML entities, etc)
      const cleanBody = snippet.replace(/&#39;/g, "'").replace(/&quot;/g, '"');
      
      return {
        id: message.id,
        body: cleanBody,
        sender: msg.data.payload?.headers?.find(h => h.name === 'From')?.value || 'Unknown'
      };
    });

    const messages = await Promise.all(emailPromises);

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error("GMAIL API ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
