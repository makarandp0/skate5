type QrVersion = 1 | 2 | 3 | 4;

type QrSpec = {
  version: QrVersion;
  dataCodewords: number;
  errorCodewords: number;
};

const specs: QrSpec[] = [
  { version: 1, dataCodewords: 19, errorCodewords: 7 },
  { version: 2, dataCodewords: 34, errorCodewords: 10 },
  { version: 3, dataCodewords: 55, errorCodewords: 15 },
  { version: 4, dataCodewords: 80, errorCodewords: 20 },
];

const alignmentPatternCenters: Record<QrVersion, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
};

export type QrMatrix = boolean[][];

export function createQrMatrix(value: string): QrMatrix {
  const data = new TextEncoder().encode(value);
  const spec = specs.find((item) => data.length <= byteCapacity(item));

  if (!spec) {
    throw new Error("QR value is too long");
  }

  const size = spec.version * 4 + 17;
  const modules = createMatrix<boolean | null>(size, null);
  const reserved = createMatrix(size, false);

  drawFunctionPatterns(modules, reserved, spec.version);
  reserveFormatAreas(reserved);

  const dataCodewords = encodeData(data, spec.dataCodewords);
  const errorCodewords = reedSolomonRemainder(
    dataCodewords,
    spec.errorCodewords
  );
  const codewords = [...dataCodewords, ...errorCodewords];

  drawCodewords(modules, reserved, codewords);
  applyMask(modules, reserved);
  drawFormatBits(modules, reserved);

  return modules.map((row) => row.map(Boolean));
}

function byteCapacity(spec: QrSpec): number {
  return Math.floor((spec.dataCodewords * 8 - 12) / 8);
}

function createMatrix<T>(size: number, value: T): T[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => value)
  );
}

function encodeData(data: Uint8Array, dataCodewords: number): number[] {
  const bits: number[] = [];
  appendBits(bits, 0x4, 4);
  appendBits(bits, data.length, 8);

  for (const byte of data) {
    appendBits(bits, byte, 8);
  }

  const capacityBits = dataCodewords * 8;
  appendBits(bits, 0, Math.min(4, capacityBits - bits.length));

  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(bitsToByte(bits.slice(i, i + 8)));
  }

  for (let pad = 0xec; codewords.length < dataCodewords; pad ^= 0xfd) {
    codewords.push(pad);
  }

  return codewords;
}

function appendBits(bits: number[], value: number, length: number): void {
  for (let i = length - 1; i >= 0; i -= 1) {
    bits.push((value >>> i) & 1);
  }
}

function bitsToByte(bits: number[]): number {
  return bits.reduce((byte, bit) => (byte << 1) | bit, 0);
}

function drawFunctionPatterns(
  modules: (boolean | null)[][],
  reserved: boolean[][],
  version: QrVersion
): void {
  const size = modules.length;

  drawFinderPattern(modules, reserved, 3, 3);
  drawFinderPattern(modules, reserved, size - 4, 3);
  drawFinderPattern(modules, reserved, 3, size - 4);

  for (let i = 0; i < size; i += 1) {
    if (!reserved[6][i]) {
      setFunctionModule(modules, reserved, i, 6, i % 2 === 0);
    }
    if (!reserved[i][6]) {
      setFunctionModule(modules, reserved, 6, i, i % 2 === 0);
    }
  }

  const centers = alignmentPatternCenters[version];
  for (const row of centers) {
    for (const col of centers) {
      if (reserved[row][col]) continue;
      drawAlignmentPattern(modules, reserved, col, row);
    }
  }

  setFunctionModule(modules, reserved, 8, size - 8, true);
}

function drawFinderPattern(
  modules: (boolean | null)[][],
  reserved: boolean[][],
  centerX: number,
  centerY: number
): void {
  for (let y = -4; y <= 4; y += 1) {
    for (let x = -4; x <= 4; x += 1) {
      const distance = Math.max(Math.abs(x), Math.abs(y));
      const xx = centerX + x;
      const yy = centerY + y;

      if (xx < 0 || yy < 0 || xx >= modules.length || yy >= modules.length) {
        continue;
      }

      setFunctionModule(
        modules,
        reserved,
        xx,
        yy,
        distance !== 2 && distance !== 4
      );
    }
  }
}

