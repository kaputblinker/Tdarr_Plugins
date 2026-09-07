"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = exports.details = void 0;
var fileUtils_1 = require("../../../../FlowHelpers/1.0.0/fileUtils");
/* eslint no-plusplus: [{"error", { "allowForLoopAfterthoughts": true }}] */
var details = function () { return ({
    name: 'ab-av1 CRF Search',
    description: 'Run ab-av1 crf-search and export the chosen CRF, VMAF, predicted size, and predicted ratio.',
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
            label: 'Min VMAF',
            name: 'minVmaf',
            type: 'number',
            defaultValue: '',
            inputUI: {
                type: 'text',
            },
            tooltip: 'Desired minimum VMAF score. Leave blank to use ab-av1 defaults.',
        },
        {
            label: 'Min CRF',
            name: 'minCrf',
            type: 'number',
            defaultValue: '',
            inputUI: {
                type: 'text',
            },
            tooltip: 'Desired minimum CRF value. Leave blank to use ab-av1 defaults.',
        },
        {
            label: 'Max CRF',
            name: 'maxCrf',
            type: 'number',
            defaultValue: '',
            inputUI: {
                type: 'text',
            },
            tooltip: 'Desired maximum CRF value. Leave blank to use ab-av1 defaults.',
        },
        {
            label: 'Samples',
            name: 'samples',
            type: 'number',
            defaultValue: '',
            inputUI: {
                type: 'text',
            },
            tooltip: 'Number of samples to take across the input. Leave blank to use ab-av1 logic (like the default or the result of sample-every).',
        },
        {
            label: 'Sample Every',
            name: 'sampleEvery',
            type: 'string',
            defaultValue: '',
            inputUI: {
                type: 'text',
            },
            tooltip: 'Sample spacing, for example 12m. Leave blank to omit.',
        },
        {
            label: 'Min Samples',
            name: 'minSamples',
            type: 'number',
            defaultValue: '',
            inputUI: {
                type: 'text',
            },
            tooltip: 'Minimum number of samples to use. Leave blank to omit.',
        },
        {
            label: 'Sample Duration',
            name: 'sampleDuration',
            type: 'string',
            defaultValue: '',
            inputUI: {
                type: 'text',
            },
            tooltip: 'Duration of each sample, for example 20s. Leave blank to omit (default is 20s I think).',
        },
        {
            label: 'Encoder',
            name: 'encoder',
            type: 'string',
            defaultValue: '',
            inputUI: {
                type: 'text',
            },
            tooltip: 'Encoder override such as libsvtav1 or libx265. Leave blank to use ab-av1 defaults.',
        },
        {
            label: 'Encoder Arguments',
            name: 'encoderArguments',
            type: 'string',
            defaultValue: '',
            inputUI: {
                type: 'textarea',
            },
            tooltip: 'Additional ffmpeg encoder arguments, repeated as --enc entries. Leave blank to omit.',
        },
        {
            label: 'Encoder Input Arguments',
            name: 'encoderInputArguments',
            type: 'string',
            defaultValue: '',
            inputUI: {
                type: 'textarea',
            },
            tooltip: 'Additional ffmpeg input arguments, repeated as --enc-input entries. Leave blank to omit.',
        },
        {
            label: 'Preset',
            name: 'preset',
            type: 'string',
            defaultValue: '',
            inputUI: {
                type: 'text',
            },
            tooltip: 'Encoder preset. Leave blank to omit.',
        },
        {
            label: 'Max Encoded Percent',
            name: 'maxEncodedPercent',
            type: 'string',
            defaultValue: '75',
            inputUI: {
                type: 'text',
            },
            tooltip: 'Max encoded percent (0-100), ratio of original. Ab-av1 crf search will fail if the predicted encoded size exceeds this percent ratio. Default is 75.',
        },
        {
            label: 'Temp Dir',
            name: 'tempDir',
            type: 'string',
            defaultValue: '',
            inputUI: {
                type: 'directory',
            },
            tooltip: 'Directory for ab-av1 temporary files. Defaults to a unique Tdarr work directory when left blank.',
        },
        {
            label: 'Additional Arguments',
            name: 'additionalArguments',
            type: 'string',
            defaultValue: '',
            inputUI: {
                type: 'textarea',
            },
            tooltip: 'Catch-all extra arguments appended to the ab-av1 command. Leave blank to omit.',
        },
    ],
    outputs: [
        {
            number: 1,
            tooltip: 'Ab-av1 CRF search completed successfully. The chosen CRF, VMAF, predicted size, and predicted ratio are stored in user variables.',
        },
        {
            number: 2,
            tooltip: 'Ab-av1 CRF search succeeded, but did not find a suitable CRF value.',
        },
    ],
}); };
exports.details = details;
var parseNumericString = function (value) { return String(value !== null && value !== void 0 ? value : '').trim(); };
var appendFlagValue = function (jobLog, cliArgs, flag, value) {
    if (value && String(value).trim() !== '') {
        jobLog("Appending flag ".concat(flag, " with value ").concat(String(value).trim(), " to CLI arguments"));
        var normalized = parseNumericString(value);
        cliArgs.push(flag, normalized);
    }
    else {
        jobLog("Skipping flag ".concat(flag, " because value is empty or blank"));
    }
};
var appendRepeatedFlagValues = function (jobLog, cliArgs, flag, value, parseArgsStringToArgv) {
    var normalized = String(value !== null && value !== void 0 ? value : '').trim();
    if (!normalized) {
        return;
    }
    var parsedValues = parseArgsStringToArgv(normalized, '', '');
    parsedValues.forEach(function (parsedValue) {
        if (parsedValue.trim()) {
            cliArgs.push(flag, parsedValue.trim());
            jobLog("Appending repeated flag ".concat(flag, " with value ").concat(parsedValue.trim(), " to CLI arguments"));
        }
        else {
            jobLog("Skipping repeated flag ".concat(flag, " because parsed value is empty or blank"));
        }
    });
};
var parseSearchResult = function (output) {
    var summaryPatterns = [
        /crf\s+([\d.]+)\s+VMAF\s+([\d.]+)\s+predicted\s+(?:video\s+stream|full\s+encode)?\s*size\s+(.+?)\s+\(([\d.]+)%\)/i,
        /crf\s+([\d.]+)\s+VMAF\s+([\d.]+)\s+predicted\s+size\s+(.+?)\s+\(([\d.]+)%\)/i,
    ];
    for (var i = summaryPatterns.length - 1; i >= 0; i -= 1) {
        var match = output.match(summaryPatterns[i]);
        if (match && match.length >= 5) {
            return {
                crf: match[1].trim(),
                vmaf: match[2].trim(),
                predictedSize: match[3].trim(),
                predictedRatio: "".concat(match[4].trim(), "%"),
            };
        }
    }
    return null;
};
var formatEta = function (totalSeconds) {
    var safeSeconds = Math.max(0, Math.round(totalSeconds));
    var hours = Math.floor(safeSeconds / 3600);
    var minutes = Math.floor((safeSeconds % 3600) / 60);
    var seconds = safeSeconds % 60;
    var pad2 = function (value) { return (value < 10 ? "0".concat(value) : String(value)); };
    return "".concat(hours, ":").concat(pad2(minutes), ":").concat(pad2(seconds));
};
var parseEtaToSeconds = function (etaText) {
    var normalized = etaText.trim().toLowerCase();
    if (!normalized) {
        return null;
    }
    var totalSeconds = 0;
    var matched = false;
    var regex = /(\d+(?:\.\d+)?)\s*(ms|s|m|h)/g;
    var match;
    while ((match = regex.exec(normalized)) !== null) {
        matched = true;
        var amount = Number(match[1]);
        var unit = match[2];
        if (unit === 'ms') {
            totalSeconds += amount / 1000;
        }
        else if (unit === 's') {
            totalSeconds += amount;
        }
        else if (unit === 'm') {
            totalSeconds += amount * 60;
        }
        else if (unit === 'h') {
            totalSeconds += amount * 3600;
        }
    }
    return matched ? totalSeconds : null;
};
var stripAnsiEscapeCodes = function (text) { return text.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, ''); };
var assumeSearchCycles = 5;
var createProgressTracker = function () { return ({
    currentCrf: null,
    completedCycles: 0,
    totalCycles: assumeSearchCycles,
    sampleIndex: 0,
    sampleTotal: 0,
    phase: 'sample',
    startedAtMs: Date.now(),
    lastPercentage: -1,
    lastEta: '',
}); };
var normalizeProgressLine = function (line) { return line
    .replace(/^\s*(?:tdarr_node\s*\|\s*)?/i, '')
    .replace(/^\s*ab-av1\s+(?:stdout|stderr):\s*/i, '')
    .trim(); };
