import { getPluginWorkDir } from '../../../../FlowHelpers/1.0.0/fileUtils';
import {
	IpluginDetails,
	IpluginInputArgs,
	IpluginOutputArgs,
} from '../../../../FlowHelpers/1.0.0/interfaces/interfaces';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;

/* eslint no-plusplus: [{"error", { "allowForLoopAfterthoughts": true }}] */
const details = (): IpluginDetails => ({
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
});

const parseNumericString = (value: unknown): string => String(value ?? '').trim();

const appendFlagValue = (
	jobLog: (message: string) => void,
	cliArgs: string[],
	flag: string,
	value: unknown,
): void => {
	if (value && String(value).trim() !== '') {
		jobLog(`Appending flag ${flag} with value ${String(value).trim()} to CLI arguments`);
		const normalized = parseNumericString(value);
		cliArgs.push(flag, normalized);
	} else {
		jobLog(`Skipping flag ${flag} because value is empty or blank`);
	}
};

const appendRepeatedFlagValues = (
	jobLog: (message: string) => void,
	cliArgs: string[],
	flag: string,
	value: unknown,
	parseArgsStringToArgv: (input: string, a: string, b: string) => string[],
): void => {
	const normalized = String(value ?? '').trim();
	if (!normalized) {
		return;
	}

	const parsedValues = parseArgsStringToArgv(normalized, '', '');
	parsedValues.forEach((parsedValue) => {
		if (parsedValue.trim()) {
			cliArgs.push(flag, parsedValue.trim());
			jobLog(`Appending repeated flag ${flag} with value ${parsedValue.trim()} to CLI arguments`);
		} else {
			jobLog(`Skipping repeated flag ${flag} because parsed value is empty or blank`);
		}
	});
};

type AbAv1SearchResult = {
	crf: string;
	vmaf: string;
	predictedSize: string;
	predictedRatio: string;
};

const parseSearchResult = (output: string): AbAv1SearchResult | null => {
	const summaryPatterns = [
		/crf\s+([\d.]+)\s+VMAF\s+([\d.]+)\s+predicted\s+(?:video\s+stream|full\s+encode)?\s*size\s+(.+?)\s+\(([\d.]+)%\)/i,
		/crf\s+([\d.]+)\s+VMAF\s+([\d.]+)\s+predicted\s+size\s+(.+?)\s+\(([\d.]+)%\)/i,
	];

	for (let i = summaryPatterns.length - 1; i >= 0; i -= 1) {
		const match = output.match(summaryPatterns[i]);
		if (match && match.length >= 5) {
			return {
				crf: match[1].trim(),
				vmaf: match[2].trim(),
				predictedSize: match[3].trim(),
				predictedRatio: `${match[4].trim()}%`,
			};
		}
	}

	return null;
};

const formatEta = (totalSeconds: number): string => {
	const safeSeconds = Math.max(0, Math.round(totalSeconds));
	const hours = Math.floor(safeSeconds / 3600);
	const minutes = Math.floor((safeSeconds % 3600) / 60);
	const seconds = safeSeconds % 60;
	const pad2 = (value: number): string => (value < 10 ? `0${value}` : String(value));

	return `${hours}:${pad2(minutes)}:${pad2(seconds)}`;
};

const parseEtaToSeconds = (etaText: string): number | null => {
	const normalized = etaText.trim().toLowerCase();
	if (!normalized) {
		return null;
	}

	let totalSeconds = 0;
	let matched = false;
	const regex = /(\d+(?:\.\d+)?)\s*(ms|s|m|h)/g;
	let match: RegExpExecArray | null;

	while ((match = regex.exec(normalized)) !== null) {
		matched = true;
		const amount = Number(match[1]);
		const unit = match[2];

		if (unit === 'ms') {
			totalSeconds += amount / 1000;
		} else if (unit === 's') {
			totalSeconds += amount;
		} else if (unit === 'm') {
			totalSeconds += amount * 60;
		} else if (unit === 'h') {
			totalSeconds += amount * 3600;
		}
	}

	return matched ? totalSeconds : null;
};

const stripAnsiEscapeCodes = (text: string): string => text.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, '');

const assumeSearchCycles = 5;

type ProgressTracker = {
	currentCrf: string | null;
	completedCycles: number;
	totalCycles: number;
	sampleIndex: number;
	sampleTotal: number;
	phase: 'sample' | 'vmaf';
	startedAtMs: number;
	lastPercentage: number;
	lastEta: string;
};

type ParsedProgressLine = {
	crf: string;
	sampleIndex?: number;
	sampleTotal?: number;
	isVmafStart?: boolean;
};

