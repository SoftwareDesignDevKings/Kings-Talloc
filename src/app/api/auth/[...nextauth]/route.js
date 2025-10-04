import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from "next-auth/providers/azure-ad";

const allowedDomains = ['kings.edu.au', 'student.kings.edu.au'];

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({token, user}) {
      if (user) {
        token.role = user.role || "student";
      }
      return token;
    },

    async session({session, token}) {
      session.user.role = token.role
      return session;
    },

    // temp disable to local testing for custom emails 
    async signIn({ user, account, profile, email, credentials }) {
      const emailDomain = user.email.split('@')[1];
      return true
      // if (allowedDomains.includes(emailDomain) || allowedEmails.includes(user.email)) {
      //   return true;
      // } else {
      //   return false;
      // }
    },
  },
});

export { handler as GET, handler as POST };
