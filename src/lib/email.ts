const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  if (!RESEND_API_KEY) {
    // Dev fallback: no Resend key configured yet, so print the code instead of emailing it.
    console.log(`[dev] OTP code for ${email}: ${code} (set RESEND_API_KEY to send real emails)`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: email,
      subject: `Your sign-in code: ${code}`,
      text: `Your sign-in code is ${code}. It expires in 10 minutes.`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to send OTP email (${res.status}): ${body}`);
  }
}
