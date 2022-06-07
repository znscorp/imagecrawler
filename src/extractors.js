// const Apify = require('apify');
// const cheerio = require('cheerio');
// const tools = require('./tools');
const sharp = require('sharp');
const fs = require('fs');
const crypto = require('crypto');

const logfile = `zns-logger-${Date.now()}.log`;

const ImageToBuffer = async( data, quality ) => {
    
    let buffer;
    const maxSize = 200;

    if( data ){
        const buff = await sharp(data)            
            .toBuffer({ resolveWithObject: true });

        if( buff.info && 
            (buff.info.width > 10 && 
            buff.info.height > 10) ){

            // 리사이즈 비율계산
            const ratio = buff.info.width / buff.info.height;           

            // 넓이, 높이 비율이 0.6 이상인 이미지만 ( 제품상세쪽 빼기위함 )
            if( ratio > 0.6 ){
                
                // 이미지가 200보다 클경우에만 넓이를 200에 맞춤
                let width = buff.info.width;                
                if( width > 200 ){
                    width = maxSize;
                }

                const height = Math.round(width / ratio);

                buffer = await sharp(buff.data)
                            .resize(width, height)
                            .jpeg({
                                'quality': quality
                            })
                            .toBuffer({ resolveWithObject: true });
                
                const kB = buffer.info.size / 1024;

                if( kB > 200 ){
                    quality = quality-10;

                    console.log(`info image size up to 200kB : ${kB}kB and down quality : ${quality}`);
                    buffer = await ImageToBuffer(buffer.data, quality);
                }
            }
        }
    }

    return buffer;
}


const BufferToImage = async(buffer, imgnm) => {

    const dir = './google-images/';
    if( !fs.existsSync(dir) ){
        fs.mkdirSync(dir, {recursive: true});
    }
    
    await sharp(buffer).toFile(`${dir}${imgnm}`, (err) => {
        
        const logger = {
            error : err
        };

        if(!err) console.log(`image save success!! ${imgnm}`);
        else znsLogger(logger);
    });

};

const znsLogger = async (logger) => {

    const dir = './google-logger/';

    logger.Time = new Date().toISOString();

    if( !fs.existsSync(dir) ){
        fs.mkdirSync(dir, {recursive: true});
    }

    logger = `\n${JSON.stringify(logger)}`;

    fs.appendFile(`${dir}${logfile}`, logger, (err) => {
        if(err) console.log(err)
        else(`log file create success!!!`);
    });
}


const stringToHash = (string) => {

    const secret = 'zns0$6$07$%@^&!@#';
    const hash = crypto.createHmac('sha256', secret)
                                .update(string).digest('hex');

    return hash;
}

module.exports = {
    BufferToImage,
    ImageToBuffer,
    stringToHash,
    znsLogger 
};