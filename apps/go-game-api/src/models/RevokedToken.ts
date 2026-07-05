import { Schema, model, Document } from 'mongoose';

/**
 * A revoked refresh token, identified by its JWT id (`jti`).
 *
 * Entries are auto-purged by a TTL index once the token would have expired
 * anyway, so the collection only ever holds still-valid-but-revoked tokens.
 * This backs logout and refresh-token rotation without an external store.
 */
export interface IRevokedToken extends Document {
  jti: string;
  userId?: string;
  expiresAt: Date;
}

const RevokedTokenSchema = new Schema<IRevokedToken>({
  jti: { type: String, required: true, unique: true },
  userId: { type: String, default: null, index: true },
  expiresAt: { type: Date, required: true },
});

// TTL: remove the document as soon as `expiresAt` passes.
RevokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RevokedToken = model<IRevokedToken>('RevokedToken', RevokedTokenSchema);
export default RevokedToken;
export { RevokedToken };
