const express = require('express');
const socketio = require('socket.io');
const http = require('http');
const ss = require('socket.io-stream');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');

const {PerformanceObserver, performance} = require('perf_hooks');

const api = require('./api');
// const {HOME} = require('./constants');

const PORT = 5000;

const app = express();
const server = http.createServer(app);
// const io = socketio(server);

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

api.getTracks({pathname:'/home'}, function (response) {
    console.log('resp', response);
});

// app.use(cors());
// app.get('/data', (req, res) => {
//     const filePath = path.resolve(__dirname, './private', './track2.mp3');
//
//     const HWM = 64 * 1024;
//     const chunk = 8;
//     const readStream_ = fs.createReadStream(filePath, {
//         highWaterMark: HWM,
//         start: chunk * HWM,
//         end: (chunk + 1) * HWM
//     });
//     return readStream_.pipe(res);
// });

const io = socketio.listen(server, {
    log: false,
    agent: false,
    origins: '*:*',
    transports: ['websocket', 'htmlfile', 'xhr-polling', 'jsonp-polling', 'polling']
});

// let synchToInt = synch => {
//     const mask = 0b01111111;
//     let b1 = synch & mask;
//     let b2 = (synch >> 8) & mask;
//     let b3 = (synch >> 16) & mask;
//     let b4 = (synch >> 24) & mask;
//
//     return b1 | (b2 << 7) | (b3 << 14) | (b4 << 21);
// };
//
// let decode = (format, string) => new TextDecoder(format).decode(string);

const MPEG_version = {
    '00': 'MPEG-2.5',
    '01': 'reserved',
    '10': 'MPEG-2',
    '11': 'MPEG-1'
};

const Layer_index = {
    '00': 'reserved',
    '01': 'Layer III',
    '10': 'Layer II',
    '11': 'Layer I'
};

const Frequency_index = {
    [MPEG_version['11']]: {
        '00': 44100,
        '01': 48000,
        '10': 32000
    },
    [MPEG_version['10']]: {
        '00': 22050,
        '01': 24000,
        '10': 16000
    },
    [MPEG_version['00']]: {
        '00': 11025,
        '01': 12000,
        '10': 8000
    }
};

// const samples_per_frame = new Map([
//     [[[MPEG_version['11'], Layer_index['11']]], 384],
//     [[[MPEG_version['10'], Layer_index['11']]], 384],
//     [[[MPEG_version['00'], Layer_index['11']]], 384],
//     [[[MPEG_version['11'], Layer_index['10']]], 1152],
//     [[[MPEG_version['10'], Layer_index['10']]], 1152],
//     [[[MPEG_version['00'], Layer_index['10']]], 1152],
//     [[[MPEG_version['11'], Layer_index['01']]], 1152],
//     [[[MPEG_version['10'], Layer_index['01']]], 576],
//     [[[MPEG_version['00'], Layer_index['01']]], 576]
// ]);

const samples_per_frame = {
    [MPEG_version['11']]: {
        [Layer_index['11']]: 384,
        [Layer_index['10']]: 1152,
        [Layer_index['01']]: 1152
    },
    [MPEG_version['10']]: {
        [Layer_index['11']]: 384,
        [Layer_index['10']]: 1152,
        [Layer_index['01']]: 576
    },
    [MPEG_version['00']]: {
        [Layer_index['11']]: 384,
        [Layer_index['10']]: 1152,
        [Layer_index['01']]: 576
    }
};

// const compareArrays = (array1, array2) => {
//     return array1.length === array2.length && array1.sort().every((value, index) => {
//         return value === array2.sort()[index]
//     });
// };
//
// console.log(compareArrays([1, 2], [1, 2]));

// function hex2a(hexx) {
//     let hex = hexx.toString();
//     let str = '';
//     for (let i = 0; (i < hex.length && hex.substr(i, 2) !== '00'); i += 2)
//         str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
//     return str;
// }
//
// function convert(hex) {
//     return (parseInt(hex, 16).toString(2)).padStart(8, '0');
// }
//
// function hex2bin(hex) {
//     let hexStr = hex.split('');
//     let result = "";
//     let offset = 0;
//     while (offset < hexStr.length) {
//         result += convert(hexStr[offset] + '' + hexStr[offset + 1]);
//         offset += 2;
//     }
//     // console.log(result);
//     return result;
// }

