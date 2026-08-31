export interface TokenState {
  token: string;
  /** Epoch ms when this token was received/stored. */
  receivedAt: number;
  /**
   * Epoch ms when this token expires, derived from the JWT `exp` claim at store
   * time. Undefined for opaque/undecodable tokens (fall back to `receivedAt` +
   * age heuristic) and for tokens persisted before this field existed.
   */
  expiresAt?: number;
}

export interface PersistentState {
  tokenData?: TokenState;
}

export const initialPersistentState: PersistentState = {};
