"use strict";
/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = exports.details = void 0;
var fileUtils_1 = require("../../../../FlowHelpers/1.0.0/fileUtils");
/* eslint-disable no-param-reassign */
var details = function () { return ({
    name: 'Extract Subtitles',
    description: "\n  Extract all matching subtitle streams in their native format.\n  \n  ASS subtitles are saved as .ass files, SUBRIP as .srt, image-based as .sup, etc.\n  DVB Teletext subtitles are converted to .srt (they have no sane native container).\n  \n  For each language, if no SRT format exists, an SRT will be automatically generated\n  by converting the \"best\" available text-based subtitle (preferring tracks that\n  aren't forced/default and don't look like signs/songs/commentary tracks) to ensure\n  SRT availability.\n  \n  Image-based subtitles (DVD, PGS) and all text-based formats are supported.\n  Other streams (video, audio) are left untouched for other plugins to handle.\n  ",
    style: {
        borderColor: '#6efefc',
    },
    tags: 'video',
    isStartPlugin: false,
    pType: '',
    requiresVersion: '2.11.01',
    sidebarPosition: -1,
    icon: '',
    inputs: [
        {
            label: 'Subtitle languages',
            name: 'subtitle_languages',
            type: 'string',
            defaultValue: 'eng',
            inputUI: {
                type: 'text',
            },
            tooltip: 'Specify subtitle languages to keep using comma seperated list e.g. eng,hun. Leave blank to extract all',
        },
        {
            label: 'Subtitle output directory',
            name: 'output_directory',
            type: 'string',
            defaultValue: '',
            inputUI: {
                type: 'text',
            },
            tooltip: 'Directory to save extracted subtitles. Leave empty to save in root work directory.',
        },
    ],
    outputs: [
        {
            number: 1,
            tooltip: 'Continue to next plugin',
        },
    ],
}); };
exports.details = details;
var getOutputStreamIndex = function (streams, stream) {
    var index = -1;
    for (var idx = 0; idx < streams.length; idx += 1) {
        if (!streams[idx].removed) {
            index += 1;
        }
        if (streams[idx].index === stream.index) {
            break;
        }
    }
    return index;
};
/**
 * Map subtitle language to output file extension based on codec
 */
var getSubtitleExtension = function (codecName) {
    var normalized = codecName.toLowerCase();
    if (normalized === 'ass' || normalized === 'ssa') {
        return 'ass';
    }
    if (normalized === 'subrip' || normalized === 'srt') {
        return 'srt';
    }
    if (normalized === 'webvtt') {
        return 'vtt';
    }
    if (normalized === 'mov_text') {
        return 'srt'; // mov_text is typically used for MP4 SRT
    }
    if (normalized === 'hdmv_pgs_subtitle' || normalized === 'pgs') {
        return 'sup';
    }
    if (normalized === 'dvb_teletext') {
        // Teletext has no meaningful native container of its own - there's nothing
        // sane to "copy" it into, so we always decode it straight to SRT (see the
        // '-c:s srt' special-case below where this stream is actually extracted).
        return 'srt';
    }
    throw new Error("Garbage subtitle format got passed to getSubtitleExtension for some reason, you probably goofed with the pre-filters: " + normalized);
};
/**
 * Determine if a codec is text-based (can be converted)
 */
var isTextBasedSubtitle = function (codecName) {
    var normalized = codecName.toLowerCase();
    return (normalized === 'ass'
        || normalized === 'ssa'
        || normalized === 'subrip'
        || normalized === 'srt'
        || normalized === 'webvtt'
        || normalized === 'mov_text'
        || normalized === 'dvb_teletext' // Requires libzvbi, present in the default `apt install ffmpeg` build
    );
};
/**
 * Determine if a codec is image-based (cannot be easily converted)
 */
var isImageBasedSubtitle = function (codecName) {
    var normalized = codecName.toLowerCase();
    return (normalized === 'hdmv_pgs_subtitle'
        || normalized === 'pgs');
};
// const isGarbageButShouldKeep = (codecName: string): boolean => {
//   const normalized = codecName.toLowerCase();
//   return (
//     normalized == "dvb_subtitle"
//     || normalized == "dvd_subtitle"
//   )
// }
/**
 * Score how "normal" a subtitle track looks based on its title metadata.
 * Higher is more likely to be a plain, primary dialogue track. This is only
 * ever used to pick a fallback conversion source among several candidates
 * of otherwise-equal standing - it has no bearing on which tracks get
 * extracted (all eligible tracks always get extracted regardless of score).
 */
var normalityScore = function (title) {
    var t = title.toLowerCase();
    var score = 0;
    if (t.includes('sign'))
        score -= 10;
    if (t.includes('commentary'))
        score -= 10;
    if (t.includes('karaoke') || t.includes('song'))
        score -= 5;
    if (t.trim() === '')
        score += 1;
    return score;
};
/**
 * Rank candidate tracks for the SRT fallback conversion. Lower is better.
 * Prefers non-default/non-forced tracks first (a plain, unflagged dialogue
 * track is the safest bet for "the" subtitle), then the normality score
 * (deprioritizing signs/commentary/karaoke-looking tracks), then falls back
 * to original stream order for a stable tie-break when no heuristic applies.
 */
