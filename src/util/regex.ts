export const emailRegExp = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
export const phoneRegExp = /^\d{10}$/;
export const zipRegExp = /(0[1-9]|[1-9][0-9])[0-9]{3}/;
export const stateRegExp = /^(A[LKSZRAEP]|C[AOT]|D[EC]|F[LM]|G[AU]|HI|I[ADLN]|K[SY]|LA|M[ADEHINOPST]|N[CDEHJMVY]|O[HKR]|P[ARW]|RI|S[CD]|T[NX]|U[MT]|V[AIT]|W[AIVY])+$/;
export const urlRegExp = /[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/;

export function validateRegexMatch(regex: RegExp, value: string, caseSensitive: boolean = false): boolean {
    if (!value) {
        return false;
    }
    const testValue = String(value);
    const flags = caseSensitive ? regex.flags : regex.flags + 'i';
    const testRegex = new RegExp(regex.source, flags);
    return testRegex.test(testValue);
}
