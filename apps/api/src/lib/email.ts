import { env } from "../env.js";

type VerificationEmail = {
  userEmail: string;
  verificationUrl: string;
};

export async function sendVerificationEmail({ userEmail, verificationUrl }: VerificationEmail) {
  const from = env.VERIFICATION_EMAIL_FROM || "no-reply@bakunights.local";
  const to = userEmail;

  // Local/dev sender. This keeps the auth flow real while the project has no SMTP/API email provider yet.
  // When a provider is added, replace this console block with the provider call.
  console.info([
    "",
    "========== BakuNights email verification ==========",
    `From: ${from}`,
    `To: ${to}`,
    "Subject: Verify your BakuNights account",
    `Verification link: ${verificationUrl}`,
    "===================================================",
    "",
  ].join("\n"));
}
