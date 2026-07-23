import { Schema, model, models, InferSchemaType } from "mongoose";
import { MATCH_PREFERENCES } from "@/types";

const WishlistItemSchema = new Schema({
  wishlistId: { type: Schema.Types.ObjectId, ref: "Wishlist", required: true, index: true },
  title: { type: String, required: true, trim: true }, // ONLY required field
  description: { type: String, trim: true },
  url: { type: String, trim: true },
  price: { type: Number, min: 0 },
  priority: { type: Number, min: 1, max: 3 },
  matchPreference: { type: String, enum: MATCH_PREFERENCES },
  isFulfilled: { type: Boolean, default: false },
  fulfilledAt: { type: Date },
  fulfilledBy: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
  // DEFERRED (later phases): imageUrl (Cloudinary), ogImageUrl/ogTitle (Microlink scrape),
  // targetCash, cashRaised, venmoHandle, paypalMeLink (cash pledges),
  // optimistic-lock/version field (full double-fulfillment hardening)
});

export type WishlistItemDoc = InferSchemaType<typeof WishlistItemSchema>;
export default models.WishlistItem || model("WishlistItem", WishlistItemSchema);
