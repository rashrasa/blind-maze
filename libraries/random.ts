// Standalone pseudo-random generator

export function generate2DMazeLayout(width: number, height: number, seed: string): boolean[][] {
    // Pseudo-random 32-bit number based on seed
    let generationNumber = generateBinarySequence32(seed)

    return [[true, true, true]]
}

export function generateBinarySequence32(seed: string): number {
    if (seed.length == 0) throw Error("Cannot generate a 32-bit sequence from an empty string.");

    let nBytes: number = 4

    let encoder = new TextEncoder()
    let encoded = encoder.encode(seed)

    let timesOriginalLength = Math.ceil(encoded.byteLength * ((1.0 * nBytes) / (1.0 * encoded.byteLength))) + 2


    // Normalize to nBytes
    let normalized = new Uint8Array(nBytes)
    normalized.fill(0)
    if (encoded.byteLength <= nBytes) {
        normalized.set(encoded, 4 - encoded.length);
    }
    else if (encoded.byteLength > nBytes) {
        for (let i = 0; i < nBytes; i++) {
            normalized[i] = encoded[i];
        }
        for (let i = nBytes; i < encoded.byteLength; i++) {
            normalized[i % nBytes] = normalized[i % nBytes] ^ encoded[i];
        }
    }
    let normalizedView = new DataView(normalized.buffer)
    // Hash using linear-feedback shift register algorithm

    // 0-indexed, 31 will always be a tap for 32 bit numbers, 0 shouldnt be a tap
    let taps = [2, 5, 7, 21, 23, 29]
    let hashed = linearFeedbackShiftRegister(normalized, taps);
    let hashedView = new DataView(hashed.buffer, 0);

    // Implementation error, shouldn't but can occur
    if (hashedView.getUint32(0) == 0) throw Error("An error occurred, please try another seed.")

    return (hashedView.getUint32(0))
}

// Only working for 32-bit numbers
function linearFeedbackShiftRegister(number: Uint8Array, taps: number[]): Uint8Array {
    let nBytes = number.byteLength
    if (nBytes != 4) throw Error("linearFeedbackShiftRegister is currently only valid for 32-bit numbers");
    let bufferView = new DataView(number.buffer, 0);

    taps.sort().reverse()
    let binaryString = bufferView.getUint32(0, true).toString(2).padStart(32, "0");
    for (let i = 0; i < binaryString.length; i++) {
        let tapResult = 1;
        for (const tap of taps) {
            tapResult = tapResult ^ parseInt(binaryString[tap])
        }
        // On final iteration
        if (i == (binaryString.length - 1)) {
            binaryString = tapResult + binaryString.substring(0, binaryString.length - 1)
        }
        else {
            binaryString = "0" + tapResult + binaryString.substring(0, binaryString.length - 2)
        }

    }
    let integer = parseInt(binaryString, 2)
    let buffer = new ArrayBuffer(4);
    let dataView = new DataView(buffer);
    dataView.setInt32(0, integer)
    return new Uint8Array(buffer)
}