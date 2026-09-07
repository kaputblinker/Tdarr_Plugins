import { EventEmitter } from 'events';

import { plugin } from '../../../../../../FlowPluginsTs/CommunityFlowPlugins/tools/crfSearch/1.0.0/index';
import { IpluginInputArgs } from '../../../../../../FlowPluginsTs/FlowHelpers/1.0.0/interfaces/interfaces';

const sampleH264 = require('../../../../../sampleData/media/sampleH264_1.json');

jest.mock('child_process', () => ({
    spawn: jest.fn(),
}));

describe('ab-av1 CRF Search Plugin', () => {
    let baseArgs: IpluginInputArgs;
    let mockSpawn: jest.Mock;
    let childProcessMock: EventEmitter & {
        stdout: EventEmitter;
        stderr: EventEmitter;
    };
    let now = 0;
    let dateNowSpy: jest.SpyInstance<number, []>;

    beforeEach(() => {
        mockSpawn = require('child_process').spawn;
        mockSpawn.mockReset();

        childProcessMock = new EventEmitter() as EventEmitter & {
            stdout: EventEmitter;
            stderr: EventEmitter;
        };
        childProcessMock.stdout = new EventEmitter();
        childProcessMock.stderr = new EventEmitter();
        mockSpawn.mockReturnValue(childProcessMock);

        now = 0;
        dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);

        baseArgs = {
            inputs: {
                tempDir: '/tmp/crf-search',
                additionalArguments: '',
                encoderArguments: '',
                encoderInputArguments: '',
            },
            variables: {
                ffmpegCommand: {
                    init: false,
                    inputFiles: [],
                    streams: [],
                    container: '',
                    hardwareDecoding: false,
                    shouldProcess: false,
                    overallInputArguments: [],
                    overallOuputArguments: [],
                },
                flowFailed: false,
                user: {},
            },
            inputFileObj: JSON.parse(JSON.stringify(sampleH264)),
            jobLog: jest.fn(),
            logOutcome: jest.fn(),
            workDir: '/tmp/work',
            logFullCliOutput: false,
            updateWorker: jest.fn(),
            deps: {
                fsextra: {
                    ensureDirSync: jest.fn(),
                },
                parseArgsStringToArgv: jest.fn().mockReturnValue([]),
                importFresh: jest.fn(),
                axiosMiddleware: jest.fn(),
                requireFromString: jest.fn(),
            },
        } as unknown as IpluginInputArgs;
    });

    afterEach(() => {
        dateNowSpy.mockRestore();
    });

    it('should convert mixed ab-av1 progress logs into a stable progress bar and ETA', async () => {
        const run = plugin(baseArgs);

        now = 1000;
        childProcessMock.stderr.emit('data', Buffer.from('[2026-07-06T20:36:18Z INFO  ab_av1::command::sample_encode] sample 5/10 crf 26.2 VMAF 95.81 (72%)\n'));
        now = 2000;
        childProcessMock.stderr.emit('data', Buffer.from('[2026-07-06T20:36:38Z INFO  ab_av1::command::sample_encode] 31%, 2.3 fps, eta 39 seconds\n'));
        now = 3000;
        childProcessMock.stderr.emit('data', Buffer.from('[2026-07-06T20:36:18Z INFO  ab_av1::command::sample_encode] encoding sample 6/10 crf 26.2\n'));
        now = 4000;
        childProcessMock.stderr.emit('data', Buffer.from('[2026-07-06T20:36:18Z INFO  ab_av1::command::sample_encode] vmaf calculation starting for crf 26.2\n'));
        now = 5000;
        childProcessMock.stderr.emit('data', Buffer.from('[2026-07-06T20:36:19Z INFO  ab_av1::command::sample_encode] sample 4/10 crf 26.9 VMAF 99.30 (73%)\n'));
        childProcessMock.stdout.emit('data', Buffer.from('[2026-07-06T20:36:20Z INFO  ab_av1::command::sample_encode] crf 26.9 VMAF 99.30 predicted size 1.2 GiB (73%)\n'));

        childProcessMock.emit('close', 0);

        const result = await run;

        expect(result.outputNumber).toBe(1);
        const percentageCalls = (baseArgs.updateWorker as jest.Mock).mock.calls
            .map(([call]) => call as Record<string, unknown>)
            .filter((call) => typeof call.percentage === 'number')
            .map((call) => call.percentage as number);

        expect(percentageCalls.length).toBeGreaterThan(0);
        expect(percentageCalls.some((value) => value > 20)).toBe(true);
        expect(percentageCalls).not.toContain(31);
        expect(baseArgs.updateWorker).toHaveBeenCalledWith(expect.objectContaining({
            ETA: expect.stringMatching(/^\d+:\d{2}:\d{2}$/),
        }));
    });
});