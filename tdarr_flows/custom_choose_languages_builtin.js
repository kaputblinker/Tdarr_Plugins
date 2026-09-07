
module.exports = async (args) => {

    audio_channel_precedence = [6, 8, 2, 1];
    audio_stream_precedence = ["truehd", "flac", "dts", "eac3", "ac3", "alac", "wav", "pcm"];
    desired_languages = ["eng", "spa"];

    const data = args.deps.fsextra.readJsonSync("".concat(args.workDir, "/arr.json"), { throws: false })?.data;
    var orlang_id = data && data.movie
        ? data.movie.originalLanguage.id
        : (data && data.series
            ? data.series.originalLanguage.id : null);


    args.jobLog("Found original language in arr.json: " + orlang_id);


    // alpha2ToAlpha3B = { "aa": "aar", "ab": "abk", "ae": "ave", "af": "afr", "ak": "aka", "am": "amh", "an": "arg", "ar": "ara", "as": "asm", "av": "ava", "ay": "aym", "az": "aze", "ba": "bak", "be": "bel", "bg": "bul", "bh": "bih", "bi": "bis", "bm": "bam", "bn": "ben", "bo": "tib", "br": "bre", "bs": "bos", "ca": "cat", "ce": "che", "ch": "cha", "co": "cos", "cr": "cre", "cs": "cze", "cu": "chu", "cv": "chv", "cy": "wel", "da": "dan", "de": "ger", "dv": "div", "dz": "dzo", "ee": "ewe", "el": "gre", "en": "eng", "eo": "epo", "es": "spa", "et": "est", "eu": "baq", "fa": "per", "ff": "ful", "fi": "fin", "fj": "fij", "fo": "fao", "fr": "fre", "fy": "fry", "ga": "gle", "gd": "gla", "gl": "glg", "gn": "grn", "gu": "guj", "gv": "glv", "ha": "hau", "he": "heb", "hi": "hin", "ho": "hmo", "hr": "hrv", "ht": "hat", "hu": "hun", "hy": "arm", "hz": "her", "ia": "ina", "id": "ind", "ie": "ile", "ig": "ibo", "ii": "iii", "ik": "ipk", "io": "ido", "is": "ice", "it": "ita", "iu": "iku", "ja": "jpn", "jv": "jav", "ka": "geo", "kg": "kon", "ki": "kik", "kj": "kua", "kk": "kaz", "kl": "kal", "km": "khm", "kn": "kan", "ko": "kor", "kr": "kau", "ks": "kas", "ku": "kur", "kv": "kom", "kw": "cor", "ky": "kir", "la": "lat", "lb": "ltz", "lg": "lug", "li": "lim", "ln": "lin", "lo": "lao", "lt": "lit", "lu": "lub", "lv": "lav", "mg": "mlg", "mh": "mah", "mi": "mao", "mk": "mac", "ml": "mal", "mn": "mon", "mr": "mar", "ms": "may", "mt": "mlt", "my": "bur", "na": "nau", "nb": "nob", "nd": "nde", "ne": "nep", "ng": "ndo", "nl": "dut", "nn": "nno", "no": "nor", "nr": "nbl", "nv": "nav", "ny": "nya", "oc": "oci", "oj": "oji", "om": "orm", "or": "ori", "os": "oss", "pa": "pan", "pi": "pli", "pl": "pol", "ps": "pus", "pt": "por", "qu": "que", "rm": "roh", "rn": "run", "ro": "rum", "ru": "rus", "rw": "kin", "sa": "san", "sc": "srd", "sd": "snd", "se": "sme", "sg": "sag", "si": "sin", "sk": "slo", "sl": "slv", "sm": "smo", "sn": "sna", "so": "som", "sq": "alb", "sr": "srp", "ss": "ssw", "st": "sot", "su": "sun", "sv": "swe", "sw": "swa", "ta": "tam", "te": "tel", "tg": "tgk", "th": "tha", "ti": "tir", "tk": "tuk", "tl": "tgl", "tn": "tsn", "to": "ton", "tr": "tur", "ts": "tso", "tt": "tat", "tw": "twi", "ty": "tah", "ug": "uig", "uk": "ukr", "ur": "urd", "uz": "uzb", "ve": "ven", "vi": "vie", "vo": "vol", "wa": "wln", "wo": "wol", "xh": "xho", "yi": "yid", "yo": "yor", "za": "zha", "zh": "chi", "zu": "zul" };
    // from https://github.com/Radarr/Radarr/blob/develop/src/NzbDrone.Core/Languages/Language.cs which matches the Sonarr equivalent exept longer.
    const arrIdToAlpha3B = { "0": null, "1": "eng", "2": "fre", "3": "spa", "4": "ger", "5": "ita", "6": "dan", "7": "dut", "8": "jpn", "9": "ice", "10": "chi", "11": "rus", "12": "pol", "13": "vie", "14": "swe", "15": "nor", "16": "fin", "17": "tur", "18": "por", "19": "dut", "20": "gre", "21": "kor", "22": "hun", "23": "heb", "24": "lit", "25": "cze", "26": "ara", "27": "hin", "28": "bul", "29": "mal", "30": "ukr", "31": "slo", "32": "tha", "33": "por", "34": "spa", "35": "rum", "36": "lav", "37": "per", "38": "cat", "39": "hrv", "40": "srp", "41": "bos", "42": "est", "43": "tam", "44": "ind", "45": "mac", "46": "slv"};

    args.variables.original_language = null;
    if (orlang_id !== null && arrIdToAlpha3B[orlang_id]) {
        args.variables.original_language = arrIdToAlpha3B[orlang_id];
    }

    args.jobLog("Original Language: " + args.variables.original_language);

    if (args.variables.original_language && !desired_languages.includes(args.variables.original_language)) {
        desired_languages.push(args.variables.original_language);
    }
    args.jobLog("Desired languages: " + desired_languages.join(", "));
    const selected_audio_indices = [];
    const selected_audio_langs = [];
    const bestByLanguage = {};
    const allLanguages = [];

    args.inputFileObj.ffProbeData.streams.forEach((stream, index) => {
        if (stream.codec_type !== "audio") return;

        const language = (stream.tags?.language || "und").toLowerCase();
        allLanguages.push([index, language]);
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
        const [index, language] = allLanguages[0];
        selected_audio_indices.push(index);
        selected_audio_langs.push(language)
    }

    args.variables.selected_audio_indices = selected_audio_indices;
    args.variables.selected_audio_langs = selected_audio_langs;
    args.jobLog("Selected audio indices:" + selected_audio_indices + "(languages " + selected_audio_langs + ")");
    args.variables.primary_audio_index = selected_audio_indices[0];
    args.variables.primary_audio_lang = selected_audio_langs[0];

    if(!args.variables.original_language) {
        args.jobLog("No original language found, failing");
    }

    return {
        outputFileObj: args.inputFileObj,
        outputNumber: args.variables.original_language ? 1 : 4,
        variables: args.variables,
    };
}