var fallbackRank = function (sub) {
    var _a;
    // eslint-disable-next-line no-prototype-builtins
    var disposition = sub.stream.hasOwnProperty('disposition') ? sub.stream.disposition : {};
    var isDefault = (disposition === null || disposition === void 0 ? void 0 : disposition.default) === 1;
    var isForced = (disposition === null || disposition === void 0 ? void 0 : disposition.forced) === 1;
    var dispositionPenalty = (isDefault ? 1 : 0) + (isForced ? 1 : 0);
    var title = ((_a = sub.stream.tags) === null || _a === void 0 ? void 0 : _a.title) || '';
    return [dispositionPenalty, -normalityScore(title), sub.stream.index];
};
var pickBestFallbackCandidate = function (candidates) {
    var sorted = __spreadArray([], candidates, true).sort(function (a, b) {
        var rankA = fallbackRank(a);
        var rankB = fallbackRank(b);
        for (var i = 0; i < rankA.length; i += 1) {
            if (rankA[i] !== rankB[i]) {
                return rankA[i] - rankB[i];
            }
        }
        return 0;
    });
    return sorted[0];
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
var plugin = function (args) {
    var lib = require('../../../../../methods/lib')();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
    args.inputs = lib.loadDefaultValues(args.inputs, details);
    var subtitle_languages = String(args.inputs.subtitle_languages).trim().split(',');
    var output_dir_input = String(args.inputs.output_directory).trim();
    var workDir = (0, fileUtils_1.getFileAbsoluteDir)(args.workDir);
    var subs_dir = output_dir_input ? "".concat(workDir, "/").concat(output_dir_input) : workDir;
    args.variables.ffmpegCommand.shouldProcess = true;
    var streams = args.variables.ffmpegCommand.streams;
    // Track extracted subtitles for next plugin
    if (!args.variables.extractedSubtitles) {
        args.variables.extractedSubtitles = [];
    }
    var extractedSubs = [];
    var textBasedCandidates = [];
    var hasSrtSubtitle = false;
    // Process subtitle streams: extract natively
    streams.forEach(function (stream) {
        var _a;
        if (stream.codec_type === 'subtitle') {
            var index = getOutputStreamIndex(streams, stream);
            var lang = ((_a = stream.tags) === null || _a === void 0 ? void 0 : _a.language) ? stream.tags.language : 'und';
            var format = stream.codec_name.toLowerCase();
            // Add disposition flags to language identifier
            // eslint-disable-next-line no-prototype-builtins
            if (stream.hasOwnProperty('disposition')) {
                var def = stream.disposition.default === 1 ? '.default' : '';
                var forced = stream.disposition.forced === 1 ? '.forced' : '';
                var sdh = stream.disposition.hearing_impaired === 1 ? '.sdh' : '';
                lang = "".concat(lang).concat(def).concat(forced).concat(sdh);
            }
            // Filter by language
            var baseLang = lang.split('.')[0]; // Get language without disposition flags
            if (subtitle_languages.length !== 0 && !subtitle_languages.includes(baseLang)) {
                stream.removed = true;
            }
            else if (!isTextBasedSubtitle(format) && !isImageBasedSubtitle(format)) {
                // Remove unsupported subtitle formats
                stream.removed = true;
            }
            else {
                // Extract subtitle in native format
                args.deps.fsextra.ensureDirSync(subs_dir);
                var ext = getSubtitleExtension(format);
                var tempDest = "".concat(subs_dir, "/").concat(args.originalLibraryFile.fileNameWithoutExtension, ".").concat(index, ".").concat(lang, ".").concat(ext);
                args.jobLog('Extracting Subtitle stream to ' + tempDest);
                // DVB Teletext has no native container worth copying - there's no
                // sane muxer for a raw teletext bitstream into an .srt file, so it
                // must always be decoded straight to SRT (requires libzvbi).
                var subtitleCodecArg = format === 'dvb_teletext' ? 'srt' : 'copy';
                stream.outputArgs.push('-c:s');
                stream.outputArgs.push(subtitleCodecArg);
                stream.outputArgs.push(tempDest);
                stream.extraExport = true;
                var extractedSubtitle = {
                    tempPath: tempDest,
                    lang: lang,
                    ext: ext,
                    format: format,
                    stream: stream,
                };
                extractedSubs.push(extractedSubtitle);
                if (isTextBasedSubtitle(format)) {
                    textBasedCandidates.push(extractedSubtitle);
                }
                if (ext === 'srt') {
                    hasSrtSubtitle = true;
                }
            }
        }
        else {
            // Don't touch non-subtitle streams - leave for other plugins
            // (video, audio, data streams are untouched)
        }
    });
    if (!hasSrtSubtitle && textBasedCandidates.length > 0) {
        var fallbackSubtitle = pickBestFallbackCandidate(textBasedCandidates);
        var fallbackStream = fallbackSubtitle.stream;
        var index = getOutputStreamIndex(streams, fallbackStream);
        var srtTempDest = "".concat(subs_dir, "/").concat(args.originalLibraryFile.fileNameWithoutExtension, ".").concat(index, ".").concat(fallbackSubtitle.lang, ".srt");
        args.jobLog('Extracting fallback Subtitle stream to ' + srtTempDest);
        fallbackStream.outputArgs.push('-map');
        fallbackStream.outputArgs.push("0:".concat(fallbackSubtitle.stream.index));
        fallbackStream.outputArgs.push('-c:s');
        fallbackStream.outputArgs.push('text');
        fallbackStream.outputArgs.push(srtTempDest);
        fallbackStream.extraExport = true;
        extractedSubs.push({
            tempPath: srtTempDest,
            lang: fallbackSubtitle.lang,
            ext: 'srt',
            format: fallbackSubtitle.format,
            stream: fallbackSubtitle.stream,
        });
    }
    // Store extracted subtitle metadata for ImportExtractedSubtitles plugin
    args.variables.extractedSubtitles = extractedSubs;
    args.variables.extractedSubtitlesSourceDir = workDir;
    return {
        outputFileObj: args.inputFileObj,
        outputNumber: 1,
        variables: args.variables,
    };
};
exports.plugin = plugin;
