import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "../db.js";
import { env } from "../env.js";

const publicUser = (user: { id: string; email: string; name: string; role: "CONSUMER" | "MERCHANT" | "ADMIN" }) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
});

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user ? publicUser(user) : false);
  } catch (error) {
    done(error);
  }
});

export const googleAuthEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

if (googleAuthEnabled) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID!,
        clientSecret: env.GOOGLE_CLIENT_SECRET!,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value.toLowerCase();
          if (!email) return done(new Error("Google account has no accessible email"));
          const user = await prisma.user.upsert({
            where: { email },
            update: { googleId: profile.id, name: profile.displayName },
            create: { email, googleId: profile.id, name: profile.displayName },
          });
          done(null, publicUser(user));
        } catch (error) {
          done(error as Error);
        }
      },
    ),
  );
}

export { passport };
