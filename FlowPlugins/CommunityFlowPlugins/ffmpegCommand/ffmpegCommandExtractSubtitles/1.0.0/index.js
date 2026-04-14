"use strict";
/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = exports.details = void 0;
var fileUtils_1 = require("../../../../FlowHelpers/1.0.0/fileUtils");
/* eslint-disable no-param-reassign */
var details = function () { return ({
    name: 'Extract Subtitles',
    description: "\n  Extract all matching subtitle streams in their native format.\n  \n  ASS subtitles are saved as .ass files, SUBRIP as .srt, image-based as .sup, etc.\n  \n  For each language, if no SRT format exists, an SRT will be automatically generated\n  by converting ASS subtitles (if available) to ensure SRT availability.\n  \n  Image-based subtitles (DVD, PGS) and all text-based formats are supported.\n  Other streams (video, audio) are left untouched for other plugins to handle.\n  ",
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
        || normalized === 'dvb_teletext' // Not sure if ffmpeg will require extra "-scodec srt" arg for this case. I know it requires libzvbi, should be present in `apt install ffmpeg`
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
var isGarbageButShouldKeep = function (codecName) {
    var normalized = codecName.toLowerCase();
    return (normalized == "dvb_subtitle"
        || normalized == "dvd_subtitle");
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
var plugin = function (args) {
    var lib = require('../../../../../methods/lib')();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
    args.inputs = lib.loadDefaultValues(args.inputs, details);
    var subtitle_languages = String(args.inputs.subtitle_languages).trim().split(',');
    var output_dir_input = String(args.inputs.output_directory).trim();
    var origDir = (0, fileUtils_1.getFileAbsoluteDir)(args.originalLibraryFile._id);
    var subs_dir = output_dir_input ? "".concat(origDir, "/").concat(output_dir_input) : origDir;
    args.variables.ffmpegCommand.shouldProcess = true;
    var streams = args.variables.ffmpegCommand.streams;
    // Track extracted subtitles for next plugin
    if (!args.variables.extractedSubtitles) {
        args.variables.extractedSubtitles = [];
    }
    var extractedSubs = [];
    streams.forEach(function (stream) {
        var _a;
        if (stream.codec_type === 'subtitle') {
            var lang = ((_a = stream.tags) === null || _a === void 0 ? void 0 : _a.language) ? stream.tags.language : 'und';
            // Add supported flags to language identifier
            // eslint-disable-next-line no-prototype-builtins
            if (stream.hasOwnProperty('disposition')) {
                var def = stream.disposition.default === 1 ? '.default' : '';
                var forced = stream.disposition.forced === 1 ? '.forced' : '';
                var sdh = stream.disposition.hearing_impaired === 1 ? '.sdh' : '';
                lang = "".concat(lang).concat(def).concat(forced).concat(sdh);
            }
        }
    });
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
            else if (isGarbageButShouldKeep(format)) {
                // These are bad but better than nothing. There is no valid standalone file format
                // for dvd subs (because they are bad). Not exporting anything will cause Bazarr
                // to pick this up... which is good behavior, we like that
                // Did I mention these are bad
                stream.removed = false;
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
                stream.outputArgs.push('-c:s');
                stream.outputArgs.push('copy');
                stream.outputArgs.push(tempDest);
                stream.extraExport = true;
                extractedSubs.push({
                    tempPath: tempDest,
                    lang: lang,
                    ext: ext,
                    format: format,
                });
            }
        }
        else {
            // Don't touch non-subtitle streams - leave for other plugins
            // (video, audio, data streams are untouched)
        }
    });
    // Store extracted subtitle metadata for ImportExtractedSubtitles plugin
    args.variables.extractedSubtitles = extractedSubs;
    args.variables.extractedSubtitlesSourceDir = origDir;
    return {
        outputFileObj: args.inputFileObj,
        outputNumber: 1,
        variables: args.variables,
    };
};
exports.plugin = plugin;
