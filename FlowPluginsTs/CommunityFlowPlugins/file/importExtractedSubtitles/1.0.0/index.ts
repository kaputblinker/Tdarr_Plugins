/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */

import {
  IpluginDetails,
  IpluginInputArgs,
  IpluginOutputArgs,
} from '../../../../FlowHelpers/1.0.0/interfaces/interfaces';

/* eslint-disable no-param-reassign */
const details = (): IpluginDetails => ({
  name: 'Import Extracted Subtitles',
  description: `
  Import subtitles extracted by the Extract Subtitles plugin.
  
  Renames extracted subtitles to Plex-standard naming format.
  Handles multiple subtitles with the same language/disposition by adding indices.
  
  First occurrence: filename.lang.ext
  Second occurrence: filename.lang.1.ext
  Third occurrence: filename.lang.2.ext
  etc.
  `,
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
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const plugin = (args: IpluginInputArgs): IpluginOutputArgs => {
  const extractedSubs = args.variables.extractedSubtitles || [];
  const sourceDir = args.variables.extractedSubtitlesSourceDir;
  const fileNameBase =  args.inputFileObj.fileNameWithoutExtension;
  const targetDir = args.inputFileObj.meta.Directory;

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
  const langDispositionCount: Map<string, number> = new Map();

  extractedSubs.forEach((sub: { tempPath: string; lang: string; ext: string; format: string }) => {
    const { tempPath, lang, ext } = sub;

    // Get the base language (without disposition flags)
    const baseLang = lang.split('.')[0];
    const dispositionPart = lang.substring(baseLang.length); // e.g., ".default", ".forced.sdh", etc.

    // Create the language+disposition key
    const langKey = lang;

    // Track how many of this language+disposition combo we've seen
    const count = (langDispositionCount.get(langKey) || 0) + 1;
    langDispositionCount.set(langKey, count);

    // Build the Plex-standard filename
    let finalFileName: string;
    if (count === 1) {
      // First one gets normal naming
      finalFileName = `${fileNameBase}.${lang}.${ext}`;
    } else {
      // Subsequent ones get an index: filename.lang.1.ext, filename.lang.2.ext, etc.
      finalFileName = `${fileNameBase}.${lang}.${count - 1}.${ext}`;
    }

    const finalPath = `${targetDir}/${finalFileName}`;

    // Move file from temp location to final location
    try {
      args.deps.fsextra.moveSync(tempPath, finalPath, { overwrite: true });
      args.jobLog(`Imported subtitle: ${finalFileName}`);
    } catch (error) {
      args.jobLog(`Error importing subtitle from ${tempPath} to ${finalPath}: ${error}`, 'error');
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

export {
  details,
  plugin,
};
