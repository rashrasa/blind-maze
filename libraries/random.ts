// Standalone pseudo-random generator

export function generate2DMazeLayout(width: number, height: number, seed: string): boolean[][] {
    return [[true, true, true]]
}

function generateBinarySequence32(seed: string): number {
    if (seed.length == 0) throw Error("Cannot generate a 32-bit sequence from an empty string.");

    let nBytes: number = 4

    let encoder = new TextEncoder()
    let encoded = encoder.encode(seed)
    let timesOriginalLength = Math.ceil(encoded.byteLength * ((1.0 * nBytes) / (1.0 * encoded.byteLength))) + 2

    // Expand to be >= nBytes
    let merged = new Uint8Array(timesOriginalLength * encoded.length)
    for (let i = 0; i < timesOriginalLength; i++) {
        merged.set(encoded, i * encoded.byteLength);
    }

    // Normalize to nBytes
    let normalized = new Uint8Array(nBytes)
    if (merged.byteLength > nBytes) {
        for (let i = 0; i < nBytes; i++) {
            normalized[i] = merged[i];
        }
        for (let i = nBytes; i < merged.byteLength; i++) {
            normalized[i % nBytes] = normalized[i % nBytes] ^ merged[i];
        }
    }
    // Hash using linear-feedback shift register algorithm
    let hashed = normalized;


    let bufferView = new DataView(hashed.buffer, 0);

    return (bufferView.getUint32(0, true))
}
