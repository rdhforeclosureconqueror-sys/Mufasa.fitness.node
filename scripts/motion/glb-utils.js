"use strict";
const fs = require("node:fs");

function parseGlb(input) {
  const data = Buffer.isBuffer(input) ? input : fs.readFileSync(input);
  if (data.toString("ascii", 0, 4) !== "glTF" || data.readUInt32LE(4) !== 2) throw new Error("expected GLB 2");
  const jsonLength = data.readUInt32LE(12);
  if (data.toString("ascii", 16, 20) !== "JSON") throw new Error("missing GLB JSON chunk");
  const json = JSON.parse(data.toString("utf8", 20, 20 + jsonLength).trim());
  const binaryHeader = 20 + jsonLength;
  const binary = binaryHeader < data.length && data.toString("ascii", binaryHeader + 4, binaryHeader + 8) === "BIN\0"
    ? data.subarray(binaryHeader + 8, binaryHeader + 8 + data.readUInt32LE(binaryHeader)) : Buffer.alloc(0);
  return { data, json, binary };
}

function encodeGlb(json, binary) {
  const rawJson = Buffer.from(JSON.stringify(json));
  const jsonPadding = (4 - rawJson.length % 4) % 4;
  const jsonChunk = Buffer.concat([rawJson, Buffer.alloc(jsonPadding, 0x20)]);
  const binPadding = (4 - binary.length % 4) % 4;
  const binChunk = Buffer.concat([binary, Buffer.alloc(binPadding)]);
  const output = Buffer.alloc(12 + 8 + jsonChunk.length + 8 + binChunk.length);
  output.write("glTF", 0); output.writeUInt32LE(2, 4); output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(jsonChunk.length, 12); output.write("JSON", 16); jsonChunk.copy(output, 20);
  const offset = 20 + jsonChunk.length;
  output.writeUInt32LE(binChunk.length, offset); output.write("BIN\0", offset + 4); binChunk.copy(output, offset + 8);
  return output;
}

module.exports = { parseGlb, encodeGlb };