function drawAlignmentPattern(
  modules: (boolean | null)[][],
  reserved: boolean[][],
  centerX: number,
  centerY: number
): void {
  for (let y = -2; y <= 2; y += 1) {
    for (let x = -2; x <= 2; x += 1) {
      const distance = Math.max(Math.abs(x), Math.abs(y));
      setFunctionModule(modules, reserved, centerX + x, centerY + y, distance !== 1);
    }
  }
}

function reserveFormatAreas(reserved: boolean[][]): void {
  const size = reserved.length;

  for (let i = 0; i <= 8; i += 1) {
    reserved[8][i] = true;
    reserved[i][8] = true;
    reserved[8][size - 1 - i] = true;
    reserved[size - 1 - i][8] = true;
  }
}

function setFunctionModule(
  modules: (boolean | null)[][],
  reserved: boolean[][],
  x: number,
  y: number,
  dark: boolean
): void {
  modules[y][x] = dark;
  reserved[y][x] = true;
}

function drawCodewords(
  modules: (boolean | null)[][],
  reserved: boolean[][],
  codewords: number[]
): void {
  const bits = codewords.flatMap((codeword) =>
    Array.from({ length: 8 }, (_, i) => (codeword >>> (7 - i)) & 1)
  );
  const size = modules.length;
  let bitIndex = 0;
  let upward = true;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;

    for (let vertical = 0; vertical < size; vertical += 1) {
      const y = upward ? size - 1 - vertical : vertical;

      for (let offset = 0; offset < 2; offset += 1) {
        const x = right - offset;
        if (reserved[y][x]) continue;

        modules[y][x] = bitIndex < bits.length && bits[bitIndex] === 1;
        bitIndex += 1;
      }
    }

    upward = !upward;
  }
}

function applyMask(modules: (boolean | null)[][], reserved: boolean[][]): void {
  for (let y = 0; y < modules.length; y += 1) {
    for (let x = 0; x < modules.length; x += 1) {
      if (reserved[y][x] || (x + y) % 2 !== 0) continue;
      modules[y][x] = !modules[y][x];
    }
  }
}

function drawFormatBits(
  modules: (boolean | null)[][],
  reserved: boolean[][]
): void {
  const size = modules.length;
  const formatBits = calculateFormatBits(1, 0);
  const set = (x: number, y: number, i: number) => {
    modules[y][x] = ((formatBits >>> i) & 1) === 1;
    reserved[y][x] = true;
  };

  for (let i = 0; i <= 5; i += 1) set(i, 8, i);
  set(7, 8, 6);
  set(8, 8, 7);
  set(8, 7, 8);
  for (let i = 9; i < 15; i += 1) set(8, 14 - i, i);

  for (let i = 0; i < 8; i += 1) set(size - 1 - i, 8, i);
  for (let i = 8; i < 15; i += 1) set(8, size - 15 + i, i);
  modules[size - 8][8] = true;
}

function calculateFormatBits(errorCorrectionLevel: number, mask: number): number {
  const data = (errorCorrectionLevel << 3) | mask;
  let bits = data << 10;

  for (let i = 14; i >= 10; i -= 1) {
    if (((bits >>> i) & 1) !== 0) {
      bits ^= 0x537 << (i - 10);
    }
  }

  return ((data << 10) | bits) ^ 0x5412;
}

function reedSolomonRemainder(data: number[], degree: number): number[] {
  const generator = reedSolomonGenerator(degree);
  const result = Array.from({ length: degree }, () => 0);

  for (const byte of data) {
    const first = result.shift();
    if (first === undefined) {
      throw new Error("Invalid Reed-Solomon degree");
    }
    const factor = byte ^ first;
    result.push(0);

    for (let i = 0; i < generator.length; i += 1) {
      result[i] ^= multiplyFiniteField(generator[i], factor);
    }
  }

  return result;
}

function reedSolomonGenerator(degree: number): number[] {
  const coefficients: number[] = Array.from({ length: degree }, (_, i) =>
    i === degree - 1 ? 1 : 0
  );
  let root = 1;

  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < coefficients.length; j += 1) {
      coefficients[j] = multiplyFiniteField(coefficients[j], root);
      if (j + 1 < coefficients.length) {
        coefficients[j] ^= coefficients[j + 1];
      }
    }
    root = multiplyFiniteField(root, 2);
  }

  return coefficients;
}

function multiplyFiniteField(a: number, b: number): number {
  let result = 0;

  for (let i = 7; i >= 0; i -= 1) {
    result = (result << 1) ^ ((result >>> 7) * 0x11d);
    result ^= ((b >>> i) & 1) * a;
  }

  return result & 0xff;
}
