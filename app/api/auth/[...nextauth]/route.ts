import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const user = {
                    id: "1",
                    name: "Pascal",
                    username: process.env.AUTH_USER,
                    password: process.env.AUTH_PASS,
                };
                if(credentials?.username === user.username && credentials?.password === user.password) {
                    return {
                        id: user.id,
                        name: user.name,
                        username: user.username,
                    }
                }
                return null;
            }
        })
    ],
    session: { strategy: "jwt" },
    pages: {
        signIn: "/login",
    }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };