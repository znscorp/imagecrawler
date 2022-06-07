const Apify = require('apify');
const routes = require('./routes');
const extractors = require('./extractors');

const {
    utils: { log },
} = Apify;

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
exports.getSources = async() => {
    var { url, keyword } = global.inputData || {};
    log.debug('Getting sources');

    const queue = new Array();

    if( keyword.length > 0 ){        

        for( word of keyword ){

            /*
            - 검색단어 기준
            as_q ※ 일반검색
            as_epq ※ 단어 또는 문구 전체포함 검색
            as_oq ※ 단어 중 하나 이상 포함 ( or )
            as_eq ※ 단어 제외
            
            q 파라미터에 옵션검색 조건 걸어도 상관없음
            검색옵션
                "" 해당 단어 포함검색
                - 제외검색어
                ~ 유의어 검색
                or 두단어 검색
                                
            
            - 이미지 유형검색
            itp:face ※ 얼굴
            itp:photo ※ 사진검색
            itp:clipart ※ 클립아트
            itp:lineart ※ 라인아트
            itp:animated ※ 애니메이션 ( 움짤 )
            */
            var queryString = `q=${encodeURIComponent(word)}`;
            // if( word.match(/\"(.*)\"/) ){
            //     word = word.replace(/\"/gi, "")
            //     queryString = `as_epq=${encodeURIComponent(word)}`;
            // }

            let url = `https://www.google.co.kr/search?${queryString}&as_st=y&tbm=isch&hl=ko&cr=&as_sitesearch=&safe=images&tbs=`;
            let que = {
                url,
                userData: {
                    label: 'SEARCH',
                    page: 1,
                    baseURL: url,
                    keyword: word,
                    retry: 0,
                    cnt: 0
                }
            }
            
            queue.push(que);
        }

        const logger = {            
            requestSize : queue.length
        }

        extractors.znsLogger(logger);

        return queue;
    }
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

// Creates proxy URL
//exports.createProxyUrl = session => `http://session-${session}:${process.env.APIFY_PROXY_PASSWORD}@proxy.apify.com:8000`;
exports.createProxyUrl = session => `http://auto:LcAHsscRtCk6zCWi3jDpFLmer@proxy.apify.com:8000`;

