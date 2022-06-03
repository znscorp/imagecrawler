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

    let keyword = userData.newKeyword;
    const newKeyword = userData.newKeyword;
    const orgKeyword = userData.orgKeyword;

    // origin keyword
    logger.Keyword = orgKeyword;
    logger.SearchURL = userData.baseURL;

    if( keyword.match(/\"(.*)\"/) ){
        keyword = keyword.replace(/\"/gi, "");
    }

    // 상품명으로 저장 불가능한 특수문자 제거
    keyword = keyword.replace(/\s|[\|\*\/\?\<\>\:\\]/gi, "_");

    if( items.length > 0 ){       
        for( var i = 0; i < items.length; i++ ){

            if( tcnt == maxCnt ) break;
            
            const img = items.eq(i).find('img');
            const alt = img.attr('alt').trim();

            const s = new difflib.SequenceMatcher(null, orgKeyword, alt);
            const diffRatio = s.ratio();

            // 긁어온 상품과 키워드 매칭율 비교
            if( diffRatio < 0.5 ) continue;

            const src = img.attr('src');
            const imgnm = `${keyword}-${tcnt+1}.jpg`;
            
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
        const setKeyword = `${newKeyword}`;
        const queryString = `q=${encodeURIComponent(setKeyword)}`;
        const shopUrl = `https://www.google.co.kr/search?${queryString}&hl=ko&tbm=shop&psb=1&ved=2`;

        await requestQueue.addRequest({
            url : shopUrl,
            userData : {
                label: 'SHOPPING',
                page: userData.page,
                baseURL: shopUrl,
                newKeyword: setKeyword,
                orgKeyword: orgKeyword,
                retry: userData.retry,
                cnt: tcnt
            }
        });
    }
    else{
        logger.lastQueue = true;
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
    let tcnt = userData.cnt;
    
    const list = $('.sh-pr__product-results');
    const items = list.find('.sh-dgr__grid-result');

    let keyword = userData.newKeyword;
    let orgKeyword = userData.orgKeyword;
    let nameKeyword = "";

    // origin keyword
    logger.Keyword = orgKeyword;
    logger.SearchURL = userData.baseURL;

    if( keyword.match(/\"(.*)\"/) ){
        nameKeyword = orgKeyword.replace(/\"/gi, "");
    }

    // 상품명으로 저장 불가능한 특수문자 제거
    nameKeyword = orgKeyword.replace(/\s|[\|\*\/\?\<\>\:\\]/gi, "_");

    if( items.length > 0 ){
        
        for( var i = 0; i < items.length; i++ ){

            if( tcnt == maxCnt ) break;

            const img = items.eq(i).find('img');
            const alt = items.eq(i).find('h4.Xjkr3b').text().trim();

            // 긁어온 상품과 키워드 매칭율 비교
            const s = new difflib.SequenceMatcher(null, orgKeyword, alt);
            const diffRatio = s.ratio();

            if( diffRatio < 0.45 ) continue;

            const src = img.attr('src');
            const imgnm = `${nameKeyword}-${tcnt+1}.jpg`;

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
                newKeyword: newKeyword,
                orgKeyword: orgKeyword,
                retry : userData.retry,
                cnt: tcnt
            },
        });
    }
    else{
        logger.lastQueue = true;
    }
    
    logger.ImageCount = tcnt;
    logger.type = 'SHOPPING';
    extractors.znsLogger(logger);
}