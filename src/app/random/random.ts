// Standalone pseudo-random generator

export function generate2DMazeLayout(width: number, height: number, seed: string): boolean[][] {
    // Pseudo-random 32-bit number based on seed
    const generationNumber = generateBinarySequence32(seed)
    const bitString = generationNumber.toString(2).padStart(32, "0")

    let result: boolean[][] = []
    for (let i = 0; i < height; i++) {
        result.push(new Array(width))
        result[i].fill(true)
    }

    let step = 0
    let leap = 10;
    const stepsNeeded = 100
    let x = Math.floor(width / 2 + 1);
    let y = Math.floor(height / 2 + 1);

    const minX = 1
    const minY = 1

    const maxX = width - 1
    const maxY = height - 1

    let direction = Direction.Down
    let i = 0

    while (step < stepsNeeded) {
        i = i * 5 + 1
        let left: boolean = parseInt(bitString[(i) % 32]) == 1

        if (left) {
            direction = getLeftDirection(direction)
        } else {
            direction = getRightDirection(direction)
        }

        let leapResult = safeFill(result, x, y, leap, direction, false)
        if (leapResult.uniqueFilled == 0) {
            if (leapResult.x2 <= minX) {
                direction = Direction.Right
                leapResult = safeFill(result, x, y, leap, direction, false)
            }
            else if (leapResult.x2 >= maxX) {
                direction = Direction.Left
                leapResult = safeFill(result, x, y, leap, direction, false)
            }
            else if (leapResult.y2 <= minY) {
                direction = Direction.Down
                leapResult = safeFill(result, x, y, leap, direction, false)
            }
            else if (leapResult.y2 >= maxY) {
                direction = Direction.Up
                leapResult = safeFill(result, x, y, leap, direction, false)
            }
        }

        step += leapResult.uniqueFilled
        x = leapResult.x2
        y = leapResult.y2
        i++

        if (leapResult.uniqueFilled > 0) console.log(leapResult)
    }
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            if (i == 0 || i == height - 1 || j == 0 || j == width - 1) {
                result[j][i] = true
            }
        }

    }

    return result
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
    let taps = [17, 21, 23, 31]
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

enum Direction {
    Up,
    Left,
    Down,
    Right,
}

function getOppositeDirection(direction: Direction): Direction {
    switch (direction) {
        case Direction.Up:
            return Direction.Down;
        case Direction.Down:
            return Direction.Up;
        case Direction.Left:
            return Direction.Right
        case Direction.Right:
            return Direction.Left
    }
}

function getRightDirection(direction: Direction): Direction {
    switch (direction) {
        case Direction.Up:
            return Direction.Right;
        case Direction.Down:
            return Direction.Left;
        case Direction.Left:
            return Direction.Up
        case Direction.Right:
            return Direction.Down
    }
}

function getLeftDirection(direction: Direction): Direction {
    switch (direction) {
        case Direction.Up:
            return Direction.Left;
        case Direction.Down:
            return Direction.Right;
        case Direction.Left:
            return Direction.Down
        case Direction.Right:
            return Direction.Up
    }
}

interface FillResult {
    uniqueFilled: number,
    x2: number
    y2: number
    direction: Direction
}


function safeFill<T>(array: T[][], x: number, y: number, count: number, direction: Direction, item: T): FillResult {
    const minX = 0
    const minY = 0

    const maxX = array[0].length - 1
    const maxY = array.length - 1
    let updatedCount = 0;

    let x1 = x;
    let y1 = y;

    let x2 = x;
    let y2 = y;

    switch (direction) {
        case Direction.Up:
            y2 = y2 - count;
            break;
        case Direction.Down:
            y2 = y2 + count;
            break;
        case Direction.Left:
            x2 = x2 - count;
            break;
        case Direction.Right:
            x2 = x2 + count;
            break;
    }
    x2 = (x1 < x2) ? Math.min(x2, maxX) : Math.max(x2, minX)
    y2 = (y1 < y2) ? Math.min(y2, maxY) : Math.max(y2, minY)

    for (let j = y1; ((y1 < y2) ? j <= y2 : j >= y2); ((y1 < y2) ? j++ : j--)) {
        for (let i = x1; ((x1 < x2) ? i <= x2 : i >= x2); ((x1 < x2) ? i++ : i--)) {
            if (array[j][i] != item) {
                array[j][i] = item;
                updatedCount++;
            }
        }
    }

    return {
        uniqueFilled: updatedCount,
        x2: x2,
        y2: y2,
        direction: direction
    };
}
