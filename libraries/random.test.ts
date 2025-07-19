import { format } from 'fast-csv'
import * as fs from "fs"
import { generateBinarySequence32 } from './random';

function testDistribution(maxStringLen: number = 3) {
    const csvStream = format({ headers: true });
    const writeStream = fs.createWriteStream("output.csv");
    csvStream.pipe(writeStream);

    // Current string length being tested
    for (let i = 1; i <= maxStringLen; i++) {
        let seeds: string[] = getAllPossibleStrings(i, 0, 127);
        console.log(`Testing strings of length ${i}. Testing ${seeds.length} strings.`)
        for (let j = 0; j < seeds.length; j++) {
            let num;
            try {
                num = generateBinarySequence32(seeds[j])
            }
            catch (e) {
                num = e
            }
            csvStream.write({
                seedLength: i,
                result: num
            })
        }
    }

    csvStream.end();
}

// Complexity: O(possibleCharCodes^length)
function getAllPossibleStrings(length: number, startCodeUnit: number, endCodeUnit: number): string[] {
    if (startCodeUnit > endCodeUnit) throw Error("startCodeUnit must be less than or equal to endCodeUnit")
    let result: string[] = []
    let currentCharCode: number[] = new Array(length)
    currentCharCode.fill(startCodeUnit)
    for (let i = 0; i < Math.pow((endCodeUnit - startCodeUnit + 1), length); i++) {
        result.push(
            String.fromCharCode(...currentCharCode)
        )
        for (let j = currentCharCode.length - 1; j >= 0; j--) {
            if (currentCharCode[j] == endCodeUnit) {
                currentCharCode[j] = startCodeUnit
            }
            else {
                currentCharCode[j]++;
                break;
            }

        }
    }
    return result;
}

testDistribution(2)