import { getFileName } from '../../../../FlowHelpers/1.0.0/fileUtils';
import {
  IpluginDetails,
  IpluginInputArgs,
  IpluginOutputArgs,
} from '../../../../FlowHelpers/1.0.0/interfaces/interfaces';

const details = (): IpluginDetails => ({
  name: 'Check Radarr or Sonarr Tag',
  description: 'Check if a specific tag is present on a movie or series in Radarr or Sonarr',
  style: {
    borderColor: '#6efefc',
  },
  tags: '',
  isStartPlugin: false,
  pType: '',
  requiresVersion: '2.11.01',
  sidebarPosition: -1,
  icon: 'faTag',
  inputs: [
    {
      label: 'Arr',
      name: 'arr',
      type: 'string',
      defaultValue: 'radarr',
      inputUI: {
        type: 'dropdown',
        options: ['radarr', 'sonarr'],
      },
      tooltip: 'Specify which arr to use',
    },
    {
      label: 'Arr API Key',
      name: 'arr_api_key',
      type: 'string',
      defaultValue: '',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Input your arr api key here',
    },
    {
      label: 'Arr Host',
      name: 'arr_host',
      type: 'string',
      defaultValue: 'http://192.168.1.1:7878',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Input your arr host here.'
        + '\\nExample:\\n'
        + 'http://192.168.1.1:7878\\n'
        + 'http://192.168.1.1:8989\\n'
        + 'https://radarr.domain.com\\n'
        + 'https://sonarr.domain.com\\n',
    },
    {
      label: 'Tag Name',
      name: 'tag_name',
      type: 'string',
      defaultValue: '',
      inputUI: {
        type: 'text',
      },
      tooltip: 'The tag name to check for (case-insensitive)',
    },
    {
      label: 'Monitored Check',
      name: 'monitored_check',
      type: 'string',
      defaultValue: "Don't Check",
      inputUI: {
        type: 'dropdown',
        options: ["Don't Check", 'Check Monitored', 'Check Unmonitored'],
      },
      tooltip: 'Optionally check if the parsed item is monitored or unmonitored',
    },
  ],
  outputs: [
    {
      number: 1,
      tooltip: 'Tag is present',
    },
    {
      number: 2,
      tooltip: 'Tag is not present or file not found in Radarr/Sonarr',
    },
  ],
});

interface ITag {
  id: number,
  label: string,
}

interface IParseResponse {
  data: {
    movie?: { id: number, tags?: number[], monitored?: boolean },
    series?: { id: number, tags?: number[], monitored?: boolean },
    episodes?: Array<{ monitored?: boolean }>,
  },
}

interface ILookupResult {
  id: number,
  tags: number[],
  monitored: boolean | null,
}

interface IArrApp {
  name: string,
  host: string,
  headers: Record<string, string>,
  content: string,
  getLookupData: (parseResponse: IParseResponse) => ILookupResult,
}

const getId = async (
  args: IpluginInputArgs,
  arrApp: IArrApp,
  fileName: string,
  forceParseLookup: boolean,
) => {
  const imdbIdMatch = /\btt\d{7,10}\b/i.exec(fileName);
  const imdbId = imdbIdMatch ? imdbIdMatch[0] : '';
  let result: ILookupResult = { id: -1, tags: [], monitored: null };

  if (imdbId !== '' && !forceParseLookup) {
    try {
      const lookupResponse = await args.deps.axios({
        method: 'get',
        url: `${arrApp.host}/api/v3/${arrApp.name === 'radarr' ? 'movie' : 'series'}/lookup?term=imdb:${imdbId}`,
        headers: arrApp.headers,
      });
      const item = lookupResponse.data && lookupResponse.data[0];
      if (item && item.id) {
        result = {
          id: item.id,
          tags: item.tags || [],
          monitored: typeof item.monitored === 'boolean' ? item.monitored : null,
        };
      }
    } catch (error) {
      args.jobLog(`Failed to lookup by IMDB ID: ${error}`);
    }
  }

  args.jobLog(`${arrApp.content} ${result.id !== -1 ? `'${result.id}' found` : 'not found'} for imdb '${imdbId}'`);

  if (result.id === -1) {
    try {
      const parseResponse = await args.deps.axios({
        method: 'get',
        url: `${arrApp.host}/api/v3/parse?title=${encodeURIComponent(getFileName(fileName))}`,
        headers: arrApp.headers,
      });
      result = arrApp.getLookupData(parseResponse);
      args.jobLog(
        `${arrApp.content} ${result.id !== -1 ? `'${result.id}' found` : 'not found'} for '${getFileName(fileName)}'`,
      );
    } catch (error) {
      args.jobLog(`Failed to parse filename: ${error}`);
    }
  }

  return result;
};

