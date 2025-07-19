// Standalone pseudo-random generator

import { arrayBuffer } from "node:stream/consumers";

export function generate2DMazeLayout(width: number, height: number, seed: string): boolean[][] {
    // Pseudo-random 32-bit number based on seed
    let generationNumber = generateBinarySequence32(seed)

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

    // 0-indexed, 31 will always be a tap for 32 bit numbers, 0 shouldnt be a tap
    let taps = [11, 17, 23, 29]
    let hashed = linearFeedbackShiftRegister(normalized, taps);
    let bufferView = new DataView(hashed.buffer, 0);

    // Implementation error, shouldn't but can occur
    if (bufferView.getUint32(0) == 0) throw Error("An error occurred, please try another seed.")

    return (bufferView.getUint32(0))
}

// Only working for 32-bit numbers
function linearFeedbackShiftRegister(number: Uint8Array, taps: number[]): Uint8Array {
    let nBytes = number.byteLength
    if (nBytes != 4) throw Error("linearFeedbackShiftRegister is currently only valid for 32-bit numbers");
    let bufferView = new DataView(number.buffer, 0);

    taps.sort().reverse()
    let binaryString = bufferView.getUint32(0, true).toString(2).padStart(32, "0");
    console.log(`Initial:\t${binaryString}`)
    for (let i = 0; i < binaryString.length; i++) {
        let tapResult = parseInt(binaryString[nBytes * 8 - 1]);
        for (const tap of taps) {
            tapResult = tapResult ^ parseInt(binaryString[tap])
        }
        // On final iteration
        if (i == (binaryString.length - 1)) {
            binaryString = tapResult + binaryString.substring(1)
        }
        else {
            binaryString = "0" + tapResult + binaryString.substring(2)
        }

    }
    let integer = parseInt(binaryString, 2)
    let buffer = new ArrayBuffer(4);
    let dataView = new DataView(buffer);
    dataView.setInt32(0, integer)
    return new Uint8Array(buffer)
}