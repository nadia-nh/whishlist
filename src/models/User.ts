import { Schema, model, models, InferSchemaType } from "mongoose";

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  otpCodeHash: { type: String },
  otpExpiresAt: { type: Date },
  otpAttempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export type UserDoc = InferSchemaType<typeof UserSchema>;
export default models.User || model("User", UserSchema);