io.on('connection', client => {

    console.log('Client connected');

     let filePath = null;
     let stat = null;
     let fileSize = null;
     let chunkSize = null;
     // let fileDuration = null;

    // const stream = ss.createStream();

    client.on('addTrack', () => {

    });

    client.on('getTracks', ({pathname}, callback) => {
        console.log(pathname);

        api.getTracks({pathname}, function (response) {
            console.log('resp', response);

            callback(response);
        });
    });

    client.on('track', () => {
        //search in DB by id, get filePath

        filePath = path.resolve(__dirname, './private', './track2.mp3');
        stat = fs.statSync(filePath);
        fileSize = stat.size;
        chunkSize = Math.floor(fileSize / 10);

        console.log('track event fileSize:', fileSize);
        const readStream = fs.createReadStream(filePath, {start: 0, end: 100});

        let offset;

        readStream.on('data', (chunk) => {
            // offset = chunk.lastIndexOf(new Uint8Array([255, 251]));
            //     const hexString = chunk.toString('hex');
            //     let binString = hex2bin(hexString);
            //
            //     let mpeg_version = null;
            //     let layout_version = null;
            //     let samples_number = null;
            //
            //     let First_Frame_header_position = 0;
            //     let offset = 0;
            //     while (offset <= binString.length) {
            //         const sync = binString.substr(offset, 11);
            //         // console.log(sync);
            //         if (sync === '11111111111') {
            //             First_Frame_header_position = offset;
            //             break;
            //         } else {
            //             ++offset;
            //         }
            //     }
            //
            //     let Xing_VBRI_header_position = null;
            //     if (offset !== binString.length) {
            //         Xing_VBRI_header_position = First_Frame_header_position + 4 * 8 + 32 * 8;
            //         console.log('xing ' + Xing_VBRI_header_position);
            //         const info = hex2a(parseInt(binString.substr(Xing_VBRI_header_position, 32), 2).toString(16));
            //         console.log(info);
            //         let numberOfFrames_position = null;
            //         let sample_frequency = null;
            //         let time_per_frame = null;
            //         if (info === 'Xing' || info === 'Info') {
            //             console.log('This is a VBR MP3 with Xing header');
            //             numberOfFrames_position = Xing_VBRI_header_position + 8 * 8;
            //             console.log('numberOfFrames_position ' + numberOfFrames_position);
            //             console.log(binString.substr(numberOfFrames_position, 32));
            //
            //             numberOfFrames = parseInt(binString.substr(numberOfFrames_position, 32), 2);
            //             console.log("numberOfFrames", numberOfFrames);
            //             mpeg_version = MPEG_version[binString.substr(11, 2)];
            //             console.log("mpeg_version", mpeg_version);
            //             layout_version = Layer_index[binString.substr(13, 2)];
            //             console.log("layout_version", layout_version);
            //             samples_number = samples_per_frame[mpeg_version][layout_version];
            //             // samples_number = samples_per_frame.get([mpeg_version, layout_version]);
            //             console.log("samples_number", samples_number);
            //             sample_frequency = Frequency_index[mpeg_version][binString.substr(20, 2)];
            //             console.log("sample_frequency", sample_frequency);
            //             time_per_frame = samples_number / sample_frequency;
            //             console.log("time_per_frame", time_per_frame);
            //             fileDuration = time_per_frame * numberOfFrames;
            //             console.log("fileDuration", fileDuration);
            //         } else if (info === 'VBRI') {
            //             console.log('This is a VBR MP3 with VBRI header');
            //         } else {
            //             console.log('This is a CBR MP3');
            //         }
            //     } else {
            //         console.log('frame not found!');
            //     }
            //
            //     console.log('Xing_VBRI_header_position', Xing_VBRI_header_position / 8);
        });

        client.emit('metadata', {
            fileSize, chunkSize
        });
    });

    client.on('play', ({startSize}) => {
        // let numberOfFrames = 0;
        // let numberOfChunks = 0;
        console.log('play');

        console.log('chunkSize', chunkSize);
        console.log('startSize', startSize);

        // const HWM = 64 * 1024;
        //     // const chunk_ = 8;
        //     const readStream_ = fs.createReadStream(filePath, {
        //         highWaterMark: HWM,
        //         start: chunk_ * HWM,
        //         end: (chunk_ + 5) * HWM
        //     });

        console.log('chunkSize', chunkSize);

        const readStream_ = fs.createReadStream(filePath, {
            highWaterMark: chunkSize,
            start: startSize,
            end: fileSize
        });

        let offset_ = 0;
        let chunkBuffer = null;

        readStream_.on('data', (chunk) => {
            console.log('chunk', chunk.length);

            offset_ = chunk.lastIndexOf(new Uint8Array([255, 251]));

            console.log('offset_', offset_);

            if (offset_ !== -1) {
                chunkBuffer = chunkBuffer ? Buffer.concat([chunkBuffer, chunk.slice(0, offset_)]) : chunk.slice(0, offset_);
                console.log('chunkBuffer2', chunkBuffer.length);

                // if (chunkBuffer.length >= chunkSize) {
                //     console.log('!!!', chunkBuffer.length);

                    client.emit('audio', chunkBuffer);
                    // chunkBuffer = null;
                // } else {
                //     chunkBuffer = chunkBuffer ? Buffer.concat([chunkBuffer, chunk.slice(offset_)]) : chunk.slice(offset_);
                    chunkBuffer = chunk.slice(offset_);
                offset_ = 0;

                console.log('chunkBuffer1', chunkBuffer.length);

                // }
            } else {
                chunkBuffer = chunkBuffer ? Buffer.concat([chunkBuffer, chunk]) : chunk;
            }
        });

        // readStream_.on('end', () => {
        //     client.emit('end', () => {
        //     });
        // });

        // let tim1 = performance.now();
        // fs.readFile(filePath, (err, data) => {
        //     if (err) {
        //         throw err;
        //     }
        //
        //     let Xing_VBRI_header_position = null;
        //     let offset = 0;
        //     let framesBuffer = [];
        //     let buffer = data;
        //     let mpeg_version = null;
        //     let layout_version = null;
        //     let samples_number = null;
        //
        //     let chunkSize = null;
        //     let chunkBuffer = null;
        //
        //     // while (offset <= data.length) {
        //     while (buffer.length > 0) {
        //         offset = buffer.indexOf(new Uint8Array([255, 251]), offset);
        //
        //         if (!fileDuration) {
        //             Xing_VBRI_header_position = offset + 4 + 32;
        //             console.log('xing ' + Xing_VBRI_header_position);
        //             const info = buffer.slice(Xing_VBRI_header_position, Xing_VBRI_header_position + 4);
        //             console.log('info', info.toString());
        //
        //             let numberOfFrames_position = null;
        //             let sample_frequency = null;
        //             let time_per_frame = null;
        //             // console.log(info.compare(new Uint8Array([73, 110, 102, 111])) === 0);
        //             if (info.compare(Buffer.from('Info')) === 0 || info.compare(Buffer.from('Xing')) === 0) {
        //                 console.log('This is a VBR MP3 with Xing header');
        //
        //                 numberOfFrames_position = Xing_VBRI_header_position + 8;
        //                 console.log('numberOfFrames_position ' + numberOfFrames_position);
        //
        //                 // console.log(buffer.slice(numberOfFrames_position, numberOfFrames_position + 4).readUIntBE(0, 4));
        //                 numberOfFrames = parseInt(buffer.slice(numberOfFrames_position, numberOfFrames_position + 4).toString('hex'), 16);
        //                 console.log("numberOfFrames", numberOfFrames);
        //
        //                 let binString = hex2bin(buffer.slice(offset, offset + 4).toString('hex'));
        //                 console.log('sync', binString);
        //
        //                 mpeg_version = MPEG_version[binString.substr(11, 2)];
        //                 console.log("mpeg_version", mpeg_version);
        //                 layout_version = Layer_index[binString.substr(13, 2)];
        //                 console.log("layout_version", layout_version);
        //                 samples_number = samples_per_frame[mpeg_version][layout_version];
        //                 // samples_number = samples_per_frame.get([mpeg_version, layout_version]);
        //                 console.log("samples_number", samples_number);
        //                 sample_frequency = Frequency_index[mpeg_version][binString.substr(20, 2)];
        //                 console.log("sample_frequency", sample_frequency);
        //                 time_per_frame = samples_number / sample_frequency;
        //                 console.log("time_per_frame", time_per_frame);
        //                 fileDuration = time_per_frame * numberOfFrames;
        //                 console.log("fileDuration", fileDuration);
        //             } else if (info.compare(Buffer.from('VBRI')) === 0) {
        //                 console.log('This is a VBR MP3 with VBRI header');
        //             } else {
        //                 console.log('This is a CBR MP3');
        //             }
        //
        //             chunkSize = fileSize / 10;
        //             console.log('chunkSize', chunkSize);
        //
        //             client.emit('metadata', {
        //                 fileSize, fileDuration, chunkSize
        //             });
        //         }
        //
        //         offset += 4;
        //
        //         let frame = buffer.slice(0, offset);
        //         buffer = buffer.slice(offset);
        //
        //         // console.log(frame.length);
        //
        //         // framesBuffer.push(frame);
        //
        //         chunkBuffer = chunkBuffer ? Buffer.concat([chunkBuffer, frame]) : frame;
        //
        //         if (chunkBuffer.length >= chunkSize) {
        //             console.log('!!!', chunkBuffer.length);
        //
        //             client.emit('audio', chunkBuffer);
        //             chunkBuffer = null;
        //         }
        //
        //         // if (framesBuffer.length === 20) {
        //         //     let chunkBuffer = framesBuffer.reduce((a, b) => Buffer.concat([a, b]));
        //         //     console.log('!!!', chunkBuffer.length);
        //         //
        //         //     // console.log('time 2', performance.now() - tim1);
        //         //     client.emit('audio', chunkBuffer);
        //         //     framesBuffer = [];
        //         // }
        //         // }
        //         // }
        //     }
        //     // console.log('done');
        //     client.emit('end', () => {
        //     });
        // });

        // const HWM = 64 * 1024 * 10;

        // const readStream_ = fs.createReadStream(filePath, {
        //     highWaterMark: HWM,
        //     // start: 0,
        //     // end: numberOfChunks * HWM
        //     // end: 3 * HWM
        // });
        //
        // readStream_.on('data', chunk => {
        //     console.log('chunk length', chunk.length);
        //
        //     const hexString = chunk.toString('hex');
        //     // console.log(hexString);
        //     // const binString_ = hex2bin(hexString_);
        //     //
        //     // console.log('bin string', binString_);
        //     //
        //     // binString += binString_;
        //     // chunk = Buffer.concat([chunk, chunk_]);
        //     //
        //     let Frame_header_position = 0;
        //     // let offset = Xing_VBRI_header_position;
        //     let offset = 0;
        //     // let numOfFrames = 5;
        //     let framesBuffer = [];
        //     while (offset <= hexString.length) {
        //         const sync = hexString.substr(offset, 4);
        //         if(sync === 'fffa' || sync === 'fffb') {
        //             console.log('sync', sync);
        //             console.log('numOfFrames', framesBuffer.length);
        //             if(Frame_header_position !== 0) {
        //                 let frame = chunk.subarray(Frame_header_position, offset);
        //                 console.log(frame.length);
        //
        //                 framesBuffer.push(frame);
        //
        //                 if(framesBuffer.length === 5) {
        //                     let chunkBuffer = framesBuffer.reduce((a, b) => Buffer.concat([a, b]));
        //                     console.log(chunkBuffer.length);
        //                     client.emit('audio', chunkBuffer);
        //                     framesBuffer = [];
        //                     // break;
        //                 }
        //             }
        //             Frame_header_position = offset;
        //         }
        //         ++offset;
        //
        //     }
        //     console.log('done');
        //     // while (offset_ <= binString.length) {
        //     //     const sync = binString.substr(offset_, 11);
        //     //     if (sync === '11111111111') {
        //     //         console.log(sync);
        //     //         Frame_header_position += offset_;
        //     //         break;
        //     //     } else {
        //     //         ++offset_;
        //     //     }
        //     // }
        //     //
        //     // client.emit('metadata',
        //     //     {
        //     //         fileSize,
        //     //         numberOfFrames
        //     //     }
        //     // );
        //     //
        //     // console.log('Frame_header_position', Frame_header_position);
        //     // console.log('first Frame_size', Frame_header_position / 8);
        //     //
        //     // chunkSize = Frame_header_position / 8;
        //     //
        //     // // console.log(binString.substr(First_Frame_header_position, Frame_header_position));
        //     // console.log('is buffer', Buffer.isBuffer(chunk));
        //     //
        //     // let frame = chunk.subarray(0, Frame_header_position / 8);
        //     // console.log(frame);
        //     //
        //     // // const data64 = Buffer.from(binString.substr(First_Frame_header_position, Frame_header_position), 'binary');
        //     // // console.log('data64', data64);
        //     //
        //     // // const data64 = frame.toString('base64');
        //     // // console.log(data64);
        //     // // client.emit('audio', data64);
        //
        //     // client.emit('audio', chunk);
        // });

        // const readStream_ = fs.createReadStream(filePath, {start:0, end:1024});
        //
        // readStream_.pipe(stream);
        //
        // ss(client).emit('track-stream', stream);
    });

    client.on('stop', () => {

    });

    client.on('disconnect', () => {
    });
});

server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));