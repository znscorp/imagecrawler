const Apify = require('apify');
const tools = require('./tools');
const cheerio = require('cheerio');

const {
    utils: { log, requestAsBrowser },
} = Apify;



// Create crawler
Apify.main(async() => {


    /*
    
    // 2022-02-20 url 테스트...
    https://www.gnc.com/on/demandware.store/Sites-GNC2-Site/default/Product-Variation?pid=GNCAMPWheybolic&dwvar_GNCAMPWheybolic_flavor=Chocolate%20Fudge&dwvar_GNCAMPWheybolic_displaycount=25%20Servings&source=detail&version=new

    https://www.gnc.com/on/demandware.store/Sites-GNC2-Site/default/Product-Variation?pid=ProPerformanceWhey&dwvar_ProPerformanceWhey_flavor=Vanilla%20Cream&dwvar_ProPerformanceWhey_displaycount=64%20Servings&source=detail&version=new&sourcetype=
        
    */

    // console.log("2021-04-02 부로 GNC 일시 정지됩니다.");
    // return;
    var _TOTAL_ = 0;

    log.info('PHASE -- STARTING ACTOR.');

    global.inputData = await Apify.getInput();
    log.info('ACTOR OPTIONS: -- ', global.inputData);

    // Validate input
    tools.checkInput();

    // Create request queue
    const requestQueue = await Apify.openRequestQueue();
 
    // Initialize first request
    const pages = await tools.getSources();

    for (const page of pages) {
        await requestQueue.addRequest({...page });
    }

    // Create route
    const router = tools.createRouter({ requestQueue });

    // vpn - custom
    // const BaseproxyConfiguration = await Apify.createProxyConfiguration({
    //     // groups: ['GROUP1', 'GROUP2'] // List of Apify Proxy groups
    //     groups: ['RESIDENTIAL'], 
    //     countryCode: 'US', /* opts */ 
    // });
    // const proxyConfiguration = await Apify.createProxyConfiguration({
    //     proxyUrls: [ BaseproxyConfiguration.newUrl("sessionnewJOB1")  ]
    // });

    const sessionPool = await Apify.openSessionPool({        
        persistStateKeyValueStoreId: 'my-key-value-store-for-sessions',
        persistStateKey: 'my-session-pool',
    });
    
    // Get random session from the pool
    const session1 = await sessionPool.getSession();

    // const proxyInfo = proxyConfiguration.newProxyInfo();
    // console.log(proxyInfo);

    //const proxyConfiguration = await Apify.createProxyConfiguration();



    log.info('PHASE -- SETTING UP CRAWLER.');
    var browser;
    const crawler = new Apify.PuppeteerCrawler({
        requestQueue,
        //proxyConfiguration,                                                 // OK -> IP 변환 법칙 1
        minConcurrency: 1,
        maxConcurrency: 1,
        handlePageTimeoutSecs: 86400,
        useSessionPool: true,
        sessionPoolOptions: {
            sessionOptions: {
                maxErrorScore: 1,
                errorScoreDecrement: 0,
            }
        },

        puppeteerPoolOptions: {                             // https://sdk.apify.com/docs/0.22.4/typedefs/puppeteer-pool-options#maxopenpagesperinstance
            maxOpenPagesPerInstance: 1,                       // TAB 2개 까지 허용
            retireInstanceAfterRequestCount: 20,            // OK -> IP 변환 법칙 2
            puppeteerOperationTimeoutSecs: 15,
            killInstanceAfterSecs: 300,
        },

        
        // persistCookiesPerSession: true,
       
        launchPuppeteerOptions: {
            // useChrome: true,

            // useApifyProxy: !_debug_, // APIFY  0.21.0  이상부터 안됩니다.
            // headless: !_debug_,
            // useApifyProxy: true,
            // headless: false, // 
            // // slowMo:10,
            // //proxyUrl: tools.createProxyUrl(),
            // stealth: true,
			// args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting medium', '--enable-automation', '--disable-web-security']

            apifyProxySession: Math.random().toString() ,   // OK -> IP 변환 법칙 3
            // useChrome: true,
            // useApifyProxy: !_debug_, // APIFY  0.21.0  이상부터 안됩니다.
            // headless: !_debug_,
            devtools: false,
            ignoreHTTPSErrors: true,

            useApifyProxy: false,
            headless: true,  // stealth: true,
            slowMo: 1,
            //proxyUrl: tools.createProxyUrl(),
			args: ['--enable-gpu', '--no-sandbox', '--disable-setuid-sandbox']
            
        },
        launchPuppeteerFunction: (opts) => {
            opts.defaultViewport = {"width":1920,"height":1024};
            // opts.userAgent = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36";
            browser = Apify.launchPuppeteer(opts);
            return browser;
        },
        //apify 1.1.1 version
        // launchContext: {
        //     // useChrome: true, // Apify option
        //     // stealth: true,
        //     launchOptions: {
        //        useApifyProxy: true,
        //         headless: true, // Puppeteer option
        //         args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting medium'],
        //     }
        // },
        gotoFunction : async ({ request, page, puppeteerPool }) => {

            // const response = page.goto(request.url).catch(() => null)
            // if (!response) {
            //     await puppeteerPool.retire(page.browser());
            //     throw new Error(`Page didn't load for ${request.url}`);
            // }
            // return response;

            // const origin_cookies = await page.cookies();
            // console.log(origin_cookies);
            

            await page.setExtraHTTPHeaders({
                // 'referer': request.url,
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                // 'synthetic-request-for-logging': '1',
                'sec-ch-ua' : `" Not A;Brand";v="99", "Chromium";v="101", "Google Chrome";v="101"`,
                'sec-ch-ua-mobile' : '?0',
                'sec-ch-ua-platform' : 'Windows',
                'Sec-Fetch-Site' : 'none',
                'Sec-Fetch-Mode' : 'navigate',
                'sec-ch-ua-platform' : '?1',
                'Sec-Fetch-Dest' : 'document',
            });
            

            //Randomize viewport size            
            await page.setViewport({
                width: 1920 + Math.floor(Math.random() * 100),
                height: 3000 + Math.floor(Math.random() * 100),
                deviceScaleFactor: 2,
                hasTouch: false,
                isLandscape: false,
                isMobile: false,
            });


            await page.setJavaScriptEnabled(true);
            await page.setDefaultNavigationTimeout(0);

            // Skip images/styles/fonts loading for performance
            await page.setRequestInterception(true);
            await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.67 Safari/537.36");

            ////  // Block requests - 이거 버전에 따라 안됨
            ////  await puppeteer.blockRequests(page, {
            ////     urlPatterns: ['.ico', '.css', '.jpg', '.jpeg', '.png', '.svg', '.gif', '.woff', '.pdf', '.zip', '*ads*', '*analytics*', '*facebook*', '*optimizely*', '*webp*', '*youtube*', '*bing*'],
            ////  });


            // // 2021-10-14 예전 스타일
            page.on('request', (req) => {
            //  console.log( req.resourceType());
            //  if(req.resourceType() == 'font' || req.resourceType() == 'image'){
                if(req.resourceType() == 'font' || req.resourceType() == ''){
                    req.abort();
                } else {
                    req.continue();
                }
            });


            await page.evaluateOnNewDocument(() => {
                // Pass chrome check
                window.chrome = {
                    runtime: function(){},
                    loadTimes: function(){},
                    csi: function(){},
                    // etc.
                };
                window.navigator.webdriver = false;
            });

            // await page.evaluateOnNewDocument(() => {
            //     //  Pass webdriver check
            //      Object.defineProperty(navigator, 'webdriver', {
            //          get: () => false,
            //      });
            //  });

            await page.evaluateOnNewDocument(() => {
                // Overwrite the `plugins` property to use a custom getter.
                Object.defineProperty(navigator, 'plugins', {
                    // This just needs to have `length > 0` for the current test,
                    // but we could mock the plugins too if necessary.
                    get: () => JSON.parse('{"0":{"0":{},"1":{}},"1":{"0":{},"1":{}},"2":{"0":{},"1":{}},"3":{"0":{},"1":{}},"4":{"0":{},"1":{}}}'),
                });
            });

            await page.evaluateOnNewDocument(() => {

                // Overwrite the `languages` property to use a custom getter.
                Object.defineProperty(navigator, 'languages', {
                    get: function () {
                        return ['ko-KR', 'ko'];
                    },
                });
            });

            await page.evaluateOnNewDocument(() => {
                //Pass notifications check
                const originalQuery = window.navigator.permissions.query;
                return window.navigator.permissions.query = (parameters) => (
                    parameters.name === 'notifications' ?
                        Promise.resolve({ state: Notification.permission }) :
                        originalQuery(parameters)
                );
            });


            return page.goto(request.url, { timeout: 60000 })
        },
        handlePageFunction: async({ page, request }) => {

            console.log(`Processing ${request.url}...`);

            await page.keyboard.press('Enter'); // 엔터 한번 박고 시작.

            // 사용자 jqeury 사용
            await Apify.utils.puppeteer.injectJQuery(page);
        
            // debug
            // if((log.getLevel() == log.LEVELS.DEBUG || global.inputData.url == "9998" || global.inputData.url == "9997")) {
            //     var fileName = `${dir}/first.jpeg`;
            //     await page.screenshot({ path: fileName, fullPage: true });
            // }

            const _html = await page.content();

            // 스크린 캡처
            //const fileName = `${String(tools.getRandomInt(0, 99999999999))}_log`;

            // Capture the screenshot
            //var screenshot = await page.screenshot({ fullPage: true });
            // Save the screenshot to the default key-value store
            //await Apify.setValue(`${fileName}_${_TOTAL_}_1`, screenshot, { contentType: 'image/png' });

            // // 허웅 생성.
            var context = {
                id: _TOTAL_++,
                $ : await cheerio.load(_html),
                request : request
            };

            // console.log("==================================");
            // console.log(request.userData.label);
            // console.log(tools.blockSearch(context.$));
            // console.log("==================================");
            // let elm = false;

            // if( elm || tools.blockSearch(context.$) ){ // 첫 관문부터 캡챠로 막혀있다면
 
            //     if(!elm)
            //      elm = await (await page.waitForSelector("#px-captcha", { visible: true, timeout: 15000  }));

            //     let bounding_box = await elm.boundingBox();
            //     // console.log("-----------------");
            //     // console.log(bounding_box);
            //     // console.log("-----------------");

            //     let x = bounding_box.x + bounding_box.width / 2;
            //     let y = bounding_box.y + bounding_box.height / 2;                

            //     console.log("click--->", x , y);
            //     await page.mouse.click(x, y, { button: 'left' , delay: 30000 }); // 캡챠 버튼 클릭 


            //     // 스크린 캡처
            //     // Capture the screenshot
            //     var screenshot = await page.screenshot({ fullPage: true });
            //     // Save the screenshot to the default key-value store
            //     await Apify.setValue(`${fileName}_${_TOTAL_}_2`, screenshot, { contentType: 'image/png' });

            //     //console.log("BLOCK T_T");                

            //     //await page.waitFor(5000);

            //     // 스크린 캡처
            //     // Capture the screenshot
            //     var screenshot = await page.screenshot({ fullPage: true });
            //     // Save the screenshot to the default key-value store
            //     await Apify.setValue(`${fileName}_${_TOTAL_}_3`, screenshot, { contentType: 'image/png' });

            //     console.log("p_url return GO =--->" +  request.url );

            //     await requestQueue.addRequest({
            //         url: request.url,
            //         uniqueKey: request.url + String(tools.getRandomInt(0, 99999999999)),
            //         userData: request.userData,
            //     });
                
            //     return ;               
            
            // }

            // console.log("캡챠가 작동되었으나 .... 뚫어버리고 말았습니다..");

            // await page.mouse.wheel({ deltaY: 51000 });
            // await page.waitFor((tools.getRandomInt(1000, 2000)));
            // await page.mouse.wheel({ deltaY: 0 });            

            // for(var i = 0; i < 21; i++) {
            //     await page.keyboard.press('Tab'); 
            //     await page.keyboard.press('Escape'); 
            // }
            // await page.keyboard.press('Enter');
            // await page.waitFor(2000);


            // Redirect to route
            await router(request.userData.label, context);

            // if(_TOTAL_ == 1){
            //     context.$ = await cheerio.load(_html);
            //     await router("LIST", context);
            // }            
 

            // // 스크린 캡처
            // var fileName = `${dir}/c.jpeg`;
            // await page.screenshot({ path: fileName, fullPage: true });
            // await Apify.pushData({ "content" : content });

            // Store the results to the default dataset.
            // await Apify.pushData(request.userData);
            // await Apify.pushData(... content );

        },
        // This function is called if the page processing failed more than maxRequestRetries+1 times.
        handleFailedRequestFunction: async ({ request }) => {
            console.log(`Request ${request.url} failed too many times.`);
        }
    });
    
    
    /*
    // 이전 Main
    const crawler = new Apify.CheerioCrawler({
        requestQueue,
        proxyConfiguration,
        handleRequestTimeoutSecs: 60,
        maxRequestRetries: 10,
        maxConcurrency: 5,
        ignoreSslErrors: true,
        //maxRequestsPerCrawl: 500,
        useSessionPool: true,
        sessionPoolOptions: {
            maxPoolSize: (log.getLevel() == log.LEVELS.DEBUG || global.inputData.url == "9998" || global.inputData.url == "9997") ? 1 : 4096
        },

        handlePageFunction: async(context) => {
            const { request, response, html } = context;
            log.debug(`CRAWLER -- Processing ${request.url}`);

            // Status code check
            if (!response || response.statusCode !== 200) {
                throw new Error(`We got blocked by target on ${request.url}`);
            }
            
            const data = html;

            if (log.getLevel() == log.LEVELS.DEBUG) {
                // log.debug('body data: ', data);
                console.log(html);
            }

            // Add to context
            context.data = data;

            // Redirect to route
            await router(request.userData.label, context);
        },

    });
    */



    log.info('PHASE -- STARTING CRAWLER.');
    await crawler.run();
    log.info('PHASE -- ACTOR FINISHED.');

 
});