var parseProgressLine = function (line) {
    var normalized = normalizeProgressLine(stripAnsiEscapeCodes(line));
    var sampleMatch = normalized.match(/(?:encoding\s+)?sample\s+(\d+)\/(\d+)\s+crf\s+([\d.]+)/i);
    if (sampleMatch) {
        return {
            crf: sampleMatch[3].trim(),
            sampleIndex: Number(sampleMatch[1]),
            sampleTotal: Number(sampleMatch[2]),
        };
    }
    if (/\bvmaf\b/i.test(normalized) && /crf\s+[\d.]+/i.test(normalized)
        && /(start|starting|calculate|calculating|score|search)/i.test(normalized)) {
        var crfMatch = normalized.match(/crf\s+([\d.]+)/i);
        if (crfMatch) {
            return {
                crf: crfMatch[1].trim(),
                isVmafStart: true,
            };
        }
    }
    return null;
};
var calculateProgressPercentage = function (tracker) {
    var cycleWidth = 100 / tracker.totalCycles;
    var sampleProgress = tracker.sampleTotal > 0
        ? Math.max(0, Math.min(1, tracker.sampleIndex / tracker.sampleTotal)) * 0.5
        : 0;
    var phaseProgress = tracker.phase === 'vmaf' ? 0.5 : sampleProgress;
    return Math.max(0, Math.min(100, (tracker.completedCycles + phaseProgress) * cycleWidth));
};
var estimateEtaFromProgress = function (progress, startedAtMs) {
    if (progress <= 0 || progress >= 100) {
        return null;
    }
    var elapsedSeconds = (Date.now() - startedAtMs) / 1000;
    if (elapsedSeconds <= 0) {
        return formatEta(0);
    }
    return formatEta((elapsedSeconds * (100 - progress)) / progress);
};
var updateProgressFromLine = function (line, updateWorker, tracker) {
    var progressLine = parseProgressLine(line);
    if (!progressLine) {
        return false;
    }
    var cycleCompleted = false;
    if (tracker.currentCrf !== progressLine.crf) {
        if (tracker.currentCrf !== null) {
            tracker.completedCycles += 1;
            tracker.totalCycles = Math.max(tracker.completedCycles + 1, assumeSearchCycles);
            cycleCompleted = true;
        }
        tracker.currentCrf = progressLine.crf;
        tracker.phase = 'sample';
        tracker.sampleIndex = 0;
        tracker.sampleTotal = 0;
    }
    if (typeof progressLine.sampleIndex === 'number' && typeof progressLine.sampleTotal === 'number') {
        tracker.phase = 'sample';
        tracker.sampleIndex = progressLine.sampleIndex;
        tracker.sampleTotal = progressLine.sampleTotal;
    }
    else if (progressLine.isVmafStart) {
        tracker.phase = 'vmaf';
    }
    var percentage = calculateProgressPercentage(tracker);
    var eta = estimateEtaFromProgress(percentage, tracker.startedAtMs);
    if (eta !== null && eta !== tracker.lastEta) {
        tracker.lastEta = eta;
        updateWorker({ ETA: eta });
    }
    if (percentage !== tracker.lastPercentage) {
        tracker.lastPercentage = percentage;
        updateWorker({ percentage: percentage });
    }
    console.log("ab-av1 Updated progress: ".concat(percentage.toFixed(2), "%, ETA: ").concat(tracker.lastEta));
    return cycleCompleted;
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
var plugin = function (args) { return __awaiter(void 0, void 0, void 0, function () {
    var lib, childProcess, parseArgsStringToArgv, cliArgs, tempDirInput, tempDir, additionalArguments, spawnResult, failureMatch, msg, parsedResult, msg;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                lib = require('../../../../../methods/lib')();
                // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
                args.inputs = lib.loadDefaultValues(args.inputs, details);
                childProcess = require('child_process');
                parseArgsStringToArgv = args.deps.parseArgsStringToArgv;
                cliArgs = ['crf-search'];
                cliArgs.push('--input', args.inputFileObj._id);
                appendFlagValue(args.jobLog, cliArgs, '--min-vmaf', args.inputs.minVmaf);
                appendFlagValue(args.jobLog, cliArgs, '--min-crf', args.inputs.minCrf);
                appendFlagValue(args.jobLog, cliArgs, '--max-crf', args.inputs.maxCrf);
                appendFlagValue(args.jobLog, cliArgs, '--samples', args.inputs.samples);
                appendFlagValue(args.jobLog, cliArgs, '--sample-every', args.inputs.sampleEvery);
                appendFlagValue(args.jobLog, cliArgs, '--min-samples', args.inputs.minSamples);
                appendFlagValue(args.jobLog, cliArgs, '--sample-duration', args.inputs.sampleDuration);
                appendFlagValue(args.jobLog, cliArgs, '-e', args.inputs.encoder);
                appendFlagValue(args.jobLog, cliArgs, '--preset', args.inputs.preset);
                appendFlagValue(args.jobLog, cliArgs, '--max-encoded-percent', args.inputs.maxEncodedPercent);
                appendRepeatedFlagValues(args.jobLog, cliArgs, '--enc', args.inputs.encoderArguments, parseArgsStringToArgv);
                appendRepeatedFlagValues(args.jobLog, cliArgs, '--enc-input', args.inputs.encoderInputArguments, parseArgsStringToArgv);
                tempDirInput = String((_a = args.inputs.tempDir) !== null && _a !== void 0 ? _a : '').trim();
                tempDir = tempDirInput
                    ? (tempDirInput.startsWith('/') ? tempDirInput : "".concat(args.workDir, "/").concat(tempDirInput))
                    : (0, fileUtils_1.getPluginWorkDir)(args);
                args.deps.fsextra.ensureDirSync(tempDir);
                cliArgs.push('--temp-dir', tempDir);
                additionalArguments = String((_b = args.inputs.additionalArguments) !== null && _b !== void 0 ? _b : '').trim();
                if (additionalArguments) {
                    cliArgs.push.apply(cliArgs, parseArgsStringToArgv(additionalArguments, '', ''));
                }
                args.updateWorker({
                    CLIType: 'ab-av1',
                    preset: cliArgs.join(' '),
                });
                args.jobLog("Running ab-av1 ".concat(cliArgs.join(' ')));
                return [4 /*yield*/, new Promise(function (resolve) {
                        var thread = childProcess.spawn('ab-av1', cliArgs, {
                            windowsHide: true,
                        });
                        var outputChunks = [];
                        var stdoutBuffer = '';
                        var stderrBuffer = '';
                        var progressTracker = createProgressTracker();
                        var handleData = function (data, isStderr) {
                            if (isStderr === void 0) { isStderr = false; }
                            var text = data.toString();
                            outputChunks.push(text);
                            if (args.logFullCliOutput) {
                                args.jobLog(text);
                            }
                            var normalized = stripAnsiEscapeCodes(text);
                            if (isStderr) {
                                stderrBuffer += normalized;
                            }
                            else {
                                stdoutBuffer += normalized;
                            }
                        };
                        var stdoutLineBufferRef = { value: '' };
                        var stderrLineBufferRef = { value: '' };
                        var drainProgressLines = function (chunk, lineBufferRef) {
                            var _a;
                            lineBufferRef.value += chunk;
                            var lines = lineBufferRef.value.split(/\r\n|[\r\n]/);
                            lineBufferRef.value = (_a = lines.pop()) !== null && _a !== void 0 ? _a : '';
                            lines.forEach(function (line) {
                                var cleanedLine = line.trim();
                                if (cleanedLine) {
                                    var cycleCompleted = updateProgressFromLine(cleanedLine, args.updateWorker, progressTracker);
                                    if (cycleCompleted) {
                                        var recentStdout = stdoutBuffer.split(/\r\n|[\r\n]/).slice(-10).join('\n');
                                        var recentStderr = stderrBuffer.split(/\r\n|[\r\n]/).slice(-10).join('\n');
                                        args.jobLog("ab-av1 completed cycle ".concat(progressTracker.completedCycles, " with CRF ").concat(progressTracker.currentCrf));
                                        args.jobLog("Recent stdout:\n".concat(recentStdout));
                                        args.jobLog("Recent stderr:\n".concat(recentStderr));
                                    }
                                }
                            });
                        };
                        thread.stdout.on('data', function (data) {
                            var text = data.toString();
                            handleData(text, false);
                            drainProgressLines(stripAnsiEscapeCodes(text), stdoutLineBufferRef);
                        });
                        thread.stderr.on('data', function (data) {
                            var text = data.toString();
                            handleData(text, true);
                            drainProgressLines(stripAnsiEscapeCodes(text), stderrLineBufferRef);
                        });
                        thread.on('error', function (error) {
                            args.jobLog("Error executing ab-av1: ".concat(error.message));
                            resolve({ cliExitCode: 1, output: outputChunks.join('') });
                        });
                        thread.on('close', function (code) {
                            if (stdoutLineBufferRef.value.trim()) {
                                updateProgressFromLine(stdoutLineBufferRef.value.trim(), args.updateWorker, progressTracker);
                            }
                            if (stderrLineBufferRef.value.trim()) {
                                updateProgressFromLine(stderrLineBufferRef.value.trim(), args.updateWorker, progressTracker);
                            }
                            args.jobLog("ab-av1 exited with code: ".concat(code));
                            var clippedPrint = function (buffer) {
                                var lines = buffer.split('\n');
                                if (lines.length > 100) {
                                    args.jobLog('Output too long, printing first and last 50 lines:');
                                    var first50 = lines.slice(0, 50).join('\n');
                                    var last50 = lines.slice(-50).join('\n');
                                    args.jobLog("".concat(first50, "\n...\n").concat(last50));
                                }
                                else {
                                    args.jobLog('Output:');
                                    args.jobLog(buffer);
                                }
                            };
                            args.jobLog('ab-av1 stdout output:');
                            clippedPrint(stdoutBuffer);
                            args.jobLog('ab-av1 stderr output:');
                            clippedPrint(stderrBuffer);
                            resolve({
                                cliExitCode: code,
                                output: "".concat(stdoutBuffer, "\n").concat(stderrBuffer),
                            });
                        });
                    })];
            case 1:
                spawnResult = _c.sent();
                if (spawnResult.cliExitCode !== 0) {
                    failureMatch = spawnResult.output.match(/Failed to find a suitable crf/i);
                    if (failureMatch) {
                        args.jobLog('Failed to find a suitable crf');
                        args.logOutcome('tSuc');
                        return [2 /*return*/, {
                                outputFileObj: args.inputFileObj,
                                outputNumber: 2,
                                variables: args.variables,
                            }];
                    }
                    msg = 'Running ab-av1 failed';
                    args.jobLog(msg);
                    throw new Error(msg);
                }
                parsedResult = parseSearchResult(spawnResult.output);
                if (!parsedResult) {
                    msg = 'ab-av1 completed successfully but no CRF summary could be parsed';
                    args.jobLog(msg);
                    throw new Error(msg);
                }
                if (!args.variables.user) {
                    // eslint-disable-next-line no-param-reassign
                    args.variables.user = {};
                }
                // eslint-disable-next-line no-param-reassign
                args.variables.user.abAv1Crf = parsedResult.crf;
                // eslint-disable-next-line no-param-reassign
                args.variables.user.abAv1Vmaf = parsedResult.vmaf;
                // eslint-disable-next-line no-param-reassign
                args.variables.user.abAv1PredictedSize = parsedResult.predictedSize;
                // eslint-disable-next-line no-param-reassign
                args.variables.user.abAv1PredictedRatio = parsedResult.predictedRatio;
                args.jobLog("ab-av1 result: crf ".concat(parsedResult.crf, ", VMAF ").concat(parsedResult.vmaf, ", predicted size ").concat(parsedResult.predictedSize, ", predicted ratio ").concat(parsedResult.predictedRatio));
                args.logOutcome('tSuc');
                return [2 /*return*/, {
                        outputFileObj: args.inputFileObj,
                        outputNumber: 1,
                        variables: args.variables,
                    }];
        }
    });
}); };
exports.plugin = plugin;