const plugin = async (args: IpluginInputArgs): Promise<IpluginOutputArgs> => {
  const lib = require('../../../../../methods/lib')();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
  args.inputs = lib.loadDefaultValues(args.inputs, details);

  let tagFound = false;
  const arr = String(args.inputs.arr);
  const arr_host = String(args.inputs.arr_host).trim();
  const arrHost = arr_host.endsWith('/') ? arr_host.slice(0, -1) : arr_host;
  const tagName = String(args.inputs.tag_name).trim().toLowerCase();
  const monitoredCheck = String(args.inputs.monitored_check || "Don't Check");
  const originalFileName = args.originalLibraryFile?._id ?? '';
  const currentFileName = args.inputFileObj?._id ?? '';

  if (!tagName) {
    args.jobLog('⚠ No tag name specified');
    return {
      outputFileObj: args.inputFileObj,
      outputNumber: 2,
      variables: args.variables,
    };
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-Api-Key': String(args.inputs.arr_api_key),
    Accept: 'application/json',
  };

  const arrApp: IArrApp = arr === 'radarr'
    ? {
      name: arr,
      host: arrHost,
      headers,
      content: 'Movie',
      getLookupData: (parseResponse: IParseResponse) => ({
        id: Number(parseResponse?.data?.movie?.id ?? -1),
        tags: parseResponse?.data?.movie?.tags || [],
        monitored: typeof parseResponse?.data?.movie?.monitored === 'boolean'
          ? parseResponse.data.movie.monitored
          : null,
      }),
    }
    : {
      name: arr,
      host: arrHost,
      headers,
      content: 'Series',
      getLookupData: (parseResponse: IParseResponse) => ({
        id: Number(parseResponse?.data?.series?.id ?? -1),
        tags: parseResponse?.data?.series?.tags || [],
        monitored: typeof parseResponse?.data?.episodes?.[0]?.monitored === 'boolean'
          ? parseResponse.data.episodes?.[0]?.monitored ?? null
          : (typeof parseResponse?.data?.series?.monitored === 'boolean'
            ? parseResponse.data.series.monitored
            : null),
      }),
    };

  args.jobLog(`Checking for tag '${tagName}' in ${arrApp.name}...`);
  if (monitoredCheck !== "Don't Check") {
    args.jobLog(`Monitored option selected: '${monitoredCheck}'`);
  }

  const forceParseLookup = monitoredCheck !== "Don't Check";
  let result = await getId(args, arrApp, originalFileName, forceParseLookup);
  if (result.id === -1 && currentFileName !== originalFileName) {
    result = await getId(args, arrApp, currentFileName, forceParseLookup);
  }

  if (result.id !== -1) {
    args.jobLog(`${arrApp.content} '${result.id}' found with tag IDs: [${result.tags.join(', ')}]`);

    try {
      const tagsResponse = await args.deps.axios({
        method: 'get',
        url: `${arrApp.host}/api/v3/tag`,
        headers,
      });

      const tags: ITag[] = tagsResponse.data || [];
      args.jobLog(`Found ${tags.length} tags in ${arrApp.name}`);

      let targetTag: ITag | undefined;
      for (let i = 0; i < tags.length; i += 1) {
        if (tags[i].label.toLowerCase() === tagName) {
          targetTag = tags[i];
          break;
        }
      }

      if (targetTag) {
        args.jobLog(`Tag '${tagName}' has ID ${targetTag.id}`);

        let hasTag = false;
        for (let i = 0; i < result.tags.length; i += 1) {
          if (result.tags[i] === targetTag.id) {
            hasTag = true;
            break;
          }
        }

        if (hasTag) {
          tagFound = true;
          args.jobLog(`Tag '${tagName}' is present on ${arrApp.content} '${result.id}'`);
        } else {
          args.jobLog(`Tag '${tagName}' is NOT present on ${arrApp.content} '${result.id}'`);
        }
      } else {
        args.jobLog(`Tag '${tagName}' does not exist in ${arrApp.name}`);
      }
    } catch (error) {
      args.jobLog(`Failed to fetch tags: ${error}`);
    }
  } else {
    args.jobLog(`${arrApp.content} not found in ${arrApp.name}`);
  }

  let monitoredCheckPassed = true;
  if (monitoredCheck === 'Check Monitored') {
    monitoredCheckPassed = result.monitored === true;
    args.jobLog(
      monitoredCheckPassed
        ? 'Monitored check passed (item is monitored)'
        : `Monitored check failed (${result.monitored === false ? 'item is unmonitored' : 'monitored state unavailable'})`,
    );
  } else if (monitoredCheck === 'Check Unmonitored') {
    monitoredCheckPassed = result.monitored === false;
    args.jobLog(
      monitoredCheckPassed
        ? 'Unmonitored check passed (item is unmonitored)'
        : `Unmonitored check failed (${result.monitored === true ? 'item is monitored' : 'monitored state unavailable'})`,
    );
  }

  return {
    outputFileObj: args.inputFileObj,
    outputNumber: tagFound && monitoredCheckPassed ? 1 : 2,
    variables: args.variables,
  };
};

export {
  details,
  plugin,
};
