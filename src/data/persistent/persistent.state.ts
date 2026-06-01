export interface TokenState {
    token: string;
    receivedAt: number;
}

export interface PersistentState {
    tokenData?: TokenState;
}

export const initialPersistentState: PersistentState = {
}
