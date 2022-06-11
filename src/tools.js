const Apify = require('apify');
const routes = require('./routes');
const fs = require('fs');
const { parse } = require('csv-parse');

const {
    utils: { log },
} = Apify;

const stream = fs.createReadStream('./train_origin_product.csv');

exports.getRandomInt = (min, max) => { //min ~ max 사이의 임의의 정수 반환
    return Math.floor(Math.random() * (max - min)) + min;
}

exports.blockSearch = ($) => {
    var bscript = $("#px-captcha");
    // console.log(bscript);
    return bscript.length > 0 ? true : false;
}

// Builds url according to given inputs
exports.buildURL = (baseURL, nextPage) => {
    return `${baseURL.replace(/(&sz=\d+)|(&start=\d+)/g, '')}&sz=64&start=${64 * (nextPage - 1)}`;
};

// Retrieves sources and returns object for request list
exports.getSources = (keyword, end) => {
    // var { url, keyword } = global.inputData || {};
    log.debug('Getting sources');

    const queryString = `q=${encodeURIComponent(keyword)}`;
    const url = `https://www.google.co.kr/search?${queryString}&as_st=y&tbm=isch&hl=ko&cr=&as_sitesearch=&safe=images&tbs=`;

    return {
        url,
        userData: {
            label: 'SEARCH',            
            baseURL: url,
            keyword: keyword,
            retry: 0,
            cnt: 0,
            end: end
        }
    };
};

// Create router
exports.createRouter = (globalContext) => {
    return async function(routeName, requestContext) {
        const route = routes[routeName];
        if (!route) throw new Error(`No route for name: ${routeName}`);
        log.debug(`Invoking route: ${routeName}`);
        return route(requestContext, globalContext);
    };
};

// Validate actor input if usage is correct or not
exports.checkInput = () => {
    const { url, pages, keyword, category } = global.inputData || {};

    // Validate if input is fine
    if (url) {
        log.info(`ACTOR - URL ${url} WILL BE USED. IGNORING OTHER INPUTS`);
    } else if (!category && !keyword) {
        throw new Error('Category or keyword must be provided!');
    } else if (!pages) {
        throw new Error('Pages must be provided!');
    } else if (pages.replace(/\d|-|,/g, '').length !== 0) {
        throw new Error('Pages must be provided in correct format: 1-5 or 1,2,3,6');
    }

    log.info('ACTOR - INPUT DATA IS VALID');
};


exports.streamQueue = async (from) => {

    const LIMIT = 10;
    const start = from;
    const end = start + LIMIT;

    log.info(`ACTOR - ADD QUEUE FOR STREAM LIMIT ${start} ~ ${end}`);
    
    const parser = stream.pipe(
        parse({
            columns: true, 
            delimiter: ',',
            from: start,
            to: end,
            trim: true, 
            skip_empty_lines: true
        })
    );

    const queList = new Array();
    for await( csvData of parser ){

        const keyword = Object.values(csvData).join(',');
        queList.push(this.getSources(keyword, end));
    } 

    return queList;
};

// Creates proxy URL
//exports.createProxyUrl = session => `http://session-${session}:${process.env.APIFY_PROXY_PASSWORD}@proxy.apify.com:8000`;
exports.createProxyUrl = session => `http://auto:LcAHsscRtCk6zCWi3jDpFLmer@proxy.apify.com:8000`;

