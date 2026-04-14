
module.exports = async (args) => {

// Lookup nominal bitrate by first video stream height, then store a precalculated 4x limit.
const videoStream = (args.inputFileObj?.ffProbeData?.streams || []).find(
    (s) => s.codec_type === 'video'
);

if (!videoStream) {
    throw new Error('No video stream found in ffProbeData.streams');
}

const height = Number(videoStream.height || 0);

// Basic HDR detection (for 4k HDR override)
const mediaInfoVideoTrack = (args.inputFileObj?.mediaInfo?.track || []).find(
    (t) => (t['@type'] || '').toLowerCase() === 'video'
);

const hdrHint = [
    videoStream.color_transfer,
    videoStream.color_primaries,
    mediaInfoVideoTrack?.HDR_Format,
    mediaInfoVideoTrack?.HDR_Format_String,
]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const isHdr =
    hdrHint.includes('smpte2084') ||
    hdrHint.includes('pq') ||
    hdrHint.includes('hlg') ||
    hdrHint.includes('hdr');

// Nominal bitrates in kbps (not multiplied)
const nominalByHeight = [
    { h: 480, kbps: 1250 },
    { h: 576, kbps: 1400 },
    { h: 720, kbps: 2000 },
    { h: 1080, kbps: 2500 },
    { h: 1440, kbps: 3800 },
    { h: 2160, kbps: 10000 }, // 4k
];

let selected = nominalByHeight[0]; // fallback to lowest
for (const sp of nominalByHeight) {
    if (height >= sp.h) selected = sp;
}

// 4k HDR override
if (height >= 2160 && isHdr) {
    selected = { h: 2160, kbps: 12500 }; // bitrate_4k_hdr
}

const nominalBitrate4xKbps = selected.kbps * 4;
const nominalBitrate8xKbps = selected.kbps * 8;

// Set flow variables for downstream steps
args.variables = args.variables || {};
args.variables.nominalBitrateKbps = selected.kbps; // nominal bitrate in kbps
args.variables.maxBitrate4x = `${nominalBitrate4xKbps}k`;    // ffmpeg-style string
args.variables.maxBitrate8x = `${nominalBitrate8xKbps}k`;    // ffmpeg-style string

console.log(
    `lookupMaxBitrate: height=${height}, hdr=${isHdr}, nominal=${selected.kbps}k, max4x=${nominalBitrate4xKbps}k`
);



// do something here

  return {
    outputFileObj: args.inputFileObj,
    outputNumber: 1,
    variables: args.variables,
  };
}
      