const createProgressTracker = (): ProgressTracker => ({
	currentCrf: null,
	completedCycles: 0,
	totalCycles: assumeSearchCycles,
	sampleIndex: 0,
	sampleTotal: 0,
	phase: 'sample',
	startedAtMs: Date.now(),
	lastPercentage: -1,
	lastEta: '',
});

const normalizeProgressLine = (line: string): string => line
	.replace(/^\s*(?:tdarr_node\s*\|\s*)?/i, '')
	.replace(/^\s*ab-av1\s+(?:stdout|stderr):\s*/i, '')
	.trim();

const parseProgressLine = (line: string): ParsedProgressLine | null => {
	const normalized = normalizeProgressLine(stripAnsiEscapeCodes(line));

	const sampleMatch = normalized.match(/(?:encoding\s+)?sample\s+(\d+)\/(\d+)\s+crf\s+([\d.]+)/i);
	if (sampleMatch) {
		return {
			crf: sampleMatch[3].trim(),
			sampleIndex: Number(sampleMatch[1]),
			sampleTotal: Number(sampleMatch[2]),
		};
	}

	if (/\bvmaf\b/i.test(normalized) && /crf\s+[\d.]+/i.test(normalized)
		&& /(start|starting|calculate|calculating|score|search)/i.test(normalized)) {
		const crfMatch = normalized.match(/crf\s+([\d.]+)/i);
		if (crfMatch) {
			return {
				crf: crfMatch[1].trim(),
				isVmafStart: true,
			};
		}
	}

	return null;
};

const calculateProgressPercentage = (tracker: ProgressTracker): number => {
	const cycleWidth = 100 / tracker.totalCycles;
	const sampleProgress = tracker.sampleTotal > 0
		? Math.max(0, Math.min(1, tracker.sampleIndex / tracker.sampleTotal)) * 0.5
		: 0;
	const phaseProgress = tracker.phase === 'vmaf' ? 0.5 : sampleProgress;

	return Math.max(0, Math.min(100, (tracker.completedCycles + phaseProgress) * cycleWidth));
};

const estimateEtaFromProgress = (progress: number, startedAtMs: number): string | null => {
	if (progress <= 0 || progress >= 100) {
		return null;
	}

	const elapsedSeconds = (Date.now() - startedAtMs) / 1000;
	if (elapsedSeconds <= 0) {
		return formatEta(0);
	}

	return formatEta((elapsedSeconds * (100 - progress)) / progress);
};

