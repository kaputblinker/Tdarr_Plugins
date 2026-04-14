
module.exports = async (args) => {

  TMDB_API_KEY = "620bf84bb7e392f5ef6e7bd48142a9e3";
  audio_channel_precedence = [6, 8, 2, 1];
  audio_stream_precedence = ["dts", "eac3", "ac3", "truehd", "flac", "alac", "wav", "pcm"];
  desired_languages = ["eng"];


  // see args object data here https://github.com/HaveAGitGat/Tdarr_Plugins/blob/master/FlowPluginsTs/FlowHelpers/1.0.0/interfaces/interfaces.ts
  // example setting flow variable: https://github.com/HaveAGitGat/Tdarr/issues/1147#issuecomment-2593348443
  // example reading ffmpeg metadata: https://github.com/HaveAGitGat/Tdarr_Plugins/issues/737#issuecomment-2581536112
  // example setting working file as previous working file: https://github.com/HaveAGitGat/Tdarr/issues/1106#issuecomment-2622177459

  // some example file data:
  // console.log(args.inputFileObj._id)
  // console.log(args.inputFileObj.file_size)
  // console.log(args.inputFileObj.ffProbeData.streams[0].codec_name)
  // console.log(args.inputFileObj.mediaInfo.track[0].BitRate)


  const data = args.deps.fsextra.readJsonSync("".concat(args.workDir, "/arr.json"), { throws: false })?.data;
  // console.log("Arr:" + JSON.stringify(data));
  var imdbId = data && data.movie && data.movie.imdbId
    ? data.movie.imdbId
    : (data && data.series && data.series.imdbId
      ? data.series.imdbId
      : (data && data.episodes && data.episodes[0] && data.episodes[0].imdbId
        ? data.episodes[0].imdbId
        : null));

  var tmdbData = null;
  var orlang = null;

  function getFirstOriginalLanguage(label, list) {
    if (!Array.isArray(list)) {
      console.log(label + ": not an array");
      return null;
    }

    console.log(label + ": " + list.length + " item(s)");
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      console.log(label + "[" + i + "] = " + JSON.stringify(item));

      if (item && item.original_language) {
        console.log(label + "[" + i + "] original_language = " + item.original_language);
        return item.original_language;
      }
    }

    return null;
  }

  if (imdbId) {
    var tmdbUrl =
      "https://api.themoviedb.org/3/find/" +
      encodeURIComponent(imdbId) +
      "?api_key=" +
      TMDB_API_KEY +
      "&language=en-US&external_source=imdb_id";

    console.log("IMDB ID: " + imdbId);
    console.log("TMDB URL: " + tmdbUrl);

    try {
      var tmdbResponse = await args.deps.axios.get(tmdbUrl);
      tmdbData = tmdbResponse && tmdbResponse.data ? tmdbResponse.data : null;

      console.log("TMDB response keys: " + (tmdbData ? Object.keys(tmdbData).join(", ") : "none"));
      console.log("TMDB raw response: " + JSON.stringify(tmdbData));
    } catch (err) {
      console.log("TMDB lookup failed: " + (err && err.message ? err.message : String(err)));
    }
  } else {
    console.log("No IMDB ID found in arr.json");
  }

  if (tmdbData) {
    orlang = getFirstOriginalLanguage("movie_results", tmdbData.movie_results);

    if (!orlang) {
      orlang = getFirstOriginalLanguage("tv_results", tmdbData.tv_results);
    }
    if (!orlang) {
      orlang = getFirstOriginalLanguage("tv_episode_results", tmdbData.tv_episode_results);
    }
    if (!orlang) {
      orlang = getFirstOriginalLanguage("tv_series_results", tmdbData.tv_series_results);
    }
  }

  console.log("Resolved original language: " + orlang);


  alpha2ToAlpha3B = { "aa": "aar", "ab": "abk", "ae": "ave", "af": "afr", "ak": "aka", "am": "amh", "an": "arg", "ar": "ara", "as": "asm", "av": "ava", "ay": "aym", "az": "aze", "ba": "bak", "be": "bel", "bg": "bul", "bh": "bih", "bi": "bis", "bm": "bam", "bn": "ben", "bo": "tib", "br": "bre", "bs": "bos", "ca": "cat", "ce": "che", "ch": "cha", "co": "cos", "cr": "cre", "cs": "cze", "cu": "chu", "cv": "chv", "cy": "wel", "da": "dan", "de": "ger", "dv": "div", "dz": "dzo", "ee": "ewe", "el": "gre", "en": "eng", "eo": "epo", "es": "spa", "et": "est", "eu": "baq", "fa": "per", "ff": "ful", "fi": "fin", "fj": "fij", "fo": "fao", "fr": "fre", "fy": "fry", "ga": "gle", "gd": "gla", "gl": "glg", "gn": "grn", "gu": "guj", "gv": "glv", "ha": "hau", "he": "heb", "hi": "hin", "ho": "hmo", "hr": "hrv", "ht": "hat", "hu": "hun", "hy": "arm", "hz": "her", "ia": "ina", "id": "ind", "ie": "ile", "ig": "ibo", "ii": "iii", "ik": "ipk", "io": "ido", "is": "ice", "it": "ita", "iu": "iku", "ja": "jpn", "jv": "jav", "ka": "geo", "kg": "kon", "ki": "kik", "kj": "kua", "kk": "kaz", "kl": "kal", "km": "khm", "kn": "kan", "ko": "kor", "kr": "kau", "ks": "kas", "ku": "kur", "kv": "kom", "kw": "cor", "ky": "kir", "la": "lat", "lb": "ltz", "lg": "lug", "li": "lim", "ln": "lin", "lo": "lao", "lt": "lit", "lu": "lub", "lv": "lav", "mg": "mlg", "mh": "mah", "mi": "mao", "mk": "mac", "ml": "mal", "mn": "mon", "mr": "mar", "ms": "may", "mt": "mlt", "my": "bur", "na": "nau", "nb": "nob", "nd": "nde", "ne": "nep", "ng": "ndo", "nl": "dut", "nn": "nno", "no": "nor", "nr": "nbl", "nv": "nav", "ny": "nya", "oc": "oci", "oj": "oji", "om": "orm", "or": "ori", "os": "oss", "pa": "pan", "pi": "pli", "pl": "pol", "ps": "pus", "pt": "por", "qu": "que", "rm": "roh", "rn": "run", "ro": "rum", "ru": "rus", "rw": "kin", "sa": "san", "sc": "srd", "sd": "snd", "se": "sme", "sg": "sag", "si": "sin", "sk": "slo", "sl": "slv", "sm": "smo", "sn": "sna", "so": "som", "sq": "alb", "sr": "srp", "ss": "ssw", "st": "sot", "su": "sun", "sv": "swe", "sw": "swa", "ta": "tam", "te": "tel", "tg": "tgk", "th": "tha", "ti": "tir", "tk": "tuk", "tl": "tgl", "tn": "tsn", "to": "ton", "tr": "tur", "ts": "tso", "tt": "tat", "tw": "twi", "ty": "tah", "ug": "uig", "uk": "ukr", "ur": "urd", "uz": "uzb", "ve": "ven", "vi": "vie", "vo": "vol", "wa": "wln", "wo": "wol", "xh": "xho", "yi": "yid", "yo": "yor", "za": "zha", "zh": "chi", "zu": "zul" };
  args.variables.original_language = null;
  if (orlang !== null && alpha2ToAlpha3B[orlang]) {
    args.variables.original_language = alpha2ToAlpha3B[orlang];
  }

  console.log("Original Language: " + args.variables.original_language);

  if (args.variables.original_language && !desired_languages.includes(args.variables.original_language)) {
    desired_languages.push(args.variables.original_language);
  }
  const selected_audio_indices = [];
  const selected_audio_langs = [];
  const bestByLanguage = {};

  args.inputFileObj.ffProbeData.streams.forEach((stream, index) => {
    if (stream.codec_type !== "audio") return;

    const language = (stream.tags?.language || "und").toLowerCase();
    if (!desired_languages.includes(language)) return;

    const codecName = (stream.codec_name || "").toLowerCase();
    let codecRank = audio_stream_precedence.findIndex((c) => codecName.includes(c));
    if (codecRank === -1) codecRank = Number.MAX_SAFE_INTEGER;

    let channelRank = audio_channel_precedence.indexOf(stream.channels);
    if (channelRank === -1) channelRank = Number.MAX_SAFE_INTEGER;

    const currentBest = bestByLanguage[language];
    const candidate = { index, codecRank, channelRank, channels: stream.channels || 0 };

    if (
      !currentBest ||
      candidate.channels > currentBest.channels ||
      (candidate.channels === currentBest.channels &&
        candidate.codecRank < currentBest.codecRank)
    ) {
      bestByLanguage[language] = candidate;
    }
  });

  desired_languages.forEach((language) => {
    if (bestByLanguage[language]) {
      selected_audio_indices.push(bestByLanguage[language].index);
      selected_audio_langs.push(language);
    }
  });

  if (selected_audio_indices.length == 0) {
    args.jobLog("Could not find any desired languages! Using the first audio track instead.")
    selected_audio_indices.push("a:0");
    selected_audio_langs.push("Unknown")
  }

  args.variables.selected_audio_indices = selected_audio_indices;
  args.jobLog("Selected audio indices:" + selected_audio_indices + "(languages " + selected_audio_langs + ")");
  args.variables.primary_audio_index = selected_audio_indices[0];


  return {
    outputFileObj: args.inputFileObj,
    outputNumber: 1,
    variables: args.variables,
  };
}
