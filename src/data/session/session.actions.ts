export const incrementLoadingCount = () => ({
    type: 'increment-loading-count',
} as const);

export const decrementLoadingCount = () => ({
    type: 'decrement-loading-count',
} as const);

export const clearLoadingCount = () => ({
    type: 'clear-loading-count',
} as const);

export type SessionActions =
    | ReturnType<typeof incrementLoadingCount>
    | ReturnType<typeof decrementLoadingCount>
    | ReturnType<typeof clearLoadingCount>; 