const updateProgressFromLine = (
	line: string,
	updateWorker: (obj: Record<string, unknown>) => void,
	tracker: ProgressTracker,
): boolean => {
	const progressLine = parseProgressLine(line);
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
	} else if (progressLine.isVmafStart) {
		tracker.phase = 'vmaf';
	}

	const percentage = calculateProgressPercentage(tracker);
	const eta = estimateEtaFromProgress(percentage, tracker.startedAtMs);

	if (eta !== null && eta !== tracker.lastEta) {
		tracker.lastEta = eta;
		updateWorker({ ETA: eta });
	}

	if (percentage !== tracker.lastPercentage) {
		tracker.lastPercentage = percentage;
		updateWorker({ percentage });
	}

	console.log(`ab-av1 Updated progress: ${percentage.toFixed(2)}%, ETA: ${tracker.lastEta}`);
	return cycleCompleted;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const plugin = async (args: IpluginInputArgs): Promise<IpluginOutputArgs> => {
	const lib = require('../../../../../methods/lib')();
	// eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
	args.inputs = lib.loadDefaultValues(args.inputs, details);

	const childProcess = require('child_process');

	const parseArgsStringToArgv = args.deps.parseArgsStringToArgv as (
		input: string,
		a: string,
		b: string,
	) => string[];

	const cliArgs: string[] = ['crf-search'];

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

	const tempDirInput = String(args.inputs.tempDir ?? '').trim();
	const tempDir = tempDirInput
		? (tempDirInput.startsWith('/') ? tempDirInput : `${args.workDir}/${tempDirInput}`)
		: getPluginWorkDir(args);

	args.deps.fsextra.ensureDirSync(tempDir);
	cliArgs.push('--temp-dir', tempDir);

	const additionalArguments = String(args.inputs.additionalArguments ?? '').trim();
	if (additionalArguments) {
		cliArgs.push(...parseArgsStringToArgv(additionalArguments, '', ''));
	}

	args.updateWorker({
		CLIType: 'ab-av1',
		preset: cliArgs.join(' '),
	});

	args.jobLog(`Running ab-av1 ${cliArgs.join(' ')}`);

	const spawnResult = await new Promise<{
		cliExitCode: number,
		output: string,
	}>((resolve) => {
		const thread = childProcess.spawn('ab-av1', cliArgs, {
			windowsHide: true,
		});

		const outputChunks: string[] = [];
		let stdoutBuffer = '';
		let stderrBuffer = '';
		const progressTracker = createProgressTracker();

		const handleData = (data: string, isStderr = false): void => {
			const text = data.toString();
			outputChunks.push(text);

			if (args.logFullCliOutput) {
				args.jobLog(text);
			}

			const normalized = stripAnsiEscapeCodes(text);
			if (isStderr) {
				stderrBuffer += normalized;
			} else {
				stdoutBuffer += normalized;
			}
		};

		const stdoutLineBufferRef = { value: '' };
		const stderrLineBufferRef = { value: '' };

		const drainProgressLines = (
			chunk: string,
			lineBufferRef: { value: string },
		): void => {
			lineBufferRef.value += chunk;

			const lines = lineBufferRef.value.split(/\r\n|[\r\n]/);
			lineBufferRef.value = lines.pop() ?? '';

			lines.forEach((line) => {
				const cleanedLine = line.trim();
				if (cleanedLine) {
					var cycleCompleted = updateProgressFromLine(cleanedLine, args.updateWorker, progressTracker);
					if (cycleCompleted) {
						var recentStdout = stdoutBuffer.split(/\r\n|[\r\n]/).slice(-10).join('\n');
						var recentStderr = stderrBuffer.split(/\r\n|[\r\n]/).slice(-10).join('\n');
						args.jobLog(`ab-av1 completed cycle ${progressTracker.completedCycles} with CRF ${progressTracker.currentCrf}`);
						args.jobLog(`Recent stdout:\n${recentStdout}`);
						args.jobLog(`Recent stderr:\n${recentStderr}`);
					}
				}
			});
		};

		thread.stdout.on('data', (data: string) => {
			const text = data.toString();
			handleData(text, false);
			drainProgressLines(stripAnsiEscapeCodes(text), stdoutLineBufferRef);
		});

		thread.stderr.on('data', (data: string) => {
			const text = data.toString();
			handleData(text, true);
			drainProgressLines(stripAnsiEscapeCodes(text), stderrLineBufferRef);
		});

		thread.on('error', (error: Error) => {
			args.jobLog(`Error executing ab-av1: ${error.message}`);
			resolve({ cliExitCode: 1, output: outputChunks.join('') });
		});

		thread.on('close', (code: number) => {
			if (stdoutLineBufferRef.value.trim()) {
				updateProgressFromLine(stdoutLineBufferRef.value.trim(), args.updateWorker, progressTracker);
			}

			if (stderrLineBufferRef.value.trim()) {
				updateProgressFromLine(stderrLineBufferRef.value.trim(), args.updateWorker, progressTracker);
			}

			args.jobLog(`ab-av1 exited with code: ${code}`);
			var clippedPrint = (buffer: string) => {
				const lines = buffer.split('\n');
				if (lines.length > 100) {
					args.jobLog('Output too long, printing first and last 50 lines:');
					const first50 = lines.slice(0, 50).join('\n');
					const last50 = lines.slice(-50).join('\n');
					args.jobLog(`${first50}\n...\n${last50}`);
				} else {
					args.jobLog('Output:');
					args.jobLog(buffer);
				}
			}
			args.jobLog('ab-av1 stdout output:');
			clippedPrint(stdoutBuffer);
			args.jobLog('ab-av1 stderr output:');
			clippedPrint(stderrBuffer);



			resolve({
				cliExitCode: code,
				output: `${stdoutBuffer}\n${stderrBuffer}`,
			});
		});
	});

	if (spawnResult.cliExitCode !== 0) {
		const failureMatch = spawnResult.output.match(/Failed to find a suitable crf/i);
		if (failureMatch) {
			args.jobLog('Failed to find a suitable crf');
			args.logOutcome('tSuc');

			return {
				outputFileObj: args.inputFileObj,
				outputNumber: 2,
				variables: args.variables,
			};
		}

		const msg = 'Running ab-av1 failed';

		args.jobLog(msg);
		throw new Error(msg);
	}

	const parsedResult = parseSearchResult(spawnResult.output);

	if (!parsedResult) {
		const msg = 'ab-av1 completed successfully but no CRF summary could be parsed';
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

	args.jobLog(`ab-av1 result: crf ${parsedResult.crf}, VMAF ${parsedResult.vmaf}, predicted size ${parsedResult.predictedSize}, predicted ratio ${parsedResult.predictedRatio}`);
	args.logOutcome('tSuc');

	return {
		outputFileObj: args.inputFileObj,
		outputNumber: 1,
		variables: args.variables,
	};
};

export {
	details,
	plugin,
};
