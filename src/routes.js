// routes.js
const Apify = require('apify');
const extractors = require('./extractors');
const tools = require('./tools');
const axios = require('axios');
const difflib = require('difflib');

const {
    utils: { log },
} = Apify;

// LIST page crawler.
// Fetches the products and crawls through detail
// Move next page if needed
exports.SEARCH = async({ $, request }, { requestQueue }) => {
    
    let userData = request.userData;
    // let { page, baseURL, keyword, retry, cnt } = request.userData;
    log.info(`CRAWLER -- Fetching products from the list with page: ${userData.page}, url: ${userData.baseURL}`);
    
    const maxCnt = 3;
    let tcnt = userData.cnt;
    const quality = 100;
    const searchPage = $('.mJxzWe');
    const searchList = searchPage.find('#islrg');
    let items = searchList.find('div.isv-r');
    const logger = {};

    let keyword = userData.keyword;
    let hash = userData.hash ? userData.hash : extractors.stringToHash(keyword);

    // origin keyword
    logger.Keyword = keyword;
    logger.SearchURL = userData.baseURL;

    if( items.length > 0 ){       
        for( var i = 0; i < items.length; i++ ){

            if( tcnt == maxCnt ) break;
            
            const img = items.eq(i).find('img');
            const alt = img.attr('alt').trim();

            const s = new difflib.SequenceMatcher(null, keyword, alt);
            const diffRatio = s.ratio();

            // 긁어온 상품과 키워드 매칭율 비교
            if( diffRatio < 0.5 ) continue;

            const src = img.attr('src');
            const imgnm = `${hash}-${tcnt+1}.jpg`;
            
            if( src ){
                if( src.search(/;base64,/gi) != -1 ){
                    const bs64 = src.split(';base64,').pop();
                    const buff = Buffer.from(bs64, 'base64');
                    const buffer = await extractors.ImageToBuffer(buff, quality);

                    if( typeof buffer == 'object' ){
                        // save Image
                        logger[`${i+1}`] = buffer.info;
                        await extractors.BufferToImage(buffer.data, imgnm);                        
                        tcnt++;
                    }
                }
                else{
                    await axios.get(src, { 
                            responseType: 'arraybuffer' 
                        })
                        .then(async (res) => {                        
                        const buff = res.data;
                        const buffer = await extractors.ImageToBuffer(buff, quality); 
                        
                        if( typeof buffer == 'object' ){
                            // save Image
                            logger[`${i+1}`] = buffer.info;
                            await extractors.BufferToImage(buffer.data, imgnm);
                            tcnt++;
                        }
                    });
                }
            }
        }
    }

    // 5번까지 재검색
    if( userData.retry < 5 &&
        tcnt < maxCnt ){
    
        // 우선 구글쇼핑 검색
        const setKeyword = `${keyword}`;
        const queryString = `q=${encodeURIComponent(setKeyword)}`;
        const shopUrl = `https://www.google.co.kr/search?${queryString}&hl=ko&tbm=shop&psb=1&ved=2`;

        await requestQueue.addRequest({
            url : shopUrl,
            userData : {
                label: 'SHOPPING',
                page: userData.page,
                baseURL: shopUrl,
                keyword: keyword,
                hash: hash,
                retry: userData.retry,
                cnt: tcnt,
                end: userData.end,
            }
        });
    }
    else{
        logger.lastQueue = true;
    }

    if( await requestQueue.isEmpty() ){

        const addQue = await tools.streamQueue(userData.end);
        if( addQue.length > 0 ){
            for( const que of addQue ){
                await requestQueue.addRequest(que);
            }
        }
    }

    logger.ImageCount = tcnt;
    logger.type = 'SEARCH';
    extractors.znsLogger(logger);
};

exports.SHOPPING = async({ $, request }, { requestQueue }) => {

    let userData = request.userData;
    // let { page, baseURL, keyword, retry, cnt } = request.userData;
    log.info(`CRAWLER -- Fetching products from the list with google shopping page: ${userData.page}, url: ${userData.baseURL}`);

    const logger = {};
    const quality = 100;
    const maxCnt = 3;    
    
    const list = $('.sh-pr__product-results');
    const items = list.find('.sh-dgr__grid-result');    
    const hash = userData.hash;

    let tcnt = userData.cnt;
    let keyword = userData.keyword;    

    // origin keyword
    logger.Keyword = keyword;
    logger.SearchURL = userData.baseURL;

    if( items.length > 0 ){
        
        for( var i = 0; i < items.length; i++ ){

            if( tcnt == maxCnt ) break;

            const img = items.eq(i).find('img');
            const alt = items.eq(i).find('h4.Xjkr3b').text().trim();

            // 긁어온 상품과 키워드 매칭율 비교
            const s = new difflib.SequenceMatcher(null, keyword, alt);
            const diffRatio = s.ratio();

            if( diffRatio < 0.45 ) continue;

            const src = img.attr('src');
            const imgnm = `${hash}-${tcnt+1}.jpg`;

            if( src ){
                await axios.get(src, {
                    responseType: 'arraybuffer'
                })
                .then(async (res) => {
                    const buff = res.data;
                    const buffer = await extractors.ImageToBuffer(buff, quality); 
                    
                    if( typeof buffer == 'object' ){
                        // save Image
                        logger[`${i+1}`] = buffer.info;
                        await extractors.BufferToImage(buffer.data, imgnm);                        
                        tcnt++;
                    }
                });
            }
        }
    }

    // 검색어 중에 대괄호및 소괄호 내용이 있을경우 없애고 재검색
    const Regex = /(\[.*?\])|(\(.*?\))/g;
    const get = keyword.match(Regex);
    if( (get != null && userData.retry < 5 && tcnt < maxCnt) ){
        
        const newKeyword = keyword.replace(get[0], " ").trim();
        logger.newKeyword = newKeyword;

        const setKeyword = `${newKeyword}`;
        const queryString = `q=${encodeURIComponent(setKeyword)}`;
        
        const addurl = `https://www.google.co.kr/search?${queryString}&as_st=y&tbm=isch&hl=ko&cr=&as_sitesearch=&safe=images&tbs=`;
        userData.retry++;

        await requestQueue.addRequest({
            url: addurl,
            userData: {
                label: 'SEARCH',
                page: userData.page,
                baseURL : addurl,
                keyword: newKeyword,
                hash: hash,
                retry : userData.retry,
                cnt: tcnt,
                end: userData.end,
            },
        });
    }
    else{
        logger.lastQueue = true;
        logger.ImageCount = tcnt;
    }

    if( await requestQueue.isEmpty() ){

        const addQue = await tools.streamQueue(userData.end);
        if( addQue.length > 0 ){
            for( const que of addQue ){
                await requestQueue.addRequest(que);
            }
        }
    }
    
    logger.type = 'SHOPPING';
    extractors.znsLogger(logger);
}