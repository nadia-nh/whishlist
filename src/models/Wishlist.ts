import { Schema, model, models, InferSchemaType } from "mongoose";

const WishlistSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, default: "My Wishlist" },
  description: { type: String, trim: true },
  slug: { type: String, required: true, unique: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  // DEFERRED (later phases): isSurpriseMode, eventDate, venmoHandle, paypalMeLink, coverImageUrl
});

export type WishlistDoc = InferSchemaType<typeof WishlistSchema>;
export default models.Wishlist || model("Wishlist", WishlistSchema);
