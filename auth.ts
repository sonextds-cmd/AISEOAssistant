import NextAuth from "next-auth";
import Credentials from "@auth/core/providers/credentials";
import AzureAD from "@auth/core/providers/azure-ad";

async function validateAzureADCredentials(username: string, password: string) {
  const tokenUrl = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`;

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.AZURE_AD_CLIENT_ID!,
        client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
        scope: "https://graph.microsoft.com/.default",
        username,
        password,
        grant_type: "password",
      }).toString(),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${data.access_token}`,
      },
    });

    if (!graphResponse.ok) {
      return null;
    }

    const userInfo = await graphResponse.json();
    return {
      id: userInfo.id,
      name: userInfo.displayName,
      email: userInfo.userPrincipalName,
    };
  } catch (error) {
    console.error("Azure AD validation error:", error);
    return null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    AzureAD({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    }),
    Credentials({
      credentials: {
        username: { label: "Username", type: "text", placeholder: "user@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await validateAzureADCredentials(
          credentials.username as string,
          credentials.password as string
        );

        return user || null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.sub,
      };
      return session;
    },
  },
});
