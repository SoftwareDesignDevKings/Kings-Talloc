import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const allowedDomains = ['kings.edu.au', 'student.kings.edu.au'];
const allowedEmails = ['liam22840@gmail.com', 'liha2347@gmail.com', "patelhariwork@gmail.com", "patelhari134900@gmail.com"];

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
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      const emailDomain = user.email.split('@')[1];
      if (allowedDomains.includes(emailDomain) || allowedEmails.includes(user.email)) {
        return true;
      } else {
        return false;
      }
    },
  },
});

export { handler as GET, handler as POST };
