"use strict";
/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = exports.details = void 0;
/* eslint-disable no-param-reassign */
var details = function () { return ({
    name: 'Import Extracted Subtitles',
    description: "\n  Import subtitles extracted by the Extract Subtitles plugin.\n  \n  Renames extracted subtitles to Plex-standard naming format.\n  Handles multiple subtitles with the same language/disposition by adding indices.\n  \n  First occurrence: filename.lang.ext\n  Second occurrence: filename.lang.1.ext\n  Third occurrence: filename.lang.2.ext\n  etc.\n  ",
    style: {
        borderColor: 'green',
    },
    tags: 'video',
    isStartPlugin: false,
    pType: '',
    requiresVersion: '2.11.01',
    sidebarPosition: -1,
    icon: '',
    inputs: [],
    outputs: [
        {
            number: 1,
            tooltip: 'Continue to next plugin',
        },
    ],
}); };
exports.details = details;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
var plugin = function (args) {
    var extractedSubs = args.variables.extractedSubtitles || [];
    var sourceDir = args.variables.extractedSubtitlesSourceDir;
    var fileNameBase = args.inputFileObj.fileNameWithoutExtension;
    var targetDir = args.inputFileObj.meta.Directory;
    if (!sourceDir || !fileNameBase || extractedSubs.length === 0) {
        args.jobLog("Found no extracted subtitles in args.variables! This might be because the video didn't contain any.");
        args.jobLog("If you expected subtitles here, make sure ExtractSubtitles, the ffmpeg command, is run before this plugin");
        args.jobLog("Extracted Subs: " + JSON.stringify(args.variables.extractedSubtitles));
        args.jobLog("Source Dir: " + args.variables.extractedSubtitlesSourceDir);
        // No subtitles extracted, skip
        return {
            outputFileObj: args.inputFileObj,
            outputNumber: 1,
            variables: args.variables,
        };
    }
    // Track language+disposition counts for handling duplicates
    var langDispositionCount = new Map();
    extractedSubs.forEach(function (sub) {
        var tempPath = sub.tempPath, lang = sub.lang, ext = sub.ext;
        // Get the base language (without disposition flags)
        var baseLang = lang.split('.')[0];
        var dispositionPart = lang.substring(baseLang.length); // e.g., ".default", ".forced.sdh", etc.
        // Create the language+disposition key
        var langKey = lang;
        // Track how many of this language+disposition combo we've seen
        var count = (langDispositionCount.get(langKey) || 0) + 1;
        langDispositionCount.set(langKey, count);
        // Build the Plex-standard filename
        var finalFileName;
        if (count === 1) {
            // First one gets normal naming
            finalFileName = "".concat(fileNameBase, ".").concat(lang, ".").concat(ext);
        }
        else {
            // Subsequent ones get an index: filename.lang.1.ext, filename.lang.2.ext, etc.
            finalFileName = "".concat(fileNameBase, ".").concat(lang, ".").concat(count - 1, ".").concat(ext);
        }
        var finalPath = "".concat(targetDir, "/").concat(finalFileName);
        // Move file from temp location to final location
        try {
            args.deps.fsextra.moveSync(tempPath, finalPath, { overwrite: true });
            args.jobLog("Imported subtitle: ".concat(finalFileName));
        }
        catch (error) {
            args.jobLog("Error importing subtitle from ".concat(tempPath, " to ").concat(finalPath, ": ").concat(error), 'error');
        }
    });
    // Clear the extracted subtitles tracking
    args.variables.extractedSubtitles = [];
    args.variables.extractedSubtitlesSourceDir = undefined;
    args.variables.extractedSubtitlesFileNameBase = undefined;
    return {
        outputFileObj: args.inputFileObj,
        outputNumber: 1,
        variables: args.variables,
    };
};
exports.plugin = plugin;
