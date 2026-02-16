import NextAuth, { AuthOptions, Account, User } from "next-auth";
import { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";

// This function handles the token refresh logic
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const url = "https://oauth2.googleapis.com/token";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    // Update the token with the new details
    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      // The refresh token might be rotated, so update it if a new one is sent
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    // If refresh fails, return the old token with an error flag
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // This scope is essential for getting a refresh token
          access_type: "offline",
          
          // This forces the consent screen to appear on every login
          // Good for debugging, can be removed for production
          prompt: "consent", 
          
          response_type: "code",
          scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly",
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    // This callback is called whenever a JWT is created or updated.
    async jwt({ token, account, user }: { token: JWT; account: Account | null; user: User | null }): Promise<JWT> {
      // 1. Initial sign-in: The 'account' object is only available this one time
      if (account && user) {
        console.log("JWT: Initial sign-in, saving tokens.");
        return {
          accessToken: account.access_token,
          // Expiry time is in seconds, convert to milliseconds
          accessTokenExpires: Date.now() + (account.expires_in as number) * 1000,
          refreshToken: account.refresh_token,
          user,
        };
      }

      // 2. Subsequent requests: Check if the access token has expired
      if (Date.now() < (token.accessTokenExpires as number)) {
        console.log("JWT: Access token is still valid.");
        return token;
      }

      // 3. Token has expired: Attempt to refresh it
      console.log("JWT: Access token has expired. Attempting to refresh...");
      if (!token.refreshToken) {
        console.error("JWT: No refresh token available to refresh.");
        throw new Error("Missing refresh token");
      }
      return refreshAccessToken(token);
    },

    // This callback is called whenever a session is checked.
    async session({ session, token }: { session: any; token: JWT }): Promise<any> {
      // Pass the relevant data from the JWT token to the session object
      // This makes it available on the client-side via `useSession()`
      if (token) {
        session.user = token.user;
        session.accessToken = token.accessToken;
        // Add error to the session so the client can handle it (e.g., force sign-out)
        session.error = token.error;
      }
      
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
