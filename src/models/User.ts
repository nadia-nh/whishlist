import { Schema, model, models, InferSchemaType } from "mongoose";

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  createdAt: { type: Date, default: Date.now },
  // DEFERRED (Phase 2 - real OTP auth): otpCodeHash, otpExpiresAt, otpAttempts, lastLoginAt
});

export type UserDoc = InferSchemaType<typeof UserSchema>;
export default models.User || model("User", UserSchema);
