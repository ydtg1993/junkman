export function generateUniqueString(length: number = 10): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 2 + length - timestamp.length);
    return timestamp + randomPart;
}