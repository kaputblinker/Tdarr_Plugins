/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */

import { getFileAbsoluteDir } from '../../../../FlowHelpers/1.0.0/fileUtils';
import {
  IffmpegCommandStream,
  IpluginDetails,
  IpluginInputArgs,
  IpluginOutputArgs,
} from '../../../../FlowHelpers/1.0.0/interfaces/interfaces';

/* eslint-disable no-param-reassign */
const details = (): IpluginDetails => ({
  name: 'Extract Subtitles',
  description: `
  Extract all matching subtitle streams in their native format.
  
  ASS subtitles are saved as .ass files, SUBRIP as .srt, image-based as .sup, etc.
  DVB Teletext subtitles are converted to .srt (they have no sane native container).
  
  For each language, if no SRT format exists, an SRT will be automatically generated
  by converting the "best" available text-based subtitle (preferring tracks that
  aren't forced/default and don't look like signs/songs/commentary tracks) to ensure
  SRT availability.
  
  Image-based subtitles (DVD, PGS) and all text-based formats are supported.
  Other streams (video, audio) are left untouched for other plugins to handle.
  `,
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
});

const getOutputStreamIndex = (streams: IffmpegCommandStream[], stream: IffmpegCommandStream): number => {
  let index = -1;

  for (let idx = 0; idx < streams.length; idx += 1) {
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
const getSubtitleExtension = (codecName: string): string => {
  const normalized = codecName.toLowerCase();

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
const isTextBasedSubtitle = (codecName: string): boolean => {
  const normalized = codecName.toLowerCase();
  return (
    normalized === 'ass'
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
const isImageBasedSubtitle = (codecName: string): boolean => {
  const normalized = codecName.toLowerCase();
  return (
    normalized === 'hdmv_pgs_subtitle'
    || normalized === 'pgs'
  );
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
const normalityScore = (title: string): number => {
  const t = title.toLowerCase();
  let score = 0;
  if (t.includes('sign')) score -= 10;
  if (t.includes('commentary')) score -= 10;
  if (t.includes('karaoke') || t.includes('song')) score -= 5;
  if (t.trim() === '') score += 1;
  return score;
};

type ExtractedSubtitle = {
  tempPath: string;
  lang: string;
  ext: string;
  format: string;
  stream: IffmpegCommandStream;
};

/**
 * Rank candidate tracks for the SRT fallback conversion. Lower is better.
 * Prefers non-default/non-forced tracks first (a plain, unflagged dialogue
 * track is the safest bet for "the" subtitle), then the normality score
 * (deprioritizing signs/commentary/karaoke-looking tracks), then falls back
 * to original stream order for a stable tie-break when no heuristic applies.
 */
const fallbackRank = (sub: ExtractedSubtitle): [number, number, number] => {
  // eslint-disable-next-line no-prototype-builtins
  const disposition = sub.stream.hasOwnProperty('disposition') ? sub.stream.disposition : ({} as any);
  const isDefault = disposition?.default === 1;
  const isForced = disposition?.forced === 1;
  const dispositionPenalty = (isDefault ? 1 : 0) + (isForced ? 1 : 0);

  const title = (sub.stream.tags?.title as string) || '';
  return [dispositionPenalty, -normalityScore(title), sub.stream.index];
};

const pickBestFallbackCandidate = (candidates: ExtractedSubtitle[]): ExtractedSubtitle => {
  const sorted = [...candidates].sort((a, b) => {
    const rankA = fallbackRank(a);
    const rankB = fallbackRank(b);
    for (let i = 0; i < rankA.length; i += 1) {
      if (rankA[i] !== rankB[i]) {
        return rankA[i] - rankB[i];
      }
    }
    return 0;
  });
  return sorted[0];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const plugin = (args: IpluginInputArgs): IpluginOutputArgs => {
  const lib = require('../../../../../methods/lib')();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
  args.inputs = lib.loadDefaultValues(args.inputs, details);
  const subtitle_languages = String(args.inputs.subtitle_languages).trim().split(',');
  const output_dir_input = String(args.inputs.output_directory).trim();
  const workDir = getFileAbsoluteDir(args.workDir);
  const subs_dir = output_dir_input ? `${workDir}/${output_dir_input}` : workDir;

  args.variables.ffmpegCommand.shouldProcess = true;
  const { streams } = args.variables.ffmpegCommand;

  // Track extracted subtitles for next plugin
  if (!args.variables.extractedSubtitles) {
    args.variables.extractedSubtitles = [];
  }

  const extractedSubs: ExtractedSubtitle[] = [];
  const textBasedCandidates: ExtractedSubtitle[] = [];
  let hasSrtSubtitle = false;

  // Process subtitle streams: extract natively
  streams.forEach((stream) => {
    if (stream.codec_type === 'subtitle') {
      const index = getOutputStreamIndex(streams, stream);
      let lang = stream.tags?.language ? stream.tags.language : 'und';
      const format = stream.codec_name.toLowerCase();

      // Add disposition flags to language identifier
      // eslint-disable-next-line no-prototype-builtins
      if (stream.hasOwnProperty('disposition')) {
        const def = stream.disposition.default === 1 ? '.default' : '';
        const forced = stream.disposition.forced === 1 ? '.forced' : '';
        const sdh = stream.disposition.hearing_impaired === 1 ? '.sdh' : '';
        lang = `${lang}${def}${forced}${sdh}`;
      }

      // Filter by language
      const baseLang = lang.split('.')[0]; // Get language without disposition flags
      if (subtitle_languages.length !== 0 && !subtitle_languages.includes(baseLang)) {
        stream.removed = true;
      } else if (!isTextBasedSubtitle(format) && !isImageBasedSubtitle(format)) {
        // Remove unsupported subtitle formats
        stream.removed = true;
      } else {
        // Extract subtitle in native format
        args.deps.fsextra.ensureDirSync(subs_dir);

        const ext = getSubtitleExtension(format);
        const tempDest = `${subs_dir}/${args.originalLibraryFile.fileNameWithoutExtension}.${index}.${lang}.${ext}`;
        args.jobLog('Extracting Subtitle stream to ' + tempDest);

        // DVB Teletext has no native container worth copying - there's no
        // sane muxer for a raw teletext bitstream into an .srt file, so it
        // must always be decoded straight to SRT (requires libzvbi).
        const subtitleCodecArg = format === 'dvb_teletext' ? 'srt' : 'copy';

        stream.outputArgs.push('-c:s');
        stream.outputArgs.push(subtitleCodecArg);
        stream.outputArgs.push(tempDest);
        stream.extraExport = true;

        const extractedSubtitle: ExtractedSubtitle = {
          tempPath: tempDest,
          lang,
          ext,
          format,
          stream,
        };

        extractedSubs.push(extractedSubtitle);

        if (isTextBasedSubtitle(format)) {
          textBasedCandidates.push(extractedSubtitle);
        }

        if (ext === 'srt') {
          hasSrtSubtitle = true;
        }
      }
    } else {
      // Don't touch non-subtitle streams - leave for other plugins
      // (video, audio, data streams are untouched)
    }
  });

  if (!hasSrtSubtitle && textBasedCandidates.length > 0) {
    const fallbackSubtitle = pickBestFallbackCandidate(textBasedCandidates);
    const fallbackStream = fallbackSubtitle.stream as IffmpegCommandStream & {
      outputArgs: string[];
      extraExport?: boolean;
    };
    const index = getOutputStreamIndex(streams, fallbackStream);
    const srtTempDest = `${subs_dir}/${args.originalLibraryFile.fileNameWithoutExtension}.${index}.${fallbackSubtitle.lang}.srt`;

    args.jobLog('Extracting fallback Subtitle stream to ' + srtTempDest);

    fallbackStream.outputArgs.push('-map');
    fallbackStream.outputArgs.push(`0:${fallbackSubtitle.stream.index}`);
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

export {
  details,
  plugin,
};