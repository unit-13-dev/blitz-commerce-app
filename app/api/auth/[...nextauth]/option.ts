import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
    providers: [
        //its a method gives access to objects 
        CredentialsProvider({
            id: "credentials",
            name: "Credentials",
            credentials:{
                email: { label: "Email", type: "text"},
                password: { label: "Password", type: "password", }
            },
            async authorize(credentials: any): Promise<any>{
                try {
                    if (!credentials?.email || !credentials?.password) {
                        throw new Error("Email and password are required")
                    }

                    //finding user by email using Prisma
                    const profile = await prisma.profile.findUnique({
                        where: { email: credentials.email.toLowerCase() }
                    })

                    //but if not received then 
                    if(!profile){
                        throw new Error("no user find with email")
                    }

                    //checking if password hash exists
                    if(!profile.passwordHash){
                        throw new Error("Account not properly set up")
                    }

                    //checking password
                    const isPasswordCorrect = await bcrypt.compare(credentials.password, profile.passwordHash)
                    if(isPasswordCorrect){
                        return {
                            id: profile.id,
                            email: profile.email,
                            name: profile.fullName || profile.email,
                            image: profile.avatarUrl || undefined,
                            role: profile.role
                        }
                    } else{
                        throw new Error("Incorrect Password")
                    }

                } catch (error: any) {
                    throw new Error(error.message || "Authentication failed")
                }
            }
        })
    ],
    callbacks: {
        async session({session, token}){
            if(token && session.user){
                session.user.id = token.id as string
                session.user.role = token.role as string
            }
            return session
        },
        async jwt({token, user}){
            if(user){
                token.id = user.id
                token.role = (user as any).role
                token.email = user.email || token.email
            }

            return token
        }
    },
    pages: {
        signIn: '/auth'
    },
    session: {
        strategy: "jwt"
    },
    secret: process.env.NEXTAUTH_SECRET
}