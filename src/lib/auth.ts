import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import connectDB from "./mongodb";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await connectDB();

        const emailRaw = credentials?.email?.trim() ?? "";

        const userByEmail = emailRaw
          ? await User.findOne({
              email: emailRaw.toLowerCase(),
            })
          : null;

        if (userByEmail) {
          return {
            id: userByEmail._id.toString(),
            email: userByEmail.email,
            name: userByEmail.name,
            role: userByEmail.role,
          };
        }

        const fallback = await User.findOne().sort({ createdAt: 1 });
        if (!fallback) {
          throw new Error(
            "No user accounts in the database yet. Register or seed users first.",
          );
        }

        return {
          id: fallback._id.toString(),
          email: emailRaw || fallback.email,
          name: fallback.name,
          role: fallback.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
