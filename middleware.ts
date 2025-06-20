import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login"
  }
});

export const config = {
  matcher: [
    // Protect everything except the login and API routes
    "/((?!api|login|_next|favicon.ico).*)"
  ]
};